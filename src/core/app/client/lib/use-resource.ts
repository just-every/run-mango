import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, getJson } from './api';

export function useResource<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const scope = useRef({ path, active: false, requested: 0, settled: 0, minimum: 0 });

  const read = useCallback(async () => {
    const current = scope.current;
    if (!current.active || current.path !== path) return;
    const request = ++current.requested;
    const accepts = () => current.active && current.path === path
      && request >= current.minimum && request >= current.settled;
    setLoading(true);
    setError(undefined);
    try {
      const result = await getJson<T>(path);
      if (!accepts()) return;
      current.settled = request;
      setData(result);
      return result;
    } catch (cause) {
      if (!accepts()) return;
      current.settled = request;
      if (cause instanceof ApiError && cause.status === 401) {
        window.location.assign('/signin?reason=session-ended');
        return;
      }
      setError('Unable to load this record.');
    } finally {
      if (accepts()) setLoading(false);
    }
  }, [path]);

  const reload = useCallback(() => {
    const current = scope.current;
    if (!current.active || current.path !== path) return Promise.resolve(undefined);
    // A deliberate refresh invalidates every read started before it, including pre-save reads.
    current.minimum = current.requested + 1;
    return read();
  }, [path, read]);

  useEffect(() => {
    const current = scope.current;
    if (current.path !== path) {
      current.path = path;
      current.minimum = current.requested + 1;
      setData(undefined);
    }
    current.active = true;
    // Mount replay may make equivalent reads; the first result stays usable until a newer one settles.
    void read();
    return () => { current.active = false; };
  }, [path, read]);

  const matchesPath = scope.current.path === path;
  return { data: matchesPath ? data : undefined, error: matchesPath ? error : undefined, loading: !matchesPath || loading, reload };
}
