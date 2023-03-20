import React, { ReactElement, useEffect, useState } from "react";
import { Identity } from "../../../lib/Identity";
import { Summary } from "../../../functions/summaries"
import styles from "./Timer.module.scss";
import TaskRowTicks from "./TaskRowTicks";
import TaskRowSummary from "./TaskRowSummary";
import RestApi from "../../RestApi";

export const dateDisplay = (date) => {
  date = new Date(date);
  return `${date.getUTCMonth()+1}-${date.getUTCDate()}-${date.getUTCFullYear()}`;
}

const Header = () => {
  let items = new Array<JSX.Element>();
  for (let i = 0; i < 24; i++) {
    const suffix = (i >= 12)? 'pm' : 'am';
    items.push(<div key={i} className={styles.tictac_header}>{((i + 11) % 12 + 1)}{suffix}</div>)
  }
  return <div className={styles.tictac_header_row}>{
    items
  }</div>;
}

export interface TimerProps {
  date: number,
  leftNavClicker: ReactElement,
  rightNavClicker: ReactElement,
};

const Timer = ({
  date, leftNavClicker, rightNavClicker
}: TimerProps) => {
  const [identity, setIdentity] = useState({} as Identity);
  const [greeting, setGreeting] = useState("");
  const [summaries, setSummaries] = useState(new Array<Summary>());

  useEffect(() => {
    RestApi.greet(data => setIdentity(data));
  }, []);

  useEffect(() => {
    if (identity.ID !== undefined) {
      setGreeting(`
        Hello, ${ identity.DisplayName === "" ? "my friend" : identity.DisplayName }!
        You are logged in with ${identity.ProviderName}.
      `);
      RestApi.getSummaries(date, summaries => setSummaries(summaries));
    }
  }, [identity, date]);

  let summaryElements = new Array<JSX.Element>();
  let tickRowElements = new Array<JSX.Element>();

  for (let i = 0; i < 20; i++) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const foundSummary = summaries?.find((value) => value.Slot === i) ||
      {TimerTicks: [], Slot: i, Date: date, Content: ''} as Summary;

    const updateSummary = (s: Summary) => {
      setSummaries([
        s,
        ...summaries.filter((_s) => _s.Slot !== i),
      ]);
    };

    summaryElements.push(
      <TaskRowSummary
        { ... { updateSummary, key: i, useDate: date, slot: i }}
        summary={foundSummary}
      />
    )

    tickRowElements.push(
      <TaskRowTicks
        { ... { updateSummary, key: i, useDate: date, slot: i }}
        summary={foundSummary}
      />
    )
  }

  return <>
    <div>
      <h1>The Timely Tasker</h1>
      <h2>
        { leftNavClicker }
        Work Date: {dateDisplay(date)}
        { rightNavClicker }
      </h2>
      <p>{greeting || "loading..."}</p>
    </div>
    <div className={styles.Timer}>
      <div className={styles.content}>
        <div className={styles.left_column}>
          <div key={'headerspacer'} className={styles.summary_header}>Task Summary</div>
          {summaryElements}
        </div>
        <div className={styles.right_column}>
          <Header />
          {tickRowElements}
        </div>
      </div>
    </div>
  </>
};

export default Timer;
