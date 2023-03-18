import React, { useCallback } from "react";

import { Summary } from "../../../functions/summaries"
import styles from "./Timer.module.scss";
import debounce from "lodash.debounce";
import Tick from "./Tick.tsx";
import RestApi from "../../RestApi.ts";

export interface RowProps {
  summary?: Summary;
  slot: number;
  useDate: number;
  refreshSummary: () => void;
};

export type TimerTick = {
  ID: number;
  Date: number;
  UserID: number;
  TickNumber: number;
  Distracted: number;
  SummaryID: number;
};

const TaskRow = ({ summary, slot, useDate, refreshSummary }: RowProps) => {
  // TODO: error handle this
  const setSummary = useCallback((value: string, callback = (summary: Summary) => {}) => {
    RestApi.createSummary(useDate, value, slot,  callback)
  }, [slot, useDate]);

  const debouncedChangeHandler = useCallback(() => {
    return debounce(event => setSummary(event.target.value), 800)
  }, [setSummary]);

  const tickChangeCallback = useCallback((tickChangeEvent) => {
    if (tickChangeEvent.summary === undefined) {
      setSummary('', (summary) => RestApi.createTick(summary.ID, tickChangeEvent.tickNumber, refreshSummary));
    } else {
      RestApi.createTick(tickChangeEvent.summary.ID, tickChangeEvent.tickNumber, refreshSummary)
    }
  }, [refreshSummary, setSummary]);

  let ticks = new Array<JSX.Element>();

  for (let i = 0; i < 96; i++) {
    ticks.push((
      <div className={styles.tictac_cell} key={i}>
        <Tick
          summary={summary}
          timerTick={summary?.TimerTicks.find((value) => value.TickNumber === i) || {TickNumber: i, SummaryID: summary?.ID}}
          tickChangeCallback={tickChangeCallback}
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
