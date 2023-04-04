import { Summary } from '../functions/summaries';
import { synthesizeTick } from './components/Timer/Timer.actions';
import { TickChangeEvent } from './components/Timer/Timer.slice';

const localStoragePrefix = 'TimelyTasker:';

const createSummary = (summary: Summary) =>
  new Promise<Summary>((resolve) => {
    summary.id =
      parseInt(
        localStorage.getItem(localStoragePrefix + 'lastSummaryId') ?? '0'
      ) + 1;
    localStorage.setItem(
      localStoragePrefix + 'lastSummaryId',
      summary.id.toString()
    );

    const itemKey = localStoragePrefix + summary.date.toString();
    const summaries = JSON.parse(
      localStorage.getItem(itemKey) ?? '[]'
    ) as Summary[];
    localStorage.setItem(
      itemKey,
      JSON.stringify([
        ...summaries.filter((s) => s.slot !== summary.slot),
        summary,
      ])
    );
    resolve(summary);
  });

const getSummaries = (date: number) =>
  new Promise<Summary[]>((resolve) => {
    const summaries = JSON.parse(
      localStorage.getItem(localStoragePrefix + date.toString()) ?? '[]'
    ) as Summary[];
    resolve(summaries);
  });

const createTick = (tickChangeEvent: TickChangeEvent, callback) =>
  new Promise<Summary[]>((resolve) => {
    const itemKey =
      localStoragePrefix + tickChangeEvent.summary.date.toString();
    const summaries = JSON.parse(
      localStorage.getItem(itemKey) ?? '[]'
    ) as Summary[];
    const summary = summaries.find((s) => s.slot === tickChangeEvent.slot);
    if (summary === undefined) return; // should never happen

    const tick = synthesizeTick(tickChangeEvent);
    summary.TimerTicks = [
      ...summary.TimerTicks.filter(
        (t) => t.tickNumber !== tickChangeEvent.tickNumber
      ),
      tick,
    ];

    localStorage.setItem(
      itemKey,
      JSON.stringify([
        ...summaries.filter((s) => s.slot !== summary.slot),
        summary,
      ])
    );

    resolve(callback(tick));
  });

const exports = { createTick, getSummaries, createSummary };

export type StorageApiType = typeof exports;

export default exports;
