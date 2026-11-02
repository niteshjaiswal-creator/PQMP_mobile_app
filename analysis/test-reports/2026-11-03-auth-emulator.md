# Test report: sign-in on the Android emulator (mock API)

Date: 2026-11-03. Device: Pixel 8 Pro emulator, Android 14 (API 34). Build: debug, Metro, `useMockApi: true` (`mobile/src/mock`). No portal or real case was touched.

## Scope

Sign-in is the only screen built so far. Every other requirement has an API client, mock and contract test but no screen (see `docs/Nitesh_Task_Lists.md` and `analysis/development-plan.md`), so only AUTH rows could be verified live.

## Automated checks

| Check | Result |
|---|---|
| `npm test` | 10 suites, 96 tests passed (includes `src/api/api.test.ts`: every endpoint per role against the mock) |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass, no warnings |

## Live tests

| # | Steps | Expected | Result | Req |
|---|---|---|---|---|
| 1 | Tap Sign in with both fields empty | "Enter your User ID." and "Enter your password." under the fields; no request sent | Pass | AUTH-04 |
| 2 | User ID `dealer`, password `wrong`, Sign in | Banner "The User ID or password is incorrect. Please try again." No technical detail | Pass | AUTH-04 |
| 3 | User ID `inactive`, Sign in | Banner "Your account is inactive or not authorised for this app. Please contact your VECV administrator." | Pass (`screens/auth-inactive.png`) | AUTH-02 |
| 4 | User ID `dealer`, valid password, Sign in | Signed in; placeholder shows "Signed in as Shree Motors" (name from `/auth/login` response) | Pass (`screens/auth-dealer-signed-in.png`) | AUTH-01 |
| 5 | Logcat (`ReactNativeJS`, `AndroidRuntime`) during the run | No errors or warnings | Pass | |

## Issues found

None in the app. Two notes:

- Error text under the fields and the banner disappear as soon as the user edits, which moves the Sign in button. This is expected behaviour, but automated taps by coordinates miss after it; Maestro flows should tap by `testID` (`login.submit`).
- After sign-in the app shows a placeholder. Sign out, session storage and expiry (AUTH-03) are not built yet; they are Phase 0 in the plan.

## Not tested

Everything except sign-in: no screens exist yet. `mobile/.maestro/login.yaml` was not run (Maestro CLI not used in this session).
