import React from 'react';
import Timer from './Timer';
import { mount } from 'cypress/react18';
const TODAYS_DATE = 1679558574481; // at the zero h:m:s
const TIME_NOW = 1679587374481;

beforeEach(() => {
  cy.intercept('GET', '/greet', { fixture: 'identity' }).as('getIdentity');
  cy.intercept('GET', `/summaries?date=${TODAYS_DATE}`, { fixture: 'summaries' }).as('getSummaries');
  mount(
    <div className="App">
      <header>timely tasker</header>
      <Timer date={TODAYS_DATE} currentTime={new Date(TIME_NOW)} leftNavClicker={<div></div>} rightNavClicker={<div></div>} />
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
        expect(rect.x).to.be.lessThan(600);
        expect(rect.x).to.be.greaterThan(400);
      });
  });
});
