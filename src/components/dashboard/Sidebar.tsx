'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  FileText,
  Settings,
  LogOut,
  Warehouse,
} from 'lucide-react';

// Icons used in movimientos submenu
import { ShoppingCart, TrendingUp } from 'lucide-react';

interface NavItemProps {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
}

const NavItem = ({ href, label, active, icon }: NavItemProps) => {
  return (
    <Link 
      href={href}
      className={`flex items-center px-4 py-3 rounded-md transition-colors ${active 
        ? 'bg-green-100 text-green-700 font-medium' 
        : 'text-gray-600 hover:bg-gray-100'}`}
    >
      <span className="mr-3">{icon}</span>
      <span>{label}</span>
    </Link>
  );
};

import { memo, useMemo, useState, useEffect } from 'react';

function SidebarComponent() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [movimientosOpen, setMovimientosOpen] = useState(false);
  const [productosOpen, setProductosOpen] = useState(false);

  useEffect(() => {
    // Abrir el dropdown si estamos dentro de /dashboard/movimientos
    setMovimientosOpen(pathname.startsWith('/dashboard/movimientos'));
    // Abrir el dropdown de productos si estamos dentro de productos o categorías
    setProductosOpen(pathname.startsWith('/dashboard/productos') || pathname.startsWith('/dashboard/categorias'));
  }, [pathname]);

  const navItems = useMemo(() => ([
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    
    // Módulo de Inventario
    { href: '/dashboard/inventario', label: 'Inventario', icon: <Warehouse size={20} /> },
    // Módulo de Cuentas (oculto temporalmente por refactor)
    
    // Módulos existentes
    { href: '/dashboard/proveedores', label: 'Proveedores', icon: <Truck size={20} /> },
    { href: '/dashboard/clientes', label: 'Clientes', icon: <Users size={20} /> },
    // Navegación limpia tras refactor: módulos eliminados ocultos
  ]), []);

  return (
    <div className="w-64 bg-white h-screen border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full flex items-center justify-center mr-2">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">TodaFru</h1>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-2 space-y-1">
          {navItems.map((item) => (
            <NavItem 
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href}
            />
          ))}

          {/* Dropdown Productos */}
          <button
            type="button"
            onClick={() => setProductosOpen((v) => !v)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-md transition-colors ${productosOpen 
              ? 'bg-green-100 text-green-700 font-medium' 
              : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <div className="flex items-center">
              <Package size={20} className="mr-3" />
              <span>Productos</span>
            </div>
            <svg
              className={`h-4 w-4 transform transition-transform ${productosOpen ? 'rotate-180' : 'rotate-0'}`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {productosOpen && (
            <div className="ml-8 space-y-1">
              <NavItem 
                href="/dashboard/productos"
                label="Listado"
                icon={<Package size={18} />}
                active={pathname === '/dashboard/productos'}
              />
              <NavItem 
                href="/dashboard/unidades"
                label="Unidades de medida"
                icon={<Settings size={18} />}
                active={pathname === '/dashboard/unidades'}
              />
              <NavItem 
                href="/dashboard/categorias"
                label="Categorías"
                icon={<FileText size={18} />}
                active={pathname === '/dashboard/categorias'}
              />
            </div>
          )}

          {/* Dropdown Movimientos */}
          <button
            type="button"
            onClick={() => setMovimientosOpen((v) => !v)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-md transition-colors ${movimientosOpen 
              ? 'bg-green-100 text-green-700 font-medium' 
              : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <div className="flex items-center">
              <FileText size={20} className="mr-3" />
              <span>Movimientos</span>
            </div>
            <svg
              className={`h-4 w-4 transform transition-transform ${movimientosOpen ? 'rotate-180' : 'rotate-0'}`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {movimientosOpen && (
            <div className="ml-8 space-y-1">
              <NavItem 
                href="/dashboard/movimientos/compras"
                label="Compras"
                icon={<ShoppingCart size={18} />}
                active={pathname === '/dashboard/movimientos/compras'}
              />
              <NavItem 
                href="/dashboard/movimientos/ventas"
                label="Ventas"
                icon={<TrendingUp size={18} />}
                active={pathname === '/dashboard/movimientos/ventas'}
              />
            </div>
          )}
        </nav>
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <Link 
          href="/dashboard/configuracion"
          className="flex items-center px-4 py-3 rounded-md transition-colors text-gray-600 hover:bg-gray-100 mb-2"
        >
          <Settings size={20} className="mr-3" />
          <span>Configuración</span>
        </Link>
        
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">Administración</p>
            <p className="text-xs text-gray-500">administracion@todofru.com</p>
          </div>
        </div>
        
        <button 
          onClick={logout}
          className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          <LogOut size={16} className="mr-2" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

export default memo(SidebarComponent);