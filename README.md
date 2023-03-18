# The Timely Tasker App

<p align="center">
  <a href="https://readysetawesome.testspace.com/spaces/208089/current/303007">
    <img src="https://img.shields.io/testspace/tests/readysetawesome/readysetawesome:timely-tasker/main?compact_message" />
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

Try the app out here right now: (github login or single use code login required)
http://timely-tasker.com/timer

#### Features:
* built 100% using [CloudFlare Pages](https://pages.cloudflare.com/)
* modern react front-end using hooks and all the latest goodies I can get my hands on
* strong user Identity and data ownership via [CloudFlare Access plugin](https://developers.cloudflare.com/pages/platform/functions/plugins/cloudflare-access/) integration and JWT assertions
* backend data stored using [Functions](https://developers.cloudflare.com/pages/platform/functions/) & [D1](https://developers.cloudflare.com/d1/) for lightweight relational storage
* pipeline integration with [codecov](https://app.codecov.io/gh/readysetawesome/timely-tasker) and [testspace](https://readysetawesome.testspace.com/spaces/208089/current/303007), ++README badges!

#### Coming:
* speed/ui responsiveness improvements (avoid re-fetch and re-render the whole list if possible)
* navigate to prevoius dates (read only no cheating)
* something to highlight the current hour and bring attention

## Database Schema

http://timely-tasker.com/schema_info.html

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

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
