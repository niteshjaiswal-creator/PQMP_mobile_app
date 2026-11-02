---
name: analyze-requirements
description: Analyse PQMP requirement documents (docs/*.xlsx task list, docs/*.pdf solution document) for one module or all modules and produce an implementation-ready spec with acceptance criteria, data needs, API dependencies and open questions. Use when starting a module, when docs/ changes, or when asked what a feature must do.
argument-hint: "[module prefix e.g. CREATE | requirement IDs | all]"
---

# Analyse requirements

Turns the raw requirement documents into `analysis/modules/<PREFIX>.md`, the spec that `build-feature` and `test-mobile` work from. Tools come from the `pqmp-requirements` MCP server.

## 1. Refresh the index if the documents changed

If any file in `docs/` is newer than `analysis/requirements.json`, run:

```
npm --prefix tools/pqmp-mcp run import-docs
```

IDs are assigned per module in workbook row order. If rows were inserted mid-module, IDs after them shift. Diff `analysis/requirements.json` against git and tell the user before carrying on.

## 2. Gather

For the requested scope (`$ARGUMENTS`; default: ask which module):

1. `list_requirements` with `module` = the prefix.
2. `get_requirement` for each ID, which returns the related SRS sections.
3. `get_srs_section` for the rule sections that always apply to that module:
   - Every module: 9.3 (display rules), 11.9 (integration errors), 18.5 (exception handling).
   - CREATE / SCAN: 6.2, 6.6, 8.4, 9.1, 11.7, 12.3, 13.4.
   - LIST / DASH: 8.2, 8.3, 13.2, 13.3, 14.
   - DETAIL / ORDER / PART / CONSIGN: 6.5, 6.7, 8.5–8.7, 9.2, 11.3, 11.8, 13.5–13.8, 18.2, 18.3.
   - FLOW: 10.
   - NOTIF: 7.9, 8.9, 11.5, 15.
   - FEEDBACK: 8.11, 9.5, 13.11.
   - AUTH: 5, 8.1, 11.4, 13.1.
4. `list_portal_analysis`. If the portal has been analysed, read the matching screen notes and `api-contracts.md`. Portal behaviour wins over the documents for existing features (SRS 1.5 point 8).

## 3. Check scope before specifying

Set a requirement's status to `needs-approval` (with `update_traceability` and an `openQuestions` entry) instead of specifying it when:

- `source` is `prototype`: prototype-only screens need VECV approval per SRS 1.5(8).
- It touches SRS 20 Out of Scope. Example: DETAIL-17 "Escalate Case" vs out-of-scope item 6, the escalation portal.
- It depends on an integration the SRS lists as unconfirmed:
  - 11.7: barcode format, OCR vs barcode.
  - 11.8: logistics API.
  - 10.4: SLA formulas.
  - 7.16: email case creation.

## 4. Write `analysis/modules/<PREFIX>.md`

```markdown
# <Module name> (<PREFIX>)
Sources: <requirement IDs>, SRS <sections>, portal notes <files or "not yet analysed">

## Screens and navigation
<screen> - route `src/app/...` - entry points - which requirement IDs it satisfies

## Requirements and acceptance criteria
### <ID> <feature group>
<requirement text>
- [ ] Given ... When ... Then ...   (SRS x.y)
Edge cases: missing data, API timeout, no access, closed case, ...

## Data
Fields with source (PQMP/EGP, ECC/SAP, scan, logistics), type, display rule (display.ts helper)

## API dependencies
Endpoint (from api-contracts.md, or "TBD - needs contract"), request, response, error handling

## Business rules already in code
Links to src/domain/* functions that implement rules; list rules still missing

## Test plan
Unit: domain functions. Component: screen states (loading, empty, error, data). E2E (Maestro): happy path + key negatives

## Open questions
Numbered; each names who must answer (VECV business, SAP IT, logistics partner)
```

Make acceptance criteria concrete and testable. Quote exact user-facing strings from the SRS, such as "Awaiting Update", "Not Available", "Temporarily Unavailable" and "tracking unavailable".

## 5. Record

Call `update_traceability` for every ID in scope:

- Set `status: analysed`, or `needs-approval` when step 3 applies.
- Add `openQuestions` where there are any.

Finish with a short summary: what's ready to build, what's blocked, and the top questions for VECV.
