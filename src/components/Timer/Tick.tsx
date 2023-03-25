import React, { useCallback, useEffect } from 'react';
import { Summary } from '../../../functions/summaries';
import styles from './Timer.module.scss';
import RestApi from '../../RestApi';
import PubSub from 'pubsub-js';
import { TimerTick } from './TaskRowTicks';

export type TickChangeEvent = {
  tickNumber: number;
  summary: Summary;
  distracted: number;
};

export interface TickProps {
  tickNumber: number;
  timerTick?: TimerTick;
  setTick: React.Dispatch<React.SetStateAction<TimerTick | undefined>>;
  summary: Summary;
  setSummaryState: React.Dispatch<React.SetStateAction<Summary>>;
}

const nextValue = (distracted) => {
  // rotate through the tictac states empty(-1/undef) => filled(0) => slash(1)
  return distracted === 1 ? -1 : distracted === 0 ? 1 : 0;
};

type PubSubTickMessage = {
  tick: TimerTick;
  summaryID: number;
  distracted: number;
  fulfilled: boolean;
  beingDistracted: () => void;
};

const Tick = ({ tickNumber, timerTick, setTick, summary }: TickProps) => {
  const distracted = timerTick?.Distracted;
  const nextTickValue = nextValue(distracted);

  const testIdAttr = `${summary.Slot}-${tickNumber}`;

  const style =
    distracted === 1 ? styles.tictac_distracted : distracted === 0 ? styles.tictac_focused : styles.tictac_empty;

  useEffect(() => {
    const sub = PubSub.subscribe(`tick:${tickNumber}`, (_, message: PubSubTickMessage) => {
      // only respond to pubsub from other summary rows within the same column
      if (message.summaryID !== summary?.ID) {
        // Some other row was changed
        if (message.tick.Distracted === 0 && (timerTick?.Distracted === 0 || timerTick?.Distracted === 1)) {
          if (!message.fulfilled) {
            // I need to update myself to distracted now...
            RestApi.createTick(
              {
                tickNumber,
                summary: summary,
                distracted: 1,
              } as TickChangeEvent,
              (newTimerTick) => {
                setTick(newTimerTick);
                // ... and dispatch to the initiator so they can update to "distracted" state
                message.beingDistracted();
              },
            );
            message.fulfilled = true;
          }
        } else if (message.tick.Distracted === -1) {
          // another tick was deleted from my column,
          // check for last tick standing in column and update to focused
          const anyOthers = document.querySelector(
            `
            :not([class*=Timer_tictac_empty])
            :not([data-test-id^="${summary.Slot}-"])
            [data-test-id$="-${tickNumber}"
          `.replace(/\s/g, ''),
          );
          if (timerTick?.Distracted === 1 && !anyOthers) {
            RestApi.createTick(
              {
                tickNumber,
                summary: summary,
                distracted: 0,
              } as TickChangeEvent,
              setTick,
            );
          }
        }
      }
    });
    return () => PubSub.unsubscribe(sub);
  }, [summary, timerTick, tickNumber, setTick]);

  const updateTick = useCallback(() => {
    // Do a visual update immediately for "fast" feeling UI
    const element = document.querySelector(`[data-test-id='${testIdAttr}']`);
    if (element) element.className = styles.tictac_clicked;

    const createTick = (s: Summary) => {
      RestApi.createTick(
        {
          tickNumber,
          summary: summary,
          distracted: nextTickValue,
        } as TickChangeEvent,
        (newTimerTick: TimerTick) => {
          if (nextTickValue !== -1) {
            setTick(newTimerTick);
            PubSub.publish(`tick:${tickNumber}`, {
              tick: newTimerTick,
              summaryID: s.ID,
              distracted: nextTickValue,
              fulfilled: false,
              beingDistracted: () => {
                // this callback is invoked to notify that user is distracted by engaging
                // with multiple tasks as once.
                // The receiver should only run it once! Then set fulfilled = true
                RestApi.createTick(
                  {
                    tickNumber,
                    summary: s,
                    distracted: 1,
                  } as TickChangeEvent,
                  (newTimerTick: TimerTick) => {
                    setTick(newTimerTick);
                  },
                );
              },
            });
          } else {
            // don't pub deletes, only change my visual state
            if (timerTick) {
              timerTick.Distracted = -1;
              setTick({ ...timerTick });
              PubSub.publish(`tick:${tickNumber}`, {
                tick: timerTick,
                summaryID: s.ID,
                distracted: -1,
              } as PubSubTickMessage);
            }
          }
        },
      );
    };

    if (summary.ID !== undefined) {
      createTick(summary);
    } else {
      // We need a summaryID to associate the ticks with,
      // thus we create an empty summary if not exists for this row
      RestApi.createSummary(summary, (s) => {
        createTick(s);
      });
    }
  }, [testIdAttr, summary, tickNumber, nextTickValue, setTick, timerTick]);

  return <div className={style} onClick={updateTick} data-test-id={testIdAttr} />;
};

export default Tick;
