# Test report: dealer phase on the Android emulator (mock API)

Date: 2026-11-03. Platform: **Android 14 emulator only** (Pixel 8 Pro AVD, API 34). iOS not exercised (Windows machine). Build: debug over Metro, `useMockApi: true` (`mobile/src/mock`). Signed in as mock user `dealer` (Shree Motors, 1S1148). No portal or real case was touched.

## Summary

| | Count |
|---|---|
| Requirements in scope | 71 |
| Passed every criterion on device, set to `tested` | 64 |
| Kept `implemented` (a criterion not verifiable on device, or an open defect) | 7: AUTH-03, DASH-04, LIST-04, DETAIL-08, ATTACH-02, FLOW-01, DATA-01 |
| Defects found | 9 (8 fixed, 1 open: D-08) |
| Skipped (not built) | CREATE-08, SCAN-01 (camera) |

Automated checks after fixes: `npm run typecheck` pass, `npm run lint` pass (no warnings), `npx jest` 16 suites / 126 tests pass (3 new tests). Maestro CLI is not installed on this machine, so step 3 (Maestro run) was skipped. Two new flows were added for journeys that passed manually (see Coverage).

Raw-value check: on every data screen visited (home, My Cases, filter sheet, case detail overview/order/messages, create steps, Updates, Account) no `null`, `undefined`, `NaN`, `0000-00-00`, `Invalid Date`, desk names, HTTP codes or stack traces were seen. Support is always "PQMP Support".

## Per-requirement results

| ID | Criteria checked on device | Result | Evidence |
|---|---|---|---|
| AUTH-01 | Sign out, sign back in as dealer | Pass | Account → Sign out → login → home |
| AUTH-02 | Inactive user blocked | Pass (earlier run today) | `2026-11-03-auth-emulator.md` |
| AUTH-03 | Session kept across app restart and JS reload; sign-out confirm; sign in again | Partial: expiry message and inactivity timeout not exercisable with the mock | kept `implemented` |
| AUTH-04 | Wrong password → friendly banner, no technical detail | Pass | |
| DASH-01 | KPIs 5/3/1/2 match dealer's cases; recently updated; counts update after new case (6/4) | Pass | |
| DASH-02 | Awaiting response card + Reply, feedback pending, order/delivery update rows | Pass (card clears after reply once D-04 fixed) | |
| DASH-03 | +, Cases, See all, Updates, bell | Pass | |
| DASH-04 | Closed and feedback tiles open matching filtered list | **Fail** for order-update tile (D-08) | `screens/DASH-04-order-updates-tile-mismatch.png` |
| LIST-01 | Only own dealer's cases; Open/Closed/All | Pass | |
| LIST-02 | Card fields: no., category, sub-category, status, priority, order ref, latest update, raised, updated | Pass | |
| LIST-03 | SO 4100231876, partial case no., no-match empty state | Pass | |
| LIST-04 | Sheet has all filters; category + sub-category + priority, order-related applied | Partial: status and date chips not applied on device | kept `implemented` |
| LIST-05..09 | Friendly status, latest update, "Rate this case", "Tracking" chip, no desk names / out-of-scope cases | Pass | |
| DETAIL-01..05 | Header, latest update on top, timeline, "Handled by PQMP Support", description/remarks/references | Pass | |
| DETAIL-06 | Message box on open case, read-only notice on closed case | Pass | |
| DETAIL-07 | Clarification shown, reply with context, response event | Pass after D-05/D-06 | |
| DETAIL-08 | File list; tap opens download URL | Partial: mock URL is a placeholder | kept `implemented` |
| DETAIL-09..11 | Order tab only for order-related; parts; tracking incl. fallback | Pass | |
| DETAIL-12..14 | Closure remarks, rating + remarks, reopen with mandatory remarks | Pass | |
| FLOW-01 | New, Assigned, In Progress, Closed, Reopened labels | Partial: Hold/Resume/Escalated/Reassigned not reachable as dealer | kept `implemented` |
| FLOW-04 | Reopen needs remarks (empty and < 10 chars rejected) | Pass | |
| ORDER-01..04 | Order header, totals + overall status, Last refreshed, "Awaiting Update"/"Not Available"/section outage text | Pass (status pill colour fixed, D-07) | |
| PART-01..06 | Description + HSN, quantities and derived status, delivery/invoice, EDA, remarks, part LR | Pass | |
| CONSIGN-01..03 | LR 552019 events and refresh time, LR 551877 "Tracking unavailable" | Pass | |
| ATTACH-01 | Photo from gallery in create form and on an open (reopened) case | Pass after D-03 (mock) | |
| ATTACH-02 | As DETAIL-08 | Partial | kept `implemented` |
| ATTACH-03..05 | Comment, reply to clarification, reopen remarks | Pass | |
| FEEDBACK-01/02 | 1–5 required, optional remarks, read-only after submit | Pass | |
| NOTIF-01 | Updates list, unread dots/count, open marks read and opens case tab, Mark all read | Pass | |
| CREATE-01..07 | Steps, category/sub-category, dynamic fields, issue/contact fields, references/parts (+ manual part), upload | Pass after D-01/D-02 | |
| CREATE-09/10, SCAN-02..04 | Review and edit looked-up values, choose 2 of 3 parts, SAP-unavailable (0000000000) fallback | Pass | |
| CREATE-11..13 | Submit, server case number, `FAIL` keeps every input with readable error | Pass | |
| DATA-01 | No-access message | Not reachable from dealer UI (contract-tested) | kept `implemented` |
| DATA-02 | Timestamps on order, parts, tracking; offline error + retry | Pass after D-09 | `screens/DATA-02-offline-retry-misaligned.png` (before fix) |

