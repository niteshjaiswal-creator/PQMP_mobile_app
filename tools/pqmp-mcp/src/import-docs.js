#!/usr/bin/env node
// Converts the requirement documents in docs/ into structured JSON under analysis/.
//   analysis/requirements.json  - one entry per row of the task list workbook, with stable-ish IDs
//   analysis/srs-sections.json  - the solution document split into numbered sections
// Re-run whenever docs/ changes: `npm run import-docs` (from tools/pqmp-mcp).
import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { PDFParse } from 'pdf-parse';
import { ROOT, DOCS_DIR, ANALYSIS_DIR } from './paths.js';

// Module name in the workbook -> ID prefix. Unknown modules fall back to an upper-case slug.
const MODULE_PREFIX = {
  'Login and Access Management': 'AUTH',
  'Home Dashboard and Analytics': 'DASH',
  Dashboard: 'DASH',
  'Case Creation': 'CREATE',
  'My Cases and Case Listing': 'LIST',
  'Case Listing': 'LIST',
  'Case Detail and Live Tracking': 'DETAIL',
  'Case Detail': 'DETAIL',
  'Workflow, Assignment and SLA': 'FLOW',
  'Order Status Visibility': 'ORDER',
  'Part-Wise Status Visibility': 'PART',
  'Invoice / Barcode / Scan-Assisted Capture': 'SCAN',
  'Consignment Tracking': 'CONSIGN',
  'Attachments and Comments': 'ATTACH',
  'Notifications and Alerts': 'NOTIF',
  'Customer Feedback': 'FEEDBACK',
  'Data Display, Audit and Error Handling': 'DATA',
  Profile: 'PROFILE',
};

const prefixFor = (module) =>
  MODULE_PREFIX[module] ?? module.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');

const cellText = (cell) => {
  const v = cell?.value;
  if (v == null) return '';
  if (typeof v === 'object' && 'richText' in v) return v.richText.map((r) => r.text).join('');
  return String(v).replace(/�/g, '-').trim();
};

async function importWorkbook(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  const counters = {};
  const requirements = [];
  let module = '';
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const [a, b, c] = [1, 2, 3].map((i) => cellText(row.getCell(i)));
    if (a) module = a;
    if (!b && !c) return;
    const prefix = prefixFor(module);
    counters[prefix] = (counters[prefix] ?? 0) + 1;
    requirements.push({
      id: `${prefix}-${String(counters[prefix]).padStart(2, '0')}`,
      module,
      featureGroup: b,
      requirement: c,
      // Rows tagged "Additional Prototype Screen" come from the clickable prototype, not the SRS.
      // Per SRS 1.5(8) anything outside the existing portal behaviour needs VECV approval.
      source: b === 'Additional Prototype Screen' ? 'prototype' : 'task-list',
      sourceRow: rowNumber,
    });
  });
  return requirements;
}

const PAGE_NOISE = [/^PQMP_Mobile_App_[\d.]+\s*$/, /^\s*\d{1,2}\s*$/, /^--\s*\d+ of \d+\s*--$/];

async function importSrs(file) {
  const parser = new PDFParse({ data: await fs.readFile(file) });
  const { text } = await parser.getText();
  await parser.destroy();

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/�/g, "'").replace(/\s+$/, ''))
    .filter((l) => !PAGE_NOISE.some((re) => re.test(l)));

  // Top-level headings come from the table of contents ("7. Functional Modules ....... 16").
  const toc = [];
  for (const l of lines) {
    const m = l.match(/^(\d+)\.\s+(.+?)\s*\.{3,}.*?\d+\s*$/);
    if (m) toc.push({ number: m[1], title: m[2].replace(/[.\s]+$/, '') });
  }
  const tocEnd = lines.findIndex((l, i) => i > 0 && /^1\.\s+Introduction\s*$/.test(l));

  const sections = [];
  let current = { number: '0', title: 'Cover', lines: [] };
  for (const l of lines.slice(Math.max(tocEnd, 0))) {
    const top = toc.find((t) => {
      const head = `${t.number}. ${t.title}`;
      return l.trim() === head || (l.startsWith(`${t.number}. `) && head.startsWith(l.trim()) && l.trim().length > 8);
    });
    const sub = l.match(/^(\d+\.\d+)\s+([A-Z].*)$/);
    if (top || sub) {
      if (current.lines.length) sections.push(current);
      current = top ? { number: top.number, title: top.title, lines: [] } : { number: sub[1], title: sub[2].trim(), lines: [] };
      continue;
    }
    current.lines.push(l);
  }
  sections.push(current);
  return sections
    .map(({ number, title, lines }) => ({ number, title, text: lines.join('\n').trim() }))
    .filter((s) => s.text);
}

async function main() {
  const files = await fs.readdir(DOCS_DIR);
  const xlsx = files.filter((f) => f.endsWith('.xlsx') && !f.startsWith('~$'));
  const pdfs = files.filter((f) => f.endsWith('.pdf'));
  await fs.mkdir(ANALYSIS_DIR, { recursive: true });

  const requirements = [];
  for (const f of xlsx) requirements.push(...(await importWorkbook(path.join(DOCS_DIR, f))).map((r) => ({ ...r, document: f })));
  const sections = [];
  for (const f of pdfs) sections.push(...(await importSrs(path.join(DOCS_DIR, f))).map((s) => ({ ...s, document: f })));

  await fs.writeFile(path.join(ANALYSIS_DIR, 'requirements.json'), JSON.stringify(requirements, null, 2) + '\n');
  await fs.writeFile(path.join(ANALYSIS_DIR, 'srs-sections.json'), JSON.stringify(sections, null, 2) + '\n');
  console.log(
    `Imported ${requirements.length} requirements from ${xlsx.length} workbook(s) and ` +
      `${sections.length} SRS sections from ${pdfs.length} PDF(s) into ${path.relative(ROOT, ANALYSIS_DIR)}/`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
