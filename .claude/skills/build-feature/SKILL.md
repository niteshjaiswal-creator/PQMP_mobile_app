---
name: build-feature
description: Implement PQMP mobile app requirements (by requirement ID or module prefix) in the bare React Native app under mobile/, with unit, component and Maestro E2E tests, and update traceability. Use when asked to build, implement or continue a screen or feature of the PQMP app.
argument-hint: "<requirement IDs or module prefix, e.g. CREATE-01..05 | LIST>"
---

# Build a feature

## 0. Preconditions

- `analysis/modules/<PREFIX>.md` must exist. If it doesn't, run the analyze-requirements steps for that module first.
- Skip any requirement with status `needs-approval`, and tell the user which ones were skipped.
- If an endpoint is marked "TBD" in the spec, build against a typed function in `src/api/` that the screen depends on. Leave a `// TODO(api-contract): <ID>` comment there, and don't invent a URL silently. Put fixture data in `src/api/fixtures/` so the screen can be developed and tested.

## 1. Load context

- `get_requirement` for each ID, then read the module spec, `analysis/development-plan.md`, the matching boards in `analysis/design/project/`, `analysis/api/mobile-api-spec.md`, and the portal notes it links.
- This is a **bare React Native 0.88** app (New Architecture on by default). Before adding a library:
  - Check that it supports the New Architecture and the current RN version (reactnative.directory).
  - Prefer the libraries already chosen in `CLAUDE.md`.
  - Install with `npm install` in `mobile/`.
  - Make any native setup the library's docs require in `android/` (and `ios/`, noting that iOS can't be verified on Windows).
  - Rebuild with `npm run android`.

## 2. Where code goes (`mobile/src/`)

| What | Where |
|---|---|
| Navigators (React Navigation stacks/tabs, route param types) | `navigation/` |
| Screens (thin: data loading + layout) | `screens/<module>/` |
| Feature UI components | `features/<module>/` |
| Shared UI | `components/` |
| API calls, one file per resource | `api/<resource>.ts` using `request()` from `api/client.ts`; types in `api/types.ts` |
| Business rules (pure, no React) | `domain/` |
| Tests | next to the file: `*.test.ts(x)` |
| E2E flows | `mobile/.maestro/<module>/<flow>.yaml` |

## 3. Rules every screen must follow

These come from the SRS and are checked in review and E2E:

- **Backend values go through `domain/display.ts` helpers.** Never render a raw value from an API. Missing data reads as "Not Available", invalid dates as "Awaiting Update", timeouts as "Temporarily Unavailable" (9.3).
- **Errors show `userMessageFor(err)`.** Never show status codes or backend messages (11.9).
- **Order/part/tracking sections show `displayLastRefreshed()`** (9.3.8).
- **Owner/support names go through `customerFacingOwner()`** (4.2).
- **Part status comes from `derivePartStatus()`.** Never from a raw SAP code (9.2).
- **A section failing must not break the screen.** If order, part or consignment data fails, show that section's fallback and keep the case detail visible (11.9.1).
- **Forms preserve user input when submission fails** (CREATE-12). Validate with `domain/case-validation.ts`.
- **States:** every data screen handles loading, empty, error (with retry) and data.
- **testIDs:** every interactive and asserted element gets `testID="<screen>.<element>"`, e.g. `create-case.submit` or `case-detail.status-badge`. Maestro depends on these.
- **Accessibility:** every touchable has an `accessibilityLabel`. Text must scale.

If a rule is missing from `domain/`, add it there with tests first, then use it.

## 4. Tests

- **Unit:** `domain/` and `api/` functions. The header comment lists the requirement IDs and SRS sections covered.
- **Component** (`@testing-library/react-native`): loading, empty, error and data states. Mock `api/*` modules, not `fetch`.
- **E2E (Maestro):** one flow per user journey. Tag each flow with its requirement IDs (`tags: [CREATE-01, CREATE-11]`). Run `common/assert-no-raw-values.yaml` on every screen that shows backend data.

## 5. Verify, then record

Run from `mobile/`. All must pass before you report done:

```
npm run typecheck && npm run lint && npm test
```

Then call `update_traceability` per ID:

- `status: implemented`
- `implementation`: the files you added or changed
- `tests`: the test files and flows
- `openQuestions`: anything deferred

Don't mark anything `tested`; that's `/test-mobile`'s job once it has run on a device.

Report: what was built, the files, the test results, and the TODOs left.
