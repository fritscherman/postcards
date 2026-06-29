import { useCallback, useEffect, useState } from 'react';
import type { Stamp } from '../types';

// Self-made stamps live on the device so they survive reloads and are reusable
// across cards. Kept separate from postcards.v1 because they're a personal
// palette, not card data.
const KEY = 'postcards.customStamps.v1';

function load(): Stamp[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Stamp[];
  } catch {
    /* ignore corrupt storage */
  }
  return [];
}

export interface CustomStamps {
  stamps: Stamp[];
  /** Persist a new stamp and return it (with its freshly assigned id). */
  addStamp: (stamp: Stamp) => Stamp;
  removeStamp: (id: string) => void;
}

/** Manages the user's saved self-made stamps, persisted to localStorage. */
export function useCustomStamps(): CustomStamps {
  const [stamps, setStamps] = useState<Stamp[]>(load);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(stamps));
  }, [stamps]);

  const addStamp = useCallback((stamp: Stamp): Stamp => {
    // Each saved stamp needs its own id so it can be selected and removed
    // individually (makeCustomStamp hands them all the shared CUSTOM_STAMP_ID).
    const saved: Stamp = { ...stamp, id: crypto.randomUUID() };
    setStamps((prev) => [...prev, saved]);
    return saved;
  }, []);

  const removeStamp = useCallback((id: string) => {
    setStamps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { stamps, addStamp, removeStamp };
}
