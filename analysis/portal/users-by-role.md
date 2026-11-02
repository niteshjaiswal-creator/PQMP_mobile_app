# Portal users by role: one active user per role

Source: UAT admin `/admin/users` and `/admin/user-dealer-mapping` (DataTables JSON). Captured: 2026-10-29.
Totals: 2,250 distinct users, 2,381 user-role rows (107 users hold more than one role), 88 roles defined (`/admin/roles`) of which 55 have users, and 20,406 user-dealer mapping rows.

Redaction: only the login username and portal user ID are kept, because they're needed to log in or look the user up again. Full names, emails, mobile numbers and addresses are left out (CLAUDE.md, Safety). **No passwords are stored here or anywhere in `analysis/`.**

How the user was picked: active, with the **most dealer mappings for that role**, so the login will actually show cases. Ties go to the most recently created. Where a `test` account exists it's listed as an alternative.

**Phase 1 relevance**, from SRS 4, 5 and 7.2. Phase 1 = dealer/customer persona + EGP support desk. Escalation-portal integration and approval workflow are Phase 2.
- **P1-core**: the mobile app's primary personas.
- **P1-desk**: support users who work PQMP cases (SRS 4.3, mobile access "if approved").
- **P1-mgmt**: dealer-mapped field or management roles who see dealer cases or approve (CSM/ASM approval field on create).
- **P2**: escalation levels L2–L5 (Phase 2), plus out-of-scope modules: BuyBack, Higher Assembly, Packaging, Execution.

