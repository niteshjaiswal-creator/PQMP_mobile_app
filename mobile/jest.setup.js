/* eslint-env jest */
// Native modules have no JS implementation under Jest; these stand-ins keep component tests in JS.

// In-memory keychain so session persistence can be tested.
jest.mock('react-native-keychain', () => {
  let store = {};
  return {
    setGenericPassword: jest.fn(async (username, password, opts = {}) => {
      store[opts.service ?? 'default'] = { username, password };
      return true;
    }),
    getGenericPassword: jest.fn(async (opts = {}) => store[opts.service ?? 'default'] ?? false),
    resetGenericPassword: jest.fn(async (opts = {}) => {
      delete store[opts.service ?? 'default'];
      return true;
    }),
    __reset: () => {
      store = {};
    },
  };
});

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(async () => ({ didCancel: true })),
  launchImageLibrary: jest.fn(async () => ({ didCancel: true })),
}));

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(async () => []),
  types: { pdf: 'application/pdf', images: 'image/*' },
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: () => false,
}));
