import React from 'react';
import Timer from './Timer';
import { mount } from 'cypress/react';
const TODAYS_DATE = 1679558574481;

beforeEach(() => {
  cy.intercept('/greet', { fixture: 'identity' }).as('getIdentity');
  cy.intercept(`/summaries?date=${TODAYS_DATE}`, { fixture: 'summaries' }).as('getSummaries');
  mount(<Timer date={TODAYS_DATE} leftNavClicker={<div></div>} rightNavClicker={<div></div>} />);
  cy.wait(['@getIdentity', '@getSummaries']);
});

describe('<Timer />', () => {
  it('renders the date', () => {
    cy.get('h2').should('contain', '3-23-2023');

    // check that we scrolled over to the time of day it is
    cy.get("[data-test-id='0-32']", { timeout: 1000 })
      .first()
      .then(($el) => {
        const rect = $el[0].getBoundingClientRect();
        expect(rect.left).to.be.lessThan(390);
      });
  });

  it('renders greeting text', () => {
    cy.get("[data-test-id='greeting']").first().should('contain', 'You are logged in with github.');
  });

  it('renders loaded summary text in the <input>', () => {
    cy.get("[data-test-id='summary-text-0']").first().should('have.value', 'replace jest with cypress');
  });

  it('renders ticks content', () => {
    cy.get('h2').should('contain', '3-23-2023');

    // check that we scrolled over to the time of day it is
    cy.get("[data-test-id='0-32']", { timeout: 1000 })
      .first()
      .then(($el) => {
        const rect = $el[0].getBoundingClientRect();
        expect(rect.left).to.be.lessThan(390);
      });
  });
});
