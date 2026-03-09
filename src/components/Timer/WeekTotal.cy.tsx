import React from 'react';
import { mount } from 'cypress/react';
import { Provider } from 'react-redux';
import storeMaker from '../../store';
import WeekTotal from './WeekTotal';
import RestApi from '../../RestApi';

const DATE = 1679529600000; // Thursday March 23, 2023
const ONE_DAY = 86400000;
const WEEK_START = DATE - 5 * ONE_DAY; // Saturday March 18
const PRIOR_DAYS_URL = `/summaries?startDate=${WEEK_START}&endDate=${DATE - ONE_DAY}`;

const Wrapper = ({ date }: { date: number }) => (
  <Provider store={storeMaker()}>
    <WeekTotal useApi={RestApi} date={date} />
  </Provider>
);

describe('<WeekTotal />', () => {
  it('counts prior-day focused ticks toward the weekly total', () => {
    cy.intercept('GET', PRIOR_DAYS_URL, {
      body: [{ id: 1, content: 'task', date: WEEK_START, slot: 0, TimerTicks: [{ tickNumber: 8, distracted: 0 }] }],
    }).as('getRange');
    mount(<Wrapper date={DATE} />);
    cy.wait('@getRange');
    // 1 focused prior tick (0.25 hrs) + 0 Redux hours today = 0.25 hrs
    cy.get("[data-test-id='week-total']").should('contain', 'Week: 0.25 hrs');
  });
});
