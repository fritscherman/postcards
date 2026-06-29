import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiLogin, apiMe, apiRegister, apiUpdateName, getToken, isOnline, setToken, type AuthUser } from '../api/client';

const GUEST_KEY = 'postcards.guest.v1';

/** Optional link tokens redeemed on sign-in: an invite link and/or a shared card. */
export interface AuthTokens {
  inviteToken?: string;
  shareToken?: string;
}

interface AuthValue {
  user: AuthUser | null;
  /** true when exploring the app locally without an account (online builds only) */
  guest: boolean;
  /** false until the initial session check has finished */
  ready: boolean;
  login: (email: string, password: string, tokens?: AuthTokens) => Promise<void>;
  register: (email: string, name: string, password: string, tokens?: AuthTokens) => Promise<void>;
  /** Change the signed-in user's display name (online mode only). */
  updateName: (name: string) => Promise<void>;
  logout: () => void;
  /** Start using the app locally without signing up. */
  enterGuest: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [guest, setGuest] = useState<boolean>(() => isOnline && localStorage.getItem(GUEST_KEY) === '1');
  const [ready, setReady] = useState(!isOnline);

  useEffect(() => {
    if (!isOnline) return;
    if (!getToken()) {
      setReady(true);
      return;
    }
    apiMe()
      .then((r) => setUser(r.user))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const clearGuest = useCallback(() => {
    setGuest(false);
    localStorage.removeItem(GUEST_KEY);
  }, []);

  const login = useCallback(async (email: string, password: string, tokens?: AuthTokens) => {
    const { token, user } = await apiLogin({ email, password, ...tokens });
    setToken(token);
    setUser(user);
    clearGuest();
  }, [clearGuest]);

  const register = useCallback(
    async (email: string, name: string, password: string, tokens?: AuthTokens) => {
      const { token, user } = await apiRegister({ email, name, password, ...tokens });
      setToken(token);
      setUser(user);
      clearGuest();
    },
    [clearGuest],
  );

  const updateName = useCallback(async (name: string) => {
    const { token, user } = await apiUpdateName(name);
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    clearGuest();
  }, [clearGuest]);

  const enterGuest = useCallback(() => {
    localStorage.setItem(GUEST_KEY, '1');
    setGuest(true);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, guest, ready, login, register, updateName, logout, enterGuest }),
    [user, guest, ready, login, register, updateName, logout, enterGuest],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
