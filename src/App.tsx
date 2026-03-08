import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './App.css';

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
