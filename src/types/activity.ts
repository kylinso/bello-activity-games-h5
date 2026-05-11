export type Locale = 'en' | 'zh' | 'ms';

export type GameType = 'bingo' | 'diamond_rain';

export type RewardType = 'cash_voucher' | 'coupon' | 'bello_points';

export type ActivityStatus = 'active' | 'inactive';

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  linkUrl?: string;
}

export interface BingoConfig {
  gridSize: number;
  picksAllowed: number;
  currency: string;
  minReward: number;
  maxReward: number;
  pool: number[];
}

export interface DiamondRainConfig {
  durationSeconds: number;
  diamondCount: number;
  bombCount: number;
  diamondValue: number;
  bombValue: number;
  minScore: number;
  fallSpeedMinMs: number;
  fallSpeedMaxMs: number;
  normalIcon?: string;
  coloredIcon?: string;
  coloredScore: number;
  bombIcon?: string;
}

export interface ActivityConfig {
  activityId: string;
  sessionId: string;
  status: ActivityStatus;
  rewardType: RewardType;
  registerH5Url: string;
  locale: Locale;
  bingo: BingoConfig;
  diamondRain: DiamondRainConfig;
  banners: BannerItem[];
  common?: {
    dailyUserTotalLimit?: number;
    qrExpireMinutes?: number;
  };
}

export interface BingoClientResult {
  selectedCells: Array<{
    index: number;
    amount: number;
  }>;
  durationMs: number;
}

export interface DiamondRainClientResult {
  diamonds: number;
  coloredDiamonds?: number;
  bombs: number;
  finalScore: number;
  durationMs: number;
}

export type GameClientResult = BingoClientResult | DiamondRainClientResult;

export interface CompletedGamePayload {
  gameType: GameType;
  clientResult: GameClientResult;
  rewardAmount: number;
}

export interface RewardResult {
  playId: string;
  gameType: GameType;
  rewardType: RewardType;
  rewardAmount: number;
  rewardDisplayText: string;
  prizeRecordId?: number | string;
  claimToken?: string;
  rewardCode: string;
  qrUrl: string;
  expiresAt: string;
}

export type BannerEventType = 'impression' | 'click';

export interface ActivityError {
  code:
    | 'ACTIVITY_INACTIVE'
    | 'SESSION_INVALID'
    | 'ALREADY_PLAYED'
    | 'CONFIG_MISSING'
    | 'NETWORK_ERROR'
    | 'UNKNOWN';
  message: string;
}

export const isActivityError = (error: unknown): error is ActivityError => {
  return Boolean(error && typeof error === 'object' && 'code' in error && 'message' in error);
};
