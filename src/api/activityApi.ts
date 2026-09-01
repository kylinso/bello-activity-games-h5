import axios from 'axios';
import { mockApi } from './mock';
import { md5 } from '@/lib/md5';
import {
  createPadGameUploadForm,
  parsePadGameConfig,
  parsePadGameUploadResult,
} from '@/lib/padGameContract';
import { readStoredAuthState } from '@/lib/storage';
import type {
  ActivityConfig,
  BannerEventType,
  GameClientResult,
  GameType,
  Locale,
  RewardResult,
} from '@/types/activity';
import type {
  LoginCodeRequest,
  LoginResponse,
  LoginWithCodeRequest,
  LoginWithPasswordRequest,
  MerchantStoreRecord,
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

const assertOk = <T>(payload: ApiEnvelope<T>) => {
  if (payload.code !== 0) {
    throw {
      code: 'UNKNOWN' as const,
      message: payload.msg || payload.message || 'Request failed.',
    };
  }

  return payload.data;
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
          pad: true,
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
          pad: true,
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
    storeId: string;
  }): Promise<ActivityConfig> {
    if (useMocks) {
      return mockApi.getConfig(params);
    }

    try {
      const response = await apiClient.get<ApiEnvelope<unknown>>(
        '/merchant/global/pad-game-config',
        {
          headers: getAuthHeaders(),
          params: { storeId: params.storeId },
        },
      );
      return parsePadGameConfig(assertOk(response.data), params);
    } catch (requestError) {
      throw toRequestError(requestError);
    }
  },

  async submitResult({
    storeId,
    playId,
    gameType,
    clientResult,
  }: {
    storeId: string;
    playId: string;
    gameType: GameType;
    clientResult: GameClientResult;
  }): Promise<RewardResult> {
    if (useMocks) {
      return mockApi.submitResult({ storeId, playId, gameType, clientResult });
    }

    const form = createPadGameUploadForm({ storeId, gameType, clientResult });

    try {
      const response = await apiClient.post<ApiEnvelope<unknown>>(
        '/merchant/pad-game/prize/upload',
        form,
        { headers: getAuthHeaders() },
      );
      return parsePadGameUploadResult(assertOk(response.data), { playId, gameType });
    } catch (requestError) {
      throw toRequestError(requestError);
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

    await apiClient.post(
      '/activity-games/banner/event',
      { ...params, storeId: getSelectedStoreId() },
      { headers: getAuthHeaders() },
    );
  },
};
