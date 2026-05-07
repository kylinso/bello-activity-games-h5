import axios from 'axios';
import { mockApi } from './mock';
import { readStoredAuthState } from '@/lib/storage';
import { md5 } from '@/lib/md5';
import {
  buildRewardQrUrl,
  createRewardCode,
  formatCurrency,
  getBingoTotal,
  getDiamondRainScore,
} from '@/lib/gameRules';
import type {
  ActivityConfig,
  BannerEventType,
  BingoClientResult,
  BingoConfig,
  DiamondRainClientResult,
  DiamondRainConfig,
  GameClientResult,
  GameType,
  Locale,
  RewardResult,
} from '@/types/activity';
import type {
  LoginCodeRequest,
  MerchantStoreRecord,
  LoginResponse,
  LoginWithCodeRequest,
  LoginWithPasswordRequest,
  StoreProfile,
} from '@/types/auth';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000,
});

const publicApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000,
});

const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';
const passwordLoginPath =
  import.meta.env.VITE_PASSWORD_LOGIN_PATH || '/merchant/store/passport/login/userLogin';

const toNetworkError = () => ({
  code: 'NETWORK_ERROR' as const,
  message: 'Network request failed.',
});

const toRequestError = (error: unknown) => {
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as Partial<ApiEnvelope> | undefined;
    if (responseData?.msg) {
      return {
        code: 'UNKNOWN' as const,
        message: responseData.msg,
      };
    }
  }

  return toNetworkError();
};

interface ApiEnvelope<T = unknown> {
  code: number;
  msg?: string;
  message?: string;
  data?: T;
}

interface PassportLoginData {
  accessToken?: string;
  token?: string;
  tokenExpiresAt?: string;
  activityId?: string;
  sessionId?: string;
}

interface StorePageData {
  records?: MerchantStoreRecord[];
}

type UnknownRecord = Record<string, unknown>;

const GLOBAL_GAME_CONFIG_KEYS = [
  'PAD_GAME_COMMON_CONFIG',
  'PAD_DIAMOND_RAIN_CONFIG',
  'PAD_BINGO_CONFIG',
] as const;

const assertOk = <T>(payload: ApiEnvelope<T>) => {
  if (payload.code !== 0) {
    throw {
      code: 'UNKNOWN' as const,
      message: payload.msg || payload.message || 'Request failed.',
    };
  }

  return payload.data;
};

const isRecord = (value: unknown): value is UnknownRecord => {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

const unwrapApiData = <T>(payload: ApiEnvelope<T> | T): T | undefined => {
  if (isRecord(payload) && typeof payload.code === 'number') {
    return assertOk(payload as unknown as ApiEnvelope<T>);
  }

  return payload as T;
};

const readRecord = (source: UnknownRecord, keys: string[]) => {
  for (const key of keys) {
    const value = source[key];
    if (isRecord(value)) {
      return value;
    }
  }

  return undefined;
};

const readArray = (source: UnknownRecord, keys: string[]) => {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return undefined;
};

const readString = (source: UnknownRecord, keys: string[], fallback: string) => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value) {
      return value;
    }
  }

  return fallback;
};

const readNumber = (source: UnknownRecord, keys: string[], fallback: number) => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return fallback;
};

