import React, { useState } from 'react';
import './App.css';

import Timer from './components/Timer/Timer';

const ONE_DAY_MILLIS = 86400000;

export const todaysDateInt = (now?: Date) => {
  if (!now) now = new Date();
  const myZeroHour = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  return myZeroHour;
};

function App() {
  const [date, setDate] = useState(todaysDateInt());
  const leftNavClicker = (
    <span data-test-id="left-nav-clicker" style={{ cursor: 'pointer' }} onClick={() => setDate(date - ONE_DAY_MILLIS)}>
      &lt;&lt;&nbsp;&nbsp;&nbsp;
    </span>
  );

  const rightNavClicker = (
    <span data-test-id="right-nav-clicker" style={{ cursor: 'pointer' }} onClick={() => setDate(date + ONE_DAY_MILLIS)}>
      &nbsp;&nbsp;&nbsp;&gt;&gt;
    </span>
  );

  return (
    <div className="App">
      <header>
        <a href="https://github.com/readysetawesome/timely-tasker">Timely Tasker Github Project</a>
      </header>
      <Timer {...{ date, currentTime: new Date(), leftNavClicker, rightNavClicker }} />
    </div>
  );
}

export default App;
