// Internal-role endpoints (spec §15–§17).
// Support desk (SRS 4.3): update status, add remarks, ask the dealer, close with final remarks.
// Admin (SRS 7.15, 13.12): desks with workload, assign and transfer.
// Management (SRS 4.5, 14): read-only report summary within the user's data scope.
// The backend enforces every role rule (SRS 5); the app only hides what the role can't use.
import { request } from './client';
import type { AssignInput, CaseUpdateInput, Desk, PortalStatus, ReportQuery, ReportSummary, TimelineEvent } from './types';

const c = (caseId: string) => `/cases/${encodeURIComponent(caseId)}`;

export const updateCase = (caseId: string, input: CaseUpdateInput) =>
  request<{ status: PortalStatus; event: TimelineEvent }>(`${c(caseId)}/updates`, {
    method: 'POST',
    body: input,
    idempotent: true,
  });

export const listDesks = () => request<Desk[]>('/desks');

/** Assign an unassigned case, or transfer an assigned one (note required for transfer). */
export const assignCase = (caseId: string, input: AssignInput) =>
  request<{ assignedDesk: { id: string; name: string }; status: PortalStatus }>(`${c(caseId)}/assignment`, {
    method: 'POST',
    body: input,
    idempotent: true,
  });

export const getReportSummary = (query: ReportQuery = {}) =>
  request<ReportSummary>('/reports/summary', { query: { ...query } });
