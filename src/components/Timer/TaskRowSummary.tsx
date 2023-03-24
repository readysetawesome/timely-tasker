import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Summary } from '../../../functions/summaries';
import styles from './Timer.module.scss';
import debounce from 'lodash.debounce';
import RestApi from '../../RestApi';

export interface TaskRowSummaryProps {
  summary?: Summary;
  slot: number;
  useDate: number;
  setSummaryState: React.Dispatch<React.SetStateAction<Summary>>;
}

const TaskRowSummary = ({ summary, slot, useDate, setSummaryState }: TaskRowSummaryProps) => {
  const [inputText, setInputText] = useState('');

  /*
    We keep track of a pending debounce, to defeat the following race condition:
      * User types text, stops typing
      * debounce begins -800ms remaining
      * debounce completed - http dispatched (awaiting response)
      * user types additional text, stops typing
      * http response updates inbound `summary` prop, thus re-render previous text on line 32
  */
  const [pendingDebounce, setPendingDebounce] = useState(false);

  // Parent state is in charge here. Unelss there's a debounce pending.
  // Any change to the summary object needs to immediately affect input value
  useEffect(() => {
    if (summary) {
      setInputText(summary.Content);
    }
  }, [summary]);

  const setSummary = useCallback(
    (value: string) => {
      const s = {
        Date: useDate,
        Content: value || '',
        Slot: slot,
        ID: summary?.ID,
        TimerTicks: summary?.TimerTicks,
      } as Summary;

      RestApi.createSummary(s, (s) => {
        if (!pendingDebounce) {
          setSummaryState(s);
        }
      });
    },
    [useDate, slot, summary?.ID, summary?.TimerTicks, pendingDebounce, setSummaryState],
  );

  // why useMemo? http://tiny.cc/9zd5vz
  const debouncedChangeHandler = useMemo(() => {
    setPendingDebounce(true);
    return debounce((event) => {
      setPendingDebounce(false);
      setSummary(event.target.value);
    }, 800);
  }, [setSummary]);

  return (
    <div className={styles.summary_cell}>
      <input
        className={styles.summary_input_container}
        type="text"
        value={inputText}
        onChange={(e) => [debouncedChangeHandler(e), setInputText(e.target.value)]}
        placeholder="enter a summary"
        data-test-id={`summary-text-${slot}`}
      />
    </div>
  );
};

export default TaskRowSummary;
