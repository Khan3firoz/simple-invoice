import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchCurrentUser, login as loginRequest } from '@/lib/api/auth';
import { authStorage, unauthorizedEvent } from '@/lib/api/auth-storage';
import type { User } from '@/lib/api/types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authStorage.getUser());
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) {
      setIsInitializing(false);
      return;
    }

    // Validate the stored token against the API rather than trusting
    // localStorage blindly — it may have expired since the last visit.
    fetchCurrentUser()
      .then((freshUser) => {
        setUser(freshUser);
        authStorage.set(token, freshUser);
      })
      .catch(() => {
        authStorage.clear();
        setUser(null);
      })
      .finally(() => setIsInitializing(false));
  }, []);

  useEffect(() => {
    return unauthorizedEvent.subscribe(() => setUser(null));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest(email, password);
    authStorage.set(response.accessToken, response.user);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    authStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, isInitializing, login, logout }),
    [user, isInitializing, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
