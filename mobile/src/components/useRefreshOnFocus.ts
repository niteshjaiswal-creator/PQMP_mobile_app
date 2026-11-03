// Re-fetches when a screen that stays mounted (tab, stack parent) comes back into focus, so counts,
// "needs your reply" and status chips are current after a reply, feedback, reopen or new case.
import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export function useRefreshOnFocus(refetch: () => void) {
  const first = useRef(true);
  const latest = useRef(refetch);
  latest.current = refetch;
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false; // the screen's own initial load covers the first focus
        return;
      }
      latest.current();
    }, []),
  );
}
