import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './App.css';

import Timer from './components/Timer/Timer';

const ONE_DAY_MILLIS = 86400000;

export const todaysDateInt = (now?: Date) => {
  if (!now) now = new Date();
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

function App() {
  const [searchParams] = useSearchParams();
  const date = parseInt(searchParams.get('date') || '') || todaysDateInt();

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

  return (
    <div className="App">
      <header>
        <a href="https://github.com/readysetawesome/timely-tasker">
          Timely Tasker Github Project
        </a>
      </header>
      <Timer
        {...{ date, currentTime: new Date(), leftNavClicker, rightNavClicker }}
      />
    </div>
  );
}

export default App;
