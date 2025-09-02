import { useSession, signIn, signOut } from 'next-auth/react';
import { useAuthStore } from '@/lib/store';
import { useEffect } from 'react';

export const useAuth = () => {
  const { data: session, status } = useSession();
  const { setAuth, logout } = useAuthStore();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setAuth(true, {
        id: session.user.id,
        name: session.user.name || undefined,
        email: session.user.email || undefined,
        role: session.user.role as string,
      });
    } else if (status === 'unauthenticated') {
      logout();
    }
  }, [session, status, setAuth, logout]);

  const login = async (email: string, password: string) => {
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      return { success: !result?.error, error: result?.error };
    } catch (error) {
      return { success: false, error: 'Error al iniciar sesión' };
    }
  };

  const logoutUser = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
    logout();
  };

  return {
    session,
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    user: session?.user,
    login,
    logout: logoutUser,
  };
};