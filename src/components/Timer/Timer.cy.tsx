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
// Timezone-adjusted clock so todaysDateInt() returns TODAYS_DATE on any host timezone
const CLOCK_TIME = TIME_NOW - 420 * 60 * 1000 + new Date().getTimezoneOffset() * 60 * 1000;

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
  cy.intercept('GET', '/pinnedTasks', { body: [] }).as('getPinnedTasks');

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

  it('pin button exists in DOM for rows with text, absent for empty rows', () => {
    // slot 0 has "replace jest with cypress", slot 1 has "other stuff", slot 2 is empty
    cy.get('[data-test-id="pin-btn-0"]').should('exist');
    cy.get('[data-test-id="pin-btn-1"]').should('exist');
    cy.get('[data-test-id="pin-btn-2"]').should('not.exist');
  });

  it('pin button is not pinned by default', () => {
    cy.get('[data-test-id="pin-btn-0"]').should('have.attr', 'data-pinned', 'false');
  });

  it('pin button pins a task via POST /pinnedTasks and shows as active', () => {
    cy.intercept('POST', '/pinnedTasks', { body: { id: 1, text: 'replace jest with cypress', position: 0 } }).as('pinTask');
    cy.get('[data-test-id="pin-btn-0"]').click();
    cy.wait('@pinTask');
    cy.get('[data-test-id="pin-btn-0"]').should('have.attr', 'data-pinned', 'true');
  });

  it('pin button unpins an already-pinned task via DELETE /pinnedTasks', () => {
    cy.intercept('GET', '/pinnedTasks', { fixture: 'pinnedTasks' }).as('getPinnedTasksFilled');
    cy.intercept('GET', `/summaries?date=${TODAYS_DATE}`, { fixture: 'summaries' }).as('getSummaries4');
    cy.intercept('GET', `/summaries?startDate=${WEEK_START}&endDate=${TODAYS_DATE - ONE_DAY}`, { body: [] });
    cy.intercept('DELETE', '/pinnedTasks*', { body: { success: true } }).as('unpinTask');
    cy.clock(CLOCK_TIME);
    mount(
      <Provider store={storeMaker()}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<App useDate={TODAYS_DATE} />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
    cy.wait(['@getIdentity', '@getSummaries4']);

    // Type the pinned text "Deep work" into slot 0 so it matches a pinned task
    cy.get('[data-test-id="summary-text-0"]').clear().type('Deep work');
    cy.get('[data-test-id="pin-btn-0"]').should('have.attr', 'data-pinned', 'true');
    cy.get('[data-test-id="pin-btn-0"]').click();
    cy.wait('@unpinTask').its('request.url').should('include', 'id=1');
    cy.get('[data-test-id="pin-btn-0"]').should('have.attr', 'data-pinned', 'false');
  });

  it('auto-populates pinned tasks on an empty day', () => {
    cy.intercept('GET', '/pinnedTasks', { fixture: 'pinnedTasks' }).as('getPinnedTasksForEmpty');
    cy.intercept('GET', `/summaries?date=${TODAYS_DATE}`, { body: [] }).as('getEmptySummaries');
    cy.intercept('GET', `/summaries?startDate=${WEEK_START}&endDate=${TODAYS_DATE - ONE_DAY}`, { body: [] });
    cy.intercept('POST', '/summaries*', (req) => {
      const url = new URL(req.url, 'http://localhost');
      const slot = Number(url.searchParams.get('slot'));
      const text = url.searchParams.get('text') ?? '';
      req.reply({ body: { id: 10 + slot, slot, date: TODAYS_DATE, content: text, TimerTicks: [] } });
    }).as('createPinnedSummary');
    cy.clock(CLOCK_TIME);
    mount(
      <Provider store={storeMaker()}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<App useDate={TODAYS_DATE} />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
    cy.wait(['@getIdentity', '@getEmptySummaries']);
    cy.wait('@createPinnedSummary');
    cy.wait('@createPinnedSummary');
    cy.get('[data-test-id="summary-text-0"]').should('have.value', 'Deep work');
    cy.get('[data-test-id="summary-text-1"]').should('have.value', 'Email / comms');
  });

  it('does not auto-populate pinned tasks on a non-today empty day', () => {
    const YESTERDAY = TODAYS_DATE - ONE_DAY;
    cy.intercept('GET', '/pinnedTasks', { fixture: 'pinnedTasks' }).as('getPinnedNonToday');
    cy.intercept('GET', `/summaries?date=${YESTERDAY}`, { body: [] }).as('getYesterdayEmpty');
    cy.intercept('GET', `/summaries?startDate=${WEEK_START}&endDate=${YESTERDAY - ONE_DAY}`, { body: [] });
    cy.intercept('POST', '/summaries*').as('createSummary');
    mount(
      <Provider store={storeMaker()}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<App useDate={YESTERDAY} />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
    cy.wait(['@getIdentity', '@getYesterdayEmpty']);
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(300);
    cy.get('@createSummary.all').should('have.length', 0);
    cy.get('[data-test-id="summary-text-0"]').should('have.value', '');
  });

  it('pin button is a read-only indicator on non-today days when text matches a pin', () => {
    const YESTERDAY = TODAYS_DATE - ONE_DAY;
    const yesterdaySummaries = [
      { id: 100, slot: 0, date: YESTERDAY, content: 'Deep work', TimerTicks: [] },
    ];
    cy.intercept('GET', '/pinnedTasks', { fixture: 'pinnedTasks' }).as('getPinnedReadonly');
    cy.intercept('GET', `/summaries?date=${YESTERDAY}`, { body: yesterdaySummaries }).as('getYesterdaySummaries');
    cy.intercept('GET', `/summaries?startDate=${WEEK_START}&endDate=${YESTERDAY - ONE_DAY}`, { body: [] });
    mount(
      <Provider store={storeMaker()}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<App useDate={YESTERDAY} />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
    cy.wait(['@getIdentity', '@getYesterdaySummaries']);
    cy.get('[data-test-id="pin-btn-0"]').should('exist');
    cy.get('[data-test-id="pin-btn-0"]').should('have.attr', 'data-pinned', 'true');
    cy.get('[data-test-id="pin-btn-0"]').should('have.attr', 'data-readonly', 'true');
  });

  it('editing an auto-populated pinned task on today updates the pin via PUT /pinnedTasks', () => {
    cy.intercept('GET', '/pinnedTasks', { fixture: 'pinnedTasks' }).as('getPinnedForUpdate');
    cy.intercept('GET', `/summaries?date=${TODAYS_DATE}`, { body: [] }).as('getEmptyForUpdate');
    cy.intercept('GET', `/summaries?startDate=${WEEK_START}&endDate=${TODAYS_DATE - ONE_DAY}`, { body: [] });
    cy.intercept('POST', '/summaries*', (req) => {
      const url = new URL(req.url, 'http://localhost');
      const slot = Number(url.searchParams.get('slot'));
      const text = url.searchParams.get('text') ?? '';
      req.reply({ body: { id: 10 + slot, slot, date: TODAYS_DATE, content: text, TimerTicks: [] } });
    }).as('createSummary');
    cy.intercept('PUT', '/pinnedTasks', (req) => {
      req.reply({ body: { id: req.body.id, text: req.body.text, position: 0 } });
    }).as('updatePin');
    cy.clock(CLOCK_TIME);
    mount(
      <Provider store={storeMaker()}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<App useDate={TODAYS_DATE} />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
    cy.wait(['@getIdentity', '@getEmptyForUpdate']);
    cy.wait(['@createSummary', '@createSummary']);
    cy.get('[data-test-id="summary-text-0"]').should('have.value', 'Deep work');
    cy.get('[data-test-id="summary-text-0"]').focus().type(' session');
    cy.tick(1000); // advance past 800ms debounce (clock is frozen by cy.clock)
    cy.wait('@updatePin').its('request.body').should('deep.equal', { id: 1, text: 'Deep work session' });
  });

  it('pins panel allows reordering pins via PATCH /pinnedTasks', () => {
    cy.intercept('GET', '/pinnedTasks', { fixture: 'pinnedTasks' }).as('getPinnedForReorder');
    cy.intercept('GET', `/summaries?date=${TODAYS_DATE}`, { fixture: 'summaries' }).as('getSummariesReorder');
    cy.intercept('GET', `/summaries?startDate=${WEEK_START}&endDate=${TODAYS_DATE - ONE_DAY}`, { body: [] });
    cy.intercept('PATCH', '/pinnedTasks', (req) => {
      req.reply({
        body: req.body.orderedIds.map((id: number, position: number) => ({
          id,
          text: id === 1 ? 'Deep work' : 'Email / comms',
          position,
        })),
      });
    }).as('reorderPins');
    cy.clock(CLOCK_TIME);
    mount(
      <Provider store={storeMaker()}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<App useDate={TODAYS_DATE} />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
    cy.wait(['@getIdentity', '@getSummariesReorder']);
    cy.get('[data-test-id="pins-panel-toggle"]').click();
    cy.get('[data-test-id="pins-panel"]').should('be.visible');
    cy.get('[data-test-id="pin-item-0"]').should('contain', 'Deep work');
    cy.get('[data-test-id="pin-item-1"]').should('contain', 'Email / comms');
    cy.get('[data-test-id="pin-move-down-0"]').click();
    cy.wait('@reorderPins').its('request.body').should('deep.equal', { orderedIds: [2, 1] });
    cy.get('[data-test-id="pin-item-0"]').should('contain', 'Email / comms');
    cy.get('[data-test-id="pin-item-1"]').should('contain', 'Deep work');
    // move-up brings it back
    cy.get('[data-test-id="pin-move-up-1"]').click();
    cy.wait('@reorderPins').its('request.body').should('deep.equal', { orderedIds: [1, 2] });
    // clicking outside the panel dismisses it
    cy.get('body').click(0, 0);
    cy.get('[data-test-id="pins-panel"]').should('not.exist');
  });
});
