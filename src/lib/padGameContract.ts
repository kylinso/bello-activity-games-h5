import type {
  ActivityConfig,
  BingoClientResult,
  DiamondRainClientResult,
  GameClientResult,
  GameType,
  Locale,
  PadGameUploadForm,
  RewardResult,
} from '@/types/activity';

type ContractErrorCode =
  | 'CONFIG_MISSING'
  | 'CONFIG_INVALID'
  | 'RESULT_INVALID'
  | 'RESPONSE_INVALID';

type UnknownRecord = Record<string, unknown>;
const INT32_MAX = 2_147_483_647;
const MAX_TIMER_SECONDS = Math.floor(INT32_MAX / 1000);

class PadGameContractError extends Error {
  readonly code: ContractErrorCode;

  constructor(code: ContractErrorCode, message: string) {
    super(message);
    this.name = 'PadGameContractError';
    this.code = code;
  }
}

const fail = (code: ContractErrorCode, message: string): never => {
  throw new PadGameContractError(code, message);
};

const isRecord = (value: unknown): value is UnknownRecord => {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

const requireRecord = (
  value: unknown,
  field: string,
  code: ContractErrorCode,
): UnknownRecord => {
  if (!isRecord(value)) {
    return fail(code, `${field} must be an object.`);
  }

  return value;
};

const requireString = (
  value: unknown,
  field: string,
  code: ContractErrorCode,
): string => {
  if (typeof value !== 'string' || !value.trim()) {
    return fail(code, `${field} must be a non-empty string.`);
  }

  return value.trim();
};

const requireFiniteNumber = (
  value: unknown,
  field: string,
  code: ContractErrorCode,
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail(code, `${field} must be a finite number.`);
  }

  return value;
};

const requireInteger = (
  value: unknown,
  field: string,
  minimum: number,
  code: ContractErrorCode,
): number => {
  const number = requireFiniteNumber(value, field, code);
  if (!Number.isInteger(number) || number < minimum || number > INT32_MAX) {
    return fail(
      code,
      `${field} must be an int32 greater than or equal to ${minimum}.`,
    );
  }

  return number;
};

