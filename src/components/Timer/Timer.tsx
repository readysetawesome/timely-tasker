import React, { ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { todaysDateInt } from '../../App';
import { IdentityResponse } from '../../../lib/Identity';
import styles from './Timer.module.scss';
import TaskRowTicks from './TaskRowTicks';
import TaskRowSummary from './TaskRowSummary';
import TaskRowFocused, { TotalFocusedRow } from './TaskRowFocused';
import { DragProvider } from './DragContext';
import DatePicker from './DatePicker';
import DragHint from './DragHint';
import InstallHint from './InstallHint';
import WeekTotal from './WeekTotal';
import DailyGoal from './DailyGoal';
import RestApi, { getRestSelectorsFor, getPinnedTasks, setPinnedTask, removePinnedTask, updatePinnedTaskText, reorderPinnedTasks } from '../../RestApi';
import PinsPanel from './PinsPanel';
import LocalStorageApi from '../../LocalStorageApi';
import { useDispatch, useSelector } from 'react-redux';
import { getLoadingDate, getSummaries, getSessionExpired } from './Timer.selectors';
import { fetchSummaries, setSummary } from './Timer.actions';
import { summariesReordered } from './Timer.slice';
import { PinnedTask } from '../../../functions/pinnedTasks';

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
  todayNavClicker: ReactElement | null;
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
  const [displayName, setDisplayName] = useState<string | null>(null);
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

  // useMemo keyed on date so isToday only recomputes on navigation, not on every render.
  // This prevents cy.clock().restore() from invalidating the value mid-test.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const isToday = useMemo(() => date === todaysDateInt(), [date]);
  const isTomorrow = useMemo(() => date === todaysDateInt() + 86400000, [date]);

  const [useLocal, setUseLocal] = useState(localStorage.getItem(LOCAL_STORAGE));
  useEffect(() => {
    if (useLocal !== null && useLocal !== localStorage.getItem(LOCAL_STORAGE)) {
      localStorage.setItem(LOCAL_STORAGE, useLocal);
    }
  }, [useLocal]);

  // Connecting interstitial: show while greet is pending, minimum 600ms so it
  // doesn't flash invisibly for pre-authorized users.
  const connectingStartRef = useRef<number>(0);
  const [connectingVisible, setConnectingVisible] = useState(
    localStorage.getItem(LOCAL_STORAGE) === USELOCAL.NO
  );
  useEffect(() => {
    if (useLocal === USELOCAL.NO) {
      connectingStartRef.current = Date.now();
      setConnectingVisible(true);
    } else {
      setConnectingVisible(false);
    }
  }, [useLocal]);
  useEffect(() => {
    if (!displayName) return;
    const elapsed = Date.now() - connectingStartRef.current;
    const remaining = Math.max(0, 600 - elapsed);
    const timer = setTimeout(() => setConnectingVisible(false), remaining);
    return () => clearTimeout(timer);
  }, [displayName]);

  const useApi = useLocal === USELOCAL.YES ? LocalStorageApi : RestApi;

  const [pinnedTasks, setPinnedTasksState] = useState<PinnedTask[]>([]);
  const autoPopulatedPins = useRef<Set<string>>(new Set());

  // Fetch pinned tasks once authenticated (cloud only)
  useEffect(() => {
    if (useLocal !== USELOCAL.NO || !displayName) return;
    getPinnedTasks().then(setPinnedTasksState);
  }, [useLocal, displayName]);

  const handlePin = async (text: string) => {
    const newPin = await setPinnedTask(text);
    setPinnedTasksState((prev) => [...prev, newPin]);
  };

  const handleUnpin = async (id: number) => {
    await removePinnedTask(id);
    setPinnedTasksState((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdatePin = async (id: number, text: string) => {
    const updated = await updatePinnedTaskText(id, text);
    setPinnedTasksState((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };

  const handleReorderPins = async (orderedIds: number[]) => {
    // Optimistic update
    setPinnedTasksState((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      return orderedIds.map((id, position) => ({ ...byId.get(id)!, position }));
    });
    const updated = await reorderPinnedTasks(orderedIds);
    setPinnedTasksState(updated);
  };

  const [showPinsPanel, setShowPinsPanel] = useState(false);
  const pinsPanelWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showPinsPanel) return;
    const handler = (e: MouseEvent) => {
      if (pinsPanelWrapRef.current && !pinsPanelWrapRef.current.contains(e.target as Node)) {
        setShowPinsPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPinsPanel]);

  const handleLogout = () => {
    RestApi.logout().then((res) => {
      if (res.ok) {
        localStorage.removeItem(LOCAL_STORAGE);
        setUseLocal(null);
        setDisplayName(null);
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
          setDisplayName(res.identity.displayName);
          fetchSummaries(date)(dispatch, useApi);
        } else if (res.authorizeUrl) window.location.href = res.authorizeUrl;
      });
    } else if (useLocal === USELOCAL.YES) {
      fetchSummaries(date)(dispatch, useApi);
    }
  }, [date, dispatch, useApi, useLocal]);

  useEffect(() => {
    if (useLocal === null) return;
    if (useLocal === USELOCAL.NO && !displayName) return;

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
    displayName,
    useApi,
    useLocal,
  ]);

  const todaySummaries = useSelector(getSummaries);

  // Auto-populate pinned tasks on today/tomorrow (cloud only).
  // The ref guards against re-populating the same pin after the store updates.
  useEffect(() => {
    if (useLocal !== USELOCAL.NO) return;
    if (!isToday && !isTomorrow) return;
    if (!summariesSuccess || loadingDate !== date) return;
    if (pinnedTasks.length === 0) return;

    const existingTexts = new Set(
      Object.values(todaySummaries).map((s) => s.content?.trim()).filter(Boolean)
    );
    const pinsToAdd = pinnedTasks.filter((pt) => {
      const key = `${date}:${pt.id}`;
      return !existingTexts.has(pt.text.trim()) && !autoPopulatedPins.current.has(key);
    });
    if (pinsToAdd.length === 0) return;

    const occupied = new Set(Object.keys(todaySummaries).map(Number));
    let nextSlot = 0;
    for (const pt of pinsToAdd) {
      autoPopulatedPins.current.add(`${date}:${pt.id}`);
      while (occupied.has(nextSlot)) nextSlot++;
      setSummary({ slot: nextSlot, date, content: pt.text, TimerTicks: [] })(dispatch, useApi);
      occupied.add(nextSlot);
      nextSlot++;
    }
  }, [isToday, isTomorrow, summariesSuccess, loadingDate, date, todaySummaries, pinnedTasks, useLocal, dispatch, useApi]);

  const [copiedSummary, setCopiedSummary] = useState(false);
  const handleCopySummary = () => {
    const rows = Object.values(todaySummaries)
      .map(s => ({
        label: s.content,
        hrs: s.TimerTicks.filter(t => t.distracted === 0).length / 4,
      }))
      .filter(r => r.label && r.hrs > 0)
      .sort((a, b) => b.hrs - a.hrs);

    const totalHrs = Object.values(todaySummaries)
      .flatMap(s => s.TimerTicks)
      .filter(t => t.distracted === 0).length / 4;

    const text = [
      ...rows.map(r => `${r.label}: ${r.hrs}h focused`),
      `Total: ${totalHrs}h focused`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };
  const noFocusedTicks = Object.values(todaySummaries)
    .every(s => s.TimerTicks.filter(t => t.distracted === 0).length === 0);

  const ONE_DAY = 86400000;

  const [worksWeekends, setWorksWeekends] = useState(false);
  useEffect(() => {
    if (useLocal === null) return;
    if (useLocal === USELOCAL.NO && !displayName) return;
    useApi.getPreferences().then((prefs) => {
      if (prefs.worksWeekends != null) setWorksWeekends(prefs.worksWeekends);
    });
  }, [useApi, useLocal, displayName]);

  const isMonday = new Date(date).getUTCDay() === 1;
  const skipWeekend = !worksWeekends && isMonday;
  const prevWorkdayDate = skipWeekend ? date - 3 * ONE_DAY : date - ONE_DAY;
  const copyYesterdayLabel = skipWeekend ? 'fri.' : 'yest.';

  const [copyingYesterday, setCopyingYesterday] = useState(false);
  const handleCopyYesterday = async () => {
    setCopyingYesterday(true);
    const prevSummaries = await useApi.getSummaries(prevWorkdayDate);
    for (const ys of prevSummaries) {
      if (ys.content && !todaySummaries[ys.slot]?.content) {
        await setSummary({ slot: ys.slot, date, content: ys.content, TimerTicks: [] })(dispatch, useApi);
      }
    }
    setCopyingYesterday(false);
  };

  const MAX_ROWS = 28;
  const [rowCount, setRowCount] = useState(12);
  const addRow = () => setRowCount((n) => Math.min(n + 1, MAX_ROWS));

  useEffect(() => {
    const slots = Object.keys(todaySummaries).map(Number);
    if (slots.length === 0) {
      setRowCount(12);
    } else {
      const maxSlot = Math.max(...slots);
      setRowCount((prev) => Math.max(prev, maxSlot + 1));
    }
  }, [todaySummaries]);

  const handleMoveRow = async (slot: number, dir: -1 | 1) => {
    const sorted = Object.values(todaySummaries).sort((a, b) => a.slot - b.slot);
    const idx = sorted.findIndex(s => s.slot === slot);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const reordered = [...sorted];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

    // Optimistic: assign new slot values based on position in reordered list
    dispatch(summariesReordered(reordered.map((s, i) => ({ ...s, slot: i }))));

    const orderedIds = reordered.map(s => s.id!);
    const updated = await useApi.reorderSummaries(date, orderedIds);
    dispatch(summariesReordered(updated));
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const contentEl = document.querySelector('[data-test-id="timer-content"]') as HTMLElement;
      if (!contentEl) return;
      if (e.key === '[') contentEl.scrollLeft -= contentEl.clientWidth * 0.8;
      if (e.key === ']') contentEl.scrollLeft += contentEl.clientWidth * 0.8;
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const [showPicker, setShowPicker] = useState(false);
  const [scrolledDate, setScrolledDate] = useState<number | null>(null);
  useEffect(() => {
    if (!summariesSuccess || date === scrolledDate) return;
    if (loadingDate !== date) return;
    let tickNum: number;
    let center = false;
    if (isToday) {
      tickNum = Math.max(0, currentTime.getHours() * 4 - 4);
    } else {
      const allTickNums = Object.values(todaySummaries).flatMap((s) =>
        s.TimerTicks.filter((t) => t.distracted !== -1).map((t) => t.tickNumber)
      );
      if (allTickNums.length === 0) {
        tickNum = 32; // 8am default for blank past days
      } else {
        const first = Math.min(...allTickNums);
        const last = Math.max(...allTickNums);
        tickNum = Math.floor((first + last) / 2);
        center = true;
      }
    }
    const contentEl = document.querySelector('[data-test-id="timer-content"]') as HTMLElement;
    const targetTick = document.querySelector(`[data-test-id='0-${tickNum}']`) as HTMLElement;
    if (contentEl && targetTick) {
      const leftColEl = document.querySelector('[data-test-id="timer-left-column"]') as HTMLElement;
      const leftColWidth = leftColEl?.offsetWidth ?? 0;
      const tickRect = targetTick.getBoundingClientRect();
      const containerRect = contentEl.getBoundingClientRect();
      const visibleWidth = contentEl.clientWidth - leftColWidth;
      const offset = center ? visibleWidth / 2 : 0;
      contentEl.scrollLeft = contentEl.scrollLeft + tickRect.left - containerRect.left - leftColWidth - offset;
      setScrolledDate(date);
    }
  }, [currentTime, isToday, summariesSuccess, date, scrolledDate, todaySummaries, loadingDate]);

  const isCloudMode = useLocal === USELOCAL.NO;
  const summaryElements = new Array<JSX.Element>();
  const tickRowElements = new Array<JSX.Element>();
  const focusedRowElements = new Array<JSX.Element>();

  // Sorted list of slots that have content — used to determine move-button availability
  const sortedSummarySlots = useMemo(
    () => Object.values(todaySummaries).sort((a, b) => a.slot - b.slot).map(s => s.slot),
    [todaySummaries]
  );

  for (let slot = 0; slot < rowCount; slot++) {
    if (summariesSuccess && useLocal !== null) {
      const summaryIdx = sortedSummarySlots.indexOf(slot);
      const canReorder = (!isCloudMode || isToday) && summaryIdx !== -1;
      summaryElements.push(
        <TaskRowSummary
          key={slot}
          date={date}
          slot={slot}
          useApi={useApi}
          isLastRow={slot === rowCount - 1}
          onAddRow={addRow}
          pinnedTasks={isCloudMode ? pinnedTasks : undefined}
          isToday={isToday}
          isTomorrow={isTomorrow}
          onPin={isCloudMode ? handlePin : undefined}
          onUnpin={isCloudMode ? handleUnpin : undefined}
          onUpdatePin={isCloudMode && (isToday || isTomorrow) ? handleUpdatePin : undefined}
          onMoveUp={canReorder && summaryIdx > 0 ? () => handleMoveRow(slot, -1) : undefined}
          onMoveDown={canReorder && summaryIdx < sortedSummarySlots.length - 1 ? () => handleMoveRow(slot, 1) : undefined}
        />
      );
      tickRowElements.push(
        <TaskRowTicks key={slot} date={date} slot={slot} useApi={useApi} />
      );
      focusedRowElements.push(<TaskRowFocused key={slot} slot={slot} />);
    }
  }

  const GoogleIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" style={{flexShrink: 0}}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  const SignInWithGoogle = (
    <button
      onClick={() => setUseLocal(USELOCAL.NO)}
      data-test-id="use-cloud-storage"
      className="tt-topbar-btn"
    >
      {GoogleIcon}
      Sign in with Google
    </button>
  );

  const SignInWithGooglePrompt = (
    <button
      onClick={() => setUseLocal(USELOCAL.NO)}
      data-test-id="use-cloud-storage"
      className="tt-btn tt-btn-primary"
    >
      {GoogleIcon}
      Sign in with Google
    </button>
  );

  const UseLocalStoragePrompt = (
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
      {/* ── Topbar (GitHub link + auth actions) ── */}
      <header className="app-topbar">
        <div className="tt-topbar-actions">
          {useLocal === USELOCAL.YES && SignInWithGoogle}
          {useLocal === USELOCAL.NO && displayName && (
            <>
              <span className="tt-topbar-identity">{displayName}</span>
              <button
                onClick={handleLogout}
                data-test-id="logout-button"
                className="tt-topbar-btn tt-topbar-btn-danger"
              >
                Sign out
              </button>
            </>
          )}
        </div>
        {useLocal === USELOCAL.NO && (
          <Link
            to={`/month?date=${date}`}
            className="tt-topbar-btn"
            data-test-id="month-view-link"
          >
            Month
          </Link>
        )}
        <a
          href="https://github.com/readysetawesome/timely-tasker"
          className="app-topbar-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{display:'inline',marginRight:'5px',verticalAlign:'middle'}}>
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          timely-tasker
        </a>
      </header>

      {/* ── App header ── */}
      <div className="tt-header">
        <div className="tt-header-center">
          <div className="tt-date-cluster">
            <h2 className="tt-date-nav">
              {todayNavClicker}
              {leftNavClicker}
              <div className="tt-date-label-wrap">
                <button
                  className={`tt-date-label${todayNavClicker ? ' tt-date-label--offtoday' : ''}`}
                  onClick={() => setShowPicker(p => !p)}
                >
                  {dateDisplay(date)}
                </button>
                {showPicker && <DatePicker date={date} onClose={() => setShowPicker(false)} />}
              </div>
              {rightNavClicker}
              {useLocal !== null && (
                <button
                  onClick={handleCopySummary}
                  disabled={noFocusedTicks}
                  data-test-id="copy-summary-button"
                  className="nav-today nav-yesterday"
                >
                  {copiedSummary ? 'Copied!' : 'Copy summary'}
                </button>
              )}
            </h2>
          </div>
          {useLocal === USELOCAL.NO && (
            <WeekTotal useApi={useApi} date={date} />
          )}
          {useLocal !== null && (
            <DailyGoal useApi={useApi} />
          )}
          {useLocal !== null && (
            <label className="tt-work-weekends-toggle" data-test-id="work-weekends-toggle">
              <input
                type="checkbox"
                checked={worksWeekends}
                onChange={(e) => {
                  const val = e.target.checked;
                  setWorksWeekends(val);
                  useApi.setPreference('worksWeekends', val);
                }}
              />
              I work weekends
            </label>
          )}
          {useLocal !== null && (
            <div className="tt-tick-legend">
              <span className="tt-tick-legend-item">
                <span className="tt-tick-swatch tt-tick-swatch--focused" />
                focused
              </span>
              <span className="tt-tick-legend-item">
                <span className="tt-tick-swatch tt-tick-swatch--distracted" />
                distracted
              </span>
            </div>
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
            {UseLocalStoragePrompt}
            {SignInWithGooglePrompt}
          </div>
        </div>
      )}

      {/* ── Connecting interstitial (pre-authorized Google users) ── */}
      {connectingVisible && (
        <div className="tt-connecting">
          <div className="tt-connecting-card">
            <span className="tt-connecting-spinner" />
            <div className="tt-connecting-body">
              <p className="tt-connecting-title">Signing in with Google</p>
              <p className="tt-connecting-sub">Resuming your saved authorization…</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Main grid ── */}
      <InstallHint />
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
              <div className={styles.left_column} data-test-id="timer-left-column">
                <div key="headerspacer" className={styles.summary_header}>
                  <span>Task</span>
                  <div className={styles.summary_header_actions}>
                    {isCloudMode && (
                      <div className={styles.pins_panel_wrap} ref={pinsPanelWrapRef}>
                        <button
                          onClick={() => setShowPinsPanel((p) => !p)}
                          className={`${styles.copy_yesterday_btn}${showPinsPanel ? ` ${styles.copy_yesterday_btn_active}` : ''}`}
                          data-test-id="pins-panel-toggle"
                          title="Pinned tasks"
                        >
                          📌
                        </button>
                        {showPinsPanel && (
                          <PinsPanel
                            pins={pinnedTasks}
                            onReorder={handleReorderPins}
                            onDelete={handleUnpin}
                            onClose={() => setShowPinsPanel(false)}
                          />
                        )}
                      </div>
                    )}
                    {(!isCloudMode || isToday || isTomorrow) && (
                      <button
                        onClick={handleCopyYesterday}
                        disabled={copyingYesterday}
                        data-test-id="copy-yesterday-button"
                        className={styles.copy_yesterday_btn}
                        title="Copy yesterday's task names into empty slots"
                      >
                        {copyingYesterday ? '…' : `↓ ${copyYesterdayLabel}`}
                      </button>
                    )}
                  </div>
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
