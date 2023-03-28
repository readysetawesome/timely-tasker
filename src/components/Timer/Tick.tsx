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

export enum TickState {
  Focused = 0,
  Distracted = 1,
  Deleted = -1,
}

export interface TickProps {
  tickNumber: number;
  slot: number;
}

const nextValue = (distracted: number | undefined) => {
  // rotate through the tictac states empty(-1/undef) => filled(0) => slash(1)
  return distracted === TickState.Distracted
    ? TickState.Deleted
    : distracted === TickState.Focused
    ? TickState.Distracted
    : TickState.Focused;
};

const Tick = ({ tickNumber, slot }: TickProps) => {
  const summary = useSelector((state) => getSummary(state, slot));

  const date = useSelector(getLoadingDate);
  const dispatch = useDispatch();
  const timerTick =
    summary?.TimerTicks.find(
      (value: TimerTick) => value.TickNumber === tickNumber
    ) ||
    ({
      TickNumber: tickNumber,
      SummaryID: summary?.ID,
      Distracted: TickState.Deleted,
    } as TimerTick);

  const matchingColumnTicks = useSelector((state) =>
    getMatchingTicks(state, tickNumber)
  ).filter((t) => t.summary?.Slot !== slot);

  const distracted = timerTick?.Distracted;
  const nextTickValue = nextValue(distracted);
  const testIdAttr = `${slot}-${tickNumber}`;

  const style =
    distracted === TickState.Distracted
      ? styles.tictac_distracted
      : distracted === TickState.Focused
      ? styles.tictac_focused
      : styles.tictac_empty;

  const updateTick = useCallback(() => {
    // Do a visual update immediately for "fast" feeling UI
    const element = document.querySelector(`[data-test-id='${testIdAttr}']`);
    if (element) element.className = styles.tictac_clicked;

    tickClicked({
      summary:
        summary ||
        ({
          Date: date,
          Slot: slot,
          Content: '',
        } as Summary),
      slot,
      tickNumber,
      distracted:
        nextTickValue === TickState.Deleted
          ? TickState.Deleted
          : matchingColumnTicks.length > 0
          ? TickState.Distracted
          : nextTickValue,
      previously: distracted,
    } as TickChangeEvent)(dispatch);

    // evaluate last tick standing rule and apply
    if (nextTickValue === TickState.Deleted) {
      if (
        matchingColumnTicks.length === 1 &&
        matchingColumnTicks[0].Distracted === TickState.Distracted
      ) {
        tickClicked({
          summary: matchingColumnTicks[0].summary,
          slot: matchingColumnTicks[0].summary?.Slot,
          tickNumber,
          distracted: TickState.Focused,
          previously: matchingColumnTicks[0].Distracted,
        } as TickChangeEvent)(dispatch);
      }
    } else {
      // evaluate distracted column rule
      matchingColumnTicks.forEach((t) => {
        if (t.Distracted === TickState.Focused) {
          // some other tick in this column, mark it distracted
          tickClicked({
            summary: t.summary,
            slot: t.summary?.Slot,
            tickNumber,
            distracted: TickState.Distracted,
            previously: t.Distracted,
          } as TickChangeEvent)(dispatch);
        }
      });
    }
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
  ]);

  return (
    <div className={style} onClick={updateTick} data-test-id={testIdAttr} />
  );
};

export default Tick;
