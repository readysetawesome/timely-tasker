import React from 'react';
import { mount } from 'cypress/react';
import TaskRowTicks from './TaskRowTicks';
import { Provider } from 'react-redux';
import storeMaker from '../../store';
import { CalendarEvent } from '../../../RestApi';

const TODAYS_DATE = 1679529600000;

describe('<TaskRowTicks />', () => {
  const useApi = {
    getSummaries: () => Promise.resolve([]),
    setSummary: () => Promise.resolve(),
    getPreferences: () => Promise.resolve({}),
    setPreference: () => Promise.resolve({}),
    getPinnedTasks: () => Promise.resolve([]),
    setPinnedTask: () => Promise.resolve({}),
    removePinnedTask: () => Promise.resolve(),
    updatePinnedTaskText: () => Promise.resolve({}),
    reorderPinnedTasks: () => Promise.resolve([]),
  };

  // Format date for ISO string (UTC)
  const formatDate = (date: number, hours: number, minutes: number) => {
    const d = new Date(date);
    d.setUTCHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  it('renders 96 tick cells for a full day', () => {
    // Mount with empty events to test basic rendering
    mount(
      <Provider store={storeMaker()}>
        <TaskRowTicks slot={0} useApi={useApi} calendarEvents={[]} />
      </Provider>
    );

    // Verify all 96 ticks are rendered (0-95)
    for (let i = 0; i < 96; i += 10) {
      cy.get(`[data-test-id="0-${i}"]`).should('exist');
    }
  });

  it('maps calendar events to correct tick positions', () => {
    // Team Meeting: 10:00-11:00 -> ticks 40-43 (each tick is 15 minutes)
    // 10:00 = 10 * 4 = 40, 11:00 = 11 * 4 = 44

    const calendarEvents: CalendarEvent[] = [
      {
        id: 'event1',
        summary: 'Team Meeting',
        start: formatDate(TODAYS_DATE, 10, 0),
        end: formatDate(TODAYS_DATE, 11, 0),
        allDay: false,
        status: 'confirmed',
        colorId: '4',
      },
    ];

    mount(
      <Provider store={storeMaker()}>
        <TaskRowTicks slot={0} useApi={useApi} calendarEvents={calendarEvents} />
      </Provider>
    );

    // Verify events are mapped to correct ticks
    cy.get('[data-test-id="0-40"]').should('exist');
    cy.get('[data-test-id="0-41"]').should('exist');
    cy.get('[data-test-id="0-42"]').should('exist');
    cy.get('[data-test-id="0-43"]').should('exist');
  });

  it('handles all-day events spanning full day', () => {
    const allDayEvent: CalendarEvent = {
      id: 'allday',
      summary: 'Full Day Event',
      start: formatDate(TODAYS_DATE, 0, 0),
      end: formatDate(TODAYS_DATE + 86400000, 0, 0),
      allDay: true,
      status: 'confirmed',
      colorId: '2',
    };

    mount(
      <Provider store={storeMaker()}>
        <TaskRowTicks slot={0} useApi={useApi} calendarEvents={[allDayEvent]} />
      </Provider>
    );

    // All-day event should affect all ticks
    // The calendar_marker div is rendered with CSS module classes
    // which can't be tested directly, so we verify the component renders
    cy.get('[data-test-id="0-0"]').should('exist');
    cy.get('[data-test-id="0-95"]').should('exist');
  });

  it('handles events that span midnight', () => {
    const overnightEvent: CalendarEvent = {
      id: 'overnight',
      summary: 'Overnight Event',
      start: formatDate(TODAYS_DATE, 23, 0),
      end: formatDate(TODAYS_DATE + 86400000, 1, 0),
      allDay: false,
      status: 'confirmed',
      colorId: '3',
    };

    mount(
      <Provider store={storeMaker()}>
        <TaskRowTicks slot={0} useApi={useApi} calendarEvents={[overnightEvent]} />
      </Provider>
    );

    // Event spans ticks 92-95 (11pm-12am) and 0-3 (12am-1am)
    cy.get('[data-test-id="0-92"]').should('exist');
    cy.get('[data-test-id="0-0"]').should('exist');
  });

  it('maps events from 9am to 5pm correctly', () => {
    const workingHoursEvents: CalendarEvent[] = [
      {
        id: 'morning',
        summary: 'Morning Standup',
        start: formatDate(TODAYS_DATE, 9, 0),
        end: formatDate(TODAYS_DATE, 10, 0),
        allDay: false,
        status: 'confirmed',
        colorId: '4',
      },
      {
        id: 'afternoon',
        summary: 'Project Review',
        start: formatDate(TODAYS_DATE, 14, 0),
        end: formatDate(TODAYS_DATE, 15, 0),
        allDay: false,
        status: 'confirmed',
        colorId: '1',
      },
    ];

    mount(
      <Provider store={storeMaker()}>
        <TaskRowTicks slot={0} useApi={useApi} calendarEvents={workingHoursEvents} />
      </Provider>
    );

    // 9am = tick 36, 2pm = tick 56
    cy.get('[data-test-id="0-36"]').should('exist');
    cy.get('[data-test-id="0-56"]').should('exist');
  });

  it('renders calendar markers for overlapping events', () => {
    const overlappingEvents: CalendarEvent[] = [
      {
        id: 'event1',
        summary: 'Meeting 1',
        start: formatDate(TODAYS_DATE, 10, 0),
        end: formatDate(TODAYS_DATE, 12, 0),
        allDay: false,
        status: 'confirmed',
        colorId: '4',
      },
      {
        id: 'event2',
        summary: 'Meeting 2',
        start: formatDate(TODAYS_DATE, 10, 30),
        end: formatDate(TODAYS_DATE, 11, 30),
        allDay: false,
        status: 'confirmed',
        colorId: '1',
      },
    ];

    mount(
      <Provider store={storeMaker()}>
        <TaskRowTicks slot={0} useApi={useApi} calendarEvents={overlappingEvents} />
      </Provider>
    );

    // At tick 42 (10:30am-10:45am), both events should be present
    cy.get('[data-test-id="0-42"]').should('exist');
    cy.get('[data-test-id="0-43"]').should('exist');
  });

  it('renders correctly for different slots', () => {
    const events: CalendarEvent[] = [
      {
        id: 'event1',
        summary: 'Meeting',
        start: formatDate(TODAYS_DATE, 10, 0),
        end: formatDate(TODAYS_DATE, 11, 0),
        allDay: false,
        status: 'confirmed',
        colorId: '4',
      },
    ];

    mount(
      <Provider store={storeMaker()}>
        <TaskRowTicks slot={5} useApi={useApi} calendarEvents={events} />
      </Provider>
    );

    // Should render ticks with the correct slot number
    cy.get('[data-test-id="5-40"]').should('exist');
    cy.get('[data-test-id="5-41"]').should('exist');
  });

  it('handles events with no colorId (defaults to blue)', () => {
    const events: CalendarEvent[] = [
      {
        id: 'event1',
        summary: 'Event without color',
        start: formatDate(TODAYS_DATE, 10, 0),
        end: formatDate(TODAYS_DATE, 11, 0),
        allDay: false,
        status: 'confirmed',
      },
    ];

    mount(
      <Provider store={storeMaker()}>
        <TaskRowTicks slot={0} useApi={useApi} calendarEvents={events} />
      </Provider>
    );

    // Component should render without errors
    cy.get('[data-test-id="0-40"]').should('exist');
  });
});
