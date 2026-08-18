import type { User } from './types';

const TOKEN_KEY = 'simpleinvoice.accessToken';
const USER_KEY = 'simpleinvoice.user';

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  getUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },
  set(token: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

// Small pub-sub so the axios interceptor (which has no access to React
// context/router) can tell AuthProvider "the token is no longer valid"
// without a hard page reload.
type Listener = () => void;
const listeners = new Set<Listener>();

export const unauthorizedEvent = {
  emit(): void {
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
