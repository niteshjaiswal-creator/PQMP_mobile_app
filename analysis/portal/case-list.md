# Case list
URL: `/case`   Captured: 2026-10-27   Requirement IDs: LIST-01…13, DASH-04
Screenshot: [screens/case-list.png](screens/case-list.png)

## Purpose and entry points
This is the desk user's landing page after login and the "Cases" menu item. The "Create Case" button in the header goes to `/case/create`.

## Filters / search (GET form → `/case`)
| Label | Control | Param | Notes |
|---|---|---|---|
| Date From / Date To | text (datepicker) | `datefrom`, `dateto` | |
| Status | multi-select, default button "Open" | `status[]` | Grouped: open statuses vs `Close`. With no status selected, the list shows open cases only |
| Case type | multi-select "All Types" | `type[]` | Takes **sub-type ids** (28 values incl. legacy), see masters.md |
| Dealer | multi-select "All Dealers" | `dealer[]` | ~1,200 dealers |
| Search by Case Number | text | `case_keyword` | |
| Search by SO Number | text | `so_no_keyword` | |
| Search by SAP Number | text | `sap_no_keyword` | SAP document / invoice no. |
| Search by Part Number | text | `part_no_keyword` | |
| Select Level | multi-select | `case_level[]` | L1–L5 |
| Select Assigned User | multi-select | `assign_to[]` | Internal desk users |
| Search / Reset | buttons | | |

Pagination is Laravel `?page=N` at 15 rows per page. There's no user-selectable sort; the order looks like newest first. **Excel** export: `POST /case-export` (`is_export, datefrom, dateto, status[], type[]`).

## Columns (one row per case)
| Column | Example | Notes |
|---|---|---|
| Level badge | L1 | Escalation level |
| Assignee + status | "EGP Support-3 / Assigned" | **Internal desk name**, must be hidden from customers |
| Case No. + created | `P2` badge, `#ICR261026106958`, `26-Oct-26, 02:54:56 PM` | Link to `/case/{id}/edit`. One sample case number was cut short: `#DRLR26102610695` (id 106957), possibly a display/length bug |
| Case Type | Order Status | |
| Case Sub Type | Invoice Cancellation Request | |
| Time Elapsed | `25 Hr(s), 25 Min(s)` | Closed rows: "Time Elapsed (Including Hold)" |
| Action | accordion expand | Expanded: User Id, SAP Dealer Code, Modified Date, User Role (e.g. "Call Center"), Time Elapsed |

A reopen modal on this page posts `POST /case/re-open` with `case_id, case_type_id, case_type_code, protech_chassis_no, reopen_remark` (not executed).

## Data display quirks
- Higher Assembly list shows `30985 Hr(s)` elapsed for a case created 23-Sep-26, about 840 h earlier. The elapsed time there is wrong.
- Date format on this screen is `DD-Mon-YY, hh:mm:ss AM`. Other screens use other formats (see case-detail.md).

## Mobile notes
- Keep: status, type/sub-type, case no., created/modified date, search by case/SO/SAP/part no. (LIST-03 asks for case + order no.; the portal also searches SAP and part no.).
- Hide for customers: assignee, assigned-user filter, user role, dealer filter (scope comes from login).
- Prototype LIST-11/13 (level badges, User Id / SAP Dealer Code / Modified Date / Role / Elapsed) match this accordion exactly.
- The portal has no "latest update" (LIST-06), feedback-pending (LIST-07) or consignment (LIST-08) indicators.
