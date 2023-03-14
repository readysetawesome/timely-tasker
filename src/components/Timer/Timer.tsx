import React, { useEffect, useState } from "react";
import styles from "./Timer.module.scss";

interface TimerProps {}

const Timer = ({ TimerProps }) => {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const prefix = process.env.NODE_ENV === "development" ? "http://127.0.0.1:8788" : "";
    fetch( prefix + "/greet", {mode:"cors"})
        .then(async  response => {
          const foo = await response.text();
          setGreeting(foo);
        });
  });

  return <>
    <div>{greeting || "loading..."}</div>
    <div className={styles.Timer}>
      Timer Component

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
