import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft } from 'react-icons/fa';
import { createBingoGrid, formatCurrency, getBingoTotal } from '@/lib/gameRules';
import type { ActivityConfig, BingoClientResult, CompletedGamePayload } from '@/types/activity';

interface BingoGameProps {
  config: ActivityConfig;
  playId: string;
  onComplete: (result: CompletedGamePayload) => void;
  onError: (message: string) => void;
  onBack: () => void;
}

export const BingoGame = ({ config, onComplete, onBack }: BingoGameProps) => {
  const { t, i18n } = useTranslation();
  const [grid, setGrid] = useState(() => createBingoGrid(config.bingo));
  const [selectedCells, setSelectedCells] = useState<BingoClientResult['selectedCells']>([]);
  const [lastPickedIndex, setLastPickedIndex] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const startedAt = useRef(Date.now());
  const completeTimer = useRef<number | null>(null);

  const picksLeft = config.bingo.picksAllowed - selectedCells.length;
  const selectedTotal = useMemo(() => getBingoTotal({ selectedCells, durationMs: 0 }), [
    selectedCells,
  ]);

  useEffect(() => {
    return () => {
      if (completeTimer.current !== null) {
        window.clearTimeout(completeTimer.current);
      }
    };
  }, []);

  const handlePick = (index: number) => {
    if (isComplete || selectedCells.length >= config.bingo.picksAllowed) {
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
      const clientResult: BingoClientResult = {
        selectedCells: nextSelectedCells,
        durationMs: Date.now() - startedAt.current,
      };
      setIsComplete(true);
      completeTimer.current = window.setTimeout(() => {
        onComplete({
          gameType: 'bingo',
          clientResult,
          rewardAmount: getBingoTotal(clientResult),
        });
      }, 1000);
    }
  };

  return (
    <main className="game-screen bingo-screen">
      <header className="bingo-game-header">
        <button
          aria-label={t('backHome')}
          className="bingo-back-button"
          disabled={isComplete}
          onClick={onBack}
          type="button"
        >
          <FaArrowLeft aria-hidden="true" />
        </button>
        <img alt={t('bingoTitle')} className="bingo-title-image" src="/bingo/title.webp" />
      </header>

      <section className="bingo-playfield">
        <div className="bingo-score-badge" aria-live="polite">
          {formatCurrency(selectedTotal, config.bingo.currency, i18n.language)}
        </div>

        <section className="bingo-board-frame" aria-label={t('bingoTitle')}>
          <div className="bingo-frequency-panel">
            <img alt="" src="/bingo/frequency.webp" />
            <span>{t('bingoFrequency')}：</span>
            <div className="pick-dots" aria-hidden="true">
              {Array.from({ length: config.bingo.picksAllowed }).map((_, index) => (
                <i className={index < selectedCells.length ? 'is-filled' : ''} key={index} />
              ))}
            </div>
          </div>

          <div className="bingo-board">
            {grid.map((cell) => (
              <button
                aria-label={
                  cell.revealed
                    ? `${cell.amount}`
                    : t('picksLeft', { count: Math.max(picksLeft, 0) })
                }
                className={[
                  'bingo-cell',
                  cell.revealed ? 'is-revealed' : '',
                  lastPickedIndex === cell.index ? 'is-latest' : '',
                ].join(' ')}
                disabled={cell.revealed || isComplete}
                key={cell.index}
                onClick={() => handlePick(cell.index)}
                type="button"
              >
                {cell.revealed ? <span>{cell.amount}</span> : null}
              </button>
            ))}
          </div>
        </section>
      </section>

      <div className="game-status" aria-live="polite">
      </div>
    </main>
  );
};