const readIcon = (value: unknown) => {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const requireTimerSeconds = (value: unknown, field: string, minimum: number) => {
  const seconds = requireInteger(value, field, minimum, 'CONFIG_INVALID');
  if (seconds > MAX_TIMER_SECONDS) {
    return fail('CONFIG_INVALID', `${field} is too large for a browser timer.`);
  }

  return seconds;
};

const getColoredRewardType = (value: unknown) => {
  if (value !== 'SCORE' && value !== 'CONSUMER_POINT') {
    return fail(
      'CONFIG_INVALID',
      'diamondRainConfig.coloredRewardType must be SCORE or CONSUMER_POINT.',
    );
  }

  return value;
};

const parseBingoConfig = (value: unknown): ActivityConfig['bingo'] => {
  const source = requireRecord(value, 'bingoConfig', 'CONFIG_INVALID');
  if (!Array.isArray(source.scoreBuckets) || source.scoreBuckets.length === 0) {
    return fail('CONFIG_INVALID', 'bingoConfig.scoreBuckets must be a non-empty array.');
  }

  const pool: number[] = [];
  source.scoreBuckets.forEach((value, index) => {
    const bucket = requireRecord(
      value,
      `bingoConfig.scoreBuckets[${index}]`,
      'CONFIG_INVALID',
    );
    const score = requireInteger(
      bucket.score,
      `bingoConfig.scoreBuckets[${index}].score`,
      0,
      'CONFIG_INVALID',
    );
    const count = requireInteger(
      bucket.count,
      `bingoConfig.scoreBuckets[${index}].count`,
      1,
      'CONFIG_INVALID',
    );
    if (pool.length + count > 9) {
      return fail('CONFIG_INVALID', 'Bingo score bucket counts cannot exceed 9 cells.');
    }

    pool.push(...Array.from({ length: count }, () => score));
  });

  if (pool.length !== 9) {
    return fail('CONFIG_INVALID', 'Bingo score bucket counts must expand to exactly 9 cells.');
  }
  const maximumScore = [...pool]
    .sort((left, right) => right - left)
    .slice(0, 3)
    .reduce((total, score) => total + score, 0);
  if (maximumScore > INT32_MAX) {
    return fail('CONFIG_INVALID', 'The maximum Bingo score must fit in an int32.');
  }

  return {
    gridSize: 3,
    picksAllowed: 3,
    pool,
  };
};

const parseDiamondRainConfig = (value: unknown): ActivityConfig['diamondRain'] => {
  const source = requireRecord(value, 'diamondRainConfig', 'CONFIG_INVALID');
  if (typeof source.coloredEnabled !== 'boolean') {
    return fail('CONFIG_INVALID', 'diamondRainConfig.coloredEnabled must be a boolean.');
  }

  const config: ActivityConfig['diamondRain'] = {
    durationSeconds: requireTimerSeconds(
      source.gameTimeSeconds,
      'diamondRainConfig.gameTimeSeconds',
      1,
    ),
    diamondCount: requireInteger(
      source.diamondCount,
      'diamondRainConfig.diamondCount',
      0,
      'CONFIG_INVALID',
    ),
    bombCount: requireInteger(
      source.bombCount,
      'diamondRainConfig.bombCount',
      0,
      'CONFIG_INVALID',
    ),
    diamondValue: requireInteger(
      source.diamondScore,
      'diamondRainConfig.diamondScore',
      0,
      'CONFIG_INVALID',
    ),
    bombValue: -requireInteger(
      source.bombDeductScore,
      'diamondRainConfig.bombDeductScore',
      1,
      'CONFIG_INVALID',
    ),
    minScore: 0,
    coloredEnabled: source.coloredEnabled,
    coloredRewardType: getColoredRewardType(source.coloredRewardType),
    coloredRewardValue: requireInteger(
      source.coloredRewardValue,
      'diamondRainConfig.coloredRewardValue',
      0,
      'CONFIG_INVALID',
    ),
    normalIcon: readIcon(source.normalIcon),
    bombIcon: readIcon(source.bombIcon),
    coloredIcon: readIcon(source.coloredIcon),
  };
  const maximumScore =
    config.diamondCount * config.diamondValue +
    (config.coloredEnabled && config.coloredRewardType === 'SCORE'
      ? config.coloredRewardValue
      : 0);
  if (maximumScore > INT32_MAX) {
    return fail('CONFIG_INVALID', 'The maximum Diamond Rain score must fit in an int32.');
  }

  return config;
};

export const parsePadGameConfig = (
  rawConfig: unknown,
  context: {
    activityId: string;
    sessionId: string;
    storeId: string;
    locale: Locale;
  },
): ActivityConfig => {
  if (rawConfig === null) {
    return fail('CONFIG_MISSING', 'No game configuration exists for this store.');
  }

  const source = requireRecord(rawConfig, 'data', 'CONFIG_INVALID');
  const storeId = requireString(context.storeId, 'storeId', 'CONFIG_INVALID');

  return {
    activityId: context.activityId,
    sessionId: context.sessionId,
    storeId,
    locale: context.locale,
    qrReturnSeconds: requireTimerSeconds(
      source.qrReturnSeconds,
      'qrReturnSeconds',
      0,
    ),
    bingo: parseBingoConfig(source.bingoConfig),
    diamondRain: parseDiamondRainConfig(source.diamondRainConfig),
    banners: [],
  };
};

export const createPadGameUploadForm = ({
  clientResult,
  gameType,
  storeId,
}: {
  clientResult: GameClientResult;
  gameType: GameType;
  storeId: string;
}): PadGameUploadForm => {
  const frozenStoreId = requireString(storeId, 'storeId', 'RESULT_INVALID');
  let score: number;
  let extra: 0 | 1 = 0;

  if (gameType === 'bingo') {
    const result = clientResult as BingoClientResult;
    if (!Array.isArray(result.selectedCells) || result.selectedCells.length !== 3) {
      return fail('RESULT_INVALID', 'Bingo result must contain exactly 3 selected cells.');
    }
    score = result.selectedCells.reduce((total, cell, index) => {
      return (
        total +
        requireInteger(cell?.amount, `selectedCells[${index}].amount`, 0, 'RESULT_INVALID')
      );
    }, 0);
    score = requireInteger(score, 'score', 0, 'RESULT_INVALID');
  } else {
    const result = clientResult as DiamondRainClientResult;
    score = requireInteger(result.finalScore, 'finalScore', 0, 'RESULT_INVALID');
    const coloredDiamonds = requireInteger(
      result.coloredDiamonds,
      'coloredDiamonds',
      0,
      'RESULT_INVALID',
    );
    if (coloredDiamonds > 1) {
      return fail('RESULT_INVALID', 'coloredDiamonds cannot be greater than 1.');
    }
    extra = coloredDiamonds === 1 ? 1 : 0;
  }

  return {
    gameType: gameType === 'diamond_rain' ? 1 : 2,
    score,
    extra,
    storeId: frozenStoreId,
  };
};

const requireRewardAmount = (value: unknown, field: string) => {
  const normalized = typeof value === 'string' && value.trim() ? Number(value) : value;
  return requireFiniteNumber(normalized, field, 'RESPONSE_INVALID');
};

const readNullableAmount = (value: unknown, field: string) => {
  if (value === null) {
    return 0;
  }

  return requireRewardAmount(value, field);
};

export const parsePadGameUploadResult = (
  rawResult: unknown,
  context: { playId: string; gameType: GameType },
): RewardResult => {
  const source = requireRecord(rawResult, 'data', 'RESPONSE_INVALID');
  const claimToken = requireString(source.claimToken, 'claimToken', 'RESPONSE_INVALID');

  if (source.rewardType === 'COUPON') {
    return {
      playId: context.playId,
      gameType: context.gameType,
      claimToken,
      rewardType: 'COUPON',
      couponName: requireString(source.couponName, 'couponName', 'RESPONSE_INVALID'),
    };
  }

  if (source.rewardType === 'CONSUMER_POINT') {
    const baseAmount = requireRewardAmount(source.baseAmount, 'baseAmount');
    const coloredPointAmount = readNullableAmount(
      source.coloredPointAmount,
      'coloredPointAmount',
    );
    const jackpotAmount = readNullableAmount(source.jackpotAmount, 'jackpotAmount');
    const rewardAmount = baseAmount + coloredPointAmount + jackpotAmount;
    if (!Number.isFinite(rewardAmount)) {
      return fail('RESPONSE_INVALID', 'The consumer-point reward total must be finite.');
    }

    return {
      playId: context.playId,
      gameType: context.gameType,
      claimToken,
      rewardType: 'CONSUMER_POINT',
      gameScore: requireInteger(source.gameScore, 'gameScore', 0, 'RESPONSE_INVALID'),
      rewardAmount,
    };
  }

  return fail('RESPONSE_INVALID', 'rewardType must be COUPON or CONSUMER_POINT.');
};
