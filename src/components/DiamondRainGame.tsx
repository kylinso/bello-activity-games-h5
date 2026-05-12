import { type CSSProperties, type PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatCurrency,
  getDiamondRainReward,
  getDiamondRainScore,
  normalizeDiamondResult,
  shuffle,
} from '@/lib/gameRules';
import type {
  ActivityConfig,
  CompletedGamePayload,
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
  type: 'diamond' | 'colored' | 'bomb';
  left: number;
  size: number;
  spawnAtMs: number;
  durationMs: number;
}

interface CollectEffect {
  id: string;
  type: 'diamond' | 'colored' | 'bomb';
  x: number;
  y: number;
  label: string;
}

const FALLING_ITEM_SIZE = 96;
// 倒计时归零前留这么久的"收尾时间"，保证最后一颗钻石视觉上完整落到底
const SAFETY_BUFFER_MS = 250;

const createFallingItems = (config: ActivityConfig): FallingItem[] => {
  const items: FallingItem[] = [];
  const totalItems = config.diamondRain.diamondCount + config.diamondRain.bombCount;
  const durationMs = config.diamondRain.durationSeconds * 1000;

  // 单个 item 至少要 fall 这么久，保证玩家有反应时间
  const minFallMs = Math.max(1200, config.diamondRain.fallSpeedMinMs);
  // 单个 item 最多 fall 这么久，但不超过整局时长 - 收尾余量
  const maxFallMs = Math.max(
    minFallMs + 600,
    Math.min(config.diamondRain.fallSpeedMaxMs, durationMs - SAFETY_BUFFER_MS),
  );
  // spawn 窗口：保证最晚 spawn 的 item 仍有 minFallMs 时间能落到底
  const spawnWindowMs = Math.max(0, durationMs - minFallMs - SAFETY_BUFFER_MS);
  const spacing = spawnWindowMs / Math.max(totalItems - 1, 1);
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

  // 计算给定 spawn 时间下，该 item 还能下落多久（不超过整局 - 收尾余量）
  const pickFallDuration = (spawnAtMs: number) => {
    const availableMs = Math.max(minFallMs, durationMs - spawnAtMs - SAFETY_BUFFER_MS);
    const clampedMax = Math.min(maxFallMs, availableMs);
    const span = Math.max(0, clampedMax - minFallMs);
    return minFallMs + Math.random() * span;
  };

  for (let index = 0; index < totalItems; index += 1) {
    const type = itemTypes[index] || 'diamond';
    const spawnAtMs = Math.min(
      spawnWindowMs,
      Math.max(0, index * spacing - 320 + Math.random() * 420),
    );

    items.push({
      id: `${type}-${index}`,
      type,
      left: getNextLeft(),
      size: FALLING_ITEM_SIZE,
      spawnAtMs,
      durationMs: pickFallDuration(spawnAtMs),
    });
  }

  // 彩钻挑 spawn 窗口偏后段出现（吊胃口效果），duration 同样 clamp 到能落完
  const coloredSpawnAt = Math.min(spawnWindowMs, spawnWindowMs * 0.6);
  items.push({
    id: 'colored-0',
    type: 'colored',
    left: getNextLeft(),
    size: FALLING_ITEM_SIZE,
    spawnAtMs: coloredSpawnAt,
    durationMs: pickFallDuration(coloredSpawnAt),
  });

  return items.sort((left, right) => left.spawnAtMs - right.spawnAtMs);
};

