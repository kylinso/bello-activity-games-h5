import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  formatCurrency,
  getBingoRewardRange,
  getDiamondRainRewardRange,
  getRewardLabel,
} from '@/lib/gameRules'
import { PartnerVideoBanner } from '@/components/PartnerVideoBanner'
import type { ActivityConfig } from '@/types/activity'

interface AttractScreenProps {
  config: ActivityConfig
  onEnter: () => void
}

const attractDemoVideoSrc = '/attract-demo.mp4'

export const AttractScreen = ({ config, onEnter }: AttractScreenProps) => {
  const { t } = useTranslation()

  const maxRewardText = useMemo(() => {
    const bingoMax = getBingoRewardRange(config.bingo).max
    const diamondMax = getDiamondRainRewardRange(config.diamondRain).max
    const maxReward = Math.max(bingoMax, diamondMax)

    if (config.rewardType === 'cash_voucher') {
      return formatCurrency(maxReward, config.bingo.currency, config.locale)
    }

    if (config.rewardType === 'bello_points') {
      return `${maxReward} BP`
    }

    return `${maxReward}x`
  }, [config])

  return (
    <main className="attract-screen">
      <section className="attract-content">
        <header className="attract-brand">
          <img
            alt=""
            className="attract-brand-logo"
            src="/logo.webp"
          />
        </header>

        <section
          className="attract-title-panel"
          aria-label={t('attractTitle')}>
          <img
            alt=""
            className="attract-title-art"
            src="/title.webp"
          />
          <span
            aria-label={t('attractWinUpTo', {
              amount: maxRewardText,
              reward: t(config.rewardType) || getRewardLabel(config.rewardType),
            })}
            className="attract-title-prize"
          >
            <span className="attract-title-prize-prefix">{t('attractWinUpToPrefix')}</span>
            <span className="attract-title-prize-amount">{maxRewardText}</span>
          </span>
        </section>

        <section
          className="attract-demo-panel"
          aria-label={t('demo')}>
          <img
            alt=""
            className="attract-demo-frame"
            src="/kuang.webp"
          />
          <div className="attract-demo-window is-video">
            <video
              aria-label={t('demo')}
              autoPlay
              className="attract-demo-video"
              loop
              muted
              playsInline
              preload="auto"
              src={attractDemoVideoSrc}
            />
          </div>
          <img
            alt=""
            className="attract-left-coins"
            src="/icon_left.webp"
          />
          <img
            alt=""
            className="attract-right-coins"
            src="/icon_right.webp"
          />
        </section>

        <button
          className="attract-cta"
          onClick={onEnter}
          type="button">
          <img
            alt=""
            src="/button.webp"
          />
        </button>
      </section>

      <PartnerVideoBanner className="attract-partner" label={t('partnerTitle')} />
    </main>
  )
}
