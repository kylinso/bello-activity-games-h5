import { useTranslation } from 'react-i18next';
import belloMark from '@/assets/bello-mark.svg';

export const LoadingState = () => {
  const { t } = useTranslation();

  return (
    <div className="center-state">
      <img alt="" src={belloMark} />
      <p>{t('loading')}</p>
    </div>
  );
};
