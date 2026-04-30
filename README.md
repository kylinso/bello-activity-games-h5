# Bello Activity Games H5

Independent tablet H5 for the Bello offline activity game station.

## Scripts

```bash
npm install
npm run dev
npm run build
```

The project defaults to mock API mode so the full flow can be previewed locally.

```bash
VITE_USE_MOCKS=false
VITE_API_BASE_URL=https://your-api-host
VITE_DEFAULT_REGISTER_H5_URL=https://your-register-h5/register
```

## Runtime URL

```text
/?activityId=bello-campaign-001&sessionId=SESSION-001
```

In mock mode, `sessionId` is generated if it is missing. In real API mode, a missing
`sessionId` blocks the game start.

## API Contract

`GET /api/activity-games/config`

```ts
{
  activityId: string;
  sessionId: string;
  status: 'active' | 'inactive';
  rewardType: 'cash_voucher' | 'coupon' | 'bello_points';
  registerH5Url: string;
  bingo: {
    gridSize: 3;
    picksAllowed: 3;
    currency: 'SGD';
    minReward: number;
    maxReward: number;
    pool: number[];
  };
  diamondRain: {
    durationSeconds: number;
    diamondCount: number;
    bombCount: number;
    diamondValue: number;
    bombValue: number;
    minScore: number;
    fallSpeedMinMs: number;
    fallSpeedMaxMs: number;
  };
  banners: Array<{ id: string; title: string; subtitle: string; linkUrl?: string }>;
}
```

`POST /api/activity-games/session/start`

```ts
{
  activityId: string;
  sessionId: string;
  gameType: 'bingo' | 'diamond_rain';
}
```

Response:

```ts
{
  playId: string;
  lockedGameType: 'bingo' | 'diamond_rain';
  status: 'started' | 'already_played';
}
```

`POST /api/activity-games/session/result`

```ts
{
  playId: string;
  gameType: 'bingo' | 'diamond_rain';
  clientResult:
    | { selectedCells: Array<{ index: number; amount: number }>; durationMs: number }
    | { diamonds: number; bombs: number; finalScore: number; durationMs: number };
}
```

Response:

```ts
{
  playId: string;
  gameType: 'bingo' | 'diamond_rain';
  rewardType: 'cash_voucher' | 'coupon' | 'bello_points';
  rewardAmount: number;
  rewardDisplayText: string;
  rewardCode: string;
  qrUrl: string;
  expiresAt: string;
}
```

`POST /api/activity-games/banner/event`

```ts
{
  activityId: string;
  sessionId: string;
  bannerId: string;
  eventType: 'impression' | 'click';
}
```
