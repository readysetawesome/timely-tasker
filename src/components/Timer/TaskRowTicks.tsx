import React from 'react';
import styles from './Timer.module.scss';
import Tick from './Tick';
import { Summary } from '../../../functions/summaries';
import { CalendarEvent } from '../../RestApi';
import { StorageApiType } from '../../LocalStorageApi';

// Google Calendar colors mapping
const calendarColors: Record<string, string> = {
  '1': '#ac725e',
  '2': '#d68855',
  '3': '#e5b842',
  '4': '#83a846',
  '5': '#4d9c9a',
  '6': '#4279a8',
  '7': '#8a6fa8',
  '8': '#666666',
  '9': '#d66d75',
  '10': '#b68a42',
  '11': '#72c697',
};

const getCalendarColor = (colorId?: string) => {
  return colorId && calendarColors[colorId] ? calendarColors[colorId] : '#4279a8';
};

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export interface TaskRowTicksProps {
  slot: number;
  useApi: StorageApiType;
  calendarEvents?: CalendarEvent[];
}

const TaskRowTicks = ({ slot, useApi, calendarEvents = [] }: TaskRowTicksProps) => {
  const ticks = new Array<JSX.Element>();

  // Group events by continuous time ranges for rendering as bars
  // Each bar represents a continuous event (or overlapping events with same color)
  const eventBars: Array<{
    startTick: number;
    endTick: number;
    events: CalendarEvent[];
    color: string;
  }> = [];

  // Track which ticks are already covered by bars to avoid overlap
  const coveredTicks = new Set<number>();

  calendarEvents.forEach((event) => {
    const start = new Date(event.start).getTime();
    const end = new Date(event.end).getTime();
    const eventStartTick = Math.floor((start % 86400000) / (15 * 60000));
    const eventEndTick = Math.floor((end % 86400000) / (15 * 60000));
    const color = getCalendarColor(event.colorId);

    // Find the range of ticks this event covers
    const ticksToCover = [];
    for (let t = Math.max(0, eventStartTick); t < Math.min(96, eventEndTick); t++) {
      ticksToCover.push(t);
    }

    if (ticksToCover.length > 0) {
      eventBars.push({
        startTick: ticksToCover[0],
        endTick: ticksToCover[ticksToCover.length - 1],
        events: [event],
        color,
      });
      ticksToCover.forEach((t) => coveredTicks.add(t));
    }
  });

  // Merge overlapping bars of the same color
  const mergedBars: typeof eventBars = [];
  eventBars.sort((a, b) => a.startTick - b.startTick);

  for (const bar of eventBars) {
    const existing = mergedBars.find(
      (b) => b.color === bar.color && b.endTick >= bar.startTick - 1
    );
    if (existing) {
      existing.endTick = Math.max(existing.endTick, bar.endTick);
      existing.events.push(...bar.events);
    } else {
      mergedBars.push({ ...bar });
    }
  }

  // Remove duplicate events from merged bars
  mergedBars.forEach((bar) => {
    bar.events = bar.events.filter(
      (e, i, a) => a.findIndex((x) => x.id === e.id) === i
    );
  });

  // Render ticks with calendar event bars
  for (let tickNumber = 0; tickNumber < 96; tickNumber++) {
    // Find any bars that cover this tick
    const coveringBars = mergedBars.filter(
      (bar) => tickNumber >= bar.startTick && tickNumber <= bar.endTick
    );

    ticks.push(
      <div className={styles.tictac_cell} key={tickNumber}>
        {/* Render calendar event bars - only once per continuous bar */}
        {tickNumber === 0 && (
          <>
            {mergedBars.map((bar, idx) => {
              const barWidth = bar.endTick - bar.startTick + 1;
              const leftOffset = bar.startTick;
              return (
                <div
                  key={`bar-${idx}`}
                  className={styles.calendar_event_bar}
                  style={{
                    left: `${leftOffset * 18}px`, // 18px per tick
                    width: `${barWidth * 18 - 2}px`, // -2 for gap
                    backgroundColor: bar.color,
                  }}
                  title={`${bar.events.map((e) => e.summary).join(', ')} (${formatTime(bar.events[0].start)} - ${formatTime(bar.events[bar.events.length - 1].end)})`}
                >
                  <div className={styles.calendar_event_tooltip}>
                    <div className={styles.calendar_event_time}>
                      {formatTime(bar.events[0].start)} - {formatTime(bar.events[bar.events.length - 1].end)}
                    </div>
                    <div className={styles.calendar_event_summary}>
                      {bar.events.length === 1 ? bar.events[0].summary : `${bar.events.length} events`}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        <Tick
          {...{
            slot,
            tickNumber,
            useApi,
            hasCalendarMarker: coveringBars.length > 0,
          }}
        />
      </div>
    );
  }
  return (
    <div className={styles.grid_ticks}>
      <>{ticks}</>
    </div>
  );
};

export default TaskRowTicks;
