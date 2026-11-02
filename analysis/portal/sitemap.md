# EGP / PQMP portal — sitemap

Portal: UAT `https://eicheregpqa.vecv.net` (HTTPS only — port 80 is closed, `http://` times out)
Captured: 2026-10-27   Logged-in role: EGP Support Desk (internal desk user, "Call Center" role)
Stack: Laravel (server-rendered Blade pages, jQuery + Select2 + Parsley + DataTables, CSRF `_token` + `XSRF-TOKEN` cookie). No JSON REST API — `/api/*` returns Laravel 404 JSON.

| Menu item | URL | Purpose | Requirement prefixes | Notes |
|---|---|---|---|---|
| (login) | `/` → `/login` | Username + password, "Forgot Your Password?" → `/password/reset` | AUTH | Heading typo "Loginssss" |
| Dashboard | `/dashboard` | — | DASH | **HTTP 500 "Oops, an error has occurred. Internal server error!"** in UAT |
| Cases | `/case` | Case list with filters, search, Excel export, reopen modal | LIST, DASH-04 | Default list shows open statuses only (35 pages); `?status[]=Close` gives 5,620 pages |
| Cases → Create Case | `/case/create` | Create form, case type → sub-type → dynamic fields | CREATE, ATTACH-01 | |
| Case detail / update | `/case/{id}/edit` | Tabs: Case Details, Attachments, Remarks Log, Case History; desk update form | DETAIL, FLOW, ORDER, PART, ATTACH | Same screen is used to view and to update |
| Case Reports → Reports | `/report` | 6 report types, POST filter form | (internal; DASH KPIs source) | |
| BuyBack | `/buybacks` | Buyback cases | — (out of mobile scope) | Timed out (>60 s) in UAT |
| Buyback Reports → Reports | `/buyback-report` | — | — | Not opened |
| Higher Assembly | `/higherassembly` | 3-stage document verification cases (HAC prefix) | — | Stages S1–S3, levels l1–l5 |
| Norms Case Close | `/normscaseclose` | Bulk close by Excel upload; close report download | — (desk-only) | Template `/excel/case_close_norms_part_description.xlsx` |
| EGP Support Desk Today | `#` (modal) | Shift-wise desk roster, loaded from `GET /shiftwise` | — (desk-only, must never reach customers, SRS 4.2) | |
| User menu → Logout | `GET /get-logout` | | AUTH-03 | Logout is a plain GET link |

Screens captured: [login](screens/login.png), [case list](screens/case-list.png), [create case](screens/case-create.png), [closed case detail (PII masked)](screens/case-detail-closed.png).

**Admin side** (`/admin`, admin login, captured 2026-10-29): users, roles, dealer mapping, assignment matrix, SLA and masters. See [roles-and-access.md](roles-and-access.md) and [users-by-role.md](users-by-role.md).

Screen notes: [case-list.md](case-list.md) · [case-create.md](case-create.md) · [case-detail.md](case-detail.md) · [masters.md](masters.md) · [api-contracts.md](api-contracts.md)