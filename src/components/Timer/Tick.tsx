import React, { useCallback } from 'react';

import styles from './Timer.module.scss';

import { TimerTick } from './TaskRowTicks';
import { useDispatch, useSelector } from 'react-redux';
import { getLoadingDate, getSummary } from './Timer.selectors';
import { tickClicked } from './Timer.actions';
import { TickChangeEvent } from './Timer.slice';
import { Summary } from '../../../functions/summaries';

export interface TickProps {
  tickNumber: number;
  slot: number;
}

const nextValue = (distracted) => {
  // rotate through the tictac states empty(-1/undef) => filled(0) => slash(1)
  return distracted === 1 ? -1 : distracted === 0 ? 1 : 0;
};

const Tick = ({ tickNumber, slot }: TickProps) => {
  const summary = useSelector((state) => getSummary(state, slot));
  const date = useSelector(getLoadingDate);
  const dispatch = useDispatch();
  const timerTick =
    summary?.TimerTicks.find((value: TimerTick) => value.TickNumber === tickNumber) ||
    ({ TickNumber: tickNumber, SummaryID: summary?.ID } as TimerTick);

  const distracted = timerTick?.Distracted;
  const nextTickValue = nextValue(distracted);
  const testIdAttr = `${slot}-${tickNumber}`;

  const style =
    distracted === 1 ? styles.tictac_distracted : distracted === 0 ? styles.tictac_focused : styles.tictac_empty;

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
      distracted: nextTickValue,
    } as TickChangeEvent)(dispatch);
  }, [testIdAttr, summary, date, slot, tickNumber, nextTickValue, dispatch]);

  return <div className={style} onClick={updateTick} data-test-id={testIdAttr} />;
};

export default Tick;