const parseRecordIfJson = (value: unknown) => {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const parseConfigRecord = (value: unknown) => {
  const direct = parseRecordIfJson(value);
  if (direct) {
    return direct;
  }

  if (Array.isArray(value)) {
    return { value };
  }

  return undefined;
};

const readConfigRecordValue = (record: UnknownRecord) => {
  for (const key of [
    'value',
    'configValue',
    'config_value',
    'content',
    'jsonValue',
    'json_value',
  ]) {
    if (key in record) {
      return record[key];
    }
  }

  return record;
};

const getRecordConfigKey = (record: UnknownRecord) => {
  for (const key of ['key', 'configKey', 'config_key', 'code', 'name']) {
    const value = record[key];
    if (typeof value === 'string') {
      return value;
    }
  }

  return '';
};

const findConfigRecordInArray = (items: unknown[], configKey: string) => {
  for (const item of items) {
    if (!isRecord(item) || getRecordConfigKey(item) !== configKey) {
      continue;
    }

    return parseConfigRecord(readConfigRecordValue(item));
  }

  return undefined;
};

const getGlobalConfigByKey = (source: unknown, configKey: string): UnknownRecord | undefined => {
  if (Array.isArray(source)) {
    return findConfigRecordInArray(source, configKey);
  }

  const record = parseRecordIfJson(source);
  if (!record) {
    return undefined;
  }

  if (configKey in record) {
    return parseConfigRecord(record[configKey]);
  }

  for (const listKey of ['records', 'list', 'configs', 'configList', 'config_list']) {
    const value = record[listKey];
    if (Array.isArray(value)) {
      const match = findConfigRecordInArray(value, configKey);
      if (match) {
        return match;
      }
    }
  }

  return undefined;
};

const getUuid = () => {
  const existing = window.localStorage.getItem('bello-activity:uuid');
  if (existing) {
    return existing;
  }

  const next =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem('bello-activity:uuid', next);
  return next;
};

const getLangHeader = () => {
  const language = window.localStorage.getItem('bello-activity-locale') || navigator.language;
  if (language.startsWith('zh')) {
    return 'zh_CN';
  }

  if (language.startsWith('ms')) {
    return 'ms_MY';
  }

  return 'en_US';
};

const toLoginResponse = (
  params: LoginCodeRequest,
  data: PassportLoginData | undefined,
): LoginResponse => {
  const token = data?.accessToken || data?.token;
  if (!token) {
    throw {
      code: 'UNKNOWN' as const,
      message: 'Login response is missing access token.',
    };
  }

  return {
    token,
    tokenExpiresAt: data?.tokenExpiresAt,
    countryCode: params.countryCode,
    phone: params.phone,
    stores: [],
    activityId: data?.activityId || 'bello-tablet-demo',
    sessionId: data?.sessionId,
  };
};

const getAuthHeaders = (tokenOverride?: string) => {
  const token = tokenOverride || readStoredAuthState()?.token;
  return token ? { Authorization: token } : undefined;
};

const getSelectedStoreId = () => {
  return readStoredAuthState()?.selectedStore?.id;
};

publicApiClient.interceptors.request.use((config) => {
  delete config.headers.Authorization;
  delete config.headers.authorization;
  config.headers.uuid = getUuid();
  config.headers.lang = getLangHeader();
  return config;
});

apiClient.interceptors.request.use((config) => {
  config.headers.uuid = getUuid();
  config.headers.lang = getLangHeader();
  return config;
});

const getCoverUrl = (store: MerchantStoreRecord) => {
  if (store.storeLogo) {
    return store.storeLogo;
  }

  const gallery = store.storeGalleryList5 || store.storeGalleryList;
  if (Array.isArray(gallery)) {
    return gallery[0];
  }

  return gallery?.split(',').filter(Boolean)[0];
};

const toStoreProfile = (store: MerchantStoreRecord): StoreProfile => {
  const countryCity = [store.countryName, store.provinceName, store.cityName]
    .filter(Boolean)
    .join(' / ');
  const address = [store.storeAddressPath, store.storeAddressDetail].filter(Boolean).join(' ');

  return {
    id: store.id,
    name: store.storeName || store.id,
    countryCity: countryCity || '-',
    address: address || '-',
    coverUrl: getCoverUrl(store),
    activityId: 'bello-tablet-demo',
    sessionId: store.id,
  };
};

const defaultBingoConfig: BingoConfig = {
  gridSize: 3,
  picksAllowed: 3,
  currency: 'SGD',
  minReward: 9,
  maxReward: 13,
  pool: [3, 3, 3, 3, 3, 4, 4, 4, 5],
};

const defaultDiamondRainConfig: DiamondRainConfig = {
  durationSeconds: 10,
  diamondCount: 15,
  bombCount: 10,
  diamondValue: 1,
  bombValue: -1,
  minScore: 0,
  fallSpeedMinMs: 6600,
  fallSpeedMaxMs: 8600,
};

const expandScoreBuckets = (source: UnknownRecord | undefined) => {
  const scoreBuckets = readArray(source || {}, ['scoreBuckets', 'score_buckets']);
  if (!scoreBuckets) {
    return undefined;
  }

  const pool = scoreBuckets.flatMap((bucket) => {
    const bucketRecord = isRecord(bucket) ? bucket : {};
    const score = readNumber(bucketRecord, ['score'], Number.NaN);
    const count = readNumber(bucketRecord, ['count'], 0);

    if (!Number.isFinite(score) || count <= 0) {
      return [];
    }

    return Array.from({ length: count }, () => score);
  });

  return pool.length ? pool : undefined;
};

const normalizeBingoConfig = (source: UnknownRecord | undefined): BingoConfig => {
  if (!source) {
    return defaultBingoConfig;
  }

  const pool =
    expandScoreBuckets(source) ||
    readArray(source, ['pool', 'amountPool', 'rewardPool', 'prizePool'])
      ?.map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
  const minScore = pool?.length ? Math.min(...pool) : defaultBingoConfig.minReward;
  const maxScore = pool?.length ? Math.max(...pool) : defaultBingoConfig.maxReward;

  return {
    gridSize: readNumber(
      source,
      ['gridSize', 'grid_size'],
      pool?.length ? Math.sqrt(pool.length) : defaultBingoConfig.gridSize,
    ),
    picksAllowed: readNumber(
      source,
      ['picksAllowed', 'picks_allowed', 'pickCount', 'pick_count'],
      defaultBingoConfig.picksAllowed,
    ),
    currency: readString(source, ['currency'], defaultBingoConfig.currency),
    minReward: readNumber(source, ['minReward', 'min_reward'], minScore),
    maxReward: readNumber(source, ['maxReward', 'max_reward'], maxScore),
    pool: pool?.length ? pool : defaultBingoConfig.pool,
  };
};

const normalizeDiamondRainConfig = (
  source: UnknownRecord | undefined,
): DiamondRainConfig => {
  if (!source) {
    return defaultDiamondRainConfig;
  }

  return {
    durationSeconds: readNumber(
      source,
      ['durationSeconds', 'duration_seconds', 'gameTimeSeconds', 'game_time_seconds', 'duration'],
      defaultDiamondRainConfig.durationSeconds,
    ),
    diamondCount: readNumber(
      source,
      ['diamondCount', 'diamond_count'],
      defaultDiamondRainConfig.diamondCount,
    ),
    bombCount: readNumber(source, ['bombCount', 'bomb_count'], defaultDiamondRainConfig.bombCount),
    diamondValue: readNumber(
      source,
      ['diamondValue', 'diamond_value'],
      defaultDiamondRainConfig.diamondValue,
    ),
    bombValue: readNumber(source, ['bombValue', 'bomb_value'], defaultDiamondRainConfig.bombValue),
    minScore: readNumber(source, ['minScore', 'min_score'], defaultDiamondRainConfig.minScore),
    fallSpeedMinMs: readNumber(
      source,
      ['fallSpeedMinMs', 'fall_speed_min_ms'],
      defaultDiamondRainConfig.fallSpeedMinMs,
    ),
    fallSpeedMaxMs: readNumber(
      source,
      ['fallSpeedMaxMs', 'fall_speed_max_ms'],
      defaultDiamondRainConfig.fallSpeedMaxMs,
    ),
    normalIcon: readString(source, ['normalIcon', 'normal_icon'], ''),
    bombIcon: readString(source, ['bombIcon', 'bomb_icon'], ''),
  };
};

const normalizeActivityConfig = (
  rawConfig: unknown,
  fallback: {
    activityId: string;
    sessionId: string;
    locale: Locale;
  },
): ActivityConfig => {
  const data = parseRecordIfJson(rawConfig) || {};
  const commonConfig = getGlobalConfigByKey(data, 'PAD_GAME_COMMON_CONFIG');
  const diamondRainConfig = getGlobalConfigByKey(data, 'PAD_DIAMOND_RAIN_CONFIG');
  const bingoConfig = getGlobalConfigByKey(data, 'PAD_BINGO_CONFIG');
  const nestedGameConfig =
    parseRecordIfJson(data.gameConfig) ||
    parseRecordIfJson(data.game_config) ||
    parseRecordIfJson(data.activityGameConfig) ||
    parseRecordIfJson(data.activity_game_config) ||
    parseRecordIfJson(data.config) ||
    parseRecordIfJson(data.configValue) ||
    parseRecordIfJson(data.config_value) ||
    parseRecordIfJson(data.value) ||
    data;
  const bingo =
    bingoConfig || readRecord(nestedGameConfig, ['bingo', 'bingoConfig', 'bingo_config']);
  const diamondRain =
    diamondRainConfig ||
    readRecord(nestedGameConfig, [
      'diamondRain',
      'diamondRainConfig',
      'diamond_rain',
      'diamond_rain_config',
    ]);
  const banners = readArray(nestedGameConfig, ['banners', 'bannerList', 'adBanners']) || [];

  return {
    activityId: readString(
      nestedGameConfig,
      ['activityId', 'activity_id'],
      fallback.activityId,
    ),
    sessionId: fallback.sessionId,
    status: readString(nestedGameConfig, ['status'], 'active') === 'inactive' ? 'inactive' : 'active',
    rewardType:
      readString(nestedGameConfig, ['rewardType', 'reward_type'], 'cash_voucher') === 'bello_points'
        ? 'bello_points'
        : readString(nestedGameConfig, ['rewardType', 'reward_type'], 'cash_voucher') === 'coupon'
          ? 'coupon'
          : 'cash_voucher',
    registerH5Url: readString(
      nestedGameConfig,
      ['registerH5Url', 'register_h5_url'],
      import.meta.env.VITE_DEFAULT_REGISTER_H5_URL || 'https://bello.example.com/register',
    ),
    locale: fallback.locale,
    bingo: normalizeBingoConfig(bingo),
    diamondRain: normalizeDiamondRainConfig(diamondRain),
    banners: banners.map((item, index) => {
      const banner = isRecord(item) ? item : {};
      return {
        id: readString(banner, ['id'], `banner-${index + 1}`),
        title: readString(banner, ['title', 'name'], ''),
        subtitle: readString(banner, ['subtitle', 'description'], ''),
        imageUrl: readString(banner, ['imageUrl', 'image_url'], ''),
        linkUrl: readString(banner, ['linkUrl', 'link_url'], ''),
      };
    }),
    common: {
      dailyUserTotalLimit: commonConfig
        ? readNumber(commonConfig, ['dailyUserTotalLimit', 'daily_user_total_limit'], 1)
        : undefined,
      qrExpireMinutes: commonConfig
        ? readNumber(commonConfig, ['qrExpireMinutes', 'qr_expire_minutes'], 30)
        : undefined,
    },
  };
};

const getPadGameTypeCode = (gameType: GameType) => {
  return gameType === 'diamond_rain' ? 1 : 2;
};

const getClientScore = (
  config: ActivityConfig,
  gameType: GameType,
  clientResult: GameClientResult,
) => {
  if (gameType === 'bingo') {
    return getBingoTotal(clientResult as BingoClientResult);
  }

  const diamondResult = clientResult as DiamondRainClientResult;
  if (Number.isFinite(diamondResult.finalScore)) {
    return diamondResult.finalScore;
  }

  return getDiamondRainScore(diamondResult.diamonds, diamondResult.bombs, config.diamondRain);
};

const getRewardDisplayText = (
  config: ActivityConfig,
  rewardType: ActivityConfig['rewardType'],
  amount: number,
) => {
  if (rewardType === 'cash_voucher') {
    return formatCurrency(amount, config.bingo.currency, config.locale);
  }

  if (rewardType === 'bello_points') {
    return `${amount} BP`;
  }

  return `${amount}x coupon credit`;
};

const normalizeRewardType = (value: string, fallback: ActivityConfig['rewardType']) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'coupon') {
    return 'coupon';
  }

  if (normalized === 'bello_points' || normalized === 'bello points' || normalized === 'bp') {
    return 'bello_points';
  }

  if (normalized === 'cash_voucher' || normalized === 'cash voucher') {
    return 'cash_voucher';
  }

  return fallback;
};

