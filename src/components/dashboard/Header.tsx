'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState(3);
  
  // Determinar título y subtítulo basado en la ruta actual si no se proporcionan
  const getPageInfo = () => {
    if (title && subtitle) {
      return { title, subtitle };
    }
    
    switch (pathname) {
      case '/dashboard':
        return { 
          title: 'Panel Principal', 
          subtitle: 'Bienvenido al sistema de gestión TodoFru' 
        };
      case '/dashboard/clientes':
        return { 
          title: 'Gestión de Clientes', 
          subtitle: 'Administra la información de tus clientes' 
        };
      case '/dashboard/inventarios':
        return { 
          title: 'Gestión de Inventarios', 
          subtitle: 'Controla tus productos y existencias' 
        };
      case '/dashboard/facturacion':
        return { 
          title: 'Facturación', 
          subtitle: 'Genera y administra tus facturas' 
        };
      case '/dashboard/cuentas-cobrar':
        return { 
          title: 'Cuentas por Cobrar', 
          subtitle: 'Gestiona los pagos pendientes' 
        };
      default:
        return { 
          title: 'TodoFru', 
          subtitle: 'Sistema de Gestión Empresarial' 
        };
    }
  };
  
  const pageInfo = getPageInfo();
  
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{pageInfo.title}</h1>
          <p className="text-sm text-gray-500">{pageInfo.subtitle}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Botón de notificaciones */}
          <div className="relative">
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifications > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>
          </div>
          
          {/* Botón de ayuda */}
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}