import { buildRewardQrUrl, createRewardCode, formatCurrency, getBingoTotal, getDiamondRainReward } from '@/lib/gameRules'
import type { ActivityConfig, BannerEventType, BingoClientResult, DiamondRainClientResult, GameClientResult, GameType, Locale, RewardResult } from '@/types/activity'
import type { LoginCodeRequest, LoginResponse, LoginWithCodeRequest, LoginWithPasswordRequest, StoreProfile } from '@/types/auth'

const delay = async (durationMs = 280) => {
  await new Promise((resolve) => {
    window.setTimeout(resolve, durationMs)
  })
}

const getBannerCopy = (locale: Locale) => {
  if (locale === 'zh') {
    return [
      ['Bello 新用户礼遇', '扫码注册，奖励自动到账'],
      ['附近优惠精选', '探索餐饮、零售与生活方式好礼'],
      ['Bello Points', '参与活动，累积更多 BP'],
    ]
  }

  if (locale === 'ms') {
    return [
      ['Hadiah ahli baharu', 'Daftar dan ganjaran masuk automatik'],
      ['Tawaran berdekatan', 'Makanan, runcit dan gaya hidup'],
      ['Bello Points', 'Main dan kumpul lebih banyak BP'],
    ]
  }

  return [
    ['New member rewards', 'Register and receive the reward automatically'],
    ['Nearby deals', 'Food, retail, and lifestyle offers'],
    ['Bello Points', 'Play activities and collect more BP'],
  ]
}

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
]

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
  }
}

export const createMockConfig = ({ activityId, sessionId, locale }: { activityId: string; sessionId: string; locale: Locale }): ActivityConfig => {
  const bannerCopy = getBannerCopy(locale)

  return {
    activityId,
    sessionId,
    status: 'active',
    rewardType: 'cash_voucher',
    registerH5Url: import.meta.env.VITE_DEFAULT_REGISTER_H5_URL || 'https://bello.example.com/register',
    locale,
    bingo: {
      gridSize: 3,
      picksAllowed: 3,
      currency: 'MYR',
      minReward: 9,
      maxReward: 13,
      pool: [3, 3, 3, 3, 3, 4, 4, 4, 5],
    },
    diamondRain: {
      durationSeconds: 10,
      diamondCount: 15,
      bombCount: 10,
      diamondValue: 1,
      bombValue: -1,
      minScore: 0,
      fallSpeedMinMs: 4200,
      fallSpeedMaxMs: 6200,
      coloredIcon: '/diamond/gem.webp',
      coloredScore: 5,
    },
    banners: bannerCopy.map(([title, subtitle], index) => ({
      id: `mock-banner-${index + 1}`,
      title,
      subtitle,
      linkUrl: 'https://bello.example.com',
    })),
  }
}

const getRewardDisplayText = (config: ActivityConfig, gameType: GameType, result: GameClientResult) => {
  const amount = getRewardAmount(config, gameType, result)

  if (config.rewardType === 'cash_voucher') {
    return formatCurrency(amount, config.bingo.currency, config.locale)
  }

  if (config.rewardType === 'bello_points') {
    return `${amount} BP`
  }

  return `${amount}x coupon credit`
}

const getRewardAmount = (config: ActivityConfig, gameType: GameType, result: GameClientResult) => {
  if (gameType === 'bingo') {
    return getBingoTotal(result as BingoClientResult)
  }

  const diamondResult = result as DiamondRainClientResult
  if (Number.isFinite(diamondResult.finalScore)) {
    return diamondResult.finalScore
  }
  return getDiamondRainReward(
    diamondResult.diamonds,
    diamondResult.bombs,
    config.diamondRain,
    diamondResult.coloredDiamonds || 0,
  )
}

export const mockApi = {
  async sendLoginCode(_params: LoginCodeRequest) {
    await delay()
  },

  async loginWithCode(params: LoginWithCodeRequest): Promise<LoginResponse> {
    await delay(420)

    if (!params.phone || !params.verificationCode) {
      throw {
        code: 'LOGIN_FAILED',
        message: 'Phone number and verification code are required.',
      }
    }

    return createMockLoginResponse(params)
  },

  async loginWithPassword(params: LoginWithPasswordRequest): Promise<LoginResponse> {
    await delay(420)

    if (!params.phone || !params.password) {
      throw {
        code: 'LOGIN_FAILED',
        message: 'Phone number and password are required.',
      }
    }

    return createMockLoginResponse(params)
  },

  async getMerchantStores(): Promise<StoreProfile[]> {
    await delay()
    return mockStores
  },

  async getConfig(params: { activityId: string; sessionId: string; locale: Locale }): Promise<ActivityConfig> {
    await delay()
    return createMockConfig(params)
  },

  async submitResult({ config, playId, gameType, clientResult }: { config: ActivityConfig; playId: string; gameType: GameType; clientResult: GameClientResult }): Promise<RewardResult> {
    await delay(460)
    const rewardCode = createRewardCode(gameType)
    const qrUrl = buildRewardQrUrl({
      registerH5Url: config.registerH5Url,
      rewardCode,
      sessionId: config.sessionId,
      activityId: config.activityId,
    })
    const result: RewardResult = {
      playId,
      gameType,
      rewardType: config.rewardType,
      rewardAmount: getRewardAmount(config, gameType, clientResult),
      rewardDisplayText: getRewardDisplayText(config, gameType, clientResult),
      rewardCode,
      claimToken: qrUrl,
      qrUrl,
      expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    }

    return result
  },

  async trackBannerEvent(_params: { activityId: string; sessionId: string; bannerId: string; eventType: BannerEventType }) {
    await delay(80)
  },
}
