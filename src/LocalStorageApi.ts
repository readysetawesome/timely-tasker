import { Summary } from '../functions/summaries';
import { UserPreferences } from '../functions/preferences';
import { synthesizeTick } from './components/Timer/Timer.actions';
import { TickChangeEvent } from './components/Timer/Timer.slice';

export const localStoragePrefix = 'TimelyTasker:';
const PREFERENCES_KEY = localStoragePrefix + 'Preferences';

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

    const summariesKey = localStoragePrefix + summary.date.toString();
    const summariesStr = storage.getItem(summariesKey);
    const summarySlots = summariesStr
      ? (JSON.parse(summariesStr) as number[])
      : [];

    // store the individual row of summary + ticks
    const summaryKey = `${summariesKey}-${summary.slot}`;
    storage.setItem(summaryKey, JSON.stringify(summary, safeTickSerializer));

    // store an array of summary slots for lookup, under this date's key
    storage.setItem(
      summariesKey,
      JSON.stringify([
        ...summarySlots.filter((slot) => slot !== summary.slot),
        summary.slot,
      ])
    );

    resolve(summary);
  });

const getSummaries = (date: number, storage = localStorage) =>
  new Promise<Summary[]>((resolve) => {
    const summariesKey = localStoragePrefix + date.toString();
    const summarySlots = JSON.parse(
      storage.getItem(summariesKey) ?? '[]'
    ) as number[];
    const summaries = summarySlots.map((s) =>
      JSON.parse(storage.getItem(`${summariesKey}-${s}`) ?? '[]')
    );
    resolve(summaries);
  });

const createTick = (
  tickChangeEvent: TickChangeEvent,
  callback,
  storage = localStorage
) =>
  new Promise<Summary[]>((resolve) => {
    const summariesKey =
      localStoragePrefix + tickChangeEvent.summary.date.toString();

    const summaryKey = `${summariesKey}-${tickChangeEvent.slot}`;

    const summary = JSON.parse(storage.getItem(summaryKey) ?? 'null');
    /* istanbul ignore next */
    if (summary === null) return resolve(callback(undefined));

    const tick = synthesizeTick(tickChangeEvent);
    summary.TimerTicks = summary.TimerTicks.filter(
      (t) => t.tickNumber !== tickChangeEvent.tickNumber
    );

    if (tick.distracted !== -1 && tick.distracted !== undefined)
      summary.TimerTicks.push(tick);

    storage.setItem(summaryKey, JSON.stringify(summary, safeTickSerializer));

    resolve(callback(tick));
  });

const getPreferences = (storage = localStorage): Promise<UserPreferences> =>
  new Promise((resolve) => {
    const raw = storage.getItem(PREFERENCES_KEY);
    resolve(raw ? JSON.parse(raw) : {});
  });

const setPreference = <K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K],
  storage = localStorage
): Promise<UserPreferences> =>
  new Promise((resolve) => {
    const existing: UserPreferences = JSON.parse(
      storage.getItem(PREFERENCES_KEY) ?? '{}'
    );
    const updated = { ...existing, [key]: value };
    storage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
    resolve(updated);
  });

const exports = { createTick, getSummaries, createSummary, getPreferences, setPreference };

export type StorageApiType = typeof exports;

export default exports;
