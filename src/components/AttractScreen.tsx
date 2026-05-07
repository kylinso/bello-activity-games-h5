import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaBomb, FaGem } from 'react-icons/fa'
import { formatCurrency, getRewardLabel } from '@/lib/gameRules'
import type { ActivityConfig, GameType } from '@/types/activity'

interface AttractScreenProps {
  config: ActivityConfig
  onEnter: () => void
}

const demoDrops = [
  { left: 14, top: 33, type: 'gem', delay: '0s' },
  { left: 30, top: 45, type: 'bomb', delay: '-0.4s' },
  { left: 58, top: 29, type: 'gem', delay: '-0.8s' },
  { left: 82, top: 41, type: 'gem', delay: '-1.2s' },
  { left: 26, top: 67, type: 'gem', delay: '-1.6s' },
  { left: 50, top: 77, type: 'gem', delay: '-2s' },
  { left: 76, top: 66, type: 'bomb', delay: '-2.4s' },
]

export const AttractScreen = ({ config, onEnter }: AttractScreenProps) => {
  const { t } = useTranslation()
  const [activeDemo, setActiveDemo] = useState<GameType>('diamond_rain')

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveDemo((currentDemo) => (currentDemo === 'bingo' ? 'diamond_rain' : 'bingo'))
    }, 5200)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  const maxRewardText = useMemo(() => {
    const diamondMaxScore = Math.max(config.diamondRain.minScore, config.diamondRain.diamondCount * config.diamondRain.diamondValue)
    const maxReward = Math.max(config.bingo.maxReward, diamondMaxScore)

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
            src="/logo.svg"
          />
          <span>
            <strong>Bello</strong>
            <small>GAME KIOSK</small>
          </span>
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
          <div className="attract-demo-window">
            <div className="attract-demo-hud">
              <strong>{activeDemo === 'diamond_rain' ? 'GAME 2 · Diamond Rain' : 'GAME 1 · Bingo'}</strong>
              <span className="attract-timer">{activeDemo === 'diamond_rain' ? '0.8s' : `${config.bingo.picksAllowed} picks`}</span>
              <span className="attract-score">
                {config.bingo.currency} {activeDemo === 'diamond_rain' ? Math.max(1, config.diamondRain.diamondValue) : config.bingo.maxReward}
              </span>
            </div>

            {activeDemo === 'diamond_rain' ? (
              <div
                className="attract-rain-placeholder"
                aria-hidden="true">
                {demoDrops.map((drop, index) => {
                  const Icon = drop.type === 'bomb' ? FaBomb : FaGem
                  return (
                    <span
                      className={drop.type === 'bomb' ? 'attract-drop is-bomb' : 'attract-drop'}
                      key={index}
                      style={{
                        left: `${drop.left}%`,
                        top: `${drop.top}%`,
                        animationDelay: drop.delay,
                      }}>
                      <Icon />
                    </span>
                  )
                })}
              </div>
            ) : (
              <div
                className="attract-bingo-placeholder"
                aria-hidden="true">
                {config.bingo.pool.slice(0, 9).map((amount, index) => (
                  <span
                    className={index < 3 ? 'is-revealed' : ''}
                    key={index}>
                    {index < 3 ? `${config.bingo.currency} ${amount}` : '?'}
                  </span>
                ))}
              </div>
            )}
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

      <section className="attract-partner">{t('partnerTitle')}</section>
    </main>
  )
}
