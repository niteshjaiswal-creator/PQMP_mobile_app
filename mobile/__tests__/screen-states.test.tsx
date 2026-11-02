// Loading/error/empty states and business-readable errors (SRS 9.3.5, 11.9, 18.5; DATA-01, LIST-01).
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import App from '../App';
import { configureApi, type Transport } from '../src/api/client';
import { handle } from '../src/mock/server';
import { resetMockDb } from '../src/mock';

jest.setTimeout(30000);

let failCases = false;
const transport: Transport = async req => {
  if (failCases && req.method === 'GET' && req.path === '/cases') return { status: 504, body: { code: 'TIMEOUT', message: 'RFC_ERROR upstream' } };
  return handle(req);
};

beforeAll(() => configureApi({ transport, baseUrl: 'https://mock.local/api/mobile/v1' }));
beforeEach(() => {
  failCases = false;
  resetMockDb();
  require('react-native-keychain').__reset();
});

async function signIn(userId: string) {
  await render(<App />);
  await fireEvent.changeText(await screen.findByTestId('login.userId'), userId);
  await fireEvent.changeText(screen.getByTestId('login.password'), 'x');
  await fireEvent.press(screen.getByTestId('login.submit'));
  await screen.findByTestId('home.kpi.total', {}, { timeout: 5000 });
}

it('shows a readable error with retry, never the raw upstream message', async () => {
  await signIn('dealer');
  failCases = true;
  await fireEvent.press(screen.getByTestId('tabs.cases'));
  expect(await screen.findByTestId('cases.error')).toHaveTextContent(/Temporarily Unavailable/);
  expect(screen.queryByText(/RFC_ERROR|504/)).toBeNull();
  failCases = false;
  await fireEvent.press(screen.getByTestId('cases.error.retry'));
  await screen.findByTestId('cases.item.0');
});

it('shows an empty state when nothing matches', async () => {
  await signIn('dealer2');
  await fireEvent.press(screen.getByTestId('tabs.cases'));
  await screen.findByTestId('cases.item.0');
  await fireEvent.press(screen.getByTestId('cases.group.closed'));
  expect(await screen.findByTestId('cases.empty')).toHaveTextContent(/No cases found/);
});

it('gives internal roles their own tabs and internal home items', async () => {
  await signIn('desk');
  expect(screen.getByTestId('home.internal.byDesk')).toBeTruthy();
  expect(screen.queryByTestId('tabs.newCase')).toBeNull();
  await fireEvent.press(screen.getByTestId('tabs.cases'));
  await waitFor(() => expect(screen.getByTestId('cases.item.0')).toHaveTextContent(/Support Desk 1/));
});
