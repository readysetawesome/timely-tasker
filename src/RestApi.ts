import { RequestInitCfProperties } from '@cloudflare/workers-types';
import { Summary } from '../functions/summaries';
import { TickChangeEvent } from './components/Timer/Timer.slice';

export type RestApiStatus = {
  loaded: boolean;
  error: boolean;
  inProgress: boolean;
};

export const ApiStates = {
  Initial: {
    loaded: false,
    error: false,
    inProgress: false,
  } as RestApiStatus,
  InProgress: {
    loaded: false,
    error: false,
    inProgress: true,
  } as RestApiStatus,
  Success: {
    loaded: true,
    error: false,
    inProgress: false,
  } as RestApiStatus,
  Error: {
    loaded: false,
    error: true,
    inProgress: false,
  } as RestApiStatus,
};

export const getRestSelectorsFor = (slice, target) => {
  return {
    inProgress: (state) => state[slice][target].inProgress,
    error: (state) => state[slice][target].error,
    success: (state) => state[slice][target].loaded,
  };
};

const isDevMode = process.env.NODE_ENV === 'development';
const fetchPrefix = isDevMode ? 'http://127.0.0.1:8788' : '';
const fetchOptions = (isDevMode ? { mode: 'cors' } : {}) as RequestInit<RequestInitCfProperties>;

const createSummary = (summary: Summary) =>
  fetch(
    fetchPrefix + `/summaries?date=${summary.Date}&text=${encodeURIComponent(summary.Content)}&slot=${summary.Slot}`,
    { ...fetchOptions, method: 'POST' },
  ).then((response) => response.json());

const getSummaries = (useDate: number) =>
  fetch(fetchPrefix + `/summaries?date=${useDate}`, fetchOptions).then((response) => response.json());

const greet = (callback) =>
  fetch(fetchPrefix + '/greet', fetchOptions)
    .then((response) => response.json())
    .then(callback);

const createTick = (tickChangeEvent: TickChangeEvent, callback) =>
  fetch(
    fetchPrefix +
      `/ticks?summary=${tickChangeEvent.summary.ID}&tick=${tickChangeEvent.tickNumber}&distracted=${tickChangeEvent.distracted}`,
    { ...fetchOptions, method: 'POST' },
  )
    .then((response) => response.json())
    .then((data) => callback(data));

const exports = { greet, createTick, getSummaries, createSummary };
export default exports;
