// Attachment checks before upload (ATTACH-01, CREATE-07, SRS 7.10, 11.6, 18.5). The server enforces the
// final policy (Attachment Policy Master); these defaults are the proposed limits until VECV confirms.

export type AttachmentPolicy = { maxSizeMb: number; mimeTypes: string[]; max: number };

export const DEFAULT_POLICY: AttachmentPolicy = {
  maxSizeMb: 10,
  mimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  max: 5,
};

export type PickedFile = { uri: string; name: string; type: string; size: number | null };

/** Business-readable reason a file can't be attached, or null if it's fine. */
export function attachmentProblem(file: PickedFile, alreadyAttached: number, policy: AttachmentPolicy = DEFAULT_POLICY): string | null {
  if (alreadyAttached >= policy.max) return `You can attach up to ${policy.max} files.`;
  const mime = file.type.toLowerCase();
  const allowed = policy.mimeTypes.includes(mime) || (mime === 'image/jpg' && policy.mimeTypes.includes('image/jpeg'));
  if (!allowed) return 'This file type is not supported. Use a PDF, JPG or PNG.';
  if (file.size != null && file.size > policy.maxSizeMb * 1024 * 1024) return `This file is larger than ${policy.maxSizeMb} MB.`;
  return null;
}

export function formatSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return 'Size not available';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
