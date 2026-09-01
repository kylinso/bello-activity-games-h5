export type Locale = 'en' | 'zh' | 'ms';

export type GameType = 'bingo' | 'diamond_rain';

export type RewardType = 'CONSUMER_POINT' | 'COUPON';

export type ColoredRewardType = 'SCORE' | 'CONSUMER_POINT';

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  linkUrl?: string;
}

export interface BingoConfig {
  gridSize: 3;
  picksAllowed: 3;
  pool: number[];
}

export interface DiamondRainConfig {
  durationSeconds: number;
  diamondCount: number;
  bombCount: number;
  diamondValue: number;
  bombValue: number;
  minScore: 0;
  coloredEnabled: boolean;
  coloredRewardType: ColoredRewardType;
  coloredRewardValue: number;
  normalIcon?: string;
  coloredIcon?: string;
  bombIcon?: string;
}

export interface ActivityConfig {
  activityId: string;
  sessionId: string;
  storeId: string;
  locale: Locale;
  qrReturnSeconds: number;
  bingo: BingoConfig;
  diamondRain: DiamondRainConfig;
  banners: BannerItem[];
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
  coloredDiamonds: number;
  bombs: number;
  finalScore: number;
  durationMs: number;
}

export type GameClientResult = BingoClientResult | DiamondRainClientResult;

export interface CompletedGamePayload {
  gameType: GameType;
  clientResult: GameClientResult;
}

interface RewardResultBase {
  playId: string;
  gameType: GameType;
  claimToken: string;
}

export interface ConsumerPointRewardResult extends RewardResultBase {
  rewardType: 'CONSUMER_POINT';
  gameScore: number;
  rewardAmount: number;
}

export interface CouponRewardResult extends RewardResultBase {
  rewardType: 'COUPON';
  couponName: string;
}

export type RewardResult = ConsumerPointRewardResult | CouponRewardResult;

export interface PadGameUploadForm {
  gameType: 1 | 2;
  score: number;
  extra: 0 | 1;
  storeId: string;
}

export type BannerEventType = 'impression' | 'click';

export interface ActivityError {
  code:
    | 'ACTIVITY_INACTIVE'
    | 'SESSION_INVALID'
    | 'ALREADY_PLAYED'
    | 'CONFIG_MISSING'
    | 'CONFIG_INVALID'
    | 'RESULT_INVALID'
    | 'RESPONSE_INVALID'
    | 'NETWORK_ERROR'
    | 'UNKNOWN';
  message: string;
}

export const isActivityError = (error: unknown): error is ActivityError => {
  return Boolean(error && typeof error === 'object' && 'code' in error && 'message' in error);
};
