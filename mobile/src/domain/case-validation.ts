// Case creation rules (CREATE-01…13, SRS 8.4, 9.1, 12.2.6). Which fields show and which are required
// comes from the sub-type's form configuration (GET /masters/sub-types/{id}/form), so the app follows
// the portal's Field Configuration Master instead of a hard-coded table. Pure functions, no React.
import type { CreateCaseInput, FormField, Reference, SubTypeForm } from '../api/types';

export type RefKind = Reference['type'];

export type DraftPart = { partNumber: string; description: string | null; quantity: number | null; hsnCode?: string | null };
export type DraftFile = { id: string; fileName: string; sizeBytes: number | null };
export type ScanValues = { documentNo: string; gstNumber: string; sellerGstNumber: string; invoiceReference: string };

export type CaseDraft = {
  caseTypeId?: string;
  subTypeId?: string;
  references: Partial<Record<RefKind, string>>;
  captureMethod: Partial<Record<RefKind, 'manual' | 'scan'>>;
  parts: DraftPart[];
  /** Values for form fields, keyed by FormField.key (e.g. "contact.person", "fields.improvement"). */
  values: Record<string, string>;
  files: DraftFile[];
  /** Reviewed document/scan values (SRS 6.6.3–4), editable by the user (SCAN-02). */
  scan: ScanValues | null;
};

export const emptyDraft = (): CaseDraft => ({ references: {}, captureMethod: {}, parts: [], values: {}, files: [], scan: null });

export const REF_FIELD: Record<RefKind, { label: string; pattern: RegExp; max: number; keyboard: 'number-pad' | 'default'; example: string }> = {
  sales_order: { label: 'Sales order (SO) number', pattern: /^\d{1,14}$/, max: 14, keyboard: 'number-pad', example: 'e.g. 4100231876' },
  sap_document: { label: 'SAP document number', pattern: /^\d{1,12}$/, max: 12, keyboard: 'number-pad', example: 'e.g. 6100457712' },
  invoice: { label: 'Invoice number', pattern: /^[A-Za-z0-9/-]{1,14}$/, max: 14, keyboard: 'default', example: 'e.g. 9012345678' },
  po_number: { label: 'PO number', pattern: /^[A-Za-z0-9/-]{1,20}$/, max: 20, keyboard: 'default', example: 'If you have one' },
  delivery: { label: 'Delivery number', pattern: /^\d{1,14}$/, max: 14, keyboard: 'number-pad', example: '' },
  chassis: { label: 'Chassis number', pattern: /^[A-Za-z0-9]{6,20}$/, max: 20, keyboard: 'default', example: '' },
};

/** Order references: the first kind is the main one and is required when the step is required (9.1.4). */
export function validateReferences(draft: CaseDraft, form: SubTypeForm): Partial<Record<RefKind, string>> {
  const errors: Partial<Record<RefKind, string>> = {};
  const kinds = form.referenceStep.kinds;
  kinds.forEach((kind, i) => {
    const v = draft.references[kind]?.trim() ?? '';
    if (!v) {
      if (form.referenceStep.required && i === 0) errors[kind] = `Enter the ${REF_FIELD[kind].label}.`;
      return;
    }
    if (!REF_FIELD[kind].pattern.test(v)) errors[kind] = `Check the ${REF_FIELD[kind].label}.`;
  });
  return errors;
}

const PHONE = /^\d{10}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Fields whose `visibleWhen` condition is met (or that have none). */
export function visibleFields(form: SubTypeForm, values: Record<string, string>): FormField[] {
  return form.fields.filter(f => f.type !== 'file' && (!f.visibleWhen || String(values[f.visibleWhen.key] ?? '') === String(f.visibleWhen.equals)));
}

/** "Enter issue title." / "Choose plant." — a question label ("How should we reach you?") gets a plain prompt. */
export function requiredMessage(f: Pick<FormField, 'label' | 'type'>): string {
  const choose = f.type === 'select' || f.type === 'boolean';
  if (/\?\s*$/.test(f.label)) return choose ? 'Choose an option.' : 'Enter an answer.';
  return `${choose ? 'Choose' : 'Enter'} ${f.label.toLowerCase()}.`;
}