## Defects

| # | Req | Steps | Expected | Actual | Fix |
|---|---|---|---|---|---|
| D-01 | CREATE-05 | New case → step 3 → Submit empty | Plain error under "How should we reach you?" | "Choose how should we reach you?." | `src/domain/case-validation.ts`: `requiredMessage()` uses "Choose an option." for question labels; unit test added |
| D-02 | CREATE-05 | Submit empty, then fill every field | Summary banner goes away | "Some details need attention…" stayed until next submit | `src/screens/create/CreateDetailsScreen.tsx`: banner cleared when the last field error is fixed |
| D-03 | CREATE-07, ATTACH-01 | Add photo in create form, submit, View case → Messages | Files · 1 | Files · 0; uploads also lost their file names | `src/mock/server.ts`: uploads stored and linked from `attachmentIds` on POST /cases and /cases/:id/attachments; test in `src/api/api.test.ts` (app already sent the ids) |
| D-04 | DASH-02, ATTACH-04, LIST-01, NOTIF-01 | Reply to clarification from home, go back | Home no longer shows "Awaiting your response"; list chip clears | Home, My Cases and Updates kept stale data until app restart (no refetch on focus) | New `src/components/useRefreshOnFocus.ts`, used by Home, CaseList (silent reload) and Notifications |
| D-05 | DETAIL-07 | Open EUR261024106958 → Messages | Dealer-facing wording | "PQMP Support · question for the dealer" shown to the dealer | `src/features/case-detail/MessagesTab.tsx`: "question for you" for dealers |
| D-06 | DETAIL-02/03 | Reply to clarification | Neutral customer-facing event | Latest update / timeline said "Dealer replied to support" to the dealer | `src/mock/server.ts`: "Reply to clarification received" |
| D-07 | ORDER-02 | EUR case → Order & parts | Overall status coloured by status, same casing as part status | Always amber; "Partially delivered" vs "Partially Delivered" | `src/features/case-detail/OrderPartsTab.tsx` `orderTone()`; `src/mock/data.ts` label |
| D-08 (open) | DASH-04 (SRS 8.2.4) | Home → "1 order or delivery update" | List of the 1 counted case | Opens all open order-related cases (4) | Needs an API change: a `/cases` filter for "order/part/EDA update in the last 7 days" (spec §dashboard `orderUpdates`). Not in this agent's files (`src/api`, `navigation`). Recorded as open question on DASH-04 |
| D-09 | DATA-02, 11.9 | Airplane mode on → open Cases/Updates | Readable offline error with retry | Mock answered in-process, so airplane mode had no effect; after fixing, "Try again" was left-aligned under centred text | `src/mock/index.ts`: calls fail as offline when the Metro dev server is unreachable (app only, off in tests); `src/components/states.tsx` centres the retry button; trigger documented in `src/mock/README.md` |

### Observations (not app defects)

- Dev-only: `adb shell input text` containing "r…r" while a sheet was focused triggered React Native's double-R reload once; after the activity was finished with BACK and relaunched (same JS host), Modal sheets did not open until a force-stop. Both are debug/Metro behaviours; recheck on a release build.
- Create failure banner reads "Temporarily Unavailable. Please try again…" (capitalised label used mid-sentence). Copy comes from `src/api/client.ts` (outside this agent's files).
- The corrected invoice reference on "Check details" is sent in `scan` but the mock does not echo it on the case detail, so it cannot be seen after creation.
- Updates empty state uses the briefcase icon.

## Coverage gaps

- Not exercised on device: session expiry message and inactivity timeout (AUTH-03); status and date-range filter chips (LIST-04); real file download (DETAIL-08, ATTACH-02); Hold/Resume/Escalated/Reassigned states (FLOW-01); no-access message (DATA-01); push notifications (NOTIF-02+, not in scope).
- Camera scan (CREATE-08, SCAN-01) not built.
- iOS not tested.
- Maestro flows not run (CLI missing). New flows recorded for passed manual journeys:
  - `mobile/.maestro/dealer/updates-account.yaml`: Updates open/mark read, sign out, wrong password, sign in.
  - `mobile/.maestro/dealer/offline-and-attachments.yaml`: airplane-mode error and retry, DRLR order fallback, add photo to an open case.
  Existing flows (`home-and-cases`, `case-tracking`, `closure-feedback-reopen`, `raise-case`) cover the other journeys walked today.
