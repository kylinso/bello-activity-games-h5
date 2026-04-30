import type { GameType, RewardResult } from '@/types/activity';

const getPlayKey = (activityId: string, sessionId: string) => {
  return `bello-activity:${activityId}:${sessionId}:play`;
};

export interface StoredPlayState {
  gameType: GameType;
  result?: RewardResult;
}

export const readStoredPlayState = (activityId: string, sessionId: string) => {
  const raw = window.localStorage.getItem(getPlayKey(activityId, sessionId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredPlayState;
  } catch {
    window.localStorage.removeItem(getPlayKey(activityId, sessionId));
    return null;
  }
};

export const writeStoredPlayState = (
  activityId: string,
  sessionId: string,
  state: StoredPlayState,
) => {
  window.localStorage.setItem(getPlayKey(activityId, sessionId), JSON.stringify(state));
};

export const clearStoredPlayState = (activityId: string, sessionId: string) => {
  window.localStorage.removeItem(getPlayKey(activityId, sessionId));
};
