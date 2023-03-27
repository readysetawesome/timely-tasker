import React, { useCallback, useEffect } from 'react';

import styles from './Timer.module.scss';

import { TimerTick } from './TaskRowTicks';
import { useDispatch, useSelector } from 'react-redux';
import { getLoadingDate, getMatchingTicks, getSummary } from './Timer.selectors';
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
    ({ TickNumber: tickNumber, SummaryID: summary?.ID, Distracted: -1 } as TimerTick);

  const matchingColumnTicks = useSelector((state) => getMatchingTicks(state, tickNumber)).filter(
    (t) => t.summary?.Slot !== slot,
  );

  const distracted = timerTick?.Distracted;
  const nextTickValue = nextValue(distracted);
  const testIdAttr = `${slot}-${tickNumber}`;

  useEffect(() => {
    if (distracted !== -1) {
      // evaluate distracted column rule
      matchingColumnTicks.forEach((t) => {
        if ((distracted === 0 || distracted === 1) && t.Distracted === 0) {
          // I have a non empty state and this tick was 'focused', mark it distracted
          tickClicked({
            summary: t.summary,
            slot: t.summary?.Slot,
            tickNumber,
            distracted: 1,
          } as TickChangeEvent)(dispatch);
        }
      });
    }
  }, [dispatch, distracted, matchingColumnTicks, slot, tickNumber]);

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
      distracted: nextTickValue === -1 ? -1 : matchingColumnTicks.length > 0 ? 1 : nextTickValue,
    } as TickChangeEvent)(dispatch);

    // evaluate last tick standing rule and apply
    if (nextTickValue === -1 && matchingColumnTicks.length === 1 && matchingColumnTicks[0].Distracted === 1) {
      tickClicked({
        summary: matchingColumnTicks[0].summary,
        slot: matchingColumnTicks[0].summary?.Slot,
        tickNumber,
        distracted: 0,
      } as TickChangeEvent)(dispatch);
    }
  }, [date, dispatch, matchingColumnTicks, nextTickValue, slot, summary, testIdAttr, tickNumber]);

  return <div className={style} onClick={updateTick} data-test-id={testIdAttr} />;
};

export default Tick;
