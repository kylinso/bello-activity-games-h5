import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ActivityApi } from '@/api/activityApi';
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
import { useIdleTimer } from '@/lib/idle-timer';
import { IDLE_TIMEOUT_MS, isKioskMode } from '@/lib/kiosk';
import { getRequestErrorMessage } from '@/lib/requestErrors';
import { clearStoredAuthState, readStoredAuthState } from '@/lib/storage';
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

interface RoundContext {
  playId: string;
  storeId: string;
  gameType: GameType;
  config: ActivityConfig;
}

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
  const storeId = selectedStore?.id || '';
  const locale = normalizeLocale(i18n.language);

  const isKiosk = isKioskMode();
  useWakeLock(isKiosk);
  useIdleTimer(
    IDLE_TIMEOUT_MS,
    () => {
      clearStoredAuthState();
      window.location.replace('/login');
    },
    isKiosk,
  );

  const [config, setConfig] = useState<ActivityConfig | null>(null);
  const [screen, setScreen] = useState<ScreenState>('attract');
  const [round, setRound] = useState<RoundContext | null>(null);
  const [rewardResult, setRewardResult] = useState<RewardResult | null>(null);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const isStartingGameRef = useRef(false);
  const startGameAttemptRef = useRef(0);
  const submittedPlayId = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      startGameAttemptRef.current += 1;
    };
  }, []);

  const logoutForMissingConfig = useCallback(() => {
    clearStoredAuthState();
    window.location.replace(`/login${window.location.search}`);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fixedT = i18n.getFixedT(locale);

    const loadConfig = async () => {
      if (!sessionId || !storeId) {
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
          storeId,
        });
        if (!cancelled) {
          setConfig(nextConfig);
        }
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        const requestMessage = getRequestErrorMessage(requestError, fixedT('configFailed'));
        console.error('[PAD Game] Failed to load game configuration.', requestMessage);
        if (isActivityError(requestError) && requestError.code === 'CONFIG_MISSING') {
          logoutForMissingConfig();
          return;
        }

        setError(requestMessage);
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
  }, [activityId, i18n, locale, logoutForMissingConfig, sessionId, storeId]);

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
    async (gameType: GameType) => {
      if (!config || !storeId || isStartingGameRef.current) {
        return;
      }

      isStartingGameRef.current = true;
      const attemptId = ++startGameAttemptRef.current;
      setIsStartingGame(true);
      setToastMessage('');
      setRewardResult(null);

      try {
        const roundConfig = await ActivityApi.getConfig({
          activityId,
          locale,
          sessionId,
          storeId,
        });
        if (attemptId !== startGameAttemptRef.current) {
          return;
        }

        const playId = `${sessionId}-${gameType}-${Date.now()}`;
        submittedPlayId.current = null;
        setConfig(roundConfig);
        setRound({ config: roundConfig, gameType, playId, storeId });
        setScreen(gameType);
      } catch (requestError) {
        if (attemptId !== startGameAttemptRef.current) {
          return;
        }

        const requestMessage = getRequestErrorMessage(requestError, t('configFailed'));
        console.error(
          '[PAD Game] Failed to refresh configuration before game start.',
          requestMessage,
        );
        if (isActivityError(requestError) && requestError.code === 'CONFIG_MISSING') {
          logoutForMissingConfig();
          return;
        }

        setToastMessage(requestMessage);
      } finally {
        if (attemptId === startGameAttemptRef.current) {
          isStartingGameRef.current = false;
          setIsStartingGame(false);
        }
      }
    },
    [activityId, config, locale, logoutForMissingConfig, sessionId, storeId, t],
  );

  const completeGame = useCallback(
    async (completedGame: CompletedGamePayload) => {
      if (
        !round ||
        completedGame.gameType !== round.gameType ||
        submittedPlayId.current === round.playId
      ) {
        return;
      }

      submittedPlayId.current = round.playId;
      setIsSubmittingResult(true);
      setToastMessage('');

      try {
        const result = await ActivityApi.submitResult({
          storeId: round.storeId,
          playId: round.playId,
          gameType: round.gameType,
          clientResult: completedGame.clientResult,
        });
        setRewardResult(result);
      } catch (requestError) {
        const requestMessage = getRequestErrorMessage(requestError, t('uploadFailed'));
        console.error('[PAD Game] Failed to upload or parse the game result.', {
          gameType: round.gameType,
          message: requestMessage,
        });
        setRound(null);
        setRewardResult(null);
        setScreen('home');
        setToastMessage(requestMessage);
      } finally {
        setIsSubmittingResult(false);
      }
    },
    [round, t],
  );

  const resetDemo = () => {
    window.localStorage.removeItem(getDemoSessionKey(activityId, selectedStore?.id));
    window.localStorage.removeItem('bello-activity-demo-session');
    window.location.reload();
  };

  const handleBackFromHome = useCallback(() => {
    startGameAttemptRef.current += 1;
    isStartingGameRef.current = false;
    setIsStartingGame(false);
    setScreen('attract');
  }, []);

  const handleBackFromGame = useCallback(() => {
    setRound(null);
    setRewardResult(null);
    setScreen('home');
  }, []);

  const handleBackFromResult = useCallback(() => {
    setRewardResult(null);
    setRound(null);
    setToastMessage('');
    setScreen('home');
  }, []);

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

  const activeConfig = round?.config || config;
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
        <HeaderBar sessionId={config.sessionId} storeName={selectedStore?.name} />
      )}
      {screen === 'attract' ? (
        <AttractScreen config={config} onEnter={() => setScreen('home')} />
      ) : null}
      {screen === 'home' ? (
        <HomeScreen
          config={config}
          isStarting={isStartingGame}
          onBack={handleBackFromHome}
          onStart={startGame}
        />
      ) : null}
      {screen === 'bingo' && round?.gameType === 'bingo' ? (
        <BingoGame
          config={activeConfig}
          onBack={handleBackFromGame}
          onComplete={completeGame}
        />
      ) : null}
      {screen === 'diamond_rain' && round?.gameType === 'diamond_rain' ? (
        <DiamondRainGame
          config={activeConfig}
          onBack={handleBackFromGame}
          onComplete={completeGame}
        />
      ) : null}
      {screen === 'result' && rewardResult ? (
        <ResultScreen
          autoResetMs={
            activeConfig.qrReturnSeconds > 0 ? activeConfig.qrReturnSeconds * 1000 : undefined
          }
          onAutoReset={handleBackFromResult}
          onBack={handleBackFromResult}
          result={rewardResult}
        />
      ) : null}
      {rewardResult && screen !== 'result' ? (
        <CompletionClaimModal result={rewardResult} onClaim={() => setScreen('result')} />
      ) : null}
      {isSubmittingResult ? (
        <div aria-live="polite" className="round-uploading" role="status">
          {t('uploadingResult')}
        </div>
      ) : null}
      {toastMessage ? (
        <div className="toast-error" role="alert">
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
};
