# Phase 1 role-by-role portal analysis
Captured: 2026-10-29 (UAT `eicheregpqa.vecv.net`, read-only). Method: logged in as one active user per Phase 1 role, walked `/case`, `/case/create`, `/case/{id}/edit`, `/report` and the other menu pages. No case was created, edited, escalated or closed. User list: [users-by-role.md](users-by-role.md). Admin/config side: [roles-and-access.md](roles-and-access.md).

> **Safety note.** Two things surfaced that the mobile team must know:
> 1. **`eicheruptime.vecv.net`** — the dealer login shows a "Switch To Case Management" button posting to `GET https://eicheruptime.vecv.net/switch-login`. There's a sister "Uptime" app with SSO between them.
> 2. **`eicheregp.vecv.net` (production).** During the role logins the browser page once ended up on `https://eicheregp.vecv.net/dashboard`, the **production** host. **Which login caused it isn't known.** The Business Head (`ryjujara`) login was flagged by my redirect guard, but that guard also fires on same-host redirects, so it doesn't prove Business Head goes to production. Nothing was done on production. Treat `eicheregp.vecv.net` (no `qa`) as out of bounds.
>
> **Security finding (report to VECV).** A dealer session (C157, fresh login after a confirmed logout) got HTTP 200 from `/admin` and from the `/admin/users` JSON (all 2,381 user rows, including emails and mobile numbers). Logged out, the same request returns 401. So the admin area checks only that someone is logged in, not their role. Testing stopped there; no other admin endpoint was tried as a dealer. Every role can also open `/report` (all 1,179 dealers in the filter), `/buybacks`, `/higherassembly` and `/normscaseclose` by URL, even when the menu shows only Cases.

## What every role shares
- **Landing page is `/case`** for all roles (the desk-style case list). There's no separate dealer home; the dealer sees the same `/case` screen.
- **`/dashboard` returns HTTP 500 for every role** (AUTH→DASH). The dashboard KPIs (DASH-01…04) have no working portal source; `/report` is the only counts source.
- **Create Case is available to every role**, dealer included, with the same 7 case types (Logistics Support, Order Cancellation, Order Status, Packaging, Part Pricing and Strategy, Perpetual Inventory, Project Poorti).
- **Case detail is the same editable desk form for every role** (`/case/{id}/edit`): tabs Case Details / Attachments / Remarks Log / Case History, a `POST /update-technical` submit, attachment add, EDA import. **The portal never renders a read-only view** — not even for a dealer on a closed case. The mobile app must build the read-only tracking view itself (DETAIL-*).
- **The assigned-user filter (`assign_to[]`) is empty (0 options) for every role**, including the desk. The dealer filter always has 1,178 options regardless of role.

## Per-role findings
Scope is reported as **closed-case pages** (≈15 rows/page; the whole system is 5,620 closed pages) — a quick proxy for how many cases the role can see.

