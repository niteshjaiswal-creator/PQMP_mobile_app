// Support desk journey (Phase 3) through the real screens against the mock backend (src/mock): home
// internal items, ask the dealer, internal remark with a status change, close with final remarks, and
// the dealer never receiving internal remarks. FLOW-03; SRS 4.3, 5, 8.8, 9.4.1, 13.2; API spec §15.
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import App from '../App';
import { api, configureApi } from '../src/api';
import { installMockApi, resetMockDb } from '../src/mock';

jest.setTimeout(30000);

const BASE_URL = 'https://mock.local/api/mobile/v1';

beforeAll(() => {
  installMockApi({ delayMs: 0 });
  configureApi({ baseUrl: BASE_URL });
});
beforeEach(() => {
  resetMockDb();
  require('react-native-keychain').__reset();
});

async function signIn(userId = 'desk') {
  await render(<App />);
  await fireEvent.changeText(await screen.findByTestId('login.userId'), userId);
  await fireEvent.changeText(screen.getByTestId('login.password'), 'test123');
  await fireEvent.press(screen.getByTestId('login.submit'));
  await screen.findByTestId('home.kpi.total', {}, { timeout: 5000 });
}

async function openCase(caseNumber: string) {
  await fireEvent.press(screen.getByTestId('tabs.cases'));
  await fireEvent.changeText(await screen.findByTestId('cases.search'), caseNumber);
  await waitFor(() => expect(screen.queryByTestId('cases.item.1')).toBeNull(), { timeout: 3000 });
  await fireEvent.press(screen.getByTestId('cases.item.0'));
  await screen.findByTestId('caseDetail.internalActions');
}

const inTimeline = () => within(screen.getByTestId('caseDetail.timeline'));

it('opens the old/pending queue from the desk home', async () => {
  await signIn();
  expect(screen.getByTestId('home.internal.dealerReplied')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('home.internal.oldPending'));
  await screen.findByTestId('cases.search');
  await waitFor(() => expect(screen.queryByTestId('cases.loading')).toBeNull());
});

it('asks the dealer, adds an internal remark with a status change and closes with final remarks', async () => {
  await signIn();
  await openCase('WPS261029106930');
  expect(screen.getByTestId('caseDetail.status')).toHaveTextContent('Assigned');

  // Ask dealer (clarification request, always dealer-visible)
  await fireEvent.press(screen.getByTestId('caseDetail.askDealer'));
  expect(await screen.findByTestId('deskUpdate.action.clarify')).toHaveProp('accessibilityState', { selected: true });
  expect(screen.queryByTestId('deskUpdate.showToDealer')).toBeNull();
  await fireEvent.press(screen.getByTestId('deskUpdate.submit'));
  expect(screen.getByTestId('deskUpdate.remarkError')).toHaveTextContent('Enter the question for the dealer.');
  await fireEvent.changeText(screen.getByTestId('deskUpdate.remark'), 'Please share a photo of the part label.');
  await fireEvent.press(screen.getByTestId('deskUpdate.submit'));
  await waitFor(() => expect(screen.queryByTestId('deskUpdate')).toBeNull());
  await screen.findByTestId('caseDetail.timeline');
  expect(inTimeline().getByText('Clarification requested')).toBeTruthy();

  // Add update: status from allowedStatuses only, kept internal
  await fireEvent.press(screen.getByTestId('caseDetail.updateCase'));
  await screen.findByTestId('deskUpdate.status.InProgress');
  expect(screen.getByTestId('deskUpdate.status.Hold')).toBeTruthy();
  expect(screen.queryByTestId('deskUpdate.status.Resume')).toBeNull();
  await fireEvent.press(screen.getByTestId('deskUpdate.status.InProgress'));
  await fireEvent.press(screen.getByTestId('deskUpdate.showToDealer'));
  expect(screen.getByTestId('deskUpdate.showToDealer')).toHaveProp('accessibilityState', { checked: false });
  await fireEvent.changeText(screen.getByTestId('deskUpdate.remark'), 'Checked with plant, correct part reserved.');
  await fireEvent.press(screen.getByTestId('deskUpdate.submit'));
  await waitFor(() => expect(screen.queryByTestId('deskUpdate')).toBeNull());
  await waitFor(() => expect(screen.getByTestId('caseDetail.status')).toHaveTextContent('In Progress'));
  expect(inTimeline().getByText('Internal remark')).toBeTruthy();
  expect(inTimeline().getByText('Checked with plant, correct part reserved.')).toBeTruthy();

  // Close: final remarks required, then a confirmation step
  await fireEvent.press(screen.getByTestId('caseDetail.updateCase'));
  await fireEvent.press(await screen.findByTestId('deskUpdate.action.close'));
  expect(screen.queryByTestId('deskUpdate.status.Hold')).toBeNull();
  await fireEvent.press(screen.getByTestId('deskUpdate.submit'));
  expect(screen.getByTestId('deskUpdate.remarkError')).toHaveTextContent('Enter the final remarks for the dealer.');
  await fireEvent.changeText(screen.getByTestId('deskUpdate.remark'), 'Correct part dispatched on invoice 9012345678.');
  await fireEvent.press(screen.getByTestId('deskUpdate.submit'));
  expect(screen.getByTestId('deskUpdate.confirm')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('deskUpdate.cancelClose'));
  expect(screen.queryByTestId('deskUpdate.confirm')).toBeNull();
  await fireEvent.press(screen.getByTestId('deskUpdate.submit'));
  await fireEvent.press(screen.getByTestId('deskUpdate.confirmClose'));
  await waitFor(() => expect(screen.getByTestId('caseDetail.status')).toHaveTextContent('Closed'));
  expect(screen.queryByTestId('caseDetail.internalActions')).toBeNull();
  expect(screen.queryByTestId('caseDetail.updateCase')).toBeNull();
});

