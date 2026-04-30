import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { FaExternalLinkAlt, FaGift, FaQrcode } from 'react-icons/fa';
import belloMark from '@/assets/bello-mark.svg';
import type { RewardResult } from '@/types/activity';

interface ResultScreenProps {
  result: RewardResult;
}

export const ResultScreen = ({ result }: ResultScreenProps) => {
  const { t, i18n } = useTranslation();
  const expiresAt = new Intl.DateTimeFormat(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(result.expiresAt));

  return (
    <main className="result-screen">
      <div className="confetti-layer" aria-hidden="true">
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
              <dd>{result.rewardCode}</dd>
            </div>
            <div>
              <dt>{t('expiresAt')}</dt>
              <dd>{expiresAt}</dd>
            </div>
          </dl>
          <a className="primary-button" href={result.qrUrl} rel="noreferrer" target="_blank">
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
          <span>
            <FaQrcode aria-hidden="true" />
            {result.rewardCode}
          </span>
        </div>
      </section>
    </main>
  );
};
