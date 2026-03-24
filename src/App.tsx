import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Timer from './components/Timer/Timer';

const ONE_DAY_MILLIS = 86400000;
const IDLE_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours

export const todaysDateInt = () => {
  const now = new Date();
  const myZeroHour = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0
  );
  return myZeroHour;
};

export interface AppProps {
  useDate?: number;
}

function App({ useDate = todaysDateInt() }: AppProps) {
  const [searchParams] = useSearchParams();
  const date = parseInt(searchParams.get('date') ?? useDate.toString());
  const navigate = useNavigate();

  // Refs persist across effect re-runs so we don't lose the hidden timestamp
  // when the date changes (which re-runs the effect and would reset local vars).
  const hiddenAtRef = useRef<number | null>(null);
  const hiddenTodayRef = useRef<number | null>(null);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        hiddenTodayRef.current = todaysDateInt();
      } else if (document.visibilityState === 'visible' && hiddenAtRef.current !== null) {
        const elapsed = Date.now() - hiddenAtRef.current;
        const nowToday = todaysDateInt();
        const dayRolled = nowToday !== hiddenTodayRef.current;
        hiddenAtRef.current = null;
        hiddenTodayRef.current = null;
        if ((dayRolled || elapsed >= IDLE_THRESHOLD_MS) && date !== nowToday) {
          navigate(`/timer?date=${nowToday}`);
        }
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [date, navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') navigate(`/timer?date=${date - ONE_DAY_MILLIS}`);
      if (e.key === 'ArrowRight') navigate(`/timer?date=${date + ONE_DAY_MILLIS}`);
      if (e.key === 't') navigate(`/timer?date=${todaysDateInt()}`);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [date, navigate]);

  return (
    <div className="App">
      <Timer
        date={date}
        currentTime={new Date()}
      />
    </div>
  );
}

export default App;
