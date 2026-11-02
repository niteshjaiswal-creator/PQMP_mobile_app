# Case detail / update
URL: `/case/{id}/edit`   Captured: 2026-10-27   Requirement IDs: DETAIL-01…17, FLOW-01/03/04, ORDER-*, PART-*, ATTACH-*, CONSIGN-*
Screenshot: [screens/case-detail-closed.png](screens/case-detail-closed.png) (closed DRLR case; contact details and member names masked before capture)
Sample cases looked at: an Assigned ICR case and a Closed DRLR case (ids not recorded on purpose).

## Layout
Left tabs: **Case Details**, **Attachments**, **Remarks Log**, **Case History**.
Header: Dealer Type (e.g. "Dealer"), Current Status + level badge (L1, clickable → escalation modal), **Case Assigned To `<internal desk name>`** + level, Case ID (`ICR261026106958`), Case Created At (`26 October 2026 14:54`).

## Case Details tab
| Label | Type | Notes |
|---|---|---|
| Sap Dealer Code | text | Rendered **blank** on the ICR sample |
| Dealer Code | text | `<1S code> \| <name> (<code>)` |
| Order Type | text | Raw SAP code (`ZACC`, `ZROP`) |
| SAP table (ICR) | table | SAP Document Number, Billing Date (`22-10-2026`), Plant Address (`1110 / ETB-VEPDC Plant - II - New`), SO, Cancellation Reason (blank), RSM Approval (Yes). **The same row was shown twice** |
| LR table (DRLR) | table | Lr Number (blank), Transporter Name, Dispatch Date (`2026-08-29`, ISO), Part Number, Delivery Date. This is the nearest thing to CONSIGN data |
| Contact Person *, Contact No. *, Email, Problem Statement | editable text | PII: never write to analysis |
| Mode of Query | select (disabled) | |
| Per-SAP-document desk rows | editable table | ICR: Delivery Status, Accepted, VEPDC Approval, Comment, Reason for Rejection, Cancellation Number, Cancellation Date, Attachment. DRLR: Status, Comment, Reason, LR Number, Dispatch Date, Transporter, Mode Of LR, Attachment, Reason for Wrong Supply, CAPA |
| EDA import | file | `POST /{id}/eda-import`, upload format download |
| Final Status * | select | All 9 statuses (masters.md) |
| Remark * | text | Goes to Remarks Log |
| Close By Member * | select | Internal staff names, shown on close |
| Submit | button | `POST /update-technical` (not executed) |

The Submit button and the editable fields are **still shown on a Closed case**. The portal doesn't make closed cases read-only for desk users.

## Attachments tab
"Attachments" list with an **ADD** button (`POST /upload-case-attachment`, `file_name[]`, `case_id`). Delete is `GET /delete-case-attachment/{id}`, behind a `confirm()`. Both samples had no attachments, so the download URL format is **TBD**.

## Remarks Log tab
Columns: Created By, Escalation Level, Date (`16-October-2026`), Time (`06:32 PM`), Remarks. Empty state: `No remarks found!`. This is the only "comments" feature (DETAIL-06 / ATTACH-03), and it is desk-authored.

## Case History tab (timeline, DETAIL-03)
Columns: Activity, Activity Description, Escalation Comment, Created By, Date & Time (`26-10-2026 02:54 PM`).
Event types seen:
| Activity | Description template |
|---|---|
| New | `New case has been created` |
| Assigned | `Case assigned to <internal desk name>` |
| Close | `Case status changed to Close.` (Created By was blank) |
Other statuses probably follow `Case status changed to <Status>.` (inferred).

## Escalation
Clicking the level badge opens a modal (`GET /escalation-details-by-case?case_id&action_type`, which returns HTML or "No record found."). Escalate form: `POST /case-escalate` (`comment, case_current_level, case_type_code, case_id, assigned_to`).

## Data display quirks (feed `src/domain/display.ts`)
- Four date formats on one screen: `26 October 2026 14:54`, `22-10-2026`, `2026-08-29`, `16-October-2026` + `06:32 PM`.
- Blank values are rendered as empty cells (Sap Dealer Code, Cancellation Reason, Lr Number, history "Created By").
- Raw SAP codes: Order Type `ZACC`/`ZROP`, plant `1110`, SAP doc numbers with leading zeros (`0992848885`).
- Duplicate SAP rows.
- Internal desk names appear in: header "Case Assigned To", history descriptions, list Assignee, Close By Member.

## Mobile notes
- Customer view: replace "Case Assigned To", the history text "Case assigned to X" and "Created By" with `customerFacingOwner()` (SRS 4.2).
- Status mapping: masters.md. Hide the level/escalation UI for customers.
- The portal has no feedback (DETAIL-13 / FEEDBACK-*), no "clarification requested" event (DETAIL-07 / FLOW-03), no "Last refreshed" timestamp, and no part-wise ordered/delivered/pending quantities (PART-02). ORDER and PART data exist only as SAP-document rows.
- Closure remarks (DETAIL-12): the portal keeps them only as the last Remarks Log entry made with status Close. There is no dedicated field.
