import { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { RewardResult } from '@/types/activity';

interface CompletionClaimModalProps {
  result: RewardResult;
  onClaim: () => void;
}

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

export const CompletionClaimModal = ({ result, onClaim }: CompletionClaimModalProps) => {
  const { t } = useTranslation();
  const amountText =
    result.rewardType === 'COUPON' ? result.couponName : `${result.rewardAmount} BP`;
  const detailText =
    result.rewardType === 'COUPON'
      ? t('coupon')
      : `${t('gameScoreLabel')}: ${result.gameScore}`;

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
          <span>{detailText}</span>
        </div>
        <button
          aria-label={t('scanToClaim')}
          className="claim-modal-button"
          onClick={onClaim}
          type="button"
        />
      </section>
    </div>
  );
};
