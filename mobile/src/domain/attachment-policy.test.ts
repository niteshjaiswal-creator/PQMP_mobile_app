// ATTACH-01, CREATE-07 — SRS 7.10, 18.5: type and size validation with readable messages.
import { attachmentProblem, formatSize } from './attachment-policy';

const f = (type: string, size: number | null = 1000) => ({ uri: 'file://x', name: 'x', type, size });

it('accepts PDF, JPG and PNG within the limit', () => {
  expect(attachmentProblem(f('application/pdf'), 0)).toBeNull();
  expect(attachmentProblem(f('image/jpg'), 0)).toBeNull();
  expect(attachmentProblem(f('image/png', null), 0)).toBeNull();
});

it('rejects other types, oversize files and too many files', () => {
  expect(attachmentProblem(f('application/zip'), 0)).toMatch(/not supported/);
  expect(attachmentProblem(f('image/png', 11 * 1024 * 1024), 0)).toBe('This file is larger than 10 MB.');
  expect(attachmentProblem(f('image/png'), 5)).toBe('You can attach up to 5 files.');
});

it('formats sizes without raw numbers', () => {
  expect(formatSize(1_200_000)).toBe('1.1 MB');
  expect(formatSize(240_000)).toBe('234 KB');
  expect(formatSize(null)).toBe('Size not available');
});
