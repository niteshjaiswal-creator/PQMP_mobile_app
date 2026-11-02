// Minimal data hook: loading, error (business-readable), pull-to-refresh and reload.
import { useCallback, useEffect, useRef, useState } from 'react';
import { userMessageFor } from '../api/client';

export type Query<T> = {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  reload: () => void;
  refresh: () => void;
  setData: (fn: (prev: T | undefined) => T | undefined) => void;
};

export function useQuery<T>(fn: () => Promise<T>, deps: unknown[]): Query<T> {
  const [data, setDataState] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const seq = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent') => {
      const id = ++seq.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const result = await run();
        if (id === seq.current) {
          setDataState(result);
          setError(null);
        }
      } catch (err) {
        if (id === seq.current) setError(userMessageFor(err));
      } finally {
        if (id === seq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [run],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  return {
    data,
    error,
    loading,
    refreshing,
    reload: () => load(data === undefined ? 'initial' : 'silent'),
    refresh: () => load('refresh'),
    setData: f => setDataState(prev => f(prev)),
  };
}
