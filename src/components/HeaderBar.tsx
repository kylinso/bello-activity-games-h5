import { useTranslation } from 'react-i18next';
import belloMark from '@/assets/bello-mark.svg';
import { LanguageSwitch } from './LanguageSwitch';

interface HeaderBarProps {
  sessionId: string;
  lockedLabel?: string;
}

export const HeaderBar = ({ sessionId, lockedLabel }: HeaderBarProps) => {
  const { t } = useTranslation();

  return (
    <header className="header-bar">
      <div className="brand-lockup">
        <img alt="" className="brand-mark" src={belloMark} />
        <div>
          <p>{t('appName')}</p>
          <strong>{t('session')}: {sessionId || '-'}</strong>
        </div>
      </div>
      <div className="header-actions">
        {lockedLabel ? <span className="lock-pill">{lockedLabel}</span> : null}
        <LanguageSwitch />
      </div>
    </header>
  );
};
