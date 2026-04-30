import axios from 'axios';
import { mockApi } from './mock';
import type {
  ActivityConfig,
  BannerEventType,
  GameClientResult,
  GameSession,
  GameType,
  Locale,
  RewardResult,
} from '@/types/activity';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000,
});

const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false';

const toNetworkError = () => ({
  code: 'NETWORK_ERROR' as const,
  message: 'Network request failed.',
});

export const ActivityApi = {
  async getConfig(params: {
    activityId: string;
    sessionId: string;
    locale: Locale;
  }): Promise<ActivityConfig> {
    if (useMocks) {
      return mockApi.getConfig(params);
    }

    try {
      const response = await apiClient.get<ActivityConfig>('/activity-games/config', { params });
      return response.data;
    } catch {
      throw toNetworkError();
    }
  },

  async startGame(config: ActivityConfig, gameType: GameType): Promise<GameSession> {
    if (useMocks) {
      return mockApi.startGame(config, gameType);
    }

    try {
      const response = await apiClient.post<GameSession>('/activity-games/session/start', {
        activityId: config.activityId,
        sessionId: config.sessionId,
        gameType,
      });
      return response.data;
    } catch {
      throw toNetworkError();
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

    try {
      const response = await apiClient.post<RewardResult>('/activity-games/session/result', {
        playId,
        gameType,
        clientResult,
      });
      return response.data;
    } catch {
      throw toNetworkError();
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

    await apiClient.post('/activity-games/banner/event', params);
  },
};
