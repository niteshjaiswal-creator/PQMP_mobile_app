# Dealer dashboard
URL: `/dashboard` (portal, broken)   Captured: 2026-10-29 (UAT, read-only)   Requirement IDs: DASH-01…04 (DASH-05…09 are prototype-only)
Screenshot: [screens/dealer-landing.png](screens/dealer-landing.png) (dealer C157 after login)
Logins used: dealer `C157` (0 open / 202 closed) and dealer `8041` (17 open / 623 closed, chosen because it has a mix of statuses). See [users-by-role.md](users-by-role.md).

## 0. The existing portal dashboard (production, seen as a dealer)
Seen 2026-10-29 at `eicheregp.vecv.net/dashboard`, which the user had opened, logged in as dealer **C157** (display name "VECV"). Read-only, with the user's explicit go-ahead: nothing was clicked or filtered. Only aggregate numbers are recorded here. The screenshot was deleted because it contained staff and dealer names. **On UAT the same page returns HTTP 500**, so this is the only working copy.

**Layout, top to bottom:**

| Widget | Content (as shown to the dealer) |
|---|---|
| Filter bar | Date From / Date To (default **01-10-2026 → 29-10-2026**, i.e. month to date), Dealer Type, By Region, Reset, Apply → `POST /dashboard` (server-rendered; no JSON endpoint) |
| **Cases Insights** tiles | Total Logged **1,596** · No of cases Resolved **1,356** · No of cases Open **182** · Average Closure Time **327:18** (format unlabelled, probably hh:mm, about 13.6 days) · Average Hold Time **0** |
| Case-type table | Per case type (14 rows, including Buyback and Non Transit Claim Settlement): All cases · Open (Total, At Level 1–4, within SLA, crossed SLA) · Closed (Total, % closure, closed within SLA …). Open cases: Order Status 85, Project Poorti 91, Order Cancellation 5, Packaging 1 |
| **Top 10 Dealer** | Ten **other dealers' names** with case counts (35 → 18) |
| Top Region Contributing | Central, South 1–2, North 1–2, East 1–2, West. The counts are unreadable (blue text on a blue tile) |
| Level Wise Open Cases | L1–L4. Numbers clipped or unreadable (L1 shows "18", probably 182 cut off) |
| Ageing by case type | 0–2 / 3–10 / 11–15 / 16–30 / >30 days × case type. **All zeros** although 182 cases are open |
| Ageing by channel-partner type | Dealer, Distributors, Site support, COCO, Distributor, KAM, Site, Export, "-", Test, Container Setup, Non Auto. **All zeros.** The master has duplicates ("Distributors"/"Distributor") and junk values ("-", "Test") |
| Responsibility / SLA | Case type → **named internal staff member** → Open count → SLA buckets B (0–24 h), Y (25–48 h), R (>48 h). **All zeros** |
| **Case Count By Status: Total 1,623** | New 48 · Assigned 117 · Hold 0 · Resume 0 · Escalated 0 · Closed 1,381 · Re-open 0, plus a "View Details" link. **No In Progress or Re-Assigned tile** |

**What this means:**
1. **It is not a dealer dashboard.** One dealer sees system-wide figures: a Top 10 of other dealers, regions, channel-partner types, and named staff in the Responsibility table. C157 has 202 cases in total on UAT, while this shows 1,596 logged in a single month. This **breaks SRS 5.1 (scope) and 4.2 (no internal names)** and should be raised with VECV as a production data-exposure issue.
2. **The numbers don't reconcile.** Three different totals appear (1,596 / 1,623 / 1,546 for the status tiles). Open + Resolved = 1,538, which is 58 short of Total Logged. Several case-type rows have All ≠ Open + Closed (Order Status 787 vs 750; Part Pricing, Logistics and Perpetual Inventory 12 cases counted in neither). Resolved 1,356 ≠ Closed tile 1,381. The missing In Progress / Re-Assigned tiles probably account for some of the gap. **Mobile must not copy these formulas without VECV defining them.**
3. **SLA and ageing widgets are dead.** Every SLA and ageing cell is 0.
4. **The KPIs it does define are the SRS 1.5(8) baseline:** Total Logged, Resolved, Open, Average Closure Time, Average Hold Time, counts by status, and a default period of month to date. The mobile dealer dashboard should use these labels and definitions, scoped to the dealer, rather than invent new ones (see §3).

