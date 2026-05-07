import type { GameType, RewardResult } from './activity';

export type ScreenState = 'attract' | 'home' | 'bingo' | 'diamond_rain' | 'result';

export interface CompletedGame {
  gameType: GameType;
  result: RewardResult;
}