| Role (user) | Lands | Case scope (closed pages) | Sees ALL? | Export | Detail: "Case Assigned To" shown | Detail actions | Notes |
|---|---|---|---|---|---|---|---|
| **dealer** (C157) | /case | 14 | No — own/dealer only | No | **Yes (shows "EGP Support-1")** | Submit, Export, Import, +Switch-to-Uptime | "No cases created" when none; has `switch-login` to Uptime |
| **callcenter-agent** (egpsupportdesk1) | /case | 5,620 | **Yes (all)** | Yes | Yes | Escalate, Submit, Add, Import | The QA login used earlier; global desk |
| **EGP Support N/E/W** (egp_support1) | /case | 1,551 | Regional subset | Yes | Yes | Escalate, Submit, Add, Import | L1 owner, regions N/E/W |
| **EGP Support S/C** (egp_support3) | /case | 1,158 | Regional subset | Yes | Yes | Escalate, Submit, Add, Import | L1 owner, regions S/C |
| **Poorti Support 1** (poortihelpdesk) | /case | 5,620 | **Yes (all)** | No | Yes | Submit, Add, Import (no Escalate on sample) | L1 owner for PQMP/Poorti types |
| **csm** (asharma100) | /case | 277 | No — dealer-scoped | No | Yes | Escalate, Submit, Import | Approval role on create |
| **asm → rsm** (rmiyer) | /case | 444 | No — scoped | No | Yes | Submit, Import (no Escalate on sample) | One username, two roles/IDs |
| **wm** (adas3) | /case | 28 | No — small scope | No | Yes | Escalate, Submit, Import | Dealer workshop manager |
| **channel_partner_feedback** (sjain19) | /case | 2,577 | Broad | No | Yes | Submit, Add, Import | User also holds EGP Escalation 2 |
| **PM** (prayag.eicher) | /case | 11 | No — tiny scope | No | No on sample | Submit, Import | Closed-only sample |
| **SPOC** (mawasthi1) | /case | 5,620 | **Yes (all)** | No | Yes | Submit, Add, Import | Global visibility |
| **apm** (mrkanth) | /case | 50 | No — scoped | No | Yes | Submit, Import | |
| **Business Head** (ryjujara) | — | — | — | — | — | — | Login returned a redirect my guard couldn't classify; not walked. Retry in the visible browser |

## What this means for the mobile app (Phase 1)

1. **Data scoping (SRS 5.1) is real and role-dependent, and it must come from the backend.**
   - *Scoped* roles (see only own/mapped dealers): dealer, csm, asm, rsm, wm, pm, apm. These match SRS 5.1 and map cleanly to the dealer/customer + field-approver personas.
   - *Global* roles (see every case): callcenter-agent, Poorti Support 1, SPOC — and the regional EGP Support desks see a large regional slice. These are internal back-office roles.
   - The mobile app can't compute scope on the client. The mobile API must return each user's role(s) + mapped dealer codes and filter server-side (SRS 5.8).

2. **DETAIL-04 conflict confirmed end-to-end.** Even logged in **as a dealer**, the portal's case detail shows **"Case Assigned To EGP Support-1"** — the internal desk name. SRS 4.2 requires customers to see one generic support identity. The mobile app must apply `customerFacingOwner()` and never surface the desk label the portal exposes here.

3. **No read-only / customer view exists.** Every role, including the dealer, gets the full editable desk form with a Submit. The mobile dealer/customer experience (summary + timeline + order/part tracking, no desk fields) has to be built from scratch; there's no portal screen to mirror for it.

4. **Escalation is desk-only and Phase 2.** The Escalate action (`POST /case-escalate`) appeared for some roles on the sampled cases and not others. Only one case per role was sampled, so it's not known whether this depends on role or on case ownership. Escalation integration is Phase 2 (SRS 7.2, 20.6); keep it out of the Phase 1 mobile scope.

5. **Dashboard has no backend.** `/dashboard` is 500 for everyone, so DASH KPIs must be built fresh on the mobile API (counts can be derived the way `/report` does). Don't plan to reuse a portal dashboard endpoint.

6. **One login, several roles.** `rmiyer` (asm + rsm), `sjain19` (feedback + escalation), `egp_support1` (N+E+W). The mobile session model must handle multi-role users — a role switcher or the union of scopes (open question on LIST-09).

## Coverage of the 55 populated roles
Phase 1 personas (dealer, callcenter desk, EGP Support L1 ×2, Poorti L1, csm, asm/rsm, wm, feedback, pm, spoc, apm) were walked live. The remaining ~43 roles are escalation levels L2–L5, or belong to out-of-scope modules (BuyBack, Higher Assembly, Packaging, Execution, Claim, VEPDC, Finance). Their portal screens (`/buybacks`, `/higherassembly`) are reachable but outside the mobile scope; they aren't walked here. Business Head couldn't be analysed on UAT (production redirect). See the full role inventory and user picks in [users-by-role.md](users-by-role.md).
