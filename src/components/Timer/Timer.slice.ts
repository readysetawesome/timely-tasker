import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { Summary } from '../../../functions/summaries';
import { ApiStates, RestApiStatus } from '../../RestApi';
import { TimerTick } from './TaskRowTicks';
import { TickState } from './Tick';
import { CalendarEvent } from '../../RestApi';

export interface TimerState {
  summaries: { [slot: number]: Summary };
  calendarEvents: { [date: number]: CalendarEvent[] };
  loadingDate?: number;
  summariesLoading: RestApiStatus;
  summaryCreated: RestApiStatus;
  calendarLoading: RestApiStatus;
  sessionExpired: boolean;
}

const initialState = {
  summaries: {},
  calendarEvents: {},
  summariesLoading: ApiStates.Initial,
  summaryCreated: ApiStates.Initial,
  calendarLoading: ApiStates.Initial,
  sessionExpired: false,
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
        state.summaries[s.slot] = s;
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
    sessionExpired: (state) => {
      state.summariesLoading = ApiStates.Error;
      state.sessionExpired = true;
    },

    summariesReordered: (state, action: PayloadAction<Summary[]>) => {
      state.summaries = {};
      action.payload.forEach((s) => {
        state.summaries[s.slot] = s;
      });
    },

    summaryCreated: (state, action: PayloadAction<Summary>) => {
      state.summaries[action.payload.slot] = action.payload;
      state.summaryCreated = ApiStates.Success;
    },
    summaryDeleted: (state, action: PayloadAction<{ slot: number }>) => {
      delete state.summaries[action.payload.slot];
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
          (t) => t.tickNumber !== tick.tickNumber
        ),
      ];

      // pack the new member into array only if not deleted
      if (tickChangeEvent.distracted !== TickState.Deleted)
        tickArray.push({ ...tick, distracted: tickChangeEvent.distracted });

      state.summaries[tickChangeEvent.slot] = {
        ...state.summaries[tickChangeEvent.slot],
        TimerTicks: tickArray,
      };
    },

    calendarEventsLoaded: (
      state,
      action: PayloadAction<{ date: number; events: CalendarEvent[] }>
    ) => {
      state.calendarEvents[action.payload.date] = action.payload.events;
      state.calendarLoading = ApiStates.Success;
    },

    calendarEventsLoading: (state, action: PayloadAction<number>) => {
      state.calendarLoading = ApiStates.InProgress;
      state.loadingDate = action.payload;
    },

    calendarEventsError: (state) => {
      state.calendarLoading = ApiStates.Error;
    },
  },
});

export const {
  summariesLoaded,
  summariesLoading,
  summariesError,
  sessionExpired,
  summariesReordered,
  summaryCreated,
  summaryDeleted,
  summaryPending,
  summaryError,
  tickUpdated,
  calendarEventsLoaded,
  calendarEventsLoading,
  calendarEventsError,
} = slice.actions;
export default slice.reducer;
