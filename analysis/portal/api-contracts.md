# Portal backend endpoints (UAT, 2026-10-27)

## Key finding
The portal is a **server-rendered Laravel app**. It has **no REST/JSON API for case data**: list, detail, create and update are all HTML pages and HTML form POSTs. `/api`, `/api/v1` and `/api/user` return Laravel's `{"message":"The route api could not be found."}` (404). Only small lookup endpoints return JSON.

**Consequence for the mobile app:** VECV/backend team needs to provide a mobile API (token-based auth, JSON case list/detail/create/update, order/part/consignment data). Session-cookie scraping of HTML pages is not a viable integration. This is the top open question; the proposed contract is [../api/mobile-api-spec.md](../api/mobile-api-spec.md).

## Auth
- Laravel session cookie (HttpOnly, name not visible to JS) plus the `XSRF-TOKEN` cookie. Every POST carries a hidden `_token` (CSRF), and `<meta name="csrf-token">` is present.
- Login: form on `/login` (username + password). Logout: `GET /get-logout`. Password reset: `/password/reset`.
- No bearer token or refresh-token mechanism exists.

## JSON lookups (GET, called with jQuery `$.ajax`, session cookie)

Common envelope: `{ "status": true|false, "message": "Record found." | <error>, "data": … }`. Failure is usually `status:false` with `message`, or `data == ''`.

### `GET /get-sub-case-type/{caseTypeId}` ✅ verified
Response (column-oriented parallel arrays, not an array of objects):
```json
{"status":true,"message":"Record found.","data":{
  "id":[17,18],
  "value":["packaging_deviation","packaging_suggestion"],
  "title":["Packaging Deviation","Packaging Suggestion"],
  "case_type_prefix":["PD","PS"]}}
```

### Seen in JS source, not called (shape inferred from client code)
| Endpoint | Params | Client use |
|---|---|---|
| `GET /get-invoice-details` | `invoiceNo` | `data.data == ''` → "Invalid SAP Number." |
| `GET /get-part-details` | `partNo` | `data.data.price` (Avg NDP) |
| `GET /get-ticket-details` | `ticket` | returns a JSON *string* that is parsed again; fields `deCode`, `dealerName`, … |
| `GET /get-cancellation-reason`, `/get-invoice-cancellation-reason` | — | reason masters |
| `GET /check-sap-api`, `/check-sap-api-details`, `/check-sap-details-icrq` | SAP doc no. | SAP validation + detail fill (billing date, plant, SO) |
| `GET /get-chassis-details`, `/search-chassis-details`, `/get-chassis-registration-details`, `/get-vehicle-and-items-details` | chassis | vehicle data (legacy service-case flows) |
| `GET /get-campaign-by-chassis-api/{chassisNo}`, `/get-completed-campaign`, `/get-campaign-details` | | campaigns |
| `GET /get-job-details`, `/get-technician-details-by-dealer/{dealerCode}/true`, `/check-de-user`, `/get-failed-aggregate`, `/get-dtc-code`, `/get-dtc-description/{code}`, `/get-replaced-parts` | | legacy service/warranty flows, probably not PQMP |
| `GET /escalation-details-by-case` | `case_id, action_type` | returns HTML or plain text `No record found.` |
| `GET /shiftwise` | — | HTML fragment, desk roster (internal) |

## HTML form endpoints (not executed)
| Method + path | Fields | Purpose |
|---|---|---|
| `GET /case` | `datefrom, dateto, status[], type[], dealer[], case_keyword, so_no_keyword, sap_no_keyword, part_no_keyword, case_level[], assign_to[], page` | list |
| `POST /case-export` | `is_export, datefrom, dateto, status[], type[]` | Excel export |
| `POST /case` | about 70 fields (case-create.md) | create |
| `POST /upload-attachment?…` | multipart | pre-upload attachments during create |
| `POST /update-technical` | desk update incl. `case_status`, `remark`, `close_by_member`, per-row SAP fields | status change / update |
| `POST /upload-case-attachment` | `file_name[], case_id` | add attachment |
| `GET /delete-case-attachment/{id}` | — | **destructive GET** (security note: CSRF-unprotected delete) |
| `GET /delete-part-query-line-item/{id}` | — | destructive GET |
| `POST /case/re-open` | `case_id, case_type_id, case_type_code, protech_chassis_no, reopen_remark` | reopen with mandatory remark |
| `POST /case-escalate` | `comment, case_current_level, case_type_code, case_id, assigned_to` | escalate level |
| `POST /{id}/eda-import` | `import_file, case_id` | EDA Excel import |
| `POST /get-details-type-subtype` | `CaseType, CaseSubtType` | (list page helper) |
| `POST /report` | `datefrom, dateto, report_type, type[], status[], de_user[], select_dealer[], …` | reports |

## Admin DataTables endpoints (GET, admin session, 2026-10-29) <a id="admin-users"></a>
Server-side DataTables: `GET /admin/<page>?draw=1&start=0&length=N&search[value]=…&columns[i][data]=…` sent with `X-Requested-With: XMLHttpRequest`. The response is `{draw, recordsTotal, recordsFiltered, data:[…]}`, with HTML fragments in `action` and `is_active`. `length` accepts large values (30000 worked).

| Path | Rows | `data[]` keys |
|---|---|---|
| `/admin/users` | 2,381 (one per user-role) | id, username, name, email, contact_no, address, role_name, region (always blank), created_at (`YYYY-MM-DD`), is_active (`Active`/`Inactive`), rownum, action |
| `/admin/user-dealer-mapping` | 20,406 | ud_id, rownum, username, name, dealer_code, dealer_name, role_name (UPPER CASE) |
| `/admin/case-assignment-matrix` | 13,689 | id, dealer_name, dealer_code, case_type (sub-type title), model_no, role_l1…role_l5, rownum, action |
| `/admin/case-sla` | 17 | id, case_type, l1…l5 (minutes), total_sla_time, rownum, action |
| `/admin/team-member` | 12 | id, name, email, mobile_number, created_at, updated_at, deleted_at, action |
| `/admin/settings` | 1 | id, scheduler_date, created_at, rownum, action |

Search on `/admin/user-dealer-mapping` didn't match on username. Destructive admin GETs: `/admin/users/{id}/delete`. Status toggle: `POST /admin/users/update-status`. These were not executed. See [roles-and-access.md](roles-and-access.md).

## SAP-sourced raw formats
- Dates: `DD-MM-YYYY` (billing), `YYYY-MM-DD` (dispatch), `D Month YYYY HH:mm`, `DD-Month-YYYY` + `hh:mm A`. `0000-00-00` wasn't seen, but blanks are common.
- Codes: order type `ZACC`/`ZROP`, plant `1110`, SAP doc nos. 10 digits with leading zero, cancellation reasons `(9A)`–`(9P)`.

## Still TBD
Attachment download URL, consignment/tracking source (only an LR table exists), part-level quantities, notification mechanism (none in the portal), dashboard KPI data (`/dashboard` returns 500).
