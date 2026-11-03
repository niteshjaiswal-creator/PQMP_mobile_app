// Management journey (Phase 2) through the real screens against the mock backend (src/mock): sign in,
// read-only reports (SRS 4.5, 14.1–14.4, 14.7, 14.8), scope chips, drill-down into My Cases, and a
// case detail with no actions. Management has no task-list IDs; the SRS sections are the reference.
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import App from '../App';
import { configureApi } from '../src/api/client';
import { installMockApi, resetMockDb } from '../src/mock';

jest.setTimeout(30000);

beforeAll(() => {
  installMockApi({ delayMs: 0 });
  configureApi({ baseUrl: 'https://mock.local/api/mobile/v1' });
});
beforeEach(() => {
  resetMockDb();
  require('react-native-keychain').__reset();
});

async function signIn() {
  await render(<App />);
  await fireEvent.changeText(await screen.findByTestId('login.userId'), 'mgmt');
  await fireEvent.changeText(screen.getByTestId('login.password'), 'test123');
  await fireEvent.press(screen.getByTestId('login.submit'));
  await screen.findByTestId('reports.tile.total', {}, { timeout: 5000 });
}

const RAW = /\bnull\b|\bundefined\b|\bNaN\b|0000-00-00|Invalid Date/;

it('shows every report section with counts and no raw values', async () => {
  await signIn();
  expect(screen.getByTestId('reports.tile.total.value')).toHaveTextContent('8');
  expect(screen.getByTestId('reports.tile.open.value')).toHaveTextContent('6');
  expect(screen.getByTestId('reports.tile.closed.value')).toHaveTextContent('2');
  expect(screen.getByTestId('reports.tile.pendingOrder.value')).toHaveTextContent('1');
  expect(screen.getByTestId('reports.tile.highPriority.value')).toHaveTextContent('1');
  expect(screen.getByTestId('reports.tile.feedbackPending.value')).toHaveTextContent('1');

  expect(screen.getByTestId('reports.byCategory.3')).toBeTruthy(); // Order Status
  expect(screen.getByTestId('reports.byStatus')).toHaveTextContent(/In Progress/);
  expect(screen.getByTestId('reports.byStatus')).not.toHaveTextContent(/Closed/); // open statuses only
  expect(screen.getByTestId('reports.feedback.average')).toHaveTextContent('5.0');
  expect(screen.getByTestId('reports.feedback.rating.5')).toBeTruthy();
  expect(screen.getByTestId('reports.workload.d1')).toHaveTextContent(/Support Desk 1/);
  expect(screen.getByTestId('reports.workload.unassigned.open')).toHaveTextContent('2');
  expect(screen.getByTestId('reports.integration')).toHaveTextContent(/SAP 3 · Logistics 2/);
  expect(screen.getByTestId('reports.refreshed')).toHaveTextContent(/Last refreshed/);
  expect(screen.queryByText(RAW)).toBeNull();
  // Management is read-only: no raise-case or notifications tabs.
  expect(screen.queryByTestId('tabs.newCase')).toBeNull();
  expect(screen.queryByTestId('tabs.updates')).toBeNull();
});

it('narrows the report by category and period', async () => {
  await signIn();
  await fireEvent.press(screen.getByTestId('reports.category.3'));
  await waitFor(() => expect(screen.getByTestId('reports.tile.total.value')).toHaveTextContent('4'));
  expect(screen.getByTestId('reports.drillNote')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('reports.category.all'));
  await fireEvent.press(screen.getByTestId('reports.period.30d'));
  await screen.findByTestId('reports.tile.total');
  expect(screen.getByTestId('reports.period.30d').props.accessibilityState).toMatchObject({ selected: true });
  expect(screen.queryByText(RAW)).toBeNull();
});

it('drills down from a tile into a read-only list and case detail', async () => {
  await signIn();
  await fireEvent.press(screen.getByTestId('reports.tile.highPriority'));
  await waitFor(() => expect(screen.getByTestId('cases.item.0.number')).toHaveTextContent('ICR261102107012'));
  expect(screen.queryByTestId('cases.item.1')).toBeNull();

  await fireEvent.press(screen.getByTestId('cases.item.0'));
  await screen.findByTestId('caseDetail.title');
  expect(screen.queryByTestId('caseDetail.internalActions')).toBeNull();
  expect(screen.queryByTestId('reopen.open')).toBeNull();
  expect(screen.queryByTestId('feedback')).toBeNull();
  await fireEvent.press(screen.getByTestId('caseDetail.tab.messages'));
  expect(screen.queryByTestId('messages.input')).toBeNull();
  expect(screen.queryByTestId('messages.addFile')).toBeNull();
  expect(screen.queryByText(RAW)).toBeNull();
});

it('opens the pending order cases from the report row', async () => {
  await signIn();
  await fireEvent.press(screen.getByTestId('reports.pendingOrder'));
  await waitFor(() => expect(screen.getByTestId('cases.item.0.number')).toHaveTextContent('EUR261024106958'));
  expect(screen.queryByTestId('cases.item.1')).toBeNull();
  expect(screen.getByTestId('cases.filter').props.accessibilityLabel).toBe('Filters, 1 applied');
});
