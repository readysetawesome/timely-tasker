import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LocalStorageApi, { StorageApiType } from '../../LocalStorageApi';
import RestApi from '../../RestApi';
import { Summary } from '../../../functions/summaries';
import styles from './MonthView.module.scss';

const ONE_DAY = 86400000;
const LOCAL_STORAGE_KEY = 'TimelyTasker:UseLocalStorage';

// Same encoding as todaysDateInt: Date.UTC of local year/month/date.
const localDateUTC = (year: number, month: number, day: number) =>
  Date.UTC(year, month, day);

const todaysDateInt = () => {
  const now = new Date();
  return localDateUTC(now.getFullYear(), now.getMonth(), now.getDate());
};

const getMonthStart = (fromDate: number) => {
  const d = new Date(fromDate);
  return localDateUTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
};

const getMonthEnd = (fromDate: number) => {
  const d = new Date(fromDate);
  return localDateUTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0);
};

const prevMonth = (fromDate: number) => {
  const d = new Date(fromDate);
  return localDateUTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1);
};

const nextMonth = (fromDate: number) => {
  const d = new Date(fromDate);
  return localDateUTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
};

const monthLabel = (fromDate: number) =>
  new Date(fromDate).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

const dayLabel = (fromDate: number) =>
  new Date(fromDate).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

// Compute per-hour tick state: 24 entries, each 'focused' | 'distracted' | 'empty'
const hourStates = (summaries: Summary[]): ('focused' | 'distracted' | 'empty')[] => {
  const hours = Array(24).fill('empty') as ('focused' | 'distracted' | 'empty')[];
  summaries.forEach((s) =>
    s.TimerTicks?.forEach((t) => {
      const h = Math.floor(t.tickNumber / 4);
      if (t.distracted === 0) hours[h] = 'focused';
      else if (t.distracted === 1 && hours[h] !== 'focused') hours[h] = 'distracted';
    })
  );
  return hours;
};

const focusedHours = (summaries: Summary[]) =>
  summaries.reduce(
    (sum, s) => sum + (s.TimerTicks?.filter((t) => t.distracted === 0).length ?? 0),
    0
  ) / 4;

const taskNames = (summaries: Summary[]) =>
  summaries
    .map((s) => s.content)
    .filter(Boolean)
    .slice(0, 4);

interface DayData {
  date: number;
  summaries: Summary[];
}

interface MonthViewProps {
  useApi?: StorageApiType;
}

const MonthView = ({ useApi: propApi }: MonthViewProps) => {
  const [searchParams] = useSearchParams();
  const paramDate = parseInt(searchParams.get('date') ?? todaysDateInt().toString());
  const monthStart = getMonthStart(paramDate);
  const monthEnd = getMonthEnd(paramDate);

  const useLocal = localStorage.getItem(LOCAL_STORAGE_KEY);
  const useApi = propApi ?? (useLocal === 'yes' ? LocalStorageApi : RestApi);

  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    setLoading(true);
    setSessionExpired(false);

    const allDays: number[] = [];
    for (let d = monthStart; d <= monthEnd; d += ONE_DAY) allDays.push(d);

    useApi
      .getSummariesRange(monthStart, monthEnd)
      .then((summaries) => {
        const byDate = new Map<number, Summary[]>();
        summaries.forEach((s) => {
          const bucket = byDate.get(s.date) ?? [];
          bucket.push(s);
          byDate.set(s.date, bucket);
        });
        setDays(allDays.map((d) => ({ date: d, summaries: byDate.get(d) ?? [] })));
        setLoading(false);
      })
      .catch((err) => {
        if ((err as Error)?.message === 'session_expired') setSessionExpired(true);
        setLoading(false);
      });
  }, [monthStart, monthEnd, useApi]);

  const today = todaysDateInt();

  return (
    <div className={styles.page}>
      <header className="app-topbar">
        <Link
          to={`/timer?date=${today}`}
          className="tt-topbar-btn"
          data-test-id="month-back-to-today"
        >
          ← Today
        </Link>
        <a
          href="https://github.com/readysetawesome/timely-tasker"
          className="app-topbar-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          timely-tasker
        </a>
      </header>

      <div className={styles.nav}>
        <Link
          to={`/month?date=${prevMonth(monthStart)}`}
          className={styles.navBtn}
          data-test-id="month-prev"
        >
          ‹
        </Link>
        <h2 className={styles.title} data-test-id="month-title">
          {monthLabel(monthStart)}
        </h2>
        <Link
          to={`/month?date=${nextMonth(monthStart)}`}
          className={styles.navBtn}
          data-test-id="month-next"
        >
          ›
        </Link>
      </div>

      {sessionExpired && (
        <p className={styles.error} data-test-id="month-session-error">
          Session expired.{' '}
          <Link to={`/timer?date=${today}`}>Sign in again</Link>
        </p>
      )}

      {loading ? (
        <p className={styles.loading} data-test-id="month-loading">
          Loading…
        </p>
      ) : (
        <div className={styles.table} data-test-id="month-table">
          <div className={styles.headerRow}>
            <span>Date</span>
            <span className={styles.vizCol}>Hours</span>
            <span className={styles.hoursCol}>Focused</span>
            <span className={styles.tasksCol}>Tasks</span>
          </div>
          {days.map(({ date, summaries }) => {
            const fh = focusedHours(summaries);
            const names = taskNames(summaries);
            const hs = hourStates(summaries);
            const isEmpty = summaries.length === 0;
            const isToday = date === today;
            return (
              <Link
                key={date}
                to={`/timer?date=${date}`}
                className={`${styles.row} ${isEmpty ? styles.rowEmpty : ''} ${isToday ? styles.rowToday : ''}`}
                data-test-id={`month-day-${date}`}
              >
                <span className={styles.dateCol}>{dayLabel(date)}</span>
                <span className={styles.vizCol} aria-hidden>
                  {hs.map((state, i) => (
                    <span key={i} className={styles[`dot_${state}`]} />
                  ))}
                </span>
                <span className={styles.hoursCol}>
                  {fh > 0 ? `${fh} hrs` : '—'}
                </span>
                <span className={styles.tasksCol}>
                  {names.length > 0 ? names.join(', ') : ''}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MonthView;
