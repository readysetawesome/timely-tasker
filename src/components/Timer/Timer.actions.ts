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
import { Summary } from '../../../functions/summaries';
import { TimerTick } from './TaskRowTicks';
import { Dispatch } from '@reduxjs/toolkit';
import { StorageApiType } from '../../LocalStorageApi';

export const fetchSummaries =
  (useDate: number) => async (dispatch: Dispatch, useApi: StorageApiType) => {
    dispatch(summariesLoading(useDate));
    await useApi
      .getSummaries(useDate)
      .then((response: Summary[]) => dispatch(summariesLoaded(response)))
      .catch(() => dispatch(summariesError()));
  };

export const setSummary =
  (s: Summary) => async (dispatch: Dispatch, useApi: StorageApiType) => {
    dispatch(summaryPending());
    await useApi
      .createSummary(s)
      .then((s: Summary) => dispatch(summaryCreated(s)))
      .catch(() => dispatch(summaryError()));
  };

export const synthesizeTick = (tickChangeEvent: TickChangeEvent) =>
  ({
    ...tickChangeEvent,
    summaryId: tickChangeEvent.summary.id,
  } as TimerTick);

export const tickClicked =
  (tickChangeEvent: TickChangeEvent) =>
  async (dispatch: Dispatch, useApi: StorageApiType) => {
    if (tickChangeEvent.summary.id === undefined) {
      await useApi
        .createSummary(tickChangeEvent.summary)
        .then((summary: Summary) => {
          dispatch(summaryCreated(summary));
          useApi.createTick(
            { ...tickChangeEvent, summary },
            (tick: TimerTick) =>
              dispatch(tickUpdated({ tick, tickChangeEvent }))
          );
        }); // TODO: .catch()
    } else {
      // Dispatch immediately if the summary already exists, to ensure snappy UI response
      dispatch(
        tickUpdated({
          tick: synthesizeTick(tickChangeEvent),
          tickChangeEvent,
        })
      );
      console.log('using api ', useApi);
      // dubious of second dispatch, but it's going to add the record ID, so leave it for now
      await useApi
        .createTick(tickChangeEvent, (tick: TimerTick) =>
          dispatch(tickUpdated({ tick, tickChangeEvent }))
        )
        .catch(() => {
          tickChangeEvent.distracted = tickChangeEvent.previously;
          dispatch(
            tickUpdated({
              tick: synthesizeTick(tickChangeEvent),
              tickChangeEvent,
            })
          );
        });
    }
  };
