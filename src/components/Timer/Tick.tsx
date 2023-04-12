import React, { useCallback } from 'react';

import styles from './Timer.module.scss';

import { TimerTick } from './TaskRowTicks';
import { useDispatch, useSelector } from 'react-redux';
import {
  getLoadingDate,
  getMatchingTicks,
  getSummary,
} from './Timer.selectors';
import { tickClicked } from './Timer.actions';
import { TickChangeEvent } from './Timer.slice';
import { Summary } from '../../../functions/summaries';
import { StorageApiType } from '../../LocalStorageApi';

export enum TickState {
  Focused = 0,
  distracted = 1,
  Deleted = -1,
}

export interface TickProps {
  tickNumber: number;
  slot: number;
  useApi: StorageApiType;
}

const nextValue = (distracted: number | undefined) => {
  // rotate through the tictac states empty(-1/undef) => filled(0) => slash(1)
  return distracted === TickState.distracted
    ? TickState.Deleted
    : distracted === TickState.Focused
    ? TickState.distracted
    : TickState.Focused;
};

const Tick = ({ tickNumber, slot, useApi }: TickProps) => {
  const summary = useSelector((state) => getSummary(state, slot));

  const date = useSelector(getLoadingDate);
  const dispatch = useDispatch();
  const timerTick =
    summary?.TimerTicks.find(
      (value: TimerTick) => value.tickNumber === tickNumber
    ) ||
    ({
      tickNumber: tickNumber,
      summaryId: summary?.id,
      distracted: TickState.Deleted,
    } as TimerTick);

  const matchingColumnTicks = useSelector((state) =>
    getMatchingTicks(state, tickNumber)
  ).filter((t) => t.summary?.slot !== slot);

  const distracted = timerTick?.distracted;
  const nextTickValue = nextValue(distracted);
  const testIdAttr = `${slot}-${tickNumber}`;

  const style =
    distracted === TickState.distracted
      ? styles.tictac_distracted
      : distracted === TickState.Focused
      ? styles.tictac_focused
      : styles.tictac_empty;

  const updateTick = useCallback(() => {
    tickClicked({
      summary:
        summary || ({ date, slot, content: '', TimerTicks: [] } as Summary),
      slot,
      tickNumber,
      distracted:
        nextTickValue === TickState.Deleted
          ? TickState.Deleted
          : matchingColumnTicks.length > 0
          ? TickState.distracted
          : nextTickValue,
      previously: distracted,
    } as TickChangeEvent)(dispatch, useApi);

    // evaluate last tick standing rule and apply
    if (nextTickValue === TickState.Deleted) {
      if (
        matchingColumnTicks.length === 1 &&
        matchingColumnTicks[0].distracted === TickState.distracted
      ) {
        tickClicked({
          ...matchingColumnTicks[0],
          slot: matchingColumnTicks[0].summary?.slot,
          distracted: TickState.Focused,
          previously: matchingColumnTicks[0].distracted,
        } as TickChangeEvent)(dispatch, useApi);
      }
    } else {
      // evaluate distracted column rule
      matchingColumnTicks.forEach((t) => {
        if (t.distracted === TickState.Focused) {
          // some other tick in this column, mark it distracted
          tickClicked({
            summary: t.summary,
            slot: t.summary?.slot,
            tickNumber,
            distracted: TickState.distracted,
            previously: t.distracted,
          } as TickChangeEvent)(dispatch, useApi);
        }
      });
    }

    // Do a visual update immediately for "fast" feeling UI
    const element = document.querySelector(`[data-test-id='${testIdAttr}']`);
    if (element) element.className += ` ${styles.tictac_clicked}`;
  }, [
    date,
    dispatch,
    distracted,
    matchingColumnTicks,
    nextTickValue,
    slot,
    summary,
    testIdAttr,
    tickNumber,
    useApi,
  ]);

  return (
    <div className={style} onClick={updateTick} data-test-id={testIdAttr} />
  );
};

export default Tick;
