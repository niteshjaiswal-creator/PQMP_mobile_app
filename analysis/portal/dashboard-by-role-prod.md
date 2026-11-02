# Production dashboard by role
URL: `https://eicheregp.vecv.net/dashboard` (production)   Captured: 2026-11-02, read-only, headed browser
Method: the user logged in with each role; Claude only loaded pages (`/dashboard`, `/case`) and read them. Nothing was clicked, filtered or submitted. Staff, dealer and customer names are redacted. Earlier dealer capture (C157, 2026-10-29): [dashboard-dealer.md](dashboard-dealer.md) §0.

SRS reference per persona: dealer 4.1 + 8.2 · support desk 4.3 + 7.2(11) + 8.2(7, 10) · management 4.5 + 5(7) · admin 4.4 + 8.2(10).

Logins: the user authorised Claude to log in and out itself (shared UAT password, not stored). Login and logout were the only submits.

## 0. Result across roles: one global dashboard for everyone

| # | Login | Portal role | SRS persona | Lands on | Dashboard numbers | Menu differences | Screenshot |
|---|---|---|---|---|---|---|---|
| 1 | `8041` | dealer | Dealer | `/case` | **baseline** (16 / 0 / 13, status 17) | BuyBack, Buyback Reports, Higher Assembly; no Norms Case Close | [01](screens/prod-dashboard/01-dealer-8041-full.jpeg) |
| 2 | `egp_support1` | EGP Support N/E/W | Support desk | `/case` | **identical** (incl. South/Central cases) | Norms Case Close; no BuyBack/HA | [02](screens/prod-dashboard/02-egp-support-n-e-w-egp_support1-full.jpeg) |
| 3 | `ryjujara` | Business Head | Management | — | **not captured: "Invalid credentials" on production** (not retried, to avoid lock-out) | — | — |
| 4 | `admin` | admin | Admin | `/admin` (Total Users 2,356 · Total Dealers 1,231, nothing else) | **identical** at `/dashboard` | Norms Case Close | [04a admin home](screens/prod-dashboard/04a-admin-admin-home-full.jpeg), [04b](screens/prod-dashboard/04b-admin-admin-dashboard-full.jpeg) |
| 5 | `ssubramanian` | callcenter-agent (+ HA-CIM1) | Dealer side / desk | `/case` | **identical** | everything: BuyBack, HA, Norms Case Close | [05](screens/prod-dashboard/05-callcenter-ssubramanian-full.jpeg) |
| 7 | `asharma100` | csm (29 mapped dealers) | Management | `/case` | **identical** | Norms Case Close | [07](screens/prod-dashboard/07-csm-asharma100-full.jpeg) |

Not run: #6 Poorti Support 1, #8 SPOC, #9 asm/rsm, #10 channel_partner_feedback. After five identical results, including a dealer and a dealer-scoped CSM, they would only show menu differences.

**Conclusion.** The production `/dashboard` is **one global, unscoped view**. Every role, from a single dealer to admin, sees the same system-wide numbers, the same Top 10 dealers and the same named staff. Only the top menu depends on the role. So:
1. There is **no per-role dashboard in the portal to copy.** The SRS asks for role-based dashboards (8.2(1) "based on user access", 4.1 / 4.3 / 4.5), so the per-role views in §2 are **new mobile behaviour built on the portal's existing KPIs and filter definitions**. Under SRS 1.5(8) the scoping itself is mandated (SRS 5.1, 5.7, 5.8), not a change in logic.
2. Report to VECV: dealers and dealer-scoped managers can see system-wide figures, other dealers' volumes and internal staff names (SRS 4.2, 5.1).

---

## 1. Dealer: `8041` (APCO Motors, dealer code 1S3044)
Default period: **01-11-2026 → 02-11-2026** (month to date).

