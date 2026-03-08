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
      style={{ cursor: 'pointer' }}
      to={`/timer?date=${date - ONE_DAY_MILLIS}`}
    >
      &lt;&lt;&nbsp;&nbsp;&nbsp;
    </Link>
  );

  const rightNavClicker = (
    <Link
      data-test-id="right-nav-clicker"
      style={{ cursor: 'pointer' }}
      to={`/timer?date=${date + ONE_DAY_MILLIS}`}
    >
      &nbsp;&nbsp;&nbsp;&gt;&gt;
    </Link>
  );

  const todayNavClicker = (
    <Link
      data-test-id="today-nav-clicker"
      style={{ cursor: 'pointer' }}
      to={`/timer?date=${todaysDateInt()}`}
    >
      &nbsp;&nbsp;&nbsp;Today
    </Link>
  );

  return (
    <div className="App">
      <header>
        <a href="https://github.com/readysetawesome/timely-tasker">
          Timely Tasker Github Project
        </a>
      </header>
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
