import React, { ReactElement, useEffect, useState, useMemo, useCallback } from 'react';
import { Identity } from '../../../lib/Identity';
import { Summary } from '../../../functions/summaries';
import styles from './Timer.module.scss';
import TaskRowTicks from './TaskRowTicks';
import TaskRowSummary from './TaskRowSummary';
import RestApi from '../../RestApi';
import debounce from 'lodash/debounce';

export const dateDisplay = (date) => {
  date = new Date(date);
  return `${date.getUTCMonth() + 1}-${date.getUTCDate()}-${date.getUTCFullYear()}`;
};

const Header = () => {
  const items = new Array<JSX.Element>();
  for (let i = 0; i < 24; i++) {
    const suffix = i >= 12 ? 'pm' : 'am';
    items.push(
      <div key={i} className={styles.tictac_header}>
        {((i + 11) % 12) + 1}
        {suffix}
      </div>,
    );
  }
  return <div className={styles.tictac_header_row}>{items}</div>;
};

export interface TimerProps {
  date: number;
  currentTime: Date;
  leftNavClicker: ReactElement;
  rightNavClicker: ReactElement;
}

const Timer = ({ date, currentTime, leftNavClicker, rightNavClicker }: TimerProps) => {
  const [identity, setIdentity] = useState({} as Identity);
  const [greeting, setGreeting] = useState('');
  const [summaries, setSummaries] = useState<Array<Summary> | undefined>(undefined);

  useEffect(() => {
    RestApi.greet((identity) => setIdentity(identity));
  }, []);

  useEffect(() => {
    if (identity.ID !== undefined) {
      setGreeting(`
        Hello, ${identity.DisplayName === '' ? 'my friend' : identity.DisplayName}!
        You are logged in with ${identity.ProviderName}.
      `);
      RestApi.getSummaries(date, (summaries) => setSummaries(summaries));
    }
  }, [identity, date]);

  const [didScroll, setDidScroll] = useState(false);
  useEffect(() => {
    if (summaries && !didScroll) {
      const targetTickNumber = currentTime.getHours() * 4 - 4;
      const targetTick = document.querySelector(`[data-test-id='0-${targetTickNumber >= 0 ? targetTickNumber : 0}']`);
      if (targetTick) {
        targetTick.scrollIntoView({ block: 'nearest', inline: 'start' });
      }
      setDidScroll(true);
    }
  }, [currentTime, summaries, didScroll]);

  const summaryElements = new Array<JSX.Element>();
  const tickRowElements = new Array<JSX.Element>();

  for (let i = 0; i < 12; i++) {
    const foundSummary = () =>
      summaries?.find((value) => value.Slot === i) ||
      ({ TimerTicks: [], Slot: i, Date: date, Content: '', ID: undefined, UserID: undefined } as Summary);

    const [summaryText, setSummaryText] = useState<string | undefined>();

    const setSummaryState = useCallback(
      (s: Summary) => {
        setSummaries([{ ...s }, ...(summaries?.filter((_s) => _s.Slot !== i) || [])]);
      },
      [summaries, i],
    );

    const handleSummaryChange = useMemo(
      () =>
        debounce((text: string | undefined) => {
          if (text !== undefined && foundSummary().Content !== text) {
            RestApi.createSummary({ ...foundSummary(), Content: text } as Summary, (s: Summary) => {
              setSummaryState(s);
            });
          }
        }, 800),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [summaries, setSummaryState, i],
    );

    useEffect(() => handleSummaryChange(summaryText), [handleSummaryChange, summaryText]);

    if (summaries !== undefined) {
      summaryElements.push(
        <TaskRowSummary
          {...{
            summaryText: summaryText !== undefined ? summaryText : foundSummary().Content,
            setSummaryText,
            key: i,
            useDate: date,
            slot: i,
          }}
        />,
      );

      tickRowElements.push(
        <TaskRowTicks {...{ setSummaryState, key: i, useDate: date, slot: i }} summary={foundSummary()} />,
      );
    }
  }

  return (
    <>
      <div>
        <h1>The Timely Tasker</h1>
        <h2>
          {leftNavClicker}
          Work Date: {dateDisplay(date)}
          {rightNavClicker}
        </h2>
        <p data-test-id="greeting">{greeting || 'loading...'}</p>
      </div>
      <div className={styles.Timer}>
        <div className={styles.content}>
          <div className={styles.left_column}>
            <div key={'headerspacer'} className={styles.summary_header}>
              Task Summary
            </div>
            {summaryElements}
          </div>
          <div className={styles.right_column}>
            <Header />
            {tickRowElements}
          </div>
        </div>
      </div>
    </>
  );
};

export default Timer;
