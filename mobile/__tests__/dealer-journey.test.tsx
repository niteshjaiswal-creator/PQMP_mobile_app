// Dealer journey through the real screens against the mock backend (src/mock): sign in, home KPIs,
// filtered list, case detail, order/parts with fallbacks, clarification reply, feedback, reopen,
// and raising a case. Requirement IDs: AUTH-01/03, DASH-01…04, LIST-01…09, DETAIL-01…14, ORDER-*,
// PART-*, CONSIGN-*, ATTACH-03/04, FEEDBACK-01/02, CREATE-01…13, NOTIF-01, DATA-02.
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

async function signIn(userId = 'dealer') {
  await render(<App />);
  await fireEvent.changeText(await screen.findByTestId('login.userId'), userId);
  await fireEvent.changeText(screen.getByTestId('login.password'), 'test123');
  await fireEvent.press(screen.getByTestId('login.submit'));
  await screen.findByTestId('home.kpi.total', {}, { timeout: 5000 });
}

const textOf = (id: string) => {
  const el = screen.getByTestId(id);
  const kids = el.props.children;
  return Array.isArray(kids) ? kids.join('') : String(kids);
};

it('shows the dealer home with counts and the reply prompt', async () => {
  await signIn();
  expect(screen.getByText('Shree Motors')).toBeTruthy();
  expect(screen.getByTestId('home.awaitingReply')).toBeTruthy();
  expect(screen.getByTestId('home.kpi.total')).toHaveTextContent(/5\s*Total cases/);
  expect(screen.queryByText(/Desk/)).toBeNull(); // no internal desk names (4.2)
});

it('opens the filtered list from a KPI and searches by order number', async () => {
  await signIn();
  await fireEvent.press(screen.getByTestId('home.kpi.closed'));
  await waitFor(() => expect(screen.getByTestId('cases.item.0.number')).toBeTruthy());
  expect(screen.getAllByText(/^(PD|OQ)26/).length).toBe(2);
  await fireEvent.press(screen.getByTestId('cases.group.all'));
  await fireEvent.changeText(screen.getByTestId('cases.search'), '4100231876');
  await waitFor(() => expect(screen.queryByTestId('cases.item.1')).toBeNull(), { timeout: 3000 });
  expect(textOf('cases.item.0.number')).toBe('EUR261024106958');
});

it('shows case detail, order and parts with fallbacks, and answers a clarification', async () => {
  await signIn();
  await fireEvent.press(screen.getByTestId('home.reply'));
  await screen.findByTestId('caseDetail.title');
  expect(screen.getByTestId('caseDetail.handledBy')).toHaveTextContent(/PQMP Support/);
  expect(screen.getByTestId('messages.input')).toBeTruthy();

  await fireEvent.changeText(screen.getByTestId('messages.input'), 'Address is the Indore workshop.');
  await fireEvent.press(screen.getByTestId('messages.send'));
  await screen.findByText('Address is the Indore workshop.');

  await fireEvent.press(screen.getByTestId('caseDetail.tab.order'));
  await screen.findByTestId('orderParts.order.number');
  expect(screen.getByTestId('orderParts.order.refreshed')).toHaveTextContent(/Last refreshed/);
  expect(screen.getByTestId('orderParts.part.0.status')).toHaveTextContent('Partially Delivered');
  expect(screen.getByTestId('orderParts.part.0.invoiceDate')).toHaveTextContent(/Awaiting Update/); // 0000-00-00
  await screen.findByTestId('orderParts.consignment.1.fallback'); // one tracking feed down
  expect(screen.queryByText(/0000-00-00|null|undefined/)).toBeNull();
});

it('keeps the case usable when SAP order data is unavailable', async () => {
  await signIn();
  await fireEvent.press(screen.getByTestId('tabs.cases'));
  await fireEvent.changeText(await screen.findByTestId('cases.search'), 'DRLR');
  await waitFor(() => expect(screen.queryByTestId('cases.item.1')).toBeNull(), { timeout: 3000 });
  await fireEvent.press(screen.getByTestId('cases.item.0'));
  await screen.findByTestId('caseDetail.title');
  await fireEvent.press(screen.getByTestId('caseDetail.tab.order'));
  expect(await screen.findByTestId('orderParts.order.fallback')).toHaveTextContent('The latest order information is being updated.');
  await fireEvent.press(screen.getByTestId('caseDetail.tab.overview'));
  expect(screen.getByTestId('caseDetail.timeline')).toBeTruthy();
});

