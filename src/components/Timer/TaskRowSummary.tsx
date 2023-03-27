import styles from './Timer.module.scss';
import React, { useMemo, useState } from 'react';
import debounce from 'lodash/debounce';
import { useDispatch, useSelector } from 'react-redux';
import { getSummary } from './Timer.selectors';
import { Summary } from '../../../functions/summaries';
import { setSummary } from './Timer.actions';

export interface TaskRowSummaryProps {
  slot: number;
  date: number;
}

const TaskRowSummary = ({ slot, date }: TaskRowSummaryProps) => {
  const [text, setText] = useState<string | undefined>();
  const summary = useSelector((state) => getSummary(state, slot));
  const dispatch = useDispatch();

  const handleSummaryChange = useMemo(() => {
    return debounce((text: string | undefined) => {
      if (text !== undefined && summary?.Content !== text) {
        setSummary({
          TimerTicks: summary?.TimerTicks || [],
          Slot: slot,
          Date: date,
          Content: text,
          ID: summary?.ID,
        } as Summary)(dispatch);
      }
    }, 800);
  }, [date, dispatch, slot, summary]);

  return (
    <div className={styles.summary_cell}>
      <input
        className={styles.summary_input_container}
        type="text"
        value={text === undefined ? summary?.Content : text}
        onChange={(e) => [setText(e.target.value), handleSummaryChange(e.target.value)]}
        placeholder="enter a summary"
        data-test-id={`summary-text-${slot}`}
      />
    </div>
  );
};

export default TaskRowSummary;
