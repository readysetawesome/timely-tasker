import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit'
import { Summary } from '../../../functions/summaries';
import { ApiStates, RestApiStatus } from '../../RestApi';


export interface TimerState {
  summaries: { [slot: number]: Summary };
  loadingDate?: number;
  loadingSummaries: RestApiStatus;
}

const initialState = { summaries: {}, loadingSummaries: ApiStates.Initial } as TimerState;

const slice = createSlice({
  name: 'timer',
  initialState,
  reducers: {
    loadedSummaries: (state, action: PayloadAction<Summary[]>) => {
      action.payload.forEach((s) => {
        console.log(s);
        state.summaries[s.Slot] = s;
      });
      state.loadingSummaries = ApiStates.Success;
    },
    loadingSummaries: (state, action: PayloadAction<number>) => {
      state.loadingSummaries = ApiStates.InProgress;
      state.loadingDate = action.payload;
    },
    errorSummaries: (state) => {
      state.loadingSummaries = ApiStates.Error;
    },
  },
});

export const { loadedSummaries, loadingSummaries, errorSummaries } = slice.actions;
export default slice.reducer;
