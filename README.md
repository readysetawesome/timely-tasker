<h1 align="center">The Timely Tasker App</h1>
<p align="center">
  <a href="https://github.com/readysetawesome/timely-tasker/actions/workflows/ci.yml">
    <img src="https://github.com/readysetawesome/timely-tasker/actions/workflows/ci.yml/badge.svg?branch=main" />
  </a>
  <a href="https://app.codecov.io/gh/readysetawesome/timely-tasker">
    <img src="https://img.shields.io/codecov/c/gh/readysetawesome/timely-tasker" />
  </a>
  <a href="https://github.com/readysetawesome/timely-tasker/issues">
    <img src="https://img.shields.io/github/issues/readysetawesome/timely-tasker" />
  </a>
</p>

## Overview

  Inspired by D. Shea's ETT productivity worksheet, read more of the philosophy here:
  https://davidseah.com/node/the-emergent-task-timer/

  Try the app out here right now:
  http://timely-tasker.com/timer

<p align="center">
  <a href="https://timely-tasker.com" align="center">
    <img src="https://user-images.githubusercontent.com/105779/227736707-3ba0ce3b-6694-4da8-a9b3-8053c636a14d.gif?raw=true"/>
  </a>
</p>

#### Project Structure:
```zsh
./cypress    # Test fixtures and boilerplate
./bin        # Dev tools
./fixtures   # Fixtures for use in development
./functions  # Serverless cloud-run code (the REST api lives here, routes map to these filenames)
./lib        # Supporting code for serverless functions
./migrations # Database migrations
./public     # Static assets
./src        # React application code
```

#### React Component Structure:
```zsh
#  Timer.tsx
#  |__TaskRowSummary.tsx
#  |
#  |__TaskRowTicks.tsx
#     |__Tick.tsx
```

#### Project Details:
* built with [CloudFlare Pages](https://pages.cloudflare.com/)
* react.js front-end with reduxjs for state management
* interactive browser-based test coverage with [Cypress](https://www.cypress.io/)
* backend data stored using [Functions](https://developers.cloudflare.com/pages/platform/functions/) & [D1](https://developers.cloudflare.com/d1/) for lightweight relational storage
* pipeline integration with github CI and [codecov](https://app.codecov.io/gh/readysetawesome/timely-tasker), ++README badges!

#### oAuth Identity via Google
![web sequence for oAuth interaction](https://www.websequencediagrams.com/cgi-bin/cdraw?lz=dGl0bGUgVGltZWx5IFRhc2tlciBvQXV0aCBsb2dpbiBmbG93Cgpicm93c2VyLT4AAgc6IGxvYWQAMActADEGABsKdAARBnQASQUuY29tOiBHRVQgL2dyZWV0CmFsdCBubyBodHRwIHJlcXVlc3QgY29va2llCiAgICAALBEtPmFjY291bnRzLmdvb2dsZQBHCy53ZWxsLWtub3duL29wZW5pZC1jb25maWd1cmF0aW9uAE0FACwTAIEPFXsgLi4uAIF2BgA_BnMuLi4gfQB-GACBUxNjcmVhdGUgc2Vzc2lvbiBzdGF0ZVxuIGFzc2VtYmxlIGF1dGggdXJsAIFRGACCVQl7ACYFb3JpemVVcmwgfSArIFNldC1DAIIiBTogWwBVDV0AgkcFT25seQCCPAUAgyMJAIIdGm8vb2F1dGgyL3YyL2F1dGg_AIElBT0mc2NvcGU9JmNsaWVudF9pZD0mcmVkaXJlY3RfdXJpPQCCNBoAhA4JSFRUUCAyMDAgY29uc2VudCBzY3JlZW4gaHRtAIFwBgCBAB5zdWJtaXQAhHUGLwA7CHRvIGNsYWltcwBYKDMwMiBMb2MAg30FOgCEZAVzOi8vAIUFES9jYWxsYmFjaz9jb2RlPS4uLiYAggIGLi4uAII8DgCFORgAISAAhTkTAIJzBgCFQwdhcGlzAIYaBlBPU1QgL3Rva2VuPwB3CAAWFQCGSRUAgm0JanNvbiB3aXRoIGFjY2VzcyBhbmQgaWQgAFQFAII6BgCFJCZEQiBzZWxlY3QgZm9yIGV4aXN0aW5nIGlkZW50aXR5XG4AiB4Gc3ViamVjdCA9PT0gSQAWBmllcy5wcm92aWRlcgAMB3lJZACHAwZsdACGGwhuZXcARAkgaWYgbm90AGAGAINfBgB8LWluc2VydAB4CHksIFVzZXIAiEcFZW4AcwYAGzBVc2VyUwCHPwYAcx0AhEE2XG4AhzgUSWRdOyBIAIdBCAplbHNlAIoQFACCGgwAgxc0AIkUCGpvaW5lZCB0bwCDSwkAiHIjAIMpCX0KZW5kAIwMCwCLXxMAhUwGc3VtbWFyaWVzPy4uLlxuAIFXHgCEazAAhQYIK3VzZXIgYnkAinEISWQAISoAhDYHUwCBIAgAcRQAiUwST0sgeyAAgVYGeSB9Cg&s=default)
* Goal: only to establish identity/ownership of data, no google APIs will be authorized via oAuth scopes. For this we can target only the id_token info.
* Uses oAuth only, not OIDC, only supports google accounts.
* authorization code flow, server->server code exchange which results in a crypto-safe unique session ID cookie that is not visible to JS (i.e. marked 'httpOnly' to bust XSRF).
* this cookie comes with all future XHRs to CRUD my app's cloud data, that's how we associate it with you
* the direct server->server call to google over TLS for token exchange means we don't have to validate a JWT separately, the identity returned is always valid in server context

#### Coming:
* ~~speed/ui responsiveness improvements (avoid re-fetch and re-render the whole list if possible)~~
* ~~navigate to prevoius dates~~
* something to highlight the current hour and bring attention

## Database Schema

[schema diagram](http://htmlpreview.github.io?https://github.com/readysetawesome/timely-tasker/blob/main/public/schema_info.html)

Each Summary is one horizontal line with a topic at the beginning,
each TimerTick is one of the 96 quarter-hour slots in a day.
TimerTicks will be displayed horizontally next to their summary,
offering a simple way to track work items and the push/pull
between scheduled work and distractions.

TimerTicks can have 2 states: Distracted = 0, Distracted = 1
A TimerTick is created for any "occupied" tick, i.e. whenever
the user clicks a tick. Clicking 2 ticks in the same column
shall result in the state of both ticks being saved as
Distracted = 1, to indicate that time was spread between tasks.

## Commands

### `npx wrangler pages dev --d1=DB --persist -- npm start`

Runs the app in the development mode, with sqlite persistence enabled.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `wrangler d1 migrations apply timely-tasker-dev --local`

Runs migrations on local dev

### `wrangler d1 migrations apply timely-tasker-dev`

Runs migrations in preview/staging.

### `bin/migrate-prod-db`

!!RUNS MIGRATIONS IN PRODUCTION!!

### `sqlite3 .wrangler/state/d1/DB.sqlite3`

Loads a local dev DB console (run migrations to create the db)