| # | Role | Users (active / inactive) | Picked user ID | Username | Dealer maps (this role) | Also holds | Phase 1 relevance | Alt / note |
|---|---|---|---|---|---|---|---|---|
| 1 | dealer | 1129 / 1 | 2554 | C157 | 12 | | **P1-core** (creator, SRS 4.1) | C157 has 0 open / 202 closed. **For dashboard work use `8041`** (dealer `1S3044`: 17 open incl. Re-Open and Escalated, 623 closed). Dealer usernames are the dealer code. Test: 3211 `abc-test` (0 dealer maps, would see no cases) |
| 2 | callcenter-agent | 7 / 0 | 2638 | ssubramanian | 168 | HA-CIM1 | **P1-core** (creates on dealer's behalf; earlier capture used `egpsupportdesk1`, ID 25, same role) | Alt: 25 `egpsupportdesk1` |
| 3 | EGP Support N | 2 / 0 | 2035 | egp_support1 | 853 | EGP Support E, W | **P1-desk** (L1 for EGP case types, region N/E/W) | |
| 4 | EGP Support E | 2 / 0 | 2035 | egp_support1 | 853 | EGP Support N, W | **P1-desk** | Same user as #3 |
| 5 | EGP Support W | 2 / 0 | 2035 | egp_support1 | 853 | EGP Support N, E | **P1-desk** | Same user as #3 |
| 6 | EGP Support S | 1 / 0 | 2034 | egp_support3 | 336 | EGP Support C | **P1-desk** (L1, region S/C) | |
| 7 | EGP Support C | 1 / 0 | 2034 | egp_support3 | 336 | EGP Support S | **P1-desk** | Same user as #6 |
| 8 | EGP Support Site & COCO | 1 / 0 | 2975 | C257 | 0 | | P1-desk | No dealer mapping |
| 9 | EGP Support Desk | 1 / 0 | 3016 | egpsupportuser | 0 | | P1-desk | Created 2025-10-28, no dealer mapping |
| 10 | Poorti Support 1 | 14 / 0 | 2022 | poortihelpdesk | 853 | | **P1-desk** (L1 for PQMP types: Norms Modification, Order Query, Other Support) | |
| 11 | csm | 302 / 1 | 2655 | asharma100 | 29 | | P1-mgmt (CSM approval on create) | Test: 3212 `test-sipl` |
| 12 | asm | 73 / 1 | 228 | rmiyer | 121 | rsm | P1-mgmt (ASM approval on create) | |
| 13 | rsm | 39 / 0 | 2444 | rmiyer | 122 | | P1-mgmt | Same login name as #12, different ID |
| 14 | wm | 524 / 0 | 1616 | adas3 | 8 | | P1-mgmt (dealer workshop manager) | |
| 15 | PM | 159 / 0 | 2543 | prayag.eicher | 0 | | P1-mgmt | ID 1111 has 339 maps but blank username (data defect) |
| 16 | apm | 1 / 0 | 168 | mrkanth | 37 | | P1-mgmt | |
| 17 | SPOC | 30 / 1 | 2114 | mawasthi1 | 46 | | P1-mgmt | |
| 18 | Business Head | 3 / 0 | 2220 | ryjujara | 71 | | P1-mgmt (analytics) | |
| 19 | channel_partner_feedback | 6 / 0 | 2197 | sjain19 | 853 | EGP Escalation 2 | P1 (feedback, FEEDBACK-*) | |
| 20 | Admin-view-only | 7 / 0 | 1723 | SPD308001 | 0 | PM | Admin (not mobile) | |
| 21 | admin | 1 / 0 | 579 | admin | 0 | | Admin (not mobile) | Lands on `/admin`; also has the case portal |
| 22 | EGP Escalation 1 | 5 / 0 | 2020 | rsharma14 | 853 | channel_partner_feedback | P2 (L2) | |
| 23 | EGP Escalation 2 | 1 / 0 | 2197 | sjain19 | 853 | channel_partner_feedback | P2 (L3) | Same user as #19 |
| 24 | VEPDC Head | 3 / 0 | 2256 | ssaxena6 | 530 | channel_partner_feedback | P2 (L4) | |
| 25 | PC Head | 3 / 1 | 2024 | vkhirwal | 853 | Poorti Support 3 | P2 (L5) | |
| 26 | Poorti Support 2 | 2 / 0 | 2023 | pruthvib | 680 | | P2 (L2 Poorti) | |
| 27 | Poorti Support 3 | 1 / 0 | 2024 | vkhirwal | 853 | PC Head | P2 (L3 Poorti) | |
| 28 | Poorti Support 4 | 1 / 1 | 2389 | rgirdhani | 398 | | P2 (L4 Poorti) | |
| 29 | Order Desck | 1 / 0 | 3011 | (display name used as username) | 0 | | P2 / unclear | Username contains a space |
| 30 | RSMM | 8 / 0 | 1184 | skdas1 | 0 | | Out of scope | |
| 31 | HA-CIM1 | 5 / 0 | 2638 | ssubramanian | 168 | callcenter-agent | Out (Higher Assembly) | |
| 32 | CIM 1 | 1 / 0 | 2382 | zzusingh1 | 6 | | Out (Buyback/HA) | |
| 33 | CIM 2 | 1 / 0 | 2381 | nkumar32 | 7 | | Out (Buyback/HA) | |
| 34 | 3PL Buyback | 2 / 0 | 2026 | 3pl_buyback | 373 | | Out (BuyBack) | |
| 35 | Buyback Support 1 | 1 / 0 | 2027 | nnirala | 853 | | Out (BuyBack L1) | |
| 36 | Buyback Support 2 | 2 / 0 | 2028 | lsharma | 853 | Execution Manager | Out (BuyBack) | |
| 37 | buyback_admin | 1 / 0 | 2609 | adminbuyback | 0 | | Out (BuyBack) | |
| 38 | Packaging Engg 1 | 1 / 0 | 2025 | nbhatt | 853 | | Out (Packaging L1) | |
| 39 | Execution Support | 1 / 0 | 2029 | awkardhekar | 853 | | Out (Packaging/Buyback L2) | |
| 40 | Execution Manager | 2 / 0 | 2028 | lsharma | 853 | Buyback Support 2 | Out | |
| 41 | Execution Head | 1 / 0 | 2258 | vstomar | 0 | | Out | |
| 42 | RDC In charge KOL | 1 / 0 | 2471 | (display name used as username) | 0 | Execution Manager | Out | |
| 43 | OBL 2 | 1 / 0 | 2403 | npiriya | 0 | | Out | |
| 44 | VEPDC Team | 1 / 0 | 3014 | vepdcuser | 0 | | Out / unclear | |
| 45 | vepdc-agent | 2 / 0 | 2525 | vksv | 0 | | Out (legacy) | |
| 46 | vepdc-manager | 1 / 0 | 601 | vepdcmanager | 0 | | Out (legacy) | |
| 47 | FINANCE HQ | 1 / 0 | 3015 | financehq | 0 | | Out | |
| 48 | agm | 2 / 0 | 1126 | pannerselvam | 0 | | Legacy | |
| 49 | Regional Rtex Manager | 2 / 0 | 218 | spant | 0 | rsm | Legacy | |
| 50 | VP | 1 / 0 | 507 | GM804201 | 0 | dealer, SPOC | Legacy | |
| 51 | SA | 4 / 0 | 533 | SERKOL | 0 | dealer | Legacy | |
| 52 | TA | 1 / 0 | 519 | (display name used as username) | 0 | dealer | Legacy | |
| 53 | TE | 1 / 0 | 520 | (display name used as username) | 0 | dealer | Legacy | |
| 54 | FN | 1 / 0 | 538 | SER100006 | 0 | dealer | Legacy | |
| 55 | DOS | 1 / 0 | 539 | (display name used as username) | 0 | dealer, SPOC | Legacy | |
| — | (no role) | 5 / 2 | 3012 | (email used as username) | 0 | | Data defect: users without a role | |

Roles defined but with **no users** (33): super-admin, rpm, technician, RetEx, EGP Escalation 3, EGP Escalation 4, 3PL Dispatch, 3PL In Charge, UGC In charge, Buyer, Group Section Head, Section Head, Procurement Head, OBL 1, OBL 3, OBL 4, Packaging Engg 2, Packaging Engg 3, Claim Support 1, Claim Support 2, Escalation Role, RDC GUR Claim, RDC In charge GUR, RDC BLR Claim, RDC In charge BLR, RDC KOL Claim, PPS 1, PPS 2, PPS 3, Non Auto SPOC 1, Non Auto SPOC 2, CIM 3, HA-CIM2.

## Minimum login set for a Phase 1 walkthrough

One login covers several roles, so 9 logins cover every P1 role:

| Login (username) | Roles covered | Why |
|---|---|---|
| C157 *(or a dealer test account mapped to a dealer)* | dealer | Primary mobile persona |
| egpsupportdesk1 / ssubramanian | callcenter-agent | Desk that raises cases for dealers |
| egp_support1 | EGP Support N/E/W | L1 owner for EGP types |
| egp_support3 | EGP Support S/C | L1, other regions |
| poortihelpdesk | Poorti Support 1 | L1 owner for PQMP types |
| asharma100 *(or `test-sipl`)* | csm | Approval role on create |
| rmiyer | asm + rsm | Field hierarchy view |
| adas3 | wm | Dealer-side workshop user |
| sjain19 | channel_partner_feedback + EGP Escalation 2 | Feedback visibility |

Refresh this list with the `/admin/users` DataTables query in [api-contracts.md](api-contracts.md#admin-users).

## Observed case scope (logged in per role, 2026-10-29)
Closed-case pages seen per role (whole system = 5,620 pages). Full walk-through in [role-analysis-phase1.md](role-analysis-phase1.md).

| Role (user) | Closed pages | Scope |
|---|---|---|
| dealer (C157) | 14 | Own/dealer only ("No cases created" when none) |
| csm (asharma100) | 277 | Dealer-scoped |
| asm→rsm (rmiyer) | 444 | Scoped |
| wm (adas3) | 28 | Small scope |
| PM (prayag.eicher) | 11 | Tiny scope |
| apm (mrkanth) | 50 | Scoped |
| EGP Support S/C (egp_support3) | 1,158 | Regional |
| EGP Support N/E/W (egp_support1) | 1,551 | Regional |
| channel_partner_feedback (sjain19) | 2,577 | Broad |
| callcenter-agent (egpsupportdesk1) | 5,620 | **All cases** |
| Poorti Support 1 (poortihelpdesk) | 5,620 | **All cases** |
| SPOC (mawasthi1) | 5,620 | **All cases** |
| Business Head (ryjujara) | — | Not walked (unclassified login redirect) |

Dealer, csm, asm/rsm, wm, pm, apm honour SRS 5.1 (own/mapped scope). callcenter-agent, Poorti Support 1 and SPOC see every case (global back-office roles).
