import React, { useCallback, useMemo, useState } from "react";

import { Summary } from "../../../functions/summaries"
import styles from "./Timer.module.scss";
import debounce from "lodash.debounce";
import Tick from "./Tick";
import RestApi from "../../RestApi";

export interface RowProps {
  summary?: Summary;
  slot: number;
  useDate: number;
};

export type TimerTick = {
  ID?: number;
  UserID?: number;
  TickNumber: number;
  Distracted?: number;
  SummaryID?: number;
};

const TaskRow = ({ summary, slot, useDate }: RowProps) => {
  // TODO: error handle this
  const setSummary = useCallback((value: string, callback = (summary: Summary) => {}) => {
    RestApi.createSummary({Date: useDate, Content: value, Slot: slot} as Summary,  callback)
  }, [slot, useDate]);

  // why useMemo? http://tiny.cc/9zd5vz
  const debouncedChangeHandler = useMemo(
    () => debounce(event => setSummary(event.target.value), 800)
  , [setSummary]);

  let ticks = new Array<JSX.Element>();

  for (let i = 0; i < 96; i++) {
    const timerTick: TimerTick =
      summary?.TimerTicks.find((value: TimerTick) => value.TickNumber === i)
      || { TickNumber: i, SummaryID: summary?.ID } as TimerTick

    // This linter disable is a very special case:
    // Its only OK because the loop runs a fixed number of times
    // 96 ticks, one for each 15 minute chunk of the day. never changes.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [tick, setTick] = useState<TimerTick>();

    ticks.push((
      <div className={styles.tictac_cell} key={i}>
        <Tick
          { ...{
            summary: summary || {Date: useDate, Content: '', Slot: slot} as Summary,
            tickNumber: i,
            timerTick: tick || timerTick,
            setTick,
          } }
        />
      </div>
    ));
  }
  return (
    <div className={styles.grid}>
      <>
        <div className={styles.summaryContent}>
          <input
            type="text"
            defaultValue={summary?.Content}
            onChange={debouncedChangeHandler}
            placeholder="enter a summary"
          />
        </div>
        {ticks}
      </>
    </div>
  );
}

export default TaskRow;
