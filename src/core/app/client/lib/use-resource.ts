import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ResourceSnapshot } from './resource-snapshot';

import { ApiError, getJson, NOT_FOUND } from './api';

export function useResource<T>(path: string) {
  const snapshot = useContext(ResourceSnapshot);
  const initial = snapshot[path] as T | undefined;
  const [data, setData] = useState<T | undefined>(initial);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(initial === undefined);
  const seeded = useRef(snapshot);
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
      setError(cause instanceof ApiError && cause.status === 404 ? NOT_FOUND : 'Unable to load this record.');
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

  const replace = useCallback((value: T) => {
    const current = scope.current;
    if (!current.active || current.path !== path) return;
    current.minimum = ++current.requested;
    current.settled = current.requested;
    setData(value);
    setError(undefined);
    setLoading(false);
  }, [path]);

  useEffect(() => {
    const current = scope.current;
    if (current.path !== path) {
      current.path = path;
      current.minimum = current.requested + 1;
      setData(initial);
    }
    current.active = true;
    if (initial !== undefined) {
      // Consume once on hydration, and replace on a fresh navigation snapshot.
      // Explicit reload always uses the API, including after a mutation.
      if (seeded.current !== snapshot) {
        current.minimum = ++current.requested;
        setData(initial);
        setError(undefined);
      }
      seeded.current = snapshot;
      setLoading(false);
      return () => { current.active = false; };
    }
    // Mount replay may make equivalent reads; the first result stays usable until a newer one settles.
    void read();
    return () => { current.active = false; };
  }, [path, read, snapshot, initial]);

  const matchesPath = scope.current.path === path;
  return { data: matchesPath ? data : undefined, error: matchesPath ? error : undefined, loading: !matchesPath || loading, reload, replace };
}
