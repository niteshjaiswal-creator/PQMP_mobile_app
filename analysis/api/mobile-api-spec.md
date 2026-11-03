# PQMP Mobile API specification

| | |
|---|---|
| Version | 0.2 (draft for review) |
| Date | 2026-11-03 |
| Scope | Every SRS role: dealer/customer, EGP support desk, admin, management |
| Design | [PQMP Final Design](https://claude.ai/artifact/1T8x56Zb5WN8ZnnyeRs5bH) |
| Client code | `mobile/src/api/` (typed functions, one per endpoint). Mock backend until this API exists: `mobile/src/mock/` |
| Base URL | `https://<host>/api/mobile/v1` (see `mobile/src/config/env.ts`) |
| Status | **Proposed.** The portal has no JSON API today ([portal/api-contracts.md](../portal/api-contracts.md)), so every endpoint below has to be built by the backend team. |

## Contents
1. [Scope](#1-scope)
2. [Conventions](#2-conventions)
3. [Common objects](#3-common-objects)
4. [Authentication](#4-authentication)
5. [Masters](#5-masters)
6. [Reference lookups](#6-reference-lookups)
7. [Attachments](#7-attachments)
8. [Cases](#8-cases)
9. [Case tracking sections](#9-case-tracking-sections)
10. [Comments, feedback, reopen](#10-comments-feedback-reopen)
11. [Notifications](#11-notifications)
12. [Error codes](#12-error-codes)
13. [Open questions](#13-open-questions)
14. [Endpoint index](#14-endpoint-index)
15. [Support desk](#15-support-desk)
16. [Admin](#16-admin)
17. [Management](#17-management)
18. [Mock backend](#18-mock-backend-until-this-api-exists)

---

## 1. Scope

Covers every SRS user type (4.1, 4.3, 4.4, 4.5). One API serves all roles: the access token decides the role and data scope, and the server enforces it (SRS 5). A dealer only ever receives their own or dealer-mapped cases and the one support identity (SRS 4.2); internal roles receive dealer and desk detail.

**Not in this API (out of SRS scope or awaiting VECV approval):** escalation actions and the escalation portal (SRS 3.5, 20), CSM approval workflow (20), closure review and bulk closure (13.13), SLA and ageing reports (10.4, 14.5), audit trail report (14.6, stays in the web portal), master maintenance (12.1, web portal), email case creation (7.16), Higher Assembly, BuyBack, Norms bulk close, Excel export.

Screens are named as in the [PQMP Final Design](https://claude.ai/artifact/1T8x56Zb5WN8ZnnyeRs5bH) canvas.

| Screen | Roles | Endpoints |
|---|---|---|
| Sign in | all | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| Home (role dashboard) | dealer, support, admin | `GET /dashboard/summary`, `GET /cases?pageSize=3` |
| My Cases + filters | all | `GET /cases`, `GET /masters/case-types?includeLegacy=true`, `GET /masters/options/priority` |
| New case 1/3 Category | dealer | `GET /masters/case-types` |
| New case 2/3 Reference + scan review | dealer | `GET /masters/sub-types/{id}/form`, `GET /lookups/sales-orders/{no}`, `/lookups/invoices/{no}`, `/lookups/sap-documents/{no}` |
| New case 3/3 Details | dealer | `GET /masters/options/{list}`, `GET /lookups/parts/{no}`, `POST /attachments` |
| Case registered | dealer | `POST /cases` |
| Case detail: overview | all | `GET /cases/{id}`, `GET /cases/{id}/timeline` |
| Case detail: order, parts, tracking | all | `GET /cases/{id}/order`, `/parts`, `/consignments` |
| Case detail: messages and files | all (read-only for management) | `GET/POST /cases/{id}/comments`, `GET/POST /cases/{id}/attachments`, `GET /attachments/{id}/download` |
| Closed case: feedback, reopen | dealer | `POST /cases/{id}/feedback`, `POST /cases/{id}/reopen` |
| Updates | all | `GET /notifications`, `POST /notifications/read`, `POST /devices` |
| Account | all | `GET /me` |
| Support desk: update case | support | `POST /cases/{id}/updates` (§15) |
| Admin: assignment workbench | admin | `GET /cases?assignment=…`, `GET /desks`, `POST /cases/{id}/assignment` (§16) |
| Management: reports | management, admin | `GET /reports/summary` (§17) |

---

## 2. Conventions

### 2.1 Transport and headers
- HTTPS only, JSON (`application/json; charset=utf-8`). File uploads use `multipart/form-data`.
- Every request after login carries these headers:

| Header | Required | Example | Notes |
|---|---|---|---|
| `Authorization` | Y | `Bearer eyJ…` | Access token from `/auth/login` |
| `Accept` | Y | `application/json` | |
| `X-App-Version` | Y | `1.0.0 (42)` | Lets the server force an upgrade |
| `X-Platform` | Y | `android` \| `ios` | |
| `X-Device-Id` | Y | `b1f3…` | Stable per install, no hardware IDs |
| `X-Request-Id` | N | UUID | Echoed back. Used to trace integration errors (SRS 17.2.8) |
| `Idempotency-Key` | Y on `POST /cases`, `/comments`, `/feedback`, `/reopen` | UUID | The same key within 24 h returns the first result instead of creating a duplicate |

### 2.2 Success envelope
```json
{
  "data": { },
  "meta": { "requestId": "7c1e…", "serverTime": "2026-10-28T10:15:00+05:30" }
}
```
List endpoints add pagination to `meta`:
```json
"meta": { "page": 1, "pageSize": 20, "totalItems": 134, "totalPages": 7 }
```

### 2.3 Error envelope
HTTP status set correctly (§12). The body:
```json
{
  "code": "VALIDATION_FAILED",
  "message": "Some details need attention before continuing.",
  "fieldErrors": {
    "contact.phone": "Enter a valid 10-digit mobile number.",
    "parts[1].partNumber": "This part number was not found."
  },
  "requestId": "7c1e…"
}
```
- `message` and `fieldErrors` must be **business-readable** and safe to show. Never return SAP messages, SQL, stack traces or internal codes (SRS 17.2.2–3, 11.9). Log those server-side against `requestId`.
- `fieldErrors` keys use the dotted path of the request field.

### 2.4 Data rules
| Rule | Detail |
|---|---|
| Dates | ISO 8601 with offset: `2026-10-24T14:54:00+05:30`. Date-only values: `2026-10-24`. **One format for everything.** The portal uses four today. |
| Empty values | Send `null`. Never `""`, `"-"`, `"0000-00-00"`, `0` for an unknown quantity, or `"NA"`. |
| Codes | Send the code **and** a label for SAP values: `{ "code": "ZACC", "label": "Accessory order" }`. The app shows the label. |
| IDs | `id` fields are opaque strings, even if numeric in the database. |
| Case number | `<SUBTYPE_PREFIX><YYMMDD><id>`, e.g. `EUR26102410582`. Always generated by the server. |
| Data scope | Every endpoint returns only data for the logged-in user's dealer codes. A case outside scope returns `404`, not `403`, so case numbers can't be probed. |
| Support identity | The dealer API never returns internal desk/member names (SRS 4.2). See `Actor` in §3. |
| External data | Anything from ECC/SAP or logistics carries `lastRefreshedAt` and a `source` section status (§3.6). |
| Text limits | Enforced server-side as well as in the app. Limits below are the portal's current ones. |

### 2.5 Pagination, sorting
- `page` (1-based, default 1), `pageSize` (default 20, max 50).
- `sort` = `field` or `-field` (descending). Default `-updatedAt`.

### 2.6 Caching
Master endpoints return `ETag` and honour `If-None-Match` (→ `304`). The app caches masters for up to 24 h.

---

## 3. Common objects

### 3.1 `CaseStatus` (string enum)
The portal's stored values, unchanged. The app maps them to labels in `mobile/src/domain/case-status.ts`.

`New` · `Assigned` · `Re-Assigned` · `In Progress` · `Hold` · `Resume` · `Escalated` · `Re-Open` · `Close`

`statusGroup`: `open` (everything except `Close`) or `closed`.

New statuses in SRS 10.2 (e.g. `Clarification Required`) aren't approved yet. If VECV adds them, they're appended to this enum (§13 Q3).

### 3.2 `Actor`
| Field | Type | Notes |
|---|---|---|
| `type` | `dealer` \| `support` \| `system` | |
| `name` | string \| null | Dealer user's own name for `dealer`. **Always `"PQMP Support"`** for `support`. `null` for `system`. |

### 3.3 `CaseSummary`
| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | string | Y | Internal case id |
| `caseNumber` | string | Y | `EUR26102410582` |
| `caseType` | `{ id, code, label }` | Y | e.g. `{ "id": "3", "code": "order_status", "label": "Order Status" }` |
| `subType` | `{ id, code, label, prefix }` | Y | e.g. `{ "id": "6", "code": "execution_update_required", "label": "Execution/EDA Required", "prefix": "EUR" }` |
| `status` | `CaseStatus` | Y | |
| `statusGroup` | `open` \| `closed` | Y | |
| `createdAt` | datetime | Y | |
| `updatedAt` | datetime | Y | Last activity of any kind |
| `primaryReference` | `{ type, value }` \| null | N | Main reference shown on the card. `type` = `sap_document` \| `sales_order` \| `invoice` \| `part` |
| `summary` | string | Y | First 120 characters of the problem statement, or the sub-type label if it's empty |
| `latestUpdate` | `{ at, text }` \| null | N | Last dealer-visible event, written for the dealer (LIST-06) |
| `unreadCount` | integer | Y | Unread support comments |
| `needsAction` | `null` \| `reply` \| `feedback` | Y | Drives the "Needs you" strip on Home |
| `hasOrderData` | boolean | Y | Show the Parts tab |
| `hasConsignment` | boolean | Y | LIST-08 |

### 3.4 `Attachment`
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `fileName` | string | Original name, sanitised |
| `mimeType` | string | |
| `sizeBytes` | integer | |
| `uploadedAt` | datetime | |
| `uploadedBy` | `Actor` | |
| `thumbnailUrl` | string \| null | Short-lived signed URL, images only |

### 3.5 `Option`
`{ "value": "Mail", "label": "Mail" }`. Used for every dropdown.

### 3.6 `SectionStatus`
Every SAP- or logistics-backed response carries this, so one failing section never blocks the rest of the case (SRS 11.9.1, 17.2.4).

| Field | Type | Notes |
|---|---|---|
| `state` | `available` \| `pending` \| `unavailable` \| `not_applicable` | `pending` = upstream hasn't generated it yet (e.g. no invoice). `unavailable` = upstream failed or timed out. |
| `message` | string \| null | Dealer-safe text, e.g. `"The latest order information is being updated."` (SRS 18.6.5) |
| `lastRefreshedAt` | datetime \| null | When the server last got fresh data from SAP/logistics |

---

## 4. Authentication

Token-based. The portal's cookie session isn't usable from the app (§13 Q1). Requirement IDs: AUTH-01…04.

### 4.1 `POST /auth/login`
Signs the user in.

**Request body**
| Field | Type | Req | Rules |
|---|---|---|---|
| `username` | string | Y | Portal user ID |
| `password` | string | Y | Never logged |
| `device.id` | string | Y | Same as `X-Device-Id` |
| `device.platform` | `android` \| `ios` | Y | |
| `device.appVersion` | string | Y | |

```json
{ "username": "dealer.user", "password": "••••••", "device": { "id": "b1f3…", "platform": "android", "appVersion": "1.0.0" } }
```

**Response `200`**
```json
{
  "data": {
    "accessToken": "eyJ…",
    "accessTokenExpiresIn": 900,
    "refreshToken": "rt_…",
    "refreshTokenExpiresIn": 2592000,
    "user": { "…": "same as GET /me" }
  }
}
```

| Error | HTTP | `code` |
|---|---|---|
| Wrong username or password | 401 | `INVALID_CREDENTIALS` |
| User inactive / blocked | 403 | `USER_INACTIVE` |
| Role not allowed on mobile (e.g. desk user in Phase 1) | 403 | `ROLE_NOT_ALLOWED` |
| Too many attempts | 429 | `TOO_MANY_ATTEMPTS` (with `Retry-After`) |
| App too old | 426 | `UPGRADE_REQUIRED` |

### 4.2 `POST /auth/refresh`
Gets a new access token. Refresh tokens rotate: each one works once.

**Request:** `{ "refreshToken": "rt_…" }`
**Response `200`:** same shape as login, without `user`.
**Errors:** `401 SESSION_EXPIRED` → the app clears tokens and shows Login.

### 4.3 `POST /auth/logout`
Revokes the refresh token and unregisters the device's push token.

**Request:** `{ "refreshToken": "rt_…" }`
**Response:** `204`

### 4.4 `GET /me`
The signed-in user and their data scope (SRS 8.1.2, 11.4).

**Response `200`**
```json
{
  "data": {
    "id": "u_1042",
    "name": "Ravi Sharma",
    "role": { "code": "dealer", "label": "Dealer" },
    "email": "r…@example.com",
    "mobile": "98xxxxxx21",
    "dealers": [
      { "dealerCode": "1S0000", "sapDealerCode": "0000100000", "name": "Shree Motors", "city": "Indore", "isDefault": true }
    ],
    "activeDealerCode": "1S0000",
    "permissions": ["case.create", "case.view", "case.comment", "case.feedback", "case.reopen"],
    "supportContact": { "label": "PQMP Support", "phone": null, "email": null }
  }
}
```
| Field | Notes |
|---|---|
| `dealers` | All dealer codes the user may act for. Phase 1 uses `activeDealerCode`; switching comes later. |
| `permissions` | The app hides actions the user lacks. The server still enforces them. |
| `mobile`, `email` | Masked as the portal does |

**Forgot password:** no API in Phase 1. The app opens the portal's `/password/reset` page in the browser.

---

## 5. Masters

### 5.1 `GET /masters/case-types`
Case types with their creatable sub-types (CREATE-01/02). Replaces the portal's parallel-array `/get-sub-case-type/{id}`.

**Query**
| Param | Type | Default | Notes |
|---|---|---|---|
| `includeLegacy` | boolean | `false` | `true` adds legacy sub-types (Buyback, Invoice Soft Copy, …) for list filters. They have `creatable: false`. |

**Response `200`**
```json
{
  "data": [
    {
      "id": "3", "code": "order_status", "label": "Order Status", "description": "Dispatch, EDA, invoices",
      "subTypes": [
        { "id": "6",  "code": "execution_update_required", "label": "Execution/EDA Required", "prefix": "EUR", "creatable": true },
        { "id": "4",  "code": "dispatch_required_lr",      "label": "Dispatch Required – LR", "prefix": "DRLR", "creatable": true }
      ]
    }
  ]
}
```
Values today: 7 types, 22 creatable sub-types ([portal/masters.md](../portal/masters.md)).

### 5.2 `GET /masters/sub-types/{subTypeId}/form`
The field configuration for one sub-type (CREATE-03/04, SRS 12.2.6). The app builds steps 2 and 3 from this, so a new sub-type or field doesn't need an app release.

**Path:** `subTypeId` (string)

**Response `200`**
```json
{
  "data": {
    "subTypeId": "6",
    "referenceStep": {
      "kinds": ["sales_order"],
      "multiple": true,
      "required": true,
      "scanAllowed": true
    },
    "fields": [
      { "key": "contact.person",   "label": "Contact person", "type": "text",     "required": true,  "maxLength": 30, "prefillFrom": "user" },
      { "key": "contact.phone",    "label": "Contact number", "type": "phone",    "required": true,  "maxLength": 15, "prefillFrom": "user" },
      { "key": "contact.email",    "label": "Email",          "type": "email",    "required": false },
      { "key": "modeOfQuery",      "label": "Mode of query",  "type": "select",   "required": true,  "optionsList": "mode_of_query" },
      { "key": "problemStatement", "label": "What's the issue?", "type": "textarea", "required": false, "maxLength": 300 },
      { "key": "fields.csmAsmApproval", "label": "CSM / ASM approval", "type": "boolean", "required": true }
    ],
    "parts": { "enabled": false, "min": 0, "max": 0 },
    "attachments": { "required": true, "min": 1, "max": 5, "maxSizeMb": 10, "mimeTypes": ["image/jpeg", "image/png", "application/pdf"] }
  }
}
```

**`fields[]` item**
| Field | Type | Notes |
|---|---|---|
| `key` | string | Path to use in the `POST /cases` body. Sub-type specific fields sit under `fields.` |
| `label` | string | |
| `type` | `text` \| `textarea` \| `phone` \| `email` \| `number` \| `date` \| `datetime` \| `select` \| `boolean` \| `file` | |
| `required` | boolean | |
| `maxLength`, `min`, `max`, `pattern` | optional | Validation |
| `optionsList` | string \| null | Code for `GET /masters/options/{list}` |
| `prefillFrom` | `user` \| `reference` \| null | Where the app may pre-fill from |
| `visibleWhen` | `{ key, equals }` \| null | Simple conditional, e.g. "Reason" only when approval is `false` |

`referenceStep.kinds`: any of `sap_document`, `sales_order`, `invoice`. Empty means the sub-type has no reference step.

Sub-type-specific fields from the portal include: VEPDC claim ref. no./date, GST OSI no./date, supplying plant, delivery date, delivery contact, cancellation reason, CSM/ASM approval, pickup person and date-time, improvement, issues, and the Norms part-description Excel ([portal/case-create.md](../portal/case-create.md)).

### 5.3 `GET /masters/options/{list}`
One dropdown list.

**Path:** `list` = `mode_of_query` \| `cancellation_reason` \| `supplying_plant` \| `improvement` \| `support_issue` \| …

**Response `200`**
```json
{ "data": [ { "value": "1110", "label": "VEPDC, Pithampur" }, { "value": "1154", "label": "RDC Binola" } ] }
```

---

## 6. Reference lookups

Used on step 2 to validate what the dealer typed or scanned, and to pre-fill step 3 (CREATE-06, SCAN-01…04). Scanning happens on the device; the decoded value goes to these endpoints like typed input.

All lookups are scoped to the active dealer. A document belonging to another dealer returns `404 REFERENCE_NOT_FOUND`.

### 6.1 `GET /lookups/sap-documents/{sapDocumentNo}`
**Path:** `sapDocumentNo`: digits, up to 12. Leading zeros allowed.

**Response `200`**
```json
{
  "data": {
    "sapDocumentNo": "0992848885",
    "documentType": { "code": "invoice", "label": "Invoice" },
    "billingDate": "2026-10-22",
    "plant": { "code": "1110", "label": "VEPDC, Pithampur" },
    "salesOrderNo": "1200456789",
    "orderType": { "code": "ZROP", "label": "Regular order" },
    "parts": [
      { "partNumber": "F8100100", "description": "Brake lining kit", "quantity": 4 }
    ],
    "openCase": null
  },
  "meta": { "lastRefreshedAt": "2026-10-28T10:14:55+05:30" }
}
```
| Field | Notes |
|---|---|
| `parts` | Lets the dealer pick parts (SCAN-03). Empty array if SAP gives none. |
| `openCase` | `{ "caseNumber": "EUR26102410582", "subTypeLabel": "…" }` if an open case already exists for this document, so the app can warn before a duplicate. |

| Error | HTTP | `code` | App message |
|---|---|---|---|
| Not found / not this dealer's | 404 | `REFERENCE_NOT_FOUND` | "We couldn't find this document. Check the number and try again." |
| SAP down / slow | 503 | `UPSTREAM_UNAVAILABLE` | "We can't check this right now. You can continue and we'll verify it later." |

### 6.2 `GET /lookups/invoices/{invoiceNo}`
Same response shape as 6.1, with `documentType.code = "invoice"`. Invoice number up to 14 characters.

### 6.3 `GET /lookups/sales-orders/{salesOrderNo}`
**Response `200`**
```json
{
  "data": {
    "salesOrderNo": "1200456789",
    "orderDate": "2026-10-10",
    "orderType": { "code": "ZROP", "label": "Regular order" },
    "plant": { "code": "1110", "label": "VEPDC, Pithampur" },
    "lineCount": 12,
    "openCase": null
  }
}
```

### 6.4 `GET /lookups/parts/{partNumber}`
For sub-types with part rows (MRP is High, Part Price Not Available, Order Query, …).

**Response `200`**
```json
{ "data": { "partNumber": "F8100100", "description": "Brake lining kit", "avgNdp": 1840.00, "currency": "INR" } }
```
`avgNdp` is `null` when there's no price. The portal shows "No Avg NDP found." in that case.

**Errors:** `404 PART_NOT_FOUND`.

---

## 7. Attachments

### 7.1 `POST /attachments`
Uploads one file before it's linked to a case (create flow, chat). Same pattern as the portal's `/upload-attachment`. Unlinked uploads are deleted after 24 h.

**Request:** `multipart/form-data`
| Part | Type | Req | Notes |
|---|---|---|---|
| `file` | binary | Y | |
| `purpose` | `case_create` \| `comment` \| `case_file` | Y | |
| `source` | `camera` \| `gallery` \| `document` \| `scan` | N | Audit (SRS 18.4.9) |

**Response `201`**
```json
{ "data": { "id": "att_9f2c", "fileName": "invoice.jpg", "mimeType": "image/jpeg", "sizeBytes": 812345, "uploadedAt": "2026-10-28T10:20:00+05:30" } }
```

| Error | HTTP | `code` |
|---|---|---|
| Type not allowed | 415 | `FILE_TYPE_NOT_ALLOWED` |
| Too big | 413 | `FILE_TOO_LARGE` |
| Virus scan failed | 422 | `FILE_REJECTED` |

Proposed limits: JPG, PNG, PDF, XLSX; 10 MB per file; 5 files per case on create. VECV to confirm (§13 Q6).

### 7.2 `GET /cases/{caseId}/attachments`
All files on the case (DETAIL-08, ATTACH-02).

**Response `200`:** `{ "data": [ Attachment, … ] }`

### 7.3 `POST /cases/{caseId}/attachments`
Links files uploaded with 7.1 to an existing case (ATTACH-01).

**Request:** `{ "attachmentIds": ["att_9f2c", "att_a01d"] }`
**Response `201`:** `{ "data": [ Attachment, … ] }`
**Errors:** `409 CASE_CLOSED` if the case is closed.

### 7.4 `GET /attachments/{attachmentId}/download`
Returns a short-lived signed URL (SRS 11.6.6). Download is audited.

**Response `200`**
```json
{ "data": { "url": "https://files…/att_9f2c?sig=…", "expiresAt": "2026-10-28T10:25:00+05:30", "fileName": "invoice.jpg", "mimeType": "image/jpeg" } }
```

---

## 8. Cases

### 8.1 `POST /cases`
Creates a case (CREATE-01…13). Requires `Idempotency-Key`, so retrying after a timeout never creates two cases.

**Request body**
| Field | Type | Req | Rules |
|---|---|---|---|
| `subTypeId` | string | Y | Must be `creatable` |
| `dealerCode` | string | Y | One of the user's `dealers` |
| `references` | array | Per form config | `[{ "type": "sap_document" \| "sales_order" \| "invoice", "value": "0992848885", "captureMethod": "manual" \| "scan" }]` |
| `contact.person` | string | Y | max 30 |
| `contact.phone` | string | Y | digits, max 15 |
| `contact.email` | string \| null | N | valid email |
| `modeOfQuery` | string | Per form config | `mode_of_query` value. Not used for Customer Order Cancellation. |
| `issueTitle` | string | Y | max 100. SRS 8.4.4; the portal has no title field, so the backend stores it with the case or prefixes the problem statement. |
| `problemStatement` | string | Y | Issue description, max 300 (SRS 9.1.3) |
| `remarks` | string \| null | N | max 300 (SRS 8.4.4) |
| `parts` | array | Per form config | `[{ "partNumber": "F8100100", "description": "Brake lining kit", "quantity": 4 }]` |
| `fields` | object | Per form config | Sub-type-specific values by key, e.g. `{ "csmAsmApproval": true, "supplyingPlant": "1110" }` |
| `attachmentIds` | string[] | Per form config | From `POST /attachments` |
| `clientDraftId` | string | N | The app's local draft id, echoed back |

```json
{
  "subTypeId": "6",
  "dealerCode": "1S0000",
  "references": [ { "type": "sales_order", "value": "1200456789", "captureMethod": "scan" } ],
  "contact": { "person": "Ravi Sharma", "phone": "9800000021", "email": null },
  "modeOfQuery": "Call",
  "problemStatement": "EDA date not updated for 9 of 12 parts.",
  "parts": [],
  "fields": { "csmAsmApproval": true },
  "attachmentIds": ["att_9f2c"]
}
```

**Response `201`**
```json
{
  "data": {
    "id": "10582",
    "caseNumber": "EUR26102410582",
    "status": "New",
    "createdAt": "2026-10-24T14:54:00+05:30",
    "clientDraftId": "d_77a1"
  }
}
```
The app shows only this server-returned `caseNumber` (SRS 9.1.7).

| Error | HTTP | `code` | App behaviour |
|---|---|---|---|
| Field rules broken | 422 | `VALIDATION_FAILED` + `fieldErrors` | Marks the fields, keeps all input |
| Duplicate open case for the same reference | 409 | `DUPLICATE_CASE` + `data.caseNumber` | Offers to open the existing case |
| Attachment id unknown or expired | 422 | `ATTACHMENT_INVALID` | Asks for re-upload |
| PQMP/EGP down | 503 | `CASE_CREATE_FAILED` | Keeps input, offers retry (CREATE-13) |

### 8.2 `GET /cases`
My Cases list and search (LIST-01…09).

**Query**
| Param | Type | Default | Notes |
|---|---|---|---|
| `statusGroup` | `open` \| `closed` \| `all` | `open` | Matches the portal's default |
| `status` | `CaseStatus[]` (comma-separated) | — | Narrows within the group |
| `caseTypeId` | string[] | — | |
| `subTypeId` | string[] | — | |
| `q` | string | — | Searches case no., SO no., SAP doc / invoice no., part no. (min 3 characters) |
| `needsAction` | boolean | — | Home "Needs you" strip |
| `orderUpdated` | boolean | — | Open cases with an order, part or EDA update in the last 7 days. Same rule as dashboard `orderUpdates`, so the home tile and its list match (DASH-02/04, SRS 8.2.4) |
| `pendingOrder` | boolean | — | Open cases whose order or part quantities are still pending. Management "Pending order cases" drill-down (SRS 14.4) |
| `updatedFrom` | date | — | Cases updated on or after this date. Management "Updated today" drill-down (SRS 14.1) |
| `maxRating` | integer 1–5 | — | Closed cases rated at or below this value. Management "low ratings" drill-down (SRS 14.7; app sends `2`, threshold to confirm) |
| `createdFrom`, `createdTo` | date | — | |
| `page`, `pageSize`, `sort` | | `1`, `20`, `-updatedAt` | `sort`: `updatedAt`, `createdAt` |

**Response `200`**
```json
{
  "data": [
    {
      "id": "10582",
      "caseNumber": "EUR26102410582",
      "caseType": { "id": "3", "code": "order_status", "label": "Order Status" },
      "subType": { "id": "6", "code": "execution_update_required", "label": "Execution/EDA Required", "prefix": "EUR" },
      "status": "In Progress",
      "statusGroup": "open",
      "createdAt": "2026-10-24T14:54:00+05:30",
      "updatedAt": "2026-10-27T11:02:00+05:30",
      "primaryReference": { "type": "sales_order", "value": "1200456789" },
      "summary": "EDA date not updated for 9 of 12 parts.",
      "latestUpdate": { "at": "2026-10-27T11:02:00+05:30", "text": "3 of 12 parts delivered." },
      "unreadCount": 1,
      "needsAction": null,
      "hasOrderData": true,
      "hasConsignment": true
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 34, "totalPages": 2 }
}
```

### 8.3 `GET /dashboard/summary`
Home counts for the signed-in role (DASH-01…04, SRS 8.2, 13.2). Counts are over the user's data scope and must match `GET /cases` for the same filter (SRS 8.2.4), so each tile can open the filtered list.

**Response `200`**
```json
{
  "data": {
    "total": 62,
    "open": 12,
    "inProgress": 7,
    "closed": 50,
    "recentlyUpdated": 5,
    "awaitingUserResponse": 1,
    "feedbackPending": 2,
    "orderUpdates": 3,
    "byCategory": [ { "caseTypeId": "3", "label": "Order Status", "count": 31 } ],
    "unreadNotifications": 2,
    "asOf": "2026-11-03T10:45:00+05:30",
    "internal": null
  }
}
```
| Field | Notes |
|---|---|
| `awaitingUserResponse` | Open cases whose last user-facing comment is a clarification request (§10.1). Drives "Awaiting your response". |
| `orderUpdates` | Open cases with an order, part or EDA update in the last 7 days (SRS 13.2.10) |
| `byCategory` | Customer analytics (SRS 8.2.8, 14.2) |
| `internal` | `null` for dealers and management. For support desk and admin (SRS 13.2 internal items): `{ "unassigned": 14, "byDesk": [ { "deskId": "d1", "name": "Support Desk 1", "open": 42 } ], "oldPending": 9, "integrationFailures": { "sap": 3, "logistics": 2 }, "dealerReplied": 5 }` |

`oldPending` uses a day threshold VECV must confirm (SRS 10.4). Closure-review counts are left out until closure review is approved (SRS 8.2.10, 13.13).

### 8.4 `GET /cases/{caseId}`
Case header and overview (DETAIL-01…05, DETAIL-12…14). Order, parts and consignment come from separate calls (§9), so they can fail on their own.

**Response `200`**
```json
{
  "data": {
    "id": "10582",
    "caseNumber": "EUR26102410582",
    "caseType": { "id": "3", "code": "order_status", "label": "Order Status" },
    "subType": { "id": "6", "code": "execution_update_required", "label": "Execution/EDA Required", "prefix": "EUR" },
    "status": "In Progress",
    "statusGroup": "open",
    "progress": { "steps": ["Raised", "Assigned", "In progress", "Closed"], "current": 2 },
    "createdAt": "2026-10-24T14:54:00+05:30",
    "updatedAt": "2026-10-27T11:02:00+05:30",
    "createdBy": { "type": "dealer", "name": "Ravi Sharma" },
    "handledBy": { "type": "support", "name": "PQMP Support" },
    "dealer": { "dealerCode": "1S0000", "name": "Shree Motors" },
    "references": [ { "type": "sales_order", "value": "1200456789" } ],
    "contact": { "person": "Ravi Sharma", "phone": "9800000021", "email": null },
    "modeOfQuery": "Call",
    "problemStatement": "EDA date not updated for 9 of 12 parts.",
    "fields": [ { "key": "csmAsmApproval", "label": "CSM / ASM approval", "value": "Yes" } ],
    "parts": [],
    "latestUpdate": { "at": "2026-10-27T11:02:00+05:30", "text": "3 of 12 parts delivered." },
    "closure": null,
    "feedback": null,
    "actions": { "canComment": true, "canAddFiles": true, "canGiveFeedback": false, "canReopen": false, "reopenUntil": null },
    "sections": { "order": true, "parts": true, "consignment": true },
    "counts": { "comments": 4, "unreadComments": 1, "attachments": 2 }
  }
}
```

| Field | Notes |
|---|---|
| `progress` | Simplified dealer tracker. `Hold`, `Escalated`, `Re-Assigned` don't move it. |
| `handledBy` | Always the support identity, never a desk name (DETAIL-04, SRS 4.2) |
| `fields` | Sub-type-specific values, already labelled for display |
| `closure` | When closed: `{ "closedAt": "…", "remarks": "Parts dispatched on LR 4471.", "closedBy": Actor }`. Taken from the last Close remark (DETAIL-12). |
| `feedback` | When given: `{ "rating": 4, "remarks": "…", "submittedAt": "…" }` |
| `actions` | The server decides. `canReopen` follows VECV's reopen rules (SRS 9.4.4). |
| `sections` | Which tracking sections apply to this sub-type, so the app knows which calls to make |

**Errors:** `404 CASE_NOT_FOUND`.

### 8.5 `GET /cases/{caseId}/timeline`
Dealer-visible history (DETAIL-03, FLOW-01).

**Response `200`**
```json
{
  "data": [
    { "id": "ev_1", "type": "created",       "at": "2026-10-24T14:54:00+05:30", "actor": { "type": "dealer",  "name": "Ravi Sharma" },        "status": "New",         "text": "Case raised" },
    { "id": "ev_2", "type": "status_change", "at": "2026-10-24T15:10:00+05:30", "actor": { "type": "support", "name": "PQMP Support" }, "status": "Assigned",    "text": "Our team is looking into it" },
    { "id": "ev_3", "type": "status_change", "at": "2026-10-25T09:30:00+05:30", "actor": { "type": "support", "name": "PQMP Support" }, "status": "In Progress", "text": "Work started" }
  ]
}
```

| Field | Notes |
|---|---|
| `type` | `created` \| `status_change` \| `comment` \| `attachment` \| `order_update` \| `closure` \| `reopen` \| `feedback` |
| `text` | Dealer-safe. The server must not pass through portal text like "Case assigned to EGP Support-3" (§13 Q4). |

Escalation-level changes (L1–L5) and reassignment are internal and not returned to dealers.

---

## 9. Case tracking sections

All three return `SectionStatus` and are independent. Each accepts `?refresh=true` to pull from SAP/logistics now instead of the server cache (rate-limited to once per minute per case). Requirement IDs: ORDER-*, PART-*, CONSIGN-*, DATA-01/02.

### 9.1 `GET /cases/{caseId}/order`
Order summary (SRS 18.2).

**Response `200`**
```json
{
  "data": {
    "section": { "state": "available", "message": null, "lastRefreshedAt": "2026-10-28T09:42:00+05:30" },
    "order": {
      "salesOrderNo": "1200456789",
      "orderType": { "code": "ZROP", "label": "Regular order" },
      "poNumber": "PO/SM/2026/118",
      "poDate": "2026-10-09",
      "soldToParty": "Shree Motors",
      "plant": { "code": "1110", "label": "VEPDC, Pithampur" },
      "chassisNumber": null,
      "overallStatus": { "code": "partially_delivered", "label": "Partially delivered" },
      "totalParts": 12,
      "deliveredParts": 3,
      "pendingParts": 9,
      "fullyDelivered": false,
      "consignmentReference": "LR4471"
    }
  }
}
```
When SAP fails: `section.state = "unavailable"`, `order = null` or the last cached copy with its older `lastRefreshedAt`.

### 9.2 `GET /cases/{caseId}/parts`
Part-wise status (SRS 18.3). The app derives each part's status from quantities with `derivePartStatus()`, so quantities must be real numbers or `null`.

**Query:** `status` = `all` (default) \| `pending` \| `delivered`

**Response `200`**
```json
{
  "data": {
    "section": { "state": "available", "message": null, "lastRefreshedAt": "2026-10-28T09:42:00+05:30" },
    "parts": [
      {
        "lineId": "10",
        "partNumber": "F8100100",
        "description": "Brake lining kit",
        "hsnCode": null,
        "orderedQty": 4,
        "deliveredQty": 4,
        "deliveryNumber": "8001234567",
        "deliveryDate": "2026-10-26",
        "invoiceNumber": "0992848885",
        "invoiceDate": "2026-10-26",
        "expectedDeliveryDate": null,
        "sapProgress": { "code": "invoiced", "label": "Invoiced" },
        "remarks": null,
        "consignmentReference": "LR4471"
      },
      {
        "lineId": "20",
        "partNumber": "K1234500",
        "description": "Clutch plate",
        "hsnCode": null,
        "orderedQty": 2,
        "deliveredQty": 0,
        "deliveryNumber": null,
        "deliveryDate": null,
        "invoiceNumber": null,
        "invoiceDate": null,
        "expectedDeliveryDate": null,
        "sapProgress": { "code": "awaiting_date", "label": "Awaiting date from plant" },
        "remarks": null,
        "consignmentReference": null
      }
    ],
    "totals": { "orderedQty": 24, "deliveredQty": 8, "lines": 12, "deliveredLines": 3 }
  }
}
```

| Field | Notes |
|---|---|
| `pendingQty` | Not sent. The app computes ordered − delivered. |
| `sapProgress` | SAP stage: `delivery_created` \| `invoiced` \| `expected_by_date` \| `awaiting_date` \| `under_review` |
| `expectedDeliveryDate` | EDA. `null` → app shows "Awaiting date from plant" |

Data source for line quantities is still open: the portal only has per-SAP-document rows (§13 Q5).

### 9.3 `GET /cases/{caseId}/consignments`
Shipments for the case (CONSIGN-*). Today the portal only holds the LR table; live tracking needs a logistics API (SRS 17.2.9).

**Response `200`**
```json
{
  "data": {
    "section": { "state": "available", "message": null, "lastRefreshedAt": "2026-10-28T08:00:00+05:30" },
    "consignments": [
      {
        "reference": "LR4471",
        "transporter": "Safe Express",
        "mode": { "code": "road", "label": "Road" },
        "dispatchDate": "2026-10-26",
        "expectedDeliveryDate": "2026-10-30",
        "status": { "code": "in_transit", "label": "In transit" },
        "partNumbers": ["F8100100", "F8100200", "F8100300"],
        "events": [
          { "at": "2026-10-26T18:20:00+05:30", "location": "Pithampur", "description": "Picked up" }
        ],
        "trackingUrl": null
      }
    ]
  }
}
```
Without a logistics feed: `status = null`, `events = []`, and only the LR fields are filled.

---

## 10. Comments, feedback, reopen

### 10.1 `GET /cases/{caseId}/comments`
The case chat (DETAIL-06, ATTACH-03). The portal has only a desk-authored Remarks Log, so dealer comments are new.

**Query:** `before` (comment id, for older pages), `pageSize` (default 30)

**Response `200`**
```json
{
  "data": [
    {
      "id": "cm_31",
      "at": "2026-10-27T11:02:00+05:30",
      "author": { "type": "support", "name": "PQMP Support" },
      "text": "3 parts delivered today. The rest are planned for 30 Oct.",
      "attachments": [],
      "isClarificationRequest": false,
      "internal": false,
      "read": false
    }
  ],
  "meta": { "hasMore": false }
}
```
Opening the chat marks support comments as read (the server does this on GET).

### 10.2 `POST /cases/{caseId}/comments`
Dealer adds a message or answers a clarification (ATTACH-04).

**Request body**
| Field | Type | Req | Rules |
|---|---|---|---|
| `text` | string | Y unless files | 1–1000 characters |
| `attachmentIds` | string[] | N | From `POST /attachments`, max 5 |
| `inReplyTo` | string \| null | N | Clarification comment id being answered |

**Response `201`:** the new comment object.
**Errors:** `409 CASE_CLOSED`, `422 VALIDATION_FAILED`.

### 10.3 `POST /cases/{caseId}/feedback`
Rating after closure (FEEDBACK-*, SRS 13.11).

**Request body**
| Field | Type | Req | Rules |
|---|---|---|---|
| `rating` | integer | Y | 1–5 |
| `remarks` | string \| null | N | max 500 |

**Response `201`:** `{ "data": { "rating": 4, "remarks": null, "submittedAt": "…" } }`

| Error | HTTP | `code` |
|---|---|---|
| Case not closed | 409 | `CASE_NOT_CLOSED` |
| Already given | 409 | `FEEDBACK_EXISTS` |

### 10.4 `POST /cases/{caseId}/reopen`
Reopen a closed case with mandatory remarks (DETAIL-14, FLOW-04, SRS 9.4). Same rule as the portal's `/case/re-open`.

**Request body**
| Field | Type | Req | Rules |
|---|---|---|---|
| `remarks` | string | Y | 10–300 characters |
| `attachmentIds` | string[] | N | |

**Response `200`:** `{ "data": { "status": "Re-Open", "reopenedAt": "…" } }`

| Error | HTTP | `code` |
|---|---|---|
| Not allowed by rules (window passed, etc.) | 409 | `REOPEN_NOT_ALLOWED` + dealer-safe `message` |
| Case not closed | 409 | `CASE_NOT_CLOSED` |

---

## 11. Notifications

The portal has no notifications, so all of this is new (NOTIF-01…11, SRS 15.1).

### 11.1 `POST /devices`
Registers the FCM/APNs token for push. Call after login and whenever the token changes.

**Request body**
| Field | Type | Req |
|---|---|---|
| `deviceId` | string | Y |
| `platform` | `android` \| `ios` | Y |
| `pushToken` | string | Y |
| `appVersion` | string | Y |
| `locale` | string | N |

**Response:** `204`. `DELETE /devices/{deviceId}` → `204` on logout (also done by `/auth/logout`).

### 11.2 `GET /notifications`
Inbox list.

**Query:** `unreadOnly` (boolean), `page`, `pageSize`

**Response `200`**
```json
{
  "data": [
    {
      "id": "nt_501",
      "type": "status_updated",
      "title": "EUR26102410582 is in progress",
      "body": "Our team has started working on your case.",
      "caseId": "10582",
      "caseNumber": "EUR26102410582",
      "createdAt": "2026-10-25T09:30:00+05:30",
      "read": false
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 12, "totalPages": 1, "unreadCount": 3 }
}
```

**`type` values** (SRS 15.1): `case_created`, `case_assigned`, `status_updated`, `clarification_required`, `response_added`, `order_updated`, `part_updated`, `eda_updated`, `consignment_updated`, `case_closed`, `feedback_requested`, `case_reopened`.

### 11.3 `POST /notifications/read`
**Request:** `{ "ids": ["nt_501", "nt_502"] }` or `{ "all": true }`
**Response `200`:** `{ "data": { "unreadCount": 1 } }`

### 11.4 Push payload
Sent through FCM. The `data` block lets the app open the right screen.
```json
{
  "notification": { "title": "EUR26102410582 is in progress", "body": "Our team has started working on your case." },
  "data": { "notificationId": "nt_501", "type": "status_updated", "caseId": "10582", "screen": "case" }
}
```
`screen` = `case` \| `chat` \| `parts` \| `feedback`. No personal data in the push text beyond the case number.

---

## 12. Error codes

| HTTP | `code` | When | Default app message |
|---|---|---|---|
| 400 | `BAD_REQUEST` | Malformed JSON, bad query param | Something went wrong. Please try again. |
| 401 | `INVALID_CREDENTIALS` | Login failed | The user ID or password is incorrect. |
| 401 | `SESSION_EXPIRED` | Token expired or revoked | Your session has expired. Please log in again. |
| 403 | `USER_INACTIVE` | Account disabled | Your account is inactive. Contact your VECV representative. |
| 403 | `ROLE_NOT_ALLOWED` | Role not enabled on mobile | This app isn't available for your role yet. |
| 403 | `FORBIDDEN` | Permission missing | You do not have access to this information. |
| 404 | `CASE_NOT_FOUND` | No case, or outside scope | The requested record could not be found. |
| 404 | `REFERENCE_NOT_FOUND` / `PART_NOT_FOUND` | Lookup empty | We couldn't find this number. Check it and try again. |
| 409 | `DUPLICATE_CASE` | Open case for same reference | A case is already open for this. |
| 409 | `CASE_CLOSED` / `CASE_NOT_CLOSED` | Wrong state for the action | Context-specific |
| 409 | `FEEDBACK_EXISTS` / `REOPEN_NOT_ALLOWED` | | Context-specific |
| 413 | `FILE_TOO_LARGE` | | This file is larger than 10 MB. |
| 415 | `FILE_TYPE_NOT_ALLOWED` | | This file type isn't supported. |
| 422 | `VALIDATION_FAILED` | Field rules | Some details need attention before continuing. |
| 422 | `ATTACHMENT_INVALID` / `FILE_REJECTED` | | Please upload the file again. |
| 426 | `UPGRADE_REQUIRED` | App too old | Please update the app to continue. |
| 429 | `TOO_MANY_REQUESTS` / `TOO_MANY_ATTEMPTS` | Rate limit | Please wait a moment and try again. |
| 500 | `SERVER_ERROR` | Unexpected | Something went wrong on our side. Please try again later. |
| 503 | `UPSTREAM_UNAVAILABLE` / `CASE_CREATE_FAILED` | SAP, PQMP/EGP or logistics down | Temporarily unavailable. Please try again in a moment. |
| 504 | `TIMEOUT` | Upstream timeout | Temporarily unavailable. Please try again in a moment. |

The app already maps HTTP statuses to these messages in `mobile/src/api/client.ts`. A server `message` overrides the default only when it's dealer-safe.

---

## 13. Open questions

| # | Question | Blocks |
|---|---|---|
| Q1 | Who builds this API, and when? The portal is server-rendered Laravel with no JSON API. | Everything |
| Q2 | Auth method for dealers: portal user ID/password, OTP or SSO (SRS 8.1.7)? Session and refresh-token lifetimes? | §4 |
| Q3 | Are the SRS 10.2 statuses (Clarification Required, Awaiting User Response, …) being added? If not, how is a clarification request flagged? (`isClarificationRequest` on comments is the proposal.) | §3.1, §10 |
| Q4 | Will the backend give dealer-safe event text, or does it send raw portal history that the API must rewrite? | §8.5 |
| Q5 | Source for part-line ordered/delivered quantities, EDA and SAP progress. The portal only has per-SAP-document rows. | §9.2 |
| Q6 | Allowed file types, size per file, files per case. | §7 |
| Q7 | Reopen rules: time window after closure, number of reopens. | §10.4 |
| Q8 | Is feedback mandatory, and is there a window (SRS 13.11.7)? | §10.3 |
| Q9 | Logistics/consignment API: which provider, and is it in Phase 1? | §9.3 |
| Q10 | Should dealers see Avg NDP prices from the part lookup? | §6.4 |
| Q11 | Duplicate-case rule: which sub-types block a second open case for the same reference? | §8.1 |

---

## 14. Endpoint index

| # | Method | Path | Purpose | Req IDs |
|---|---|---|---|---|
| 1 | POST | `/auth/login` | Sign in | AUTH-01/02/04 |
| 2 | POST | `/auth/refresh` | New access token | AUTH-03 |
| 3 | POST | `/auth/logout` | Sign out | AUTH-03 |
| 4 | GET | `/me` | User, role, dealer scope | AUTH-01, PROFILE-02 |
| 5 | GET | `/masters/case-types` | Types + sub-types | CREATE-01/02 |
| 6 | GET | `/masters/sub-types/{id}/form` | Dynamic form config | CREATE-03/04 |
| 7 | GET | `/masters/options/{list}` | Dropdown values | CREATE-04 |
| 8 | GET | `/lookups/sap-documents/{no}` | Validate + pre-fill | CREATE-06, SCAN-01…04 |
| 9 | GET | `/lookups/invoices/{no}` | Validate + pre-fill | CREATE-06, SCAN-01…04 |
| 10 | GET | `/lookups/sales-orders/{no}` | Validate + pre-fill | CREATE-06 |
| 11 | GET | `/lookups/parts/{no}` | Part description, price | CREATE-10 |
| 12 | POST | `/attachments` | Upload a file | CREATE-07, ATTACH-01 |
| 13 | GET | `/cases/{id}/attachments` | Case files | DETAIL-08, ATTACH-02 |
| 14 | POST | `/cases/{id}/attachments` | Add files to a case | ATTACH-01 |
| 15 | GET | `/attachments/{id}/download` | Signed download URL | ATTACH-02 |
| 16 | POST | `/cases` | Create case | CREATE-01…13 |
| 17 | GET | `/cases` | List / search | LIST-01…09 |
| 18 | GET | `/dashboard/summary` | Home counts | DASH-01…04 |
| 19 | GET | `/cases/{id}` | Case detail | DETAIL-01…05, 12…14 |
| 20 | GET | `/cases/{id}/timeline` | History | DETAIL-03, FLOW-01 |
| 21 | GET | `/cases/{id}/order` | Order summary | DETAIL-09, ORDER-* |
| 22 | GET | `/cases/{id}/parts` | Part-wise status | DETAIL-10, PART-* |
| 23 | GET | `/cases/{id}/consignments` | Shipments | DETAIL-11, CONSIGN-* |
| 24 | GET | `/cases/{id}/comments` | Chat | DETAIL-06, ATTACH-03 |
| 25 | POST | `/cases/{id}/comments` | Send message / reply | ATTACH-03/04 |
| 26 | POST | `/cases/{id}/feedback` | Rate a closed case | DETAIL-13, FEEDBACK-* |
| 27 | POST | `/cases/{id}/reopen` | Reopen with remarks | DETAIL-14, FLOW-04 |
| 28 | POST | `/devices` | Register push token | NOTIF-* |
| 29 | DELETE | `/devices/{deviceId}` | Unregister push token | NOTIF-* |
| 30 | GET | `/notifications` | Inbox | NOTIF-01 |
| 31 | POST | `/notifications/read` | Mark read | NOTIF-01 |
| 32 | POST | `/cases/{id}/updates` | Desk: remark, status, ask dealer, close | SRS 4.3, 8.8, 9.4 |
| 33 | GET | `/desks` | Desks with open-case workload | SRS 7.15, 13.12 |
| 34 | POST | `/cases/{id}/assignment` | Admin: assign or transfer | SRS 6.3.4, 7.15 |
| 35 | GET | `/reports/summary` | Management report summary | SRS 4.5, 14 |

---

## 15. Support desk

Mobile access for support users needs VECV approval before release (SRS 4.3, 19.1). The endpoints are specified now so the backend can build one consistent API.

A support user sees cases assigned to their desk (`GET /cases` returns `assignedDesk` and `dealer`). `GET /cases/{id}` returns `actions.canUpdate` and `actions.allowedStatuses`, which the server works out from the Status Transition Configuration (SRS 12.1). The timeline and comments include internal entries with `internal: true`, which are never sent to dealers (SRS 5, 8.8.6).

### 15.1 `POST /cases/{caseId}/updates`
Requires `Idempotency-Key`.

**Request body**
| Field | Type | Req | Rules |
|---|---|---|---|
| `action` | `update` \| `clarify` \| `close` | Y | `clarify` asks the dealer a question: it becomes a comment with `isClarificationRequest: true` and a `clarification_required` notification. `close` closes the case. |
| `status` | `PortalStatus` | N | `update` only. Must be in `actions.allowedStatuses`. |
| `remark` | string | Y | 1–1000 characters. For `close` this is the final resolution the dealer sees (SRS 9.4.1). |
| `visibleToDealer` | boolean | Y | `false` keeps the remark internal. Always `true` for `clarify` and `close`. |
| `attachmentIds` | string[] | N | From `POST /attachments` |

**Response `200`:** `{ "data": { "status": "In Progress", "event": TimelineEvent } }`

| Error | HTTP | `code` |
|---|---|---|
| Not assigned to this desk | 404 | `CASE_NOT_FOUND` |
| Case closed | 409 | `CASE_CLOSED` |
| Status move not allowed | 409 | `STATUS_NOT_ALLOWED` + readable `message` |
| Remark missing | 422 | `VALIDATION_FAILED` |

No escalate action: escalation management is Phase 2 (SRS 3.5, 20).

## 16. Admin

Assignment workbench (SRS 7.15, 13.12). SRS 7.15 notes this needs a technical discussion with VECV. Balanced auto-assignment (SRS 6.3.3) is a backend rule; the app only shows its result.

`GET /cases` accepts `assignment` = `unassigned` \| `assigned` \| `old_pending` and `deskId`. `old_pending` returns open cases older than the confirmed threshold, oldest first.

### 16.1 `GET /desks`
**Response `200`:** `{ "data": [ { "id": "d1", "name": "Support Desk 1", "open": 42 } ] }`

### 16.2 `POST /cases/{caseId}/assignment`
Assigns an unassigned case or transfers an assigned one. Requires `Idempotency-Key`. Audited (SRS 8.10.2). The dealer is not told which desk has the case (SRS 6.3.5).

**Request:** `{ "deskId": "d2", "note": "Rebalancing workload" }`. `note` is required for a transfer.
**Response `200`:** `{ "data": { "assignedDesk": { "id": "d2", "name": "Support Desk 2" }, "status": "Re-Assigned" } }`

| Error | HTTP | `code` |
|---|---|---|
| Not admin | 403 | `FORBIDDEN` |
| Case closed | 409 | `CASE_CLOSED` |
| Same desk | 409 | `ALREADY_ASSIGNED` |
| Note missing on transfer | 422 | `VALIDATION_FAILED` |

The overdue and closure-eligible workbench filters (SRS 13.12) are left out until SLA rules and closure review are approved.

## 17. Management

Read-only reports within the user's approved data scope: hierarchy, dealer, location, region, category (SRS 4.5, 5.7).

### 17.1 `GET /reports/summary`
**Query:** `from`, `to` (dates), `region`, `caseTypeId`

**Response `200`**
```json
{
  "data": {
    "period": { "from": "2026-10-04", "to": "2026-11-03" },
    "summary": { "total": 412, "open": 101, "closed": 311, "pendingOrder": 38, "updatedToday": 17, "highPriority": 9, "awaitingUserResponse": 11, "feedbackPending": 46 },
    "byCategory": [ { "caseTypeId": "3", "label": "Order Status", "count": 198 } ],
    "byStatus": [ { "status": "In Progress", "count": 64 } ],
    "feedback": { "average": 4.2, "count": 265, "distribution": [ { "rating": 5, "count": 150 } ], "lowRatingCount": 6 },
    "deskWorkload": [ { "deskId": "d1", "name": "Support Desk 1", "open": 42, "closed": 118, "transferred": 4 } ],
    "unassigned": 14,
    "integrationExceptions": { "sap": 3, "logistics": 2 },
    "lastRefreshedAt": "2026-11-03T10:30:00+05:30"
  }
}
```
Covers SRS 14.1, 14.2, 14.3, 14.4, 14.7, 14.8 and the integration exception summary (4.5). Each tile drills down through `GET /cases` (§8.2): total/open/closed → `statusGroup`; pending order → `pendingOrder=true`; updated today → `updatedFrom=<today>&statusGroup=all`; high priority → `priority=P1`; awaiting dealer reply → `needsAction=reply`; feedback pending → `statusGroup=closed&needsAction=feedback`; low ratings → `statusGroup=closed&maxRating=2`. The drill-down does not yet carry the report's period or category scope. Not included until approved: SLA and ageing (14.5), audit trail (14.6, web portal), closure review summary (14.9). `byStatus` uses the portal statuses until VECV adopts the SRS 10.2 statuses.

## 18. Mock backend (until this API exists)

`mobile/src/mock/` implements this whole contract in memory, with all test data in one file (`mobile/src/mock/data.ts`). It is switched on by `useMockApi` in `mobile/src/config/env.ts` and only runs in debug builds. Sign-in users, test triggers and removal steps: `mobile/src/mock/README.md`. `mobile/src/api/api.test.ts` runs every role's flow against it, so the mock and this spec stay in step.
