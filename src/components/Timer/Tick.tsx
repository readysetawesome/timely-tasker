
import React, { useCallback, useState } from "react";
import { Identity } from "../../../lib/Identity";
import { Summary } from "../../../functions/summaries"
import styles from "./Timer.module.scss";
import debounce from "lodash.debounce";
import { TimerTick } from "./TaskRow";

const isDevMode = process.env.NODE_ENV === "development";
const fetchPrefix = isDevMode ? "http://127.0.0.1:8788" : "";
const fetchOptions = (isDevMode ? { mode: "cors" } : {}) as RequestInit;

export type TickChangeEvent = {
  tickNumber: number;
  summary: Summary;
}

export interface TickProps {
  timerTick: TimerTick;
  summary: Summary;
  tickChangeCallback: (change: TickChangeEvent) => void;
};

const Tick = ({ timerTick, summary, tickChangeCallback }: TickProps) => {
  const distracted = timerTick?.Distracted;

  const style =
    distracted === 1 ? styles.tictac_distracted :
    distracted === 0 ? styles.tictac_focused :
    styles.tictac_empty;

  const updateTick = useCallback(() => {
    tickChangeCallback({tickNumber: timerTick.TickNumber, summary: summary} as TickChangeEvent);
  }, [timerTick, summary, tickChangeCallback]);

  return <div className={style} onClick={updateTick} />;
}

export default Tick;
