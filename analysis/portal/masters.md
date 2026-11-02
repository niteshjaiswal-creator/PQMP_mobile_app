# Master data observed in the portal (UAT, 2026-10-27)

## Case statuses

The backend stores the **label string itself** as the status value (`<option value="Close">Close</option>`). There are no numeric codes.

| Backend value | Portal label | Portal group | `CaseStatus` (mobile/src/domain/case-status.ts) |
|---|---|---|---|
| `New` | New | Open | `new` |
| `Assigned` | Assigned | Open | `assigned` |
| `Re-Assigned` | Re-Assigned | Open | `reassigned` (customer label "Assigned") |
| `In Progress` | In Progress | Open | `in-progress` |
| `Hold` | Hold | Open | `hold` |
| `Resume` | Resume | Open | `resume` |
| `Escalated` | Escalated | Open | `escalated` |
| `Re-Open` | Re-Open | Open | `reopened` |
| `Close` | Close | Close | `closed` |

All portal statuses have a mapping. These `CaseStatus` values have **no portal source** (FLOW-02, needs VECV approval): `draft`, `submitted`, `awaiting-assignment`, `under-review`, `clarification-required`, `awaiting-user-response`, `awaiting-backend-update`, `resolved`, `closure-pending`.

## Escalation level / priority

- **Level**: `L1`–`L5` (list filter `case_level[]`; shown as a badge on each row and in the case header). Higher Assembly uses lower-case `l1`–`l5`.
- **Priority**: `P2` was seen as a badge in front of some case numbers. The full priority set is not exposed in any filter (TBD).
- Higher Assembly stage: `S1` Assembly Documents & Details Upload, `S2` Document Verification by CIM, `S3` Document Verification by Part Head.

## Case types → sub-types (from `GET /get-sub-case-type/{caseTypeId}`)

Case number format: `#<sub-type prefix><YYMMDD><case id>`, for example `ICR261026106958` = ICR + 26-10-26 + 106958.

| Case type (id, code) | Sub-type id | Sub-type value | Title | Prefix |
|---|---|---|---|---|
| Logistics Support (49, `logistics_support`) | 56 | claim_part_not_picked | Claim Part not Picked | CPNP |
| | 51 | in_transit_delay | In Transit Delay | ITD |
| | 50 | logistic_supports_required | Logistic Supports Required | LSR |
| Order Cancellation (19, `order_cancellation_main`) | 60 | customer_order_cancellation | Customer Order Cancellation | COC |
| Order Status (3, `order_status`) | 41 | advised_part_not_available_for_partorder | Advised part not available for part ordering | APNAFPO |
| | 4 | dispatch_required_lr | Dispatch Required – LR | DRLR |
| | 6 | execution_update_required | Execution/EDA Required | EUR |
| | 10 | hand_pick_up_required | Hand Pick up Required | HPUR |
| | 12 | invoice_cancellation_request | Invoice Cancellation Request | ICR |
| | 40 | order_block_reason_required | Order Block Reason Required | OBRR |
| | 38 | wrong_part_supply | Wrong Part Supply | WPS |
| Packaging (16, `packaging_main`) | 17 | packaging_deviation | Packaging Deviation | PD |
| | 18 | packaging_suggestion | Packaging Suggestion | PS |
| Part Pricing and Strategy (45, `part_pricing_and_strategy`) | 46 | mrp_is_high | MRP is High | MH |
| | 48 | other_part_price | Other Part Price | OPP |
| | 47 | part_price_not_available | Part Price Not Available | PPA |
| Perpetual Inventory (57, `perpetual_inventory`) | 58 | perpetual_inventory | Perpetual Inventory | PI |
| Project Poorti (25, `project_poorti`) | 27 | norms_modification | Norms Modification | NM |
| | 26 | order_query | Order Query | OQ |
| | 28 | other_support | Other Support | OS |
| | 44 | part_supersession_exclusion | Part Supersession Or Exclusion | PSE |
| | 43 | vector_flow_password_change | Vector Flow Password Change | vfpc (lower-case) |

**Legacy sub-types:** these appear in the list and report filters but **not** in the create form: Approval Matrix - SRN Request (37), Buyback (59), Invoice Soft Copy (2), Non Transit Claims (36), Parts Pickup Not Done (14), Settlement Not Received (15). The mobile list must still be able to display them.

The list row shows the case-type column with display names that differ from the create form: "Order Status", "Packaging".

## Other dropdowns

| Field | Options |
|---|---|
| Mode of Query (`mode_of_query`) | Mail, Call, Other |
| CSM / ASM Approval (`csm_asm_approval`, `csm_approval`) | radio (Yes/No) |
| Cancellation Reason (`cancellation_reason`, COC) | 18 SAP reason codes `(9A)`…`(9P)`, e.g. `(9F) Part is not fitted on mentioned chassis.`, `(9P) Order Closed under Poorti Go Live`. Loaded via `/get-cancellation-reason` |
| Approval Status | RSM Approval, VEPDC Head, Parts Commercial Head |
| Supplying Plant | (1141) C&F East, Guwahati · (1154) RDC Binola · (1153) RDC Bangalore · (1152) RDC Kolkata · (1110) VEPDC, Pithampur |
| Improvement (Packaging) | Inadequate packaging, Non Standard Packaging, Lose Parts Dispatch, Existing Packing Improvement |
| Issues (Other Support) | Login Query, Customer Order Created SO not generated, Excess Billing, Other Cases, Support required |
| Final Remarks | Test 1, Test 2, Test 3 (UAT placeholder data) |
| ICR row: Delivery Status | Invoice Cancelled, Already executed and dispatched, Cancellation approval not received |
| ICR row: Accepted / VEPDC Approval | Yes, No |
| ICR row: Reason for Rejection | Cancellation approval not received, Already executed and dispatched, Delay intimation |
| DRLR row: Status | Dispatched, Not Dispatched, VEPDC having Holiday, There is no SO number exists, EGP Support on personal leave |
| DRLR row: Mode of LR | Road, Sea, Air |
| Reason for Wrong Supply / CAPA | Wrong part received from Supplier, Wrong Part received from Plant, Wrong Part No. sticker pasted, Wrong Shipping Label Pasted on Box, Incomplete Kit Supply, Wrong Higher Assembly Part Advise, Wrong Child Part in Kit, Wrong Supply by Plant, Wrong Part Supplied by Supplier, Wrong Part mention in E Catelog, Wrong Part Suggestion by IMPACT-ICR, Wrong Part availability in plant · CAPA: Product Support Actionable, Customer Order to be punched carefully, System error while punching order, Plant Stock Corrected, Fresh order secured and executed |
| Order Type (SAP) | `ZACC`, `ZROP` seen; shown as raw SAP codes |
| Dealer | ~1,200 entries, format `<SAP 1S code> (<dealer code>, <name>)`. Some have no SAP code: `- (1020, Test)` |
| Report type (`/report`) | Case Type Detailed Reports, Case Order Details Report, All Sub Type Case Status Counts, Case Status Reflection Report, Dealer Category Case Status Report, Case Type Wise Report |
