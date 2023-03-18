
import React, { useCallback, useEffect } from "react";
import { Summary } from "../../../functions/summaries"
import styles from "./Timer.module.scss";
import RestApi from "../../RestApi";
import PubSub from "pubsub-js";
import { TimerTick } from "./TaskRow";

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

  const style =
    distracted === 1 ? styles.tictac_distracted :
    distracted === 0 ? styles.tictac_focused :
    styles.tictac_empty;

  const distractedCallback = useCallback((tick: TimerTick) => setTick(tick), [setTick])

  useEffect(() => {
    const sub = PubSub.subscribe(`tick:${tickNumber}`, (_, message: PubSubTickMessage) => {
      if (message.summaryID === summary?.ID) {
        // This is my tick being updated by it's own click handler's side effects
        // If i'm to be marked distracted, let the others reply to this event by calling beingDistracted()
        // Removed ticks are fully deleted, so we produce an empty state here to replace the rendered component
        setTick(message.tick ? message.tick : {Distracted: -1, TickNumber: tickNumber, SummaryID: message.summaryID})
      } else {
        // Some other row was changed
        if (message.tick.Distracted === 0 && (timerTick?.Distracted === 0 || timerTick?.Distracted === 1)) {
          if (!message.fulfilled) {
            // I need to update myself to distracted now...
            RestApi.createTick({
              tickNumber, summary: summary, distracted: 1
            } as TickChangeEvent, newTimerTick => {
              setTick(newTimerTick);
            });
            // ... and dispatch to the initiator so they can update to "distracted" state
            message.fulfilled = true;
            message.beingDistracted();
          }
        }
      }
    });
    return () => PubSub.unsubscribe(sub)
  }, [summary, timerTick, summary?.ID, tickNumber, setTick, distracted, distractedCallback]);

  const updateTick = useCallback(() => {
    const createSummary = (value: string, summary: Summary, callback = (s: Summary) => {}) => {
      RestApi.createSummary(summary,  callback)
    };

    const createTick = (s: Summary) => {
      RestApi.createTick({
        tickNumber, summary: s, distracted: nextValue(distracted)
      } as TickChangeEvent, (newTimerTick: TimerTick) => {
        if (nextValue(distracted) !== -1)
          PubSub.publish(`tick:${tickNumber}`, {
            tick: newTimerTick,
            summaryID: s.ID,
            distracted: nextValue(distracted),
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
            timerTick.Distracted = nextValue(distracted);
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
      createSummary('', summary, (s) => [updateSummary(s), createTick(s)]);
    }
  }, [setTick, updateSummary, summary, tickNumber, timerTick, distracted]);

  return <div className={style} onClick={updateTick} />;
}

export default Tick;
