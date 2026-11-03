// CREATE-04/05/06/07/11/13 — SRS 9.1: mandatory fields per sub-type form config, references, parts, files.
import type { SubTypeForm } from '../api/types';
import { buildCreateInput, emptyDraft, type CaseDraft, mapServerErrors, requiredMessage, validateDetails, validateReferences, visibleFields } from './case-validation';

const form: SubTypeForm = {
  subTypeId: '6',
  orderRelated: true,
  referenceStep: { kinds: ['sales_order', 'po_number'], multiple: false, required: true, scanAllowed: true },
  fields: [
    { key: 'issueTitle', label: 'Issue title', type: 'text', required: true, maxLength: 100 },
    { key: 'problemStatement', label: 'Issue description', type: 'textarea', required: true, maxLength: 300 },
    { key: 'contact.person', label: 'Contact person', type: 'text', required: true },
    { key: 'contact.phone', label: 'Contact number', type: 'phone', required: true },
    { key: 'contact.email', label: 'Email', type: 'email', required: false },
    { key: 'modeOfQuery', label: 'How should we reach you?', type: 'select', required: true, optionsList: 'mode_of_query' },
    { key: 'fields.csmAsmApproval', label: 'CSM / ASM approval', type: 'boolean', required: true },
    { key: 'fields.reasonForNo', label: 'Reason for no', type: 'text', required: true, visibleWhen: { key: 'fields.csmAsmApproval', equals: 'false' } },
  ],
  parts: { enabled: true, required: false, min: 0, max: 20 },
  attachments: { required: false, min: 0, max: 5, maxSizeMb: 10, mimeTypes: [] },
};

const filled = (): CaseDraft => ({
  ...emptyDraft(),
  references: { sales_order: '4100231876' },
  values: { issueTitle: 'EDA needed', problemStatement: 'Please share EDA', 'contact.person': 'Rohit', 'contact.phone': '9876543210', modeOfQuery: 'Call', 'fields.csmAsmApproval': 'true' },
});

it('requires the main order reference and checks formats', () => {
  expect(validateReferences(emptyDraft(), form)).toEqual({ sales_order: 'Enter the Sales order (SO) number.' });
  expect(validateReferences({ ...emptyDraft(), references: { sales_order: '41AB' } }, form).sales_order).toMatch(/Check/);
  expect(validateReferences(filled(), form)).toEqual({});
});

it('requires mandatory fields from the form config', () => {
  const errors = validateDetails(emptyDraft(), form);
  expect(Object.keys(errors).sort()).toEqual(['contact.person', 'contact.phone', 'fields.csmAsmApproval', 'issueTitle', 'modeOfQuery', 'problemStatement'].sort());
  expect(validateDetails(filled(), form)).toEqual({});
});

it('validates phone and email formats', () => {
  const d = filled();
  d.values['contact.phone'] = '98765';
  d.values['contact.email'] = 'not-an-email';
  expect(validateDetails(d, form)).toEqual({ 'contact.phone': 'Enter a valid 10-digit mobile number.', 'contact.email': 'Enter a valid email address.' });
});

it('shows conditional fields only when their condition is met', () => {
  const d = filled();
  expect(visibleFields(form, d.values).map(f => f.key)).not.toContain('fields.reasonForNo');
  d.values['fields.csmAsmApproval'] = 'false';
  expect(validateDetails(d, form)['fields.reasonForNo']).toBe('Enter reason for no.');
});

it('enforces required parts and attachments', () => {
  const strict = { ...form, parts: { ...form.parts, required: true }, attachments: { ...form.attachments, required: true, min: 1 } };
  expect(validateDetails(filled(), strict)).toMatchObject({ parts: 'Add at least one part.', attachments: 'Attach at least one supporting document.' });
});

it('builds the create request with scan capture method and sub-type fields', () => {
  const d = { ...filled(), captureMethod: { sales_order: 'scan' as const }, parts: [{ partNumber: 'F8210300', description: 'Clutch', quantity: 4 }], files: [{ id: 'att_1', fileName: 'a.jpg', sizeBytes: 1 }] };
  const body = buildCreateInput(d, form, '1S1148', 'd1');
  expect(body).toMatchObject({
    subTypeId: '6', dealerCode: '1S1148', issueTitle: 'EDA needed', contact: { person: 'Rohit', phone: '9876543210', email: null },
    references: [{ type: 'sales_order', value: '4100231876', captureMethod: 'scan' }],
    fields: { csmAsmApproval: true }, attachmentIds: ['att_1'], clientDraftId: 'd1',
  });
});

it('maps server field errors back to form keys', () => {
  expect(mapServerErrors({ 'contact.phone': 'Bad', 'parts[0].partNumber': 'Unknown part', references: 'Missing' })).toEqual({ 'contact.phone': 'Bad', parts: 'Unknown part', _form: 'Missing' });
});

describe('requiredMessage', () => {
  it('names the field for plain labels', () => {
    expect(requiredMessage({ label: 'Issue title', type: 'text' })).toBe('Enter issue title.');
    expect(requiredMessage({ label: 'Plant', type: 'select' })).toBe('Choose plant.');
  });
  it('does not turn a question label into a broken sentence', () => {
    expect(requiredMessage({ label: 'How should we reach you?', type: 'select' })).toBe('Choose an option.');
  });
});
