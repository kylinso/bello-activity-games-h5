import { useTranslation } from 'react-i18next';
import { PartnerVideoBanner } from '@/components/PartnerVideoBanner';
import { formatCurrency, getBingoRewardRange, getDiamondRainRewardRange } from '@/lib/gameRules';
import type { ActivityConfig, GameType } from '@/types/activity';

interface GameChoiceCardProps {
  config: ActivityConfig;
  gameType: GameType;
  isPrimary?: boolean;
  onSelect: (gameType: GameType) => void;
}

const bingoDemoAmounts = [2, 0, 0, 0, 0, 0, 0, 0, 0];
const rainDrops = [
  { left: 21, top: 22, type: 'gem', delay: '-0.1s' },
  { left: 68, top: 12, type: 'gem', delay: '-0.7s' },
  { left: 23, top: 64, type: 'gem', delay: '-1.3s' },
  { left: 51, top: 77, type: 'gem', delay: '-1.9s' },
  { left: 77, top: 57, type: 'gem', delay: '-2.5s' },
  { left: 82, top: 89, type: 'gem', delay: '-3.1s' },
  { left: 34, top: 92, type: 'bomb', delay: '-1.1s' },
];

const GameChoiceCard = ({ config, gameType, isPrimary, onSelect }: GameChoiceCardProps) => {
  const { t } = useTranslation();
  const isBingo = gameType === 'bingo';
  const formatAmount = (amount: number) => formatCurrency(amount, config.bingo.currency, config.locale);
  const rewardRange = isBingo
    ? getBingoRewardRange(config.bingo)
    : getDiamondRainRewardRange(config.diamondRain);
  const rewardScope = `${formatAmount(rewardRange.min)}-${rewardRange.max}`;
  const metricValue = isBingo ? config.bingo.picksAllowed : 3;
  const metricLabel = isBingo ? t('chances') : t('secondsUnit');

  return (
    <button
      className={isPrimary ? 'choice-game-card is-primary' : 'choice-game-card'}
      onClick={() => onSelect(gameType)}
      type="button"
    >
      <div className="choice-game-header">
        <span className={isBingo ? 'choice-game-icon is-bingo' : 'choice-game-icon'}>
          <img alt="" src={isBingo ? '/bingo-game.webp' : '/diamond-rain.webp'} />
        </span>
        <span className="choice-game-title">
          <strong>{isBingo ? 'Bingo' : t('diamondTitle')}</strong>
          <small>{isBingo ? '3 Picks · 3 Chances' : '10 s · Catch & Dodge'}</small>
        </span>
      </div>

      <div className={isBingo ? 'choice-live-preview is-bingo' : 'choice-live-preview is-rain'}>
        {isBingo ? (
          <>
            <span className="choice-score-chip">{formatAmount(1)}</span>
            <div className="choice-bingo-board">
              <div className="choice-bingo-frequency">
                <img alt="" src="/bingo/frequency.webp" />
                <span>Frequency：</span>
                <i />
                <i />
                <i />
              </div>
              <div className="choice-bingo-grid">
                {bingoDemoAmounts.map((amount, index) => (
                  <span
                    className={index === 3 ? 'is-revealed' : ''}
                    key={index}
                    style={{ animationDelay: `${index * 0.08}s` }}
                  >
                    {index === 3 ? <b>{amount || 2}</b> : null}
                  </span>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <span className="choice-score-chip">{formatAmount(1)}</span>
            <span className="choice-timer-chip">
              <img alt="" src="/diamond/timer.webp" />
              12.3 S
            </span>
            {rainDrops.map((drop, index) => (
              <img
                alt=""
                className={drop.type === 'bomb' ? 'choice-rain-drop is-bomb' : 'choice-rain-drop'}
                key={index}
                src={drop.type === 'bomb' ? '/diamond/bomb.svg' : '/diamond/gem.webp'}
                style={{
                  animationDelay: drop.delay,
                  left: `${drop.left}%`,
                  top: `${drop.top}%`,
                }}
              />
            ))}
          </>
        )}
      </div>

      <div className="choice-game-stats">
        <span>
          <strong>{rewardScope}</strong>
          <small>{t('rewardScope')}</small>
        </span>
        <span>
          <strong>{metricValue}</strong>
          <small>{metricLabel}</small>
        </span>
      </div>
    </button>
  );
};

interface HomeScreenProps {
  config: ActivityConfig;
  onBack: () => void;
  onStart: (gameType: GameType) => void;
}

export const HomeScreen = ({ config, onBack, onStart }: HomeScreenProps) => {
  const { t } = useTranslation();

  return (
    <main className="home-screen">
      <header className="home-game-header">
        <button aria-label="Back" className="home-back-button" onClick={onBack} type="button">
          <img alt="" src="/diamond/back-button.webp" />
        </button>
      </header>

      <section className="home-game-stage">
        <h1>Choose Your Game</h1>
        <div className="choice-game-grid">
          <GameChoiceCard config={config} gameType="bingo" onSelect={onStart} />
          <GameChoiceCard config={config} gameType="diamond_rain" onSelect={onStart} />
        </div>
      </section>

      <PartnerVideoBanner className="home-partner" label={t('partnerTitle')} />
    </main>
  );
};
