import { Summary } from '../functions/summaries';
import { synthesizeTick } from './components/Timer/Timer.actions';
import { TickChangeEvent } from './components/Timer/Timer.slice';

export const localStoragePrefix = 'TimelyTasker:';

const safeTickSerializer = (key, value) => {
  // prevent duplication in serializations below, due to the tick.summary ref
  if (key === 'summary' || key === 'previously') return undefined;
  else return value;
};

const createSummary = (summary: Summary, storage = localStorage) =>
  new Promise<Summary>((resolve) => {
    summary.id =
      parseInt(storage.getItem(localStoragePrefix + 'lastSummaryId') ?? '0') +
      1;
    storage.setItem(
      localStoragePrefix + 'lastSummaryId',
      summary.id.toString()
    );

    const itemKey = localStoragePrefix + summary.date.toString();
    const summariesStr = storage.getItem(itemKey);
    const summaries = summariesStr
      ? (JSON.parse(summariesStr) as Summary[])
      : [];
    storage.setItem(
      itemKey,
      JSON.stringify(
        [...summaries.filter((s) => s.slot !== summary.slot), summary],
        safeTickSerializer
      )
    );
    resolve(summary);
  });

const getSummaries = (date: number, storage = localStorage) =>
  new Promise<Summary[]>((resolve) => {
    const summaries = JSON.parse(
      storage.getItem(localStoragePrefix + date.toString()) ?? '[]'
    ) as Summary[];
    resolve(summaries);
  });

const createTick = (
  tickChangeEvent: TickChangeEvent,
  callback,
  storage = localStorage
) =>
  new Promise<Summary[]>((resolve) => {
    const itemKey =
      localStoragePrefix + tickChangeEvent.summary.date.toString();

    const summariesStr = storage.getItem(itemKey);
    // unreachable line: the front end always creates summary first if not existing
    /* istanbul ignore next */
    const summaries = summariesStr
      ? (JSON.parse(summariesStr) as Summary[])
      : [];

    const summary = summaries.find((s) => s.slot === tickChangeEvent.slot);
    /* istanbul ignore next */
    if (summary === undefined) return resolve(callback(undefined));

    const tick = synthesizeTick(tickChangeEvent);
    summary.TimerTicks = summary.TimerTicks.filter(
      (t) => t.tickNumber !== tickChangeEvent.tickNumber
    );

    if (tick.distracted !== -1 && tick.distracted !== undefined)
      summary.TimerTicks.push(tick);

    storage.setItem(
      itemKey,
      JSON.stringify(
        [...summaries.filter((s) => s.slot !== summary.slot), summary],
        safeTickSerializer
      )
    );

    resolve(callback(tick));
  });

const exports = { createTick, getSummaries, createSummary };

export type StorageApiType = typeof exports;

export default exports;
