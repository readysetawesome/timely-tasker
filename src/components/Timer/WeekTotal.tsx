import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Summary } from '../../../functions/summaries';
import { getTotalFocusedHours } from './Timer.selectors';

const ONE_DAY = 86400000;

// Returns the UTC timestamp (as used by todaysDateInt) for the most recent
// Saturday at local midnight. "Since last Saturday" defines the week boundary.
export const getWeekStart = (fromDate: number): number => {
  // fromDate = Date.UTC(localYear, localMonth, localDate), so getUTCDay()
  // gives the day-of-week that matches the user's local calendar date.
  const dayOfWeek = new Date(fromDate).getUTCDay(); // 0=Sun … 6=Sat
  const daysSinceSat = (dayOfWeek - 6 + 7) % 7;    // Sat→0, Sun→1, … Fri→6
  return fromDate - daysSinceSat * ONE_DAY;
};

interface RangeApi {
  getSummariesRange: (startDate: number, endDate: number) => Promise<Summary[]>;
}

interface WeekTotalProps {
  useApi: RangeApi;
  date: number;
}

const WeekTotal = ({ useApi, date }: WeekTotalProps) => {
  const [priorHours, setPriorHours] = useState<number | null>(null);
  // Live Redux state for the currently-viewed day — updates immediately on tick clicks
  const todayHours = useSelector(getTotalFocusedHours);

  useEffect(() => {
    let cancelled = false;
    const weekStart = getWeekStart(date);
    const yesterday = date - ONE_DAY;

    // Fetch only days before the current date; today's hours come from Redux
    useApi.getSummariesRange(weekStart, yesterday)
      .then((summaries) => {
        if (cancelled) return;
        const focusedTicks = summaries.reduce(
          (sum, s) =>
            sum + (s.TimerTicks?.filter((t) => t.distracted === 0).length ?? 0),
          0
        );
        setPriorHours(focusedTicks / 4);
      })
      .catch(() => {}); // silently ignore — don't break the main UI

    return () => {
      cancelled = true;
    };
  }, [useApi, date]);

  if (priorHours === null) return null;

  return (
    <span className="tt-week-total" data-test-id="week-total">
      Week: {priorHours + todayHours} hrs
    </span>
  );
};

export default WeekTotal;
