'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Truck, 
  UserCheck, 
  FileText, 
  Star, 
  Ruler, 
  Calculator, 
  Settings,
  LogOut
} from 'lucide-react';

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

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { href: '/dashboard/productos', label: 'Productos', icon: <Package size={20} /> },
    { href: '/dashboard/agrupador-productos', label: 'Agrupador de Productos', icon: <Package size={20} /> },
    { href: '/dashboard/proveedores', label: 'Proveedores', icon: <Truck size={20} /> },
    { href: '/dashboard/clientes', label: 'Clientes', icon: <Users size={20} /> },
    { href: '/dashboard/grupo-cliente', label: 'Grupo de Cliente', icon: <UserCheck size={20} /> },
    { href: '/dashboard/tipo-articulo', label: 'Tipo de Artículo', icon: <FileText size={20} /> },
    { href: '/dashboard/marcas', label: 'Marcas', icon: <Star size={20} /> },
    { href: '/dashboard/unidad-medida', label: 'Unidad de Medida', icon: <Ruler size={20} /> },
    { href: '/dashboard/razon-social', label: 'Razón Social', icon: <Calculator size={20} /> },
    { href: '/dashboard/documentos', label: 'Documentos', icon: <FileText size={20} /> },
  ];

  return (
    <div className="w-64 bg-white h-screen border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full flex items-center justify-center mr-2">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">TodoFrut</h1>
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