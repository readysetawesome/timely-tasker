import React, { useEffect, useState } from "react";
import { Identity } from "../../../lib/Identity";
import { Summary } from "../../../functions/summaries"
import styles from "./Timer.module.scss";
import TaskRow from "./TaskRow.tsx";
import RestApi from "../../RestApi.ts";


const ONE_DAY_MILLIS = 86400000;

export const todaysDateInt = (now) => {
  if (!now) now = new Date();
  const myZeroHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  return myZeroHour.getTime();
}

export const dateDisplay = (date) => {
  date = new Date(date);
  return `${date.getUTCMonth()+1}-${date.getUTCDate()}-${date.getUTCFullYear()}`;
}

const Header = () => {
  let items = new Array<JSX.Element>();
  items.push(<div key={'headerspacer'} className={styles.tictac_header}>Enter A Task Summary</div>)
  for (let i = 0; i < 24; i++) {
    const suffix = (i >= 12)? 'pm' : 'am';
    items.push(<div key={i} className={styles.tictac_header}>{((i + 11) % 12 + 1)}{suffix}</div>)
  }
  return <div className={styles.tictac_header_row}>{
    items
  }</div>;
}

export interface TimerProps {
  date?: number,
};

const Timer = (props: TimerProps) => {
  const [identity, setIdentity] = useState({} as Identity);
  const [useDate, setDate] = useState(props.date || todaysDateInt());
  const [greeting, setGreeting] = useState("");
  const [summaries, setSummaries] = useState(new Array<Summary>());
  const [refreshes, setRefreshes] = useState(0);

  useEffect(() => {
    RestApi.greet(data => setIdentity(data));
  }, []);

  useEffect(() => {
    if (identity.ID !== undefined) {
      setGreeting(`
        Hello, ${identity.DisplayName}!
        Found your login info via ${identity.ProviderName}, lets get started!
      `);

      RestApi.getSummaries(useDate, data => setSummaries(data));
    }
  }, [identity, useDate]);

  useEffect(() => {
    if (refreshes > 0) {
      RestApi.getSummaries(useDate, data => setSummaries(data));
    }
  }, [refreshes, useDate]);

  const refreshSummary = () => setRefreshes(refreshes+1);

  let summaryElements = new Array<JSX.Element>();

  for (let i = 0; i < 20; i++) {
    summaryElements.push(
      <TaskRow
        refreshSummary={refreshSummary}
        key={i}
        useDate={useDate}
        slot={i}
        summary={summaries.find((value) => value.Slot === i)}
      />
    )
  }

  return <>
    <div>{greeting || "loading..."}</div>
    <div className={styles.Timer}>
      <h1>The Emergent Task Timer App</h1>
      <h2>
        <span style={{cursor: 'pointer'}} onClick={() => setDate(useDate - ONE_DAY_MILLIS)}>&lt;&lt;&nbsp;</span>
        Showing data for {dateDisplay(useDate)}
        <span style={{cursor: 'pointer'}} onClick={() => setDate(useDate + ONE_DAY_MILLIS)}>&nbsp;&gt;&gt;</span>
      </h2>
      <Header />
      {summaryElements}
    </div>
  </>
};

export default Timer;
