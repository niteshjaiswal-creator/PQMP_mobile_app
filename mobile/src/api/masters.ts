// Masters and reference lookups (spec §5, §6). Category, sub-category and dynamic fields come from
// the portal's masters, so the create form follows the portal's rules (SRS 1.5(8), 12.1, 12.2.6).
import { request } from './client';
import type { CaseType, DocumentLookup, Option, PartLookup, SubTypeForm } from './types';

export const getCaseTypes = (includeLegacy = false) =>
  request<CaseType[]>('/masters/case-types', { query: { includeLegacy: includeLegacy || undefined } });

export const getSubTypeForm = (subTypeId: string) =>
  request<SubTypeForm>(`/masters/sub-types/${encodeURIComponent(subTypeId)}/form`);

export const getOptions = (list: string) => request<Option[]>(`/masters/options/${encodeURIComponent(list)}`);

// Scanned values go to the same lookups as typed ones (SRS 6.6, SCAN-01…04).
export const lookupSapDocument = (no: string) =>
  request<DocumentLookup>(`/lookups/sap-documents/${encodeURIComponent(no.trim())}`);

export const lookupInvoice = (no: string) =>
  request<DocumentLookup>(`/lookups/invoices/${encodeURIComponent(no.trim())}`);

export const lookupSalesOrder = (no: string) =>
  request<DocumentLookup>(`/lookups/sales-orders/${encodeURIComponent(no.trim())}`);

export const lookupPart = (partNumber: string) =>
  request<PartLookup>(`/lookups/parts/${encodeURIComponent(partNumber.trim())}`);
