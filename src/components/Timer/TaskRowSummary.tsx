import styles from './Timer.module.scss';
import React from 'react';

export interface TaskRowSummaryProps {
  summaryText?: string;
  slot: number;
  setSummaryText: React.Dispatch<React.SetStateAction<string>>;
}

const TaskRowSummary = ({ summaryText, slot, setSummaryText }: TaskRowSummaryProps) => (
  <div className={styles.summary_cell}>
    <input
      className={styles.summary_input_container}
      type="text"
      value={summaryText}
      onChange={(e) => setSummaryText(e.target.value)}
      placeholder="enter a summary"
      data-test-id={`summary-text-${slot}`}
    />
  </div>
);

export default TaskRowSummary;
