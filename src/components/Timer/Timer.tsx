import React, { ReactElement, useEffect, useState } from 'react';
import { IdentityResponse } from '../../../lib/Identity';
import styles from './Timer.module.scss';
import TaskRowTicks from './TaskRowTicks';
import TaskRowSummary from './TaskRowSummary';
import RestApi, { getRestSelectorsFor } from '../../RestApi';
import LocalStorageApi from '../../LocalStorageApi';
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

const LOCAL_STORAGE = 'TimelyTasker:UseLocalStorage';
const USELOCAL = {
  YES: 'yes',
  NO: 'no',
};

const Timer = ({
  date,
  currentTime,
  leftNavClicker,
  rightNavClicker,
}: TimerProps) => {
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

  const [useLocal, setUseLocal] = useState(localStorage.getItem(LOCAL_STORAGE));
  useEffect(() => {
    if (useLocal !== null && useLocal !== localStorage.getItem(LOCAL_STORAGE)) {
      localStorage.setItem(LOCAL_STORAGE, useLocal);
    }
  }, [useLocal]);

  const useApi = useLocal === USELOCAL.YES ? LocalStorageApi : RestApi;

  useEffect(() => {
    if (useLocal === USELOCAL.NO) {
      RestApi.greet((res: IdentityResponse) => {
        if (res.identity) {
          setGreeting(`
            Hello, ${res.identity.displayName}!
            Logged in with ${res.identity.providerName},
            using cloud-based storage from our domain.
          `);
          fetchSummaries(date)(dispatch, useApi);
        } else if (res.authorizeUrl) window.location.href = res.authorizeUrl;
      });
    } else if (useLocal === USELOCAL.YES) {
      setGreeting('Hello! Currently using Local Storage');
      fetchSummaries(date)(dispatch, useApi);
    }
  }, [date, dispatch, useApi, useLocal]);

  useEffect(() => {
    // Fetch summaries after checking requirements, starting with storage selection
    if (useLocal === null) return;

    // Don't do anything until a greeting is set, it means identity exists in db
    if (useLocal === USELOCAL.NO && greeting === '') return;

    if (loadingDate !== date && !summariesLoading && !summariesError) {
      fetchSummaries(date)(dispatch, useApi);
      return;
    }
  }, [
    date,
    summariesLoading,
    loadingDate,
    summariesError,
    dispatch,
    greeting,
    useApi,
    useLocal,
  ]);

  // Once the summaries have loaded, scroll horiz to bring current hour into view
  const [didScroll, setDidScroll] = useState(false);
  useEffect(() => {
    if (summariesSuccess && !didScroll) {
      const targettickNumber = currentTime.getHours() * 4 - 4;
      const targetTick = document.querySelector(
        `[data-test-id='0-${targettickNumber >= 0 ? targettickNumber : 0}']`
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
      summaryElements.push(
        <TaskRowSummary {...{ date, slot, key: slot, useApi }} />
      );
      tickRowElements.push(
        <TaskRowTicks {...{ date, slot, key: slot, useApi }} />
      );
    }
  }

  const UseCloudStorage = (
    <button
      onClick={() => setUseLocal(USELOCAL.NO)}
      data-test-id="use-cloud-storage"
    >
      <strong>Use cloudflare d1 (reqiures login)</strong>
    </button>
  );

  const UseLocalStorage = (
    <button
      onClick={() => setUseLocal(USELOCAL.YES)}
      title="public computer users: by clicking you agree that you understand the risks"
      data-test-id="use-local-storage"
    >
      <strong>Use browser localStorage</strong>
    </button>
  );

  return (
    <>
      <div>
        <h1>The Timely Tasker</h1>
        <h2>
          {leftNavClicker}
          <a href={`?date=${date}`}>Work Date: {dateDisplay(date)}</a>
          {rightNavClicker}
        </h2>
        <p data-test-id="greeting">{greeting || ''}</p>
        <p>
          {useLocal === USELOCAL.YES ? UseCloudStorage : ''}
          {useLocal === USELOCAL.NO ? UseLocalStorage : ''}
        </p>
      </div>
      <div className={styles.Timer}>
        <div className={styles.content}>
          {summaryError && (
            <span className={styles.error}>Error setting Summary text</span>
          )}
          {useLocal !== null ? (
            <></>
          ) : (
            <>
              <h4>
                This app stores a small amount of data including your task
                summary text and tick marks by date/time/task. Choose a Storage
                option below.
              </h4>
              <p>We share nothing! We don't make money or have partnerships.</p>
              <p>
                <strong>Public computer users:</strong> by choosing localStorage
                you agree that you understand the risks.
              </p>
              <p>{UseLocalStorage}</p>
              <p>{UseCloudStorage}</p>
            </>
          )}
          {summariesError && (
            <span className={styles.error}>
              Error loading Summary text and ticks!
            </span>
          )}
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
