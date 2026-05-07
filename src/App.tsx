import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ActivityApi } from '@/api/activityApi';
import { AdBanner } from '@/components/AdBanner';
import { AttractScreen } from '@/components/AttractScreen';
import { BingoGame } from '@/components/BingoGame';
import { BlockingState } from '@/components/BlockingState';
import { DiamondRainGame } from '@/components/DiamondRainGame';
import { FxLayer } from '@/components/FxLayer';
import { HeaderBar } from '@/components/HeaderBar';
import { HomeScreen } from '@/components/DemoStage';
import { LoadingState } from '@/components/LoadingState';
import { ResultScreen } from '@/components/ResultScreen';
import {
  clearStoredPlayState,
  readStoredPlayState,
  writeStoredPlayState,
} from '@/lib/storage';
import type {
  ActivityConfig,
  GameType,
  Locale,
  RewardResult,
} from '@/types/activity';
import { isActivityError } from '@/types/activity';
import type { ScreenState } from '@/types/ui';

const isMockMode = import.meta.env.VITE_USE_MOCKS !== 'false';

const normalizeLocale = (language: string): Locale => {
  if (language.startsWith('zh')) {
    return 'zh';
  }

  if (language.startsWith('ms')) {
    return 'ms';
  }

  return 'en';
};

const getDemoSessionId = () => {
  const existing = window.localStorage.getItem('bello-activity-demo-session');
  if (existing) {
    return existing;
  }

  const next = `DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  window.localStorage.setItem('bello-activity-demo-session', next);
  return next;
};

const App = () => {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const activityId = searchParams.get('activityId') || 'bello-tablet-demo';
  const requestedSessionId = searchParams.get('sessionId');
  const sessionId = requestedSessionId || (isMockMode ? getDemoSessionId() : '');
  const locale = normalizeLocale(i18n.language);

  const [config, setConfig] = useState<ActivityConfig | null>(null);
  const [screen, setScreen] = useState<ScreenState>('attract');
  const [playId, setPlayId] = useState('');
  const [lockedGameType, setLockedGameType] = useState<GameType | null>(null);
  const [startingGame, setStartingGame] = useState<GameType | null>(null);
  const [rewardResult, setRewardResult] = useState<RewardResult | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const lockedLabel = useMemo(() => {
    if (!lockedGameType) {
      return '';
    }

    return `${t('locked')}: ${
      lockedGameType === 'bingo' ? t('bingoTitle') : t('diamondTitle')
    }`;
  }, [lockedGameType, t]);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      if (!sessionId) {
        setError(t('noSession'));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const nextConfig = await ActivityApi.getConfig({ activityId, sessionId, locale });
        if (cancelled) {
          return;
        }

        setConfig(nextConfig);
        const storedState = readStoredPlayState(activityId, sessionId);
        if (storedState) {
          setLockedGameType(storedState.gameType);
          if (storedState.result) {
            setRewardResult(storedState.result);
            setScreen('result');
          }
        }
      } catch (requestError) {
        if (cancelled) {
          return;
        }
        setError(isActivityError(requestError) ? requestError.message : t('configFailed'));
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
  }, [activityId, locale, sessionId, t]);

  const startGame = useCallback(
    async (gameType: GameType) => {
      if (!config || startingGame) {
        return;
      }

      if (lockedGameType && lockedGameType === gameType && playId) {
        setScreen(gameType);
        return;
      }

      setStartingGame(gameType);
      setError('');
      try {
        const session = await ActivityApi.startGame(config, gameType);
        setPlayId(session.playId);
        setLockedGameType(session.lockedGameType);
        setScreen(session.lockedGameType);
      } catch (requestError) {
        setError(isActivityError(requestError) ? requestError.message : t('startFailed'));
      } finally {
        setStartingGame(null);
      }
    },
    [config, lockedGameType, playId, startingGame, t],
  );

  const completeGame = useCallback(
    (result: RewardResult) => {
      if (!config) {
        return;
      }

      setRewardResult(result);
      setScreen('result');
      setLockedGameType(result.gameType);
      writeStoredPlayState(config.activityId, config.sessionId, {
        gameType: result.gameType,
        result,
      });
    },
    [config],
  );

  const resetDemo = () => {
    if (config) {
      clearStoredPlayState(config.activityId, config.sessionId);
    }
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
        <HeaderBar sessionId={sessionId} />
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
      : 'app-shell';

  return (
    <div className={shellClassName}>
      <FxLayer />
      {screen === 'attract' ? null : (
        <HeaderBar lockedLabel={lockedLabel} sessionId={config.sessionId} />
      )}
      {screen === 'attract' ? (
        <AttractScreen config={config} onEnter={() => setScreen('home')} />
      ) : null}
      {screen === 'home' ? (
        <HomeScreen
          config={config}
          lockedGameType={lockedGameType}
          onStart={startGame}
          startingGame={startingGame}
        />
      ) : null}
      {screen === 'bingo' && playId ? (
        <BingoGame
          config={config}
          onBack={() => setScreen('home')}
          onComplete={completeGame}
          playId={playId}
        />
      ) : null}
      {screen === 'diamond_rain' && playId ? (
        <DiamondRainGame
          config={config}
          onBack={() => setScreen('home')}
          onComplete={completeGame}
          playId={playId}
        />
      ) : null}
      {screen === 'result' && rewardResult ? <ResultScreen result={rewardResult} /> : null}
      {screen === 'home' ? <AdBanner config={config} /> : null}
      {error ? <div className="toast-error">{error}</div> : null}
    </div>
  );
};

export default App;
