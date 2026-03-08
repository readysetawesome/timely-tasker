/* eslint-disable cypress/no-unnecessary-waiting */
import React from 'react';
import App from '../../App';
import { mount } from 'cypress/react';
import summaries from '../../../cypress/fixtures/summaries.json';

import { Provider } from 'react-redux';
import storeMaker from '../../store';

import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Api, { localStoragePrefix } from '../../LocalStorageApi';
import { Summary } from '../../../functions/summaries';

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
      .should('contain', 'Using local storage');
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
            <Route path="/timer" element={<App useDate={TODAYS_DATE} />} />
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
      .should('contain', 'Using local storage');
  });

  it('renders loaded summary text in the <input>', () => {
    cy.get("[data-test-id='summary-text-0']")
      .first()
      .should('have.value', 'replace jest with cypress');
  });

  it('renders focused hours per row', () => {
    cy.get("[data-test-id='focused-header']").should('contain', 'Focused');
    cy.get("[data-test-id='focused-hours-0']").should('contain', '0.25 hrs');
    cy.get("[data-test-id='focused-hours-1']").should('contain', '0 hrs');
  });

  it('renders total focused hours across all rows', () => {
    cy.get("[data-test-id='focused-hours-total']").should('contain', '0.25 hrs');
    cy.get('[data-test-id="0-40"]').trigger('pointerdown', { button: 0 });
    cy.get('[data-test-id="0-40"]').trigger('pointerup');
    cy.get("[data-test-id='focused-hours-total']").should('contain', '0.5 hrs');
  });

  it('drag fills multiple ticks and ends on mouseup', () => {
    cy.get('[data-test-id="0-40"][data-tick-state="empty"]');
    cy.get('[data-test-id="0-41"][data-tick-state="empty"]');
    cy.get('[data-test-id="0-42"][data-tick-state="empty"]');

    cy.get('[data-test-id="0-40"]').trigger('pointerdown', { button: 0 });
    cy.get('[data-test-id="0-41"]').trigger('pointerover');
    cy.get('[data-test-id="0-42"]').trigger('pointerover');
    cy.get('[data-test-id="0-42"]').trigger('pointerup');

    cy.get('[data-test-id="0-40"][data-tick-state="focused"]');
    cy.get('[data-test-id="0-41"][data-tick-state="focused"]');
    cy.get('[data-test-id="0-42"][data-tick-state="focused"]');
  });

  it('drag clears ticks that are already filled', () => {
    cy.get('[data-test-id="0-31"][data-tick-state="focused"]');
    cy.get('[data-test-id="0-31"]').trigger('pointerdown', { button: 0 });
    cy.get('[data-test-id="0-31"]').trigger('pointerup');
    cy.get('[data-test-id="0-31"][data-tick-state="distracted"]');
  });

  it('drag does not re-apply value to already matching ticks', () => {
    cy.get('[data-test-id="0-40"]').trigger('pointerdown', { button: 0 });
    cy.get('[data-test-id="0-41"]').trigger('pointerover');
    cy.get('[data-test-id="0-41"]').trigger('pointerover'); // second enter on same tick
    cy.get('[data-test-id="0-40"]').trigger('pointerup');
    cy.get('[data-test-id="0-41"][data-tick-state="focused"]');
  });

  it('copy yesterday copies task names into empty slots', () => {
    const YESTERDAY = TODAYS_DATE - 86400000;
    const yesterdaySummary = {
      id: 99, content: 'my yesterday task', date: YESTERDAY, slot: 3, TimerTicks: [],
    };
    cy.window().then((win) => {
      win.localStorage.setItem(
        `${localStoragePrefix}${YESTERDAY}-3`,
        JSON.stringify(yesterdaySummary)
      );
      win.localStorage.setItem(
        `${localStoragePrefix}${YESTERDAY}`,
        JSON.stringify([3])
      );
    });

    cy.get('[data-test-id="copy-yesterday-button"]').click();
    cy.get('[data-test-id="summary-text-3"]').should('have.value', 'my yesterday task');
  });

  it('copy yesterday does not overwrite existing content', () => {
    const YESTERDAY = TODAYS_DATE - 86400000;
    const yesterdaySummary = {
      id: 99, content: 'do not copy this', date: YESTERDAY, slot: 0, TimerTicks: [],
    };
    cy.window().then((win) => {
      win.localStorage.setItem(
        `${localStoragePrefix}${YESTERDAY}-0`,
        JSON.stringify(yesterdaySummary)
      );
      win.localStorage.setItem(
        `${localStoragePrefix}${YESTERDAY}`,
        JSON.stringify([0])
      );
    });

    cy.get('[data-test-id="copy-yesterday-button"]').click();
    cy.get('[data-test-id="summary-text-0"]').should('have.value', 'replace jest with cypress');
  });

  it('shows drag hint on first visit and dismisses on X click', () => {
    cy.wait(1000);
    cy.get('.drag-hint').should('be.visible');
    cy.get('.drag-hint-close').click();
    cy.get('.drag-hint').should('not.exist');
  });

  it('drag hint dismisses when user first drags', () => {
    cy.wait(1000);
    cy.get('.drag-hint').should('be.visible');
    cy.get('[data-test-id="0-50"]').trigger('pointerdown', { button: 0 });
    cy.get('[data-test-id="0-50"]').trigger('pointerup');
    cy.get('.drag-hint').should('not.exist');
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
    cy.get('[data-test-id="0-31"][data-tick-state="focused"]').click();
    cy.get('[data-test-id="0-31"][data-tick-state="distracted"]');

    cy.wrap(null).then(() =>
      cy.wrap(Api.getSummaries(TODAYS_DATE)).then((summaries) =>
        expect(
          (summaries as Summary[])
            .find((s) => s.slot === 0)
            ?.TimerTicks.find((t) => t.tickNumber === 31)?.distracted
        ).to.equal(1)
      )
    );
  });

  it('updates focused hours when a focused tick is changed', () => {
    cy.get("[data-test-id='focused-hours-0']").should('contain', '0.25 hrs');
    cy.get("[data-test-id='0-31']").click();
    cy.get("[data-test-id='focused-hours-0']").should('contain', '0 hrs');
  });

  it('navigates back to today from a previous date', () => {
    // Mock clock at start so todaysDateInt() returns TODAYS_DATE on every re-render
    cy.clock(TODAYS_DATE + new Date().getTimezoneOffset() * 60 * 1000);
    cy.get("[data-test-id='left-nav-clicker']").click();
    cy.get('h2').should('contain', '3-22-2023');
    cy.get("[data-test-id='summary-text-0']").should('have.value', '');

    cy.get("[data-test-id='today-nav-clicker']").click();
    cy.get('h2').should('contain', '3-23-2023');
    cy.get("[data-test-id='summary-text-0']").should(
      'have.value',
      'replace jest with cypress'
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

describe('<Timer /> drag hint already dismissed', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('TimelyTasker:UseLocalStorage', 'yes');
      win.localStorage.setItem('TimelyTasker:DragHintDismissed', 'yes');
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
    );
  });

  it('does not show drag hint when already dismissed', () => {
    cy.wait(1000);
    cy.get('.drag-hint').should('not.exist');
  });
});