/** Field errors for step 3, keyed by field key, plus "parts" and "attachments" (9.1, 18.5). */
export function validateDetails(draft: CaseDraft, form: SubTypeForm): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of visibleFields(form, draft.values)) {
    const v = (draft.values[f.key] ?? '').trim();
    if (!v) {
      if (f.required) errors[f.key] = requiredMessage(f);
      continue;
    }
    if (f.maxLength && v.length > f.maxLength) errors[f.key] = `Keep this within ${f.maxLength} characters.`;
    else if (f.type === 'phone' && !PHONE.test(v)) errors[f.key] = 'Enter a valid 10-digit mobile number.';
    else if (f.type === 'email' && !EMAIL.test(v)) errors[f.key] = 'Enter a valid email address.';
  }
  if (form.parts.enabled && form.parts.required && draft.parts.length === 0) errors.parts = 'Add at least one part.';
  if (draft.parts.some(p => p.quantity != null && (!Number.isInteger(p.quantity) || p.quantity <= 0))) errors.parts = 'Part quantities must be whole numbers above zero.';
  const fileFields = form.fields.filter(f => f.type === 'file' && f.required).length;
  const minFiles = Math.max(form.attachments.required ? Math.max(1, form.attachments.min) : 0, fileFields);
  if (draft.files.length < minFiles) errors.attachments = minFiles > 1 ? `Attach at least ${minFiles} files.` : 'Attach at least one supporting document.';
  if (draft.files.length > form.attachments.max) errors.attachments = `You can attach up to ${form.attachments.max} files.`;
  return errors;
}

/** Request body for POST /cases. Case number comes only from the server's reply (9.1.7). */
export function buildCreateInput(draft: CaseDraft, form: SubTypeForm, dealerCode: string, clientDraftId?: string): CreateCaseInput {
  const v = (k: string) => draft.values[k]?.trim() || null;
  const fields: Record<string, unknown> = {};
  for (const f of visibleFields(form, draft.values)) {
    if (!f.key.startsWith('fields.') || !v(f.key)) continue;
    fields[f.key.slice(7)] = f.type === 'boolean' ? v(f.key) === 'true' : v(f.key);
  }
  return {
    subTypeId: form.subTypeId,
    dealerCode,
    issueTitle: v('issueTitle') ?? '',
    problemStatement: v('problemStatement') ?? '',
    remarks: v('remarks'),
    references: form.referenceStep.kinds
      .filter(k => draft.references[k]?.trim())
      .map(k => ({ type: k, value: draft.references[k]!.trim(), captureMethod: draft.captureMethod[k] ?? 'manual' })),
    contact: { person: v('contact.person') ?? '', phone: v('contact.phone') ?? '', email: v('contact.email') },
    modeOfQuery: v('modeOfQuery'),
    parts: draft.parts.map(p => ({ partNumber: p.partNumber, description: p.description, quantity: p.quantity, hsnCode: p.hsnCode ?? null })),
    fields,
    scan: draft.scan
      ? {
          documentNo: draft.scan.documentNo.trim() || null,
          gstNumber: draft.scan.gstNumber.trim() || null,
          sellerGstNumber: draft.scan.sellerGstNumber.trim() || null,
          invoiceReference: draft.scan.invoiceReference.trim() || null,
        }
      : null,
    attachmentIds: draft.files.map(f => f.id),
    clientDraftId,
  };
}

/** Maps server field errors (dotted request paths) back onto form keys. */
export function mapServerErrors(fieldErrors: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, msg] of Object.entries(fieldErrors ?? {})) {
    if (k.startsWith('parts')) out.parts = msg;
    else if (k.startsWith('attachment')) out.attachments = msg;
    else if (k.startsWith('fields.') || k.startsWith('contact.') || ['issueTitle', 'problemStatement', 'remarks', 'modeOfQuery'].includes(k)) out[k] = msg;
    else out._form = msg;
  }
  return out;
}
