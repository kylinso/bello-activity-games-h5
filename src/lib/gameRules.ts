import type {
  BingoClientResult,
  BingoConfig,
  DiamondRainClientResult,
  DiamondRainConfig,
  GameType,
  RewardType,
} from '@/types/activity';

export const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

export const shuffle = <T,>(items: T[]) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

export const createBingoGrid = (config: BingoConfig) => {
  const expectedCells = config.gridSize * config.gridSize;
  const pool = config.pool.slice(0, expectedCells);

  while (pool.length < expectedCells) {
    pool.push(config.minReward);
  }

  return shuffle(pool).map((amount, index) => ({
    index,
    amount,
    revealed: false,
  }));
};

export const getBingoTotal = (result: BingoClientResult) => {
  return result.selectedCells.reduce((total, cell) => total + cell.amount, 0);
};

export const getDiamondRainScore = (
  diamonds: number,
  bombs: number,
  config: DiamondRainConfig,
) => {
  return Math.max(config.minScore, diamonds * config.diamondValue + bombs * config.bombValue);
};

export const createRewardCode = (gameType: GameType) => {
  const prefix = gameType === 'bingo' ? 'BNG' : 'DMR';
  const body = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${body}`;
};

export const formatCurrency = (amount: number, currency: string, locale: string) => {
  if (currency.toUpperCase() === 'MYR') {
    return `RM ${amount}`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
};

export const getRewardLabel = (rewardType: RewardType) => {
  if (rewardType === 'cash_voucher') {
    return 'Cash voucher';
  }

  if (rewardType === 'coupon') {
    return 'Coupon';
  }

  return 'Bello Points';
};

export const normalizeDiamondResult = (
  result: DiamondRainClientResult,
  config: DiamondRainConfig,
): DiamondRainClientResult => {
  const diamonds = clamp(result.diamonds, 0, config.diamondCount);
  const bombs = clamp(result.bombs, 0, config.bombCount);
  return {
    ...result,
    diamonds,
    bombs,
    finalScore: getDiamondRainScore(diamonds, bombs, config),
  };
};

export const buildRewardQrUrl = ({
  registerH5Url,
  rewardCode,
  claimToken,
  sessionId,
  activityId,
}: {
  registerH5Url: string;
  rewardCode: string;
  claimToken?: string;
  sessionId: string;
  activityId: string;
}) => {
  const url = new URL(registerH5Url, window.location.origin);
  url.searchParams.set('rewardCode', rewardCode);
  if (claimToken) {
    url.searchParams.set('claimToken', claimToken);
  }
  url.searchParams.set('sessionId', sessionId);
  url.searchParams.set('activityId', activityId);
  return url.toString();
};
