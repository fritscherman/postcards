import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Box, PinPosition, Postcard } from '../types';
import { SEED_POSTCARDS } from '../data/seed';

const STORAGE_KEY = 'postcards.v1';
const PROFILE_KEY = 'postcards.profile.v1';

interface StoreValue {
  postcards: Postcard[];
  userName: string;
  setUserName: (name: string) => void;
  /** Adds a freshly created card to the outbox and simulates delivery to the inbox. */
  sendPostcard: (card: Omit<Postcard, 'id' | 'createdAt' | 'box' | 'read' | 'pin'>) => Postcard;
  markRead: (id: string) => void;
  movePin: (id: string, pin: Partial<PinPosition>) => void;
  removePostcard: (id: string) => void;
  resetDemo: () => void;
  cardsIn: (box: Box) => Postcard[];
}

const PostcardContext = createContext<StoreValue | null>(null);

function randomPin(): PinPosition {
  return {
    x: 0.15 + Math.random() * 0.6,
    y: 0.15 + Math.random() * 0.55,
    rotation: Math.round((Math.random() - 0.5) * 14),
  };
}

function load(): Postcard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Postcard[];
  } catch {
    /* ignore corrupt storage */
  }
  return SEED_POSTCARDS;
}

export function PostcardProvider({ children }: { children: ReactNode }) {
  const [postcards, setPostcards] = useState<Postcard[]>(load);
  const [userName, setUserNameState] = useState<string>(
    () => localStorage.getItem(PROFILE_KEY) ?? 'Du',
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(postcards));
  }, [postcards]);

  const setUserName = useCallback((name: string) => {
    const clean = name.trim() || 'Du';
    setUserNameState(clean);
    localStorage.setItem(PROFILE_KEY, clean);
  }, []);

  const sendPostcard = useCallback<StoreValue['sendPostcard']>((card) => {
    const created: Postcard = {
      ...card,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      box: 'outbox',
      read: true,
      pin: randomPin(),
    };
    setPostcards((prev) => [created, ...prev]);
    return created;
  }, []);

  const markRead = useCallback((id: string) => {
    setPostcards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, read: true } : c)),
    );
  }, []);

  const movePin = useCallback((id: string, pin: Partial<PinPosition>) => {
    setPostcards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pin: { ...c.pin, ...pin } } : c)),
    );
  }, []);

  const removePostcard = useCallback((id: string) => {
    setPostcards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const resetDemo = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPostcards(SEED_POSTCARDS);
  }, []);

  const cardsIn = useCallback(
    (box: Box) =>
      postcards
        .filter((c) => c.box === box)
        .sort((a, b) => b.createdAt - a.createdAt),
    [postcards],
  );

  const value = useMemo<StoreValue>(
    () => ({
      postcards,
      userName,
      setUserName,
      sendPostcard,
      markRead,
      movePin,
      removePostcard,
      resetDemo,
      cardsIn,
    }),
    [postcards, userName, setUserName, sendPostcard, markRead, movePin, removePostcard, resetDemo, cardsIn],
  );

  return <PostcardContext.Provider value={value}>{children}</PostcardContext.Provider>;
}

export function usePostcards(): StoreValue {
  const ctx = useContext(PostcardContext);
  if (!ctx) throw new Error('usePostcards must be used within PostcardProvider');
  return ctx;
}
