# Management role: exploratory test report (2026-11-03)

## Summary

| | |
|---|---|
| Scope | Management reports home, tile drill-downs into My Cases, read-only case detail (development plan Phase 2; spec §8.2, §17; SRS 4.4, 4.5, 5.7, 14.1–14.4, 14.7, 14.8) |
| Platform | Android 14 emulator only (`Pixel_7_Pro_API_34_for_VPN`, `emulator-5556`), debug build, mock backend through Metro. iOS not exercised. |
| Result | 23 checks: 22 pass, 1 fail (shared file, for the coordinator). No defects in the reports files. |
| Static/unit | `npm run typecheck`, `npx eslint . --max-warnings=0`, `npx jest` pass (22 suites, 164 tests). |
| Maestro | Not installed, so not run. New flow recorded: `mobile/.maestro/management/tile-drilldowns.yaml` (each tile's list matches its count, read-only detail). Existing `management/reports.yaml` covers sections and scope chips. |
| Requirement IDs | None. Management has no task-list IDs, so traceability and the checklist were not touched. |

Test data: sign in `mgmt` (any password), fresh mock data per launch.

## Results

| # | Check | Result | Evidence / notes |
|---|---|---|---|
| 6.1 | Header "Management / Reports", MG avatar | Pass | |
| 6.2 | Tabs: Reports, Cases, Account only | Pass | No Updates and no + tab |
| 6.3 | Period chips (Last 30 days, Last 90 days, All time) change the report | Pass | All mock cases are within 30 days, so totals stay 8 (correct). Drill note "Lists opened from here show every date and category. Narrow them with Filters." appears when narrowed. |
| 6.4 | Category chips scroll horizontally and narrow the report | Pass | Order Status: Total 4, Open 4, Closed 0, Pending order 1, Feedback pending 0 |
| 6.5 | 8 summary tiles | Pass | Total 8, Open 6, Closed 2, Pending order 1, Updated today 1, High priority 1, Awaiting dealer reply 1, Feedback pending 1 |
| 6.6 | By category bars | Pass | Order Status 4, Logistics Support 1, Order Cancellation 1, Packaging 1, Project Poorti 1 (sum 8) |
| 6.7 | Open cases by status (no closed statuses) | Pass | New 2, Assigned 2, In Progress 1, On Hold 1 (sum 6) |
| 6.8 | Feedback: average, 5→1 bars, caption; low ratings link only when there are any | Pass | 5.0, "average of 1", 5:1, 4–1: 0. No low ratings in mock data, so no link (see Gaps). |
| 6.9 | Support desk workload table and Unassigned row (red) | Pass | Desk 1 2/0/1, Desk 2 2/0/0, Desk 3 0/2/0, Unassigned 2 – – (open sums to 6, closed to 2) |
| 6.10 | Pending order cases row and integration exceptions row | Pass | "Pending order cases · 1", "Integration exceptions · 5 / SAP 3 · Logistics 2" |
| 6.11 | Last refreshed | Pass | "Last refreshed: 03 Nov 2026, 10:45", clear of the tab bar at the bottom of the scroll |
| 6.12 | Offline error state and Try again | Pass | "You appear to be offline…" then recovers with the same scope |
| 7.1 | Total cases → All, 8 items | Pass | |
| 7.2 | Open → Open, 6 items | Pass | EUR, ICR, ITD, WPS, COC, DRLR |
| 7.3 | Closed → Closed, 2 items | Pass | PD261015106702, OQ261010106650 |
| 7.4 | Pending order → 1 item, filter dot shown | Pass | EUR261024106958 |
| 7.5 | Updated today → All, 1 item | Pass | EUR261024106958 |
| 7.6 | High priority → 1 item | Pass | ICR261102107012 |
| 7.7 | Awaiting dealer reply → 1 item | Pass | EUR261024106958 |
| 7.8 | Feedback pending → Closed, 1 item | Pass | PD261015106702 |
| 7.9 | Case detail read-only: no action bar, no composer, no Add file, no feedback form, no reopen (open case EUR and closed case PD) | Pass | Open case: "Messages are read-only for your role." Order, parts and tracking render, with Last refreshed; invalid invoice date shows "Awaiting Update", one feed shows "Tracking unavailable right now". |
| 7.10 | Read-only note on a closed case | **Fail (shared file)** | Says "This case is closed. Reopen it to send a message." Management can't reopen. Defect M1. Screenshot `screens/MGMT-7-closed-reopen-hint.png`. |
| 8 | No null, undefined, NaN, 0000-00-00, Invalid Date, HTTP codes or stack traces on Reports, Cases, case detail (all tabs), Account | Pass | |

## Defects

### M1. Closed case tells management to reopen it (coordinator)

- Steps: `mgmt` → Feedback pending tile → PD261015106702 → Messages.
- Expected: a read-only note that doesn't offer an action the role can't take, e.g. "This case is closed."
- Actual: "This case is closed. Reopen it to send a message." The same text shows for admin on a closed case; admin can't reopen either.
- File: `mobile/src/features/case-detail/MessagesTab.tsx` line 170.
- Proposal: `detail.statusGroup === 'closed' ? (detail.actions.canReopen ? 'This case is closed. Reopen it to send a message.' : 'This case is closed.') : 'Messages are read-only for your role.'`

## Observations

- Management sees internal timeline entries (lock icon, e.g. "Internal remark", assignment transfers) and desk names on case cards and detail. That's consistent with management being an internal read-only role (SRS 4.5). Flag it to VECV only if management should get the customer-facing view.
- Drill-downs don't carry the report's period or category (spec §17.1, known). The screen says so when the scope is narrowed.
- "average of 1" reads oddly for a single rating, but it matches the MgmtHome board wording ("average of 265"). Left as is.

## Gaps

- The low-ratings link (`maxRating=2` drill-down) wasn't exercised: the mock has no rating at or below 2.
- Region scope isn't offered (no region master). The API accepts `region`.
- SLA/ageing (14.5), audit trail (14.6) and closure review (14.9) are out of scope until approved.
- iOS not tested. Maestro flows not run (Maestro not installed).
