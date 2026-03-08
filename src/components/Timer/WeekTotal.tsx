import React, { useEffect, useState } from 'react';
import { StorageApiType } from '../../LocalStorageApi';

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

interface WeekTotalProps {
  useApi: StorageApiType;
  date: number;
}

const WeekTotal = ({ useApi, date }: WeekTotalProps) => {
  const [weekHours, setWeekHours] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const weekStart = getWeekStart(date);

    useApi.getSummariesRange(weekStart, date)
      .then((summaries) => {
        if (cancelled) return;
        const focusedTicks = summaries.reduce(
          (sum, s) =>
            sum + (s.TimerTicks?.filter((t) => t.distracted === 0).length ?? 0),
          0
        );
        setWeekHours(focusedTicks / 4);
      })
      .catch(() => {}); // silently ignore — don't break the main UI

    return () => {
      cancelled = true;
    };
  }, [useApi, date]);

  if (weekHours === null) return null;

  return (
    <span className="tt-week-total" data-test-id="week-total">
      Week: {weekHours} hrs
    </span>
  );
};

export default WeekTotal;
