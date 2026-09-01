import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';

const PREFIX = 'sim_persist_';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage full / unavailable — ignore */
  }
}

/**
 * useState clone that survives reloads, crashes and accidental tab closes.
 * The value is written to localStorage on every change (and on unload).
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => read(key, initialValue));
  const keyRef = useRef(key);
  const valueRef = useRef(value);
  valueRef.current = value;

  // If the storage key changes (e.g. per-product drafts), load that slot.
  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key;
      setValue(read(key, initialValue));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    write(key, value);
  }, [key, value]);

  // Extra safety net: flush right before the page goes away.
  useEffect(() => {
    const flush = () => write(keyRef.current, valueRef.current);
    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      flush();
      window.removeEventListener('beforeunload', flush);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, []);

  return [value, setValue];
}

/** Wipes every persisted simulator slot (used when a new run starts). */
export function clearPersistentState() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
