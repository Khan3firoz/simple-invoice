import { api } from './client';
import type { AuthResponse, User } from './types';

export function login(email: string, password: string) {
  return api.post<AuthResponse>('/auth/login', { email, password }).then((res) => res.data);
}

export function fetchCurrentUser() {
  return api.get<User>('/auth/me').then((res) => res.data);
}
