---
name: test-mobile
description: Test the PQMP mobile app against its requirements - unit/component tests, Maestro E2E flows, and exploratory testing on an Android emulator or iOS simulator through the mobile MCP server - then report results and update traceability. Use when asked to test, verify, QA or regression-check the app or a module.
argument-hint: "[module prefix | requirement IDs | smoke | all]"
---

# Test the mobile app

Scope comes from `$ARGUMENTS`. The default is everything with status `implemented`, found with `list_requirements status=implemented`.

## 1. Static and unit (always)

From `mobile/`:

```
npm run typecheck
npm run lint
npm test -- --coverage
```

If any of these fail, stop and report the failures. Don't run on-device tests against a broken build.

## 2. Get a device running

Android works on this Windows machine.

1. `adb devices`. If nothing is listed:
   - `emulator -list-avds`
   - `emulator -avd <name>`, run in the background
   - wait until `adb shell getprop sys.boot_completed` returns 1
2. Install and launch the debug build from `mobile/`: `npm run android`. This builds with Gradle, installs, and starts Metro.
   - For a release-like check: `cd android && ./gradlew assembleRelease`, then `adb install -r app/build/outputs/apk/release/app-release.apk`.
3. Confirm with the mobile MCP: `mobile_list_available_devices`, then `mobile_take_screenshot`.

iOS can't be built on Windows. Use one of:

- A Mac with Xcode: `cd ios && pod install`, then `npm run ios`.
- A macOS CI runner.
- Run the Maestro flows on Maestro Cloud with an iOS build.

Say which platforms were actually exercised in the report.

## 3. Maestro E2E (repeatable regression)

If `maestro` isn't installed, tell the user how to get it:

- Windows: download the release zip from github.com/mobile-dev-inc/maestro and add its `bin` to PATH.
- Requires Java 17, which is present.

Then skip to step 4.

```
maestro test .maestro --include-tags <IDs or module> --format junit --output ../analysis/test-reports/maestro-<date>.xml
```

## 4. Exploratory testing via mobile MCP

For each requirement in scope, walk the acceptance criteria in `analysis/modules/<PREFIX>.md` on the device:

- Navigate with `mobile_list_elements_on_screen`, then `mobile_click_on_screen_at_coordinates` / `mobile_type_keys` / `mobile_swipe_on_screen`. Prefer the element list over screenshots to find targets.
- After each step, read the element list and assert the expected text and state.
- On every screen with backend data, check the visible text has none of these: `null`, `undefined`, `NaN`, `0000-00-00`, `00.00.0000`, `Invalid Date`, `EGP Desk`, HTTP status codes, or stack-trace text (SRS 9.3, 4.2).
- Exercise negatives:
  - airplane mode / offline (`adb shell cmd connectivity airplane-mode enable`, then restore)
  - empty form submit
  - a closed case (no comment box, reopen needs remarks)
  - a scan failure, which must fall back to manual entry
- Screenshot failures to `analysis/test-reports/screens/<ID>-<step>.png`.
- **Record every manual journey that passed as a new Maestro flow** in `mobile/.maestro/<module>/`. This is how exploratory coverage becomes regression coverage.

Don't create real cases, comments or feedback against a production backend. Use UAT or fixtures.

## 5. Report and trace

Write `analysis/test-reports/<YYYY-MM-DD>-<scope>.md` with these sections:

- Summary: pass/fail counts and platforms
- Per-requirement results table: ID, criteria checked, result, evidence
- Defects: steps, expected vs actual, screenshot, suspected file
- Coverage gaps

Call `update_traceability`:

- `status: tested` only when every acceptance criterion for that ID passed on a device.
- Otherwise keep `implemented` and add the defect to `openQuestions`/`notes`.

End with `coverage_report` and a short summary to the user.