export const DiamondRainGame = ({
  config,
  onComplete,
  onBack,
}: DiamondRainGameProps) => {
  const { i18n, t } = useTranslation();
  const items = useMemo(() => createFallingItems(config), [config]);

  const durationMs = config.diamondRain.durationSeconds * 1000;

  const [diamonds, setDiamonds] = useState(0);
  const [coloredDiamonds, setColoredDiamonds] = useState(0);
  const [bombs, setBombs] = useState(0);
  const [effects, setEffects] = useState<CollectEffect[]>([]);
  const [scorePulse, setScorePulse] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [remainingSecondsText, setRemainingSecondsText] = useState(
    (durationMs / 1000).toFixed(1),
  );

  const diamondsRef = useRef(0);
  const coloredRef = useRef(0);
  const bombsRef = useRef(0);
  const collectedRef = useRef<Set<string>>(new Set());
  const isCompleteRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const score = getDiamondRainScore(diamonds, bombs, config.diamondRain, coloredDiamonds);
  const scoreText = formatCurrency(score, config.bingo.currency, i18n.language);

  const normalIcon = config.diamondRain.normalIcon || '/diamond/gem.webp';
  const coloredIcon = config.diamondRain.coloredIcon || normalIcon;
  const bombIcon = config.diamondRain.bombIcon || '/diamond/bomb.svg';

  useEffect(() => {
    const startTime = performance.now();
    let onCompleteTimerId: number | undefined;

    const tickId = window.setInterval(() => {
      const elapsed = performance.now() - startTime;
      const left = Math.max(0, (durationMs - elapsed) / 1000);
      setRemainingSecondsText(left.toFixed(1));
      if (elapsed >= durationMs) {
        window.clearInterval(tickId);
      }
    }, 100);

    const completeTimerId = window.setTimeout(() => {
      isCompleteRef.current = true;
      setIsComplete(true);

      onCompleteTimerId = window.setTimeout(() => {
        const finalScore = getDiamondRainReward(
          diamondsRef.current,
          bombsRef.current,
          config.diamondRain,
          coloredRef.current,
        );
        const payload = normalizeDiamondResult(
          {
            diamonds: diamondsRef.current,
            coloredDiamonds: coloredRef.current,
            bombs: bombsRef.current,
            finalScore,
            durationMs,
          },
          config.diamondRain,
        );
        onCompleteRef.current({
          gameType: 'diamond_rain',
          clientResult: payload,
          rewardAmount: payload.finalScore,
        });
      }, 1000);
    }, durationMs);

    return () => {
      window.clearInterval(tickId);
      window.clearTimeout(completeTimerId);
      if (onCompleteTimerId !== undefined) {
        window.clearTimeout(onCompleteTimerId);
      }
    };
  }, [config.diamondRain, durationMs]);

  useEffect(() => {
    if (!scorePulse) {
      return;
    }
    const timer = window.setTimeout(() => setScorePulse(false), 260);
    return () => window.clearTimeout(timer);
  }, [scorePulse]);

  const collectItem = (item: FallingItem, event: PointerEvent<HTMLButtonElement>) => {
    if (isCompleteRef.current) return;
    if (collectedRef.current.has(item.id)) return;

    collectedRef.current.add(item.id);
    const btn = event.currentTarget;
    btn.classList.add('is-collected');

    if (item.type === 'diamond') {
      diamondsRef.current += 1;
      setDiamonds(diamondsRef.current);
    } else if (item.type === 'colored') {
      coloredRef.current += 1;
      setColoredDiamonds(coloredRef.current);
    } else {
      bombsRef.current += 1;
      setBombs(bombsRef.current);
    }

    const field = btn.closest('.rain-field');
    const fieldRect = field?.getBoundingClientRect();
    const x = fieldRect ? event.clientX - fieldRect.left : event.clientX;
    const y = fieldRect ? event.clientY - fieldRect.top : event.clientY;

    const effectId = `${item.id}-${performance.now()}`;
    const label =
      item.type === 'diamond'
        ? `+${config.diamondRain.diamondValue}`
        : item.type === 'colored'
          ? `+${config.diamondRain.coloredScore}`
          : `${config.diamondRain.bombValue}`;
    setEffects((current) => [...current, { id: effectId, type: item.type, x, y, label }]);
    setScorePulse(true);
    window.setTimeout(() => {
      setEffects((current) => current.filter((e) => e.id !== effectId));
    }, 720);
  };

  return (
    <main className={isComplete ? 'game-screen rain-screen is-complete' : 'game-screen rain-screen'}>
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
          const style = {
            left: `${item.left}%`,
            width: item.size,
            height: item.size,
            '--fall-delay': `${item.spawnAtMs}ms`,
            '--fall-duration': `${item.durationMs}ms`,
          } as CSSProperties;

          return (
            <button
              aria-label={item.type === 'bomb' ? t('bombs') : t('diamonds')}
              className={[
                'falling-item',
                item.type === 'bomb' ? 'is-bomb' : '',
                item.type === 'colored' ? 'is-colored' : '',
              ].filter(Boolean).join(' ')}
              key={item.id}
              onPointerDown={(event) => collectItem(item, event)}
              style={style}
              type="button"
            >
              <span className="falling-trail" aria-hidden="true" />
              <img
                alt=""
                src={
                  item.type === 'bomb'
                    ? bombIcon
                    : item.type === 'colored'
                      ? coloredIcon
                      : normalIcon
                }
              />
            </button>
          );
        })}
        {effects.map((effect) => (
          <span
            className={[
              'collect-effect',
              effect.type === 'bomb' ? 'is-bomb' : '',
              effect.type === 'colored' ? 'is-colored' : '',
            ].filter(Boolean).join(' ')}
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
          <img alt="" src={coloredIcon} />
          <strong>+{config.diamondRain.coloredScore}</strong>
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
