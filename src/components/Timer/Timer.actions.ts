import {
  summariesError,
  summariesLoaded,
  summariesLoading,
  summaryCreated,
  summaryError,
  summaryPending,
  TickChangeEvent,
  tickUpdated,
} from './Timer.slice';
import RestApi from '../../RestApi';
import { Summary } from '../../../functions/summaries';
import { TimerTick } from './TaskRowTicks';

export const fetchSummaries = (useDate: number) => async (dispatch) => {
  try {
    dispatch(summariesLoading(useDate));
    await RestApi.getSummaries(
      useDate,
      (response) => dispatch(summariesLoaded(response)),
      () => dispatch(summariesError()),
    );
  } catch (e) {
    dispatch(summariesError());
    return console.error(e.message);
  }
};

export const setSummary = (s: Summary) => async (dispatch) => {
  try {
    dispatch(summaryPending(s));
    await RestApi.createSummary(s, (s: Summary) => dispatch(summaryCreated(s)));
  } catch (e) {
    dispatch(summaryError(s));
    return console.error(e.message);
  }
};

export const tickClicked = (tickChangeEvent: TickChangeEvent) => async (dispatch) => {
  try {
    if (tickChangeEvent.summary.ID === undefined) {
      await RestApi.createSummary(tickChangeEvent.summary, (summary: Summary) => {
        dispatch(summaryCreated(summary));
        RestApi.createTick({ ...tickChangeEvent, summary }, (tick: TimerTick) =>
          dispatch(tickUpdated({ tick, tickChangeEvent })),
        );
      });
    } else {
      console.log('dispatching tickUpdated ', tickChangeEvent);
      await RestApi.createTick(tickChangeEvent, (tick: TimerTick) => dispatch(tickUpdated({ tick, tickChangeEvent })));
    }
  } catch (e) {
    return console.error(e.message);
  }
};
