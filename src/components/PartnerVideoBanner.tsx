interface PartnerVideoBannerProps {
  className?: string;
  label: string;
}

const partnerVideoSrc = '/partners/play-pay-go-banner-2.mp4';

export const PartnerVideoBanner = ({ className, label }: PartnerVideoBannerProps) => {
  const classNames = ['partner-video-banner', className].filter(Boolean).join(' ');

  return (
    <section aria-label={label} className={classNames}>
      <video
        aria-label="PLAY PAY GO"
        autoPlay
        className="partner-video-banner-media"
        loop
        muted
        playsInline
        preload="auto"
        src={partnerVideoSrc}
      />
    </section>
  );
};
