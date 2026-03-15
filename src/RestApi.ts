import { RequestInitCfProperties } from '@cloudflare/workers-types';
import { Summary } from '../functions/summaries';
import { UserPreferences } from '../functions/preferences';
import { PinnedTask } from '../functions/pinnedTasks';
import { IdentityResponse } from '../lib/Identity';
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
/* istanbul ignore next */
const fetchPrefix = isDevMode ? 'http://127.0.0.1:8788' : '';
/* istanbul ignore next */
const fetchOptions = (
  isDevMode ? { mode: 'cors' } : {}
) as RequestInit<RequestInitCfProperties>;

const createSummary = (summary: Summary) =>
  fetch(
    fetchPrefix +
      `/summaries?date=${summary.date}&text=${encodeURIComponent(
        summary.content
      )}&slot=${summary.slot}`,
    { ...fetchOptions, method: 'POST' }
  ).then((response) => response.json<Summary>());

const getSummaries = (useDate: number) =>
  fetch(fetchPrefix + `/summaries?date=${useDate}`, fetchOptions)
    .then((response) => response.json<Summary[] | { error: string }>())
    .then((data) => {
      if (!Array.isArray(data) && data?.error === 'invalid user session')
        throw new Error('session_expired');
      return data as Summary[];
    });

const getSummariesRange = (startDate: number, endDate: number) =>
  fetch(
    fetchPrefix + `/summaries?startDate=${startDate}&endDate=${endDate}`,
    fetchOptions
  )
    .then((response) => response.json<Summary[] | { error: string }>())
    .then((data) => {
      if (!Array.isArray(data) && data?.error === 'invalid user session')
        throw new Error('session_expired');
      return data as Summary[];
    });

const greet = (callback) =>
  fetch(fetchPrefix + '/greet', fetchOptions)
    .then((response) => response.json<IdentityResponse>())
    .then(callback);

const logout = () =>
  fetch(fetchPrefix + '/logout', { ...fetchOptions, method: 'POST' });

const createTick = (tickChangeEvent: TickChangeEvent, callback) =>
  fetch(
    fetchPrefix +
      `/ticks?summary=${tickChangeEvent.summary.id}&tick=${tickChangeEvent.tickNumber}&distracted=${tickChangeEvent.distracted}`,
    { ...fetchOptions, method: 'POST' }
  )
    .then((response) => response.json())
    .then((data) => callback(data));

const getPreferences = (): Promise<UserPreferences> =>
  fetch(fetchPrefix + '/preferences', fetchOptions)
    .then((response) => response.json<UserPreferences>());

const setPreference = <K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): Promise<UserPreferences> =>
  fetch(fetchPrefix + '/preferences', {
    ...fetchOptions,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ [key]: value }),
  }).then((response) => response.json<UserPreferences>());

const getPinnedTasks = (): Promise<PinnedTask[]> =>
  fetch(fetchPrefix + '/pinnedTasks', fetchOptions)
    .then((response) => response.json<PinnedTask[]>());

const setPinnedTask = (text: string): Promise<PinnedTask> =>
  fetch(fetchPrefix + '/pinnedTasks', {
    ...fetchOptions,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  }).then((response) => response.json<PinnedTask>());

const removePinnedTask = (id: number): Promise<void> =>
  fetch(fetchPrefix + `/pinnedTasks?id=${id}`, {
    ...fetchOptions,
    method: 'DELETE',
  }).then(() => undefined);

const updatePinnedTaskText = (id: number, text: string): Promise<PinnedTask> =>
  fetch(fetchPrefix + '/pinnedTasks', {
    ...fetchOptions,
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, text }),
  }).then((response) => response.json<PinnedTask>());

const reorderPinnedTasks = (orderedIds: number[]): Promise<PinnedTask[]> =>
  fetch(fetchPrefix + '/pinnedTasks', {
    ...fetchOptions,
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orderedIds }),
  }).then((response) => response.json<PinnedTask[]>());

export { getPinnedTasks, setPinnedTask, removePinnedTask, updatePinnedTaskText, reorderPinnedTasks };

const reorderSummaries = (date: number, orderedIds: number[]): Promise<Summary[]> =>
  fetch(fetchPrefix + '/summaries', {
    ...fetchOptions,
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ date, orderedIds }),
  }).then((response) => response.json<Summary[]>());

const exports = {
  greet,
  logout,
  createTick,
  getSummaries,
  getSummariesRange,
  createSummary,
  getPreferences,
  setPreference,
  reorderSummaries,
};
export default exports;
