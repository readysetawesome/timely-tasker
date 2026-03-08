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

  const todayNavClicker = (
    <Link
      data-test-id="today-nav-clicker"
      className="nav-today"
      to={`/timer?date=${todaysDateInt()}`}
    >
      Today
    </Link>
  );

  return (
    <div className="App">
      <header className="app-topbar">
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
