# Test report: EGP support desk role on the Android emulator (mock API)

Date: 2026-11-03. Platform: **Android 14 emulator only** (Pixel 8 Pro AVD, API 34, adb `emulator-5554`). iOS not exercised (Windows machine). Build: debug over Metro, `useMockApi: true` (`mobile/src/mock`). Signed in as mock user `desk` (Support Desk 1), plus `dealer` (Shree Motors, 1S1148) for the reply side of FLOW-03 and the DASH-04 regression. No portal or real case was touched.

Scope: Phase 3 support desk (`analysis/development-plan.md`), API spec §15, boards `DeskHome`, `DeskCaseDetail`, `DeskUpdate`; SRS 4.3, 5, 8.8, 9.4.1, 13.2. Requirements traced: FLOW-03, DASH-04.

## Summary

| | Count |
|---|---|
| Checks run on device | 31 |
| Passed | 28 |
| Failed | 1 (D-1, desk home rows differ from the board) |
| Passed after a coordinator fix landed mid-run | 1 (closed-case notice, fixed in a02d0eb) |
| Not reachable with current mock data | 1 ("Reassigned" status on a Desk 1 card) |
| Defects | 1 major, 4 minor (all in shared files, for the coordinator); 1 already fixed |
| Traceability | FLOW-03 → `tested`, DASH-04 → `tested` |

Automated checks (unchanged source; only Maestro YAML added): `npm run typecheck` pass, `npx eslint . --max-warnings=0` pass, `npx jest` 22 suites / 164 tests pass. Maestro CLI is not installed on this machine, so step 3 (Maestro run) was skipped. Two new flows record the journeys that passed: `mobile/.maestro/desk/home-list-detail.yaml`, `mobile/.maestro/desk/clarification-round-trip.yaml`.

Raw-value check: home, My Cases, filter sheet, case detail (overview, order & parts, messages), update sheet, Updates and Account were read as the desk. No `null`, `undefined`, `NaN`, `0000-00-00`, `Invalid Date`, HTTP codes or stack traces. The `0000-00-00` invoice date on EUR261024106958 shows "Awaiting Update". As the dealer, support is always "PQMP Support" (no desk names).

### Environment notes (not app defects)

- The emulator's `adb reverse tcp:8081` tunnel answered 1 in 10 requests during this run. The mock's offline check (`src/mock/index.ts`) then failed calls as "You appear to be offline" and the Order & parts sections showed "temporarily unavailable". I pointed the app's debug server at `10.0.2.2:8081` (app dev setting `debug_http_host`, device-side only) and the link then held. Retest of those screens passed.
- Edits by other agents to shared files under the same Metro caused full reloads ("Refreshing…") that reset the in-memory mock data mid-run. Affected journeys were repeated from a clean launch.
- Typing "rr" (or two `r` keys close together) while no field has focus triggers a debug reload; one journey was repeated for this reason.

## Per-check results

| Step | Check | Result | Evidence |
|---|---|---|---|
| 1 | Home header "EGP Support Desk / Support Desk 1"; KPIs 2/2/1/0 count only Desk 1 cases | Pass | After closing WPS: 2/1/1/1 and Desk 1 bar 1 |
| 1 | Rows Dealer replied, Old / pending, Integration failures (SAP 3 · Logistics 2) | Pass | |
| 1 | "Awaiting dealer reply" row (board: Dealer replied, Awaiting dealer reply, Old / pending, SAP data unavailable; unassigned count on the team card) | **Fail** (D-1) | `screens/DESK-1-home-no-awaiting-row.png` |
| 1 | Open cases by desk bars (Desk 1 2, Desk 2 2, Desk 3 0) | Pass | |
| 1 | Old / pending · 1 opens My Cases filtered ("Filters, 1 applied"), 1 case EUR261024106958 | Pass | |
| 1 | Tab bar Home, Cases, Updates, Account; no + | Pass | |
| 2 | My Cases shows only Desk 1 cases (EUR261024106958, WPS261029106930) | Pass | |
| 2 | Dealer name and code on cards; "Support Desk 1" tag | Pass | |
| 2 | "Reassigned" (not "Assigned") on a re-routed case | Not reachable | EUR261024106958 was transferred but is now In Progress; no Desk 1 case is in Re-Assigned status in the mock. Timeline shows the transfer as "Assignment · Transferred from Support Desk 2 to Support Desk 1" |
| 2 | Search "Sai" → WPS only; "1S0876" → WPS only | Pass | |
| 3 | WPS261029106930: Dealer row "Sai Motors (1S0876)", status Assigned, "Handled by Support Desk 1", action bar Ask dealer + Update case | Pass | |
| 3 | Ask dealer with empty remark → "Enter the question for the dealer." | Pass | |
| 3 | Question sent → "Clarification requested" in timeline, latest update, and "Support Desk 1 · question for the dealer" in Messages | Pass | |
| 3 | Add update from Assigned offers only In Progress and On Hold | Pass | |
| 3 | Internal remark ("Show to dealer" off) → timeline "Internal remark" with lock icon | Pass | |
| 3 | Dealer-visible update with In Progress → status In Progress, timeline entry with remark | Pass | |
| 3 | Close with empty final remarks → "Enter the final remarks for the dealer." | Pass | |
| 3 | Close shows confirm step; "Go back" returns to the form with remarks kept | Pass | |
| 3 | Confirm → status Closed, Resolution card, "Case closed" in timeline, action bar gone | Pass | |
| 3 | Closed case: composer replaced by read-only notice | Pass | |
| 3 | Notice text for desk | Pass after a02d0eb | Before the fix it read "Reopen it to send a message" (`screens/DESK-3-closed-notice-says-reopen.png`); after relaunch it reads "This case is closed." |
| 4 | EUR261024106958 timeline shows internal "Internal remark" (lock) and transfer entry | Pass | |
| 4 | Order & parts tab for desk: order header, Partially Delivered, part F8210300 4/2/2, EDA, invoice date "Awaiting Update", Last refreshed | Pass | First attempt failed only because of the network issue above |
| 5 | Desk sends a message → appears as "Support Desk 1" bubble | Pass | |
| 5 | Airplane mode → send fails with "You appear to be offline…", text kept; airplane off → resend succeeds | Pass | Error is below the fold (D-2) |
| 6 | No raw values on every screen visited | Pass | |
| 7 | Dealer: "1 order or delivery update" → My Cases shows exactly 1 (EUR261024106958); checked twice | Pass | DASH-04 → tested |
| FLOW-03 | Dealer sees desk question in Awaiting card as "PQMP Support", Reply opens Messages with "Replying to: …", reply sent, Awaiting card clears | Pass | |
| FLOW-03 | Desk then sees the dealer reply in Messages and "Dealer replied · 1" on home | Pass | FLOW-03 → tested |
| other | Updates as desk: "New case assigned to you", "Case transferred to you", unread filter | Pass | |
| other | Account as desk: user ID, desk, Location "Not Available" | Pass | |

