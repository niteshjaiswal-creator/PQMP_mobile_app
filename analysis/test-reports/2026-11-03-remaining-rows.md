# Test report: remaining `implemented` rows (mock triggers) on the Android emulator

Date: 2026-11-03. Platform: **Android 14 emulator only** (Pixel 8 Pro AVD, API 34, `emulator-5554`). iOS not exercised (Windows machine). Build: debug over Metro, `useMockApi: true`. Users: mock `dealer`, `dealer2`, `desk`, `admin`, and the new `expire`. No portal or real case was touched.

Scope: the six rows the dealer phase (`2026-11-03-dealer-phase.md`) left at `implemented` because the mock backend could not trigger them: AUTH-03, LIST-04, DETAIL-08, ATTACH-02, FLOW-01, DATA-01. DASH-04 (open defect D-08, needs an API filter) was not in scope.

## Summary

| | Count |
|---|---|
| Requirements in scope | 6 |
| Passed every criterion on device, set to `tested` | 6 |
| Kept `implemented` | 0 |
| Defects found | 1 (fixed: D-R1) |

Automated checks after the changes (from `mobile/`): `npm run typecheck` pass, `npx eslint . --max-warnings=0` pass, `npx jest` 22 suites / 168 tests pass (4 new tests, 2 changed expectations). Maestro CLI is not installed, so flows were written but not run.

## Mock triggers added (`mobile/src/mock`, documented in `README.md`)

| Trigger | Where | What it does |
|---|---|---|
| User `expire` (dealer, Shree Motors) | `data.ts` `USERS`, `EXPIRING_USER`, `EXPIRING_USER_CALLS = 12`; `server.ts` `userFrom`, `/auth/login`, `/auth/refresh` | Access token is rejected with 401 after 12 API calls; `/auth/refresh` refuses its refresh token; signing in resets the count |
| Restricted case `106777` | `data.ts` `RESTRICTED_CASE_IDS` and dealer notification `n0` ("Case moved to another dealer", read); `server.ts` `findCase` | Every `/cases/106777*` call returns 403 `FORBIDDEN` |
| Real download URLs | `files/sample.pdf`, `files/sample-image.png`; `server.ts` `setMockFileOrigin` + `/attachments/:id/download`; `index.ts` passes the dev server origin | Returns `<metro origin>/assets/src/mock/files/<file>` (images get the PNG, everything else the PDF). Checked first with curl: Metro serves `/assets/src/mock/files/*` with the right content type. Unknown attachment ids now return 404. In jest there is no dev server, so the URL stays a placeholder |
| Escalated case `MH261025106870` (dealer2, Desk 2, P2) | `data.ts` `CASES` | Lets the Escalated label be seen. All existing case ids are unchanged; the management report test now expects total 9 / open 7 (was 8 / 6) |

## Per-requirement results

