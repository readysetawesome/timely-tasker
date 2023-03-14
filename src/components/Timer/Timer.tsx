import React, { FC, useEffect, useState } from 'react';
import styles from './Timer.module.scss';

interface TimerProps {}

const Timer: FC<TimerProps> = () => {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    // TODO for local dev mode prefix with http://127.0.0.1:8788
    fetch('/greet', {mode:'cors'})
        .then(async  response => {
          const foo = await response.text();
          setGreeting(foo);
        });
  });

  return (
    <div className={styles.Timer}>
      Timer Component
      <p>{greeting || 'loading...'}</p>
      <table>
        <thead>
          <tr>
            <th className="left">TASKS</th>
            <th className="right">START TIME</th>
            <th>Column 1</th>
            <th>Column 2</th>
            <th>Column 3</th>
            <th>Column 4</th>

          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={2}>_________________</td>
            <td>Content 1</td>
            <td>Content 2</td>
            <td>Content 3</td>
            <td>Content 4</td>
          </tr>
        </tbody>
      </table>

    </div>
  )
};

export default Timer;
