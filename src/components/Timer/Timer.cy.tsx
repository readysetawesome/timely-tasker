/* eslint-disable cypress/no-unnecessary-waiting */
import React from 'react';
import App from '../../App';
import { mount } from 'cypress/react';
import summaries from '../../../cypress/fixtures/summaries.json';
import summarySlotTwo from '../../../cypress/fixtures/summarySlotTwo.json';
import summarySlotThree from '../../../cypress/fixtures/summarySlotThree.json';
import { Provider } from 'react-redux';
import storeMaker from '../../store';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const TODAYS_DATE = 1679529600000; // at the zero h:m:s
const TIME_NOW = 1679587374481; // at 9 am

beforeEach(() => {
  cy.intercept('GET', '/greet', { fixture: 'identity' }).as('getIdentity');
  cy.intercept('GET', `/summaries?date=${TODAYS_DATE}`, {
    fixture: 'summaries',
  }).as('getSummaries');

  cy.window().then((win) =>
    win.localStorage.setItem('TimelyTasker:UseLocalStorage', 'no')
  );

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

  cy.wait(['@getIdentity', '@getSummaries']);
});

describe('<Timer />', () => {
  it('renders the date', () => {
    cy.get('h2').should('contain', '3-23-2023');
  });

  it('renders greeting text', () => {
    cy.get("[data-test-id='greeting']")
      .first()
      .should('contain', 'Logged in with google');
  });

  it('logout clears session and shows storage selection without auto-redirecting', () => {
    cy.intercept('POST', '/logout', { statusCode: 200, body: { success: true } }).as('logout');

    cy.get("[data-test-id='logout-button']").click();

    cy.wait(['@logout']);

    cy.get("[data-test-id='greeting']").should('have.text', '');
    cy.get("[data-test-id='logout-button']").should('not.exist');
    cy.get("[data-test-id='use-cloud-storage']");
    cy.get("[data-test-id='use-local-storage']");
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
  });

  it('drag fills multiple ticks', () => {
    cy.intercept('POST', `/ticks?summary=${summaries[0].id}&tick=40&distracted=0`, { fixture: 'tick' }).as('tick40');
    cy.intercept('POST', `/ticks?summary=${summaries[0].id}&tick=41&distracted=0`, { fixture: 'tick' }).as('tick41');

    cy.get('[data-test-id="0-40"][data-tick-state="empty"]');
    cy.get('[data-test-id="0-40"]').trigger('pointerdown', { button: 0 });
    cy.get('[data-test-id="0-41"]').trigger('pointerover');
    cy.get('[data-test-id="0-41"]').trigger('pointerup');

    cy.get('[data-test-id="0-40"][data-tick-state="focused"]');
    cy.get('[data-test-id="0-41"][data-tick-state="focused"]');
  });

  it('drag clears already-filled ticks', () => {
    cy.intercept('POST', `/ticks?summary=${summaries[0].id}&tick=31&distracted=1`, { fixture: 'tickRelated' }).as('tick31distracted');

    cy.get('[data-test-id="0-31"][data-tick-state="focused"]');
    cy.get('[data-test-id="0-31"]').trigger('pointerdown', { button: 0 });
    cy.get('[data-test-id="0-31"]').trigger('pointerup');
    cy.get('[data-test-id="0-31"][data-tick-state="distracted"]');
  });

  it('renders ticks content', () => {
    cy.get("[data-test-id='0-36']")
      .first()
      .then(($el) => {
        const rect = $el[0].getBoundingClientRect();
          expect(rect.x).to.be.lessThan(700);
          expect(rect.x).to.be.greaterThan(50);
      });
  });

  it('renders ticks that interact with each other as intended, setting other ticks in the colum to distracted', () => {
    cy.intercept(
      'POST',
      `/ticks?summary=${summaries[0].id}&tick=31&distracted=1`,
      { fixture: 'tickRelated' }
    ).as('updateRelatedTick');
    cy.intercept(
      'POST',
      `/ticks?summary=${summaries[1].id}&tick=31&distracted=1`,
      { fixture: 'tickDistracted' }
    ).as('updateTickDistracted');
    cy.intercept(
      'POST',
      `/ticks?summary=${summaries[1].id}&tick=31&distracted=-1`,
      { fixture: 'tickRemoved' }
    ).as('updateTickRemoved');
    cy.intercept(
      'POST',
      `/ticks?summary=${summaries[0].id}&tick=31&distracted=0`,
      { fixture: 'tick' }
    ).as('updateTickOriginal');
    cy.get("[data-test-id='0-31'][data-tick-state='focused']");

    cy.get("[data-test-id='1-31'][data-tick-state='empty']").click();

    cy.wait(['@updateRelatedTick', '@updateTickDistracted']);

    cy.get('[data-test-id="0-31"][data-tick-state="distracted"]');
    cy.get('[data-test-id="1-31"][data-tick-state="distracted"]').click();

    cy.wait(['@updateTickRemoved', '@updateTickOriginal']);
  });

  it('renders a summary input that doesnt cause problems on debounce/update', () => {
    const targetText = summarySlotTwo.content;
    const incompleteText = targetText.slice(0, targetText.length - 1);

    cy.intercept(
      'POST',
      `/summaries?date=${TODAYS_DATE}&text=${encodeURIComponent(
        incompleteText
      )}&slot=2`,
      {
        fixture: 'summarySlotTwoIncomplete',
      }
    ).as('createSummaryIncomplete');

    cy.intercept(
      'POST',
      `/summaries?date=${TODAYS_DATE}&text=${encodeURIComponent(
        targetText
      )}&slot=2`,
      {
        fixture: 'summarySlotTwo',
      }
    ).as('createSummaryComplete');

    cy.get("[data-test-id='summary-text-2']").type(incompleteText);

    cy.wait(['@createSummaryIncomplete']);

    cy.get("[data-test-id='summary-text-2']").type(
      targetText.slice(targetText.length - 1)
    );

    cy.wait(['@createSummaryComplete']);

    cy.get(`[data-test-id='summary-text-2'][value='${targetText}']`);
  });

  it('ticking a box should not erase the newly entered summary', () => {
    cy.intercept('POST', `/summaries?date=${TODAYS_DATE}&text=Hi&slot=3`, {
      fixture: 'summarySlotThree',
    }).as('createSummaryNew');

    cy.intercept(
      'POST',
      `/ticks?summary=${summarySlotThree.id}&tick=33&distracted=0`,
      {
        fixture: 'summarySlotThreeTick',
      }
    ).as('createTick');

    cy.get("[data-test-id='summary-text-3']").type('Hi');

    cy.wait(['@createSummaryNew']);

    cy.get("[data-test-id='3-33']").click();

    cy.wait(['@createTick']);

    cy.get('[data-test-id="3-33"][data-tick-state="focused"]');

    cy.get("[data-test-id='summary-text-3'][value=Hi]");
  });

  it('ticking a new row before typing should cause dependent summary object create', () => {
    cy.intercept('POST', `/summaries?date=${TODAYS_DATE}&text=&slot=3`, {
      fixture: 'summarySlotThree',
    }).as('createSummaryNew');

    cy.intercept(
      'POST',
      `/ticks?summary=${summarySlotThree.id}&tick=33&distracted=0`,
      {
        fixture: 'summarySlotThreeTick',
      }
    ).as('createTick');

    cy.get("[data-test-id='3-33']").click();

    cy.wait(['@createSummaryNew', '@createTick']);
  });

  it('handles errors with tick click', () => {
    cy.intercept(
      'POST',
      `/ticks?summary=${summaries[0].id}&tick=31&distracted=1`,
      { forceNetworkError: true }
    ).as('updateTickFail');

    cy.get("[data-test-id='0-31']").click();

    cy.wait(['@updateTickFail']);

    cy.get("[data-test-id='0-31'][data-tick-state='focused']");
  });

  it('handles errors with summary create', () => {
    cy.intercept('POST', `/summaries?date=${TODAYS_DATE}&text=Hello&slot=3`, {
      forceNetworkError: true,
    }).as('createSummaryFail');

    cy.get("[data-test-id='summary-text-3']").type('Hello');

    cy.wait(['@createSummaryFail']);
    cy.get('[data-test-id="timer-error"]');
  });

  it('tasks should not leak on nav', () => {
    cy.intercept('POST', `/summaries?date=${TODAYS_DATE}&text=Hello&slot=3`, {
      fixture: 'summarySlotThree',
    }).as('createSummaryNew');

    cy.intercept(
      'GET',
      `/summaries?date=${TODAYS_DATE - 24 * 60 * 60 * 1000}`,
      { fixture: 'summariesPast' }
    ).as('getSummariesPast');

    cy.get("[data-test-id='summary-text-3']").type('Hello');

    cy.wait(['@createSummaryNew']);

    cy.get("[data-test-id='left-nav-clicker']").click();

    cy.wait(['@getSummariesPast']);

    cy.get("[data-test-id='summary-text-0'][value='from a previous date'");
    cy.get("[data-test-id='summary-text-1'][value='']");
    cy.get("[data-test-id='summary-text-3'][value='']");
  });

  it('handles errors from summary fetch step on nav', () => {
    cy.intercept(
      'GET',
      `/summaries?date=${TODAYS_DATE + 24 * 60 * 60 * 1000}`,
      { forceNetworkError: true }
    ).as('getSummariesFail');
    cy.get('[data-test-id="right-nav-clicker"]').click();
    cy.wait(['@getSummariesFail']);
    cy.get('[data-test-id="timer-content"] [data-test-id="timer-error"]');
  });

  it('shows session-expired banner when summaries returns auth error', () => {
    cy.intercept(
      'GET',
      `/summaries?date=${TODAYS_DATE + 24 * 60 * 60 * 1000}`,
      { body: { error: 'invalid user session' } }
    ).as('getSummariesExpired');

    cy.get('[data-test-id="right-nav-clicker"]').click();
    cy.wait(['@getSummariesExpired']);

    cy.get('[data-test-id="session-expired-error"]').should('be.visible');
    cy.get('[data-test-id="relogin-button"]').should('be.visible');
    cy.get('[data-test-id="timer-error"]').should('not.exist');
  });

  it('re-login button calls greet to get an authorization URL', () => {
    cy.intercept(
      'GET',
      `/summaries?date=${TODAYS_DATE + 24 * 60 * 60 * 1000}`,
      { body: { error: 'invalid user session' } }
    ).as('getSummariesExpired');

    cy.get('[data-test-id="right-nav-clicker"]').click();
    cy.wait(['@getSummariesExpired']);

    // Set up greet intercept only after banner appears — the date-change greet call has
    // already completed by the time we waited for the summaries response above.
    // Use the identity fixture (not authorizeUrl) to avoid a window.location redirect
    // that would break subsequent tests in the component test runner.
    cy.get('[data-test-id="relogin-button"]').should('be.visible');
    cy.intercept('GET', '/greet', { fixture: 'identity' }).as('greetRelogin');
    cy.get('[data-test-id="relogin-button"]').click();
    cy.wait(['@greetRelogin']);
  });

  it('arrow down moves focus to the next summary input and selects all', () => {
    cy.get("[data-test-id='summary-text-0']").focus();
    cy.get("[data-test-id='summary-text-0']").trigger('keydown', { key: 'ArrowDown' });
    cy.focused().should('have.attr', 'data-test-id', 'summary-text-1');
    cy.focused().then(($el) => {
      const el = $el[0] as HTMLInputElement;
      expect(el.selectionStart).to.equal(0);
      expect(el.selectionEnd).to.equal(el.value.length);
    });
  });

  it('arrow up moves focus to the previous summary input and selects all', () => {
    cy.get("[data-test-id='summary-text-2']").focus();
    cy.get("[data-test-id='summary-text-2']").trigger('keydown', { key: 'ArrowUp' });
    cy.focused().should('have.attr', 'data-test-id', 'summary-text-1');
    cy.focused().then(($el) => {
      const el = $el[0] as HTMLInputElement;
      expect(el.selectionStart).to.equal(0);
      expect(el.selectionEnd).to.equal(el.value.length);
    });
  });

  it('arrow up on first row and arrow down on last row do nothing', () => {
    cy.get("[data-test-id='summary-text-0']").focus();
    cy.get("[data-test-id='summary-text-0']").trigger('keydown', { key: 'ArrowUp' });
    cy.focused().should('have.attr', 'data-test-id', 'summary-text-0');

    cy.get("[data-test-id='summary-text-11']").focus();
    cy.get("[data-test-id='summary-text-11']").trigger('keydown', { key: 'ArrowDown' });
    cy.focused().should('have.attr', 'data-test-id', 'summary-text-11');
  });

  it('navigates back to today from a previous date', () => {
    // Mock clock before any navigation so todaysDateInt() returns TODAYS_DATE
    // on every re-render, including after clicking left nav
    const now = TIME_NOW - 420 * 60 * 1000;
    cy.clock(now + new Date().getTimezoneOffset() * 60 * 1000);

    const previousDate = TODAYS_DATE - 24 * 60 * 60 * 1000;
    cy.intercept('GET', `/summaries?date=${previousDate}`, {
      fixture: 'summariesPast',
    }).as('getSummariesPastForTodayNav');
    cy.intercept('GET', `/summaries?date=${TODAYS_DATE}`, {
      fixture: 'summaries',
    }).as('getSummariesTodayFromNav');

    cy.get("[data-test-id='left-nav-clicker']").click();
    cy.wait(['@getSummariesPastForTodayNav']);
    cy.get('h2').should('contain', '3-22-2023');

    cy.get("[data-test-id='today-nav-clicker']").click();
    cy.wait(['@getSummariesTodayFromNav']);
    cy.get('h2').should('contain', '3-23-2023');
  });
});
