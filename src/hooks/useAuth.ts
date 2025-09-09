import { useSession, signIn, signOut } from 'next-auth/react';

export const useAuth = () => {
  const { data: session, status } = useSession();

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