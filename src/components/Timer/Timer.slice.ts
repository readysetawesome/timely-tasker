import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { Summary } from '../../../functions/summaries';
import { ApiStates, RestApiStatus } from '../../RestApi';
import { TimerTick } from './TaskRowTicks';

export interface TimerState {
  summaries: { [slot: number]: Summary };
  pendingSummaries: { [slot: number]: Summary };
  loadingDate?: number;
  summariesLoading: RestApiStatus;
  // ticksChanging: { [slot: number]: TimerTick[] };
}

const initialState = {
  summaries: {},
  pendingSummaries: {},
  summariesLoading: ApiStates.Initial,
  // ticksChanging: [],
} as TimerState;

export type TickChangeEvent = {
  tickNumber: number;
  slot: number;
  summary: Summary;
  distracted: number;
};

const slice = createSlice({
  name: 'timer',
  initialState,
  reducers: {
    summariesLoaded: (state, action: PayloadAction<Summary[]>) => {
      action.payload.forEach((s) => {
        state.summaries[s.Slot] = s;
      });
      state.summariesLoading = ApiStates.Success;
    },
    summariesLoading: (state, action: PayloadAction<number>) => {
      state.summaries = {};
      state.summariesLoading = ApiStates.InProgress;
      state.loadingDate = action.payload;
    },
    summariesError: (state) => {
      state.summariesLoading = ApiStates.Error;
    },

    summaryCreated: (state, action: PayloadAction<Summary>) => {
      state.summaries[action.payload.Slot] = action.payload;
      delete state.pendingSummaries[action.payload.Slot];
      // Check for ticks that we queued up because this was pending?
    },
    summaryPending: (state, action: PayloadAction<Summary>) => {
      state.pendingSummaries[action.payload.Slot] = action.payload;
    },
    summaryError: (state, action: PayloadAction<Summary>) => {
      state.pendingSummaries[action.payload.Slot] = action.payload;
      delete state.pendingSummaries[action.payload.Slot];
    },

    /*tickChanged: (state, { payload: tickChangeEvent }: PayloadAction<TickChangeEvent>) => {
      // state.ticksChanging[tickChangeEvent.slot].push(tickChangeEvent);
    },*/
    tickUpdated: (
      state,
      { payload: { tick, tickChangeEvent } }: PayloadAction<{ tick: TimerTick; tickChangeEvent: TickChangeEvent }>,
    ) => {
      const tickArray = [
        ...state.summaries[tickChangeEvent.slot].TimerTicks.filter((t) => t.TickNumber !== tick.TickNumber),
      ];
      if (tickChangeEvent.distracted !== -1) tickArray.push(tick);
      state.summaries[tickChangeEvent.slot] = {
        ...state.summaries[tickChangeEvent.slot],
        TimerTicks: tickArray,
      };
    },
  },
});

export const {
  summariesLoaded,
  summariesLoading,
  summariesError,
  summaryCreated,
  summaryPending,
  summaryError,
  tickUpdated,
} = slice.actions;
export default slice.reducer;
