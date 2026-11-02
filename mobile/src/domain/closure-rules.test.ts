// FEEDBACK-01/02, DETAIL-14, ATTACH-05 — SRS 9.4.5 (mandatory reopen remarks), 9.5 (1–5, optional remarks).
import { validateFeedback, validateReopen } from './closure-rules';

it('requires meaningful reopen remarks', () => {
  expect(validateReopen('  ')).toBe('Please add a reason to reopen the case.');
  expect(validateReopen('no')).toMatch(/at least 10/);
  expect(validateReopen('x'.repeat(301))).toMatch(/300/);
  expect(validateReopen('Cartons damaged again on the next order.')).toBeNull();
});

it('requires a 1–5 rating and keeps remarks optional', () => {
  expect(validateFeedback(null, '')).toBe('Choose a rating from 1 to 5.');
  expect(validateFeedback(6, '')).toBe('Choose a rating from 1 to 5.');
  expect(validateFeedback(4, '')).toBeNull();
  expect(validateFeedback(5, 'x'.repeat(501))).toMatch(/500/);
});
