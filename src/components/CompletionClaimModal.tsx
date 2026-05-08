import { type CSSProperties, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, getRewardLabel } from '@/lib/gameRules';
import type { ActivityConfig, CompletedGamePayload } from '@/types/activity';

interface CompletionClaimModalProps {
  completedGame: CompletedGamePayload;
  config: ActivityConfig;
  isSubmitting: boolean;
  onClaim: () => void;
}

const getModalAmountText = (config: ActivityConfig, amount: number) => {
  if (config.rewardType === 'cash_voucher') {
    return formatCurrency(amount, config.bingo.currency, config.locale);
  }

  if (config.rewardType === 'bello_points') {
    return `${amount} BP`;
  }

  return `${amount}`;
};

const confettiColors = ['#ffd21a', '#ff8a18', '#ff4b3e', '#60f0d2', '#a4df4a', '#ff9fb0', '#fff6b8'];
const confettiKinds = ['rect', 'streamer', 'star', 'circle'] as const;

const confettiPieces = Array.from({ length: 72 }, (_, index) => {
  const column = (index * 37) % 100;
  const kind = confettiKinds[index % confettiKinds.length];

  return {
    color: confettiColors[index % confettiColors.length],
    delay: -((index * 0.17) % 5.2),
    drift: ((index % 2 === 0 ? 1 : -1) * (34 + (index % 7) * 12)),
    duration: 4.4 + (index % 9) * 0.34,
    index,
    kind,
    size: 8 + (index % 5) * 3,
    spin: (index % 2 === 0 ? 1 : -1) * (420 + (index % 6) * 80),
    startRotate: (index * 29) % 180,
    x: column,
  };
});

export const CompletionClaimModal = ({
  completedGame,
  config,
  isSubmitting,
  onClaim,
}: CompletionClaimModalProps) => {
  const { t } = useTranslation();
  const amountText = useMemo(
    () => getModalAmountText(config, completedGame.rewardAmount),
    [completedGame.rewardAmount, config],
  );
  const rewardLabel = useMemo(() => getRewardLabel(config.rewardType).toUpperCase(), [
    config.rewardType,
  ]);

  return (
    <div className="claim-modal-layer" role="presentation">
      <div aria-hidden="true" className="claim-confetti-layer">
        {confettiPieces.map((piece) => (
          <i
            className={`claim-confetti-piece is-${piece.kind}`}
            key={piece.index}
            style={
              {
                '--confetti-color': piece.color,
                '--confetti-delay': `${piece.delay}s`,
                '--confetti-drift': `${piece.drift}px`,
                '--confetti-duration': `${piece.duration}s`,
                '--confetti-size': `${piece.size}px`,
                '--confetti-spin': `${piece.spin}deg`,
                '--confetti-start-rotate': `${piece.startRotate}deg`,
                '--confetti-x': `${piece.x}%`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <section
        aria-label={t('completionTitle')}
        aria-modal="true"
        className="claim-modal-card"
        role="dialog"
      >
        <img alt="" className="claim-modal-panel" src="/claim-modal/panel.webp" />
        <div className="claim-modal-reward" aria-live="polite">
          <strong>{amountText}</strong>
          <span>{rewardLabel}</span>
        </div>
        <button
          aria-label={t('scanToClaim')}
          className="claim-modal-button"
          disabled={isSubmitting}
          onClick={onClaim}
          type="button"
        >
          {isSubmitting ? <span>{t('submitting')}</span> : null}
        </button>
      </section>
    </div>
  );
};
