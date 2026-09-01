import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getBingoScoreRange,
  getDiamondRainScoreRange,
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

  const maxScoreText = useMemo(() => {
    const bingoMax = getBingoScoreRange(config.bingo).max
    const diamondMax = getDiamondRainScoreRange(config.diamondRain).max
    return String(Math.max(bingoMax, diamondMax))
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
              amount: maxScoreText,
            })}
            className="attract-title-prize"
          >
            <span className="attract-title-prize-prefix">{t('attractWinUpToPrefix')}</span>
            <span className="attract-title-prize-amount">{maxScoreText}</span>
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
