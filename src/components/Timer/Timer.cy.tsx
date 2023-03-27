/* eslint-disable cypress/no-unnecessary-waiting */
import React from 'react';
import App from '../../App';
import { mount } from 'cypress/react18';
import summaries from '../../../cypress/fixtures/summaries.json';
import summarySlotTwo from '../../../cypress/fixtures/summarySlotTwo.json';
import summarySlotThree from '../../../cypress/fixtures/summarySlotThree.json';
import { Provider } from 'react-redux';
import storeMaker from '../../store';

const TODAYS_DATE = 1679529600000; // at the zero h:m:s
const TIME_NOW = 1679587374481; // at 9 am

beforeEach(() => {
  cy.intercept('GET', '/greet', { fixture: 'identity' }).as('getIdentity');
  cy.intercept('GET', `/summaries?date=${TODAYS_DATE}`, { fixture: 'summaries' }).as('getSummaries');
  // we made these stamps in gmt-700 which is 420 minutes of offset
  const now = TIME_NOW - 420 * 60 * 1000;
  const useCurrentTime = now + new Date().getTimezoneOffset() * 60 * 1000;
  cy.clock().then((clock) => clock.setSystemTime(useCurrentTime));

  mount(
    <Provider store={storeMaker()}>
      <App />
    </Provider>,
  ).as('mountedComponent');

  cy.clock().then((clock) => clock.restore());

  cy.wait(0);
  cy.wait(['@getIdentity', '@getSummaries']);
  cy.wait(0);
});

