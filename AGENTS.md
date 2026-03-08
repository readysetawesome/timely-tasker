# AGENTS.md

This file is a practical runbook for engineers and coding agents working in this repository.

## 1. Project Purpose

Timely Tasker is a Cloudflare Pages app for lightweight daily task/time tracking.
Core behavior lives in the timer grid UI and its summary/tick state transitions.

## 2. Fast Orientation

- Read [README.md](/workspaces/timely-tasker/README.md) for product context.
- Read [ARCHITECTURE.md](/workspaces/timely-tasker/ARCHITECTURE.md) for system flow.
- Primary runtime code:
  - frontend: `src/`
  - edge API: `functions/`
  - shared identity helpers: `lib/Identity.ts`
  - schema: `migrations/`

## 3. Local Setup

When using the devcontainer:

1. Build/open container.
2. `npm ci` runs via `postCreateCommand`.
3. Ensure `.dev.vars` exists for local `wrangler pages dev`.

Key commands:

- `npm start`
- `npx wrangler pages dev --d1=DB --persist -- npm start`
- `wrangler d1 migrations apply timely-tasker-dev --local`
- `npm run lint`
- `npm test`

## 4. Where To Change What

- UI rendering/layout:
  - `src/components/Timer/Timer.tsx`
  - `src/components/Timer/Timer.module.scss`
- Tick behavior/rules:
  - `src/components/Timer/Tick.tsx`
  - `src/components/Timer/Timer.actions.ts`
  - `src/components/Timer/Timer.slice.ts`
- API request wiring:
  - `src/RestApi.ts`
  - `src/LocalStorageApi.ts`
- Auth/session behavior:
  - `functions/greet.ts`
  - `functions/callback.ts`
  - `lib/Identity.ts`
- Persistence model:
  - `functions/summaries.ts`
  - `functions/ticks.ts`
  - `migrations/*.sql`

## 5. Change Safety Rules

- Preserve both storage modes:
  - cloud (`RestApi`)
  - local (`LocalStorageApi`)
- Keep Redux state shape backward-compatible unless updating all selectors/tests.
- Do not change tick state encoding (`-1`, `0`, `1`) without coordinated frontend + backend + fixtures updates.
- If schema changes are required:
  - add a new numbered migration
  - never rewrite existing migration history
  - update seeds/fixtures/tests if behavior changes
- Validate auth changes against both dev (`ENVIRONMENT=development`) and production branches of logic.

## 6. Testing Expectations

Primary regression suite is Cypress component tests:

- [Timer.cy.tsx](/workspaces/timely-tasker/src/components/Timer/Timer.cy.tsx)
- [Timer.localStorage.cy.tsx](/workspaces/timely-tasker/src/components/Timer/Timer.localStorage.cy.tsx)

When changing timer behavior, update fixtures in `cypress/fixtures/` as needed.

## 7. Deployment and Data Ops

- Preview/local migrations:
  - `wrangler d1 migrations apply timely-tasker-dev --local`
  - `wrangler d1 migrations apply timely-tasker-dev`
- Production migration helper:
  - `bin/migrate-prod-db`
- Local seed helper:
  - `bin/generate-dev-user`

Treat production migration commands as high-risk operations.

## 8. Known Footguns

- `wrangler` config files are ignored by `.gitignore` (`*.toml`), so local setup may rely on developer-provided config.
- OAuth callback flow depends on correctly configured Google credentials in runtime env vars.
- Timer behavior includes optimistic updates; failed network writes can temporarily diverge from persisted state.
