import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaChevronRight,
  FaCoins,
  FaGem,
  FaGift,
  FaMapMarkerAlt,
  FaTicketAlt,
} from 'react-icons/fa';
import { ActivityApi } from '@/api/activityApi';
import type { ActivityConfig } from '@/types/activity';

interface AdBannerProps {
  config: ActivityConfig;
}

const bannerIcons = [FaGift, FaMapMarkerAlt, FaCoins, FaGem, FaTicketAlt];

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

  if (config.banners.length === 0) {
    return null;
  }

  return (
    <aside className="ad-banner" aria-label={t('bannerLabel')}>
      <div className="banner-track">
        {items.map((banner, index) => {
          const Icon = bannerIcons[index % bannerIcons.length];
          const itemNumber = String((index % config.banners.length) + 1).padStart(2, '0');

          return (
            <a
              className={`banner-item banner-item-${(index % 3) + 1}`}
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
              <span className="banner-visual" aria-hidden="true">
                {banner.imageUrl ? <img alt="" src={banner.imageUrl} /> : <Icon />}
                <i />
                <b />
              </span>
              <span className="banner-copy">
                <span className="banner-kicker">
                  <i aria-hidden="true" />
                  {itemNumber}
                </span>
                <strong>{banner.title}</strong>
                <small>{banner.subtitle}</small>
              </span>
              <span className="banner-cta" aria-hidden="true">
                <FaChevronRight />
              </span>
            </a>
          );
        })}
      </div>
    </aside>
  );
};
