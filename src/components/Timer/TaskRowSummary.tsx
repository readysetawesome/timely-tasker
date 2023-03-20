import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Summary } from "../../../functions/summaries"
import styles from "./Timer.module.scss";
import debounce from "lodash.debounce";
import RestApi from "../../RestApi";

export interface TaskRowSummaryProps {
  summary?: Summary;
  slot: number;
  useDate: number;
  setSummaryState: React.Dispatch<React.SetStateAction<Summary>>;
};

const TaskRowSummary = ({ summary, slot, useDate, setSummaryState }: TaskRowSummaryProps) => {
  const [inputText, setInputText] = useState('');

  // Parent state is in charge here.
  // Any change to the summary object needs to immediately affect input value
  useEffect(() => {
    if (summary) {
      setInputText(summary.Content);
    }
  }, [summary]);

  const setSummary = useCallback((
    value: string,
  ) => {
    const s = {
      Date: useDate,
      Content: value || "",
      Slot: slot,
      ID: summary.ID,
      TimerTicks: summary.TimerTicks
    } as Summary;
    setSummaryState(s);
    RestApi.createSummary(s, setSummaryState)
  }, [summary.ID, summary.TimerTicks, useDate, slot, setSummaryState]);

  // why useMemo? http://tiny.cc/9zd5vz
  const debouncedChangeHandler = useMemo(
    () => debounce(event => {
      setSummary(event.target.value);
    }
  , 800), [setSummary]);

  return (
    <div className={styles.summary_cell}>
      <input
        className={styles.summary_input_container}
        type="text"
        value={inputText}
        onChange={(e) => [setInputText(e.target.value), debouncedChangeHandler(e)]}
        placeholder="enter a summary"
      />
    </div>
  );
}

export default TaskRowSummary;