it('keeps the input and shows a readable message when the update fails', async () => {
  await signIn();
  await openCase('WPS261029106930');
  await fireEvent.press(screen.getByTestId('caseDetail.updateCase'));
  await fireEvent.press(await screen.findByTestId('deskUpdate.status.InProgress'));
  await fireEvent.changeText(screen.getByTestId('deskUpdate.remark'), 'Moving to in progress.');
  // Someone else moves the case to Hold meanwhile; In Progress is no longer allowed from Hold.
  await api.updateCase('106930', { action: 'update', status: 'Hold', remark: 'Waiting for plant.', visibleToDealer: false });
  await fireEvent.press(screen.getByTestId('deskUpdate.submit'));
  const error = await screen.findByTestId('deskUpdate.error');
  expect(error).not.toHaveTextContent(/409|STATUS_NOT_ALLOWED/);
  expect(screen.getByTestId('deskUpdate.remark').props.value).toBe('Moving to in progress.');
  expect(screen.getByTestId('deskUpdate')).toBeTruthy();
});

it('never sends internal remarks to the dealer (SRS 5)', async () => {
  await signIn();
  await openCase('EUR261024106958');
  await fireEvent.press(screen.getByTestId('caseDetail.updateCase'));
  await fireEvent.press(await screen.findByTestId('deskUpdate.showToDealer'));
  await fireEvent.changeText(screen.getByTestId('deskUpdate.remark'), 'Plant says stock arrives Friday.');
  await fireEvent.press(screen.getByTestId('deskUpdate.submit'));
  await waitFor(() => expect(screen.queryByTestId('deskUpdate')).toBeNull());
  await screen.findByTestId('caseDetail.timeline');
  expect(inTimeline().getByText('Plant says stock arrives Friday.')).toBeTruthy();
  screen.unmount();

  const session = await api.login({ userId: 'dealer', password: 'test123' });
  configureApi({ getToken: () => session.accessToken });
  const [detail, timeline, comments] = await Promise.all([api.getCase('106958'), api.getTimeline('106958'), api.getComments('106958')]);
  const texts = [detail.latestUpdate?.text, ...timeline.map(e => e.text), ...comments.map(c => c.text)];
  expect(texts).not.toContain('Plant says stock arrives Friday.');
  expect(timeline.some(e => e.internal)).toBe(false);
});
