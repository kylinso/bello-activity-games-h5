# Bello Activity Games H5 

Bello offline activity game station H5. The page is designed for tablet and mobile browsers used at an event booth. A participant can choose one game, play once, receive a reward QR code, register through the existing H5 flow, and then download the Bello App.

## Features

- Home screen with looping auto demo: Bingo demo and Diamond Rain demo rotate automatically.
- Game selection starts immediately. Backend validation is handled when config and result APIs are called.
- Bingo Bonus Pool: backend-configured 3 x 3 score grid with 3 picks per round.
- Diamond Rain: backend-configured objects, duration, and scoring; final score is never lower than 0.
- Reward result page displays the backend-confirmed consumer-point or coupon reward and its claim QR code.
- Bottom scrolling banner is shown only on the home screen and hidden during games.
- Multi-language UI: English, Chinese, and Malay.

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

Run contract and scoring tests:

```bash
npm test
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
VITE_USE_MOCKS=false
```

| Variable | Description |
| --- | --- |
| `VITE_API_BASE_URL` | Backend API base URL. |
| `VITE_USE_MOCKS` | Uses the real API by default. Set to `true` only for local mock preview. |

Build commands select the Cloudflare Turnstile site key by Vite mode:

| Command | Mode | Turnstile site key |
| --- | --- | --- |
| `npm run build` | `test` | Test key |
| `npm run build:prod` | `production` | Production key |

## Game Rules

The backend-owned runtime configuration, client scoring rules, validation boundaries, and reward display contract are defined in [PAD Game Runtime APIs](./docs/pad-game-runtime-api.md).

## User Flow

1. The merchant signs in and selects a store.
2. The app loads that store's game configuration and validates the fields used by the client.
3. Immediately before a game starts, the app reloads and freezes the store and configuration for that round.
4. The user completes Bingo or Diamond Rain, and the app automatically uploads the result once.
5. On failure, the app shows an error and returns to game selection without retrying the same round.
6. On success, the app displays the backend-confirmed reward and then the QR code.

## API Contract

The game configuration and prize upload contracts have one source of truth: [PAD Game Runtime APIs](./docs/pad-game-runtime-api.md). Set `VITE_USE_MOCKS=true` only for local mock preview.

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

The H5 stores login state and the selected store in `localStorage`:

```text
bello-activity:auth
```

Game eligibility and reward claim state are handled by backend APIs. Choosing a game does not create a frontend session lock.

## Deployment Notes

- Build output is generated in `dist/`.
- `dist/` is ignored by Git and should be produced by the deployment pipeline.
- Keep `VITE_USE_MOCKS=false` or unset for real backend integration.
- Configure `VITE_API_BASE_URL` to point to the deployed API gateway.

## Verification Checklist

- Home page can scroll on mobile.
- Home page auto demo rotates between Bingo and Diamond Rain.
- Bottom banner is visible on home and hidden during games.
- Choosing a game starts it without calling a start-session API.
- Bingo allows exactly 3 tile picks.
- Diamond Rain score never goes below 0.
- Invalid or missing required game configuration prevents a round from starting.
- Game result upload happens once after completion and is never retried for the same round.
- Coupon rewards display the coupon name; consumer-point rewards display the backend-confirmed total.
- The QR code contains the raw `claimToken` and returns to game selection according to `qrReturnSeconds`.
- `npm run build` completes successfully.