## 1. What the UAT portal gives a dealer today
- **No working dashboard on UAT.** The Dashboard menu item goes to `/dashboard`, which returns **HTTP 500** for every role. The shared page scripts (`case.js`, `custom.js`, `tileJs.js`) contain **no dashboard or count endpoint**. The production dashboard (§0) is server-rendered from `POST /dashboard`, so there is still **no API to reuse**.
- **The dealer lands on `/case`,** the same desk-style list ("Parts Query Management Portal"), filtered to **Open** by default. With no open cases it shows only "No cases created", even when the dealer has 202 closed cases. That message is misleading.
- **The dealer's top menu is the desk menu:** Dashboard, Cases, Case Reports, BuyBack, Buyback Reports, Higher Assembly, **EGP Support Desk Today** (the internal shift roster with desk staff names, which conflicts with SRS 4.2), plus "Switch To Case Management" (`eicheruptime.vecv.net`).
- **The only aggregate view is `/report`** (6 tabular reports, e.g. "All Sub Type Case Status Counts"). Whether reports are scoped to the dealer was **not verified**. The dealer's report filter lists all 1,179 dealers.
- **Scoping works on the list.** A dealer's `/case` shows only their own cases (SRS 5.1). The same list can be filtered by `status[]`, `type[]`, `case_level[]` and date, so DASH-04 drill-down maps onto existing filters.

## 2. Real numbers (UAT, 2026-10-29)
Checks the KPI definitions against real data before building.

| | Dealer 8041 | Whole system (desk view) |
|---|---|---|
| Total cases | 640 | (5,620 closed pages × 15 + open) |
| Open (portal meaning: not closed) | 17 | 522 |
| … by status | Assigned 14 · Re-Open 2 · Escalated 1 | Assigned 401 · In Progress 113 · Re-Open 5 · Escalated 3 |
| … by level | L1 16 · L3 1 | |
| … by type | Packaging 16 · Project Poorti 1 | |
| Order-related open (Order Status / Order Cancellation) | 0 | |
| Closed | 623 | |
| Updated in last 7 / 30 days | 0 / 0 (latest update 29 Jun 2026) | |
| Age of open cases | 169 – 1,821 days (median 1,138); all 17 untouched for 90+ days | |

**Statuses that actually occur:** Assigned, In Progress, Re-Open, Escalated and Close. **New, Hold, Resume and Re-Assigned don't occur in current UAT data.**

**Data quality:**
- **UAT open cases for dealers are years old and inactive.** "Recently updated" is 0 for this dealer. Dashboard testing needs fresh cases, which means creating test cases on UAT and **requires explicit approval**.
- **The portal's "Time Elapsed" is not case age.** A 553-day-old open case shows `5 Hr(s), 52 Min(s)`; it looks like working/SLA time on the current level. **Don't show it as age** on the dashboard. Compute age from `createdAt`.
- One case number is truncated in the list (`#DRLR26102610695` for id 106957). Use the backend case number, never the portal's display string.

## 3. KPI definitions: decision needed
SRS 7.2 / DASH-01 asks for **Total, Open, In Progress, Closed**. The portal's only grouping is **Open (every non-closed status) vs Close**. The app's current `statusBucket()` puts `assigned` under *in-progress* and only `new`/`reopened` under *open*. With UAT data that gives:

| Definition | Dealer 8041 | System |
|---|---|---|
| **A. Current code** (`statusBucket`): Open = New, Re-Open · In Progress = everything else active | Open **2** · In Progress **15** · Closed 623 | Open **5** · In Progress **517** |
| **B. Recommended:** Open = waiting on support to start (New, Assigned, Re-Assigned, Re-Open) · In Progress = being worked (In Progress, Hold, Resume, Escalated) | Open **16** · In Progress **1** · Closed 623 | Open **406** · In Progress **116** |
| **C. Portal-style:** Open = all non-closed · In Progress = subset | Open **17** (In Progress 1 within it) · Closed 623 | Open **522** |

**Recommendation (revised after §0): C, in the portal's own terms.** The production dashboard defines **Open = every non-closed case** and **Resolved = closed**, with a separate count per status. SRS 1.5(8) says existing portal KPIs carry over. So the dealer tiles should be **Total Logged · Open · Resolved**, with a **status breakdown** (New / Assigned / In Progress / Hold / Escalated / Re-Open) instead of a separate "In Progress" tile, plus Average Closure Time if VECV confirms its formula. That still covers DASH-01's "in-progress" figure, as the In Progress status count. Under A, "Open" would read 5 system-wide while the portal says 182–522, which users switching between the two would notice. **Needs VECV confirmation.** If adopted, `statusBucket()` in `mobile/src/domain/case-status.ts` should return `open` for every non-closed status when DASH is built. Option B remains the fallback if VECV wants three tiles that add up to Total.

