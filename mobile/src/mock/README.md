# Mock API (development and tests only)

The backend API isn't built yet. This folder answers every call in
`analysis/api/mobile-api-spec.md` from in-memory data, so the app works end to end today.

| File | What |
|---|---|
| `data.ts` | **All** test data: users, dealers, desks, masters, lookups, cases, notifications. Edit here. |
| `server.ts` | Routes and rules (role scope, support identity, validation). No data. |
| `index.ts` | `installMockApi()` swaps the API client's transport for `server.ts`. |

Screens and `src/api/*` don't know the mock exists. They call the same functions either way.

## Sign in

Any password works, except `wrong` (returns "incorrect password").

| User ID | Role | Sees |
|---|---|---|
| `dealer` | Dealer, Shree Motors (1S1148) | Own dealer's cases |
| `dealer2` | Dealer, Balaji Auto (1S2231) | Own dealer's cases |
| `desk` | Support Desk 1 | Cases assigned to Desk 1 |
| `admin` | Admin | All cases, assign and transfer |
| `mgmt` | Management | Reports, all cases read-only |
| `inactive` | none | Blocked-account message |

## Test triggers

| Do this | To see |
|---|---|
| Look up SO `4100231876` or invoice `9012345678` | Found reference with 3 parts (scan review) |
| Look up any all-zero number, e.g. `0000000000` | SAP unavailable (503) fallback |
| Create a case with description `FAIL` | Case creation failure; form input must be kept (CREATE-13) |
| Open `DRLR261022106911` | Order section unavailable while the rest of the case loads |
| Open `EUR261024106958` | Partial delivery, invalid invoice date (`0000-00-00`), one tracking feed down |
| Open `PD261015106702` as `dealer` | Closed case, feedback pending, reopen allowed |
| Turn on airplane mode (emulator) | Every call fails as offline, because the device can't reach the Metro dev server. Turn it off and tap Try again |

## Switch it on or off

`src/config/env.ts` → `useMockApi`. It is only read when `__DEV__` is true, so release builds never include the mock.

## Remove it when the real API is live

1. Delete `src/mock/`.
2. In `index.js`, delete the block marked `MOCK API`.
3. In `src/config/env.ts`, delete `useMockApi`.
4. Tests that call `installMockApi` live in `src/api/api.test.ts`; delete that file or point it at a test server.
