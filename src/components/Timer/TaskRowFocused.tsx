import React from 'react';
import { useSelector } from 'react-redux';
import { getFocusedHoursForSlot } from './Timer.selectors';
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

export default TaskRowFocused;
