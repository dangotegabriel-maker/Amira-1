import { useEffect, useMemo, useRef } from 'react';
import { useUser } from '../context/UserContext';

// A captured guard belongs to one authenticated session AND one UI target.
// Replacing the target invalidates old closures before effect cleanup runs.
export const useSessionGuard = (key = '', enabled = true) => {
  const { authenticatedSession: session } = useUser();
  const owner = useRef(null);
  const scope = useMemo(() => ({ active: false }), [session, key, enabled]);
  owner.current = scope;
  useEffect(() => {
    scope.active = true;
    return () => { scope.active = false; };
  }, [scope]);
  return useMemo(() => () => enabled && scope.active && owner.current === scope
    && session?.isCurrent() === true, [scope, session, enabled]);
};
