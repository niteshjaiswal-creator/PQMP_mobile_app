# Create case
URL: `/case/create`   Captured: 2026-10-27   Requirement IDs: CREATE-01…13, ATTACH-01, SCAN-04
Screenshot: [screens/case-create.png](screens/case-create.png)
Raw field dumps (no PII): [raw/create-fields.json](raw/create-fields.json), [raw/create-dynamic-fields.json](raw/create-dynamic-fields.json)

## Purpose and entry points
"Create Case" button on `/case`. A desk user creates the case on behalf of a dealer, picking the dealer from a list. Nothing was submitted.

## Common fields
| Label | Type | Required | Format / options | Depends on | Notes |
|---|---|---|---|---|---|
| Case Type * | select (`.case-type`, no `name`; posts `case_type_id`) | Y | 7 types (masters.md) | — | |
| Case Sub Type * | select (`.sub-case-type`) | Y | loaded by `GET /get-sub-case-type/{caseTypeId}` | Case Type | Sets hidden `sub_case_type_prefix`, `case_type_prefix` |
| Dealer Code * | select2 | Y | ~1,200 dealers | — | Customer/dealer app: from login |
| SAP Document No. | text `sap_document_search[]`, repeatable | Y (when shown) | digits, max 12 | sub-type | Validated by `/check-sap-api`, `/check-sap-api-details`, `/check-sap-details-icrq`, which fill the SAP/billing/plant/SO table |
| SO Number | text `sales_order_number[]` | Y (when shown) | max 14 | sub-type (EDA) | |
| Invoice Number | text `invoice_search` | Y (when shown) | max 14 | sub-type | `/get-invoice-details?invoiceNo=` |
| Contact Person * | text `dealer_contact_person` | Y | max 30 | — | |
| Contact No. * | text `dealer_contact_no` | Y | digits, max 15 | — | |
| Email | text `email` | N | | — | |
| Problem Statement | textarea `problem_statement` | N | max 300 | — | Only free-text "issue description"; there is no separate title (CREATE-05) |
| Mode of Query * | select | Y (except COC) | Mail / Call / Other | Hidden for Customer Order Cancellation | |
| Attachment * | file `file_name[]` | Y | multiple; uploaded first via `POST /upload-attachment?…`, ids kept in `hidden_attachment_array` | — | |

## Dynamic fields by sub-type (CREATE-04)
| Sub-type | Extra visible fields |
|---|---|
| Claim Part not Picked | VEPDC Claim Reference No.*, Claim Date*, Supplying Plant, Delivery date, Delivery contact person, GST OSI Number*, GST OSI Date* |
| In Transit Delay, Logistic Supports Required | Delivery date, Delivery contact person |
| Customer Order Cancellation | Cancellation Reason*, CSM / ASM Approval* (no Mode of Query) |
| Advised part not available, MRP is High, Part Price Not Available, Order Query, Part Supersession Or Exclusion | Part Number + Search (`/get-part-details?partNo=`), Part Description*, add-row button (multi-part) |
| Hand Pick up Required | Pickup Boy*, Pick up Date Time, CSM / ASM Approval* |
| Packaging Deviation / Suggestion | Remark (Improvement* select exists in DOM) |
| Norms Modification | Part description Excel file* (`part_description_file`) |
| Other Support | Issues select |
| Dispatch Required – LR, Execution/EDA Required, Invoice Cancellation Request, Order Block Reason Required, Wrong Part Supply, Perpetual Inventory, Vector Flow Password Change | common fields + SAP document / SO / invoice lookups |
| Other Part Price | no fields rendered when chosen programmatically, needs a manual re-check |

## Actions (observed, not executed)
- `POST /case`: the whole form, about 70 field names, many hidden JSON blobs (`sap_details`, `part_details`, `so_details`, `vehicle_details`, `dealer_details`, `purchase_order_detail`).
- Lookups (GET, JSON): see api-contracts.md.

## Validation messages (verbatim, from JS source)
- `Invalid SAP Number.`: invoice lookup returned empty data; also disables Submit.
- `Invalid Part Number.`
- `No Avg NDP found.`
- `Server is taking too much time to response, please try again.` (title `Failed`)
- Parsley handles required-field checks client-side. I didn't trigger the empty-submit messages, to avoid any chance of a server-side create. **TBD.**

## Mobile notes
- Dealer selection goes away when the user is a dealer, because it comes from the session.
- SAP document / invoice / SO number fields are what SCAN-* should fill (barcode → `sap_document_search[]` / `invoice_search`). Use the same lookup endpoints to validate.
- The multi-part row matches CREATE-10 / SCAN-03.
- The portal has no "issue title" or "preferred contact mode" separate from Mode of Query. Mode of Query (Mail/Call/Other) is the nearest equivalent.
- There's no draft-preservation behaviour to copy. CREATE-13 is mobile-only.
