import React, { useEffect, useState } from "react";
import { Identity } from "../../../lib/Identity";
import { Summary } from "../../../functions/summaries"
import styles from "./Timer.module.scss";
import TaskRow from "./TaskRow.tsx";

const isDevMode = process.env.NODE_ENV === "development";
const fetchPrefix = isDevMode ? "http://127.0.0.1:8788" : "";
const fetchOptions = (isDevMode ? { mode: "cors" } : {}) as RequestInit;

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

  useEffect(() => {
    fetch(fetchPrefix + "/greet", fetchOptions)
      .then(response => response.json())
      .then(data => setIdentity(data));
  }, []);

  useEffect(() => {
    if (identity.ID !== undefined) {
      setGreeting(`
        Welcome, ${identity.DisplayName}!
        Found your login info via ${identity.ProviderName}, lets get started!
      `);

      // List all summaries for the target date
      fetch(fetchPrefix + `/summaries?date=${useDate}`, fetchOptions)
        .then(response => response.json())
        .then(data => setSummaries(data));
    }
  }, [identity, useDate]);

  let summaryElements = new Array<JSX.Element>();

  for (let i = 0; i < 20; i++) {
    summaryElements.push(<TaskRow key={i} useDate={useDate} slot={i} summary={summaries.find((value) => value.Slot === i)} />)
  }

  return <>
    <div>{greeting || "loading..."}</div>
    <div className={styles.Timer}>
      <h1>The Emergent Task Timer App</h1>
      <h2>Showing data for {new Date(useDate).toLocaleDateString()}</h2>
      <Header />
      {summaryElements}
    </div>
  </>
};

export default Timer;
