import React, { ReactElement, useEffect, useState, useMemo, useCallback } from 'react';
import { Identity } from '../../../lib/Identity';
import { Summary } from '../../../functions/summaries';
import styles from './Timer.module.scss';
import TaskRowTicks from './TaskRowTicks';
import TaskRowSummary from './TaskRowSummary';
import RestApi, { getRestSelectorFor } from '../../RestApi';
import debounce from 'lodash/debounce';
import { useDispatch, useSelector } from 'react-redux';
import { getLoadingDate, getSummaries } from './Timer.selectors';
import { fetchSummaries } from './Timer.actions';

export const dateDisplay = (date) => {
  date = new Date(date);
  return `${date.getUTCMonth() + 1}-${date.getUTCDate()}-${date.getUTCFullYear()}`;
};

const Header = () => {
  const items = new Array<JSX.Element>();
  for (let i = 0; i < 24; i++) {
    const suffix = i >= 12 ? 'pm' : 'am';
    items.push(
      <div key={i} className={styles.tictac_header}>
        {((i + 11) % 12) + 1}
        {suffix}
      </div>,
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

const Timer = ({ date, currentTime, leftNavClicker, rightNavClicker }: TimerProps) => {
  const [identity, setIdentity] = useState({} as Identity);
  const [greeting, setGreeting] = useState('');
  //const [, setSummaries] = useState<Array<Summary> | undefined>(undefined);
  const summaries = useSelector(getSummaries);
  const summariesLoading = useSelector(getRestSelectorFor('timer', 'loadingSummaries').inProgress)
  const summariesSuccess = useSelector(getRestSelectorFor('timer', 'loadingSummaries').success);
  const summariesError = useSelector(getRestSelectorFor('timer', 'loadingSummaries').error);
  const loadingDate = useSelector(getLoadingDate);
  const dispatch = useDispatch();

  useEffect(() => {
    RestApi.greet((identity) => setIdentity(identity));
  }, []);

  // Once we have identity, set greeting and get summaries+ticks
  useEffect(() => {
    if (identity.ID !== undefined) {
      setGreeting(`
        Hello, ${identity.DisplayName === '' ? 'my friend' : identity.DisplayName}!
        You are logged in with ${identity.ProviderName}.
      `);
    }
  }, [identity]);

  useEffect(() => {
    if (!identity) return;
    if (loadingDate !== date && !summariesLoading && !summariesError) {
      fetchSummaries(date)(dispatch);
      return;
    }
  }, [identity, date, summariesLoading, loadingDate, summariesError, dispatch]);

  // Once the summaries have loaded, scroll horiz to bring current hour into view
  const [didScroll, setDidScroll] = useState(false);
  useEffect(() => {
    if (summaries && !didScroll) {
      const targetTickNumber = currentTime.getHours() * 4 - 4;
      const targetTick = document.querySelector(`[data-test-id='0-${targetTickNumber >= 0 ? targetTickNumber : 0}']`);
      if (targetTick) {
        targetTick.scrollIntoView({ block: 'nearest', inline: 'start' });
      }
      setDidScroll(true);
    }
  }, [currentTime, summaries, didScroll]);

  const summaryElements = new Array<JSX.Element>();
  const tickRowElements = new Array<JSX.Element>();

  for (let i = 0; i < 12; i++) {
    const foundSummary = () =>
      summaries[i] ||
      ({ TimerTicks: [], Slot: i, Date: date, Content: '', ID: undefined, UserID: undefined } as Summary);

    const setSummaryState = useCallback(
      (/*s: Summary*/) => {
        // setSummaries([{ ...s }, ...(summaries?.filter((_s) => _s.Slot !== i) || [])]);
      },
      [/*summaries, i*/],
    );

    const handleSummaryChange = useMemo(
      () =>
        debounce((text: string | undefined) => {
          if (text !== undefined && foundSummary().Content !== text) {
            RestApi.createSummary({ ...foundSummary(), Content: text } as Summary, (/*s: Summary*/) => {
              //setSummaryState(s);
            });
          }
        }, 800),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [setSummaryState, summaries],
    );

    if (summaries !== undefined) {
      summaryElements.push(
        <TaskRowSummary
          summaryText={foundSummary().Content}
          handleSummaryChange={handleSummaryChange}
          slot={i}
          key={i}
        />,
      );

      tickRowElements.push(
        <TaskRowTicks
          summaries={Object.values(summaries)}
          setSummaryState={setSummaryState}
          key={i}
          useDate={date}
          slot={i}
          summary={foundSummary()}
        />,
      );
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
        </div>
      </div>
    </>
  );
};

export default Timer;
