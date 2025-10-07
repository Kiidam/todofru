'use client';

import { useState, useEffect, useCallback } from 'react';
import { Package, AlertTriangle, TrendingUp, TrendingDown, Search, Eye, RotateCcw, ShieldAlert } from 'lucide-react';

interface SyncValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  orphanedInventory: string[];
  missingInventory: string[];
}

interface Producto {
  id: string;
  nombre: string;
  sku?: string;
  stock: number;
  stockMinimo: number;
  precio: number;
  categoria: {
    nombre: string;
  };
  unidadMedida: {
    simbolo: string;
  };
}

interface MovimientoInventario {
  id: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  cantidad: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  motivo?: string;
  createdAt: string;
  producto: {
    nombre: string;
    sku?: string;
  };
  usuario: {
    name: string;
  };
}

export default function InventariosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [loading, setLoading] = useState(true);
  const [showMovimientos, setShowMovimientos] = useState(false);
  const [syncValidation, setSyncValidation] = useState<SyncValidationResult | null>(null);
  const [showSyncReport, setShowSyncReport] = useState(false);

  // Estadísticas del inventario
  const [stats, setStats] = useState({
    totalProductos: 0,
    stockBajo: 0,
    agotados: 0,
    valorTotal: 0
  });

  // Initialization effect moved below after fetchProductos, fetchMovimientos, and validateSync are declared

  // Moved below after filterProductos is defined to avoid temporal dead zone error
  // useEffect(() => {
  //   filterProductos();
  // }, [filterProductos]);

  const validateSync = useCallback(async () => {
    try {
      const response = await fetch('/api/inventarios?action=sync-validation');
      if (!response.ok) {
        throw new Error('Error al obtener validación de sincronización');
      }
      
      const data = await response.json();
      setSyncValidation(data.syncValidation);
      
      if (!data.syncValidation.isValid) {
        setShowSyncReport(true);
      }
    } catch (error) {
      console.error('Error al validar sincronización:', error);
    }
  }, []);

  const executeSyncAction = async (action: 'migrate' | 'clean') => {
    if (!confirm(`¿Estás seguro de que deseas ${action === 'migrate' ? 'migrar' : 'limpiar'} los productos huérfanos?\n\n${action === 'clean' ? '⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE y eliminará todos los movimientos de productos huérfanos.' : 'Esta acción creará entradas en el catálogo para productos huérfanos.'}`)) {
      return;
    }

    try {
      const response = await fetch('/api/productos/sync-validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        // Revalidar después de la acción
        await validateSync();
        // Recargar productos si la migración fue exitosa
        if (action === 'migrate') {
          await fetchProductos();
        }
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error en acción de sincronización:', error);
      alert('Error al ejecutar la acción de sincronización');
    }
  };

  const fetchProductos = useCallback(async () => {
    try {
      const response = await fetch('/api/inventarios?action=productos');
      if (!response.ok) {
        throw new Error('Error al obtener productos');
      }
      
      const data = await response.json();
      const productosSync = data.productos;
      
      if (productosSync.length > 0) {
        // Convertir al formato esperado por el componente
        const productosFormateados = productosSync.map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          sku: p.sku || undefined,
          stock: p.stock,
          stockMinimo: p.stockMinimo,
          precio: typeof p.precio === 'number' ? p.precio : 0,
          categoria: p.categoria || { nombre: 'Sin categoría' },
          unidadMedida: p.unidadMedida as { simbolo: string }
        }));
        
        setProductos(productosFormateados);
        calculateStats(productosFormateados);
      } else {
        setProductos([]);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMovimientos = useCallback(async () => {
    try {
      const response = await fetch('/api/inventarios?action=movimientos');
      
      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText);
        
        // Si falla, intentar con datos mock o vacío
        setMovimientos([]);
        return;
      }
      
      const data = await response.json();
      console.log('Datos de movimientos recibidos:', data);
      
      setMovimientos(data.movimientos || []);
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
      // En caso de error, usar array vacío para que no falle la UI
      setMovimientos([]);
    }
  }, []);

  const calculateStats = (productos: Producto[]) => {
    const totalProductos = productos.length;
    const stockBajo = productos.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= (p.stockMinimo ?? 0)).length;
    const agotados = productos.filter(p => (p.stock ?? 0) === 0).length;
    const valorTotal = productos.reduce((sum, p) => sum + ((p.stock ?? 0) * (p.precio ?? 0)), 0);

    setStats({
      totalProductos,
      stockBajo,
      agotados,
      valorTotal
    });
  };

  const filterProductos = useCallback(() => {
    let filtered = productos;

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(producto =>
        producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        producto.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        producto.categoria.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por stock
    switch (stockFilter) {
      case 'low':
        filtered = filtered.filter(p => p.stock > 0 && p.stock <= p.stockMinimo);
        break;
      case 'out':
        filtered = filtered.filter(p => p.stock === 0);
        break;
    }

    setFilteredProductos(filtered);
  }, [productos, searchTerm, stockFilter]);

  useEffect(() => {
    filterProductos();
  }, [filterProductos]);

  // Initialization effect after stable callbacks
  useEffect(() => {
    fetchProductos();
    fetchMovimientos();
    validateSync();
  }, [fetchProductos, fetchMovimientos, validateSync]);

  const getStockStatus = (producto: Producto) => {
    if (producto.stock === 0) return { status: 'Agotado', color: 'text-red-600 bg-red-100' };
    if (producto.stock <= producto.stockMinimo) return { status: 'Stock Bajo', color: 'text-yellow-600 bg-yellow-100' };
    return { status: 'Normal', color: 'text-green-600 bg-green-100' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando inventario...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Inventario</h1>
          <p className="text-gray-600">Control y seguimiento del stock de productos</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowMovimientos(!showMovimientos)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Eye className="h-4 w-4 mr-2" />
            {showMovimientos ? 'Ver Productos' : 'Ver Movimientos'}
          </button>
        </div>
      </div>

      {/* Panel de Advertencia de Sincronización */}
      {syncValidation && !syncValidation.isValid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <ShieldAlert className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Problemas de Sincronización Detectados
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {syncValidation.errors.map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-3">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowSyncReport(!showSyncReport)}
                    className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
                  >
                    {showSyncReport ? 'Ocultar Detalles' : 'Ver Detalles'}
                  </button>
                  <button
                    onClick={() => validateSync()}
                    className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded hover:bg-blue-200"
                  >
                    Revalidar
                  </button>
                  {syncValidation.orphanedInventory.length > 0 && (
                    <>
                      <button
                        onClick={() => executeSyncAction('migrate')}
                        className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded hover:bg-green-200"
                      >
                        Migrar Productos
                      </button>
                      <button
                        onClick={() => executeSyncAction('clean')}
                        className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
                      >
                        ⚠️ Limpiar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {showSyncReport && (
            <div className="mt-4 pt-4 border-t border-red-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {syncValidation.orphanedInventory.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">
                      Productos Huérfanos en Inventario ({syncValidation.orphanedInventory.length})
                    </h4>
                    <div className="text-xs text-red-600 bg-red-100 p-2 rounded max-h-20 overflow-y-auto">
                      {syncValidation.orphanedInventory.map((id: string) => (
                        <div key={id}>ID: {id}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                {syncValidation.warnings.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-2">Advertencias</h4>
                    <div className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                      {syncValidation.warnings.map((warning: string, index: number) => (
                        <div key={index}>{warning}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Productos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProductos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.stockBajo}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingDown className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Agotados</p>
              <p className="text-2xl font-bold text-red-600">{stats.agotados}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.valorTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      {!showMovimientos ? (
        <>
          {/* Filtros y búsqueda */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <select
                  title="Filtrar por estado de stock"
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as 'all' | 'low' | 'out')}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="all">Todos los productos</option>
                  <option value="low">Stock bajo</option>
                  <option value="out">Agotados</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabla de productos */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Actual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Mínimo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Stock
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProductos.map((producto) => {
                    const stockStatus = getStockStatus(producto);
                    // Si el precio es 0, mostrar un valor de ejemplo para pruebas visuales
                    const precioReal = (producto.precio ?? 0) > 0 ? producto.precio : 5.5;
                    const valorStock = (producto.stock ?? 0) * precioReal;
                    return (
                      <tr key={producto.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{producto.nombre || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{producto.sku || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{producto.categoria?.nombre || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {(producto.stock ?? 0)} {producto.unidadMedida?.simbolo || ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {(producto.stockMinimo ?? 0)} {producto.unidadMedida?.simbolo || ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatCurrency(precioReal)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                            {stockStatus.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatCurrency(valorStock)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {filteredProductos.length === 0 && (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || stockFilter !== 'all' 
                    ? 'No se encontraron productos con los filtros aplicados.'
                    : 'Comienza agregando productos al inventario.'
                  }
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Vista de movimientos */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Movimientos Recientes de Inventario</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Anterior
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Nuevo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motivo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movimientos.map((movimiento) => (
                  <tr key={movimiento.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(movimiento.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{movimiento.producto.nombre}</div>
                      {movimiento.producto.sku && (
                        <div className="text-sm text-gray-500">{movimiento.producto.sku}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        movimiento.tipo === 'ENTRADA' ? 'text-green-800 bg-green-100' :
                        movimiento.tipo === 'SALIDA' ? 'text-red-800 bg-red-100' :
                        'text-blue-800 bg-blue-100'
                      }`}>
                        {movimiento.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{movimiento.cantidad}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{movimiento.cantidadAnterior}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{movimiento.cantidadNueva}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{movimiento.usuario.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{movimiento.motivo || '-'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {movimientos.length === 0 && (
            <div className="text-center py-12">
              <RotateCcw className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay movimientos</h3>
              <p className="mt-1 text-sm text-gray-500">
                Los movimientos de inventario aparecerán aquí.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
