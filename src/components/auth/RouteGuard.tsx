'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type RouteGuardProps = {
  children: React.ReactNode;
  requiredRoles?: string[];
};

export default function RouteGuard({ children, requiredRoles = [] }: RouteGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si no está cargando y no está autenticado, redirigir al login
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }

    // Si está autenticado pero no tiene el rol requerido
    if (!isLoading && isAuthenticated && requiredRoles.length > 0) {
      const userRole = user?.role || '';
      if (!requiredRoles.includes(userRole)) {
        // Redirigir a una página de acceso denegado o al dashboard
        router.replace('/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, user, router, requiredRoles]);

  // Mostrar nada mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Si no está autenticado, no mostrar nada (se redirigirá en el useEffect)
  if (!isAuthenticated) {
    return null;
  }

  // Si requiere roles específicos y el usuario no los tiene, no mostrar nada
  if (requiredRoles.length > 0) {
    const userRole = user?.role || '';
    if (!requiredRoles.includes(userRole)) {
      return null;
    }
  }

  // Si está autenticado y tiene los roles requeridos, mostrar el contenido
  return <>{children}</>;
}