const toIsoDateString = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const timestamp = value < 1000000000000 ? value * 1000 : value;
    return new Date(timestamp).toISOString();
  }

  if (typeof value !== 'string' || !value.trim()) {
    return '';
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    const timestamp = numericValue < 1000000000000 ? numericValue * 1000 : numericValue;
    return new Date(timestamp).toISOString();
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : '';
};

const readDateString = (source: UnknownRecord, keys: string[], fallback: string) => {
  for (const key of keys) {
    const value = toIsoDateString(source[key]);
    if (value) {
      return value;
    }
  }

  return fallback;
};

const normalizePrizeUploadResult = (
  rawData: unknown,
  fallback: {
    config: ActivityConfig;
    playId: string;
    gameType: GameType;
    score: number;
  },
): RewardResult => {
  const data = parseRecordIfJson(rawData) || {};
  const nested =
    readRecord(data, ['prize', 'reward', 'result', 'record', 'data']) ||
    parseRecordIfJson(data.value) ||
    data;
  const source = {
    ...data,
    ...nested,
  };
  const rewardType = normalizeRewardType(
    readString(source, ['rewardType', 'reward_type', 'prizeType', 'prize_type', 'type'], ''),
    fallback.config.rewardType,
  );
  const rewardAmount = readNumber(
    source,
    ['rewardAmount', 'reward_amount', 'amount', 'prizeAmount', 'prize_amount', 'score'],
    fallback.score,
  );
  const rawPrizeRecordId = source.prizeRecordId ?? source.prize_record_id ?? source.recordId;
  const prizeRecordId =
    typeof rawPrizeRecordId === 'number' || typeof rawPrizeRecordId === 'string'
      ? rawPrizeRecordId
      : undefined;
  const claimToken = readString(
    source,
    ['claimToken', 'claim_token', 'token', 'receiveToken', 'receive_token'],
    '',
  );
  const rewardCode = readString(
    source,
    [
      'claimToken',
      'claim_token',
      'rewardCode',
      'reward_code',
      'prizeCode',
      'prize_code',
      'couponCode',
      'coupon_code',
      'voucherCode',
      'voucher_code',
      'code',
      'prizeRecordId',
      'prize_record_id',
      'id',
    ],
    claimToken ||
      (prizeRecordId === undefined ? '' : String(prizeRecordId)) ||
      createRewardCode(fallback.gameType),
  );
  const registerH5Url = readString(
    source,
    ['registerH5Url', 'register_h5_url'],
    fallback.config.registerH5Url,
  );
  const qrUrl =
    readString(
      source,
      [
        'qrUrl',
        'qr_url',
        'qrCodeUrl',
        'qr_code_url',
        'qrcodeUrl',
        'qrCode',
        'qr_code',
        'receiveUrl',
        'receive_url',
        'url',
      ],
      '',
    ) ||
    buildRewardQrUrl({
      registerH5Url,
      rewardCode,
      claimToken: claimToken || undefined,
      sessionId: fallback.config.sessionId,
      activityId: fallback.config.activityId,
    });
  const fallbackExpiresAt = new Date(
    Date.now() + (fallback.config.common?.qrExpireMinutes || 30) * 60 * 1000,
  ).toISOString();

  return {
    playId: readString(source, ['playId', 'play_id'], fallback.playId),
    gameType: fallback.gameType,
    rewardType,
    rewardAmount,
    prizeRecordId,
    claimToken: claimToken || undefined,
    rewardDisplayText:
      readString(
        source,
        [
          'rewardDisplayText',
          'reward_display_text',
          'displayText',
          'display_text',
          'prizeName',
          'prize_name',
          'name',
          'title',
        ],
        '',
      ) || getRewardDisplayText(fallback.config, rewardType, rewardAmount),
    rewardCode,
    qrUrl,
    expiresAt: readDateString(
      source,
      [
        'expiresAt',
        'expires_at',
        'expireAt',
        'expire_at',
        'expirationTime',
        'expiration_time',
        'expireTime',
        'expire_time',
        'validUntil',
        'valid_until',
      ],
      fallbackExpiresAt,
    ),
  };
};

