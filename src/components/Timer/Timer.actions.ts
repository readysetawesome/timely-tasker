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
  dispatch(summariesLoading(useDate));
  await RestApi.getSummaries(
    useDate,
    (response) => dispatch(summariesLoaded(response)),
    () => dispatch(summariesError()),
  );
};

export const setSummary = (s: Summary) => async (dispatch) => {
  dispatch(summaryPending(s));
  await RestApi.createSummary(s)
    .then((s: Summary) => dispatch(summaryCreated(s)))
    .catch(summaryError);
};

export const tickClicked = (tickChangeEvent: TickChangeEvent) => async (dispatch) => {
  if (tickChangeEvent.summary.ID === undefined) {
    await RestApi.createSummary(tickChangeEvent.summary).then((summary: Summary) => {
      dispatch(summaryCreated(summary));
      RestApi.createTick({ ...tickChangeEvent, summary }, (tick: TimerTick) =>
        dispatch(tickUpdated({ tick, tickChangeEvent })),
      );
    }); // TODO: .catch()
  } else {
    await RestApi.createTick(tickChangeEvent, (tick: TimerTick) => dispatch(tickUpdated({ tick, tickChangeEvent })));
  }
};
