import { useTranslation } from 'react-i18next';
import { FaRedoAlt } from 'react-icons/fa';

interface BlockingStateProps {
  message: string;
  canResetDemo?: boolean;
  onResetDemo?: () => void;
}

export const BlockingState = ({ message, canResetDemo, onResetDemo }: BlockingStateProps) => {
  const { t } = useTranslation();

  return (
    <div className="center-state blocking-state">
      <h1>{message}</h1>
      <p>{t('networkBlocked')}</p>
      {canResetDemo ? (
        <button className="primary-button" onClick={onResetDemo} type="button">
          <FaRedoAlt aria-hidden="true" />
          {t('resetDemo')}
        </button>
      ) : null}
    </div>
  );
};
