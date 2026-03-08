import React from 'react';
import { mount } from 'cypress/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MonthView from './MonthView';
import RestApi from '../../RestApi';

// March 2023: starts on Wednesday; 31 days
const MARCH_2023_DATE = 1677628800000; // March 1, 2023 00:00 UTC
const MARCH_2023_END  = 1680220800000; // March 31, 2023 00:00 UTC
const TODAYS_DATE = 1679529600000;     // March 23, 2023 (used as fixture date)

const mountMonthView = (date = MARCH_2023_DATE, api = RestApi) =>
  mount(
    <MemoryRouter initialEntries={[`/month?date=${date}`]}>
      <Routes>
        <Route path="/month" element={<MonthView useApi={api} />} />
        <Route path="/timer" element={<div data-test-id="timer-page">Timer</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('<MonthView /> using REST API', () => {
  const RANGE_URL = `/summaries?startDate=${MARCH_2023_DATE}&endDate=${MARCH_2023_END}`;

  it('shows the month title via REST', () => {
    cy.intercept('GET', RANGE_URL, { body: [] });
    mountMonthView(MARCH_2023_DATE, RestApi);
    cy.get("[data-test-id='month-title']").should('contain', 'March 2023');
  });

  it('shows task names from REST response', () => {
    // Fixture summaries have date=TODAYS_DATE; MonthView groups by date field
    cy.intercept('GET', RANGE_URL, { fixture: 'summaries' }).as('getRange');
    mountMonthView(MARCH_2023_DATE, RestApi);
    cy.wait('@getRange');
    cy.get(`[data-test-id='month-day-${TODAYS_DATE}']`).within(() => {
      cy.contains('replace jest with cypress');
    });
  });

  it('shows session-expired error when api returns invalid session', () => {
    cy.intercept('GET', RANGE_URL, {
      body: { error: 'invalid user session' },
    }).as('sessionExpired');
    mountMonthView(MARCH_2023_DATE, RestApi);
    cy.wait('@sessionExpired');
    cy.get("[data-test-id='month-session-error']").should('be.visible');
  });
});
