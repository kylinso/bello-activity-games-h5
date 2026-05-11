import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import {
  FaCheck,
  FaChevronDown,
  FaEye,
  FaEyeSlash,
  FaMapMarkerAlt,
  FaStore,
} from 'react-icons/fa';
import { ActivityApi } from '@/api/activityApi';
import {
  clearStoredAuthState,
  hasUsableAuthState,
  readStoredAuthState,
  writeStoredAuthState,
} from '@/lib/storage';
import type { StoredAuthState, StoreProfile } from '@/types/auth';

const COUNTRY_CODE = '+60';
const TURNSTILE_SITE_KEY = '0x4AAAAAACJttmKPvLZt80Vf';

type LoginMode = 'code' | 'password';
type LoginStep = 'login' | 'store';

const getCleanPhone = (phone: string) => phone.replace(/\D/g, '');

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message || fallback);
  }

  return fallback;
};

export const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const turnstileRef = useRef<TurnstileInstance>();
  const storedAuth = readStoredAuthState();
  const [step, setStep] = useState<LoginStep>(() =>
    hasUsableAuthState(storedAuth) && !storedAuth?.selectedStore ? 'store' : 'login',
  );
  const [authDraft, setAuthDraft] = useState<StoredAuthState | null>(() =>
    hasUsableAuthState(storedAuth) ? storedAuth : null,
  );
  const [mode, setMode] = useState<LoginMode>('code');
  const [phone, setPhone] = useState(storedAuth?.phone || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState(
    storedAuth?.selectedStore?.id || storedAuth?.stores[0]?.id || '',
  );
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendCodeCountdown, setSendCodeCountdown] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const returnTo = useMemo(() => {
    const state = location.state as { from?: string } | null;
    if (state?.from && !state.from.startsWith('/login')) {
      return state.from;
    }

    return `/game${location.search}`;
  }, [location.search, location.state]);

  useEffect(() => {
    const currentAuth = readStoredAuthState();
    if (hasUsableAuthState(currentAuth) && currentAuth?.selectedStore) {
      navigate(returnTo, { replace: true });
    }
  }, [navigate, returnTo]);

  useEffect(() => {
    if (sendCodeCountdown <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSendCodeCountdown((countdown) => Math.max(0, countdown - 1));
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [sendCodeCountdown]);

  const cleanPhone = getCleanPhone(phone);
  const stores = authDraft?.stores || [];
  const selectedStore =
    stores.find((store) => store.id === selectedStoreId) || stores[0] || null;
  const canSubmit =
    acceptedTerms &&
    cleanPhone.length >= 6 &&
    Boolean(turnstileToken) &&
    (mode === 'code' ? verificationCode.trim().length > 0 : password.trim().length > 0);

  const resetTurnstile = () => {
    setTurnstileToken('');
    turnstileRef.current?.reset();
  };

  const handleSendCode = async () => {
    if (cleanPhone.length < 6 || isSendingCode || sendCodeCountdown > 0) {
      return;
    }

    setIsSendingCode(true);
    setMessage('');
    setError('');

    try {
      await ActivityApi.sendLoginCode({
        countryCode: COUNTRY_CODE,
        phone: cleanPhone,
      });
      setMessage(t('loginCodeSent'));
      setSendCodeCountdown(60);
    } catch (requestError) {
      setError(getErrorMessage(requestError, t('loginFailed')));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) {
      if (!turnstileToken) {
        setError(t('turnstileRequired'));
      }
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    setError('');

    try {
      const loginResponse =
        mode === 'code'
          ? await ActivityApi.loginWithCode({
              countryCode: COUNTRY_CODE,
              phone: cleanPhone,
              verificationCode: verificationCode.trim(),
              cfTurnstileResponse: turnstileToken,
            })
          : await ActivityApi.loginWithPassword({
              countryCode: COUNTRY_CODE,
              phone: cleanPhone,
              password,
              cfTurnstileResponse: turnstileToken,
            });

      writeStoredAuthState(loginResponse);
      const stores = await ActivityApi.getMerchantStores(loginResponse.token);

      if (stores.length === 0) {
        setError(t('noStoreAvailable'));
        return;
      }

      const nextAuth: StoredAuthState = {
        ...loginResponse,
        stores,
      };
      writeStoredAuthState(nextAuth);
      setAuthDraft(nextAuth);
      setSelectedStoreId(stores[0].id);
      setStep('store');
    } catch (requestError) {
      setError(getErrorMessage(requestError, t('loginFailed')));
      resetTurnstile();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectStore = () => {
    if (!authDraft || !selectedStore) {
      setError(t('noStoreAvailable'));
      return;
    }

    writeStoredAuthState({
      ...authDraft,
      selectedStore,
    });
    navigate(returnTo, { replace: true });
  };

  const handleLogout = () => {
    clearStoredAuthState();
    setAuthDraft(null);
    setSelectedStoreId('');
    setStep('login');
    setMessage('');
    setError('');
  };

  if (step === 'store' && authDraft) {
    return (
      <main className="auth-shell is-store-select">
        <AuthBrand />
        <h1 className="store-select-title">{t('storeSelectTitle')}</h1>
        <section className="store-select-panel" aria-label={t('storeSelectTitle')}>
          <div className="store-list">
            {stores.map((store) => (
              <StoreOption
                isSelected={store.id === selectedStore?.id}
                key={store.id}
                onSelect={setSelectedStoreId}
                store={store}
              />
            ))}
          </div>
        </section>
        <div className="store-actions">
          <button
            className="auth-primary-button"
            disabled={!selectedStore}
            onClick={handleSelectStore}
            type="button"
          >
            <span>{t('chooseStore')}</span>
          </button>
          <button className="auth-logout-link" onClick={handleLogout} type="button">
            {t('logout')}
          </button>
        </div>
        {error ? <p className="auth-error">{error}</p> : null}
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <AuthBrand />
      <section className="login-panel" aria-label={t('login')}>
        <form className="login-form" onSubmit={handleSubmit}>
          <label className="auth-field auth-phone-field">
            <span className="auth-country-select">
              <select aria-label={t('phoneCountryCode')} disabled value={COUNTRY_CODE}>
                <option value={COUNTRY_CODE}>{COUNTRY_CODE}</option>
              </select>
              <FaChevronDown aria-hidden="true" />
            </span>
            <span className="auth-input-divider" />
            <input
              autoComplete="tel-national"
              inputMode="numeric"
              onChange={(event) => setPhone(getCleanPhone(event.target.value))}
              pattern="[0-9]*"
              placeholder={t('loginPhonePlaceholder')}
              type="tel"
              value={phone}
            />
          </label>

          {mode === 'code' ? (
            <label className="auth-field">
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                onChange={(event) => setVerificationCode(event.target.value)}
                placeholder={t('loginCodePlaceholder')}
                type="text"
                value={verificationCode}
              />
              <span className="auth-input-divider" />
              <button
                className="send-code-button"
                disabled={cleanPhone.length < 6 || isSendingCode || sendCodeCountdown > 0}
                onClick={handleSendCode}
                type="button"
              >
                {isSendingCode
                  ? t('sendingCode')
                  : sendCodeCountdown > 0
                    ? t('sendCodeCountdown', { count: sendCodeCountdown })
                    : t('sendCode')}
              </button>
            </label>
          ) : (
            <label className="auth-field">
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('loginPasswordPlaceholder')}
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={t('passwordVisibility')}
                className="password-visibility-button"
                onClick={() => setShowPassword((isVisible) => !isVisible)}
                type="button"
              >
                {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
              </button>
            </label>
          )}

          <button
            className="login-mode-button"
            onClick={() => {
              setMode((currentMode) => (currentMode === 'code' ? 'password' : 'code'));
              setMessage('');
              setError('');
              resetTurnstile();
            }}
            type="button"
          >
            {mode === 'code' ? t('passwordLogin') : t('verificationCodeLogin')}
          </button>

          <div className="auth-turnstile">
            <Turnstile
              onError={() => setTurnstileToken('')}
              onExpire={() => setTurnstileToken('')}
              onSuccess={(token) => {
                setTurnstileToken(token);
                setError('');
              }}
              onTimeout={() => setTurnstileToken('')}
              options={{
                appearance: 'always',
                language: 'auto',
                size: 'flexible',
                theme: 'dark',
              }}
              ref={turnstileRef}
              siteKey={TURNSTILE_SITE_KEY}
            />
          </div>

          <button
            className="auth-primary-button"
            disabled={!canSubmit || isSubmitting}
            type="submit"
          >
            <span>{isSubmitting ? t('loggingIn') : t('login')}</span>
          </button>

          {message ? <p className="auth-message">{message}</p> : null}
          {error ? <p className="auth-error">{error}</p> : null}
        </form>
      </section>

      <label className="auth-terms">
        <input
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
          type="checkbox"
        />
        <span>{t('loginAgreePrefix')}</span>
        <a href="/terms" target="_blank" rel="noreferrer">
          {t('termsOfService')}
        </a>
        <span>{t('and')}</span>
        <a href="/privacy" target="_blank" rel="noreferrer">
          {t('privacyPolicy')}
        </a>
      </label>
    </main>
  );
};

const AuthBrand = () => {
  return (
    <header className="auth-brand">
      <img alt="" src="/logo.svg" />
      <span>
        <strong>Bello</strong>
        <small>GAME KIOSK</small>
      </span>
    </header>
  );
};

const StoreOption = ({
  store,
  isSelected,
  onSelect,
}: {
  store: StoreProfile;
  isSelected: boolean;
  onSelect: (storeId: string) => void;
}) => {
  const { t } = useTranslation();

  return (
    <label className={isSelected ? 'store-option is-selected' : 'store-option'}>
      <input
        checked={isSelected}
        name="store"
        onChange={() => onSelect(store.id)}
        type="radio"
        value={store.id}
      />
      <span className="store-cover">
        {store.coverUrl ? <img alt="" src={store.coverUrl} /> : t('storeCover')}
      </span>
      <span className="store-copy">
        <strong>
          <FaStore aria-hidden="true" />
          {store.name}
        </strong>
        <small>{store.countryCity}</small>
        <span>
          <FaMapMarkerAlt aria-hidden="true" />
          {store.address}
        </span>
      </span>
      <span className="store-radio" aria-hidden="true">
        {isSelected ? <FaCheck /> : null}
      </span>
    </label>
  );
};
