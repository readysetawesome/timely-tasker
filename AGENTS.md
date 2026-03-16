# AGENTS.md

This file is a practical runbook for engineers and coding agents working in this repository.

## 1. Project Purpose

Timely Tasker is a Cloudflare Pages app for lightweight daily task/time tracking.
Core behavior lives in the timer grid UI and its summary/tick state transitions.

## 2. Fast Orientation

- Read [README.md](./README.md) for product context.
- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system flow.
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

- [Timer.cy.tsx](./src/components/Timer/Timer.cy.tsx)
- [Timer.localStorage.cy.tsx](./src/components/Timer/Timer.localStorage.cy.tsx)

When changing timer behavior, update fixtures in `cypress/fixtures/` as needed.

### Coverage requirement

**100% line coverage of all new/changed source files is required before opening a PR.**
Codecov enforces a patch coverage target (~99.67%) and will fail the PR check if new lines are missed.

Before pushing:
```bash
CYPRESS_COVERAGE=true npm test
```

Then verify no misses in new files:
```bash
node -e "
const fs = require('fs');
const lcov = fs.readFileSync('coverage/lcov.info', 'utf8');
lcov.split('SF:').slice(1).forEach(f => {
  const name = f.split('\n')[0];
  const misses = f.split('\n').filter(l => /DA:\d+,0/.test(l));
  if (misses.length) console.log(name, misses.length, 'misses');
});
"
```

Every new component needs its own `ComponentName.cy.tsx` spec covering all branches.

## 7. Deployment and Data Ops

- Preview/local migrations:
  - `wrangler d1 migrations apply timely-tasker-dev --local`
  - `wrangler d1 migrations apply timely-tasker-dev`
- Production migration helper:
  - `bin/migrate-prod-db`
- Local seed helper:
  - `bin/generate-dev-user`

Treat production migration commands as high-risk operations.

## 8. Agent Efficiency

### Prefer quiet test output
`npm run test:quiet` uses `--reporter min` and prints only failures + the spec summary table. Use this instead of `npm test` to avoid 96 lines of `✓` noise. Add `--spec` to limit to the file you changed:

```bash
npm run test:quiet -- --spec "src/components/Timer/Timer.cy.tsx"
```

### Coverage feedback loop
```bash
npm run test:quiet:coverage   # instrument + run
npm run check-coverage        # print any missed lines in the diff
```
Only do the full coverage run once before committing — not after every edit.

### Lint
```bash
npm run lint -- --quiet   # errors only, suppresses warnings
```

### Don't retry blindly
If a test or command fails, read the error before re-running. Cypress prints the full assertion error and URL under `1 failing` — that's all you need.

### Single-responsibility commits
One logical change per commit. The pre-push hook runs the full test suite with coverage; keep commits small so a hook failure is cheap to fix.

## 9. Pull Request Requirements

Every agent-created PR description **must include at least one screenshot** demonstrating the visible change. Use the Cloudflare preview deployment URL (`https://<branch-name>.timely-tasker.pages.dev`) or a local `npm start` capture.

To embed a screenshot in a PR description via the `gh` CLI:

```bash
# 1. Take a screenshot (macOS)
screencapture -x /tmp/pr-screenshot.png

# 2. Upload it to GitHub and get a URL
#    Paste the file into a GitHub comment/issue in-browser to get a CDN URL,
#    then reference it in the PR body — OR use the GitHub API:
UPLOAD_URL=$(gh api repos/readysetawesome/timely-tasker/issues \
  --method POST -f title=tmp -f body=tmp --jq '.url')
# Then upload via the web editor to get the CDN URL

# 3. Edit the PR body to include the image
gh pr edit <number> --body "$(cat <<'EOF'
## Summary
...

## Screenshots
![feature preview](https://user-images.githubusercontent.com/...)
EOF
)"
```

**Minimum bar:** one before/after pair or a single "after" screenshot showing the UI change in context.

## 10. Known Footguns

- `wrangler` config files are ignored by `.gitignore` (`*.toml`), so local setup may rely on developer-provided config.
- OAuth callback flow depends on correctly configured Google credentials in runtime env vars.
- Session cookies use `SameSite=Lax` (not Strict) so the OAuth redirect from Google carries the state cookie back to `/callback`. Using Strict breaks the CSRF check.
- The `redirect_uri` for OAuth is derived dynamically from `new URL(request.url).origin + '/callback'` so preview deployments (e.g. `fix-foo.timely-tasker.pages.dev`) work without hardcoding the URI. Each preview URL must be registered in the Google Cloud Console.
- Timer behavior includes optimistic updates; failed network writes can temporarily diverge from persisted state.
