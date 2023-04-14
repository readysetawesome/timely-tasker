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

describe('<Timer /> no localStorage setting', () => {
  beforeEach(() => {
    mount(
      <Provider store={storeMaker()}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<App useDate={TODAYS_DATE} />} />
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

describe('<Timer /> using localStorage, with no existing data', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('TimelyTasker:UseLocalStorage', 'yes');
    });

    mount(
      <Provider store={storeMaker()}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<App useDate={TODAYS_DATE} />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    ).as('mountedComponent');
  });

  it('renders greeting text', () => {
    cy.get("[data-test-id='greeting']")
      .first()
      .should('contain', 'Currently using Local Storage');
  });

  it('creates new summary from scratch', () => {
    cy.get('[data-test-id=summary-text-0]').type('Hi');
    cy.wait(900); // we have to wait for debounce to fire before checking data
    cy.getAllLocalStorage().then((result) => {
      expect(
        (
          JSON.parse(
            result[Cypress.config('baseUrl') ?? ''][
              'TimelyTasker:1679529600000-0'
            ] as string
          ) as Summary
        ).content
      ).to.equal('Hi');
    });
  });

  it('creates new tick from scratch', () => {
    cy.get('[data-test-id=0-33]').click();
    cy.getAllLocalStorage().then((result) => {
      expect(
        (
          JSON.parse(
            result[Cypress.config('baseUrl') ?? ''][
              'TimelyTasker:1679529600000-0'
            ] as string
          ) as Summary
        ).TimerTicks?.find((t) => t.tickNumber === 33)?.distracted
      ).to.equal(0);
    });
  });
});

describe('<Timer /> using localStorage', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('TimelyTasker:UseLocalStorage', 'yes');
      summaries.forEach((s) =>
        win.localStorage.setItem(
          `${localStoragePrefix + TODAYS_DATE}-${s.slot}`,
          JSON.stringify(s)
        )
      );
      win.localStorage.setItem(
        localStoragePrefix + TODAYS_DATE,
        JSON.stringify(summaries.map((s) => s.slot))
      );
    });

    mount(
      <Provider store={storeMaker()}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<App useDate={TODAYS_DATE} />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    ).as('mountedComponent');
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
              'TimelyTasker:1679529600000-0'
            ] as string
          ) as Summary
        ).content
      ).to.equal('replace jest with cypress,ok');
    });
  });

  it('renders tick marks from the data, they respond to clicks', () => {
    cy.get('div[class*="Timer_tictac_focused"][data-test-id="0-31"]').click();
    cy.get('div[class*="Timer_tictac_distracted"][data-test-id="0-31"]');

    waitFor(() =>
      Api.getSummaries(TODAYS_DATE).then((summaries) =>
        expect(
          summaries
            .find((s) => s.slot === 0)
            ?.TimerTicks.find((t) => t.tickNumber === 31)?.distracted
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
