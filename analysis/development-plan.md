# PQMP mobile app: scope, design and development plan

Date: 2026-11-03. Baseline: the SRS (`docs/VECV_PQMP Case Tracking Mobile App.pdf`, v1.0). Where the SRS defers to the existing web portal (SRS 1.5(8): field rules, masters, statuses, assignment), the portal analysis in `analysis/portal/` applies. Nothing else is a source of scope.

| | |
|---|---|
| Design | [PQMP Final Design](https://claude.ai/artifact/1T8x56Zb5WN8ZnnyeRs5bH): 23 screens, one row per role. Source: `analysis/design/`. |
| API contract | [api/mobile-api-spec.md](api/mobile-api-spec.md) |
| API client | `mobile/src/api/` (typed function per endpoint, `import { api } from '../api'`) |
| Mock backend | `mobile/src/mock/`. All test data in `data.ts`. Remove with the steps in its README. |

## 1. Scope

### In scope (SRS)

| Role | SRS | What the app does |
|---|---|---|
| Dealer / customer | 4.1, 5, 7.1–7.14, 8.1–8.11, 13.1–13.11 | Sign in; dashboard with customer analytics; raise a case (category, sub-category, dynamic fields, order references, invoice/barcode scan, part selection, attachments); My Cases with search and filters; case detail with latest update, timeline, order, parts, consignment tracking, messages, clarification reply, files, closure remarks, feedback, reopen; notifications; sign out |
| EGP support desk | 4.3, 13.2 (internal) | Home with own queue and team workload; assigned cases; dealer and internal detail; add remark (internal or dealer-visible); change status within allowed transitions; ask the dealer a question; close with final remarks; files |
| Admin | 6.3.4, 7.15, 13.12 | Home with unassigned, workload by desk, old/pending, integration failures; assignment workbench; assign and transfer |
| Management | 4.5, 14.1–14.4, 14.7, 14.8 | Read-only reports within data scope: case summary, category, status, pending order cases, feedback, desk workload, integration exceptions; drill-down to the case list |

### Removed (out of scope or needs VECV approval)

| Item | Why |
|---|---|
| Escalate action, escalation levels in UI, escalation portal | Phase 2 (SRS 3.5, 20) |
| CSM approval inbox / workflow | Out of scope (SRS 20). A CSM/ASM field that the portal's form config returns is still shown, as data. |
| Closure review screen, bulk closure, closure-eligible counts and filters | Only if approved (SRS 13.13, 8.12) |
| SLA risk badges, SLA/ageing reports, overdue filter | Rules need confirmation (SRS 10.4, 14.5) |
| Audit trail report | Stays in the web portal (SRS 14.6) |
| Master and configuration maintenance | Web portal (SRS 12.1) |
| Email-based case creation | Open item (SRS 7.16) |
| BuyBack, Higher Assembly, Norms bulk close, apps hub, role switcher | Not in the SRS |
| Prototype rows: campaign banner (DASH-05), Top-10/volume charts and filters (DASH-06…09), CSV export (LIST-10), L1–L5 badge filter (LIST-11), expandable cards (LIST-12/13), settings/permissions screens (PROFILE-01…03), SLA badge (DETAIL-16), escalate (DETAIL-17), alert feed (ALERT-01…04) | `source: prototype`, not in the SRS |

### Rules every screen follows

- Render backend values only through `src/domain/display.ts`: never null, blank, `0000-00-00` or technical codes (SRS 9.3).
- "Last refreshed" wherever order, part or tracking data shows (9.3.8).
- Dealers see one support identity, `PQMP Support`, never desk names (4.2). The API already filters; screens still use `customerFacingOwner()`.
- Part status comes from `derivePartStatus()` (9.2). Statuses map with `fromPortalStatus()`.
- Order, parts and tracking load separately; a failed section shows its fallback and the rest of the case still renders (11.9.1).
- A failed submit keeps the user's input (17.2.6).
- Every interactive or asserted element has `testID="<screen>.<element>"`.

## Progress (2026-11-03)

| Phase | State |
|---|---|
| 0 Foundation | Done: navigation, Keychain session with refresh and expiry, role tabs, shared components, data hook |
| 1 Dealer | Done except step 1.7 camera scan and step 1.9 push. Check-details and part selection work from a typed order or invoice number. Unit and journey tests pass on the mock; device testing (`/test-mobile`) still to do |
| 2 Management | Built: Reports home (case summary tiles, by category, open by status, pending order, feedback, desk workload, integration exceptions, period and category scope, Last refreshed) and drill-down into the read-only list and detail through new presets (`pendingOrder`, `updatedToday`, `highPriority`, `lowRating`). Unit and journey tests (`__tests__/management-journey.test.tsx`) pass on the mock; Maestro flow `.maestro/management/reports.yaml` written. Device testing still to do. Open: region scope (no region master), drill-down doesn't carry period/category, high priority = `P1` and low rating ≤ 2 need VECV confirmation |
| 3 Support desk | Built on the mock: case detail action bar (Ask dealer, Update case) and update sheet (Add update with statuses from `actions.allowedStatuses` and a dealer-visible or internal remark; Ask dealer; Close with confirmed final remarks; optional file). Home "Old / pending" opens My Cases filtered to `assignment=old_pending`. Unit and journey tests pass; device test (`/test-mobile`) pending. Release still needs VECV approval of support desk mobile access (SRS 4.3, question 3) |
| 4 Admin | Not started |

Camera scan is deferred: `react-native-vision-camera` 5 moved code scanning out of the core package and needs Nitro modules, and the barcode format is still open (question 6). Decide between vision-camera 4.x (built-in scanner) and 5.x plus a barcode plugin once VECV shares the format.

## 2. Build order

Dealer first: it is the primary user (SRS 4.1) and builds every shared screen. Management next: read-only, no approval gate, and it reuses the list and detail. Support desk and admin last, because each has a VECV gate.

| Phase | Role | Gate before release | Est. |
|---|---|---|---|
| 0 | Foundation | none | 1 wk |
| 1 | Dealer / customer | Dealer UAT login | 4–5 wks |
| 2 | Management | Data scope rules for reports (SRS 5.7) | 1–1.5 wks |
| 3 | Support desk | **VECV approval for desk mobile access (SRS 4.3, 19.1)** | 2 wks |
| 4 | Admin | **Technical discussion on assignment (SRS 7.15)** | 1.5 wks |

Each phase ends with `/test-mobile <PREFIX>`, a report in `analysis/test-reports/`, and traceability set to `tested`. Estimates assume one developer and that the mock stays in place until the backend is ready; switching to the real API is a config change plus contract fixes.

### Phase 0: Foundation

| Task | Detail |
|---|---|
| Libraries | `@react-navigation/native` + `native-stack` + `bottom-tabs`, `react-native-keychain` (check New Architecture support first, per CLAUDE.md) |
| Session | Keep access and refresh tokens in Keychain; refresh on 401 once, then sign out with "session expired" (AUTH-03). Wire `configureApi({ getToken, onUnauthorized, defaultHeaders })`. |
| Role routing | After sign-in, `user.role.code` picks the tab set: dealer (Home, Cases, +, Updates, Account), support (Home, Cases, Updates, Account), admin (Home, Assign, Cases, Account), management (Reports, Cases, Account) (SRS 8.1.6) |
| Shared components | `StatusPill`, `CaseCard`, `KeyValueRow`, `Timeline`, `SectionFallback`, `LastRefreshed`, `BottomSheet`, `FilterChips`, `EmptyState`, `ErrorBanner`. Tokens from `src/theme`. |
| Data hooks | A small `useQuery`-style hook per endpoint with loading, error (`userMessageFor`), refresh |
| Screens | Sign in (exists, wire to `api.login`), Account + sign out |
| Tests | Session refresh and expiry, role routing, component tests for fallbacks |

### Phase 1: Dealer / customer

Board names refer to the design canvas.

| Step | Screens | Endpoints | Requirements |
|---|---|---|---|
| 1.1 Home | DealerHome | `getDashboard`, `listCases({ pageSize: 3 })` | DASH-01…04, SRS 8.2, 13.2 |
| 1.2 My Cases | CaseList, Filters | `listCases`, `getCaseTypes(true)`, `getOptions('priority')` | LIST-01…09, SRS 8.3, 13.3 |
| 1.3 Case detail | CaseDetail | `getCase`, `getTimeline` | DETAIL-01…05, DETAIL-07, DETAIL-12, FLOW-01 |
| 1.4 Order, parts, tracking | OrderParts | `getOrder`, `getParts`, `getConsignments` | ORDER-01…04, PART-01…06, CONSIGN-01…03, DATA-02, DETAIL-09…11 |
| 1.5 Messages and files | Messages | `getComments`, `postComment`, `getAttachments`, `uploadAttachment`, `linkAttachments`, `getDownloadUrl` | DETAIL-06, DETAIL-08, ATTACH-01…04, FLOW-03 |
| 1.6 Raise a case | CreateType, CreateReference, CreateDetails, CaseCreated | `getCaseTypes`, `getSubTypeForm`, `getOptions`, `lookup*`, `uploadAttachment`, `createCase` | CREATE-01…13 |
| 1.7 Scan | ScanReview | device scan, then `lookupInvoice` / `lookupSapDocument` / `lookupSalesOrder` | SCAN-01…04, CREATE-08…10. Library: `react-native-vision-camera`. Barcode format is open (SRS 11.7). |
| 1.8 Closure, feedback, reopen | ClosedCase, Reopen | `submitFeedback`, `reopenCase` | DETAIL-12…14, FEEDBACK-01/02, ATTACH-05, FLOW-04 |
| 1.9 Notifications | Notifications | `listNotifications`, `markNotificationsRead`; push via `@react-native-firebase/messaging` + `registerDevice` | NOTIF-01…11. Push channel needs VECV confirmation (SRS 8.9.6); in-app list does not. |

Notes:
- The create form is built from `getSubTypeForm()`, not hard-coded. `src/domain/case-validation.ts` still uses the SRS 12.3 example types; rework it to validate against the form config (fields, required, max length, parts, attachments).
- Duplicate-case warning: `DocumentLookup.openCase` (SO `4100231876` in the mock).
- Maestro flows: sign in → raise a case → see it in My Cases; reply to clarification; rate and reopen; SAP-down case still opens.

### Phase 2: Management

| Step | Screens | Endpoints | SRS |
|---|---|---|---|
| 2.1 Reports | MgmtHome | `getReportSummary` | 4.5, 14.1–14.4, 14.7, 14.8 |
| 2.2 Drill-down | CaseList (read-only), CaseDetail (no actions) | `listCases` with the tile's filter, `getCase` | 8.2.5 |

The shared list and detail already hide actions when `actions.*` is false, so management needs no new detail screen.

### Phase 3: Support desk (after VECV approval)

| Step | Screens | Endpoints | SRS |
|---|---|---|---|
| 3.1 Home | DeskHome | `getDashboard` (`internal` block), `listCases` | 13.2 internal items |
| 3.2 Case | DeskCaseDetail | `getCase` (dealer, desk, internal timeline), order/parts sections from Phase 1 | 4.3 |
| 3.3 Update case | DeskUpdate | `updateCase` (`update`, `clarify`, `close`), `uploadAttachment` | 4.3, 8.8, 9.4.1, FLOW-03 |

The dealer's detail screen gains an internal variant: dealer row, assigned desk, lock-marked internal remarks, bottom action bar. Statuses offered come from `actions.allowedStatuses`; never compute them in the app.

### Phase 4: Admin (after the SRS 7.15 technical discussion)

| Step | Screens | Endpoints | SRS |
|---|---|---|---|
| 4.1 Home | AdminHome | `getDashboard` | 13.2 internal items |
| 4.2 Workbench | Workbench | `listCases({ assignment, deskId, q })` | 13.12 |
| 4.3 Assign / transfer | AssignSheet | `listDesks`, `assignCase` | 6.3.4, 7.15, 8.10.2 |

## 3. Switching from mock to the real API

1. Backend implements `api/mobile-api-spec.md`. `src/api/api.test.ts` describes the expected behaviour per role; run it against a test server to check the contract.
2. Set `apiBaseUrl` in `src/config/env.ts`, then set `useMockApi: false`.
3. When every phase passes against the real API, remove the mock (`src/mock/README.md`, "Remove it").

## 4. Open questions for VECV

| # | Question | Blocks |
|---|---|---|
| 1 | Who builds the mobile API and when? The portal has no JSON API. | Release of every phase |
| 2 | Login method (user ID/password, OTP, SSO) and session lifetime (SRS 8.1.7) | Phase 0 |
| 3 | Approve support desk mobile access (SRS 4.3) | Phase 3 |
| 4 | Assignment and transfer rules, and who may transfer (SRS 6.3.7, 7.15) | Phase 4 |
| 5 | Are the SRS 10.2 statuses (Clarification Required, Awaiting User Response, …) being added? Until then a clarification is a flagged comment. | Status filters, reports |
| 6 | Barcode/QR format and fields on the invoice; is OCR needed (SRS 11.7)? | Step 1.7 |
| 7 | Logistics partners and tracking API (SRS 11.8) | Step 1.4 tracking (fallback works without it) |
| 8 | Reopen window and limits; is feedback mandatory (SRS 9.4.4, 13.11) | Step 1.8 |
| 9 | Attachment types, size and count (SRS 11.6) | Steps 1.5, 1.6 |
| 10 | Customer-facing support name (code uses `PQMP Support`) | Copy |
| 11 | "Old/pending" day threshold (SRS 10.4); the mock uses 7 days | Desk and admin homes |
| 12 | Notification channels: push, SMS, WhatsApp (SRS 15.3) | Step 1.9 push |
| 13 | QA logins for dealer, admin and management | Testing every phase |
