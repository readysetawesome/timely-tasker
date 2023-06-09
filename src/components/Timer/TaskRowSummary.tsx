import styles from './Timer.module.scss';
import React, { useMemo, useState } from 'react';
import debounce from 'lodash/debounce';
import { useDispatch, useSelector } from 'react-redux';
import { getSummary } from './Timer.selectors';
import { Summary } from '../../../functions/summaries';
import { setSummary } from './Timer.actions';
import { StorageApiType } from '../../LocalStorageApi';

export interface TaskRowSummaryProps {
  slot: number;
  date: number;
  useApi: StorageApiType;
}

const TaskRowSummary = ({ slot, date, useApi }: TaskRowSummaryProps) => {
  const [text, setText] = useState<string | undefined>();
  const summary = useSelector((state) => getSummary(state, slot));
  const dispatch = useDispatch();

  const handleSummaryChange = useMemo(() => {
    return debounce((text: string | undefined) => {
      if (text !== undefined && summary?.content !== text) {
        setSummary({
          TimerTicks: summary?.TimerTicks || [],
          slot,
          date,
          content: text,
          id: summary?.id,
        } as Summary)(dispatch, useApi);
      }
    }, 800);
  }, [date, dispatch, slot, summary, useApi]);

  return (
    <div className={styles.summary_cell}>
      <input
        className={styles.summary_input_container}
        type="text"
        value={text === undefined ? summary?.content || '' : text}
        onChange={(e) => [
          setText(e.target.value),
          handleSummaryChange(e.target.value),
        ]}
        placeholder="enter a summary"
        data-test-id={`summary-text-${slot}`}
      />
    </div>
  );
};

export default TaskRowSummary;