### What the dashboard shows
| Widget | Values | Comment |
|---|---|---|
| Header / menu | Dealer name · Dashboard, Cases, Case Reports, BuyBack, Buyback Reports, Higher Assembly, **EGP Support Desk Today**, "Switch To Case Management" | Same desk menu as on UAT |
| Filters | Date From/To, **Dealer Type** (13 values incl. "-", "Test", "Distributor"/"Distributer"/"Distributors"), **By Region** (North/East/West/South), Reset, Apply | Dealer-type and region filters are meaningless to one dealer |
| Cases Insights | Total Logged **15** · Resolved **0** · Open **12** · Avg Closure Time **327:12** · Avg Hold Time **0** | Avg Closure barely changed from 327:18 (29-Oct, C157) and 0 cases were resolved in the period, so it is **not computed for the selected period** |
| Top 10 Dealer | 10 **other dealers' names**, 1 case each | System-wide data |
| Case-type table (14 types × open/closed/re-open, levels, SLA) | Order Status 5 (open 4) · Order Cancellation 2 (open 0, closed 0) · Project Poorti 8 (open 8) · all else 0 | All = 15, but Open + Closed = 12; 3 cases in neither |
| Top Region Contributing | 8 region names, no readable counts | |
| Level Wise Open Cases | L1 12 · L2–L4 0 | Shows escalation levels to a dealer (hidden under SRS 4.2) |
| Ageing by case type | all 0 | Dead: 12 cases are open |
| Ageing by channel-partner type | all 0 | Dead; junk master values |
| Responsibility / SLA (B 0–24 h, Y 25–48 h, R >48 h) | **Named internal staff** per case type; Open 4 (Order Status) and 8 (Poorti); every SLA bucket 0 | Breaks SRS 4.2; SLA buckets dead |
| Case Count By Status: Total **16** | New 4 · Assigned 12 · Hold 0 · Resume 0 · Escalated 0 · Closed 0 · Re-open 0 | Total 16 ≠ Total Logged 15. No In Progress / Re-Assigned tile |

Screenshot (staff names blurred): [screens/prod-dashboard/01-dealer-8041-full.jpeg](screens/prod-dashboard/01-dealer-8041-full.jpeg). Taken ~10 min after the text read, so the live numbers had moved: Total Logged 16, Open 13, Project Poorti 9, status Total 17 (New 4, Assigned 13).

Page layout (1440 px wide, 3,220 px tall): KPI tiles + Top 10 Dealer (left column) | filter bar + case-type table (right, **wider than the screen; the Closed and Re-open column groups scroll off to the right**) → Top Region + Level Wise tiles | ageing by case type → ageing by channel-partner type | Responsibility/SLA → status tiles. The page also loads hidden c3/d3 **template demo charts** ("Skyline Pro", "data1/data2") and a hidden Uptime-style filter (Vertical, DTC, ECU Make, Aggregate). Neither is visible; ignore both.

### Every number is a drill-down link (this gives the portal's formulas)
All counts link to `/case?datefrom=…&dateto=…&<filter>`, so DASH-04 (tap a tile to see the filtered list) is existing portal behaviour (SRS 1.5(8)).

| Widget | Link filter = the portal's definition |
|---|---|
| Total Logged | period only |
| **Resolved** | `status[] = Close, Pre-Close` (**"Pre-Close" is a status not seen before**) |
| **Open** | `status[] = Assigned, Escalated, Hold, In Progress, New, Re-Assigned, Resume, Re-Open` = **every non-closed status** (option C in dashboard-dealer.md §3) |
| Top 10 Dealer row | `dealer[] = <id>` |
| Case-type row | `type[] = <list of sub-type IDs>`: each of the 14 dashboard "case types" is a **group of sub-types** (e.g. Order Status = 9 sub-type IDs, Project Poorti = 26, 27, 28, 43, 44) |
| Case-type × Open / Level / SLA | `+ OPEN`, `+ case_level[]=l1…l4`, `+ opensla=1`, `+ clossedsla=1` (sic) |
| Case-type × Closed / Re-open | `status[]=Close,Pre-Close` · `status[]=Re-Open` |
| Level Wise tiles | `case_level[]=level1 + OPEN`. Note `level1` here vs `l1` in the table: two spellings for the same filter |
| Ageing by case type | `type[]=… & days_difference=2` (bucket parameter) |
| Ageing by channel-partner type | a list of `dealer[]` IDs per partner type (the type is resolved to dealers) |
| Responsibility B/Y/R | `type[]=… & hours_difference=24` |
| Status tiles (New … Re-open) | `status[]=<one>` with **empty dates**. The link opens all-time, while the tile count looks period-based |
| Top Region tiles | **no link and no visible count** |
| View Details | plain `/case` |

**Reconciliation:** Open's link includes New, so the Open **tile** (13 = Assigned only) disagrees with its own drill-down list (New 4 + Assigned 13 = 17). The tile and the list a user lands on will show different numbers. Mobile must compute tile and list from the **same** filter (SRS 8.2(4): "dashboard metrics shall match the data available in case listing").

