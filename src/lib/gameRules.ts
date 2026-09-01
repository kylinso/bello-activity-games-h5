import type {
  BingoClientResult,
  BingoConfig,
  DiamondRainClientResult,
  DiamondRainConfig,
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
  return shuffle(config.pool).map((amount, index) => ({
    index,
    amount,
    revealed: false,
  }));
};

export const getBingoTotal = (result: BingoClientResult) => {
  return result.selectedCells.reduce((total, cell) => total + cell.amount, 0);
};

export const getBingoScoreRange = (config: BingoConfig): { min: number; max: number } => {
  const sortedAsc = [...config.pool].sort((a, b) => a - b);
  const sortedDesc = [...config.pool].sort((a, b) => b - a);
  const sum = (list: number[]) => {
    return list.slice(0, config.picksAllowed).reduce((total, value) => total + value, 0);
  };

  return {
    min: sum(sortedAsc),
    max: sum(sortedDesc),
  };
};

export const getColoredScoreValue = (config: DiamondRainConfig) => {
  return config.coloredEnabled && config.coloredRewardType === 'SCORE'
    ? config.coloredRewardValue
    : 0;
};

export const getNextDiamondRainScore = (
  currentScore: number,
  itemType: 'diamond' | 'colored' | 'bomb',
  config: DiamondRainConfig,
) => {
  const scoreDelta =
    itemType === 'diamond'
      ? config.diamondValue
      : itemType === 'colored'
        ? getColoredScoreValue(config)
        : config.bombValue;

  return Math.max(config.minScore, currentScore + scoreDelta);
};

export const getDiamondRainScoreRange = (
  config: DiamondRainConfig,
): { min: number; max: number } => {
  return {
    min: 0,
    max: config.diamondCount * config.diamondValue + getColoredScoreValue(config),
  };
};

export const getDiamondRainScore = (
  diamonds: number,
  bombs: number,
  config: DiamondRainConfig,
  coloredDiamonds = 0,
) => {
  return (
    diamonds * config.diamondValue +
    coloredDiamonds * getColoredScoreValue(config) +
    bombs * config.bombValue
  );
};

export const getDiamondRainReward = (
  diamonds: number,
  bombs: number,
  config: DiamondRainConfig,
  coloredDiamonds = 0,
) => {
  return Math.max(0, getDiamondRainScore(diamonds, bombs, config, coloredDiamonds));
};

export const normalizeDiamondResult = (
  result: DiamondRainClientResult,
  config: DiamondRainConfig,
): DiamondRainClientResult => {
  const diamonds = clamp(result.diamonds, 0, config.diamondCount);
  const coloredDiamonds = clamp(result.coloredDiamonds, 0, config.coloredEnabled ? 1 : 0);
  const bombs = clamp(result.bombs, 0, config.bombCount);
  return {
    ...result,
    diamonds,
    coloredDiamonds,
    bombs,
    finalScore: getDiamondRainReward(diamonds, bombs, config, coloredDiamonds),
  };
};
