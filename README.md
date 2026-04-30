# Bello Activity Games H5

Bello offline activity game station H5. The page is designed for tablet and mobile browsers used at an event booth. A participant can choose one game, play once, receive a reward QR code, register through the existing H5 flow, and then download the Bello App.

## Features

- Home screen with looping auto demo: Bingo demo and Diamond Rain demo rotate automatically.
- One-session-one-game lock: after a session starts one game, the other game cannot be played.
- Bingo Bonus Pool: 3 x 3 grid, pick 3 tiles, default prize pool is `5 x SGD 3 + 3 x SGD 4 + 1 x SGD 5`.
- Diamond Rain: default 10 seconds, 15 diamonds worth `+1`, 10 bombs worth `-1`, final score is never lower than 0.
- Reward result page: generates a unique reward code and QR code for registration and reward claim.
- Reward type can be configured by backend: cash voucher, coupon, or Bello Points.
- Bottom scrolling banner is shown only on the home screen and hidden during games.
- Multi-language UI: English, Chinese, and Malay.
- Mock API mode for local preview without backend dependency.

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router
- i18next
- qrcode.react
- react-icons
- axios

## Getting Started

Install dependencies:

```bash
npm install
```

Start local development:

```bash
npm run dev
```

Build production assets:

```bash
npm run build
```

Run TypeScript check only:

```bash
npm run type-check
```

## Runtime URL

The activity page expects `activityId` and `sessionId` from the URL:

```text
/?activityId=bello-campaign-001&sessionId=SESSION-001
```

In mock mode, if `sessionId` is missing, the app creates a demo session ID in `localStorage`. In real API mode, missing `sessionId` blocks the game flow.

## Environment Variables

Copy `.env.example` if an environment-specific file is needed:

```bash
cp .env.example .env.local
```

Available variables:

```bash
VITE_API_BASE_URL=/api
VITE_USE_MOCKS=true
VITE_DEFAULT_REGISTER_H5_URL=https://bello.example.com/register
```

| Variable | Description |
| --- | --- |
| `VITE_API_BASE_URL` | Backend API base URL. |
| `VITE_USE_MOCKS` | Uses local mock API unless set to `false`. |
| `VITE_DEFAULT_REGISTER_H5_URL` | Registration H5 URL used by mock mode and QR generation fallback. |

## Game Rules

### Bingo Bonus Pool

Default configuration:

```ts
{
  gridSize: 3,
  picksAllowed: 3,
  currency: 'SGD',
  minReward: 9,
  maxReward: 13,
  pool: [3, 3, 3, 3, 3, 4, 4, 4, 5]
}
```

The grid order is shuffled on the client. The reward amount is the sum of the 3 selected tiles.

### Diamond Rain

Default configuration:

```ts
{
  durationSeconds: 10,
  diamondCount: 15,
  bombCount: 10,
  diamondValue: 1,
  bombValue: -1,
  minScore: 0,
  fallSpeedMinMs: 6600,
  fallSpeedMaxMs: 8600
}
```

Final score is calculated as:

```ts
max(minScore, diamonds * diamondValue + bombs * bombValue)
```

## User Flow

1. App reads `activityId`, `sessionId`, and current locale.
2. App loads activity config from API or mock API.
3. Home screen shows game choices and auto demo.
4. User starts either Bingo or Diamond Rain.
5. Backend locks the session to the selected game.
6. User completes the game.
7. App submits the client result.
8. Backend returns reward amount, reward code, QR URL, and expiry time.
9. Result screen displays QR code.
10. User scans QR code and continues through registration H5.

## API Contract

When `VITE_USE_MOCKS=false`, the app uses the following endpoints.

### Get Activity Config

```http
GET /api/activity-games/config
```

Query params:

```ts
{
  activityId: string;
  sessionId: string;
  locale: 'en' | 'zh' | 'ms';
}
```

Response:

```ts
{
  activityId: string;
  sessionId: string;
  status: 'active' | 'inactive';
  rewardType: 'cash_voucher' | 'coupon' | 'bello_points';
  registerH5Url: string;
  locale: 'en' | 'zh' | 'ms';
  bingo: {
    gridSize: number;
    picksAllowed: number;
    currency: string;
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
  banners: Array<{
    id: string;
    title: string;
    subtitle: string;
    imageUrl?: string;
    linkUrl?: string;
  }>;
}
```

### Start Game

```http
POST /api/activity-games/session/start
```

Request:

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

### Submit Result

```http
POST /api/activity-games/session/result
```

Request:

```ts
{
  playId: string;
  gameType: 'bingo' | 'diamond_rain';
  clientResult:
    | {
        selectedCells: Array<{ index: number; amount: number }>;
        durationMs: number;
      }
    | {
        diamonds: number;
        bombs: number;
        finalScore: number;
        durationMs: number;
      };
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

### Track Banner Event

```http
POST /api/activity-games/banner/event
```

Request:

```ts
{
  activityId: string;
  sessionId: string;
  bannerId: string;
  eventType: 'impression' | 'click';
}
```

The current H5 reports banner impressions and clicks. If real eye-tracking hardware or SDK is connected later, this endpoint can be extended with gaze count and dwell time fields.

## Project Structure

```text
src/
  api/          API client and mock API
  assets/       SVG assets for game visuals
  components/   Screens and UI components
  i18n/         Language resources
  lib/          Game rules and local storage helpers
  styles/       Global responsive styles and animations
  types/        Shared TypeScript types
```

## Local State

The mock flow stores the current session play state in `localStorage`:

```text
bello-activity:{activityId}:{sessionId}:play
```

This keeps the one-game-only behavior after page refresh. In production, the backend should be the source of truth for session locking and reward claim state.

## Deployment Notes

- Build output is generated in `dist/`.
- `dist/` is ignored by Git and should be produced by the deployment pipeline.
- Configure `VITE_USE_MOCKS=false` for real backend integration.
- Configure `VITE_API_BASE_URL` to point to the deployed API gateway.
- Configure `VITE_DEFAULT_REGISTER_H5_URL` or return `registerH5Url` from the backend config.

## Verification Checklist

- Home page can scroll on mobile.
- Home page auto demo rotates between Bingo and Diamond Rain.
- Bottom banner is visible on home and hidden during games.
- A session can play only one game.
- Bingo allows exactly 3 tile picks.
- Diamond Rain score never goes below 0.
- Result page shows reward amount, reward code, QR code, and expiry time.
- QR code opens the registration H5 URL with `rewardCode`, `sessionId`, and `activityId`.
- `npm run build` completes successfully.
