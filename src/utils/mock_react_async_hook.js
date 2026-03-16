
import { useState, useEffect } from 'react';
export function useAsync(fn, deps) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    setState({ loading: true });
    fn().then(
      result => setState({ result, loading: false }),
      error => setState({ error, loading: false })
    );
  }, deps);
  return state;
}
export const useAsyncCallback = (fn) => ({ execute: fn });
export const useAsyncAbortable = (fn, deps) => useAsync(fn, deps);
