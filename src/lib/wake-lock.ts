import { useEffect } from 'react';

type WakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
  removeEventListener: (type: 'release', listener: () => void) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinel>;
  };
};

const supported = (): boolean => {
  return typeof navigator !== 'undefined' && Boolean((navigator as WakeLockNavigator).wakeLock);
};

const requestSentinel = async (): Promise<WakeLockSentinel | null> => {
  if (!supported()) return null;
  try {
    return await (navigator as WakeLockNavigator).wakeLock!.request('screen');
  } catch {
    return null;
  }
};

/**
 * 在 React 组件挂载期间申请 screen wake lock，离开前释放。
 * 监听 visibilitychange：被切走时 wake lock 会被浏览器自动释放，回前台时主动重申。
 * 不支持的浏览器静默忽略。
 */
export const useWakeLock = (enabled: boolean): void => {
  useEffect(() => {
    if (!enabled || !supported()) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled) return;
      if (sentinel && !sentinel.released) return;
      sentinel = await requestSentinel();
    };

    void acquire();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void acquire();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (sentinel && !sentinel.released) {
        void sentinel.release();
      }
      sentinel = null;
    };
  }, [enabled]);
};
