# CLAUDE.md

Project context for Claude Code. See also [AGENTS.md](./AGENTS.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).

## Commands

```bash
npm test          # Run Cypress component tests (primary regression suite)
npm run lint      # ESLint across src/ and functions/
npm start         # Vite dev server (port 3000, no Cloudflare functions)
npx wrangler pages dev --d1=DB --persist -- npm start  # Full local stack with D1
```

## What this app is

Cloudflare Pages app for daily task/time tracking. Two storage modes behind one UI:
- **Cloud**: Cloudflare Pages Functions + D1 + Google OAuth
- **Local**: browser `localStorage`, no login required

## Key files

| What | Where |
|------|-------|
| Main UI component | `src/components/Timer/Timer.tsx` |
| Tick behavior | `src/components/Timer/Tick.tsx` |
| Redux slice/actions/selectors | `src/components/Timer/Timer.{slice,actions,selectors}.ts` |
| Storage adapters | `src/RestApi.ts`, `src/LocalStorageApi.ts` |
| Auth functions | `functions/greet.ts`, `functions/callback.ts` |
| Data API | `functions/summaries.ts`, `functions/ticks.ts` |
| Test fixtures | `cypress/fixtures/` |

## Don't break these invariants

- Both storage modes must keep working — every behavior change needs coverage in both `Timer.cy.tsx` (cloud/REST) and `Timer.localStorage.cy.tsx`
- Tick state encoding is `-1` (empty/deleted), `0` (focused), `1` (distracted) — changing this requires coordinated frontend + backend + fixture updates
- Schema changes go in a new numbered migration; never rewrite existing migration history
- Session cookies are `SameSite=Lax` — do not change to Strict (breaks OAuth cross-site redirect)
- `redirect_uri` for OAuth is derived dynamically from `request.url` origin — do not hardcode

## Test conventions

- Tick state is asserted via `data-tick-state` attribute (`focused`, `distracted`, `empty`), not CSS class names
- `cy.clock()` must be called **before** any navigation that causes a re-render, not just before the assertion — `todaysDateInt()` is evaluated during render
- Timezone adjustment for clock mocks: `TODAYS_DATE + new Date().getTimezoneOffset() * 60 * 1000`

## Toolchain

- **Bundler**: Vite 6, output to `build/`
- **Tests**: Cypress 15 component testing
- **Coverage**: `babel-plugin-istanbul` + `@cypress/code-coverage`, enabled by `CYPRESS_COVERAGE=true`
- **Node**: 20 (`.node-version`)
- **Deployment**: Cloudflare Pages (main → production, branches → preview URLs)
