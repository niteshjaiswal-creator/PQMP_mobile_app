# Roles, routing and data access (admin side)
URL: `/admin/*`   Captured: 2026-10-29 (admin login, read-only)   Requirement IDs: AUTH-01…04, LIST-09, DETAIL-04, FLOW-01, DETAIL-16/17, DASH-*
User list: [users-by-role.md](users-by-role.md)

## Purpose
This note explains how the portal decides **who sees which cases** and **who owns a case at each level**. The mobile app has to reproduce this (SRS 1.5(7), 5, 8.1(2)). Nothing was saved or changed: only list and edit pages were opened (GET).

## Admin menu (`/admin`)
Dashboard (Total Users 2,242, Total Dealers 1,179) · Users · Dealers · User Dealer Mapping · Case SLA · Case Assignment Matrix · Reason For No · SOPs · Transporter · Order Cancellation Reason · Invoice Cancellation Reason · Wrong Supply Reason · CAPA · Advised Part · Supplying Plant · Claim Status · Rejected Reason · Delay Reason · Calendar Sync · Setting · Team Member · PQMP Parameter · PQMP Function · Forum · Higher Assembly Stage / Sla / Matrix / User Dealer Map · EDA Bulk Update via BDC Upload. Hidden (not in the menu, but reachable): `/admin/roles`. A header link "Shortage Lists" goes to `/eta/shortage-lists`, which returns 404.

The admin login also gets the full case portal (`/case`, `/case/create`, `/report`, Norms Case Close) with the same menu as a desk user. `/dashboard` still returns HTTP 500.

## 1. Roles (`/admin/roles`)
- 88 roles. Each role's edit form has only `name` and `permission[]`, and **`permission[]` has no options for any role**. So access is **hard-coded per role name in the application**, not configured. The mobile backend has to re-implement or expose that logic. It can't be read from configuration.
- Untranslated i18n keys show on screen (`global.app_add_new`, `global.app_edit`, `global.roles.fields.name`).
- A user can hold several roles: `roles[]` is a multi-select on the user form, and 107 users have more than one. Example: `egp_support1` holds EGP Support N + E + W. **Mobile must handle a multi-role session**, either a role switcher or the union of scopes. This is an open question.

## 2. User master (`/admin/users`, `/admin/users/{id}/edit`)
Form fields (all required unless noted): name, username, email, contact_no, `roles[]` (multi), plot_no, address, street_address, state_id (36 states), city (depends on state), pincode, reporting_person (optional, any user), `is_active` checkbox. The form has no dealer code field; dealer scope comes from the mapping table (§3). Bulk import is "Users First Master Import (.xlsx)", template `/excel/user-master.xlsx`.

Row actions: Edit, Change Password (`/admin/change-password/{id}`), Delete (**destructive GET** `/admin/users/{id}/delete`), Deactivate (`POST /admin/users/update-status`). **There's no "login as / impersonate"**, so role views can only be seen by logging in as that user.

Data quality: users with no role (7), usernames containing spaces or an email address, one PM row with a blank username, and mojibake in a name (`Â`). The mobile login must cope with spaces and `@` in usernames.

## 3. Data scope: User Dealer Mapping (`/admin/user-dealer-mapping`)
- 20,406 rows of `username × dealer_code × role_name`. Columns: Username, Name of User, Dealer Code, Dealer Name, Role Name. Bulk Excel import only.
- **The mapping is per role**: the same user and dealer can appear once for each role they hold.
- Every dealer is mapped to a full team: its DEALER login(s), ASM, RSM, CSM, CALLCENTER-AGENT, EGP SUPPORT (region), EGP ESCALATION 1/2, POORTI SUPPORT 1–4, PC HEAD, EXECUTION *, BUYBACK *, PACKAGING ENGG 1, CHANNEL_PARTNER_FEEDBACK, HA-CIM1.
- Mapping rows per role (top): CHANNEL_PARTNER_FEEDBACK 2,189 · PC HEAD 1,233 · POORTI SUPPORT 1 841 · EGP SUPPORT N/W/E ~837 each · DEALER 825 · CSM 817 · RSM 696 · ASM 690 · VEPDC HEAD 516 · PM 342 · EGP SUPPORT S/C 325 · CALLCENTER-AGENT 184.
- Test accounts `abc-test` (dealer) and `test-sipl` (csm) have **no dealer mapping**, so they would see no cases. A mapped dealer test login is needed for meaningful testing.
- **Implements SRS 5.1** ("cases created by them or mapped to their authorized dealer code"). The mobile API must filter the same way on the server side (SRS 5.8).

