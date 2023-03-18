import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import React from 'react';

import Timer, { dateDisplay, todaysDateInt } from './Timer';
import { Summary } from '../../../functions/summaries';
import RestApi from "../../RestApi";
import fakeIdentity from "../../../fixtures/identity.json";

const fakeSummaries = [{
  ID: 321,
  UserID: fakeIdentity.UserID,
  Content: "summary",
  Date: todaysDateInt(new Date(2023, 3, 13, 2, 22, 22)),
  Slot: 0,
  TimerTicks: [],
} as Summary ];


const original = RestApi;
const restoreApi = () => {
  return global.RestApi = original;
}

beforeEach(() => {
  RestApi.greet = (callback) => callback(fakeIdentity);
  RestApi.getSummaries = (_, callback) => callback(fakeSummaries);
});

afterEach(() => {
  restoreApi();
});

test('renders the greeting', async () => {
  render(<Timer />);
  expect(await screen.findByText(/Found your login info via github/i)).toBeInTheDocument()
});

test('renders the date', async () => {
  render(<Timer date={todaysDateInt(new Date(2023, 2, 13, 2, 22, 22))} />);
  expect(await screen.findByText(/Showing data for 3-13-2023/i)).toBeInTheDocument()
});

describe("dateDisplay", () => {
  test('renders the date correctly when UTC boundary is crossed for GMT-700 zone', () => {
    const MAR_17 = 1679011200000;
    const ONE_DAY = 86400000;
    // 1679011200000 - 86400000 : should be Mar 16
    expect(dateDisplay(MAR_17 - ONE_DAY)).toBe('3-16-2023')
    // 1679011200000: should be Mar 17
    expect(dateDisplay(MAR_17)).toBe('3-17-2023')
    // 1679011200000 + 86400000 : should be Mar 18
    expect(dateDisplay(MAR_17 + ONE_DAY)).toBe('3-18-2023')
  })
})