### Scope check: is this the dealer's data?
**No, it is system-wide.** The dealer's own `/case` list (Open filter) has ~2 pages of **Packaging Suggestion** cases, the newest created 13-Mar-2026, and **none created in November**. The dashboard shows 15 cases logged on 1–2 Nov, all Order Status / Order Cancellation / Project Poorti, and none of them Packaging. Together with the Top 10 list of other dealers, this confirms the 29-Oct finding: **the production dashboard ignores the logged-in dealer's scope** (SRS 5.1, 5.8).

### Other observations
- **Open = Assigned only.** Open 12 = Assigned 12; the 4 "New" cases are not counted as open. Under the 29-Oct capture (Open 182 vs New 48 + Assigned 117 = 165) the rule didn't hold either, so the Open formula is still undefined. Ask VECV.
- The dealer's case list shows the **internal assignee's name** on every row (SRS 4.2).
- On production, the list's "Time Elapsed" matches wall-clock age (13-Mar-26 → 5,611 h ≈ 234 days). On UAT it didn't (see dashboard-dealer.md §2), so still compute age from `createdAt`.
- **Security (report to VECV):** the "Switch To Case Management" form embeds the user ID and a **shared static password** as base64 hidden fields in every page (`user_id`, `password`). Anyone who views the page source can read them. The value is not recorded here.

### What the mobile dealer dashboard should be
| Show | Source / rule |
|---|---|
| Tiles: **Total · Open · In Progress · Closed** (SRS 8.2(2)), scoped to the dealer's mapped codes | New scoped API; the portal can't supply it |
| Status breakdown chips (New, Assigned, In Progress, Hold, Escalated→"In Progress", Re-Open) | Portal "Case Count By Status", but scoped |
| **Recently updated** cases (last 5) | SRS 8.2(2); not on the portal |
| **Awaiting your response**, **Feedback pending** | SRS 8.2(3), 7.2(10); hidden until FLOW/FEEDBACK exist |
| **Pending order-related cases** with "Last refreshed" | SRS 3.3, 7.2(7); not on the portal |
| Cases by type (top 3 + "more") | Portal case-type table, collapsed to one count per type |
| Quick actions: Create Case, My Cases | SRS 7.2(12) |
| Period selector: month to date by default | Portal behaviour (SRS 1.5(8)), pending 1c in dashboard-dealer.md |

**Drop for dealers:** Top 10 Dealer, Top Region, both ageing tables, the Responsibility/SLA table (staff names), Level-wise counts, the Dealer Type / Region filters, Avg Hold Time (always 0), and the desk roster. Keep Avg Closure Time only if VECV defines its formula and period.

---

## 2. Mobile dashboard per persona

### 2.0 Rules that apply to every role
1. **Scope on the server, per role** (SRS 5.1, 5.7, 5.8). One call such as `GET /mobile/v1/dashboard?from=&to=` returns every widget, already scoped by the session's roles and dealer mappings. The production page is server-rendered (`POST /dashboard`), so there is no API to reuse.
2. **The tile count and the list it opens use the same filter** (SRS 8.2(4)). Reuse the portal's drill-down definitions (§1): Open = all non-closed statuses, Resolved = Close + Pre-Close. This fixes the portal's tile ≠ list bug (13 vs 17).
3. **Period chips** instead of two date fields: *Month to date* (portal default), Today, Last 7 days, Custom. Status counts follow the same period; the portal's status tiles don't.
4. **Summary first, detail on tap.** A phone can't show the 21-column case-type table, so each wide table becomes per-type cards with an expandable detail. **Zero rows are hidden** (on 2 Nov, 11 of 14 rows were all zeros).
5. Show a **"Last refreshed"** timestamp and support pull-to-refresh.
6. **Don't carry over** the portal's broken or junk parts: the dead SLA/ageing values until the backend fixes them, the Top Region tiles with no counts, the duplicate or junk channel-partner types ("Distributor/Distributer/Distributors", "-", "Test"), Avg Hold Time while it's always 0, and the hidden demo charts.
7. Render every value through `display.ts`. "327:12" needs a defined unit; show it as e.g. "13 d 15 h" once VECV confirms it's hh:mm.

### 2.1 Dealer / Customer (SRS 4.1, 8.2): see §1 above
Scoped tiles (Total, Open, In Progress, Closed), status chips, recently updated, awaiting your response, feedback pending, pending order cases, cases by type, Create Case / My Cases. **Never** show staff names, levels, other dealers, regions or SLA colours.

