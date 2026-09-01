import { QRCodeSVG } from 'qrcode.react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import belloMark from '@/assets/bello-mark.svg';
import type { RewardResult } from '@/types/activity';

interface ResultScreenProps {
  result: RewardResult;
  autoResetMs?: number;
  onAutoReset?: () => void;
  onBack?: () => void;
}

export const ResultScreen = ({ result, autoResetMs, onAutoReset, onBack }: ResultScreenProps) => {
  const { t } = useTranslation();
  const isCoupon = result.rewardType === 'COUPON';
  const resultText = isCoupon ? result.couponName : `${result.rewardAmount} BP`;

  useEffect(() => {
    if (!autoResetMs || !onAutoReset) {
      return;
    }

    const timerId = window.setTimeout(onAutoReset, autoResetMs);
    return () => window.clearTimeout(timerId);
  }, [autoResetMs, onAutoReset]);

  return (
    <main className="result-screen">
      <header className="result-game-header">
        <button
          aria-label={t('backHome')}
          className="result-back-button"
          onClick={() => (onBack ? onBack() : window.location.reload())}
          type="button"
        >
          <img alt="" src="/diamond/back-button.webp" />
        </button>
      </header>

      <section className="result-claim-stage" aria-label={t('resultTitle')}>
        <div className="result-claim-copy">
          <h1>{t(isCoupon ? 'resultVoucherClaimTitle' : 'resultClaimTitle')}</h1>
          <strong>{resultText}</strong>
          {result.rewardType === 'CONSUMER_POINT' ? (
            <small>{t('gameScoreLabel')}: {result.gameScore}</small>
          ) : null}
        </div>

        <div aria-label={t('rewardCode')} className="result-qr-frame">
          <QRCodeSVG
            bgColor="#FFFFFF"
            fgColor="#FF6B00"
            imageSettings={{
              src: belloMark,
              height: 58,
              width: 58,
              excavate: true,
            }}
            level="M"
            size={312}
            value={result.claimToken}
          />
        </div>

        <div className="result-flow-copy">
          <h2>{t('resultFlowTitle')}</h2>
          <p>{t(isCoupon ? 'resultVoucherFlowDescription' : 'resultFlowDescription')}</p>
        </div>
      </section>
    </main>
  );
};
