import styles from './Timer.module.scss';
import React, { useState } from 'react';

export interface TaskRowSummaryProps {
  summaryText?: string;
  slot: number;
  handleSummaryChange: (summaryText: string | undefined) => void;
}

const TaskRowSummary = ({ summaryText, slot, handleSummaryChange }: TaskRowSummaryProps) => {
  const [text, setText] = useState<string | undefined>();

  return (
    <div className={styles.summary_cell}>
      <input
        className={styles.summary_input_container}
        type="text"
        value={text === undefined ? summaryText : text}
        onChange={(e) => [setText(e.target.value), handleSummaryChange(e.target.value)]}
        placeholder="enter a summary"
        data-test-id={`summary-text-${slot}`}
      />
    </div>
  );
};

export default TaskRowSummary;
