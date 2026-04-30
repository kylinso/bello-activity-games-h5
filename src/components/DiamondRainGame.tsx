import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaBomb, FaGem } from 'react-icons/fa';
import { ActivityApi } from '@/api/activityApi';
import bombAsset from '@/assets/bomb.svg';
import diamondAsset from '@/assets/diamond.svg';
import { getDiamondRainScore, normalizeDiamondResult } from '@/lib/gameRules';
import type {
  ActivityConfig,
  DiamondRainClientResult,
  RewardResult,
} from '@/types/activity';

interface DiamondRainGameProps {
  config: ActivityConfig;
  playId: string;
  onComplete: (result: RewardResult) => void;
  onBack: () => void;
}

interface FallingItem {
  id: string;
  type: 'diamond' | 'bomb';
  left: number;
  size: number;
  spawnAtMs: number;
  durationMs: number;
  collected: boolean;
}

interface CollectEffect {
  id: string;
  type: 'diamond' | 'bomb';
  x: number;
  y: number;
  label: string;
}

const createFallingItems = (config: ActivityConfig): FallingItem[] => {
  const items: FallingItem[] = [];
  const totalItems = config.diamondRain.diamondCount + config.diamondRain.bombCount;
  const durationMs = config.diamondRain.durationSeconds * 1000;
  const spacing = durationMs / Math.max(totalItems, 1);

  for (let index = 0; index < totalItems; index += 1) {
    const type = index % 5 === 0 && items.filter((item) => item.type === 'bomb').length < config.diamondRain.bombCount
      ? 'bomb'
      : items.filter((item) => item.type === 'diamond').length < config.diamondRain.diamondCount
        ? 'diamond'
        : 'bomb';

    items.push({
      id: `${type}-${index}`,
      type,
      left: 5 + ((index * 17 + Math.floor(Math.random() * 10)) % 88),
      size: type === 'diamond' ? 58 + (index % 3) * 8 : 54 + (index % 2) * 10,
      spawnAtMs: Math.max(0, index * spacing - 800 + Math.random() * 700),
      durationMs:
        config.diamondRain.fallSpeedMinMs +
        Math.random() *
          (config.diamondRain.fallSpeedMaxMs - config.diamondRain.fallSpeedMinMs),
      collected: false,
    });
  }

  return items.sort((left, right) => left.spawnAtMs - right.spawnAtMs);
};

