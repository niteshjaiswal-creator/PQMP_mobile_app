// FLOW-03; SRS 4.3, 5, 9.4.1; API spec §15.1: support desk update rules.
import { DESK_REMARK_MAX, emptyDeskUpdate, hasErrors, remarkLabel, toUpdateInput, validateDeskUpdate } from './desk-update';

const allowed = ['In Progress', 'Hold'] as const;

it('requires a remark for every action, with action-specific wording', () => {
  expect(validateDeskUpdate(emptyDeskUpdate('update'), [...allowed]).remark).toBe('Enter a remark.');
  expect(validateDeskUpdate({ ...emptyDeskUpdate('clarify'), remark: '   ' }, [...allowed]).remark).toBe('Enter the question for the dealer.');
  expect(validateDeskUpdate(emptyDeskUpdate('close'), [...allowed]).remark).toBe('Enter the final remarks for the dealer.');
});

it('limits the remark to 1000 characters', () => {
  expect(validateDeskUpdate({ ...emptyDeskUpdate(), remark: 'a'.repeat(DESK_REMARK_MAX) }, []).remark).toBeUndefined();
  expect(validateDeskUpdate({ ...emptyDeskUpdate(), remark: 'a'.repeat(DESK_REMARK_MAX + 1) }, []).remark).toMatch(/1000/);
});

it('only accepts a status the server allows', () => {
  const f = { ...emptyDeskUpdate(), remark: 'Checked with plant.' };
  expect(hasErrors(validateDeskUpdate({ ...f, status: 'Hold' }, [...allowed]))).toBe(false);
  expect(validateDeskUpdate({ ...f, status: 'Resume' }, [...allowed]).status).toBeTruthy();
  expect(hasErrors(validateDeskUpdate({ ...f, status: null }, []))).toBe(false); // remark only
});

it('ignores the status for ask dealer and close', () => {
  const e = validateDeskUpdate({ ...emptyDeskUpdate('close'), status: 'Resume', remark: 'Done.' }, []);
  expect(hasErrors(e)).toBe(false);
});

it('builds the request: internal only for Add update, ask dealer and close always visible', () => {
  expect(toUpdateInput({ ...emptyDeskUpdate(), remark: ' Note ', status: 'Hold', showToDealer: false })).toEqual({
    action: 'update', remark: 'Note', status: 'Hold', visibleToDealer: false,
  });
  expect(toUpdateInput({ ...emptyDeskUpdate('clarify'), remark: 'Photo?', status: 'Hold', showToDealer: false })).toEqual({
    action: 'clarify', remark: 'Photo?', visibleToDealer: true,
  });
  expect(toUpdateInput({ ...emptyDeskUpdate('close'), remark: 'Dispatched.', showToDealer: false, attachmentIds: ['a1'] })).toEqual({
    action: 'close', remark: 'Dispatched.', visibleToDealer: true, attachmentIds: ['a1'],
  });
});

it('labels the remark field per action', () => {
  expect(remarkLabel('close')).toBe('Final remarks for the dealer');
  expect(remarkLabel('update')).toBe('Remark');
});
