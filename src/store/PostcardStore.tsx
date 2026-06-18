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
import { apiListPostcards, apiMarkRead, apiSendPostcard, apiSetLike, isOnline } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const STORAGE_KEY = 'postcards.v1';
const PROFILE_KEY = 'postcards.profile.v1';
// Which cards the user pinned to the board. Kept per-device so it works in both
// demo and online mode without a server change.
const PINNED_KEY = 'postcards.pinned.v1';

function loadPinned(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(PINNED_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

type Draft = Omit<Postcard, 'id' | 'createdAt' | 'box' | 'read' | 'pin'>;

interface StoreValue {
  postcards: Postcard[];
  userName: string;
  setUserName: (name: string) => void;
  /** Sends a card. Online: delivers to the recipient's inbox; demo: simulates locally. */
  sendPostcard: (card: Draft) => Promise<void>;
  markRead: (id: string) => void;
  /** Toggle the favourite heart on a received card. */
  toggleLike: (id: string) => void;
  movePin: (id: string, pin: Partial<PinPosition>) => void;
  /** Pin or unpin a card from the pinboard. */
  togglePin: (id: string) => void;
  isPinned: (id: string) => boolean;
  /** Cards the user pinned to the board. */
  pinnedCards: Postcard[];
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
    liked: c.liked,
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
  const [pinned, setPinned] = useState<Set<string>>(loadPinned);

  // Persist the pinned set whenever it changes.
  useEffect(() => {
    localStorage.setItem(PINNED_KEY, JSON.stringify([...pinned]));
  }, [pinned]);

  // Local mode persists to localStorage; online mode is the server's job.
  useEffect(() => {
    if (local) localStorage.setItem(STORAGE_KEY, JSON.stringify(postcards));
  }, [postcards, local]);

  // Mirror the unread inbox count onto the app icon (Badging API), like native
  // apps. Push keeps it fresh in the background; this keeps it fresh in-app.
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!('setAppBadge' in nav)) return;
    const unread = postcards.filter((c) => c.box === 'inbox' && !c.read).length;
    const done = unread > 0 ? nav.setAppBadge?.(unread) : nav.clearAppBadge?.();
    done?.catch(() => {});
  }, [postcards]);

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

  // Polling fallback for when Web Push is unavailable, blocked, or delayed by the
  // browser. Keeps the inbox fresh without a manual reload. We poll every 30s while
  // the tab is visible, and refetch immediately whenever the user returns to it.
  useEffect(() => {
    if (local || !user) return;
    let timer: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      if (timer) return;
      timer = setInterval(refresh, 30_000);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', refresh);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', refresh);
    };
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

  const toggleLike = useCallback((id: string) => {
    let next = false;
    setPostcards((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        next = !c.liked;
        return { ...c, liked: next };
      }),
    );
    if (!local) apiSetLike(id, next).catch(() => {});
  }, [local]);

  const movePin = useCallback((id: string, pin: Partial<PinPosition>) => {
    setPostcards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pin: { ...c.pin, ...pin } } : c)),
    );
  }, []);

  const togglePin = useCallback((id: string) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isPinned = useCallback((id: string) => pinned.has(id), [pinned]);

  const pinnedCards = useMemo(
    () => postcards.filter((c) => pinned.has(c.id)),
    [postcards, pinned],
  );

  const removePostcard = useCallback((id: string) => {
    setPostcards((prev) => prev.filter((c) => c.id !== id));
    setPinned((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
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
      toggleLike,
      movePin,
      togglePin,
      isPinned,
      pinnedCards,
      removePostcard,
      resetDemo,
      cardsIn,
    }),
    [postcards, userName, setUserName, sendPostcard, markRead, toggleLike, movePin, togglePin, isPinned, pinnedCards, removePostcard, resetDemo, cardsIn],
  );

  return <PostcardContext.Provider value={value}>{children}</PostcardContext.Provider>;
}

export function usePostcards(): StoreValue {
  const ctx = useContext(PostcardContext);
  if (!ctx) throw new Error('usePostcards must be used within PostcardProvider');
  return ctx;
}
