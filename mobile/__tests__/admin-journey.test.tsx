// Admin journey through the real screens against the mock backend (src/mock): assignment workbench
// queues, assign to the lowest-workload desk, transfer with a mandatory note, and transfer from case
// detail. SRS 6.3.4, 6.3.5, 7.15, 8.10.2, 13.12; spec §16.
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
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

async function signInAdmin() {
  await render(<App />);
  await fireEvent.changeText(await screen.findByTestId('login.userId'), 'admin');
  await fireEvent.changeText(screen.getByTestId('login.password'), 'test123');
  await fireEvent.press(screen.getByTestId('login.submit'));
  await screen.findByTestId('home.kpi.total', {}, { timeout: 5000 });
}

/** Case numbers currently listed in the workbench. */
const listed = () => screen.queryAllByTestId(/^workbench\.item\.\d+\.number$/).map(el => String(el.props.children));
const indexOf = (caseNumber: string) => listed().indexOf(caseNumber);

async function openWorkbench() {
  await fireEvent.press(screen.getByTestId('tabs.assign'));
  await screen.findByTestId('workbench.item.0.number');
}

/** The desk row the sheet marks as lowest workload, and that it is preselected. */
function lowestDeskRow() {
  const row = screen.getAllByTestId(/^assign\.desk\.d\d$/).find(el => within(el).queryByText(/lowest workload/));
  expect(row).toBeTruthy();
  expect(row!.props.accessibilityState).toMatchObject({ selected: true });
  return row!;
}

it('lists unassigned cases with counts and assigns one to the lowest-workload desk', async () => {
  await signInAdmin();
  await openWorkbench();
  expect(listed().sort()).toEqual(['ICR261102107012', 'ITD261101106998']);
  await waitFor(() => expect(screen.getByTestId('workbench.queue.unassigned')).toHaveTextContent('Unassigned · 2'));
  expect(screen.getByTestId('workbench.desk.all')).toBeTruthy();

  const i = indexOf('ICR261102107012');
  await fireEvent.press(screen.getByTestId(`workbench.item.${i}.assign`));
  await screen.findByTestId('assign.desk.d1');
  expect(screen.getByText('Assign ICR261102107012')).toBeTruthy();
  expect(screen.getByTestId('assign.caption')).toHaveTextContent('The dealer is not told which desk handles the case.');
  const row = lowestDeskRow();
  const deskName = within(row).getAllByText(/^Support Desk \d$/)[0].props.children as string;
  expect(screen.getByTestId('assign.submit')).toHaveTextContent(`Assign to ${deskName}`);

  await fireEvent.press(screen.getByTestId('assign.submit')); // note optional for a new assignment
  await waitFor(() => expect(screen.getByTestId('workbench.done')).toHaveTextContent(`ICR261102107012 assigned to ${deskName}.`));
  await waitFor(() => expect(listed()).toEqual(['ITD261101106998']));
  await waitFor(() => expect(screen.getByTestId('workbench.queue.unassigned')).toHaveTextContent('Unassigned · 1'));
});

it('requires a note to transfer and blocks the current desk', async () => {
  await signInAdmin();
  await openWorkbench();
  await fireEvent.press(screen.getByTestId('workbench.queue.assigned'));
  await fireEvent.changeText(screen.getByTestId('workbench.search'), 'WPS');
  await waitFor(() => expect(listed().every(n => n.startsWith('WPS'))).toBe(true), { timeout: 3000 });
  expect(listed().length).toBeGreaterThan(0);

  await fireEvent.press(screen.getByTestId('workbench.item.0.transfer'));
  await screen.findByTestId('assign.desk.d1');
  const current = screen.getAllByTestId(/^assign\.desk\.d\d$/).find(el => el.props.accessibilityState?.disabled);
  expect(current).toBeTruthy();
  expect(within(current!).getByText(/current desk/)).toBeTruthy();
  lowestDeskRow();

  await fireEvent.press(screen.getByTestId('assign.submit'));
  expect(screen.getByTestId('assign.noteError')).toHaveTextContent('Add a note explaining the transfer.');
  await fireEvent.changeText(screen.getByTestId('assign.note'), 'Rebalancing workload');
  await fireEvent.press(screen.getByTestId('assign.submit'));
  await waitFor(() => expect(screen.getByTestId('workbench.done')).toHaveTextContent(/WPS\d+ transferred to Support Desk \d\./));
});

it('transfers from case detail and shows the new desk and status', async () => {
  await signInAdmin();
  await openWorkbench();
  // Assign ITD first so it can then be transferred from its detail screen.
  await fireEvent.press(screen.getByTestId(`workbench.item.${indexOf('ITD261101106998')}.assign`));
  await screen.findByTestId('assign.desk.d1');
  await fireEvent.press(screen.getByTestId('assign.desk.d1'));
  await fireEvent.press(screen.getByTestId('assign.submit'));
  await screen.findByTestId('workbench.done');

  await fireEvent.press(screen.getByTestId('workbench.queue.assigned'));
  await fireEvent.changeText(screen.getByTestId('workbench.search'), 'ITD261101106998');
  await waitFor(() => expect(listed()).toEqual(['ITD261101106998']), { timeout: 3000 });
  expect(screen.getByTestId('workbench.item.0.status')).toHaveTextContent(/Assigned/);
  await fireEvent.press(screen.getByTestId('workbench.item.0'));
  await screen.findByTestId('caseDetail.title');
  expect(screen.getByTestId('caseDetail.assign')).toHaveTextContent('Transfer');

  await fireEvent.press(screen.getByTestId('caseDetail.assign'));
  await screen.findByTestId('assign.desk.d1');
  expect(screen.getByTestId('assign.desk.d1').props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.press(screen.getByTestId('assign.desk.d3'));
  await fireEvent.press(screen.getByTestId('assign.submit'));
  expect(screen.getByTestId('assign.noteError')).toBeTruthy();
  await fireEvent.changeText(screen.getByTestId('assign.note'), 'Desk 3 handles in-transit delays');
  await fireEvent.press(screen.getByTestId('assign.submit'));

  // Re-Assigned shows as "Assigned" (case-status.ts); the desk change is in "Handled by".
  await waitFor(() => expect(screen.getByTestId('caseDetail.handledBy')).toHaveTextContent(/Support Desk 3/));
  expect(screen.getByTestId('caseDetail.status')).toHaveTextContent('Reassigned'); // internal users see re-routing
  expect(screen.getByTestId('caseDetail.assign')).toHaveTextContent('Transfer');
});

it('drops the confirmation line when the admin comes back to the workbench from another tab', async () => {
  await signInAdmin();
  await openWorkbench();
  await fireEvent.press(screen.getByTestId(`workbench.item.${indexOf('ICR261102107012')}.assign`));
  await screen.findByTestId('assign.desk.d1');
  await fireEvent.press(screen.getByTestId('assign.submit'));
  await screen.findByTestId('workbench.done');

  // Home "Old / pending" opens the workbench on that queue; the earlier line may be out of date by now.
  await fireEvent.press(screen.getByTestId('tabs.home'));
  await fireEvent.press(await screen.findByTestId('home.internal.oldPending'));
  await waitFor(() => expect(screen.getByTestId('workbench.queue.old_pending').props.accessibilityState).toMatchObject({ selected: true }));
  expect(screen.queryByTestId('workbench.done')).toBeNull();
});
