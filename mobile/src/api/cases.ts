// Cases: list, detail, create, tracking sections, messages, feedback, reopen (spec §7–§10).
// Order, parts and consignments are separate calls so one failing section never blocks the rest
// of the case (SRS 11.9.1).
import { request, requestPage } from './client';
import type {
  Attachment,
  CaseDetail,
  CaseListQuery,
  CaseSummary,
  Comment,
  ConsignmentSection,
  CreateCaseInput,
  CreateCaseResult,
  DashboardSummary,
  FeedbackInput,
  OrderSection,
  PartsSection,
  PortalStatus,
  TimelineEvent,
} from './types';

const c = (caseId: string) => `/cases/${encodeURIComponent(caseId)}`;

export const getDashboard = () => request<DashboardSummary>('/dashboard/summary');

export const listCases = (query: CaseListQuery = {}) =>
  requestPage<CaseSummary>('/cases', { query: { ...query } });

export const getCase = (caseId: string) => request<CaseDetail>(c(caseId));
export const getTimeline = (caseId: string) => request<TimelineEvent[]>(`${c(caseId)}/timeline`);

export const createCase = (input: CreateCaseInput) =>
  request<CreateCaseResult>('/cases', { method: 'POST', body: input, idempotent: true });

export const getOrder = (caseId: string, refresh = false) =>
  request<OrderSection>(`${c(caseId)}/order`, { query: { refresh: refresh || undefined } });
export const getParts = (caseId: string, refresh = false) =>
  request<PartsSection>(`${c(caseId)}/parts`, { query: { refresh: refresh || undefined } });
export const getConsignments = (caseId: string, refresh = false) =>
  request<ConsignmentSection>(`${c(caseId)}/consignments`, { query: { refresh: refresh || undefined } });

export const getComments = (caseId: string) => request<Comment[]>(`${c(caseId)}/comments`);
export const postComment = (caseId: string, input: { text: string; attachmentIds?: string[]; inReplyTo?: string | null }) =>
  request<Comment>(`${c(caseId)}/comments`, { method: 'POST', body: input, idempotent: true });

export const getAttachments = (caseId: string) => request<Attachment[]>(`${c(caseId)}/attachments`);
export const linkAttachments = (caseId: string, attachmentIds: string[]) =>
  request<Attachment[]>(`${c(caseId)}/attachments`, { method: 'POST', body: { attachmentIds } });

/** Uploads one file before it is linked to a case or comment (spec §7.1). */
export function uploadAttachment(
  file: { uri: string; name: string; type: string },
  purpose: 'case_create' | 'comment' | 'case_file',
  source?: 'camera' | 'gallery' | 'document' | 'scan',
) {
  const form = new FormData();
  form.append('file', file as unknown as Blob);
  form.append('purpose', purpose);
  if (source) form.append('source', source);
  return request<Attachment>('/attachments', { method: 'POST', body: form });
}

export const getDownloadUrl = (attachmentId: string) =>
  request<{ url: string; expiresAt: string; fileName: string; mimeType: string }>(
    `/attachments/${encodeURIComponent(attachmentId)}/download`,
  );

export const submitFeedback = (caseId: string, input: FeedbackInput) =>
  request<{ rating: number; remarks: string | null; submittedAt: string }>(`${c(caseId)}/feedback`, {
    method: 'POST',
    body: input,
    idempotent: true,
  });

export const reopenCase = (caseId: string, input: { remarks: string; attachmentIds?: string[] }) =>
  request<{ status: PortalStatus; reopenedAt: string }>(`${c(caseId)}/reopen`, {
    method: 'POST',
    body: input,
    idempotent: true,
  });
