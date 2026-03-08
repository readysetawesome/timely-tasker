import React from 'react';
import { useSelector } from 'react-redux';
import { getFocusedHoursForSlot, getTotalFocusedHours } from './Timer.selectors';
import styles from './Timer.module.scss';

export interface TaskRowFocusedProps {
  slot: number;
}

const formatHours = (hours: number) => `${hours} hrs`;

const TaskRowFocused = ({ slot }: TaskRowFocusedProps) => {
  const focusedHours = useSelector((state) => getFocusedHoursForSlot(state, slot));
  return (
    <div className={styles.focused_cell} data-test-id={`focused-hours-${slot}`}>
      {formatHours(focusedHours)}
    </div>
  );
};

export const TotalFocusedRow = () => {
  const total = useSelector(getTotalFocusedHours);
  return (
    <div className={styles.focused_total} data-test-id="focused-hours-total">
      {formatHours(total)}
    </div>
  );
};

export default TaskRowFocused;
