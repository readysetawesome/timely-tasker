import React, { useEffect, useState } from "react";
import { Identity } from "../../../lib/Identity";
import { Summary } from "../../../functions/summaries"
import styles from "./Timer.module.scss";
import TaskRow from "./TaskRow.tsx";
import RestApi from "../../RestApi.ts";

const todaysDateInt = () => {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0);
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

const Timer = (/*{ TimerProps: props }*/) => {
  const [identity, setIdentity] = useState({} as Identity);
  const [useDate] = useState(todaysDateInt);
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

  const outputDate = new Date(useDate);

  return <>
    <div>{greeting || "loading..."}</div>
    <div className={styles.Timer}>
      <h1>The Emergent Task Timer App</h1>
      <h2>Showing data for {`${outputDate.getUTCMonth()+1}-${outputDate.getUTCDate()}-${outputDate.getUTCFullYear()}`}</h2>
      <Header />
      {summaryElements}
    </div>
  </>
};

export default Timer;
