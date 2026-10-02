import { useCallback, useMemo } from 'react';

// The existing session/target guard owns each lane. A replaced owner gets
// independent locks; an old finally cannot unlock a newer operation.
export const useActionLock = current => {
  const lanes = useMemo(() => new Set(), [current]);
  return useCallback(async (lane, work) => {
    if (!current() || lanes.has(lane)) return;
    lanes.add(lane);
    try { return await work(); }
    finally { lanes.delete(lane); }
  }, [current, lanes]);
};
