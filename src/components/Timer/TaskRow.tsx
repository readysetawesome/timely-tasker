import React, { useCallback } from "react";
import { Identity } from "../../../lib/Identity";
import { Summary } from "../../../functions/summaries"
import styles from "./Timer.module.scss";
import debounce from "lodash.debounce";

const isDevMode = process.env.NODE_ENV === "development";
const fetchPrefix = isDevMode ? "http://127.0.0.1:8788" : "";
const fetchOptions = (isDevMode ? { mode: "cors" } : {}) as RequestInit;

export interface RowProps {
  summary?: Summary;
  slot: number;
  useDate: number;
};

const TaskRow = ({ summary, slot, useDate }: RowProps) => {
  const setSummary = (value: string) => fetch(
    fetchPrefix + `/summaries?date=${useDate}&text=${encodeURIComponent(value)}&slot=${slot}`,
    { ...fetchOptions, method: 'POST' }
  ); // TODO: error handle this

  const debouncedChangeHandler = useCallback(
    debounce(event => {
      setSummary(event.target.value);
    }, 800)
  , [setSummary]);

  let ticks = new Array<JSX.Element>();

  for (let i = 0; i < 96; i++) {
    ticks.push(<div key={i} className={styles.tictacCell}><div className={styles.tictac}></div></div>)
  }
  return (
    <div className={styles.grid}>
      <>
        <div className={styles.summaryContent}>
          <input
            type="text"
            name={`summaryContent${summary?.ID || 'Slot' + slot}`}
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
