import { create } from 'zustand';

export type UserRole = 'ADMIN' | 'ARTIST';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  labelShare?: number;
  balance?: number;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setSession: (session: { token: string; user: AuthUser }) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
}

const readUserFromStorage = (): AuthUser | null => {
  try {
    const rawUser = localStorage.getItem('user');

    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: readUserFromStorage(),

  setSession: ({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    set({ token, user });
  },

  updateUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));

    set({ user });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    set({ token: null, user: null });
  },
}));