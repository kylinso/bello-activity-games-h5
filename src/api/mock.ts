import { buildRewardQrUrl, createRewardCode, formatCurrency, getBingoTotal, getDiamondRainScore } from '@/lib/gameRules'
import { readStoredPlayState, writeStoredPlayState } from '@/lib/storage'
import type { ActivityConfig, BannerEventType, BingoClientResult, DiamondRainClientResult, GameClientResult, GameSession, GameType, Locale, RewardResult } from '@/types/activity'

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
      currency: 'SGD',
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
      fallSpeedMinMs: 6600,
      fallSpeedMaxMs: 8600,
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

  return getDiamondRainScore((result as DiamondRainClientResult).diamonds, (result as DiamondRainClientResult).bombs, config.diamondRain)
}

export const mockApi = {
  async getConfig(params: { activityId: string; sessionId: string; locale: Locale }): Promise<ActivityConfig> {
    await delay()
    return createMockConfig(params)
  },

  async startGame(config: ActivityConfig, gameType: GameType): Promise<GameSession> {
    await delay()
    const stored = readStoredPlayState(config.activityId, config.sessionId)

    if (stored?.result) {
      throw {
        code: 'ALREADY_PLAYED',
        message: 'This session has already played a game.',
      }
    }

    if (stored && stored.gameType !== gameType) {
      throw {
        code: 'ALREADY_PLAYED',
        message: 'This session is locked to another game.',
      }
    }

    writeStoredPlayState(config.activityId, config.sessionId, { gameType })

    return {
      playId: `mock-${config.sessionId}-${Date.now()}`,
      lockedGameType: gameType,
      status: 'started',
    }
  },

  async submitResult({ config, playId, gameType, clientResult }: { config: ActivityConfig; playId: string; gameType: GameType; clientResult: GameClientResult }): Promise<RewardResult> {
    await delay(460)
    const rewardCode = createRewardCode(gameType)
    const result: RewardResult = {
      playId,
      gameType,
      rewardType: config.rewardType,
      rewardAmount: getRewardAmount(config, gameType, clientResult),
      rewardDisplayText: getRewardDisplayText(config, gameType, clientResult),
      rewardCode,
      qrUrl: buildRewardQrUrl({
        registerH5Url: config.registerH5Url,
        rewardCode,
        sessionId: config.sessionId,
        activityId: config.activityId,
      }),
      expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    }

    writeStoredPlayState(config.activityId, config.sessionId, {
      gameType,
      result,
    })

    return result
  },

  async trackBannerEvent(_params: { activityId: string; sessionId: string; bannerId: string; eventType: BannerEventType }) {
    await delay(80)
  },
}
