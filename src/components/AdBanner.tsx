import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTicketAlt } from 'react-icons/fa';
import { ActivityApi } from '@/api/activityApi';
import type { ActivityConfig } from '@/types/activity';

interface AdBannerProps {
  config: ActivityConfig;
}

export const AdBanner = ({ config }: AdBannerProps) => {
  const { t } = useTranslation();
  const items = [...config.banners, ...config.banners];

  useEffect(() => {
    config.banners.forEach((banner) => {
      void ActivityApi.trackBannerEvent({
        activityId: config.activityId,
        sessionId: config.sessionId,
        bannerId: banner.id,
        eventType: 'impression',
      });
    });
  }, [config]);

  return (
    <aside className="ad-banner" aria-label={t('bannerLabel')}>
      <div className="banner-track">
        {items.map((banner, index) => (
          <a
            className="banner-item"
            href={banner.linkUrl || '#'}
            key={`${banner.id}-${index}`}
            onClick={() => {
              void ActivityApi.trackBannerEvent({
                activityId: config.activityId,
                sessionId: config.sessionId,
                bannerId: banner.id,
                eventType: 'click',
              });
            }}
            rel="noreferrer"
            target="_blank"
          >
            <FaTicketAlt aria-hidden="true" />
            <span>
              <strong>{banner.title}</strong>
              <small>{banner.subtitle}</small>
            </span>
          </a>
        ))}
      </div>
    </aside>
  );
};