## 4. Routing: Case Assignment Matrix (`/admin/case-assignment-matrix`)
13,689 rows: `dealer_code × case_type (= sub-type name) × role_l1…role_l5` (plus an unused `model_no`). The owner at each level is a **role**, and the user is then resolved through the dealer mapping. Distinct chains (counts of dealer rows):

| Case types (sub-types) | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|
| Alternate Parts, Dispatch Required – LR, EDA Required, Execution/EDA Required, Hand Pick up Required, Higher Assembly, Invoice Cancellation Request, Invoice Soft Copy, Others | EGP Support **N / E / W / S / C** (by dealer region, ~227 / 177 / 159 / 246 / 50 dealers) | EGP Escalation 1 | EGP Escalation 2 | VEPDC Head | — |
| Wrong Part Supply (3 rows only) | EGP Support E | EGP Escalation 1 | EGP Escalation 2 | VEPDC Head | PC Head |
| Norms Modification, Order Query, Other Support (PQMP / Project Poorti) | Poorti Support 1 | Poorti Support 2 | Poorti Support 3 | Poorti Support 4 | PC Head (26 dealers: none) |
| Packaging Deviation, Packaging Suggestion | Packaging Engg 1 | Execution Support *(87: Execution Manager)* | Execution Head *(87: VEPDC Head)* | VEPDC Head | — |
| Parts Pickup Not Done, Settlement Not Received | Buyback Support 1 | Execution Manager *(87: Execution Support)* | Execution Head *(87: Execution Manager)* | VEPDC Head | — |
| Buyback (7 rows) | CIM 1 | CIM 2 | Poorti Support 3 | Poorti Support 4 | PC Head |

Observations:
- **Customer Order Cancellation** has an SLA row (below) but **no assignment-matrix rows**. Either it's routed some other way or it's a gap. Open question.
- Escalation stops at L4 for most EGP types, because L5 is blank.
- For the customer-facing mobile app, every L1–L5 role name above is an **internal desk label** and must be shown as the single generic support identity (SRS 4.2, `customerFacingOwner()`).

## 5. SLA (`/admin/case-sla`)
17 case types. **Every level is 2,880 minutes (48 h)**, so the total is 14,400 minutes (240 h = 5 × 48 h). `Calendar Sync` (`/admin/holiday`) holds the holiday calendar, which suggests SLA counts working time. To be confirmed.
- **Conflicts with the POC**, which hard-codes 24 h with 50/75/90/100 % thresholds. The portal value (48 h per level) is the baseline (SRS 1.5(8)). SLA-risk display (DETAIL-16) stays `needs-approval` (SRS 10.4).
- SLA case types: Customer Order Cancellation, Other Support, Order Query, Norms Modification, EDA Required, Others, Alternate Parts, Higher Assembly, Packaging Deviation, Packaging Suggestion, Settlement Not Received, Parts Pickup Not Done, Invoice Soft Copy, Dispatch Required – LR, Execution/EDA Required, Hand Pick up Required, Invoice Cancellation Request. **Wrong Part Supply has no SLA row.**

## 6. Other admin masters seen
- **Team Member** (`/admin/team-member`, 12 rows: name, email, mobile, added on, with import/export). This is the source of the "EGP Support Desk Today" shift roster modal. **Desk-only; must never reach customers.**
- **Setting** (`/admin/settings`): a single `scheduler_date` (2025-12-02). Its purpose is unknown, possibly the SAP sync cut-off.
- Reason For No, Delay Reason (`hold-reason`), Claim Status, Rejected Reason, Order/Invoice Cancellation Reason, Wrong Supply Reason, Supplying Plant, Transporter, Advised Part, CAPA, SOPs, PQMP Parameter / Function: master lists. Values already used on create and detail are in [masters.md](masters.md).

## Mobile notes
- **Login → role(s) → dealer scope** must come from the backend in one call (AUTH-01, SRS 8.1(2)). The portal's equivalent is the session plus a hard-coded role check plus `user_dealer_mapping`.
- **Phase 1 personas to support:** dealer (creator), callcenter-agent (creates for dealers), and L1 desks (EGP Support N/E/W/S/C, Poorti Support 1). L2–L5 escalation roles are Phase 2 (SRS 7.2: escalation and approval are Phase 2).
- Hide all role and desk names (matrix and roster) from dealer/customer sessions.
- SLA timers: if they're shown at all, use 48 h per level from the backend. Never hard-code.
