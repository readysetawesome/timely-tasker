import { render, fireEvent, getByTestId, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import React, { Dispatch } from 'react';
import { act } from 'react-dom/test-utils';
import { Identity, Provider } from '../../../lib/Identity.tsx';
import Timer from './Timer';
import { Summary } from '../../../functions/summaries';
import RestApi from "../../RestApi";
import fakeIdentity from "../../../fixtures/identity.json";

const fakeSummaries = [{
  ID: 321,
  UserID: fakeIdentity.UserID,
  Content: "summary",
  Date: 1679011200000,
  Slot: 0
} as Summary ];


const original = RestApi;
const restoreApi = () => {
  return global.RestApi = original;
}

beforeEach(() => {
  RestApi.greet = (callback) => callback(fakeIdentity);
  RestApi.getSummaries = (_, callback) => callback([]);
});

afterEach(() => {
  restoreApi();
});

test('renders the greeting', async () => {
  render(<Timer />);
  expect(await screen.findByText(/Found your login info via github/i)).toBeInTheDocument()
});

test('renders the date', async () => {
  render(<Timer />);
  expect(await screen.findByText(/Showing data for 3-17-2023/i)).toBeInTheDocument()
});
