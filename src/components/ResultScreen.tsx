import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaCheck, FaCopy, FaExternalLinkAlt, FaGift } from 'react-icons/fa'
import belloMark from '@/assets/bello-mark.svg'
import type { RewardResult } from '@/types/activity'

interface ResultScreenProps {
  result: RewardResult
}

export const ResultScreen = ({ result }: ResultScreenProps) => {
  const { t, i18n } = useTranslation()
  const [isCopied, setIsCopied] = useState(false)
  const expiresAt = new Intl.DateTimeFormat(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(result.expiresAt))

  useEffect(() => {
    if (!isCopied) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setIsCopied(false)
    }, 1800)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isCopied])

  const copyRewardCode = async () => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(result.rewardCode)
    } else {
      const input = document.createElement('textarea')
      input.value = result.rewardCode
      input.setAttribute('readonly', 'readonly')
      input.style.position = 'fixed'
      input.style.left = '-9999px'
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    setIsCopied(true)
  }

  return (
    <main className="result-screen">
      <div
        className="confetti-layer"
        aria-hidden="true">
        {Array.from({ length: 26 }).map((_, index) => (
          <span
            key={index}
            style={{
              left: `${(index * 19 + 5) % 100}%`,
              animationDelay: `${(index % 10) * 0.15}s`,
            }}
          />
        ))}
      </div>
      <section className="reward-panel">
        <div className="reward-copy">
          <span className="section-eyebrow">
            <FaGift aria-hidden="true" />
            {t(result.rewardType)}
          </span>
          <h1>{t('resultTitle')}</h1>
          <strong>{result.rewardDisplayText}</strong>
          <p>{t('resultSubtitle')}</p>
          <dl>
            <div>
              <dt>{t('rewardCode')}</dt>
              <dd className="reward-code-value">
                <span>{result.rewardCode}</span>
                <button
                  aria-label={isCopied ? t('copiedRewardCode') : t('copyRewardCode')}
                  className="reward-code-copy-button"
                  onClick={copyRewardCode}
                  title={isCopied ? t('copiedRewardCode') : t('copyRewardCode')}
                  type="button">
                  {isCopied ? <FaCheck aria-hidden="true" /> : <FaCopy aria-hidden="true" />}
                </button>
              </dd>
            </div>
            <div>
              <dt>{t('expiresAt')}</dt>
              <dd>{expiresAt}</dd>
            </div>
          </dl>
          <a
            className="primary-button"
            href={result.qrUrl}
            rel="noreferrer"
            target="_blank">
            <FaExternalLinkAlt aria-hidden="true" />
            {t('openRegister')}
          </a>
        </div>

        <div className="qr-panel">
          <div className="qr-frame">
            <QRCodeSVG
              bgColor="#FFFFFF"
              fgColor="#10191D"
              imageSettings={{
                src: belloMark,
                height: 42,
                width: 42,
                excavate: true,
              }}
              level="M"
              size={250}
              value={result.qrUrl}
            />
          </div>
        </div>
      </section>
    </main>
  )
}
