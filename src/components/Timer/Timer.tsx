import React, { useEffect, useState } from "react";
import { Identity } from "../../../lib/Identity";
import { Summary } from "../../../functions/summaries"
import styles from "./Timer.module.scss";
import TaskRow from "./TaskRow";
import RestApi from "../../RestApi";

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
  date: number,
};

const Timer = ({ date }: TimerProps) => {
  const [identity, setIdentity] = useState({} as Identity);
  const [greeting, setGreeting] = useState("");
  const [summaries, setSummaries] = useState(new Array<Summary>());

  useEffect(() => {
    RestApi.greet(data => setIdentity(data));
  }, []);

  useEffect(() => {
    if (identity.ID !== undefined) {
      setGreeting(`
        Hello, ${identity.DisplayName}!
        Found your login info via ${identity.ProviderName}, lets get started!
      `);
      setSummaries([]);
      RestApi.getSummaries(date, data => setSummaries(data));
    }
  }, [identity, date]);

  let summaryElements = new Array<JSX.Element>();

  for (let i = 0; i < 20; i++) {
    summaryElements.push(
      <TaskRow
        key={i}
        useDate={date}
        slot={i}
        summary={summaries.find((value) => value.Slot === i)}
      />
    )
  }

  return <>
    <div>{greeting || "loading..."}</div>
    <div className={styles.Timer}>
      <h1>The Emergent Task Timer App</h1>
      <h2>Showing data for {dateDisplay(date)}</h2>
      <Header />
      {summaryElements}
    </div>
  </>
};

export default Timer;