## Defects

| # | Sev | Steps | Expected | Actual | File / proposed fix |
|---|---|---|---|---|---|
| D-1 | Major (design) | Sign in as `desk`, look at home | Board `DeskHome`: Dealer replied · n, **Awaiting dealer reply · n** ("Questions you asked", opens the list), Old / pending, SAP data unavailable; unassigned count shown on the "Open cases by desk" card | An "Unassigned · 2 / Waiting for a desk" row (not tappable for desk) sits first; there is no Awaiting dealer reply row | `mobile/src/screens/home/HomeScreen.tsx:116`. For the support role, replace the Unassigned row with `Awaiting dealer reply · ${dash.awaitingUserResponse}` (subtitle "Questions you asked", `onPress={() => openCases('reply')}`); the mock already computes `awaitingUserResponse` over the desk's own cases. Keep the Unassigned row for admin, and show "N unassigned" in the by-desk card header for desk. "Dealer replied" stays non-tappable until the API has a filter (FLOW-03 open question). |
| D-2 | Minor | Desk, open case, Messages, airplane mode on, send | Error visible next to the composer | "You appear to be offline…" renders under the input, hidden behind the desk action bar until the user scrolls | `mobile/src/features/case-detail/MessagesTab.tsx:167` (`messages.sendError`). Render the error above the input row, or have `CaseDetailScreen` add bottom padding equal to the internal action bar height and scroll to end when `sendError` is set. |
| D-3 | Minor | Desk, Update case, tap Remark | Field stays visible above the keyboard | Keyboard covers the multi-line remark field; typing is blind until the keyboard is hidden | `mobile/src/components/Sheet.tsx:22`. `KeyboardAvoidingView` has `behavior={undefined}` on Android; use `'height'` on Android (or scroll the sheet's ScrollView to the focused input). |
| D-4 | Minor | Desk, My Cases, search box | Hint says dealer name/code can be searched (search works) | Placeholder "Case no. or order no." and label "Search by case number or order number" | `mobile/src/screens/cases/CaseListScreen.tsx:93`. For non-dealer roles use "Case, order or dealer" and update the accessibility label. |
| D-5 | Minor | Desk sends a message, then views Overview | Latest update and timeline say what happened | Latest update card and timeline show "New message" with no text | `mobile/src/mock/server.ts:515`. Either keep comment events out of `latestUpdate` / the timeline (Messages already lists them), or include the comment text. Confirm the intended backend behaviour in the API spec (timeline and comments). |
| D-6 | Minor | Desk, Filters | Status chips cover desk-relevant statuses | No "Reassigned" or "Resume" chip, so a desk cannot list re-routed cases | `mobile/src/features/cases/filters.ts:32` (`FILTER_STATUSES`). Add `'Re-Assigned'` (label via `portalStatusLabel`, "Reassigned" for internal users) for non-dealer roles. |
| fixed | Minor | Desk closes a case, opens Messages | "This case is closed." | "This case is closed. Reopen it to send a message." | Fixed by the coordinator in a02d0eb (`MessagesTab.tsx`), verified after relaunch. |

No defects were found in the desk-owned files (`src/features/desk/*`, `src/domain/desk-update*`), so none were edited.

## Coverage gaps

- "Reassigned" status label on a desk card was not reachable: no Desk 1 case is in Re-Assigned status in `src/mock/data.ts`. Needs a mock case or an admin transfer during the run (admin journey).
- Desk is not notified when the dealer replies (Updates shows only assignment notifications). The API spec notification types include `response_added`; the mock does not raise it for the desk. Confirm whether desks get this notification.
- Not exercised on device: Attach file in the update sheet, On Hold → Resume, a `STATUS_NOT_ALLOWED` (409) response (covered by `src/domain/desk-update.test.ts` and `__tests__/desk-journey.test.tsx`).
- Maestro not run (CLI not installed). iOS not run.
- Support desk mobile access still needs VECV approval before release (SRS 4.3, FLOW-03 open question).
