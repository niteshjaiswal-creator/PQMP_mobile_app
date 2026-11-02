// Development-only mock backend. Installed from index.js when env.useMockApi is true.
// Remove it by deleting this folder and the marked lines in index.js and src/config/env.ts.
import { configureApi } from '../api/client';
import { handle, resetMockDb } from './server';

export { resetMockDb };

/** Route every API call to the in-memory mock. `delayMs` simulates network latency. */
export function installMockApi({ delayMs = 400 }: { delayMs?: number } = {}) {
  configureApi({
    transport: async req => {
      if (delayMs > 0) await new Promise<void>(resolve => setTimeout(resolve, delayMs));
      return handle(req);
    },
  });
}
