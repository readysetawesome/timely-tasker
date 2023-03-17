import { RequestInitCfProperties } from "@cloudflare/workers-types";
import { Summary } from "../functions/summaries";


const isDevMode = process.env.NODE_ENV === "development";
const fetchPrefix = isDevMode ? "http://127.0.0.1:8788" : "";
const fetchOptions = (isDevMode ? { mode: "cors" } : {}) as RequestInitCfProperties;


const createSummary = (useDate: number, text: string, slot: number, callback) => fetch(
  fetchPrefix + `/summaries?date=${useDate}&text=${encodeURIComponent(text)}&slot=${slot}`,
  { ...fetchOptions, method: 'POST' }
)
  .then(response => response.json())
  .then(data => callback(data));

const getSummaries = (
  useDate: number,
  callback: (summaries: Array<Summary>) => void,
) => {
  // List all summaries for the target date
  fetch(fetchPrefix + `/summaries?date=${useDate}`, fetchOptions)
    .then(response => response.json())
    .then(callback);
}

const greet = (callback) =>
  fetch(fetchPrefix + "/greet", fetchOptions)
    .then(response => response.json())
    .then(callback);

const createTick = (summaryID: number, tickNumber: number, callback) => fetch(
  fetchPrefix + `/ticks?summary=${summaryID}&tick=${tickNumber}`,
  { ...fetchOptions, method: 'POST' }
)
  .then(callback)

const exports = { greet, createTick, getSummaries, createSummary };
export default exports;