### 2.2 Support desk: EGP Support N/E/W/S/C, Poorti Support 1, callcenter-agent (SRS 4.3, 7.2, 7.15, 8.2(7, 10))
*Mobile access for support users needs VECV approval (4.3).*

| Section | Content | From the portal | SRS extra (not in the portal) |
|---|---|---|---|
| My queue tiles | Open · New (unpicked) · Re-Open · Hold · Escalated, scoped to the desk's regions and case-type family | Status tiles + Open definition | — |
| SLA strip | Within SLA / Crossed SLA, and B 0–24 h · Y 25–48 h · R >48 h | Case-type table `opensla` / `clossedsla`, Responsibility table (dead today) | SLA display needs VECV confirmation (10.4); 48 h per level |
| Ageing | 0–2 / 3–10 / 11–15 / 16–30 / >30 days for open cases, as a stacked bar | Ageing by case type (dead today) | — |
| Level-wise open | L1–L4 counts (internal, so allowed here) | Level Wise tiles | — |
| By case type | Cards: open / closed / % closure / re-open | Case-type table | — |
| **Awaiting dealer response** | Cases waiting on the creator | — | 7.2(6), depends on FLOW-02 |
| **Pending SAP/backend update** | Count | — | 7.2(8) |
| **Closure review** | Closure-eligible count | — | 8.2(10), 7.15(8), if approved |
| **Desk workload** | Open per desk, for leads only | Responsibility table (shows a person per type, not workload) | 7.2(11), 8.2(7) |
| Recently updated | Last 5 | — | 8.2(2) |

### 2.3 Management: Business Head, SPOC, CSM, ASM/RSM, WM, PM, APM, channel_partner_feedback (SRS 4.5, 5.7)
This is closest to today's portal page, but **scoped to the user's hierarchy, dealers and region**. Today a CSM sees the whole system.

| Section | Content | From the portal | SRS 4.5 extra |
|---|---|---|---|
| Filters | Period chips, Region, Dealer type (cleaned list), Dealer (within scope) | Filter bar | 5.7 hierarchy scoping |
| Case summary | Total Logged · Resolved · Open · **% closure** · Avg Closure Time | Cases Insights (+ % closure from the table) | 4.5(1) |
| Status-wise | Horizontal bar or chips: New / Assigned / In Progress / Hold / Escalated / Re-Open / Closed | Case Count By Status | 4.5(3) |
| Category-wise | Top case types with open/closed bar, re-open % | Case-type table | 4.5(2) |
| Top dealers | Top 10 within scope, bar list | Top 10 Dealer | — |
| Region contribution | Bars **with counts** | Top Region (counts missing today) | — |
| SLA & ageing summary | Within/crossed SLA, ageing buckets, B/Y/R | Ageing + Responsibility (dead today) | 4.5(5) |
| Support desk workload | Open per desk/level | Responsibility, Level Wise | 4.5(7) |
| **Pending order cases** | Order Status + Order Cancellation open, with "Last refreshed" | Derivable from the case-type table | 4.5(4) |
| **Feedback / rating summary** | Avg rating, distribution, feedback pending | — | 4.5(6), FEEDBACK-* |
| **Closure summary** | Closed in period, within/past SLA, re-opened | Closed columns (off-screen on the portal) | 4.5(8) |
| **Integration failure / exception summary** | SAP/logistics fetch failures | — | 4.5(9) |

### 2.4 Admin (SRS 4.4)
The portal admin home shows only **Total Users** and **Total Dealers**; at `/dashboard` admin gets the same global view as everyone else. SRS 4.4 lists admin work as **configuration** (masters, mappings, SLA, templates), which stays on the web portal. For mobile, an admin sees **the management dashboard (2.3), unscoped**, plus the workbench counts from SRS 7.15 if VECV approves: **unassigned cases, cases per desk, old/pending cases, closure-eligible cases**. No configuration screens on mobile.

## 3. Open questions added by this capture
1. Production login for **Business Head** (`ryjujara` is rejected). Which management account should be used?
2. Is the global dashboard intended for dealers and CSMs? It conflicts with SRS 4.2 / 5.1.
3. What is **Pre-Close** (it counts as Resolved) and when is it used?
4. Open tile = Assigned only, but its link = all non-closed. Which one is the official KPI?
5. Should status counts follow the selected period (the tiles seem to) or be all-time (the links are)?
6. SLA, ageing and B/Y/R widgets are all 0 on production. Is the SLA job running? Mobile can't show SLA until it is.
7. The "Switch To Case Management" form embeds a shared password in every page (security).
