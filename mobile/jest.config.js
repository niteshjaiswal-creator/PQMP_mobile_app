module.exports = {
  preset: '@react-native/jest-preset',
  testPathIgnorePatterns: ['/node_modules/', '/.maestro/'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-documents|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-svg|react-native-keychain|react-native-image-picker)/)',
  ],
};