export const ActivityApi = {
  async sendLoginCode(params: LoginCodeRequest) {
    if (useMocks) {
      await mockApi.sendLoginCode(params);
      return;
    }

    try {
      const response = await publicApiClient.post<ApiEnvelope>('/notify/send/phone', {
        template_code: 'LOGIN_CODE',
        country_code: params.countryCode,
        phone: params.phone,
      });
      assertOk(response.data);
    } catch (requestError) {
      throw toRequestError(requestError);
    }
  },

  async loginWithCode(params: LoginWithCodeRequest): Promise<LoginResponse> {
    if (useMocks) {
      return mockApi.loginWithCode(params);
    }

    try {
      const response = await publicApiClient.post<ApiEnvelope<PassportLoginData>>(
        '/merchant/store/passport/login/loginByCode',
        {
          country_code: params.countryCode,
          phone: params.phone,
          validate_code: params.verificationCode,
          cfTurnstileResponse: params.cfTurnstileResponse,
        },
      );
      return toLoginResponse(params, assertOk(response.data));
    } catch (requestError) {
      throw toRequestError(requestError);
    }
  },

  async loginWithPassword(params: LoginWithPasswordRequest): Promise<LoginResponse> {
    if (useMocks) {
      return mockApi.loginWithPassword(params);
    }

    try {
      const response = await publicApiClient.post<ApiEnvelope<PassportLoginData>>(
        passwordLoginPath,
        {
          countryCode: params.countryCode,
          mobile: params.phone,
          password: md5(params.password),
          cfTurnstileResponse: params.cfTurnstileResponse,
        },
      );
      return toLoginResponse(params, assertOk(response.data));
    } catch (requestError) {
      throw toRequestError(requestError);
    }
  },

  async getMerchantStores(token?: string): Promise<StoreProfile[]> {
    if (useMocks) {
      return mockApi.getMerchantStores();
    }

    try {
      const response = await apiClient.get<ApiEnvelope<StorePageData>>(
        '/merchant/store/member/user/page',
        {
          headers: getAuthHeaders(token),
          params: {
            pageNumber: 1,
            pageSize: 20,
            _t: Date.now(),
          },
        },
      );
      const data = assertOk(response.data);
      return (data?.records || []).map(toStoreProfile);
    } catch (requestError) {
      throw toRequestError(requestError);
    }
  },

  async getConfig(params: {
    activityId: string;
    sessionId: string;
    locale: Locale;
    storeId?: string;
  }): Promise<ActivityConfig> {
    if (useMocks) {
      return mockApi.getConfig(params);
    }

    try {
      const response = await apiClient.get<ApiEnvelope<unknown> | unknown>(
        '/merchant/global/config',
        {
          headers: getAuthHeaders(),
          params: {
            keys: GLOBAL_GAME_CONFIG_KEYS.join(','),
            storeId: params.storeId || getSelectedStoreId(),
            _t: Date.now(),
          },
        },
      );
      return normalizeActivityConfig(unwrapApiData(response.data), params);
    } catch (requestError) {
      throw toRequestError(requestError);
    }
  },

  async submitResult({
    config,
    playId,
    gameType,
    clientResult,
  }: {
    config: ActivityConfig;
    playId: string;
    gameType: GameType;
    clientResult: GameClientResult;
  }): Promise<RewardResult> {
    if (useMocks) {
      return mockApi.submitResult({ config, playId, gameType, clientResult });
    }

    const score = getClientScore(config, gameType, clientResult);

    try {
      const response = await apiClient.post<ApiEnvelope<unknown> | unknown>(
        '/merchant/pad-game/prize/upload',
        {
          gameType: getPadGameTypeCode(gameType),
          score,
          storeId: getSelectedStoreId() || '',
        },
        {
          headers: getAuthHeaders(),
        },
      );
      return normalizePrizeUploadResult(unwrapApiData(response.data), {
        config,
        playId,
        gameType,
        score,
      });
    } catch {
      const fallbackExpireTime = new Date(
        Date.now() + (config.common?.qrExpireMinutes || 30) * 60 * 1000,
      ).toISOString();

      // Temporary fallback while the prize upload backend is unavailable.
      return normalizePrizeUploadResult(
        {
          prizeRecordId: Date.now(),
          claimToken: `mock-${gameType}-${Date.now()}`,
          expireTime: fallbackExpireTime,
        },
        {
          config,
          playId,
          gameType,
          score,
        },
      );
    }
  },

  async trackBannerEvent(params: {
    activityId: string;
    sessionId: string;
    bannerId: string;
    eventType: BannerEventType;
  }) {
    if (useMocks) {
      await mockApi.trackBannerEvent(params);
      return;
    }

    await apiClient.post('/activity-games/banner/event', {
      ...params,
      storeId: getSelectedStoreId(),
    }, {
      headers: getAuthHeaders(),
    });
  },
};