| ID | Criteria checked on device | Result | Evidence |
|---|---|---|---|
| AUTH-03 | Signed in as `expire`, moved Cases → case detail → Updates → Home. On the call after the limit the app tried one refresh (refused) and returned to Login with "Your session has expired. Please log in again." Force-stop + relaunch then showed Login with no restored session, so the keychain tokens were cleared. Session restore, sign-out confirmation and signing back in passed in the dealer phase. | Pass | Login screen with the notice. Inactivity timeout policy is still undefined by VECV: open question, not a failure |
| LIST-04 | As `dealer`: status In Progress → only EUR261024106958, filter button "Filters, 1 applied". Added category Order Status, sub-category Execution/EDA Required, P2, order-related only → EUR only, "Filters, 5 applied". Clear all reset every section in the sheet; with Raised: Last 7 days → only ITD261101106998 (raised 31 Oct). Clear all + Show cases → all 3 open cases, button label back to "Filters" | Pass | The badge is a dot; the count is only in the accessibility label (observation) |
| DETAIL-08 | EUR261024106958 → Messages → Files · 2. "Invoice scan.jpg" opened the sample image in Chrome. "LR copy.pdf" made Chrome offer a download (594 B saved to Downloads), which opened in the Drive PDF viewer showing "PQMP mock attachment". Returning with Back keeps the case screen | Pass | |
| ATTACH-02 | Same journey as DETAIL-08 (permitted files listed with source, uploader, date, size; view or download works) | Pass | |
| FLOW-01 | `desk` on WPS261029106930: Assigned → In Progress → On Hold → Resume, with the pill, latest update and timeline correct at each step. `admin` transferred DRLR261022106911 from Desk 2 to Desk 3 with a note → "Reassigned" in the pill. As `dealer` the same case shows "Assigned", latest update "Your case is with PQMP Support." and no transfer entry. `dealer2` sees COC261020106800 "On Hold" and MH261025106870 "Escalated" in the list and the detail, handled by "PQMP Support" only. Desk filter sheet chips: New, Assigned, Reassigned, In Progress, On Hold, Resume, Escalated, Reopened, Closed | Pass after D-R1 | `screens/FLOW-01-resume-labelled-in-progress-for-desk.png` (before the fix). The dealer-side label for Resume ("In Progress") is covered by unit tests; no mock dealer owns a Desk 1 case that can be resumed without a longer setup |
| DATA-01 | As `dealer`: Updates → "Case moved to another dealer" → case screen shows "You do not have access to this information." and Try again; no status code, error code, URL or stack text | Pass | Offline negative passed in the dealer phase |

Raw-value check on every screen visited (list, filter sheet, case detail, Messages, Updates, Login): no `null`, `undefined`, `NaN`, `0000-00-00`, `Invalid Date`, HTTP codes or stack text. Dealers never saw a desk name.

## Defects

| # | Req | Steps | Expected | Actual | Fix |
|---|---|---|---|---|---|
| D-R1 | FLOW-01 | As `desk`, put WPS261029106930 On Hold, then Update case | Internal users see the portal status "Resume" (as they see "Reassigned"); dealers see "In Progress" | The status option for Resume read "In Progress"; after saving, the internal timeline said "In Progress"; the internal filter sheet had two "In Progress" chips (In Progress and Resume) | `src/domain/case-status.ts` `portalStatusLabel()` returns "Resume" for internal users; `src/features/desk/UpdateCaseSheet.tsx` (desk-only) passes `internalView`; `src/features/case-detail/timeline.ts` passes `internalView` to the status label. Tests added in `case-status.test.ts` and `timeline.test.ts` |

### Observations (not app defects)

- Debug-build tap handling: the first tap right after a sheet opens or closes was often dropped, and after the app was backgrounded through the launcher, Modal sheets stopped opening until a force-stop (same as the dealer-phase note). Recheck on a release build.
- The case list "Filters" button shows a dot, not a number. The number is only in its accessibility label ("Filters, 5 applied"). Fine for the requirement; note for design review if a visible count is wanted.
- Chrome showed its first-run notification prompt on the first file open (emulator state, not the app).
- An internal transfer updates the case's "Updated" time on the dealer's card, although the transfer itself is hidden from the dealer.

## Maestro flows recorded (not run, CLI missing)

- `mobile/.maestro/dealer/filters-access-expiry.yaml`: LIST-04 filters and Clear all, DATA-01 restricted notification, AUTH-03 `expire` session expiry.
- `mobile/.maestro/desk/status-labels.yaml`: FLOW-01 Hold and Resume as desk, On Hold and Escalated as dealer2.

## Coverage gaps

- iOS not tested.
- Session inactivity timeout (SRS 8.1.4): no policy from VECV yet.
- File download used Metro-served sample files; real signed URLs, expiry and content types depend on the backend.
- The dealer-side "Resume" label ("In Progress") is covered by unit tests only, not seen on device.
- Maestro flows not executed.
