import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiLogin, apiMe, apiRegister, getToken, isOnline, setToken, type AuthUser } from '../api/client';

interface AuthValue {
  user: AuthUser | null;
  /** false until the initial session check has finished */
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string, inviteToken?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
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

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await apiLogin({ email, password });
    setToken(token);
    setUser(user);
  }, []);

  const register = useCallback(
    async (email: string, name: string, password: string, inviteToken?: string) => {
      const { token, user } = await apiRegister({ email, name, password, inviteToken });
      setToken(token);
      setUser(user);
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthValue>(() => ({ user, ready, login, register, logout }), [user, ready, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
