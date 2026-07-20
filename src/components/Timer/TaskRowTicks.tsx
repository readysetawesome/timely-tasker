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

  // Build tick-to-event mapping for this slot's date
  const tickEvents: Record<number, CalendarEvent[]> = {};
  calendarEvents.forEach((event) => {
    const start = new Date(event.start).getTime();
    const end = new Date(event.end).getTime();
    const eventStartTick = Math.floor((start % 86400000) / (15 * 60000));
    const eventEndTick = Math.floor((end % 86400000) / (15 * 60000));
    for (let t = Math.max(0, eventStartTick); t < Math.min(96, eventEndTick); t++) {
      if (!tickEvents[t]) tickEvents[t] = [];
      tickEvents[t].push(event);
    }
  });

  for (let tickNumber = 0; tickNumber < 96; tickNumber++) {
    const eventsForTick = tickEvents[tickNumber] || [];
    ticks.push(
      <div className={styles.tictac_cell} key={tickNumber}>
        {eventsForTick.length > 0 && (
          <div className={styles.calendar_marker}>
            {eventsForTick.map((evt, idx) => (
              <span
                key={idx}
                className={styles.calendar_marker_dot}
                style={{ backgroundColor: getCalendarColor(evt.colorId) }}
                title={`${evt.summary} (${formatTime(evt.start)} - ${formatTime(evt.end)})`}
              />
            ))}
          </div>
        )}
        <Tick
          {...{
            slot,
            tickNumber,
            useApi,
            hasCalendarMarker: eventsForTick.length > 0,
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
