import React, { useCallback } from "react";

import { Summary } from "../../../functions/summaries"
import styles from "./Timer.module.scss";
import Tick from "./Tick";

export interface TaskRowTicksProps {
  summary?: Summary;
  slot: number;
  useDate: number;
  updateSummary: React.Dispatch<React.SetStateAction<Summary>>;
};

export type TimerTick = {
  ID?: number;
  UserID?: number;
  TickNumber: number;
  Distracted?: number;
  SummaryID?: number;
};

const TaskRowTicks = ({ summary, updateSummary, slot, useDate }: TaskRowTicksProps) => {
  let ticks = new Array<JSX.Element>();

  for (let i = 0; i < 96; i++) {
    const timerTick: TimerTick =
      summary?.TimerTicks?.find((value: TimerTick) => value.TickNumber === i)
      || { TickNumber: i, SummaryID: summary?.ID } as TimerTick

    // This linter disable is a very special case:
    // Its only OK because the loop runs a fixed number of times
    // 96 ticks, one for each 15 minute chunk of the day. never changes.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const setTick = useCallback((tick: TimerTick) => {
      const ammendedlist =
        summary ? summary.TimerTicks.filter((t: TimerTick) => t.TickNumber !== tick.TickNumber ) : [];

      summary.TimerTicks = [ ...ammendedlist, tick];
      updateSummary(summary);
    }, [summary, updateSummary]);

    ticks.push((
      <div className={styles.tictac_cell} key={i}>
        <Tick
          { ...{
            summary: summary || {Date: useDate, Content: '', Slot: slot} as Summary,
            tickNumber: i,
            timerTick: timerTick,
            setTick,
            updateSummary,
          } }
        />
      </div>
    ));
  }
  return (
    <div className={styles.grid_ticks}>
      <>
        {ticks}
      </>
    </div>
  );
}

export default TaskRowTicks;
