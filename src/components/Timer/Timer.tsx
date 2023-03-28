import React, { ReactElement, useEffect, useState } from 'react';
import { AppIdentity } from '../../../lib/Identity';
import styles from './Timer.module.scss';
import TaskRowTicks from './TaskRowTicks';
import TaskRowSummary from './TaskRowSummary';
import RestApi, { getRestSelectorsFor } from '../../RestApi';
import { useDispatch, useSelector } from 'react-redux';
import { getLoadingDate } from './Timer.selectors';
import { fetchSummaries } from './Timer.actions';

export const dateDisplay = (date) => {
  date = new Date(date);
  return `${
    date.getUTCMonth() + 1
  }-${date.getUTCDate()}-${date.getUTCFullYear()}`;
};

const Header = () => {
  const items = new Array<JSX.Element>();
  for (let i = 0; i < 24; i++) {
    const suffix = i >= 12 ? 'pm' : 'am';
    items.push(
      <div key={i} className={styles.tictac_header}>
        {((i + 11) % 12) + 1}
        {suffix}
      </div>
    );
  }
  return <div className={styles.tictac_header_row}>{items}</div>;
};

export interface TimerProps {
  date: number;
  currentTime: Date;
  leftNavClicker: ReactElement;
  rightNavClicker: ReactElement;
}

const Timer = ({
  date,
  currentTime,
  leftNavClicker,
  rightNavClicker,
}: TimerProps) => {
  const [identity, setIdentity] = useState({} as AppIdentity);
  const [greeting, setGreeting] = useState('');
  const summariesRestSelectors = getRestSelectorsFor(
    'timer',
    'summariesLoading'
  );
  const summariesLoading = useSelector(summariesRestSelectors.inProgress);
  const summariesSuccess = useSelector(summariesRestSelectors.success);
  const summariesError = useSelector(summariesRestSelectors.error);
  const summaryError = useSelector(
    getRestSelectorsFor('timer', 'summaryCreated').error
  );
  const loadingDate = useSelector(getLoadingDate);
  const dispatch = useDispatch();

  useEffect(() => {
    RestApi.greet((identity) => setIdentity(identity));
  }, []);

  // Once we have identity, set greeting and get summaries+ticks
  useEffect(() => {
    if (identity.ID !== undefined) {
      setGreeting(`
        Hello, ${
          identity.DisplayName === '' ? 'my friend' : identity.DisplayName
        }!
        You are logged in with ${identity.ProviderName}.
      `);
    }
  }, [identity]);

  useEffect(() => {
    // Don't do anything until a greeting is set, it means identity exists in db
    if (!identity || greeting === '') return;
    if (loadingDate !== date && !summariesLoading && !summariesError) {
      fetchSummaries(date)(dispatch);
      return;
    }
  }, [
    identity,
    date,
    summariesLoading,
    loadingDate,
    summariesError,
    dispatch,
    greeting,
  ]);

  // Once the summaries have loaded, scroll horiz to bring current hour into view
  const [didScroll, setDidScroll] = useState(false);
  useEffect(() => {
    if (summariesSuccess && !didScroll) {
      const targetTickNumber = currentTime.getHours() * 4 - 4;
      const targetTick = document.querySelector(
        `[data-test-id='0-${targetTickNumber >= 0 ? targetTickNumber : 0}']`
      );
      if (targetTick) {
        targetTick.scrollIntoView({ block: 'nearest', inline: 'start' });
      }
      setDidScroll(true);
    }
  }, [currentTime, summariesSuccess, didScroll]);

  const summaryElements = new Array<JSX.Element>();
  const tickRowElements = new Array<JSX.Element>();

  for (let slot = 0; slot < 12; slot++) {
    if (summariesSuccess) {
      summaryElements.push(<TaskRowSummary {...{ date, slot, key: slot }} />);
      tickRowElements.push(<TaskRowTicks {...{ date, slot, key: slot }} />);
    }
  }

  return (
    <>
      <div>
        <h1>The Timely Tasker</h1>
        <h2>
          {leftNavClicker}
          Work Date: {dateDisplay(date)}
          {rightNavClicker}
        </h2>
        <p data-test-id="greeting">{greeting || 'loading...'}</p>
      </div>
      <div className={styles.Timer}>
        <div className={styles.content}>
          {summaryError && (
            <span className={styles.error}>Error setting Summary text</span>
          )}

          {summariesError && 'Error loading Summary text and ticks!'}
          {!summariesError && (
            <>
              <div className={styles.left_column}>
                <div key={'headerspacer'} className={styles.summary_header}>
                  Task Summary
                </div>
                {summaryElements}
              </div>
              <div className={styles.right_column}>
                <Header />
                {tickRowElements}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Timer;