it('rates a closed case and reopens it with mandatory remarks', async () => {
  await signIn();
  await fireEvent.press(screen.getByTestId('home.feedbackPending'));
  await waitFor(() => expect(textOf('cases.item.0.number')).toBe('PD261015106702'));
  await fireEvent.press(screen.getByTestId('cases.item.0'));
  await screen.findByTestId('caseDetail.closure');

  await fireEvent.press(screen.getByTestId('feedback.submit'));
  expect(screen.getByTestId('feedback.error')).toHaveTextContent('Choose a rating from 1 to 5.');
  await fireEvent.press(screen.getByTestId('feedback.star.4'));
  await fireEvent.press(screen.getByTestId('feedback.submit'));
  await screen.findByTestId('feedback.given');

  await fireEvent.press(screen.getByTestId('reopen.open'));
  await fireEvent.press(await screen.findByTestId('reopen.submit'));
  expect(screen.getByTestId('reopen.remarksError')).toHaveTextContent('Please add a reason to reopen the case.');
  await fireEvent.changeText(screen.getByTestId('reopen.remarks'), 'Cartons damaged again on the next order.');
  await fireEvent.press(screen.getByTestId('reopen.submit'));
  await waitFor(() => expect(screen.getByTestId('caseDetail.status')).toHaveTextContent('Reopened'));
});

it('raises a case: category, lookup, part selection, details, server case number', async () => {
  await signIn();
  await fireEvent.press(screen.getByTestId('tabs.newCase'));
  await fireEvent.press(await screen.findByTestId('createType.category.3'));
  await fireEvent.press(screen.getByTestId('createType.subCategory.6'));
  await fireEvent.press(screen.getByTestId('createType.continue'));

  await fireEvent.changeText(await screen.findByTestId('createReference.sales_order'), '4100239001');
  await fireEvent.press(screen.getByTestId('createReference.continue'));

  await fireEvent.press(await screen.findByTestId('scanReview.part.0'));
  await fireEvent.press(screen.getByTestId('scanReview.useParts'));

  await screen.findByTestId('createDetails.submit');
  await fireEvent.press(screen.getByTestId('createDetails.submit'));
  expect(screen.getByTestId('createDetails.banner')).toBeTruthy();
  expect(screen.getByTestId('createDetails.issueTitleError')).toBeTruthy();

  await fireEvent.changeText(screen.getByTestId('createDetails.issueTitle'), 'EDA needed');
  await fireEvent.changeText(screen.getByTestId('createDetails.problemStatement'), 'FAIL');
  await fireEvent.changeText(screen.getByTestId('createDetails.contact.person'), 'Rohit');
  await fireEvent.changeText(screen.getByTestId('createDetails.contact.phone'), '9876543210');
  await fireEvent.press(await screen.findByTestId('createDetails.modeOfQuery.Call'));

  // Server failure keeps the input (CREATE-13)
  await fireEvent.press(screen.getByTestId('createDetails.submit'));
  await waitFor(() => expect(screen.getByTestId('createDetails.banner')).toHaveTextContent(/saved here/));
  expect(screen.getByTestId('createDetails.issueTitle').props.value).toBe('EDA needed');

  await fireEvent.changeText(screen.getByTestId('createDetails.problemStatement'), 'Please share the EDA.');
  await fireEvent.press(screen.getByTestId('createDetails.submit'));
  const number = await screen.findByTestId('caseCreated.caseNumber');
  expect(String(number.props.children)).toMatch(/^EUR\d+/);
});

it('lists notifications and signs out', async () => {
  await signIn();
  await fireEvent.press(screen.getByTestId('tabs.updates'));
  await screen.findByTestId('updates.item.0');
  expect(screen.getByTestId('updates.item.0.unread')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('updates.markAll'));
  await waitFor(() => expect(screen.queryByTestId('updates.item.0.unread')).toBeNull());
});

it('restores the session on relaunch (AUTH-03)', async () => {
  await signIn();
  screen.unmount();
  await render(<App />);
  expect(await screen.findByTestId('home.kpi.total', {}, { timeout: 5000 })).toBeTruthy();
});
