import React, { ReactElement, useEffect, useState } from 'react';
import { IdentityResponse } from '../../../lib/Identity';
import styles from './Timer.module.scss';
import TaskRowTicks from './TaskRowTicks';
import TaskRowSummary from './TaskRowSummary';
import TaskRowFocused, { TotalFocusedRow } from './TaskRowFocused';
import { DragProvider } from './DragContext';
import DragHint from './DragHint';
import RestApi, { getRestSelectorsFor } from '../../RestApi';
import LocalStorageApi from '../../LocalStorageApi';
import { useDispatch, useSelector } from 'react-redux';
import { getLoadingDate, getSummaries, getSessionExpired } from './Timer.selectors';
import { fetchSummaries, setSummary } from './Timer.actions';

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
  todayNavClicker: ReactElement;
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
  todayNavClicker,
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
  const isSessionExpired = useSelector(getSessionExpired);
  const dispatch = useDispatch();

  const [useLocal, setUseLocal] = useState(localStorage.getItem(LOCAL_STORAGE));
  useEffect(() => {
    if (useLocal !== null && useLocal !== localStorage.getItem(LOCAL_STORAGE)) {
      localStorage.setItem(LOCAL_STORAGE, useLocal);
    }
  }, [useLocal]);

  const useApi = useLocal === USELOCAL.YES ? LocalStorageApi : RestApi;

  const handleLogout = () => {
    RestApi.logout().then((res) => {
      if (res.ok) {
        localStorage.removeItem(LOCAL_STORAGE);
        setUseLocal(null);
        setGreeting('');
      }
    });
  };

  const handleRelogin = () => {
    RestApi.greet((res: IdentityResponse) => {
      if (res.authorizeUrl) window.location.href = res.authorizeUrl;
    });
  };

  useEffect(() => {
    if (useLocal === USELOCAL.NO) {
      RestApi.greet((res: IdentityResponse) => {
        if (res.identity) {
          setGreeting(`Hello, ${res.identity.displayName}! Logged in with ${res.identity.providerName}, using cloud-based storage.`);
          fetchSummaries(date)(dispatch, useApi);
        } else if (res.authorizeUrl) window.location.href = res.authorizeUrl;
      });
    } else if (useLocal === USELOCAL.YES) {
      setGreeting('Hello! Currently using Local Storage');
      fetchSummaries(date)(dispatch, useApi);
    }
  }, [date, dispatch, useApi, useLocal]);

  useEffect(() => {
    if (useLocal === null) return;
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

  const todaySummaries = useSelector(getSummaries);

  const [copyingYesterday, setCopyingYesterday] = useState(false);
  const handleCopyYesterday = async () => {
    setCopyingYesterday(true);
    const ONE_DAY = 86400000;
    const yesterdaySummaries = await useApi.getSummaries(date - ONE_DAY);
    for (const ys of yesterdaySummaries) {
      if (ys.content && !todaySummaries[ys.slot]?.content) {
        await setSummary({ slot: ys.slot, date, content: ys.content, TimerTicks: [] })(dispatch, useApi);
      }
    }
    setCopyingYesterday(false);
  };

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
  const focusedRowElements = new Array<JSX.Element>();

  for (let slot = 0; slot < 12; slot++) {
    if (summariesSuccess && useLocal !== null) {
      summaryElements.push(
        <TaskRowSummary {...{ date, slot, key: slot, useApi }} />
      );
      tickRowElements.push(
        <TaskRowTicks {...{ date, slot, key: slot, useApi }} />
      );
      focusedRowElements.push(<TaskRowFocused {...{ slot, key: slot }} />);
    }
  }

  const UseCloudStorage = (
    <button
      onClick={() => setUseLocal(USELOCAL.NO)}
      data-test-id="use-cloud-storage"
      className="tt-btn tt-btn-primary"
    >
      Use cloud database
    </button>
  );

  const UseLocalStorage = (
    <button
      onClick={() => setUseLocal(USELOCAL.YES)}
      title="public computer users: by clicking you agree that you understand the risks"
      data-test-id="use-local-storage"
      className="tt-btn tt-btn-ghost"
    >
      Use browser localStorage
    </button>
  );

  return (
    <div className="tt-page">
      {/* ── App header ── */}
      <div className="tt-header">
        <h1 className="tt-title">Timely Tasker</h1>

        <h2 className="tt-date-nav">
          {leftNavClicker}
          <a href={`?date=${date}`} className="tt-date-label">
            {dateDisplay(date)}
          </a>
          {rightNavClicker}
          {todayNavClicker}
        </h2>

        {greeting && (
          <p className="tt-greeting" data-test-id="greeting">
            {greeting}
          </p>
        )}
        {!greeting && <p data-test-id="greeting" style={{display:'none'}} />}

        <div className="tt-actions">
          {useLocal === USELOCAL.YES && UseCloudStorage}
          {useLocal === USELOCAL.NO && UseLocalStorage}
          {useLocal !== null && (
            <button
              onClick={handleCopyYesterday}
              disabled={copyingYesterday}
              data-test-id="copy-yesterday-button"
              className="tt-btn tt-btn-ghost"
            >
              {copyingYesterday ? 'Copying…' : 'Copy yesterday'}
            </button>
          )}
          {(useLocal === USELOCAL.NO && greeting || useLocal === USELOCAL.YES) && (
            <button
              onClick={handleLogout}
              data-test-id="logout-button"
              className="tt-btn tt-btn-danger"
            >
              Log out
            </button>
          )}
        </div>
      </div>

      {/* ── Storage selection (first visit) ── */}
      {useLocal === null && (
        <div className="tt-storage-prompt">
          <p className="tt-storage-prompt-heading">Choose where to store your data</p>
          <p className="tt-storage-prompt-sub">We share nothing. No partnerships, no monetization.</p>
          <p className="tt-storage-prompt-sub">
            <strong>Public computer?</strong> localStorage data stays in this browser.
          </p>
          <div className="tt-storage-actions">
            {UseLocalStorage}
            {UseCloudStorage}
          </div>
        </div>
      )}

      {/* ── Main grid ── */}
      <DragProvider>
      <DragHint />
      <div className={styles.Timer}>
        <div className={styles.content} data-test-id="timer-content">
          {summaryError && (
            <span className={styles.error} data-test-id="timer-error">Error setting summary text</span>
          )}
          {isSessionExpired && (
            <span className={styles.error} data-test-id="session-expired-error">
              Session expired.{' '}
              <button onClick={handleRelogin} className="tt-btn tt-btn-primary" data-test-id="relogin-button">
                Re-login
              </button>
            </span>
          )}
          {summariesError && !isSessionExpired && (
            <span className={styles.error} data-test-id="timer-error">
              Error loading summaries and ticks!
            </span>
          )}
          {!summariesError && useLocal !== null && (
            <>
              <div className={styles.left_column}>
                <div key="headerspacer" className={styles.summary_header}>
                  Task
                </div>
                {summaryElements}
              </div>
              <div className={styles.right_column}>
                <Header />
                {tickRowElements}
              </div>
              <div className={styles.focused_column}>
                <div className={styles.focused_header} data-test-id="focused-header">
                  Focused
                </div>
                {focusedRowElements}
                <TotalFocusedRow />
              </div>
            </>
          )}
        </div>
      </div>
      </DragProvider>
    </div>
  );
};

export default Timer;
