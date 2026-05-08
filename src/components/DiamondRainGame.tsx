import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, getDiamondRainScore, normalizeDiamondResult, shuffle } from '@/lib/gameRules';
import type {
  ActivityConfig,
  CompletedGamePayload,
  DiamondRainClientResult,
} from '@/types/activity';

interface DiamondRainGameProps {
  config: ActivityConfig;
  playId: string;
  onComplete: (result: CompletedGamePayload) => void;
  onError: (message: string) => void;
  onBack: () => void;
}

interface FallingItem {
  id: string;
  type: 'diamond' | 'bomb';
  left: number;
  size: number;
  drift: number;
  phase: number;
  spin: number;
  depth: number;
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
  const spawnWindowMs = durationMs * 0.85;
  const spacing = spawnWindowMs / Math.max(totalItems, 1);
  const itemTypes = shuffle([
    ...Array.from({ length: config.diamondRain.diamondCount }, () => 'diamond' as const),
    ...Array.from({ length: config.diamondRain.bombCount }, () => 'bomb' as const),
  ]);
  const recentLefts: number[] = [];

  const getNextLeft = () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = 7 + Math.random() * 86;
      const hasEnoughGap = recentLefts.every((left) => Math.abs(left - candidate) >= 14);

      if (hasEnoughGap) {
        recentLefts.push(candidate);
        recentLefts.splice(0, Math.max(0, recentLefts.length - 4));
        return candidate;
      }
    }

    const fallback = 7 + Math.random() * 86;
    recentLefts.push(fallback);
    recentLefts.splice(0, Math.max(0, recentLefts.length - 4));
    return fallback;
  };

  for (let index = 0; index < totalItems; index += 1) {
    const type = itemTypes[index] || 'diamond';
    const spawnAtMs = Math.min(
      spawnWindowMs,
      Math.max(0, index * spacing - 560 + Math.random() * 520),
    );
    const randomDurationMs =
      config.diamondRain.fallSpeedMinMs +
      Math.random() *
        (config.diamondRain.fallSpeedMaxMs - config.diamondRain.fallSpeedMinMs);
    const remainingAfterSpawnMs = durationMs - spawnAtMs;
    const durationCapMs = Math.max(1500, remainingAfterSpawnMs + 350);

    items.push({
      id: `${type}-${index}`,
      type,
      left: getNextLeft(),
      size: type === 'diamond' ? 66 + (index % 3) * 9 : 62 + (index % 2) * 10,
      drift: 12 + (index % 4) * 7,
      phase: Math.random() * Math.PI * 2,
      spin: (index % 2 === 0 ? 1 : -1) * (90 + (index % 5) * 18),
      depth: 0.86 + (index % 3) * 0.08,
      spawnAtMs,
      durationMs: Math.min(randomDurationMs, durationCapMs),
      collected: false,
    });
  }

  return items.sort((left, right) => left.spawnAtMs - right.spawnAtMs);
};

export const DiamondRainGame = ({
  config,
  onComplete,
  onBack,
}: DiamondRainGameProps) => {
  const { i18n, t } = useTranslation();
  const [items, setItems] = useState(() => createFallingItems(config));
  const [elapsedMs, setElapsedMs] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [bombs, setBombs] = useState(0);
  const [effects, setEffects] = useState<CollectEffect[]>([]);
  const [scorePulse, setScorePulse] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const startTime = useRef(performance.now());
  const completed = useRef(false);
  const completeTimer = useRef<number | null>(null);

  const durationMs = config.diamondRain.durationSeconds * 1000;
  const remainingSeconds = Math.max(0, (durationMs - elapsedMs) / 1000);
  const remainingSecondsText = remainingSeconds.toFixed(1);
  const score = getDiamondRainScore(diamonds, bombs, config.diamondRain);
  const scoreText = formatCurrency(score, config.bingo.currency, i18n.language);
  const normalIcon = config.diamondRain.normalIcon || '/diamond/gem.svg';
  const bombIcon = config.diamondRain.bombIcon || '/diamond/bomb.svg';

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
      const nextElapsedMs = performance.now() - startTime.current;
      setElapsedMs(Math.min(nextElapsedMs, durationMs));

      if (nextElapsedMs < durationMs) {
        raf = window.requestAnimationFrame(tick);
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [durationMs]);

  useEffect(() => {
    return () => {
      if (completeTimer.current !== null) {
        window.clearTimeout(completeTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (elapsedMs < durationMs || completed.current) {
      return;
    }

    completed.current = true;
    setIsComplete(true);
    completeTimer.current = window.setTimeout(() => {
      onComplete({
        gameType: 'diamond_rain',
        clientResult: resultPayload,
        rewardAmount: resultPayload.finalScore,
      });
    }, 1000);
  }, [durationMs, elapsedMs, onComplete, resultPayload]);

  useEffect(() => {
    if (!scorePulse) {
      return;
    }

    const timer = window.setTimeout(() => setScorePulse(false), 260);
    return () => window.clearTimeout(timer);
  }, [scorePulse]);

  const collectItem = (id: string, event: MouseEvent<HTMLButtonElement>) => {
    if (isComplete || elapsedMs >= durationMs) {
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
      <header className="rain-game-header">
        <button
          aria-label={t('backHome')}
          className="rain-back-button"
          disabled={isComplete}
          onClick={onBack}
          type="button"
        >
          <img alt="" src="/diamond/back-button.webp" />
        </button>
        <img alt={t('diamondTitle')} className="rain-title-image" src="/diamond/title.webp" />
      </header>

      <section className="rain-field" aria-label={t('diamondTitle')}>
        <div className={scorePulse ? 'rain-score-badge is-pulsing' : 'rain-score-badge'} aria-live="polite">
          {scoreText}
        </div>
        <div className="rain-timer-badge" aria-live="polite">
          <img alt="" src="/diamond/timer.webp" />
          <span>{remainingSecondsText} S</span>
        </div>
        <div className="rain-speed-lines" aria-hidden="true" />
        <div className="rain-glow-layer" aria-hidden="true" />
        {items.map((item) => {
          const progress = (elapsedMs - item.spawnAtMs) / item.durationMs;
          const isVisible = progress >= 0 && progress <= 1 && !item.collected;
          const top = -10 + progress * 112;
          const drift = Math.sin(progress * Math.PI * 2 + item.phase) * item.drift;
          const rotation = progress * item.spin;

          return (
            <button
              aria-label={item.type === 'diamond' ? t('diamonds') : t('bombs')}
              className={item.type === 'diamond' ? 'falling-item' : 'falling-item is-bomb'}
              disabled={!isVisible}
              key={item.id}
              onClick={(event) => collectItem(item.id, event)}
              style={{
                left: `${item.left}%`,
                top: `${top}%`,
                width: item.size,
                height: item.size,
                opacity: isVisible ? 1 : 0,
                transform: `translate3d(calc(-50% + ${drift.toFixed(1)}px), 0, 0) rotate(${rotation.toFixed(1)}deg) scale(${item.depth})`,
              }}
              type="button"
            >
              <span className="falling-trail" aria-hidden="true" />
              <img alt="" src={item.type === 'diamond' ? normalIcon : bombIcon} />
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
        <div className="rain-scene-tag" aria-hidden="true">
          <span>Scene 4 · Rain ·</span>
          <img alt="" src={normalIcon} />
          <strong>+{config.diamondRain.diamondValue}</strong>
          <span>/</span>
          <img alt="" src={bombIcon} />
          <strong>{config.diamondRain.bombValue}</strong>
        </div>
      </section>

      <div className="game-status" aria-live="polite">
      </div>
    </main>
  );
};
