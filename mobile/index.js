/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { env } from './src/config/env';

// MOCK API: development-only in-memory backend (src/mock/README.md). Delete this block with src/mock.
if (__DEV__ && env.useMockApi) {
  require('./src/mock').installMockApi();
}

AppRegistry.registerComponent(appName, () => App);
