// Development-only mock backend. Installed from index.js when env.useMockApi is true.
// Remove it by deleting this folder and the marked lines in index.js and src/config/env.ts.
import { NativeModules } from 'react-native';
import { configureApi } from '../api/client';
import { handle, resetMockDb, setMockFileOrigin } from './server';

export { resetMockDb };

/** Dev server origin the bundle was loaded from, e.g. http://10.0.2.2:8081. */
function devServerOrigin(): string | null {
  const url: unknown = NativeModules.SourceCode?.getConstants?.().scriptURL ?? NativeModules.SourceCode?.scriptURL;
  const m = typeof url === 'string' ? /^https?:\/\/[^/]+/.exec(url) : null;
  return m ? m[0] : null;
}

let reach = { at: 0, ok: true };

/**
 * The mock answers in-process, so it would keep working in airplane mode. To let testers check the
 * offline handling (DATA-*, SRS 11.9), a call fails like a real network error when the device
 * cannot reach the dev server. The result is cached for 3 s.
 */
async function deviceOnline(): Promise<boolean> {
  const origin = devServerOrigin();
  if (!origin) return true;
  if (Date.now() - reach.at < 3000) return reach.ok;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    await fetch(`${origin}/status`, { signal: controller.signal });
    reach = { at: Date.now(), ok: true };
  } catch {
    reach = { at: Date.now(), ok: false };
  } finally {
    clearTimeout(timer);
  }
  return reach.ok;
}

/**
 * Route every API call to the in-memory mock. `delayMs` simulates network latency. `offlineCheck`
 * (on by default in the app, off when `delayMs` is 0 as in tests) makes calls fail while offline.
 */
export function installMockApi({ delayMs = 400, offlineCheck = delayMs > 0 }: { delayMs?: number; offlineCheck?: boolean } = {}) {
  // Attachment downloads open sample files from the dev server (DETAIL-08, ATTACH-02).
  setMockFileOrigin(devServerOrigin());
  configureApi({
    transport: async req => {
      if (offlineCheck && !(await deviceOnline())) throw new TypeError('Network request failed');
      if (delayMs > 0) await new Promise<void>(resolve => setTimeout(resolve, delayMs));
      return handle(req);
    },
  });
}
