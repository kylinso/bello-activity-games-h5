import { type CSSProperties, type PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getColoredScoreValue,
  getDiamondRainReward,
  normalizeDiamondResult,
  shuffle,
} from '@/lib/gameRules';
import type {
  ActivityConfig,
  CompletedGamePayload,
} from '@/types/activity';

interface DiamondRainGameProps {
  config: ActivityConfig;
  onComplete: (result: CompletedGamePayload) => void;
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
const FALL_START_VH = -16;
const FALL_END_VH = 110;
const FALL_TRAVEL_VH = FALL_END_VH - FALL_START_VH;
const FALL_LEFT_MIN_PERCENT = 8;
const FALL_LEFT_MAX_PERCENT = 92;
const FALL_LANE_COUNT = 7;
const FALL_LEFT_JITTER_PERCENT = 2.5;
const FALL_HORIZONTAL_GAP_PERCENT = 16;
const FALL_VERTICAL_GAP_VH = 15;
const FALL_POSITION_ATTEMPTS = 28;
const FALL_SPEED_MIN_MS = 3200;
const FALL_SPEED_MAX_MS = 4800;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getFallYAt = (item: FallingItem, timeMs: number) => {
  const progress = clamp((timeMs - item.spawnAtMs) / item.durationMs, 0, 1);
  return FALL_START_VH + FALL_TRAVEL_VH * progress;
};

const getMinVerticalGap = (leftItem: FallingItem, rightItem: FallingItem) => {
  const overlapStart = Math.max(leftItem.spawnAtMs, rightItem.spawnAtMs);
  const overlapEnd = Math.min(
    leftItem.spawnAtMs + leftItem.durationMs,
    rightItem.spawnAtMs + rightItem.durationMs,
  );

  if (overlapStart >= overlapEnd) {
    return Infinity;
  }

  const sampleTimes = [overlapStart, overlapEnd, (overlapStart + overlapEnd) / 2];
  const leftVelocity = FALL_TRAVEL_VH / leftItem.durationMs;
  const rightVelocity = FALL_TRAVEL_VH / rightItem.durationMs;
  const velocityDelta = leftVelocity - rightVelocity;

  if (Math.abs(velocityDelta) > 0.0001) {
    const closestTime =
      (leftVelocity * leftItem.spawnAtMs - rightVelocity * rightItem.spawnAtMs) /
      velocityDelta;

    if (closestTime > overlapStart && closestTime < overlapEnd) {
      sampleTimes.push(closestTime);
    }
  }

  return Math.min(
    ...sampleTimes.map((timeMs) =>
      Math.abs(getFallYAt(leftItem, timeMs) - getFallYAt(rightItem, timeMs)),
    ),
  );
};

const hasVisualOverlap = (candidate: FallingItem, item: FallingItem) => {
  const horizontalGap = Math.abs(candidate.left - item.left);

  if (horizontalGap >= FALL_HORIZONTAL_GAP_PERCENT) {
    return false;
  }

  return getMinVerticalGap(candidate, item) < FALL_VERTICAL_GAP_VH;
};

const getPlacementScore = (candidate: FallingItem, placedItems: FallingItem[]) => {
  return placedItems.reduce((score, item) => {
    const overlapStart = Math.max(candidate.spawnAtMs, item.spawnAtMs);
    const overlapEnd = Math.min(
      candidate.spawnAtMs + candidate.durationMs,
      item.spawnAtMs + item.durationMs,
    );

    if (overlapStart >= overlapEnd) {
      return score;
    }

    const horizontalGap = Math.abs(candidate.left - item.left);
    const verticalGap = getMinVerticalGap(candidate, item);
    const normalizedGap = Math.sqrt(
      (horizontalGap / FALL_HORIZONTAL_GAP_PERCENT) ** 2 +
        (verticalGap / FALL_VERTICAL_GAP_VH) ** 2,
    );

    return Math.min(score, normalizedGap);
  }, Infinity);
};

const createFallingItems = (config: ActivityConfig): FallingItem[] => {
  const items: FallingItem[] = [];
  const totalItems = config.diamondRain.diamondCount + config.diamondRain.bombCount;
  const durationMs = config.diamondRain.durationSeconds * 1000;
  const tailBufferMs = Math.min(SAFETY_BUFFER_MS, durationMs * 0.1);
  const availableFallMs = Math.max(250, durationMs - tailBufferMs);

  const minFallMs = Math.min(FALL_SPEED_MIN_MS, Math.max(250, availableFallMs * 0.65));
  const maxFallMs = Math.max(minFallMs, Math.min(FALL_SPEED_MAX_MS, availableFallMs));
  const spawnWindowMs = Math.max(0, durationMs - minFallMs - tailBufferMs);
  const spacing = spawnWindowMs / Math.max(totalItems - 1, 1);
  const itemTypes = shuffle([
    ...Array.from({ length: config.diamondRain.diamondCount }, () => 'diamond' as const),
    ...Array.from({ length: config.diamondRain.bombCount }, () => 'bomb' as const),
  ]);
  const laneLefts = Array.from({ length: FALL_LANE_COUNT }, (_, index) => {
    const ratio = index / Math.max(FALL_LANE_COUNT - 1, 1);
    return FALL_LEFT_MIN_PERCENT + (FALL_LEFT_MAX_PERCENT - FALL_LEFT_MIN_PERCENT) * ratio;
  });

  const pickFallDuration = (spawnAtMs: number) => {
    const availableMs = Math.max(minFallMs, durationMs - spawnAtMs - tailBufferMs);
    const clampedMax = Math.min(maxFallMs, availableMs);
    const span = Math.max(0, clampedMax - minFallMs);
    return minFallMs + Math.random() * span;
  };

  const pickLeft = (baseItem: Omit<FallingItem, 'left'>) => {
    let bestLeft = laneLefts[0];
    let bestScore = -Infinity;
    const lanes = shuffle(laneLefts);

    for (let attempt = 0; attempt < FALL_POSITION_ATTEMPTS; attempt += 1) {
      const lane = lanes[attempt % lanes.length];
      const jitter = (Math.random() - 0.5) * FALL_LEFT_JITTER_PERCENT;
      const left = clamp(lane + jitter, FALL_LEFT_MIN_PERCENT, FALL_LEFT_MAX_PERCENT);
      const candidate = { ...baseItem, left };

      if (!items.some((item) => hasVisualOverlap(candidate, item))) {
        return left;
      }

      const score = getPlacementScore(candidate, items);
      if (score > bestScore) {
        bestLeft = left;
        bestScore = score;
      }
    }

    return bestLeft;
  };

  for (let index = 0; index < totalItems; index += 1) {
    const type = itemTypes[index] || 'diamond';
    const spawnAtMs = Math.min(
      spawnWindowMs,
      Math.max(0, index * spacing - 320 + Math.random() * 420),
    );
    const durationMs = pickFallDuration(spawnAtMs);
    const baseItem = {
      id: `${type}-${index}`,
      type,
      size: FALLING_ITEM_SIZE,
      spawnAtMs,
      durationMs,
    };

    items.push({
      ...baseItem,
      left: pickLeft(baseItem),
    });
  }

  const coloredSpawnAt = Math.min(spawnWindowMs, spawnWindowMs * 0.6);
  const coloredDurationMs = pickFallDuration(coloredSpawnAt);
  const coloredBaseItem = {
    id: 'colored-0',
    type: 'colored' as const,
    size: FALLING_ITEM_SIZE,
    spawnAtMs: coloredSpawnAt,
    durationMs: coloredDurationMs,
  };

  if (config.diamondRain.coloredEnabled) {
    items.push({
      ...coloredBaseItem,
      left: pickLeft(coloredBaseItem),
    });
  }

  return items.sort((left, right) => left.spawnAtMs - right.spawnAtMs);
};

export const DiamondRainGame = ({
  config,
  onComplete,
  onBack,
}: DiamondRainGameProps) => {
  const { t } = useTranslation();
  const items = useMemo(() => createFallingItems(config), [config]);

  const durationMs = config.diamondRain.durationSeconds * 1000;
  const coloredScoreValue = getColoredScoreValue(config.diamondRain);

  const [diamonds, setDiamonds] = useState(0);
  const [coloredDiamonds, setColoredDiamonds] = useState(0);
  const [bombs, setBombs] = useState(0);
  const [effects, setEffects] = useState<CollectEffect[]>([]);
  const [scorePulse, setScorePulse] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [remainingSecondsText, setRemainingSecondsText] = useState(
    (durationMs / 1000).toFixed(1),
  );
  const [displayScore, setDisplayScore] = useState(0);

  const diamondsRef = useRef(0);
  const coloredRef = useRef(0);
  const bombsRef = useRef(0);
  const displayScoreRef = useRef(0);
  const collectedRef = useRef<Set<string>>(new Set());
  const isCompleteRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const updateDisplayScore = () => {
    displayScoreRef.current = getDiamondRainReward(
      diamondsRef.current,
      bombsRef.current,
      config.diamondRain,
      coloredRef.current,
    );
    setDisplayScore(displayScoreRef.current);
  };

  const scoreText = String(displayScore);

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
        const finalScore = displayScoreRef.current;
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
        // 累计分以"屏幕显示"为准，覆盖 normalize 内部的 max(0, sum) 重算
        payload.finalScore = finalScore;
        onCompleteRef.current({
          gameType: 'diamond_rain',
          clientResult: payload,
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
    updateDisplayScore();

    const field = btn.closest('.rain-field');
    const fieldRect = field?.getBoundingClientRect();
    const x = fieldRect ? event.clientX - fieldRect.left : event.clientX;
    const y = fieldRect ? event.clientY - fieldRect.top : event.clientY;

    const effectId = `${item.id}-${performance.now()}`;
    const label =
      item.type === 'diamond'
        ? `+${config.diamondRain.diamondValue}`
        : item.type === 'colored'
          ? config.diamondRain.coloredRewardType === 'SCORE'
            ? `+${coloredScoreValue}`
            : 'BP'
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
            '--fall-start': `${FALL_START_VH}vh`,
            '--fall-end': `${FALL_END_VH}vh`,
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
          {config.diamondRain.coloredEnabled ? (
            <>
              <span>/</span>
              <img alt="" src={coloredIcon} />
              <strong>
                {config.diamondRain.coloredRewardType === 'SCORE'
                  ? `+${coloredScoreValue}`
                  : 'BP'}
              </strong>
            </>
          ) : null}
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
