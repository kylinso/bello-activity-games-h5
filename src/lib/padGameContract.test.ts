import { describe, expect, it } from 'vitest';
import { getDiamondRainReward } from '@/lib/gameRules';
import {
  createPadGameUploadForm,
  parsePadGameConfig,
  parsePadGameUploadResult,
} from '@/lib/padGameContract';

const configContext = {
  activityId: 'activity-1',
  locale: 'zh' as const,
  sessionId: 'session-1',
  storeId: 'store-1',
};

const validConfig = {
  id: 101,
  version: 8,
  qrReturnSeconds: 12,
  diamondRainConfig: {
    diamondCount: 15,
    bombCount: 10,
    gameTimeSeconds: 20,
    diamondScore: 2,
    bombDeductScore: 3,
    coloredEnabled: true,
    coloredRewardType: 'SCORE',
    coloredRewardValue: 7,
    normalIcon: 'https://example.com/diamond.png',
    bombIcon: 'https://example.com/bomb.png',
    coloredIcon: 'https://example.com/colored.png',
  },
  bingoConfig: {
    scoreBuckets: [
      { score: 1, count: 4 },
      { score: 3, count: 3 },
      { score: 5, count: 2 },
    ],
  },
};

describe('parsePadGameConfig', () => {
  it('maps the strict backend config into one store-bound runtime config', () => {
    expect(parsePadGameConfig(validConfig, configContext)).toMatchObject({
      activityId: 'activity-1',
      qrReturnSeconds: 12,
      sessionId: 'session-1',
      storeId: 'store-1',
      bingo: {
        gridSize: 3,
        picksAllowed: 3,
        pool: [1, 1, 1, 1, 3, 3, 3, 5, 5],
      },
      diamondRain: {
        bombCount: 10,
        bombValue: -3,
        coloredEnabled: true,
        coloredRewardType: 'SCORE',
        coloredRewardValue: 7,
        diamondCount: 15,
        diamondValue: 2,
        durationSeconds: 20,
      },
    });
  });

  it('treats null data as a missing store configuration', () => {
    expect(() => parsePadGameConfig(null, configContext)).toThrowError(
      expect.objectContaining({ code: 'CONFIG_MISSING' }),
    );
  });

  it.each([
    ['missing diamond config', { ...validConfig, diamondRainConfig: undefined }],
    [
      'negative diamond count',
      {
        ...validConfig,
        diamondRainConfig: { ...validConfig.diamondRainConfig, diamondCount: -1 },
      },
    ],
    [
      'non-positive bomb deduction',
      {
        ...validConfig,
        diamondRainConfig: { ...validConfig.diamondRainConfig, bombDeductScore: 0 },
      },
    ],
    [
      'game duration too large for a browser timer',
      {
        ...validConfig,
        diamondRainConfig: {
          ...validConfig.diamondRainConfig,
          gameTimeSeconds: 2_147_484,
        },
      },
    ],
    [
      'unknown colored reward type',
      {
        ...validConfig,
        diamondRainConfig: {
          ...validConfig.diamondRainConfig,
          coloredRewardType: 'UNKNOWN',
        },
      },
    ],
    [
      'bingo pool not equal to nine cells',
      {
        ...validConfig,
        bingoConfig: { scoreBuckets: [{ score: 1, count: 8 }] },
      },
    ],
    [
      'bingo bucket count greater than the grid',
      {
        ...validConfig,
        bingoConfig: { scoreBuckets: [{ score: 1, count: 10_000_000 }] },
      },
    ],
    [
      'negative bingo score',
      {
        ...validConfig,
        bingoConfig: { scoreBuckets: [{ score: -1, count: 9 }] },
      },
    ],
    [
      'Bingo maximum score outside int32',
      {
        ...validConfig,
        bingoConfig: { scoreBuckets: [{ score: 2_147_483_647, count: 9 }] },
      },
    ],
    [
      'Diamond Rain maximum score outside int32',
      {
        ...validConfig,
        diamondRainConfig: {
          ...validConfig.diamondRainConfig,
          diamondCount: 2,
          diamondScore: 2_147_483_647,
        },
      },
    ],
  ])('rejects %s instead of applying defaults', (_name, rawConfig) => {
    expect(() => parsePadGameConfig(rawConfig, configContext)).toThrowError(
      expect.objectContaining({ code: 'CONFIG_INVALID' }),
    );
  });
});

