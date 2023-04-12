/* eslint-disable cypress/no-unnecessary-waiting */
import React from 'react';
import App from '../../App';
import { mount } from 'cypress/react18';
import summaries from '../../../cypress/fixtures/summaries.json';

import { Provider } from 'react-redux';
import storeMaker from '../../store';

import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Api, { localStoragePrefix } from '../../LocalStorageApi';
import { Summary } from '../../../functions/summaries';
import { waitFor } from '@testing-library/react';

const TODAYS_DATE = 1679529600000; // at the zero h:m:s
const TIME_NOW = 1679587374481; // at 9 am

describe('<Timer /> no localStorage setting', () => {
  beforeEach(() => {
    mount(
      <Provider store={storeMaker()}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="timer" element={<App />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    ).as('mountedComponent');
  });

  it('renders the page with both buttons', () => {
    cy.get('[data-test-id=use-cloud-storage]');
    cy.get('[data-test-id=use-local-storage]').click();
    cy.get('[data-test-id=use-local-storage]').should('not.exist');
  });
});

describe('<Timer /> using localStorage', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('TimelyTasker:UseLocalStorage', 'yes');
      win.localStorage.setItem(
        localStoragePrefix + TODAYS_DATE,
        JSON.stringify(summaries)
      );
    });

    // we made these stamps in gmt-700 which is 420 minutes of offset
    const now = TIME_NOW - 420 * 60 * 1000;
    const useCurrentTime = now + new Date().getTimezoneOffset() * 60 * 1000;
    cy.clock().then((clock) => clock.setSystemTime(useCurrentTime));
    mount(
      <Provider store={storeMaker()}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="timer" element={<App />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    ).as('mountedComponent');

    cy.clock().then((clock) => clock.restore());
  });

  it('renders the date', () => {
    cy.get('h2').should('contain', '3-23-2023');
  });

  it('renders greeting text', () => {
    cy.get("[data-test-id='greeting']")
      .first()
      .should('contain', 'Currently using Local Storage');
  });

  it('renders loaded summary text in the <input>', () => {
    cy.get("[data-test-id='summary-text-0']")
      .first()
      .should('have.value', 'replace jest with cypress');
  });

  it('updates summary text typed in the <input>', () => {
    cy.get("[data-test-id='summary-text-0']").type(',ok');
    cy.wait(900); // There is 800ms debounce so we have to do this, ew
    cy.getAllLocalStorage().then((result) => {
      expect(
        (
          JSON.parse(
            result[Cypress.config('baseUrl') ?? ''][
              'TimelyTasker:1679529600000'
            ] as string
          ) as Summary[]
        ).find((s) => s.slot === 0)?.content
      ).to.equal('replace jest with cypress,ok');
    });
  });

  it('renders tick marks from the data, they respond to clicks', () => {
    cy.get('div[class*="Timer_tictac_focused"][data-test-id="0-31"]').click();
    cy.get('div[class*="Timer_tictac_distracted"][data-test-id="0-31"]');

    waitFor(() =>
      Api.getSummaries(TODAYS_DATE).then((summaries) =>
        expect(
          summaries[0].TimerTicks.find((t) => t.tickNumber === 31)?.distracted
        ).to.equal(1)
      )
    );
  });

  it('switches cloud storage when clicked', () => {
    cy.intercept('GET', '/greet', { fixture: 'authorize' }).as('getAuthInfo');
    cy.on('url:changed', (newUrl) => {
      expect(newUrl).to.equal(Cypress.config('baseUrl') + '/authorize');
    });
    cy.get('[data-test-id=use-cloud-storage]').click();
    cy.wait('@getAuthInfo');
  });
});
