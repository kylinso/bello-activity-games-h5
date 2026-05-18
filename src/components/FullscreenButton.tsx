import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCompress, FaExpand } from 'react-icons/fa';
import { exitFullscreen, isInFullscreen, requestFullscreen } from '@/lib/fullscreen';

export const FullscreenButton = () => {
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(() => isInFullscreen());

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(isInFullscreen());
    };

    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
    document.addEventListener('MSFullscreenChange', syncFullscreen);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen);
      document.removeEventListener('MSFullscreenChange', syncFullscreen);
    };
  }, []);

  const label = isFullscreen ? t('exitFullscreen') : t('enterFullscreen');
  const Icon = isFullscreen ? FaCompress : FaExpand;

  const handleClick = async () => {
    if (isInFullscreen()) {
      await exitFullscreen();
    } else {
      await requestFullscreen();
    }

    setIsFullscreen(isInFullscreen());
  };

  return (
    <button
      aria-label={label}
      aria-pressed={isFullscreen}
      className={isFullscreen ? 'fullscreen-button is-active' : 'fullscreen-button'}
      onClick={handleClick}
      title={label}
      type="button"
    >
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
};
