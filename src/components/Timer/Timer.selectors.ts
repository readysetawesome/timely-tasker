import { createSelector } from '@reduxjs/toolkit';
import { Summary } from '../../../functions/summaries';
import { TimerTick } from './TaskRowTicks';

export const getSummaries = (store): { [slot: number]: Summary } =>
  store.timer.summaries;
export const getLoadingDate = (store) => store.timer.loadingDate;

export const getSummary = createSelector(
  [getSummaries, (state, slot: number) => slot],
  (summaries, slot): Summary | undefined => {
    return summaries[slot];
  }
);

export const getFocusedHoursForSlot = createSelector(
  [getSummary],
  (summary): number => {
    if (!summary?.TimerTicks) return 0;
    const focusedTickCount = summary.TimerTicks.filter(
      (tick) => tick.distracted === 0
    ).length;
    return focusedTickCount / 4;
  }
);

export const getTotalFocusedHours = createSelector(
  [getSummaries],
  (summaries): number => {
    return Object.values(summaries).reduce((total, summary) => {
      if (!summary?.TimerTicks) return total;
      return total + summary.TimerTicks.filter((t) => t.distracted === 0).length / 4;
    }, 0);
  }
);

export const getMatchingTicks = createSelector(
  [getSummaries, (state, tickNumber: number) => tickNumber],
  (summaries, tickNumber): TimerTick[] => {
    const matching: TimerTick[] = [];
    Object.values(summaries).forEach((summary) => {
      summary.TimerTicks.forEach((t) => {
        // pack a pointer to the summary with this tick, used to process after effects
        if (t.tickNumber === tickNumber) matching.push({ ...t, summary });
      });
    });
    return matching;
  }
);
