# Timely Tasker Architecture

## 1. System Overview

Timely Tasker is a single-page React application deployed on Cloudflare Pages.
It supports two storage modes behind one UI:

- Cloud mode: Cloudflare Pages Functions + D1 database + Google OpenID Connect.
- Local mode: browser `localStorage` only, no login.

The UI and Redux state model are identical in both modes. The storage backend is
selected at runtime in `src/components/Timer/Timer.tsx`.

## 2. Repository Structure

- `src/`: React app, Redux slice, API adapters, component tests.
- `functions/`: Cloudflare Pages Functions routes (`/greet`, `/callback`, `/summaries`, `/ticks`).
- `lib/`: shared server-side identity/session helpers.
- `migrations/`: D1 schema and index migrations.
- `seeds/`: seed SQL for local development.
- `bin/`: helper scripts for D1 operations.
- `cypress/`: component test support + fixtures.
- `public/`: static app assets and schema report.

## 3. Runtime Components

## 3.1 Frontend

- Entry point: `src/index.tsx`
- Top-level route shell: `src/App.tsx`
  - Routes `/` and `/timer` render the same app.
  - Date navigation is query-string based (`?date=<utc-midnight-ms>`).
- Main domain component: `src/components/Timer/Timer.tsx`
  - Renders 12 summary rows and 96 quarter-hour ticks per row.
  - Chooses storage mode via `TimelyTasker:UseLocalStorage`.
  - In cloud mode, calls `/greet` first to resolve identity or redirect to auth.

## 3.2 State Management

Redux is configured in `src/store.ts` with one slice: `timer`.

`src/components/Timer/Timer.slice.ts` state:

- `summaries`: map keyed by row slot (`0..11`)
- `loadingDate`
- API status objects:
  - `summariesLoading`
  - `summaryCreated`

Actions in `Timer.actions.ts`:

- `fetchSummaries(useDate)`
- `setSummary(summary)`
- `tickClicked(tickChangeEvent)` with optimistic UI update for existing summaries.

Selectors in `Timer.selectors.ts`:

- row lookup (`getSummary`)
- tick-column lookup across all rows (`getMatchingTicks`) for cross-row tick rules.

## 3.3 Storage Adapters

Frontend uses interchangeable adapters with the same method surface:

- `src/RestApi.ts` for server-backed mode.
- `src/LocalStorageApi.ts` for local mode.

Both provide:

- `getSummaries(date)`
- `createSummary(summary)`
- `createTick(tickChangeEvent, callback)`

## 4. Domain Rules: Summaries and Ticks

## 4.1 Summary Model

Each workday has up to 12 summary rows (`slot` 0-11). A row contains:

- freeform text (`content`)
- associated quarter-hour ticks (`TimerTicks`)

## 4.2 Tick Model

Each day has 96 quarter-hour positions (`tickNumber` 0-95). Tick state cycles:

- empty/deleted (`-1` or absent)
- focused (`0`)
- distracted (`1`)

Logic is enforced in `src/components/Timer/Tick.tsx`:

- Clicking rotates state for the selected row/tick.
- If two rows share the same column, both are marked distracted.
- If one of two distracted ticks is removed, the remaining one can return to focused.

## 5. Backend Functions (Cloud Mode)

## 5.1 CORS Middleware

- `functions/_middleware.ts`
- Adds permissive CORS only when `ENVIRONMENT=development`.

## 5.2 Identity and Session

Shared helpers in `lib/Identity.ts`:

- `parseCookies(request)`
- `GetIdentity(request, env)` resolves current app identity from session.
- Session cookie name: `timelyTaskerSession`

## 5.3 Auth Bootstrap: `/greet`

`functions/greet.ts`:

- Development: returns fixture identity immediately (`fixtures/devUser.json`).
- Production:
  - no session cookie: builds Google authorize URL, sets nonce/state cookie
  - valid session cookie: returns current identity from DB join query

## 5.4 Auth Callback: `/callback`

`functions/callback.ts`:

1. Validate `code` + `state`.
2. Validate anti-CSRF state against cookie.
3. Exchange code at Google token endpoint.
4. Decode `id_token` for `sub` and `email`.
5. Find or create `Users` + `Identities`.
6. Insert new `UserSessions` record and set httpOnly cookie.
7. Redirect browser to `/`.

## 5.5 Summaries API: `/summaries`

`functions/summaries.ts`:

- `GET /summaries?date=<ms>`: returns all summaries for user/date ordered by slot.
- `POST /summaries?date=<ms>&slot=<n>&text=<str>`:
  - upserts summary by `(userId, date, slot)`
  - returns summary + nested ticks

## 5.6 Ticks API: `/ticks`

`functions/ticks.ts` (`POST` only):

- Input query params: `summary`, `tick`, `distracted`
- Behavior:
  - existing row + invalid distracted value: delete tick
  - existing row + valid value: update distracted flag
  - missing row: insert new tick

## 6. Data Layer (D1 / SQLite)

Migrations define and evolve:

- `Users`
- `Providers`
- `Identities`
- `UserSessions`
- `Summaries`
- `TimerTicks`

Key indexes:

- `Summaries(userId, date)` and unique `(userId, date, slot)`
- `TimerTicks(userId, summaryId)`
- `UserSessions(sessionId)`

Provider seed behavior:

- migration `0007_create-google-provider.sql` inserts Google provider row.
- `seeds/devUser.sql` inserts a local dev user + identity mapped to Google provider.

## 7. Testing and Quality Gates

- Test framework: Cypress Component Testing (`src/**/*.cy.{js,jsx,ts,tsx}`)
- Main scenarios:
  - cloud mode behavior with intercepted API fixtures (`Timer.cy.tsx`)
  - localStorage behavior (`Timer.localStorage.cy.tsx`)
- Coverage:
  - NYC + `@cypress/code-coverage`
- CI:
  - GitHub Actions workflow at `.github/workflows/ci.yml`
  - installs deps, runs `npm run ci-cypress`, uploads coverage to Codecov

## 8. Build and Toolchain

- Frontend: Create React App (`react-scripts`).
- Language: TypeScript + JSX.
- Styling: SCSS modules for timer grid.
- Linting: ESLint (`npm run lint`).

## 9. Operational Notes

- Local cloud-style dev command from README:
  - `npx wrangler pages dev --d1=DB --persist -- npm start`
- Local D1 migration command:
  - `wrangler d1 migrations apply timely-tasker-dev --local`
- Local DB inspection:
  - `sqlite3 .wrangler/state/d1/DB.sqlite3`

The devcontainer is expected to provide these CLIs (`node/npm`, `wrangler`, `sqlite3`) and run `npm ci` at creation time.
