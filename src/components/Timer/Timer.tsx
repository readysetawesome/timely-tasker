import React, { useEffect, useState } from "react";
import { Identity } from "../../../lib/Identity";
import { Summary } from "../../../functions/summaries"
import styles from "./Timer.module.scss";

/// interface TimerProps {}

const isDevMode = process.env.NODE_ENV === "development";
const fetchPrefix = isDevMode ? "http://127.0.0.1:8788" : "";
const fetchOptions = (isDevMode ? { mode: "cors" } : {}) as RequestInit;

const todaysDateInt = () => {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0);
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

      // TODO COMMENT THIS OUT
      // fetch(fetchPrefix + `/summaries?date=${useDate}&text=zooooo&slot=1`, { ...fetchOptions, method: 'POST' })
      //  .then(doFetchSummaries);
    }
  }, [identity, useDate]);

  return <>
    <div>{greeting || "loading..."}</div>
    <div className={styles.Timer}>
      <h1>The Emergent Task Timer App</h1>
      <h2>Showing data for {new Date(useDate).toLocaleDateString()}</h2>
      <p>{summaries.map( (s) => s.Content).join(', ')}</p>
      <div className={styles.grid}>
        <div className={styles.tictac}></div>
        <div className={styles.tictac}></div>
        <div className={styles.tictac}></div>
        <div className={styles.tictac}></div>
        <div className={styles.tictac}></div>
        <div className={styles.tictac}></div>
        <div className={styles.tictac}></div>
        <div className={styles.tictac}></div>
      </div>
    </div>
  </>
};

export default Timer;
