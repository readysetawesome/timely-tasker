import React from 'react';
import styles from './Timer.module.scss';
import Tick from './Tick';
import { Summary } from '../../../functions/summaries';

export interface TaskRowTicksProps {
  slot: number;
}

export type TimerTick = {
  ID?: number;
  UserID?: number;
  TickNumber: number;
  Distracted?: number;
  SummaryID?: number;
  summary?: Summary;
};

const TaskRowTicks = ({ slot }: TaskRowTicksProps) => {
  const ticks = new Array<JSX.Element>();

  for (let tickNumber = 0; tickNumber < 96; tickNumber++) {
    ticks.push(
      <div className={styles.tictac_cell} key={tickNumber}>
        <Tick
          {...{
            slot,
            tickNumber,
          }}
        />
      </div>
    );
  }
  return (
    <div className={styles.grid_ticks}>
      <>{ticks}</>
    </div>
  );
};

export default TaskRowTicks;
