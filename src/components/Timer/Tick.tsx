import React, { useCallback, useEffect, useState } from "react";
import { Summary } from "../../../functions/summaries"
import styles from "./Timer.module.scss";
import RestApi from "../../RestApi";
import PubSub from "pubsub-js";
import { TimerTick } from "./TaskRowTicks";

export type TickChangeEvent = {
  tickNumber: number;
  summary: Summary;
  distracted: number;
}

export interface TickProps {
  tickNumber: number;
  timerTick?: TimerTick;
  setTick: React.Dispatch<React.SetStateAction<TimerTick | undefined>>;
  summary: Summary;
  updateSummary: React.Dispatch<React.SetStateAction<Summary>>;
};

const nextValue = (distracted) => {
  // rotate through the ticktac states empty => filled => slash (distracted)
  return (
    distracted === 1 ? -1 :
    distracted === 0 ? 1 :
    0
  );
}

type PubSubTickMessage = {
  tick: TimerTick,
  summaryID: number,
  distracted: number,
  fulfilled: boolean,
  beingDistracted: () => void,
}

const Tick = ({ tickNumber, timerTick, setTick, summary, updateSummary }: TickProps) => {
  const distracted = timerTick?.Distracted;
  const nextTickValue = nextValue(distracted);

  const testIdAttr = `${summary.Slot}-${tickNumber}`;

  const style =
    distracted === 1 ? styles.tictac_distracted :
    distracted === 0 ? styles.tictac_focused :
    styles.tictac_empty;

  useEffect(() => {
    const sub = PubSub.subscribe(`tick:${tickNumber}`, (_, message: PubSubTickMessage) => {
      if (message.summaryID === summary?.ID) {
        // This is my tick being updated by it's own click handler's side effects
        // If i'm to be marked distracted, let the others reply to this event by calling beingDistracted()
        // Removed ticks are fully deleted, so we produce an empty state here to replace the rendered component
        const tick = message.tick ? {...message.tick} : {Distracted: -1, TickNumber: tickNumber, SummaryID: message.summaryID};
        setTick(tick);
      } else {
        // Some other row was changed
        if (message.tick.Distracted === 0 && (timerTick?.Distracted === 0 || timerTick?.Distracted === 1)) {
          if (!message.fulfilled) {
            // I need to update myself to distracted now...
            RestApi.createTick({
              tickNumber, summary: summary, distracted: 1
            } as TickChangeEvent, newTimerTick => {
              setTick(newTimerTick);
              message.beingDistracted();
            });
            // ... and dispatch to the initiator so they can update to "distracted" state
            message.fulfilled = true;
          }
        }
      }
    });
    return () => PubSub.unsubscribe(sub)
  }, [summary, timerTick, tickNumber, setTick]);

  const updateTick = useCallback((e) => {
    // Do a visual update immediately for "fast" feeling UI
    document.querySelector(`[data-test-id='${testIdAttr}']`).className = styles.tictac_clicked;

    const createSummary = (summary: Summary, callback = (s: Summary) => {}) => {
      console.log("create a new summary", summary)
      RestApi.createSummary(summary,  callback)
    };

    const createTick = (s: Summary) => {
      RestApi.createTick({
        tickNumber, summary: s, distracted: nextTickValue
      } as TickChangeEvent, (newTimerTick: TimerTick) => {
        if (nextTickValue !== -1)
          PubSub.publish(`tick:${tickNumber}`, {
            tick: newTimerTick,
            summaryID: s.ID,
            distracted: nextTickValue,
            fulfilled: false,
            beingDistracted: () => {
              // this callback is invoked to notify that user is distracted by engaging
              // with multiple tasks as once.
              // The receiver should only run it once! Then set fulfilled = true
              RestApi.createTick({
                tickNumber, summary: s, distracted: 1
              } as TickChangeEvent, (newTimerTick: TimerTick) => {
                setTick(newTimerTick);
              });
            }
          });
        else {
          // don't pub deletes, only change my visual state
          if (timerTick) {
            timerTick.Distracted = -1;
            setTick({ ...timerTick });
          }
        }
      });
    }

    if (summary?.ID !== undefined) {
      createTick(summary);
    } else {
      // We need a summaryID to associate the ticks with,
      // thus we create an empty summary if not exists for this row
      createSummary(summary, (s) => [updateSummary(s), createTick(s)]);
    }
  }, [testIdAttr, summary, tickNumber, nextTickValue, setTick, timerTick, updateSummary]);

  return <div className={style} onClick={updateTick} data-test-id={testIdAttr}/>;
}

export default Tick;
