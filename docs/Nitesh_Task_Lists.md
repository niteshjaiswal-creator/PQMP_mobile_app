# Nitesh Task List (agent-readable copy)

Source: `docs/Nitesh_Task_Lists.xlsx` (Sheet1, 104 requirements). Copied 2026-11-03. The `.xlsx` is still the original; this file is the working checklist.

## How to mark

- Set **Status** to one of: `not-started`, `in-progress`, `implemented`, `tested`, `blocked`, `needs-approval`.
  - `implemented` means code is in `mobile/` with unit tests. `tested` means it was verified live on the Android emulator.
  - `needs-approval` applies to `Additional Prototype Screen` rows. They need VECV approval before they are built.
- Put a short reason in **Notes**: the main files, the blocker, or the open question. Keep tokens and personal data out.
- Keep `analysis/traceability.json` in sync through the `update_traceability` MCP tool.
- Don't reorder rows. **Row** is the row number in the `.xlsx`.

## Checklist

| Row | ID | Module | Feature Group | Requirement | Status | Notes |
|---|---|---|---|---|---|---|
| 2 | AUTH-01 | Login and Access Management | Authentication | Login using approved method such as User ID/Password, Mobile/Email Login, or existing identity provider | tested | LoginScreen.tsx + api/auth.ts; signed in as dealer on emulator via mock (2026-11-03) |
| 3 | AUTH-02 | Login and Access Management | Inactive User Handling | Block inactive or unauthorized users with a clear message | tested | 403 -> inactive message (api/auth.ts); verified on emulator with user "inactive" |
| 4 | AUTH-03 | Login and Access Management | Session Management | Secure session, token handling, session timeout, logout, and session expiry message | implemented | Tokens in Keychain, restored on launch, one refresh on 401 then sign-out with "session expired" notice, sign-out from Account. Inactivity timeout policy awaits VECV (SRS 8.1.4). |
| 5 | AUTH-04 | Login and Access Management | Error Handling | Show user-friendly login errors without exposing technical details | tested | Friendly errors (api/auth.ts, client.ts); verified on emulator: empty fields, wrong password |
| 6 | DASH-01 | Home Dashboard and Analytics | Summary KPIs | Total cases, open cases, in-progress cases, closed cases, and recently updated cases | implemented | Home KPIs total/open/in progress/closed + recently updated (HomeScreen). |
| 7 | DASH-02 | Home Dashboard and Analytics | User Action Indicators | Cases awaiting user response, feedback pending cases, and order/delivery update cards where applicable | implemented | Awaiting-your-response card, feedback pending and order/delivery update rows on dealer home. |
| 8 | DASH-03 | Home Dashboard and Analytics | Quick Actions | Create Case, My Cases, and Recent Updates | implemented | Create case (tab bar +), My Cases tab, recently updated list on home. |
| 9 | DASH-04 | Home Dashboard and Analytics | Drill-Down Navigation | Clicking a KPI opens the related filtered case list | implemented | KPI tiles and rows open My Cases with a matching preset (features/cases/filters.ts). |
| 10 | CREATE-01 | Case Creation | Create Case Form | Structured form for new case creation | implemented | 3-step create flow: category, order reference (+ check details), details. |
| 11 | CREATE-02 | Case Creation | Category Selection | Select case category | implemented | Category list from masters API. |
| 12 | CREATE-03 | Case Creation | Sub-Category Selection | Select case sub-category | implemented | Creatable sub-categories under the chosen category. |
| 13 | CREATE-04 | Case Creation | Dynamic Fields | Show fields based on selected category/sub-category | implemented | Fields, references, parts and attachments driven by the sub-type form config; case-validation.ts reworked to it (visibleWhen supported). |
| 14 | CREATE-05 | Case Creation | Issue Details | Capture issue title, issue description, remarks, contact details, and preferred contact mode where required | implemented | Issue title, description, remarks, contact person/number/email, preferred contact mode. |
| 15 | CREATE-06 | Case Creation | Order/PO/Part Fields | Capture order number, PO number, part number, invoice number, delivery number, chassis number, plant, and quantity details where applicable | implemented | SO/SAP document/invoice/PO references with format checks and lookup; part rows with quantity. |
| 16 | CREATE-07 | Case Creation | Attachment Upload | Upload supporting documents or images | implemented | Attach photos/files on step 3 with remove. |
| 17 | CREATE-08 | Case Creation | Scan-Assisted Capture | Scan invoice, barcode, or QR where supported | not-started | Same as SCAN-01: camera scan deferred until the barcode format is known. |
| 18 | CREATE-09 | Case Creation | Scanned Value Review | Display scanned values for user review and correction | implemented | Check details screen: document no., GST, seller GST, invoice ref editable (from lookup today; scan will feed the same screen). |
| 19 | CREATE-10 | Case Creation | Multi-Part Selection | If scanned data has multiple parts, user selects relevant part/parts | implemented | Select the parts the case is about. |
| 20 | CREATE-11 | Case Creation | Case Submission | Submit validated case to PQMP/EGP | implemented | Validated submit with idempotency key; server field errors mapped to fields. |
| 21 | CREATE-12 | Case Creation | Success Confirmation | Show generated or returned case number | implemented | Case registered screen shows only the server-returned number. |
| 22 | CREATE-13 | Case Creation | Preserve Entered Data | Preserve user-entered data if submission fails | implemented | Draft held in CreateCaseContext above the screens; failure keeps every value. |
| 23 | LIST-01 | My Cases and Case Listing | Case Listing | View all cases created by or mapped to logged-in user | implemented | My Cases list with paging, pull-to-refresh, empty/error states; scope enforced by API. |
| 24 | LIST-02 | My Cases and Case Listing | Case Card Details | Show Case ID, category, sub-category, status, priority, created date, last updated date, order reference, and short description | implemented | Case card: number, category/sub-category, status, priority, order reference, latest update, created and updated dates. |
| 25 | LIST-03 | My Cases and Case Listing | Search | Search by case number and order number | implemented | Debounced search by case or order number (min 3 characters). |
| 26 | LIST-04 | My Cases and Case Listing | Filters | Filter by status, category, sub-category, priority, date range, and order-related case type | implemented | Filter sheet: status, category, sub-category, priority, raised date range, order-related only. |
| 27 | LIST-05 | My Cases and Case Listing | Status Badge | Display user-friendly current status | implemented | StatusPill via portalStatusLabel/statusTone; unknown codes show Under Review. |
| 28 | LIST-06 | My Cases and Case Listing | Latest Update Summary | Show latest update on case card | implemented | Latest update text on each card (falls back to summary). |
| 29 | LIST-07 | My Cases and Case Listing | Feedback Pending Indicator | Show indicator after closure where feedback is pending | implemented | "Rate this case" tag when feedback is pending after closure. |
| 30 | LIST-08 | My Cases and Case Listing | Consignment Indicator | Show tracking/consignment indicator where applicable | implemented | "Tracking" tag when the case has consignments. |
| 31 | LIST-09 | My Cases and Case Listing | Access Restriction | Hide internal desk names and cases outside user scope | implemented | Dealer cards never show desk names (assignedDesk only for internal roles); scope enforced by API. |
| 32 | DETAIL-01 | Case Detail and Live Tracking | Case Summary | Show Case ID, category, sub-category, status, priority, created date, last updated date, and issue details | implemented | Case header: number, status, priority, title, category/sub-category, raised/updated, issue details. |
| 33 | DETAIL-02 | Case Detail and Live Tracking | Latest Update | Display latest case update at the top | implemented | Latest update card at the top (red with Reply when a clarification is open). |
| 34 | DETAIL-03 | Case Detail and Live Tracking | Timeline | Show chronological movement of case events | implemented | Timeline from GET /timeline; wording in features/case-detail/timeline.ts. |
| 35 | DETAIL-04 | Case Detail and Live Tracking | Support Identity | Show generic support identity to customers | implemented | Dealers see "PQMP Support" via customerFacingOwner() in header, timeline, messages and files. Final name awaits VECV. |
| 36 | DETAIL-05 | Case Detail and Live Tracking | Issue Details | Show description, remarks, order/PO/part references | implemented | Details card: references, contact, sub-type fields, parts, description, remarks (fallbacks via display.ts). |
| 37 | DETAIL-06 | Case Detail and Live Tracking | Comments | View or add comments based on access/status | implemented | Messages tab: view and add comments while open; read-only notice when closed or for management. |
| 38 | DETAIL-07 | Case Detail and Live Tracking | Clarification History | Show clarification requested and response received events | implemented | Clarification requested / response received in timeline and highlighted in messages. |
| 39 | DETAIL-08 | Case Detail and Live Tracking | Attachments | View or download permitted attachments | implemented | Files list with source, uploader, date, size; opens a signed download URL. |
| 40 | DETAIL-09 | Case Detail and Live Tracking | Order Section | Show order summary for order-related cases only | implemented | Order & parts tab only when sections.order/parts/consignment apply. |
| 41 | DETAIL-10 | Case Detail and Live Tracking | Part-Wise Section | Show part-level details where data exists | implemented | Part cards when part data exists. |
| 42 | DETAIL-11 | Case Detail and Live Tracking | Consignment Section | Show tracking status where API/reference exists | implemented | Tracking cards per consignment with events or a fallback. |
| 43 | DETAIL-12 | Case Detail and Live Tracking | Closure Remarks | Show final resolution or closure remarks once closed | implemented | Resolution card with closure remarks and date. |
| 44 | DETAIL-13 | Case Detail and Live Tracking | Feedback Section | Show rating and optional remarks after closure/completion | implemented | Feedback card after closure; shows given rating and remarks. |
| 45 | DETAIL-14 | Case Detail and Live Tracking | Reopen Option | Allow reopen where permitted with mandatory remarks | implemented | Reopen sheet with mandatory remarks, only when actions.canReopen. |
| 46 | FLOW-01 | Workflow, Assignment and SLA | Case Status Lifecycle | Support statuses such as New, Assigned, In Progress, Hold, Resume, Escalated, Reassigned, Closed, and Reopened | implemented | Portal statuses shown as business labels everywhere (StatusPill, timeline). |
| 47 | FLOW-02 | Workflow, Assignment and SLA | Additional Recommended Statuses | Submitted, Awaiting Assignment, Under Review, Clarification Required, Awaiting User Response, Awaiting Backend Update, Resolved, and Closure Pending | needs-approval | SRS 10.2 statuses are not in the portal; need VECV approval and backend support |
| 48 | FLOW-03 | Workflow, Assignment and SLA | Clarification | Support can request clarification and user can respond | in-progress | Dealer reply to clarification implemented (MessagesTab, inReplyTo). Support "ask dealer" screen is Phase 3. |
| 49 | FLOW-04 | Workflow, Assignment and SLA | Reopen | Closed or resolved case may be reopened where allowed with mandatory remarks | implemented | Reopen with mandatory remarks when allowed by the server. |
| 50 | ORDER-01 | Order Status Visibility | Order Header Details | Show order number, order type, PO number, PO date, dealer/customer reference, sold-to party, plant, and chassis number where applicable | implemented | Order number, type label, PO, PO date, plant, dealer, sold-to, chassis when present. |
| 51 | ORDER-02 | Order Status Visibility | Order Delivery Summary | Show total parts, delivered parts, pending parts, overall order status, and delivery completion flag where available | implemented | Parts/delivered/pending counts and overall status. |
| 52 | ORDER-03 | Order Status Visibility | Last Refreshed Timestamp | Show last refreshed date/time wherever backend data is displayed | implemented | LastRefreshed on order, parts and each consignment. |
| 53 | ORDER-04 | Order Status Visibility | Fallback Message | Show Not Available, Awaiting Update, or Temporarily Unavailable where data is missing or error occurs | implemented | Per-section fallback (unavailable/pending/not applicable/error with retry); rest of case still loads. |
| 54 | PART-01 | Part-Wise Status Visibility | Part Details | Show part number, part description, and HSN code where available | implemented | Part number, description, HSN when available. |
| 55 | PART-02 | Part-Wise Status Visibility | Quantity Details | Show ordered quantity, delivered quantity, and pending quantity | implemented | Ordered/delivered/pending with pendingQuantity and derivePartStatus. |
| 56 | PART-03 | Part-Wise Status Visibility | Delivery Details | Show delivery number, delivery date, invoice number, and invoice date | implemented | Delivery number/date, invoice number/date (invalid dates show Awaiting Update). |
| 57 | PART-04 | Part-Wise Status Visibility | Expected Delivery / EDA | Show expected delivery date where available | implemented | Expected delivery date for parts not fully delivered. |
| 58 | PART-05 | Part-Wise Status Visibility | Remarks | Show backend/support remarks where available and permitted | implemented | Part remarks when present. |
| 59 | PART-06 | Part-Wise Status Visibility | Consignment Status | Show tracking status at part level where available | implemented | Consignment reference and status on each part. |
| 60 | SCAN-01 | Invoice / Barcode / Scan-Assisted Capture | Scan Option | Scan invoice, barcode, or QR where supported | not-started | Camera scan deferred: react-native-vision-camera 5 moved code scanning out of core and needs Nitro modules; barcode format undecided (SRS 11.7). Check details screen is ready to receive scan output. |
| 61 | SCAN-02 | Invoice / Barcode / Scan-Assisted Capture | Review and Correction | User can review and correct scanned values | implemented | Review and correct values on Check details (fed by lookup until the camera step is built). |
| 62 | SCAN-03 | Invoice / Barcode / Scan-Assisted Capture | Part Selection | User selects applicable part/parts if multiple parts are scanned | implemented | Select applicable parts from the document. |
| 63 | SCAN-04 | Invoice / Barcode / Scan-Assisted Capture | Manual Entry Fallback | Manual entry allowed if scan output is incomplete or scan fails | implemented | Manual entry always possible; lookup outage lets the user continue unverified. |
| 64 | CONSIGN-01 | Consignment Tracking | Display Status | Show delivery movement/status in user-friendly format | implemented | Consignment status and movement events. |
| 65 | CONSIGN-02 | Consignment Tracking | Last Updated Timestamp | Show tracking last refreshed or updated time | implemented | Last updated time per consignment. |
| 66 | CONSIGN-03 | Consignment Tracking | Fallback Message | Show tracking unavailable if API/data is not available | implemented | "Tracking unavailable" fallback per consignment. |
| 67 | ATTACH-01 | Attachments and Comments | Upload Attachment | Upload documents/images during or after case creation where allowed | implemented | Camera/photos/files picker, type and size checks, upload during create and after (Add file). |
| 68 | ATTACH-02 | Attachments and Comments | View / Download | View or download permitted attachments | implemented | Open/download permitted files via signed URL. |
| 69 | ATTACH-03 | Attachments and Comments | Add Comment | Add comment where case status allows | implemented | Composer shown only when actions.canComment; failed send keeps text. |
| 70 | ATTACH-04 | Attachments and Comments | Clarification Response | User responds to support clarification | implemented | Reply goes as response to the open clarification (inReplyTo). |
| 71 | ATTACH-05 | Attachments and Comments | Reopen Remarks | Mandatory remarks for reopen where enabled | implemented | Reopen requires 10–300 character remarks. |
| 72 | NOTIF-01 | Notifications and Alerts | Notification Center | In-app notification list | implemented | Updates screen: all/unread, mark one/all read, tap opens the case on the right tab. Push not built. |
| 73 | NOTIF-02 | Notifications and Alerts | Case Creation Alert | Alert after case registration | not-started | Event raised by backend and listed via NOTIF-01; push (@react-native-firebase/messaging) not built; channels need VECV (SRS 8.9.6) |
| 74 | NOTIF-03 | Notifications and Alerts | Assignment Alert | Alert when case is assigned where approved | needs-approval | Assignment alerts to customers only if approved (SRS 15.2.8) |
| 75 | NOTIF-04 | Notifications and Alerts | Status Update Alert | Alert when case status changes | not-started | Event raised by backend and listed via NOTIF-01; push (@react-native-firebase/messaging) not built; channels need VECV (SRS 8.9.6) |
| 76 | NOTIF-05 | Notifications and Alerts | Clarification Required Alert | Alert when support requests user input | not-started | Event raised by backend and listed via NOTIF-01; push (@react-native-firebase/messaging) not built; channels need VECV (SRS 8.9.6) |
| 77 | NOTIF-06 | Notifications and Alerts | Order / Part Update Alert | Alert when order/part status changes | not-started | Event raised by backend and listed via NOTIF-01; push (@react-native-firebase/messaging) not built; channels need VECV (SRS 8.9.6) |
| 78 | NOTIF-07 | Notifications and Alerts | EDA Update Alert | Alert when expected date changes | not-started | Event raised by backend and listed via NOTIF-01; push (@react-native-firebase/messaging) not built; channels need VECV (SRS 8.9.6) |
| 79 | NOTIF-08 | Notifications and Alerts | Consignment Update Alert | Alert for delivery tracking updates | not-started | Event raised by backend and listed via NOTIF-01; push (@react-native-firebase/messaging) not built; channels need VECV (SRS 8.9.6) |
| 80 | NOTIF-09 | Notifications and Alerts | Closure Alert | Alert after case closure | not-started | Event raised by backend and listed via NOTIF-01; push (@react-native-firebase/messaging) not built; channels need VECV (SRS 8.9.6) |
| 81 | NOTIF-10 | Notifications and Alerts | Reopen Alert | Alert when case is reopened | not-started | Event raised by backend and listed via NOTIF-01; push (@react-native-firebase/messaging) not built; channels need VECV (SRS 8.9.6) |
| 82 | NOTIF-11 | Notifications and Alerts | Feedback Request | Alert after closure/completion | not-started | Event raised by backend and listed via NOTIF-01; push (@react-native-firebase/messaging) not built; channels need VECV (SRS 8.9.6) |
| 83 | FEEDBACK-01 | Customer Feedback | Rating | Simple 1 to 5 rating | implemented | 1–5 star rating with labels after closure. |
| 84 | FEEDBACK-02 | Customer Feedback | Remarks | Optional remarks box | implemented | Optional remarks up to 500 characters. |
| 85 | DATA-01 | Data Display, Audit and Error Handling | Unauthorized Access Message | Show clear no-access message for restricted data | implemented | 403 shows "You do not have access to this information." via ErrorState; out-of-scope cases read as not found. |
| 86 | DATA-02 | Data Display, Audit and Error Handling | Last Refreshed Display | Show timestamp wherever backend order, part, or tracking data is displayed | implemented | LastRefreshed wherever order, part or tracking data shows. |
| 87 | DASH-05 | Dashboard | Additional Prototype Screen | Campaign Highlights carousel/banner | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
| 88 | DASH-06 | Dashboard | Additional Prototype Screen | Top 10 Dealer Snapshot with live filter | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
| 89 | DASH-07 | Dashboard | Additional Prototype Screen | Performance Summary metrics (Avg Closure/Hold Time) | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
| 90 | DASH-08 | Dashboard | Additional Prototype Screen | Top Dealers by Volume bar chart | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
| 91 | DASH-09 | Dashboard | Additional Prototype Screen | Dashboard Filters panel (date/dealer type/region/dealer) | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
| 92 | LIST-10 | Case Listing | Additional Prototype Screen | Export CSV functionality | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
| 93 | LIST-11 | Case Listing | Additional Prototype Screen | Priority level badges L1-L5 display and filter | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
| 94 | PROFILE-01 | Profile | Additional Prototype Screen | User Settings modal (Name, Email, Mobile) | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
| 95 | DETAIL-15 | Case Detail | Additional Prototype Screen | Case Detail modal: Details Overview — Region, Level, Created, status badges | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
| 96 | DETAIL-16 | Case Detail | Additional Prototype Screen | SLA Risk badge (Critical/Warning/OK) on case detail header | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
| 97 | DETAIL-17 | Case Detail | Additional Prototype Screen | Escalate Case section — move level L3→L4, mandatory escalation comment | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
| 98 | ALERT-01 | Alert | Additional Prototype Screen | Live Alert Feed screen — CRITICAL / WARNING / INFO summary counts | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
| 99 | ALERT-02 | Alert | Additional Prototype Screen | Alert cards with deep-link chips (Case No→, type, level, status badges) | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
| 100 | ALERT-03 | Alert | Additional Prototype Screen | Filter Alerts panel (by type, severity, date range) | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
| 101 | ALERT-04 | Alert | Additional Prototype Screen | Alert → Case navigation (tap Case No chip opens case detail modal) | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
| 102 | PROFILE-02 | Profile | Additional Prototype Screen | Profile screen — avatar, name, role, email + mobile display rows | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
| 103 | PROFILE-03 | Profile | Additional Prototype Screen | Role & Access section — fine-grained permissions list (RBAC display) | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
| 104 | LIST-12 | Case Listing | Additional Prototype Screen | Case card expand / collapse toggle (Hide Details / Overview button) | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
| 105 | LIST-13 | Case Listing | Additional Prototype Screen | Expanded card fields — User ID, SAP Dealer Code, Modified Date, Role, Elapsed | needs-approval | Prototype only, not in SRS; left out of the final design. Needs VECV approval |
