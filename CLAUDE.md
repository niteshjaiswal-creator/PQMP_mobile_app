# PQMP Case Tracking Mobile App (VECV)

This is an Android/iOS app where dealers and customers create PQMP/EGP support cases and track them: status, timeline, order and part-wise delivery, consignment, attachments, comments, notifications and feedback. It's built with **bare React Native 0.88** (React Native CLI, TypeScript, New Architecture), not Expo. The team chose this on 2026-10-27.

Read `analysis/development-plan.md` first. The SRS is the only scope baseline; the plan lists what is in and out of scope, the role-by-role build order and open questions. The final design is the [PQMP Final Design](https://claude.ai/artifact/1T8x56Zb5WN8ZnnyeRs5bH) canvas (source in `analysis/design/`). The API contract is `analysis/api/mobile-api-spec.md`.

## Layout

| Path | What |
|---|---|
| `docs/` | Source requirement documents: task list `.xlsx` and solution document `.pdf`. Read-only. |
| `analysis/requirements.json`, `srs-sections.json` | Generated from `docs/` by `npm --prefix tools/pqmp-mcp run import-docs`. Don't hand-edit. |
| `analysis/traceability.json` | Requirement → status/code/tests/questions. Written via the `update_traceability` MCP tool. |
| `analysis/modules/` | Per-module implementation specs (from `/analyze-requirements`). |
| `analysis/portal/` | Web-portal analysis: screens, masters, API contracts (from `/analyze-portal`). |
| `analysis/test-reports/` | Test run reports (from `/test-mobile`). |
| `mobile/` | The React Native app. `android/` and `ios/` are committed native projects and may be edited. |
| `analysis/development-plan.md` | Scope (SRS only), build order per role, open questions. |
| `analysis/design/` | Source of the final design canvas (shared `app.css` + one `.dc.html` per screen). |
| `analysis/api/mobile-api-spec.md` | API contract for all roles. |
| `mobile/src/api/` | Typed client, one function per endpoint: `import { api } from '../api'`. |
| `mobile/src/mock/` | In-memory mock backend until the real API exists. All test data in `data.ts`. Removal steps in its README. |
| `mobile/src/config/env.ts` | API base URL, `useMockApi`, per-build settings. No secrets. |
| `mobile/src/domain/` | SRS business rules as pure, tested functions. Use them; don't re-implement in screens. |
| `mobile/.maestro/` | E2E flows. |
| `tools/pqmp-mcp/` | Custom MCP server (`pqmp-requirements`). |

## MCP servers (`.mcp.json`)

- **pqmp-requirements**: `list_requirements`, `get_requirement`, `search_srs`, `get_srs_section`, `update_traceability`, `coverage_report`, `list_portal_analysis`.
- **playwright**: browser for analysing the existing web portal. Its persistent profile in `.playwright-profile/` keeps the login.
- **mobile**: drives the Android emulator or iOS simulator for exploratory testing.

## Workflow

1. `/analyze-portal <module>`: capture how the existing portal does it, including API contracts. Existing portal behaviour is the baseline (SRS 1.5(8)).
2. `/analyze-requirements <PREFIX>`: produces the module spec with acceptance criteria and open questions.
3. `/build-feature <PREFIX or IDs>`: implementation, tests, then traceability set to `implemented`.
4. `/test-mobile <PREFIX>`: unit, Maestro and on-device exploratory testing, then a report and traceability set to `tested`.

`coverage_report` gives overall progress at any time.

Requirement ID prefixes:

| Prefix | Area |
|---|---|
| AUTH | Login and access |
| DASH | Dashboard |
| CREATE | Case creation |
| LIST | My Cases / case listing |
| DETAIL | Case detail and tracking |
| FLOW | Workflow and SLA |
| ORDER | Order status |
| PART | Part-wise status |
| SCAN | Invoice/barcode scan |
| CONSIGN | Consignment tracking |
| ATTACH | Attachments and comments |
| NOTIF | Notifications |
| FEEDBACK | Customer feedback |
| DATA | Data display and errors |
| PROFILE | Profile |
| ALERT | Alerts |

Rows with `source: prototype` need VECV approval before they're built.

## Commands (run in `mobile/`)

```
npm start                # Metro bundler
npm run android          # Gradle debug build, install on emulator/device
npm test                 # jest (react-native preset)
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run test:e2e         # maestro test .maestro
```

iOS (`npm run ios`, after `cd ios && pod install`) needs a Mac with Xcode; this dev machine is Windows.

## Library choices

Check New Architecture support before adding anything else.

| Need | Library |
|---|---|
| Navigation | `@react-navigation/native` + `native-stack` + `bottom-tabs` |
| Token storage (AUTH-03) | `react-native-keychain` |
| Barcode/QR scan (SCAN-*) | `react-native-vision-camera` (code scanner) |
| Push notifications (NOTIF-*) | `@react-native-firebase/messaging` |
| Attachments (ATTACH-*) | `@react-native-documents/picker` + `react-native-image-picker` |

## Non-negotiable app rules (from the SRS)

- Render backend values only through `src/domain/display.ts`. Never show null/blank, `0000-00-00`, technical codes or raw API errors (9.3, 11.9).
- Show a "Last refreshed" timestamp wherever order, part or tracking data appears.
- Customers see one support identity via `customerFacingOwner()`, never internal EGP desk names (4.2).
- Derive part status from quantities with `derivePartStatus()` (9.2).
- If an order, part or consignment section fails, the rest of the case detail still renders (11.9.1).
- Preserve form input when submission fails.
- Give every interactive or asserted element `testID="<screen>.<element>"`.

## Safety

- Analyse only the UAT portal.
- Never type or store portal credentials; the user logs in manually in the Playwright window.
- Never create, modify or close real cases without explicit approval for that action.
- Redact tokens and personal data in everything written to `analysis/`.
