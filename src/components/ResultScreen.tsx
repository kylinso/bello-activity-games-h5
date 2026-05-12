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

const getResultAmountText = (result: RewardResult) => {
  if (result.rewardType === 'cash_voucher') {
    // 统一展示为「单位 数字」：若服务端给 "17 RM" 则 swap 为 "RM 17"
    const trailing = result.rewardDisplayText.match(/^(\d+(?:\.\d+)?)\s+([A-Z]{2,4})$/);
    if (trailing) {
      return `${trailing[2]} ${trailing[1]}`;
    }
  }

  return result.rewardDisplayText;
};

export const ResultScreen = ({ result, autoResetMs, onAutoReset, onBack }: ResultScreenProps) => {
  const { t } = useTranslation();
  const claimLink = result.claimToken || result.qrUrl;

  useEffect(() => {
    if (!autoResetMs || !onAutoReset) return;
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
          <h1>{t('resultClaimTitle')}</h1>
          <strong>{getResultAmountText(result)}</strong>
        </div>

        <a
          aria-label={t('openRegister')}
          className="result-qr-frame"
          href={claimLink}
          rel="noreferrer"
          target="_blank"
        >
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
            value={claimLink}
          />
        </a>

        <div className="result-flow-copy">
          <h2>{t('resultFlowTitle')}</h2>
          <p>{t('resultFlowDescription')}</p>
        </div>
      </section>
    </main>
  );
};
