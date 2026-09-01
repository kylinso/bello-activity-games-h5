import {
  createPadGameUploadForm,
  parsePadGameConfig,
  parsePadGameUploadResult,
} from '@/lib/padGameContract';
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
  StoreProfile,
} from '@/types/auth';

const delay = async (durationMs = 280) => {
  await new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
};

const mockStores: StoreProfile[] = [
  {
    id: 'store-kuala-lumpur-01',
    name: 'Bello Kuala Lumpur Demo Store',
    countryCity: 'Malaysia / Kuala Lumpur',
    address: 'Lot G-12, Bello Mall, Jalan Ampang, 50450 Kuala Lumpur',
    activityId: 'bello-tablet-demo',
    sessionId: 'STORE-KL-01',
  },
  {
    id: 'store-petaling-jaya-02',
    name: 'Bello Petaling Jaya Demo Store',
    countryCity: 'Malaysia / Petaling Jaya',
    address: 'No. 18, Jalan SS2/24, 47300 Petaling Jaya, Selangor',
    activityId: 'bello-tablet-demo',
    sessionId: 'STORE-PJ-02',
  },
  {
    id: 'store-johor-bahru-03',
    name: 'Bello Johor Bahru Demo Store',
    countryCity: 'Malaysia / Johor Bahru',
    address: 'Level 2, Bello Square, Jalan Wong Ah Fook, 80000 Johor Bahru',
    activityId: 'bello-tablet-demo',
    sessionId: 'STORE-JB-03',
  },
];

const createMockLoginResponse = (
  params: LoginWithCodeRequest | LoginWithPasswordRequest,
): LoginResponse => {
  return {
    token: `mock-token-${params.phone}-${Date.now()}`,
    tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    countryCode: params.countryCode,
    phone: params.phone,
    stores: mockStores,
    activityId: 'bello-tablet-demo',
  };
};

export const createMockConfig = ({
  activityId,
  sessionId,
  storeId,
  locale,
}: {
  activityId: string;
  sessionId: string;
  storeId: string;
  locale: Locale;
}): ActivityConfig => {
  return parsePadGameConfig(
    {
      id: 1,
      version: 1,
      qrReturnSeconds: 8,
      diamondRainConfig: {
        diamondCount: 15,
        bombCount: 10,
        gameTimeSeconds: 10,
        diamondScore: 1,
        bombDeductScore: 1,
        coloredEnabled: true,
        coloredRewardType: 'SCORE',
        coloredRewardValue: 5,
        coloredIcon: '/diamond/gem.webp',
      },
      bingoConfig: {
        scoreBuckets: [
          { score: 3, count: 5 },
          { score: 4, count: 3 },
          { score: 5, count: 1 },
        ],
      },
    },
    { activityId, sessionId, storeId, locale },
  );
};

export const mockApi = {
  async sendLoginCode(_params: LoginCodeRequest) {
    await delay();
  },

  async loginWithCode(params: LoginWithCodeRequest): Promise<LoginResponse> {
    await delay(420);

    if (!params.phone || !params.verificationCode) {
      throw {
        code: 'LOGIN_FAILED',
        message: 'Phone number and verification code are required.',
      };
    }

    return createMockLoginResponse(params);
  },

  async loginWithPassword(params: LoginWithPasswordRequest): Promise<LoginResponse> {
    await delay(420);

    if (!params.phone || !params.password) {
      throw {
        code: 'LOGIN_FAILED',
        message: 'Phone number and password are required.',
      };
    }

    return createMockLoginResponse(params);
  },

  async getMerchantStores(): Promise<StoreProfile[]> {
    await delay();
    return mockStores;
  },

  async getConfig(params: {
    activityId: string;
    sessionId: string;
    storeId: string;
    locale: Locale;
  }): Promise<ActivityConfig> {
    await delay();
    return createMockConfig(params);
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
    await delay(460);
    const form = createPadGameUploadForm({ storeId, gameType, clientResult });

    return parsePadGameUploadResult(
      {
        claimToken: `mock-${gameType}-${Date.now()}`,
        rewardType: 'CONSUMER_POINT',
        gameScore: form.score,
        baseAmount: form.score,
        coloredPointAmount: 0,
        jackpotAmount: 0,
      },
      { playId, gameType },
    );
  },

  async trackBannerEvent(_params: {
    activityId: string;
    sessionId: string;
    bannerId: string;
    eventType: BannerEventType;
  }) {
    await delay(80);
  },
};
