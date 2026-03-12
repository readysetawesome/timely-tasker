import React, { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import Timer from './components/Timer/Timer';

const ONE_DAY_MILLIS = 86400000;

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

  const leftNavClicker = (
    <Link
      data-test-id="left-nav-clicker"
      className="nav-arrow"
      to={`/timer?date=${date - ONE_DAY_MILLIS}`}
    >
      ‹
    </Link>
  );

  const rightNavClicker = (
    <Link
      data-test-id="right-nav-clicker"
      className="nav-arrow"
      to={`/timer?date=${date + ONE_DAY_MILLIS}`}
    >
      ›
    </Link>
  );

  const todayNavClicker = date !== todaysDateInt() ? (
    <Link
      data-test-id="today-nav-clicker"
      className="nav-today"
      to={`/timer?date=${todaysDateInt()}`}
    >
      Today
    </Link>
  ) : null;

  return (
    <div className="App">
      <Timer
        {...{
          date,
          currentTime: new Date(),
          leftNavClicker,
          rightNavClicker,
          todayNavClicker,
        }}
      />
    </div>
  );
}

export default App;
