import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AuthState = {
  isAuthenticated: boolean;
  user: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  } | null;
  setAuth: (isAuthenticated: boolean, user: AuthState['user']) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      setAuth: (isAuthenticated, user) => set({ isAuthenticated, user }),
      logout: () => set({ isAuthenticated: false, user: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);