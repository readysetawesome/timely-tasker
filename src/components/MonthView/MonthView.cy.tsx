import React from 'react';
import { mount } from 'cypress/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MonthView from './MonthView';
import LocalStorageApi from '../../LocalStorageApi';
import RestApi from '../../RestApi';
import summaries from '../../../cypress/fixtures/summaries.json';

// March 2023: starts on Wednesday; 31 days
const MARCH_2023_DATE = 1677628800000; // March 1, 2023 00:00 UTC
const TODAYS_DATE = 1679529600000;     // March 23, 2023 (used as fixture date)

const mountMonthView = (date = MARCH_2023_DATE, api = LocalStorageApi) =>
  mount(
    <MemoryRouter initialEntries={[`/month?date=${date}`]}>
      <Routes>
        <Route path="/month" element={<MonthView useApi={api} />} />
        <Route path="/timer" element={<div data-test-id="timer-page">Timer</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('<MonthView /> using localStorage', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('TimelyTasker:UseLocalStorage', 'yes');
    });
  });

  it('shows the correct month title', () => {
    mountMonthView();
    cy.get("[data-test-id='month-title']").should('contain', 'March 2023');
  });

  it('renders a row for each day of the month', () => {
    mountMonthView();
    cy.get("[data-test-id='month-table']").should('exist');
    // March has 31 days
    cy.get("[data-test-id^='month-day-']").should('have.length', 31);
  });

  it('each day links to the timer view for that date', () => {
    mountMonthView();
    cy.get(`[data-test-id='month-day-${MARCH_2023_DATE}']`)
      .should('have.attr', 'href')
      .and('include', `/timer?date=${MARCH_2023_DATE}`);
  });

  it('shows task names and focused hours for days with data', () => {
    cy.window().then((win) => {
      // Store summaries for March 23 in localStorage
      win.localStorage.setItem(
        `TimelyTasker:${TODAYS_DATE}`,
        JSON.stringify([0, 1])
      );
      win.localStorage.setItem(
        `TimelyTasker:${TODAYS_DATE}-0`,
        JSON.stringify(summaries[0])
      );
      win.localStorage.setItem(
        `TimelyTasker:${TODAYS_DATE}-1`,
        JSON.stringify(summaries[1])
      );
    });
    mountMonthView();
    cy.get(`[data-test-id='month-day-${TODAYS_DATE}']`).within(() => {
      cy.contains('replace jest with cypress');
      cy.contains('0.25 hrs');
    });
  });

  it('navigates to previous month', () => {
    mountMonthView();
    cy.get("[data-test-id='month-prev']").click();
    cy.get("[data-test-id='month-title']").should('contain', 'February 2023');
  });

  it('navigates to next month', () => {
    mountMonthView();
    cy.get("[data-test-id='month-next']").click();
    cy.get("[data-test-id='month-title']").should('contain', 'April 2023');
  });

  it('has a back-to-today link', () => {
    mountMonthView();
    cy.get("[data-test-id='month-back-to-today']").should('exist');
  });
});

describe('<MonthView /> using REST API', () => {
  beforeEach(() => {
    // Only intercept the one day we care about; other days fall back to []
    // via allSettled error handling in MonthView
    cy.intercept('GET', `/summaries?date=${TODAYS_DATE}`, {
      fixture: 'summaries',
    }).as('getTodaySummaries');
  });

  it('shows the month title via REST', () => {
    mountMonthView(MARCH_2023_DATE, RestApi);
    cy.get("[data-test-id='month-title']").should('contain', 'March 2023');
  });

  it('shows task names from REST response', () => {
    mountMonthView(MARCH_2023_DATE, RestApi);
    cy.wait('@getTodaySummaries');
    cy.get(`[data-test-id='month-day-${TODAYS_DATE}']`).within(() => {
      cy.contains('replace jest with cypress');
    });
  });
});