describe('createPadGameUploadForm', () => {
  it('uses the frozen store and reports a caught colored diamond', () => {
    expect(
      createPadGameUploadForm({
        clientResult: {
          bombs: 1,
          coloredDiamonds: 1,
          diamonds: 4,
          durationMs: 20_000,
          finalScore: 12,
        },
        gameType: 'diamond_rain',
        storeId: 'store-at-game-start',
      }),
    ).toEqual({
      extra: 1,
      gameType: 1,
      score: 12,
      storeId: 'store-at-game-start',
    });
  });

  it('always sends extra zero for Bingo', () => {
    expect(
      createPadGameUploadForm({
        clientResult: {
          durationMs: 5000,
          selectedCells: [
            { amount: 1, index: 0 },
            { amount: 3, index: 1 },
            { amount: 5, index: 2 },
          ],
        },
        gameType: 'bingo',
        storeId: 'store-1',
      }),
    ).toEqual({ extra: 0, gameType: 2, score: 9, storeId: 'store-1' });
  });
});

describe('parsePadGameUploadResult', () => {
  it('builds a consumer-point result from the backend-confirmed amounts', () => {
    expect(
      parsePadGameUploadResult(
        {
          baseAmount: 10,
          claimToken: ' token-1 ',
          coloredPointAmount: null,
          gameScore: 14,
          jackpotAmount: 2,
          rewardType: 'CONSUMER_POINT',
        },
        { gameType: 'diamond_rain', playId: 'play-1' },
      ),
    ).toEqual({
      claimToken: 'token-1',
      gameScore: 14,
      gameType: 'diamond_rain',
      playId: 'play-1',
      rewardAmount: 12,
      rewardType: 'CONSUMER_POINT',
    });
  });

  it('normalizes finite numeric-string amounts returned by the backend', () => {
    expect(
      parsePadGameUploadResult(
        {
          baseAmount: '5',
          claimToken: 'https://app.bello.network?pad=_token',
          coloredPointAmount: '3',
          gameScore: 4,
          jackpotAmount: '0',
          rewardType: 'CONSUMER_POINT',
        },
        { gameType: 'diamond_rain', playId: 'play-string-amounts' },
      ),
    ).toEqual({
      claimToken: 'https://app.bello.network?pad=_token',
      gameScore: 4,
      gameType: 'diamond_rain',
      playId: 'play-string-amounts',
      rewardAmount: 8,
      rewardType: 'CONSUMER_POINT',
    });
  });

  it('builds a coupon result without requiring a game score', () => {
    expect(
      parsePadGameUploadResult(
        {
          claimToken: 'coupon-token',
          couponName: 'Free Coffee',
          rewardType: 'COUPON',
        },
        { gameType: 'bingo', playId: 'play-2' },
      ),
    ).toEqual({
      claimToken: 'coupon-token',
      couponName: 'Free Coffee',
      gameType: 'bingo',
      playId: 'play-2',
      rewardType: 'COUPON',
    });
  });

  it.each([
    ['blank token', { ...validConfig, claimToken: ' ', rewardType: 'COUPON', couponName: 'Coupon' }],
    ['unknown reward type', { claimToken: 'token', rewardType: 'POINTS' }],
    [
      'missing coupon name',
      { claimToken: 'token', couponName: null, rewardType: 'COUPON' },
    ],
    [
      'null base amount',
      {
        baseAmount: null,
        claimToken: 'token',
        coloredPointAmount: 0,
        gameScore: 1,
        jackpotAmount: 0,
        rewardType: 'CONSUMER_POINT',
      },
    ],
    [
      'invalid game score',
      {
        baseAmount: 1,
        claimToken: 'token',
        coloredPointAmount: 0,
        gameScore: -1,
        jackpotAmount: 0,
        rewardType: 'CONSUMER_POINT',
      },
    ],
    [
      'blank numeric-string amount',
      {
        baseAmount: ' ',
        claimToken: 'token',
        coloredPointAmount: 0,
        gameScore: 1,
        jackpotAmount: 0,
        rewardType: 'CONSUMER_POINT',
      },
    ],
    [
      'non-finite reward total',
      {
        baseAmount: Number.MAX_VALUE,
        claimToken: 'token',
        coloredPointAmount: Number.MAX_VALUE,
        gameScore: 1,
        jackpotAmount: 0,
        rewardType: 'CONSUMER_POINT',
      },
    ],
  ])('rejects %s', (_name, rawResult) => {
    expect(() =>
      parsePadGameUploadResult(rawResult, { gameType: 'bingo', playId: 'play-3' }),
    ).toThrowError(expect.objectContaining({ code: 'RESPONSE_INVALID' }));
  });
});

describe('Diamond Rain scoring', () => {
  const baseConfig = parsePadGameConfig(validConfig, configContext).diamondRain;

  it('floors the final aggregate score at zero', () => {
    expect(getDiamondRainReward(1, 2, baseConfig, 0)).toBe(0);
  });

  it('adds a SCORE colored diamond to the final score', () => {
    expect(getDiamondRainReward(2, 0, baseConfig, 1)).toBe(11);
  });

  it('does not add a CONSUMER_POINT colored diamond to the final score', () => {
    expect(
      getDiamondRainReward(
        2,
        0,
        { ...baseConfig, coloredRewardType: 'CONSUMER_POINT' },
        1,
      ),
    ).toBe(4);
  });
});
