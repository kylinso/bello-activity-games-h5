import type { StoredAuthState, StoreProfile } from '@/types/auth';

const AUTH_KEY = 'bello-activity:auth';

export const readStoredAuthState = () => {
  const raw = window.localStorage.getItem(AUTH_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAuthState;
  } catch {
    window.localStorage.removeItem(AUTH_KEY);
    return null;
  }
};

export const hasUsableAuthState = (state: StoredAuthState | null) => {
  if (!state?.token) {
    return false;
  }

  if (!state.tokenExpiresAt) {
    return true;
  }

  return new Date(state.tokenExpiresAt).getTime() > Date.now();
};

export const writeStoredAuthState = (state: StoredAuthState) => {
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(state));
};

export const selectStoredStore = (store: StoreProfile) => {
  const current = readStoredAuthState();
  if (!current) {
    return null;
  }

  const nextState = {
    ...current,
    selectedStore: store,
  };
  writeStoredAuthState(nextState);
  return nextState;
};

export const clearStoredAuthState = () => {
  window.localStorage.removeItem(AUTH_KEY);
};
