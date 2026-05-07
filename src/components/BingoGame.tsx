import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaGem } from 'react-icons/fa';
import { ActivityApi } from '@/api/activityApi';
import { createBingoGrid, formatCurrency, getBingoTotal } from '@/lib/gameRules';
import { getRequestErrorMessage } from '@/lib/requestErrors';
import type { ActivityConfig, BingoClientResult, RewardResult } from '@/types/activity';

interface BingoGameProps {
  config: ActivityConfig;
  playId: string;
  onComplete: (result: RewardResult) => void;
  onError: (message: string) => void;
  onBack: () => void;
}

export const BingoGame = ({ config, playId, onComplete, onError, onBack }: BingoGameProps) => {
  const { t, i18n } = useTranslation();
  const [grid, setGrid] = useState(() => createBingoGrid(config.bingo));
  const [selectedCells, setSelectedCells] = useState<BingoClientResult['selectedCells']>([]);
  const [lastPickedIndex, setLastPickedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const startedAt = useRef(Date.now());

  const picksLeft = config.bingo.picksAllowed - selectedCells.length;
  const selectedTotal = useMemo(() => getBingoTotal({ selectedCells, durationMs: 0 }), [
    selectedCells,
  ]);

  const submitResult = async (nextSelectedCells: BingoClientResult['selectedCells']) => {
    setIsSubmitting(true);
    setError('');
    try {
      const result = await ActivityApi.submitResult({
        config,
        playId,
        gameType: 'bingo',
        clientResult: {
          selectedCells: nextSelectedCells,
          durationMs: Date.now() - startedAt.current,
        },
      });
      onComplete(result);
    } catch (requestError) {
      const message = getRequestErrorMessage(requestError, t('startFailed'));
      setError(message);
      onError(message);
      setIsSubmitting(false);
    }
  };

  const handlePick = (index: number) => {
    if (isSubmitting || selectedCells.length >= config.bingo.picksAllowed) {
      return;
    }

    const target = grid[index];
    if (!target || target.revealed) {
      return;
    }

    const nextGrid = grid.map((cell) =>
      cell.index === index ? { ...cell, revealed: true } : cell,
    );
    const nextSelectedCells = [...selectedCells, { index, amount: target.amount }];
    setGrid(nextGrid);
    setSelectedCells(nextSelectedCells);
    setLastPickedIndex(index);

    if (nextSelectedCells.length === config.bingo.picksAllowed) {
      void submitResult(nextSelectedCells);
    }
  };

  return (
    <main className="game-screen bingo-screen">
      <div className="bingo-spotlight" aria-hidden="true" />
      <div className="game-toolbar">
        <button className="icon-button" disabled={isSubmitting} onClick={onBack} type="button">
          <FaArrowLeft aria-hidden="true" />
          <span>{t('backHome')}</span>
        </button>
        <div className="score-strip">
          <span>{t('picksLeft', { count: Math.max(picksLeft, 0) })}</span>
          <strong>
            {t('selectedTotal')}:{' '}
            {formatCurrency(selectedTotal, config.bingo.currency, i18n.language)}
          </strong>
          <div className="pick-dots" aria-hidden="true">
            {Array.from({ length: config.bingo.picksAllowed }).map((_, index) => (
              <i className={index < selectedCells.length ? 'is-filled' : ''} key={index} />
            ))}
          </div>
        </div>
      </div>

      <div className="bingo-jackpot-ribbon" aria-hidden="true">
        <span>{config.bingo.currency} {config.bingo.minReward}</span>
        <strong>Jackpot</strong>
        <span>{config.bingo.currency} {config.bingo.maxReward}</span>
      </div>

      <section className="bingo-board" aria-label={t('bingoTitle')}>
        {grid.map((cell) => (
          <button
            className={[
              'bingo-cell',
              cell.revealed ? 'is-revealed' : '',
              lastPickedIndex === cell.index ? 'is-latest' : '',
            ].join(' ')}
            disabled={cell.revealed || isSubmitting}
            key={cell.index}
            onClick={() => handlePick(cell.index)}
            type="button"
          >
            {cell.revealed ? (
              <>
                <span>{formatCurrency(cell.amount, config.bingo.currency, i18n.language)}</span>
                <em aria-hidden="true" />
                <b aria-hidden="true" />
              </>
            ) : (
              <>
                <FaGem aria-hidden="true" />
                <small aria-hidden="true" />
              </>
            )}
          </button>
        ))}
      </section>

      <div className="game-status" aria-live="polite">
        {isSubmitting ? <span>{t('submitting')}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>
    </main>
  );
};
