/* eslint-disable cypress/no-unnecessary-waiting */
import React from 'react';
import App from '../../App';
import { mount } from 'cypress/react';
import summaries from '../../../cypress/fixtures/summaries.json';
import pastActivitySummaries from '../../../cypress/fixtures/summariesPastActivity.json';

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

  it('clicking sign in with google from storage prompt begins auth flow', () => {
    cy.intercept('GET', '/greet', { fixture: 'identity' }).as('getIdentity');
    cy.intercept('GET', `/summaries?date=${TODAYS_DATE}`, { fixture: 'summaries' }).as('getSummaries');
    cy.get('[data-test-id=use-cloud-storage]').click();
    cy.wait('@getIdentity');
    cy.get("[data-test-id='greeting']").should('contain', 'Logged in with google');
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

  it('does not show week total in localStorage mode', () => {
    cy.get("[data-test-id='week-total']").should('not.exist');
  });

  it('does not show month view link in localStorage mode', () => {
    cy.get("[data-test-id='month-view-link']").should('not.exist');
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

describe('<DatePicker />', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('TimelyTasker:UseLocalStorage', 'yes');
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
    );
  });

  it('opens when clicking the date label', () => {
    cy.get('.tt-date-label').click();
    cy.get('.datepicker').should('be.visible');
  });

  it('closes on Escape key', () => {
    cy.get('.tt-date-label').click();
    cy.get('.datepicker').should('be.visible');
    cy.get('body').type('{esc}');
    cy.get('.datepicker').should('not.exist');
  });

  it('closes on click outside', () => {
    cy.get('.tt-date-label').click();
    cy.get('.datepicker').should('be.visible');
    cy.get('body').click(0, 500);
    cy.get('.datepicker').should('not.exist');
  });

  it('highlights today with the today class', () => {
    cy.clock(TODAYS_DATE + new Date().getTimezoneOffset() * 60 * 1000);
    cy.get('.tt-date-label').click();
    cy.get('.datepicker-day--today').should('exist');
  });

  it('highlights the selected date', () => {
    cy.get('.tt-date-label').click();
    cy.get('.datepicker-day--selected').should('exist');
  });

  it('navigates to a selected day and closes the picker', () => {
    cy.get('.tt-date-label').click();
    cy.get('.datepicker-day--selected').then(($selected) => {
      const prevDay = $selected.prev('.datepicker-day');
      if (prevDay.length) {
        prevDay.click();
        cy.get('.datepicker').should('not.exist');
      }
    });
  });

  it('navigates to the previous month', () => {
    cy.get('.tt-date-label').click();
    cy.get('.datepicker-month-label').invoke('text').then((before) => {
      cy.get('.datepicker-nav').first().click();
      cy.get('.datepicker-month-label').invoke('text').should('not.eq', before);
    });
  });

  it('navigates to the next month', () => {
    cy.get('.tt-date-label').click();
    cy.get('.datepicker-month-label').invoke('text').then((before) => {
      cy.get('.datepicker-nav').last().click();
      cy.get('.datepicker-month-label').invoke('text').should('not.eq', before);
    });
  });

  it('wraps from January to December on prev', () => {
    cy.get('.tt-date-label').click();
    cy.get('.datepicker-month-label').invoke('text').then((text) => {
      const monthNum = new Date(text).getMonth();
      for (let i = 0; i <= monthNum; i++) {
        cy.get('.datepicker-nav').first().click();
      }
      cy.get('.datepicker-month-label').should('contain', 'December');
    });
  });
});

describe('<Timer /> using localStorage, auto-scroll behavior', () => {
  const ONE_DAY = 86400000;
  const PREV_DATE = TODAYS_DATE - ONE_DAY; // 1679443200000

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
      // Previous day: ticks at 40 (10am) and 56 (2pm), midpoint = 48 (noon)
      pastActivitySummaries.forEach((s) =>
        win.localStorage.setItem(
          `${localStoragePrefix + PREV_DATE}-${s.slot}`,
          JSON.stringify(s)
        )
      );
      win.localStorage.setItem(
        localStoragePrefix + PREV_DATE,
        JSON.stringify(pastActivitySummaries.map((s) => s.slot))
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

  it('auto-scrolls to current hour on load so ticks are visible', () => {
    // scrollLeft > 0 proves the grid scrolled past midnight (true any hour after 1am)
    cy.get('[data-test-id="timer-content"]')
      .its('0.scrollLeft')
      .should('be.greaterThan', 0);
  });

  it('auto-scrolls to midpoint of activity when navigating to a past day', () => {
    // Ticks at 40 (10am) and 56 (2pm) → midpoint = 48 (noon).
    // Set clock before navigation so todaysDateInt() stays stable during re-render.
    cy.clock(TODAYS_DATE + new Date().getTimezoneOffset() * 60 * 1000);
    cy.get("[data-test-id='left-nav-clicker']").click();

    cy.get('[data-test-id="timer-content"]')
      .its('0.scrollLeft')
      .should('be.greaterThan', 0);
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

  it('ArrowLeft key navigates to the previous day in localStorage mode', () => {
    cy.get('body').trigger('keydown', { key: 'ArrowLeft', bubbles: true });
    cy.get('h2').should('contain', '3-22-2023');
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
