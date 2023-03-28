import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { Summary } from '../../../functions/summaries';
import { ApiStates, RestApiStatus } from '../../RestApi';
import { TimerTick } from './TaskRowTicks';
import { TickState } from './Tick';

export interface TimerState {
  summaries: { [slot: number]: Summary };
  loadingDate?: number;
  summariesLoading: RestApiStatus;
  summaryCreated: RestApiStatus;
}

const initialState = {
  summaries: {},
  summariesLoading: ApiStates.Initial,
  summaryCreated: ApiStates.Initial,
} as TimerState;

export type TickChangeEvent = {
  tickNumber: number;
  slot: number;
  summary: Summary;
  distracted: TickState;
  previously: number;
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
      state.summaryCreated = ApiStates.Success;
    },
    summaryPending: (state) => {
      state.summaryCreated = ApiStates.InProgress;
    },
    summaryError: (state) => {
      state.summaryCreated = ApiStates.Error;
    },

    tickUpdated: (
      state,
      {
        payload: { tick, tickChangeEvent },
      }: PayloadAction<{ tick: TimerTick; tickChangeEvent: TickChangeEvent }>
    ) => {
      // Slice the old member out of the array
      const tickArray = [
        ...state.summaries[tickChangeEvent.slot].TimerTicks.filter(
          (t) => t.TickNumber !== tick.TickNumber
        ),
      ];

      // pack the new member into array only if not deleted
      if (tickChangeEvent.distracted !== TickState.Deleted)
        tickArray.push({ ...tick, Distracted: tickChangeEvent.distracted });

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
