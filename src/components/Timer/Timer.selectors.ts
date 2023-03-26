import { createSelector } from '@reduxjs/toolkit';
import { Summary } from '../../../functions/summaries';


export const getSummaries = (store): { [slot: number]: Summary } => store.timer.summaries;
export const getLoadingDate = (store) => store.timer.loadingDate;

export const getSummary = createSelector([getSummaries, (state, slot: number) => slot], (summaries, slot) => {
  return summaries[slot];
});
