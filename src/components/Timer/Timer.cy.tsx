import React from 'react';
import Timer from './Timer';
import { mount } from 'cypress/react18';
import summaries from '../../../cypress/fixtures/summaries.json';
import summarySlotTwo from '../../../cypress/fixtures/summarySlotTwo.json';
import summarySlotThree from '../../../cypress/fixtures/summarySlotThree.json';
const TODAYS_DATE = 1679558574481; // at the zero h:m:s
const TIME_NOW = 1679587374481; // at 9 am

beforeEach(() => {
  cy.intercept('GET', '/greet', { fixture: 'identity' }).as('getIdentity');
  cy.intercept('GET', `/summaries?date=${TODAYS_DATE}`, { fixture: 'summaries' }).as('getSummaries');
  // we made these stamps in gmt-700 which is 420 minutes of offset
  const now = TIME_NOW - 420 * 60 * 1000;
  const useCurrentTime = now + new Date().getTimezoneOffset() * 60 * 1000;
  mount(
    <div className="App">
      <header>timely tasker</header>
      <Timer
        date={TODAYS_DATE}
        currentTime={new Date(useCurrentTime)}
        leftNavClicker={<div></div>}
        rightNavClicker={<div></div>}
      />
    </div>,
  );
  cy.wait(['@getIdentity', '@getSummaries']);
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
    cy.get("[data-test-id='0-36']")
      .first()
      .then(($el) => {
        const rect = $el[0].getBoundingClientRect();
        expect(rect.x).to.be.lessThan(470);
        expect(rect.x).to.be.greaterThan(450);
      });
  });

  it('renders ticks that interact with each other as intended, setting other ticks in the colum to distracted', () => {
    cy.intercept('POST', `/ticks?summary=${summaries[1].ID}&tick=31&distracted=0`, { fixture: 'tick' }).as(
      'createTick',
    );
    cy.intercept('POST', `/ticks?summary=${summaries[0].ID}&tick=31&distracted=1`, { fixture: 'tickRelated' }).as(
      'updateRelatedTick',
    );
    cy.intercept('POST', `/ticks?summary=${summaries[1].ID}&tick=31&distracted=1`, { fixture: 'tickDistracted' }).as(
      'updateTickDistracted',
    );
    cy.get("[data-test-id='0-31']")
      .first()
      .then(($el) => {
        expect($el[0].className).to.contain('Timer_tictac_focused');
      });

    cy.get("[data-test-id='1-31']")
      .first()
      .then(($el) => {
        expect($el[0].className).to.contain('Timer_tictac_empty');
        $el[0].click();
      });

    cy.wait(['@createTick', '@updateRelatedTick', '@updateTickDistracted']);

    cy.get('div[class*="Timer_tictac_distracted"][data-test-id="1-31"]', { timeout: 2000 });
  });

  it('renders a summary input that doesnt cause problems on debounce/update', () => {
    const targetText = summarySlotTwo.Content;
    const incompleteText = targetText.slice(0, targetText.length - 2);

    cy.intercept('POST', `/summaries?date=${TODAYS_DATE}&text=${encodeURIComponent(incompleteText)}&slot=2`, {
      fixture: 'summarySlotTwoIncomplete',
    }).as('createSummaryIncomplete');

    cy.intercept('POST', `/summaries?date=${TODAYS_DATE}&text=${encodeURIComponent(targetText)}&slot=2`, {
      fixture: 'summarySlotTwo',
    }).as('createSummaryComplete');

    cy.clock();
    cy.get("[data-test-id='summary-text-2']").type(incompleteText);
    cy.tick(810);

    cy.get("[data-test-id='summary-text-2']").type(targetText.slice(targetText.length - 2));

    cy.get("[data-test-id='summary-text-2']").then(($el) => {
      expect($el[0].getAttribute('value')).to.equal(targetText);
    });
  });

  it('ticking a box should not erase the newly entered summary', () => {
    cy.intercept('POST', `/summaries?date=${TODAYS_DATE}&text=Hello&slot=3`, {
      fixture: 'summarySlotThree',
    }).as('createSummaryNew');

    cy.intercept('POST', `/ticks?summary=${summarySlotThree.ID}&tick=33&distracted=0`, {
      fixture: 'summarySlotThreeTick',
    }).as('createTick');

    cy.get("[data-test-id='summary-text-3']").type('Hello');

    cy.wait(['@createSummaryNew']);

    cy.get("[data-test-id='3-33']").click();

    cy.wait(['@createTick']);

    cy.get('div[class*="Timer_tictac_focused"][data-test-id="3-33"]', { timeout: 2000 });
    cy.get("[data-test-id='summary-text-3']").then(($el) => {
      expect($el[0].getAttribute('value')).to.equal('Hello');
    });
  });
});
