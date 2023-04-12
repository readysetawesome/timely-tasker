import React from 'react';
import styles from './Timer.module.scss';
import Tick from './Tick';
import { Summary } from '../../../functions/summaries';
import { StorageApiType } from '../../LocalStorageApi';

export interface TaskRowTicksProps {
  slot: number;
  useApi: StorageApiType;
}

export type TimerTick = {
  id?: number;
  userId?: number;
  tickNumber: number;
  distracted?: number;
  summaryId?: number;
  summary?: Summary;
};

const TaskRowTicks = ({ slot, useApi }: TaskRowTicksProps) => {
  const ticks = new Array<JSX.Element>();

  for (let tickNumber = 0; tickNumber < 96; tickNumber++) {
    ticks.push(
      <div className={styles.tictac_cell} key={tickNumber}>
        <Tick
          {...{
            slot,
            tickNumber,
            useApi,
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
