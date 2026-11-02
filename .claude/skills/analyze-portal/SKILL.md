---
name: analyze-portal
description: Explore the existing PQMP/EGP web portal with the Playwright MCP browser to capture screens, form fields, validations, master values, status labels and the backend API calls the mobile app must reuse. Use before building a module, when API contracts are unknown, or when asked how the portal does something.
argument-hint: "[module or screen, e.g. 'case creation' | all] [portal URL]"
---

# Analyse the web portal

SRS 1.5(8): existing portal business rules, field mappings, status mappings and KPIs carry over to the mobile app. So the portal is the reference implementation. This skill records what it does in `analysis/portal/`.

## Safety rules (non-negotiable)

- **UAT/test portal only.** Get the URL from `$ARGUMENTS`, else `PQMP_PORTAL_URL` in `.env`. If it looks like production, or you're unsure, ask the user before navigating.
- **Never type, store or echo credentials.** Open the login page and ask the user to sign in themselves in the browser window. The `.playwright-profile/` folder keeps the session for later runs.
- **Read-only by default.** Don't click Submit, Save, Close, Reopen, Assign, Delete, Approve or Upload. Don't send feedback. Opening a form and triggering client-side validation (blur fields, or submit an empty form that the browser blocks) is fine. Anything that would create or change a record needs explicit user approval for that specific action.
- **Redact** tokens, cookies, session IDs, phone numbers, emails and dealer personal data before writing any file. Use clearly fake placeholders.

## Procedure

1. `browser_navigate` to the portal and take a `browser_snapshot`. If you're not logged in, ask the user to log in and say "done", then snapshot again.
2. Map the navigation into `analysis/portal/sitemap.md`: menu items, their URLs, and which requirement module prefix each serves. Call `list_requirements` to get the prefixes.
3. For each screen in scope:
   - `browser_snapshot` for structure, and `browser_take_screenshot` with filename `analysis/portal/screens/<screen>.png`.
   - Record every field: label, control type, required or optional, max length or format, default value, and dependency. For example, sub-category depends on category, and dynamic fields depend on sub-category (CREATE-04).
   - Open each dropdown and record the option values. These are the master data: categories, sub-categories, statuses, priorities. Put them in `analysis/portal/masters.md`.
   - Trigger validations safely and record the exact messages.
   - Record list columns, filters, search behaviour, sort order, pagination and export.
   - For case detail: record timeline event types, how status labels are shown, and where desk or owner names appear. Customer-facing mobile screens must hide desk names (SRS 4.2).
   - Write `analysis/portal/<screen>.md`, using the template below.
4. **API contracts.** After interacting with each screen, call `browser_network_requests`. For XHR/fetch calls to the backend, use `browser_evaluate` to re-read a response body only for GET requests already made by the page. Document each endpoint in `analysis/portal/api-contracts.md`:
   - method and path
   - query/body shape
   - response shape: field names, types, example values (redacted)
   - auth mechanism: cookie, bearer or other, with the value redacted
   - pagination and error format

   Note SAP-sourced fields and their raw formats (YYYYMMDD dates, 0000-00-00, status codes). These feed `src/domain/display.ts` and the status mapping.
5. **Status mapping.** Collect every status code or label seen into the table in `masters.md`: backend code → portal label → `CaseStatus` in `mobile/src/domain/case-status.ts`. Flag any code that has no mapping.
6. **Gap analysis.** For each requirement ID in scope, record whether the portal already does it, does it differently, or doesn't do it. Call `update_traceability` with `portalEvidence: ["analysis/portal/<screen>.md"]`. Add `openQuestions` where the portal and the SRS disagree.

## Screen note template

```markdown
# <Screen name>
URL: <path only>   Captured: <date>   Requirement IDs: <...>
Screenshot: screens/<screen>.png

## Purpose and entry points
## Fields
| Label | Type | Required | Format / options | Depends on | Maps to (types.ts) |
## Actions and their effects (observed, not executed unless approved)
## Validation messages (verbatim)
## Data display quirks (blank dates, codes shown raw, etc.)
## API calls (link to api-contracts.md anchors)
## Mobile notes: what to keep, simplify or hide
```

Finish by telling the user:

- which screens were captured
- which API contracts are now known, and which are still TBD
- any portal behaviour that conflicts with the SRS

Point the user to `/analyze-requirements <PREFIX>` to fold the findings into the module spec.
