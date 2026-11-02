// Per-build settings. Everything here ships inside the app bundle, so never put secrets in this file.
// TODO(api-contract): replace with the confirmed PQMP mobile API endpoints once known.
const ENV = {
  development: {
    apiBaseUrl: 'https://pqmp-uat.example.vecv.in/api/mobile/v1',
    // Existing web portal; used for flows the app hands off to it (password reset).
    portalBaseUrl: 'https://eicheregpqa.vecv.net',
    // MOCK API: answer every call from src/mock until the backend exists. Delete with src/mock.
    useMockApi: true,
  },
  production: {
    apiBaseUrl: 'https://pqmp.example.vecv.in/api/mobile/v1',
    portalBaseUrl: 'https://eicheregp.vecv.net',
    useMockApi: false,
  },
} as const;

export const env = __DEV__ ? ENV.development : ENV.production;
