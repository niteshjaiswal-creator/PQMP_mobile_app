// FLOW-01..04, LIST-09, DETAIL-05 — SRS 10.1-10.3, 4.2
import { canComment, canTransition, customerFacingOwner, isFeedbackEligible, statusBucket, SUPPORT_IDENTITY } from './case-status';
import * as status from './case-status';

it('shows re-routing only to internal users (4.2.5)', () => {
  expect(status.portalStatusLabel('Re-Assigned')).toBe('Assigned');
  expect(status.portalStatusLabel('Re-Assigned', true)).toBe('Reassigned');
  // Resume reads as In Progress to dealers; the desk sees the portal status (FLOW-01).
  expect(status.portalStatusLabel('Resume')).toBe('In Progress');
  expect(status.portalStatusLabel('Resume', true)).toBe('Resume');
});

describe('canTransition (10.2)', () => {
  it.each([
    ['draft', 'submitted'],
    ['submitted', 'awaiting-assignment'],
    ['assigned', 'clarification-required'],
    ['clarification-required', 'awaiting-user-response'],
    ['awaiting-user-response', 'in-progress'],
    ['closure-pending', 'closed'],
    ['resolved', 'reopened'],
    ['in-progress', 'hold'],
    ['hold', 'resume'],
  ] as const)('allows %s -> %s', (from, to) => expect(canTransition(from, to)).toBe(true));

  it.each([
    ['draft', 'closed'],
    ['closed', 'in-progress'], // 10.2.10 closed is read-only except reopen
    ['closed', 'hold'],
    ['awaiting-assignment', 'resolved'],
  ] as const)('blocks %s -> %s', (from, to) => expect(canTransition(from, to)).toBe(false));
});

it('buckets statuses for dashboard KPIs', () => {
  expect(statusBucket('new')).toBe('open');
  expect(statusBucket('hold')).toBe('in-progress');
  expect(statusBucket('resolved')).toBe('closed');
});

it('only allows comments on active cases and feedback after closure', () => {
  expect(canComment('in-progress')).toBe(true);
  expect(canComment('closed')).toBe(false);
  expect(isFeedbackEligible('closed')).toBe(true);
  expect(isFeedbackEligible('in-progress')).toBe(false);
});

describe('customerFacingOwner (4.2, 10.3.4)', () => {
  it('never exposes internal desk names', () => {
    expect(customerFacingOwner('EGP Desk 3', true)).toBe(SUPPORT_IDENTITY);
    expect(customerFacingOwner('Ravi Kumar', false)).toBe(SUPPORT_IDENTITY);
    expect(customerFacingOwner(null, true)).toBe(SUPPORT_IDENTITY);
  });
  it('shows an owner only where permitted', () => expect(customerFacingOwner('Ravi Kumar', true)).toBe('Ravi Kumar'));
});

describe('portal status presentation (LIST-05, FLOW-01)', () => {
  const { fromPortalStatus, portalStatusLabel, statusTone } = require('./case-status');
  it('maps every portal value to a business label', () => {
    expect(portalStatusLabel('In Progress')).toBe('In Progress');
    expect(portalStatusLabel('Re-Assigned')).toBe('Assigned');
    expect(portalStatusLabel('Close')).toBe('Closed');
    expect(portalStatusLabel('Re-Open')).toBe('Reopened');
    expect(portalStatusLabel('Hold')).toBe('On Hold');
  });
  it('never shows an unknown raw code', () => {
    expect(fromPortalStatus('ZX_99')).toBeNull();
    expect(portalStatusLabel('ZX_99')).toBe('Under Review');
    expect(portalStatusLabel(null)).toBe('Under Review');
  });
  it('gives each status a pill tone', () => {
    expect(statusTone(fromPortalStatus('Close'))).toBe('closed');
    expect(statusTone(fromPortalStatus('Hold'))).toBe('hold');
  });
});
