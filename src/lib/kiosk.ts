const STORAGE_KEY = 'bello-activity:kiosk';

export const IDLE_TIMEOUT_MS = 90_000;
export const RESULT_AUTO_RESET_MS = 8_000;

export const initKioskFromUrl = (): void => {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const flag = params.get('kiosk');
  if (flag === '1') {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } else if (flag === '0') {
    window.localStorage.removeItem(STORAGE_KEY);
  }
};

export const isKioskMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === '1';
};
