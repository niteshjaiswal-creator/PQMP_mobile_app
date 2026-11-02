import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Project root defaults to two levels above this package (PQMP/tools/pqmp-mcp -> PQMP).
export const ROOT = process.env.PQMP_ROOT
  ? path.resolve(process.env.PQMP_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const DOCS_DIR = path.join(ROOT, 'docs');
export const ANALYSIS_DIR = path.join(ROOT, 'analysis');
export const REQUIREMENTS_FILE = path.join(ANALYSIS_DIR, 'requirements.json');
export const SRS_FILE = path.join(ANALYSIS_DIR, 'srs-sections.json');
export const TRACE_FILE = path.join(ANALYSIS_DIR, 'traceability.json');
export const PORTAL_DIR = path.join(ANALYSIS_DIR, 'portal');
