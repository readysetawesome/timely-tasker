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

const TODAYS_DATE = 1679529600000; // at the zero h:m:s  (Thu March 23, 2023)
const TIME_NOW = 1679587374481; // at 9 am
const ONE_DAY = 86400000;
// TODAYS_DATE is Thursday; week start (last Saturday) = 5 days prior
const WEEK_START = TODAYS_DATE - 5 * ONE_DAY;

beforeEach(() => {
  cy.intercept('GET', '/greet', { fixture: 'identity' }).as('getIdentity');
  cy.intercept('GET', `/summaries?date=${TODAYS_DATE}`, {
    fixture: 'summaries',
  }).as('getSummaries');
  // WeekTotal fetches only prior days; today's hours come from live Redux state
  cy.intercept(
    'GET',
    `/summaries?startDate=${WEEK_START}&endDate=${TODAYS_DATE - ONE_DAY}`,
    { body: [] }
  ).as('getWeekSummaries');
  cy.intercept('GET', '/preferences', { body: {} }).as('getPreferences');
  cy.intercept('POST', '/preferences', (req) => { req.reply({ body: req.body }); }).as('setPreference');

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

  it('logout clears session and shows storage selection without auto-redirecting', () => {
    cy.intercept('POST', '/logout', { statusCode: 200, body: { success: true } }).as('logout');

    cy.get("[data-test-id='logout-button']").click();

    cy.wait(['@logout']);

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

  it('renders week total combining prior days (api) + today (redux)', () => {
    // Prior days return empty; today's 1 focused tick comes from live Redux state → 0.25 hrs
    cy.get("[data-test-id='week-total']").should('contain', 'Week: 0.25 hrs');
  });

  it('renders month view link', () => {
    cy.get("[data-test-id='month-view-link']").should('exist');
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

  it('auto-scrolls to current hour on load so ticks are visible', () => {
    // TIME_NOW = 9am → target tick = 32 (8am). Tick 36 (9am) is 4 ticks to the right.
    // Verify tick 36 is visible in the viewport (not off-screen left or right).
    cy.get("[data-test-id='0-36']")
      .first()
      .should(($el) => {
        const rect = $el[0].getBoundingClientRect();
        expect(rect.x).to.be.lessThan(900);
        expect(rect.x).to.be.greaterThan(200);
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

  it('arrow up on first row does nothing', () => {
    cy.get("[data-test-id='summary-text-0']").focus();
    cy.get("[data-test-id='summary-text-0']").trigger('keydown', { key: 'ArrowUp' });
    cy.focused().should('have.attr', 'data-test-id', 'summary-text-0');
  });

  it('arrow down on last row adds a new row and moves focus to it', () => {
    cy.get("[data-test-id='summary-text-12']").should('not.exist');
    cy.get("[data-test-id='summary-text-11']").focus();
    cy.get("[data-test-id='summary-text-11']").trigger('keydown', { key: 'ArrowDown' });
    cy.get("[data-test-id='summary-text-12']").should('exist');
    cy.focused().should('have.attr', 'data-test-id', 'summary-text-12');
  });

  it('auto-scrolls to midpoint of activity window when navigating to a past day', () => {
    // Ticks at 40 (10am) and 56 (2pm) → midpoint = 48 (noon).
    // Midpoint tick 48 should be centered: viewport=1100, left col≈200 → center≈650px.
    // No cy.clock() here — freezing timers blocks React's scheduler, preventing the re-render
    // that triggers the scroll effect after summaries load.
    const previousDate = TODAYS_DATE - ONE_DAY;
    cy.intercept('GET', `/summaries?date=${previousDate}`, {
      fixture: 'summariesPastActivity',
    }).as('getSummariesPastActivity');

    cy.get("[data-test-id='left-nav-clicker']").click();
    cy.wait(['@getSummariesPastActivity']);

    // .should() retries until the scroll effect fires after the re-render.
    cy.get("[data-test-id='0-48']")
      .first()
      .should(($el) => {
        const rect = $el[0].getBoundingClientRect();
        expect(rect.x).to.be.lessThan(800);
        expect(rect.x).to.be.greaterThan(400);
      });
  });

  it('copy summary button copies formatted text to clipboard', () => {
    // Navigate to yesterday with 2 focused-tick tasks so sort comparator executes
    cy.intercept('GET', `/summaries?date=${TODAYS_DATE - ONE_DAY}`, {
      body: [
        { ...summaries[0], date: TODAYS_DATE - ONE_DAY, TimerTicks: [
          { id: 1, userId: 1, date: TODAYS_DATE - ONE_DAY, tickNumber: 31, distracted: 0, summaryId: 75 },
          { id: 2, userId: 1, date: TODAYS_DATE - ONE_DAY, tickNumber: 32, distracted: 0, summaryId: 75 },
          { id: 3, userId: 1, date: TODAYS_DATE - ONE_DAY, tickNumber: 33, distracted: 0, summaryId: 75 },
        ]},
        { ...summaries[1], content: 'other task', date: TODAYS_DATE - ONE_DAY, TimerTicks: [
          { id: 4, userId: 1, date: TODAYS_DATE - ONE_DAY, tickNumber: 40, distracted: 0, summaryId: 76 },
        ]},
      ],
    }).as('getSummaries2');
    cy.intercept('GET', /\/summaries\?startDate=/, { body: [] });
    cy.get('[data-test-id="left-nav-clicker"]').click();
    cy.wait('@getSummaries2');
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText').resolves().as('clipboardWrite');
    });
    cy.get('[data-test-id="copy-summary-button"]').click();
    cy.get('@clipboardWrite').should('have.been.calledOnce');
    cy.get('@clipboardWrite').should(
      'have.been.calledWith',
      'replace jest with cypress: 0.75h focused\nother task: 0.25h focused\nTotal: 1h focused'
    );
    cy.get('[data-test-id="copy-summary-button"]').should('contain', 'Copied!');
  });

  it('copy summary button is disabled when no focused ticks exist', () => {
    cy.intercept('GET', `/summaries?date=${TODAYS_DATE - ONE_DAY}`, { body: [] }).as('blankDay');
    cy.intercept('GET', /\/summaries\?startDate=/, { body: [] });
    cy.get('[data-test-id="left-nav-clicker"]').click();
    cy.wait('@blankDay');
    cy.get('[data-test-id="copy-summary-button"]').should('be.disabled');
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

  it('ArrowLeft key navigates to the previous day', () => {
    cy.intercept('GET', `/summaries?date=${TODAYS_DATE - ONE_DAY}`, { body: [] }).as('prevDaySummaries');
    cy.intercept('GET', /\/summaries\?startDate=/, { body: [] });
    cy.get('body').trigger('keydown', { key: 'ArrowLeft', bubbles: true });
    cy.wait('@prevDaySummaries');
    cy.get('h2').should('contain', '3-22-2023');
  });

  it('ArrowRight key navigates to the next day', () => {
    cy.intercept('GET', `/summaries?date=${TODAYS_DATE + ONE_DAY}`, { body: [] }).as('nextDaySummaries');
    cy.intercept('GET', /\/summaries\?startDate=/, { body: [] });
    cy.get('body').trigger('keydown', { key: 'ArrowRight', bubbles: true });
    cy.wait('@nextDaySummaries');
    cy.get('h2').should('contain', '3-24-2023');
  });

  it('t key navigates to today when on a different day', () => {
    const now = TIME_NOW - 420 * 60 * 1000;
    cy.clock(now + new Date().getTimezoneOffset() * 60 * 1000);

    cy.intercept('GET', `/summaries?date=${TODAYS_DATE - ONE_DAY}`, { body: [] }).as('prevDay');
    cy.intercept('GET', `/summaries?date=${TODAYS_DATE}`, { fixture: 'summaries' }).as('todaySummaries');
    cy.intercept('GET', /\/summaries\?startDate=/, { body: [] });

    cy.get('body').trigger('keydown', { key: 'ArrowLeft', bubbles: true });
    cy.wait('@prevDay');
    cy.get('h2').should('contain', '3-22-2023');

    cy.get('body').trigger('keydown', { key: 't', bubbles: true });
    cy.wait('@todaySummaries');
    cy.get('h2').should('contain', '3-23-2023');
  });

  it('keyboard shortcuts do not fire when a summary input is focused', () => {
    cy.get("[data-test-id='summary-text-0']").focus();
    cy.get('body').trigger('keydown', { key: 'ArrowLeft', bubbles: true });
    cy.get('h2').should('contain', '3-23-2023');
  });

  it('daily goal shows "Set daily goal" when no goal is stored', () => {
    cy.get('[data-test-id="daily-goal-set-btn"]').should('exist');
  });

  it('daily goal renders progress bar and total when goal is set in preferences', () => {
    cy.intercept('GET', '/preferences', { body: { dailyGoalHours: 6 } }).as('getPreferencesWithGoal');
    cy.intercept('GET', `/summaries?date=${TODAYS_DATE}`, { fixture: 'summaries' }).as('getSummaries2');
    cy.intercept('GET', `/summaries?startDate=${WEEK_START}&endDate=${TODAYS_DATE - ONE_DAY}`, { body: [] });
    mount(
      <Provider store={storeMaker()}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<App useDate={TODAYS_DATE} />} />
            <Route path="timer" element={<App useDate={TODAYS_DATE} />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
    cy.wait(['@getIdentity', '@getSummaries2', '@getPreferencesWithGoal']);
    cy.get('[data-test-id="daily-goal-bar"]').should('exist');
    cy.get('[data-test-id="daily-goal-target"]').should('contain', '6h');
  });

  it('daily goal can be edited and saves via POST /preferences', () => {
    cy.intercept('GET', '/preferences', { body: { dailyGoalHours: 6 } }).as('getPreferencesWithGoal2');
    cy.intercept('GET', `/summaries?date=${TODAYS_DATE}`, { fixture: 'summaries' }).as('getSummaries3');
    cy.intercept('GET', `/summaries?startDate=${WEEK_START}&endDate=${TODAYS_DATE - ONE_DAY}`, { body: [] });
    mount(
      <Provider store={storeMaker()}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<App useDate={TODAYS_DATE} />} />
            <Route path="timer" element={<App useDate={TODAYS_DATE} />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
    cy.wait(['@getIdentity', '@getSummaries3', '@getPreferencesWithGoal2']);
    cy.get('[data-test-id="daily-goal-target"]').click();
    cy.get('[data-test-id="daily-goal-input"]').clear().type('8');
    cy.get('[data-test-id="daily-goal-input"]').type('{enter}');
    cy.wait('@setPreference').its('request.body').should('deep.equal', { dailyGoalHours: 8 });
    cy.get('[data-test-id="daily-goal-target"]').should('contain', '8h');
  });
});
