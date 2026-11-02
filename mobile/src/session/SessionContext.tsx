// Session (AUTH-01…04, SRS 7.1, 8.1): tokens in the OS keychain, restored on launch,
// refreshed once on 401, and cleared with a business-readable notice when they can't be renewed.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Keychain from 'react-native-keychain';
import { configureApi } from '../api/client';
import { getMe, login, logout, refreshSession } from '../api/auth';
import type { LoginResult, Me } from '../api/types';
import type { LoginInput } from '../domain/login-validation';

const SERVICE = 'com.vecv.pqmp.session';
export const SESSION_EXPIRED = 'Your session has expired. Please log in again.';

type Tokens = { accessToken: string; refreshToken: string };
type State =
  | { status: 'restoring' }
  | { status: 'signedOut'; notice: string | null }
  | { status: 'signedIn'; user: Me };

type Ctx = {
  state: State;
  user: Me | null;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: (notice?: string | null) => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

async function saveTokens(t: Tokens) {
  await Keychain.setGenericPassword('session', JSON.stringify(t), { service: SERVICE });
}
async function loadTokens(): Promise<Tokens | null> {
  try {
    const found = await Keychain.getGenericPassword({ service: SERVICE });
    return found ? (JSON.parse(found.password) as Tokens) : null;
  } catch {
    return null;
  }
}
async function clearTokens() {
  await Keychain.resetGenericPassword({ service: SERVICE }).catch(() => undefined);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ status: 'restoring' });
  const tokens = useRef<Tokens | null>(null);
  const refreshing = useRef<Promise<boolean> | null>(null);

  const signOut = useCallback(async (notice: string | null = null) => {
    const t = tokens.current;
    tokens.current = null;
    if (t) logout(t.refreshToken).catch(() => undefined);
    await clearTokens();
    setState({ status: 'signedOut', notice });
  }, []);

  // A 401 on any call: try one refresh; if that fails, sign out with the expiry notice (AUTH-03).
  const onUnauthorized = useCallback(() => {
    const t = tokens.current;
    if (!t || refreshing.current) return;
    refreshing.current = refreshSession(t.refreshToken)
      .then(async next => {
        tokens.current = { accessToken: next.accessToken, refreshToken: next.refreshToken };
        await saveTokens(tokens.current);
        return true;
      })
      .catch(async () => {
        await signOut(SESSION_EXPIRED);
        return false;
      })
      .finally(() => {
        refreshing.current = null;
      });
  }, [signOut]);

  useEffect(() => {
    configureApi({ getToken: () => tokens.current?.accessToken, onUnauthorized });
  }, [onUnauthorized]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await loadTokens();
      if (!saved) return alive && setState({ status: 'signedOut', notice: null });
      tokens.current = saved;
      try {
        const user = await getMe();
        if (alive) setState({ status: 'signedIn', user });
      } catch {
        tokens.current = null;
        await clearTokens();
        if (alive) setState({ status: 'signedOut', notice: null });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const signIn = useCallback(async (input: LoginInput) => {
    const res: LoginResult = await login(input);
    tokens.current = { accessToken: res.accessToken, refreshToken: res.refreshToken };
    await saveTokens(tokens.current);
    setState({ status: 'signedIn', user: res.user });
  }, []);

  const value = useMemo<Ctx>(
    () => ({ state, user: state.status === 'signedIn' ? state.user : null, signIn, signOut }),
    [state, signIn, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession outside SessionProvider');
  return ctx;
}

/** The signed-in user. Only use inside the signed-in navigator. */
export function useUser(): Me {
  const { user } = useSession();
  if (!user) throw new Error('No signed-in user');
  return user;
}