Also from §0: the dashboard is **period-based** (default month to date), not all-time. The mobile dashboard needs the same period selector, or VECV must decide on all-time.

## 4. Dealer dashboard content (Phase 1)

| SRS / req | Widget | Portal source | Mobile source needed |
|---|---|---|---|
| DASH-01 | Total / Open / In Progress / Closed tiles | None (dashboard 500) | New scoped count API (§5) |
| DASH-01 | Recently updated cases (last N by `updatedAt`) | List has Modified Date per case | Same API, or list sorted by `updatedAt` |
| DASH-02 | Awaiting your response | **None.** The portal has no clarification status (FLOW-02 statuses unapproved) | Depends on FLOW-02 approval; hide the card until it exists |
| DASH-02 | Feedback pending | **None.** No feedback anywhere in the portal | Depends on FEEDBACK-*; hide until it exists |
| DASH-02 | Order / delivery update cards | Per-SAP-document rows on case detail only | Order-related open cases (Order Status / Order Cancellation types) + "Last refreshed" |
| DASH-03 | Quick actions: Create Case, My Cases, Recent Updates | Create Case ✓, Cases list ✓; no "recent updates" view | Navigation only |
| DASH-04 | Tap a tile → filtered My Cases | `/case?status[]=…` | Bucket → status set (definition B above) |

**Hide for dealers:**
- Escalation levels (L1–L5). One dealer case is at L3.
- Desk and assignee names.
- The desk roster.
- The assigned-user filter.
- Time Elapsed.
- All prototype desk analytics (DASH-06…09: Top 10 dealers, dealer volume chart, avg closure/hold time, region/dealer filters). These mean nothing to a single dealer and are not SRS scope.
- DASH-05 (campaign carousel) is prototype-only and needs VECV approval.

**Always show:** a "Last refreshed" timestamp on the dashboard (CLAUDE.md rule for order data; also the honest thing for a cached KPI view), and an empty state that doesn't say "No cases created" to a dealer who has closed cases.

## 5. API the mobile backend must provide (none exists)
`GET /mobile/v1/dashboard` (session-scoped to the dealer's mapped dealer codes, SRS 5.1/5.8):
```json
{
  "asOf": "2026-10-29T10:15:00+05:30",
  "counts": { "total": 640, "open": 16, "inProgress": 1, "closed": 623 },
  "byStatus": { "Assigned": 14, "Re-Open": 2, "Escalated": 1 },
  "orderRelatedOpen": 0,
  "awaitingResponse": null,
  "feedbackPending": null,
  "recentlyUpdated": [ { "caseNumber": "…", "status": "…", "category": "…", "subCategory": "…", "updatedAt": "…" } ]
}
```
`null` = not supported yet (the card is hidden), not zero. Counts must be computed server-side; the client can't page through 600+ cases to count them the way this analysis did.

## 6. Open questions
1. KPI bucket definition: A, B or C (§3)? Recommendation C, matching the portal's Total Logged / Open / Resolved plus a status breakdown.
1a. The production dashboard shows a dealer system-wide data: other dealers' names, regions and named staff (§0). Is that intended? It breaks SRS 5.1 and 4.2.
1b. Its totals don't reconcile (1,596 vs 1,623 vs 1,546; Open + Resolved is 58 short of Total). What are the official formulas for Total Logged, Open, Resolved and Average Closure Time (unit and format of "327:18")?
1c. Default period: month to date (as in the portal) or all-time?
1d. Why does `/dashboard` return 500 on UAT while it works on production?
2. Is "Escalated" shown to dealers as a status, or folded into "In Progress"? SRS 4.2 hides escalation levels, and the status name reveals that an escalation happened.
3. "Recently updated": what window (7 days? last 5 cases?), and what counts as an update (status change only, or any remark)?
4. Who builds the dashboard/count API? The portal has none, and `/dashboard` is broken.
5. May we create a few UAT test cases for a dealer login so the dashboard can be tested with recent activity? This changes UAT data and needs explicit approval.
