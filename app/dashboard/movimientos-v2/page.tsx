'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw, 
  Search, 
  Filter, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  Calendar,
  User,
  FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useMovimientos } from '../../../src/hooks/useMovimientos';
import CreateMovimientoModal from '../../../src/components/dashboard/movimientos/CreateMovimientoModal';
import MovimientoDetailModal from '../../../src/components/dashboard/movimientos/MovimientoDetailModal';
// Removed problematic imports - using inline components instead
import type { TipoMovimiento, MovimientoInventario, Producto } from '../../../src/types/todafru';

// Local minimal types for movimiento payloads (the hook defines compatible types)
interface MovimientoCreate {
  productoId: string;
  tipo: TipoMovimiento;
  cantidad: number;
  precio?: number;
  motivo?: string;
  numeroGuia?: string;
}

interface MovimientoUpdate {
  motivo?: string;
  numeroGuia?: string;
}

interface MovimientoFilters {
  productoId?: string;
  tipo?: TipoMovimiento;
  fechaDesde?: string;
  fechaHasta?: string;
  motivo?: string;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

export default function MovimientosV2Page() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'movimientos' | 'estadisticas'>('movimientos');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMovimiento, setSelectedMovimiento] = useState<MovimientoInventario | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Estado para productos
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [productosError, setProductosError] = useState<string | null>(null);

  // Filtros locales
  const [filters, setFilters] = useState<MovimientoFilters>({
    page: 1,
    limit: 20
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<TipoMovimiento | 'all'>('all');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Hook personalizado para manejar movimientos
  const {
    movimientos,
    loading,
    error,
    pagination,
    estadisticas,
    syncStatus,
    lastSync,
    fetchMovimientos,
    createMovimiento,
    updateMovimiento,
    deleteMovimiento,
    getMovimiento,
    fetchEstadisticas,
    refreshData,
    clearError,
    resetFilters
  } = useMovimientos();

  // Formatear fecha para mostrar
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Obtener color del tipo de movimiento
  const getTipoColor = (tipo: TipoMovimiento) => {
    switch (tipo) {
      case 'ENTRADA':
        return 'text-green-800 bg-green-100';
      case 'SALIDA':
        return 'text-red-800 bg-red-100';
      case 'AJUSTE':
        return 'text-blue-800 bg-blue-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  };

  // Obtener icono del tipo de movimiento
  const getTipoIcon = (tipo: TipoMovimiento) => {
    switch (tipo) {
      case 'ENTRADA':
        return <TrendingUp className="h-4 w-4" />;
      case 'SALIDA':
        return <TrendingDown className="h-4 w-4" />;
      case 'AJUSTE':
        return <RotateCcw className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  // Cargar productos
  const fetchProductos = async () => {
    setLoadingProductos(true);
    setProductosError(null);
    try {
      const response = await fetch('/api/productos');
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success) {
        setProductos(data.productos || []);
      } else {
        throw new Error(data.message || 'Error al cargar productos');
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al cargar productos';
      setProductosError(errorMessage);
      toast.error('Error al cargar la lista de productos');
    } finally {
      setLoadingProductos(false);
    }
  };

  // Ver detalle de movimiento con manejo de errores
  const handleViewDetail = async (movimientoId: string) => {
    try {
      const movimiento = await getMovimiento(movimientoId);
      if (movimiento) {
        setSelectedMovimiento(movimiento);
        setShowDetailModal(true);
      } else {
        toast.error('No se pudo cargar el detalle del movimiento');
      }
    } catch (error) {
      console.error('Error al cargar detalle:', error);
      toast.error('Error al cargar el detalle del movimiento');
    }
  };

  // Eliminar movimiento con manejo de errores mejorado
  const handleDelete = async (movimientoId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este movimiento? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const success = await deleteMovimiento(movimientoId);
      if (success) {
        toast.success('Movimiento eliminado exitosamente');
      } else {
        toast.error('No se pudo eliminar el movimiento');
      }
    } catch (error) {
      console.error('Error al eliminar movimiento:', error);
      toast.error('Error al eliminar el movimiento');
    }
  };

  // Manejar creación/edición de movimiento
  const handleSaveMovimiento = async (data: MovimientoCreate | Partial<MovimientoUpdate>) => {
    try {
      if (selectedMovimiento) {
        // Editar movimiento existente
  const success = await updateMovimiento(selectedMovimiento.id, data as MovimientoUpdate);
        return success;
      } else {
        // Crear nuevo movimiento
  const success = await createMovimiento(data as MovimientoCreate);
        return success;
      }
    } catch (error) {
      console.error('Error al guardar movimiento:', error);
      return false;
    }
  };

  // Cerrar modal de creación/edición
  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setSelectedMovimiento(null);
  };

  // Aplicar filtros
  const applyFilters = useCallback(() => {
    const newFilters: MovimientoFilters = {
      page: 1,
      limit: filters.limit || 20,
      ...(tipoFilter !== 'all' && { tipo: tipoFilter }),
      ...(fechaDesde && { fechaDesde: new Date(fechaDesde).toISOString() }),
      ...(fechaHasta && { fechaHasta: new Date(fechaHasta).toISOString() }),
      ...(searchTerm && { motivo: searchTerm })
    };

  setFilters(newFilters);
  fetchMovimientos(newFilters);
  }, [tipoFilter, fechaDesde, fechaHasta, searchTerm, filters.limit, fetchMovimientos]);

  // Limpiar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setTipoFilter('all');
    setFechaDesde('');
    setFechaHasta('');
    setFilters({ page: 1, limit: 20 });
    resetFilters();
  };

  // Cambiar página
  const changePage = (newPage: number) => {
    const newFilters = { ...filters, page: newPage };
    setFilters(newFilters);
    fetchMovimientos(newFilters);
  };

  // Efecto para aplicar filtros cuando cambien
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      applyFilters();
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [searchTerm, tipoFilter, fechaDesde, fechaHasta]);

  // Cargar estadísticas cuando cambie a esa pestaña
  useEffect(() => {
    if (activeTab === 'estadisticas') {
      fetchEstadisticas();
    }
  }, [activeTab, fetchEstadisticas]);

  // Cargar productos al montar el componente
  useEffect(() => {
    fetchProductos();
  }, []);

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Movimientos de Inventario</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona los movimientos de entrada, salida y ajustes de inventario
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={refreshData}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Movimiento
            </button>
          </div>
        </div>

        {/* Estado de sincronización */}
        {syncStatus !== 'idle' && (
          <div className={`rounded-md p-4 ${
            syncStatus === 'success' ? 'bg-green-50 border border-green-200' :
            syncStatus === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center">
              {syncStatus === 'syncing' && <RefreshCw className="h-5 w-5 text-blue-600 animate-spin mr-2" />}
              {syncStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-600 mr-2" />}
              {syncStatus === 'error' && <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />}
              <span className={`text-sm font-medium ${
                syncStatus === 'success' ? 'text-green-800' :
                syncStatus === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {syncStatus === 'syncing' && 'Sincronizando datos...'}
                {syncStatus === 'success' && `Datos actualizados ${lastSync ? new Date(lastSync).toLocaleTimeString() : ''}`}
                {syncStatus === 'error' && 'Error en la sincronización'}
              </span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('movimientos')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'movimientos'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Movimientos
            </button>
            <button
              onClick={() => setActiveTab('estadisticas')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'estadisticas'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Estadísticas
            </button>
          </nav>
        </div>

        {/* Contenido de las tabs */}
        {activeTab === 'movimientos' && (
          <div className="space-y-6">
            {/* Filtros */}
            {showFilters && (
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Buscar
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por producto o motivo..."
                        className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo
                    </label>
                    <select
                      value={tipoFilter}
                      onChange={(e) => setTipoFilter(e.target.value as TipoMovimiento | 'all')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="all">Todos los tipos</option>
                      <option value="ENTRADA">Entrada</option>
                      <option value="SALIDA">Salida</option>
                      <option value="AJUSTE">Ajuste</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha desde
                    </label>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha hasta
                    </label>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={applyFilters}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 disabled:opacity-50"
                  >
                    Aplicar Filtros
                  </button>
                </div>
              </div>
            )}

            {/* Controles */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              </button>

              <div className="text-sm text-gray-500">
                {movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Error state para productos */}
            {productosError && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar productos</h3>
                  <p className="text-gray-500 mb-4">{productosError}</p>
                  <button
                    onClick={fetchProductos}
                    className="bg-red-100 px-4 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            {/* Error state general */}
            {error && !loading && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar movimientos</h3>
                  <p className="text-gray-500 mb-4">{error}</p>
                  <button
                    onClick={() => fetchMovimientos()}
                    className="bg-red-100 px-4 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && movimientos.length === 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Tabla de movimientos */}
            {!loading && !error && movimientos.length > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      Movimientos de Inventario
                      {pagination && (
                        <span className="ml-2 text-sm text-gray-500">
                          ({pagination.total} total)
                        </span>
                      )}
                    </h3>
                  </div>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {movimientos.map((movimiento) => (
                        <tr key={movimiento.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 text-gray-400 mr-2" />
                              <div className="text-sm text-gray-900">
                                {formatDate(movimiento.createdAt.toISOString())}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {movimiento.producto?.nombre || 'Producto no disponible'}
                            </div>
                            {movimiento.producto?.sku && (
                              <div className="text-sm text-gray-500 font-mono">
                                {movimiento.producto.sku}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTipoColor(movimiento.tipo)}`}>
                              {getTipoIcon(movimiento.tipo)}
                              <span className="ml-1">{movimiento.tipo}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              {movimiento.cantidad} {movimiento.producto?.unidadMedida?.simbolo || ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {movimiento.cantidadAnterior} {movimiento.producto?.unidadMedida?.simbolo || ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              {movimiento.cantidadNueva} {movimiento.producto?.unidadMedida?.simbolo || ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="h-4 w-4 text-gray-400 mr-2" />
                              <div className="text-sm text-gray-900">
                                Usuario ID: {movimiento.usuarioId}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <div className="text-sm text-gray-900 truncate" title={movimiento.motivo || '-'}>
                              {movimiento.motivo || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => handleViewDetail(movimiento.id)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Ver detalle"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedMovimiento(movimiento);
                                  setShowCreateModal(true);
                                }}
                                className="text-yellow-600 hover:text-yellow-800"
                                title="Editar"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(movimiento.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => changePage(pagination.page - 1)}
                        disabled={!pagination.hasPrev}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => changePage(pagination.page + 1)}
                        disabled={!pagination.hasNext}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Siguiente
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Mostrando{' '}
                          <span className="font-medium">
                            {(pagination.page - 1) * pagination.limit + 1}
                          </span>{' '}
                          a{' '}
                          <span className="font-medium">
                            {Math.min(pagination.page * pagination.limit, pagination.total)}
                          </span>{' '}
                          de{' '}
                          <span className="font-medium">{pagination.total}</span> resultados
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          <button
                            onClick={() => changePage(pagination.page - 1)}
                            disabled={!pagination.hasPrev}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Anterior
                          </button>
                          
                          {/* Números de página */}
                          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            const pageNum = Math.max(1, pagination.page - 2) + i;
                            if (pageNum > pagination.totalPages) return null;
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => changePage(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  pageNum === pagination.page
                                    ? 'z-10 bg-orange-50 border-orange-500 text-orange-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          
                          <button
                            onClick={() => changePage(pagination.page + 1)}
                            disabled={!pagination.hasNext}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Siguiente
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && movimientos.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay movimientos
                </h3>
                <p className="text-gray-500 mb-6">
                  No se encontraron movimientos con los filtros aplicados.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer movimiento
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab de estadísticas */}
        {activeTab === 'estadisticas' && (
          <div className="space-y-6">
            {loading && !estadisticas && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow p-6">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && !loading && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar estadísticas</h3>
                  <p className="text-gray-500 mb-4">{error}</p>
                  <button
                    onClick={() => fetchEstadisticas()}
                    className="bg-red-100 px-4 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && estadisticas && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Estadísticas de Movimientos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Resumen general */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <Package className="h-8 w-8 text-blue-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-blue-600">Total Movimientos</p>
                          <p className="text-2xl font-semibold text-blue-900">
                            {estadisticas.resumen?.totalMovimientos || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Por tipo */}
                    {estadisticas.porTipo?.map((t: Record<string, unknown>) => {
                      const tipoName = String(t.tipo ?? '');
                      const cantidad = Number(t.cantidad ?? 0);
                      const porcentaje = Number(t.porcentaje ?? 0);
                      return (
                        <div key={tipoName} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center">
                            {getTipoIcon(tipoName as TipoMovimiento)}
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-600">{tipoName}</p>
                              <p className="text-2xl font-semibold text-gray-900">{cantidad}</p>
                              <p className="text-xs text-gray-500">{porcentaje}%</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modales */}
        <CreateMovimientoModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={async (data) => {
            try {
              const result = await createMovimiento(data);
              return result !== null;
            } catch (error) {
              return false;
            }
          }}
          productos={productos}
        />

        <MovimientoDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          movimiento={selectedMovimiento}
        />
      </div>
  );
}