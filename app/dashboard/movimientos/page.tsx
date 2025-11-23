'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  BarChart3, 
  ArrowRight,
  Calendar,
  DollarSign,
  Activity
} from 'lucide-react';

interface MovimientoStats {
  compras: {
    total: number;
    mes: number;
    valor: number;
  };
  ventas: {
    total: number;
    mes: number;
    valor: number;
  };
}

export default function MovimientosPage() {
  const [stats, setStats] = useState<MovimientoStats>({
    compras: { total: 0, mes: 0, valor: 0 },
    ventas: { total: 0, mes: 0, valor: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carga de estadísticas
    const loadStats = async () => {
      try {
        // Aquí se haría la llamada real a la API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setStats({
          compras: { total: 156, mes: 23, valor: 45600 },
          ventas: { total: 89, mes: 12, valor: 78900 }
        });
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando movimientos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Movimientos de Inventario</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona los movimientos de compras y ventas de tu inventario
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/dashboard/movimientos-v2"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Activity className="h-4 w-4 mr-2" />
            Vista Avanzada
          </Link>
        </div>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                <Package className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Total Movimientos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.compras.total + stats.ventas.total}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Este Mes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.compras.mes + stats.ventas.mes}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.compras.valor + stats.ventas.valor)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Promedio Diario</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round((stats.compras.total + stats.ventas.total) / 30)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación a Subcategorías */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link 
          href="/dashboard/movimientos/compras"
          className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 border-l-4 border-blue-500 overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Movimientos de Compras</h3>
                  <p className="text-sm text-gray-700">Gestiona las entradas de inventario</p>
                  <div className="mt-2 flex items-center space-x-4">
                    <span className="text-sm text-gray-700">
                      {stats.compras.total} movimientos
                    </span>
                    <span className="text-sm font-medium text-blue-600">
                      {formatCurrency(stats.compras.valor)}
                    </span>
                  </div>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-700" />
            </div>
          </div>
        </Link>

        <Link 
          href="/dashboard/movimientos/ventas"
          className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 border-l-4 border-green-500 overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Movimientos de Ventas</h3>
                  <p className="text-sm text-gray-700">Gestiona las salidas de inventario</p>
                  <div className="mt-2 flex items-center space-x-4">
                    <span className="text-sm text-gray-700">
                      {stats.ventas.total} movimientos
                    </span>
                    <span className="text-sm font-medium text-green-600">
                      {formatCurrency(stats.ventas.valor)}
                    </span>
                  </div>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-700" />
            </div>
          </div>
        </Link>
      </div>

      {/* Accesos Rápidos */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Accesos Rápidos</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/dashboard/movimientos/compras?action=new"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ShoppingCart className="h-5 w-5 text-blue-600 mr-3" />
              <span className="text-sm font-medium text-gray-900">Nueva Compra</span>
            </Link>
            
            <Link
              href="/dashboard/movimientos/ventas?action=new"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <TrendingUp className="h-5 w-5 text-green-600 mr-3" />
              <span className="text-sm font-medium text-gray-900">Nueva Venta</span>
            </Link>
            
            <Link
              href="/dashboard/movimientos-v2?tab=estadisticas"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="h-5 w-5 text-orange-600 mr-3" />
              <span className="text-sm font-medium text-gray-900">Ver Estadísticas</span>
            </Link>
            
            <Link
              href="/dashboard/inventario"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Package className="h-5 w-5 text-purple-600 mr-3" />
              <span className="text-sm font-medium text-gray-900">Ver Inventario</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}