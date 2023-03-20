import { RequestInitCfProperties } from '@cloudflare/workers-types';
import { Summary } from '../functions/summaries';
import { TickChangeEvent } from './components/Timer/Tick';

const isDevMode = process.env.NODE_ENV === 'development';
const fetchPrefix = isDevMode ? 'http://127.0.0.1:8788' : '';
const fetchOptions = (
  isDevMode ? { mode: 'cors' } : {}
) as RequestInit<RequestInitCfProperties>;

const createSummary = (summary: Summary, callback) =>
  fetch(
    fetchPrefix +
      `/summaries?date=${summary.Date}&text=${encodeURIComponent(
        summary.Content
      )}&slot=${summary.Slot}`,
    { ...fetchOptions, method: 'POST' }
  )
    .then(response => response.json())
    .then(data => callback(data));

const getSummaries = (
  useDate: number,
  callback: (summaries: Array<Summary>) => void
) => {
  // List all summaries for the target date
  fetch(fetchPrefix + `/summaries?date=${useDate}`, fetchOptions)
    .then(response => response.json())
    .then(callback);
};

const greet = callback =>
  fetch(fetchPrefix + '/greet', fetchOptions)
    .then(response => response.json())
    .then(callback);

const createTick = (tickChangeEvent: TickChangeEvent, callback) =>
  fetch(
    fetchPrefix +
      `/ticks?summary=${tickChangeEvent.summary.ID}&tick=${tickChangeEvent.tickNumber}&distracted=${tickChangeEvent.distracted}`,
    { ...fetchOptions, method: 'POST' }
  )
    .then(response => response.json())
    .then(data => callback(data));

const exports = { greet, createTick, getSummaries, createSummary };
export default exports;