describe('<Timer />', () => {
  it('renders the date', () => {
    cy.get('h2').should('contain', '3-23-2023');
  });

  it('renders greeting text', () => {
    cy.get("[data-test-id='greeting']").first().should('contain', 'You are logged in with github.');
  });

  it('renders loaded summary text in the <input>', () => {
    cy.get("[data-test-id='summary-text-0']").first().should('have.value', 'replace jest with cypress');
  });

  it('renders ticks content', () => {
    // check that we scrolled over to the time of day it is

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(150); // release the thread and allow react hooks to process
    cy.get("[data-test-id='0-36']")
      .first()
      .then(($el) => {
        const rect = $el[0].getBoundingClientRect();
        expect(rect.x).to.be.lessThan(470);
        expect(rect.x).to.be.greaterThan(450);
      });
  });

  it('renders ticks that interact with each other as intended, setting other ticks in the colum to distracted', () => {
    cy.intercept('POST', `/ticks?summary=${summaries[0].ID}&tick=31&distracted=1`, { fixture: 'tickRelated' }).as(
      'updateRelatedTick',
    );
    cy.intercept('POST', `/ticks?summary=${summaries[1].ID}&tick=31&distracted=1`, { fixture: 'tickDistracted' }).as(
      'updateTickDistracted',
    );
    cy.intercept('POST', `/ticks?summary=${summaries[1].ID}&tick=31&distracted=-1`, { fixture: 'tickRemoved' }).as(
      'updateTickRemoved',
    );
    cy.intercept('POST', `/ticks?summary=${summaries[0].ID}&tick=31&distracted=0`, { fixture: 'tick' }).as(
      'updateTickOriginal',
    );
    cy.get("[data-test-id='0-31'][class*=Timer_tictac_focused]");

    cy.get("[data-test-id='1-31'][class*=Timer_tictac_empty]").click();

    cy.wait(['@updateRelatedTick', '@updateTickDistracted']);

    cy.get('div[class*="Timer_tictac_distracted"][data-test-id="0-31"]', { timeout: 2000 });
    cy.get('div[class*="Timer_tictac_distracted"][data-test-id="1-31"]', { timeout: 2000 }).click();

    cy.wait(['@updateTickRemoved', '@updateTickOriginal']);
  });

  it(
    'renders a summary input that doesnt cause problems on debounce/update',
    {
      defaultCommandTimeout: 6000,
    },
    () => {
      const targetText = summarySlotTwo.Content;
      const incompleteText = targetText.slice(0, targetText.length - 1);

      cy.intercept('POST', `/summaries?date=${TODAYS_DATE}&text=${encodeURIComponent(incompleteText)}&slot=2`, {
        fixture: 'summarySlotTwoIncomplete',
      }).as('createSummaryIncomplete');

      cy.intercept('POST', `/summaries?date=${TODAYS_DATE}&text=${encodeURIComponent(targetText)}&slot=2`, {
        fixture: 'summarySlotTwo',
      }).as('createSummaryComplete');

      // use a delay that will, in total, exceed the debounce time, but with intervals that fit in debounce
      cy.get("[data-test-id='summary-text-2']").type(incompleteText);

      cy.wait(['@createSummaryIncomplete']);

      cy.get("[data-test-id='summary-text-2']").type(targetText.slice(targetText.length - 1));

      cy.wait(['@createSummaryComplete']);

      cy.get("[data-test-id='summary-text-2']").then(($el) => {
        expect($el[0].getAttribute('value')).to.equal(targetText);
      });
    },
  );

  it('ticking a box should not erase the newly entered summary', () => {
    cy.intercept('POST', `/summaries?date=${TODAYS_DATE}&text=Hello&slot=3`, {
      fixture: 'summarySlotThree',
    }).as('createSummaryNew');

    cy.intercept('POST', `/ticks?summary=${summarySlotThree.ID}&tick=33&distracted=0`, {
      fixture: 'summarySlotThreeTick',
    }).as('createTick');

    cy.get("[data-test-id='summary-text-3']").type('Hello');

    cy.wait(['@createSummaryNew']);
    cy.wait(0); // Await react state setup on http return

    cy.get("[data-test-id='3-33']").click();

    cy.wait(['@createTick']);

    cy.get('div[class*="Timer_tictac_focused"][data-test-id="3-33"]', { timeout: 200 });

    cy.get("[data-test-id='summary-text-3']").then(($el) => {
      expect($el[0].getAttribute('value')).to.equal('Hello');
    });
  });

  it('ticking a new row before typing should cause dependent summary object create', () => {
    cy.intercept('POST', `/summaries?date=${TODAYS_DATE}&text=&slot=3`, {
      fixture: 'summarySlotThree',
    }).as('createSummaryNew');

    cy.intercept('POST', `/ticks?summary=${summarySlotThree.ID}&tick=33&distracted=0`, {
      fixture: 'summarySlotThreeTick',
    }).as('createTick');

    cy.get("[data-test-id='3-33']").click();

    cy.wait(['@createSummaryNew', '@createTick']);
  });

  it('handles errors with summary create', () => {
    cy.intercept('POST', `/summaries?date=${TODAYS_DATE}&text=Hello&slot=3`, { forceNetworkError: true }).as(
      'createSummaryFail',
    );

    cy.get("[data-test-id='summary-text-3']").type('Hello');

    cy.wait(['@createSummaryFail']);
    cy.get('span[class*=Timer_error]').then(($content) => {
      expect($content).to.contain('Error setting Summary text');
    });
  });

  it('tasks should not leak on nav', () => {
    cy.intercept('POST', `/summaries?date=${TODAYS_DATE}&text=Hello&slot=3`, {
      fixture: 'summarySlotThree',
    }).as('createSummaryNew');

    cy.intercept('GET', `/summaries?date=${TODAYS_DATE - 24 * 60 * 60 * 1000}`, { fixture: 'summariesPast' }).as(
      'getSummariesPast',
    );

    cy.get("[data-test-id='summary-text-3']").type('Hello');

    cy.wait(['@createSummaryNew']);

    cy.get("[data-test-id='left-nav-clicker']").click();

    cy.wait(['@getSummariesPast']);

    cy.get("[data-test-id='summary-text-0'][value='from a previous date'", { timeout: 200 });
    cy.get("[data-test-id='summary-text-1'][value='']", { timeout: 200 });
    cy.get("[data-test-id='summary-text-3'][value='']", { timeout: 200 });
  });

  it('handles errors from summary fetch step on nav', () => {
    cy.intercept('GET', `/summaries?date=${TODAYS_DATE - 24 * 60 * 60 * 1000}`, { forceNetworkError: true }).as(
      'getSummariesFail',
    );
    cy.get('[data-test-id="left-nav-clicker"]').click();
    cy.wait(['@getSummariesFail']);
    cy.get('[class*=Timer_content]').then(($content) => {
      expect($content).to.contain('Error loading Summary text and ticks');
    });
  });
});
