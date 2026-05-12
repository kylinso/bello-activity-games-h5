import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ActivityApi } from '@/api/activityApi';
import { AdBanner } from '@/components/AdBanner';
import { AttractScreen } from '@/components/AttractScreen';
import { BingoGame } from '@/components/BingoGame';
import { BlockingState } from '@/components/BlockingState';
import { CompletionClaimModal } from '@/components/CompletionClaimModal';
import { DiamondRainGame } from '@/components/DiamondRainGame';
import { FxLayer } from '@/components/FxLayer';
import { HeaderBar } from '@/components/HeaderBar';
import { HomeScreen } from '@/components/DemoStage';
import { LoadingState } from '@/components/LoadingState';
import { ResultScreen } from '@/components/ResultScreen';
import { isKioskMode } from '@/lib/kiosk';
import { getRequestErrorMessage } from '@/lib/requestErrors';
import { readStoredAuthState } from '@/lib/storage';
import { useWakeLock } from '@/lib/wake-lock';
import type {
  ActivityConfig,
  CompletedGamePayload,
  GameType,
  Locale,
  RewardResult,
} from '@/types/activity';
import { isActivityError } from '@/types/activity';
import type { ScreenState } from '@/types/ui';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

const normalizeLocale = (language: string): Locale => {
  if (language.startsWith('zh')) {
    return 'zh';
  }

  if (language.startsWith('ms')) {
    return 'ms';
  }

  return 'en';
};

const getDemoSessionKey = (activityId: string, storeId?: string) => {
  return `bello-activity-demo-session:${activityId}:${storeId || 'default'}`;
};

const getDemoSessionId = (activityId: string, storeId?: string) => {
  const storageKey = getDemoSessionKey(activityId, storeId);
  const existing = window.localStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  const next = `DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  window.localStorage.setItem(storageKey, next);
  return next;
};

export const GamePage = () => {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const authState = readStoredAuthState();
  const selectedStore = authState?.selectedStore;
  const activityId =
    searchParams.get('activityId') ||
    selectedStore?.activityId ||
    authState?.activityId ||
    'bello-tablet-demo';
  const requestedSessionId = searchParams.get('sessionId');
  const authSessionId = selectedStore?.sessionId || authState?.sessionId;
  const sessionId =
    requestedSessionId ||
    authSessionId ||
    selectedStore?.id ||
    (isMockMode ? getDemoSessionId(activityId, selectedStore?.id) : '');
  const locale = normalizeLocale(i18n.language);

  const isKiosk = isKioskMode();
  useWakeLock(isKiosk);

  const [config, setConfig] = useState<ActivityConfig | null>(null);
  const [screen, setScreen] = useState<ScreenState>('attract');
  const [playId, setPlayId] = useState('');
  const [completedGame, setCompletedGame] = useState<CompletedGamePayload | null>(null);
  const [rewardResult, setRewardResult] = useState<RewardResult | null>(null);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isClaimSubmitting, setIsClaimSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fixedT = i18n.getFixedT(locale);

    const loadConfig = async () => {
      if (!sessionId) {
        setError(fixedT('noSession'));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const nextConfig = await ActivityApi.getConfig({
          activityId,
          locale,
          sessionId,
          storeId: selectedStore?.id,
        });
        if (cancelled) {
          return;
        }

        setConfig(nextConfig);
      } catch (requestError) {
        if (cancelled) {
          return;
        }
        setError(isActivityError(requestError) ? requestError.message : fixedT('configFailed'));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, [activityId, i18n, locale, selectedStore?.id, sessionId]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToastMessage('');
    }, 4000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toastMessage]);

  const startGame = useCallback(
    (gameType: GameType) => {
      if (!config) {
        return;
      }

      setError('');
      setToastMessage('');
      setCompletedGame(null);
      setRewardResult(null);
      setIsClaimSubmitting(false);
      setPlayId(`${config.sessionId}-${gameType}-${Date.now()}`);
      setScreen(gameType);
    },
    [config],
  );

  const completeGame = useCallback(
    (result: CompletedGamePayload) => {
      if (!config) {
        return;
      }

      setCompletedGame(result);
      setToastMessage('');
    },
    [config],
  );

  const claimReward = useCallback(async () => {
    if (!config || !completedGame || !playId || isClaimSubmitting) {
      return;
    }

    setIsClaimSubmitting(true);
    setToastMessage('');

    try {
      const result = await ActivityApi.submitResult({
        config,
        playId,
        gameType: completedGame.gameType,
        clientResult: completedGame.clientResult,
      });
      setRewardResult(result);
      setCompletedGame(null);
      setScreen('result');
    } catch (requestError) {
      setToastMessage(getRequestErrorMessage(requestError, t('startFailed')));
    } finally {
      setIsClaimSubmitting(false);
    }
  }, [completedGame, config, isClaimSubmitting, playId, t]);

  const showGameError = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  const resetDemo = () => {
    window.localStorage.removeItem(getDemoSessionKey(activityId, selectedStore?.id));
    window.localStorage.removeItem('bello-activity-demo-session');
    window.location.reload();
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !config) {
    return (
      <div className="app-shell">
        <FxLayer />
        <HeaderBar sessionId={sessionId} storeName={selectedStore?.name} />
        <BlockingState
          canResetDemo={isMockMode}
          message={error || t('configFailed')}
          onResetDemo={resetDemo}
        />
      </div>
    );
  }

  const isGameRunning = screen === 'bingo' || screen === 'diamond_rain';
  const shellClassName = isGameRunning
    ? 'app-shell is-game-running'
    : screen === 'attract'
      ? 'app-shell is-attract'
      : screen === 'result'
        ? 'app-shell is-result'
        : screen === 'home'
          ? 'app-shell is-home-selection'
          : 'app-shell';

  return (
    <div className={shellClassName}>
      <FxLayer />
      {screen === 'attract' || isGameRunning || screen === 'result' || screen === 'home' ? null : (
        <HeaderBar
          sessionId={config.sessionId}
          storeName={selectedStore?.name}
        />
      )}
      {screen === 'attract' ? (
        <AttractScreen config={config} onEnter={() => setScreen('home')} />
      ) : null}
      {screen === 'home' ? (
        <HomeScreen config={config} onBack={() => setScreen('attract')} onStart={startGame} />
      ) : null}
      {screen === 'bingo' && playId ? (
        <BingoGame
          config={config}
          onBack={() => setScreen('home')}
          onComplete={completeGame}
          onError={showGameError}
          playId={playId}
        />
      ) : null}
      {screen === 'diamond_rain' && playId ? (
        <DiamondRainGame
          config={config}
          onBack={() => setScreen('home')}
          onComplete={completeGame}
          onError={showGameError}
          playId={playId}
        />
      ) : null}
      {screen === 'result' && rewardResult ? <ResultScreen result={rewardResult} /> : null}
      {completedGame ? (
        <CompletionClaimModal
          completedGame={completedGame}
          config={config}
          isSubmitting={isClaimSubmitting}
          onClaim={claimReward}
        />
      ) : null}
      {screen === 'home' ? <AdBanner config={config} /> : null}
      {toastMessage ? <div className="toast-error">{toastMessage}</div> : null}
    </div>
  );
};
