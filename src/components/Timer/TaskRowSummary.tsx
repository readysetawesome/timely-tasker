import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Summary } from "../../../functions/summaries"
import styles from "./Timer.module.scss";
import debounce from "lodash.debounce";
import RestApi from "../../RestApi";

export interface TaskRowSummaryProps {
  summary?: Summary;
  slot: number;
  useDate: number;
};

const TaskRowSummary = ({ summary, slot, useDate }: TaskRowSummaryProps) => {
  const [inputText, setInputText] = useState('')

  useEffect(() => {
    if (summary) {
      setInputText(summary.Content);
    }
  }, [summary]);

  const setSummary = useCallback((value: string, callback = (summary: Summary) => {}) => {
    RestApi.createSummary({Date: useDate, Content: value || "", Slot: slot} as Summary,  callback)
  }, [slot, useDate]);

  // why useMemo? http://tiny.cc/9zd5vz
  const debouncedChangeHandler = useMemo(
    () => debounce(event => setSummary(event.target.value), 800)
  , [setSummary]);

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
