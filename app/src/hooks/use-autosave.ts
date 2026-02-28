import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Debounces calls to `saveFn` whenever `data` changes.
 *
 * - Skips the initial render (no save on mount).
 * - Returns `cancel()` to discard a pending save and `flush()` to fire immediately.
 *   Call `flush()` before an Apply to avoid a double-write race.
 */
export function useAutosave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  delay = 800,
): { status: AutosaveStatus; cancel: () => void; flush: () => void } {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFnRef = useRef(saveFn);
  const dataRef = useRef(data);
  const isInitialRef = useRef(true);

  // Keep refs current without triggering effects.
  saveFnRef.current = saveFn;
  dataRef.current = data;

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const doSave = useCallback(async (snapshot: T) => {
    setStatus('saving');
    try {
      await saveFnRef.current(snapshot);
      setStatus('saved');
    } catch (err) {
      console.error('autosave failed', err);
      setStatus('error');
    }
  }, []);

  /** Cancel the pending timer and save immediately. Call this before Apply. */
  const flush = useCallback(() => {
    cancel();
    void doSave(dataRef.current);
  }, [cancel, doSave]);

  // Serialize for deep-equality comparison across renders.
  const dataJson = JSON.stringify(data);

  useEffect(() => {
    // Skip the very first render — don't autosave stale/initial state on mount.
    if (isInitialRef.current) {
      isInitialRef.current = false;
      return;
    }
    cancel();
    const snapshot = dataRef.current;
    timerRef.current = setTimeout(() => {
      void doSave(snapshot);
    }, delay);
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataJson, delay]);

  return { status, cancel, flush };
}