export const DiamondRainGame = ({
  config,
  playId,
  onComplete,
  onBack,
}: DiamondRainGameProps) => {
  const { t } = useTranslation();
  const [items, setItems] = useState(() => createFallingItems(config));
  const [elapsedMs, setElapsedMs] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [bombs, setBombs] = useState(0);
  const [effects, setEffects] = useState<CollectEffect[]>([]);
  const [scorePulse, setScorePulse] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const startTime = useRef(performance.now());
  const submitted = useRef(false);

  const durationMs = config.diamondRain.durationSeconds * 1000;
  const remainingSeconds = Math.max(0, Math.ceil((durationMs - elapsedMs) / 1000));
  const score = getDiamondRainScore(diamonds, bombs, config.diamondRain);

  const resultPayload = useMemo<DiamondRainClientResult>(
    () =>
      normalizeDiamondResult(
        {
          diamonds,
          bombs,
          finalScore: score,
          durationMs: Math.min(elapsedMs, durationMs),
        },
        config.diamondRain,
      ),
    [bombs, config.diamondRain, diamonds, durationMs, elapsedMs, score],
  );

  useEffect(() => {
    let raf = 0;

    const tick = () => {
      setElapsedMs(performance.now() - startTime.current);
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (elapsedMs < durationMs || submitted.current) {
      return;
    }

    submitted.current = true;
    setIsSubmitting(true);
    setError('');
    ActivityApi.submitResult({
      config,
      playId,
      gameType: 'diamond_rain',
      clientResult: resultPayload,
    })
      .then(onComplete)
      .catch(() => {
        submitted.current = false;
        setError(t('startFailed'));
        setIsSubmitting(false);
      });
  }, [config, durationMs, elapsedMs, onComplete, playId, resultPayload, t]);

  useEffect(() => {
    if (!scorePulse) {
      return;
    }

    const timer = window.setTimeout(() => setScorePulse(false), 260);
    return () => window.clearTimeout(timer);
  }, [scorePulse]);

  const collectItem = (id: string, event: MouseEvent<HTMLButtonElement>) => {
    if (isSubmitting || elapsedMs >= durationMs) {
      return;
    }

    const field = event.currentTarget.closest('.rain-field');
    const fieldRect = field?.getBoundingClientRect();
    const x = fieldRect ? event.clientX - fieldRect.left : event.clientX;
    const y = fieldRect ? event.clientY - fieldRect.top : event.clientY;

    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== id || item.collected) {
          return item;
        }

        if (item.type === 'diamond') {
          setDiamonds((value) => value + 1);
        } else {
          setBombs((value) => value + 1);
        }

        const effectId = `${item.id}-${performance.now()}`;
        const label = item.type === 'diamond' ? `+${config.diamondRain.diamondValue}` : `${config.diamondRain.bombValue}`;
        setEffects((currentEffects) => [
          ...currentEffects,
          {
            id: effectId,
            type: item.type,
            x,
            y,
            label,
          },
        ]);
        setScorePulse(true);
        window.setTimeout(() => {
          setEffects((currentEffects) =>
            currentEffects.filter((effect) => effect.id !== effectId),
          );
        }, 720);

        return { ...item, collected: true };
      }),
    );
  };

  return (
    <main className="game-screen rain-screen">
      <div className="game-toolbar">
        <button className="icon-button" disabled={isSubmitting} onClick={onBack} type="button">
          <FaArrowLeft aria-hidden="true" />
          <span>{t('backHome')}</span>
        </button>
        <div className="score-strip">
          <span>{t('seconds', { count: remainingSeconds })}</span>
          <strong className={scorePulse ? 'is-pulsing' : ''}>{t('diamondScore')}: {score}</strong>
          <small>
            <FaGem aria-hidden="true" /> {diamonds}
            <FaBomb aria-hidden="true" /> {bombs}
          </small>
        </div>
      </div>

      <section className="rain-field" aria-label={t('diamondTitle')}>
        <div className="rain-speed-lines" aria-hidden="true" />
        <div className="rain-horizon" aria-hidden="true" />
        {items.map((item) => {
          const progress = (elapsedMs - item.spawnAtMs) / item.durationMs;
          const isVisible = progress >= 0 && progress <= 1 && !item.collected;

          return (
            <button
              aria-label={item.type === 'diamond' ? t('diamonds') : t('bombs')}
              className={item.type === 'diamond' ? 'falling-item' : 'falling-item is-bomb'}
              disabled={!isVisible}
              key={item.id}
              onClick={(event) => collectItem(item.id, event)}
              style={{
                left: `${item.left}%`,
                width: item.size,
                height: item.size,
                opacity: isVisible ? 1 : 0,
                transform: `translate3d(-50%, ${-18 + progress * 118}vh, 0) rotate(${
                  progress * 220
                }deg)`,
              }}
              type="button"
            >
              <img alt="" src={item.type === 'diamond' ? diamondAsset : bombAsset} />
            </button>
          );
        })}
        {effects.map((effect) => (
          <span
            className={effect.type === 'diamond' ? 'collect-effect' : 'collect-effect is-bomb'}
            key={effect.id}
            style={{
              left: effect.x,
              top: effect.y,
            }}
          >
            {effect.label}
          </span>
        ))}
      </section>

      <div className="game-status" aria-live="polite">
        {isSubmitting ? <span>{t('submitting')}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>
    </main>
  );
};
