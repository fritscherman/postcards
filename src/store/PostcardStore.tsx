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
import { apiListPostcards, apiMarkRead, apiSendPostcard, isOnline } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const STORAGE_KEY = 'postcards.v1';
const PROFILE_KEY = 'postcards.profile.v1';

type Draft = Omit<Postcard, 'id' | 'createdAt' | 'box' | 'read' | 'pin'>;

interface StoreValue {
  postcards: Postcard[];
  userName: string;
  setUserName: (name: string) => void;
  /** Sends a card. Online: delivers to the recipient's inbox; demo: simulates locally. */
  sendPostcard: (card: Draft) => Promise<void>;
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

/** Map an API postcard row into the shape the UI expects. */
function fromApi(c: any): Postcard {
  return {
    id: c.id,
    image: c.image,
    orientation: c.orientation,
    crop: c.crop,
    templateId: c.templateId,
    stampId: c.stampId,
    filter: c.filter,
    message: c.message,
    to: c.to,
    from: c.from,
    toEmail: c.toEmail,
    fromEmail: c.fromEmail,
    location: c.location,
    createdAt: c.createdAt,
    box: c.box,
    read: c.read,
    pin: randomPin(),
  };
}

export function PostcardProvider({ children }: { children: ReactNode }) {
  const { user, guest } = useAuth();
  // Local mode = the demo build, OR a guest exploring an online build without an account.
  // In both cases data lives in localStorage instead of the server.
  const local = !isOnline || guest;
  const [postcards, setPostcards] = useState<Postcard[]>(() => (local ? load() : []));
  const [localName, setLocalName] = useState<string>(
    () => localStorage.getItem(PROFILE_KEY) ?? 'Du',
  );

  // Local mode persists to localStorage; online mode is the server's job.
  useEffect(() => {
    if (local) localStorage.setItem(STORAGE_KEY, JSON.stringify(postcards));
  }, [postcards, local]);

  const refresh = useCallback(async () => {
    if (local || !user) return;
    try {
      const { cards } = await apiListPostcards();
      setPostcards(cards.map(fromApi));
    } catch {
      /* keep what we have */
    }
  }, [user]);

  // Load (or clear) the server postcards when the signed-in user changes.
  useEffect(() => {
    if (local) return;
    if (user) refresh();
    else setPostcards([]);
  }, [user, refresh, local]);

  const setUserName = useCallback((name: string) => {
    const clean = name.trim() || 'Du';
    setLocalName(clean);
    localStorage.setItem(PROFILE_KEY, clean);
  }, []);

  const sendPostcard = useCallback<StoreValue['sendPostcard']>(
    async (card) => {
      if (!local) {
        await apiSendPostcard({
          toEmail: card.toEmail ?? '',
          payload: {
            image: card.image,
            message: card.message,
            templateId: card.templateId,
            stampId: card.stampId,
            filter: card.filter,
            orientation: card.orientation,
            crop: card.crop,
            location: card.location,
          },
        });
        await refresh();
        return;
      }
      const created: Postcard = {
        ...card,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        box: 'outbox',
        read: true,
        pin: randomPin(),
      };
      setPostcards((prev) => [created, ...prev]);
    },
    [refresh, local],
  );

  const markRead = useCallback((id: string) => {
    setPostcards((prev) => prev.map((c) => (c.id === id ? { ...c, read: true } : c)));
    if (!local) apiMarkRead(id).catch(() => {});
  }, [local]);

  const movePin = useCallback((id: string, pin: Partial<PinPosition>) => {
    setPostcards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pin: { ...c.pin, ...pin } } : c)),
    );
  }, []);

  const removePostcard = useCallback((id: string) => {
    setPostcards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const resetDemo = useCallback(() => {
    if (!local) {
      refresh();
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    setPostcards(SEED_POSTCARDS);
  }, [refresh, local]);

  const cardsIn = useCallback(
    (box: Box) =>
      postcards
        .filter((c) => c.box === box)
        .sort((a, b) => b.createdAt - a.createdAt),
    [postcards],
  );

  const userName = local ? localName : user?.name ?? 'Du';

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
