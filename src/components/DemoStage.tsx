import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBomb, FaCoins, FaGem, FaGift, FaPlay, FaTicketAlt } from 'react-icons/fa';
import bingoPrize from '@/assets/bingo-prize.svg';
import rainPrize from '@/assets/rain-prize.svg';
import type { ActivityConfig, GameType } from '@/types/activity';

interface DemoStageProps {
  config: ActivityConfig;
  activeGame: GameType;
  onActiveGameChange: (gameType: GameType) => void;
}

export const DemoStage = ({ config, activeGame, onActiveGameChange }: DemoStageProps) => {
  const { t } = useTranslation();
  const bingoPreview = useMemo(() => config.bingo.pool.slice(0, 9), [config.bingo.pool]);
  const hiddenIcons = [FaTicketAlt, FaCoins, FaGem, FaGift];

  useEffect(() => {
    const timer = window.setInterval(() => {
      onActiveGameChange(activeGame === 'bingo' ? 'diamond_rain' : 'bingo');
    }, 5600);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeGame, onActiveGameChange]);

  return (
    <section className="demo-stage">
      <div className="demo-sheen" aria-hidden="true" />
      <div className="section-eyebrow">{t('demo')}</div>
      {activeGame === 'bingo' ? (
        <div className="demo-bingo" aria-label={t('bingoTitle')}>
          <div className="demo-jackpot-card" aria-hidden="true">
            <span>BINGO</span>
            <strong>{config.bingo.currency} 32</strong>
            <small>Prize Pool</small>
          </div>
          <div className="demo-prize-ribbon" aria-hidden="true">
            <FaGift />
            <span>{config.bingo.picksAllowed} Picks</span>
          </div>
          {bingoPreview.map((amount, index) => (
            <div
              className={index < 3 ? 'demo-tile is-revealed' : 'demo-tile is-hidden'}
              key={index}
            >
              {index < 3 ? (
                <>
                  <span className="demo-prize-ticket">
                    <FaTicketAlt aria-hidden="true" />
                    <strong>{`${config.bingo.currency} ${amount}`}</strong>
                    <small>Lucky Tile</small>
                  </span>
                  <i aria-hidden="true" />
                  <b aria-hidden="true" />
                </>
              ) : (
                <>
                  <span className="demo-hidden-symbol">
                    {(() => {
                      const HiddenIcon = hiddenIcons[index % hiddenIcons.length];
                      return <HiddenIcon aria-hidden="true" />;
                    })()}
                  </span>
                  <span className="demo-question">?</span>
                </>
              )}
            </div>
          ))}
          <div className="demo-hand" aria-hidden="true" />
        </div>
      ) : (
        <div className="demo-rain" aria-label={t('diamondTitle')}>
          <div className="demo-score-badge">+8</div>
          {Array.from({ length: 14 }).map((_, index) => {
            const isBomb = index % 5 === 0;
            return (
              <span
                className={isBomb ? 'demo-drop is-bomb' : 'demo-drop'}
                key={index}
                style={{
                  left: `${8 + ((index * 13) % 84)}%`,
                  animationDelay: `${(index % 7) * 0.32}s`,
                  animationDuration: `${2.4 + (index % 4) * 0.38}s`,
                }}
              >
                {isBomb ? <FaBomb aria-hidden="true" /> : <FaGem aria-hidden="true" />}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
};

interface GameChoiceCardProps {
  gameType: GameType;
  title: string;
  description: string;
  buttonLabel: string;
  isActive: boolean;
  disabled: boolean;
  visualPrimary: string;
  visualSecondary: string;
  onSelect: (gameType: GameType) => void;
}

const GameChoiceCard = ({
  gameType,
  title,
  description,
  buttonLabel,
  isActive,
  disabled,
  visualPrimary,
  visualSecondary,
  onSelect,
}: GameChoiceCardProps) => {
  const [isPressed, setIsPressed] = useState(false);
  const Icon = gameType === 'bingo' ? FaGem : FaBomb;
  const visualAsset = gameType === 'bingo' ? bingoPrize : rainPrize;

  return (
    <article className={isActive ? 'choice-card is-active' : 'choice-card'}>
      <div className="choice-card-top">
        <div className="choice-icon">
          <Icon aria-hidden="true" />
        </div>
        <div className="choice-mini-board" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
      </div>
      <div className={gameType === 'bingo' ? 'choice-visual' : 'choice-visual is-rain'}>
        <img alt="" src={visualAsset} />
        <span className="visual-chip visual-chip-a">{visualPrimary}</span>
        <span className="visual-chip visual-chip-b">{visualSecondary}</span>
        <i aria-hidden="true" />
        <b aria-hidden="true" />
      </div>
      <div className="choice-copy">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <button
        className={isPressed ? 'primary-button is-pressed' : 'primary-button'}
        disabled={disabled}
        onClick={() => onSelect(gameType)}
        onPointerDown={() => setIsPressed(true)}
        onPointerLeave={() => setIsPressed(false)}
        onPointerUp={() => setIsPressed(false)}
        type="button"
      >
        <FaPlay aria-hidden="true" />
        {buttonLabel}
      </button>
    </article>
  );
};

interface HomeScreenProps {
  config: ActivityConfig;
  onStart: (gameType: GameType) => void;
}

export const HomeScreen = ({
  config,
  onStart,
}: HomeScreenProps) => {
  const { t } = useTranslation();
  const [activeDemo, setActiveDemo] = useState<GameType>('bingo');

  return (
    <main className="home-screen">
      <div className="home-copy">
        <span className="section-eyebrow">Bello Play</span>
        <h1>{t('homeTitle')}</h1>
        <p>{t('homeSubtitle')}</p>
      </div>
      <DemoStage config={config} activeGame={activeDemo} onActiveGameChange={setActiveDemo} />
      <section className="choice-grid">
        <GameChoiceCard
          buttonLabel={t('playBingo')}
          description={t('bingoDescription')}
          disabled={false}
          gameType="bingo"
          isActive={activeDemo === 'bingo'}
          onSelect={onStart}
          title={t('bingoTitle')}
          visualPrimary={`${config.bingo.currency} ${config.bingo.minReward}-${config.bingo.maxReward}`}
          visualSecondary={`${config.bingo.picksAllowed} Picks`}
        />
        <GameChoiceCard
          buttonLabel={t('playDiamond')}
          description={t('diamondDescription')}
          disabled={false}
          gameType="diamond_rain"
          isActive={activeDemo === 'diamond_rain'}
          onSelect={onStart}
          title={t('diamondTitle')}
          visualPrimary={`${config.diamondRain.durationSeconds}s`}
          visualSecondary={`+${config.diamondRain.diamondCount} / -${config.diamondRain.bombCount}`}
        />
      </section>
    </main>
  );
};
