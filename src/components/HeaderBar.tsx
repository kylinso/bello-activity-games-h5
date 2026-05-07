import { useTranslation } from 'react-i18next';
import belloMark from '@/assets/bello-mark.svg';
import { LanguageSwitch } from './LanguageSwitch';

interface HeaderBarProps {
  sessionId: string;
  storeName?: string;
}

export const HeaderBar = ({ sessionId, storeName }: HeaderBarProps) => {
  const { t } = useTranslation();

  return (
    <header className="header-bar">
      <div className="brand-lockup">
        <img alt="" className="brand-mark" src={belloMark} />
        <div>
          <p>{t('appName')}</p>
          <strong>
            {storeName ? `${t('store')}: ${storeName}` : `${t('session')}: ${sessionId || '-'}`}
          </strong>
        </div>
      </div>
      <div className="header-actions">
        <LanguageSwitch />
      </div>
    </header>
  );
};
