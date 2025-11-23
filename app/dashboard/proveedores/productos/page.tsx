"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Package, 
  ArrowLeft, 
  Grid3X3, 
  List, 
  Eye,
  AlertTriangle,
  Loader2,
  ShoppingCart,
  Tag,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react';
import { ChevronLeftIcon, MagnifyingGlassIcon, FunnelIcon, Squares2X2Icon, ListBulletIcon, XMarkIcon, ChevronRightIcon, EyeIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

// Interfaces
interface Categoria {
  id: string;
  nombre: string;
}

interface UnidadMedida {
  id: string;
  nombre: string;
  abreviatura: string;
}

interface RelacionProveedor {
  tipo: 'directo' | 'historico';
  precioCompra?: number;
  tiempoEntrega?: number;
  cantidadMinima?: number;
  fechaCreacion?: string;
  activo?: boolean;
  ultimoPrecio?: number;
  ultimaCompra?: string;
  numeroPedido?: string;
}

interface Producto {
  id: string;
  nombre: string;
  sku: string | null;
  descripcion: string | null;
  precio: number;
  stock: number;
  stockMinimo: number;
  activo: boolean;
  categoria: Categoria | null;
  unidadMedida: UnidadMedida | null;
  relacion: RelacionProveedor;
}

interface Proveedor {
  id: string;
  nombre: string;
  activo: boolean;
}

interface Estadisticas {
  totalProductos: number;
  productosDirectos: number;
  productosHistoricos: number;
  productosActivos: number;
  valorInventario: number;
  tieneRelacionesDirectas: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ApiResponse {
  success: boolean;
  proveedor: Proveedor;
  productos: Producto[];
  estadisticas: Estadisticas;
  pagination: Pagination;
  filters: {
    search: string;
    includeInactive: boolean;
    sortBy: string;
    sortOrder: string;
  };
}

export default function ProductosProveedorPage() {
  const searchParams = useSearchParams();
  const proveedorId = searchParams.get('id');
  const proveedorNombre = searchParams.get('nombre');

  // Estados principales
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados de filtros y vista
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [tipoRelacionFilter, setTipoRelacionFilter] = useState<'all' | 'directo' | 'historico'>('all');
  const [disponibilidadFilter, setDisponibilidadFilter] = useState<'all' | 'disponible' | 'agotado'>('all');
  const [sortBy, setSortBy] = useState<'nombre' | 'precio' | 'stock' | 'ultimaCompra'>('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  // Paginación
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Cargar datos al montar el componente
  useEffect(() => {
    if (proveedorId) {
      loadProductos();
    }
  }, [proveedorId, searchTerm, statusFilter, tipoRelacionFilter, disponibilidadFilter, sortBy, sortOrder, currentPage]);

  const loadProductos = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        search: searchTerm,
        includeInactive: statusFilter === 'all' ? 'true' : statusFilter === 'inactive' ? 'true' : 'false',
        tipoRelacion: tipoRelacionFilter,
        sortBy,
        sortOrder,
        page: String(currentPage ?? 1),
        limit: '50'
      });

      if (disponibilidadFilter !== 'all') {
        params.append('disponible', disponibilidadFilter === 'disponible' ? 'true' : 'false');
      }

      const response = await fetch(`/api/proveedores/${proveedorId}/productos?${params}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al cargar los productos');
      }

      setData(result);
      // sincroniza la página actual con la respuesta del servidor
      try {
        if (result?.pagination?.page) setCurrentPage(Number(result.pagination.page));
      } catch {}
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setError(error instanceof Error ? error.message : 'Error inesperado al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Función para formatear precio
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(price);
  };

  // Filtrar productos
  const filteredProductos = data?.productos.filter(producto => {
    const matchesSearch = !searchTerm || 
      producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (producto.sku && producto.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (producto.descripcion && producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && producto.activo) ||
      (statusFilter === 'inactive' && !producto.activo);

    const matchesTipoRelacion = tipoRelacionFilter === 'all' || 
      producto.relacion.tipo === tipoRelacionFilter;

    const matchesDisponibilidad = disponibilidadFilter === 'all' ||
      (disponibilidadFilter === 'disponible' && producto.stock > 0) ||
      (disponibilidadFilter === 'agotado' && producto.stock === 0);

    return matchesSearch && matchesStatus && matchesTipoRelacion && matchesDisponibilidad;
  }) || [];

  // Función para limpiar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('active');
    setTipoRelacionFilter('all');
    setDisponibilidadFilter('all');
    setSortBy('nombre');
    setSortOrder('asc');
  };

  if (!proveedorId) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="font-medium text-red-700">Error</span>
          </div>
          <p className="text-red-600 mt-2">ID de proveedor no especificado</p>
          <Link 
            href="/dashboard/proveedores"
            className="mt-3 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Proveedores
          </Link>
        </div>

        {/* Panel de filtros expandido */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Tipo de relación</label>
                <select
                  value={tipoRelacionFilter}
                  onChange={(e) => setTipoRelacionFilter(e.target.value as 'all' | 'directo' | 'historico')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black bg-white"
                >
                  <option value="all">Todas las relaciones</option>
                  <option value="directo">Solo directos</option>
                  <option value="historico">Solo históricos</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Disponibilidad</label>
                <select
                  value={disponibilidadFilter}
                  onChange={(e) => setDisponibilidadFilter(e.target.value as 'all' | 'disponible' | 'agotado')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black bg-white"
                >
                  <option value="all">Todas las disponibilidades</option>
                  <option value="disponible">Solo disponibles</option>
                  <option value="agotado">Solo agotados</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Limpiar filtros</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            <span className="text-black font-medium">Cargando productos...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="font-medium text-red-700">Error al cargar productos</span>
          </div>
          <p className="text-red-600 mt-2">{error}</p>
          <div className="mt-3 flex space-x-3">
            <button
              onClick={loadProductos}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reintentar
            </button>
            <Link 
              href="/dashboard/proveedores"
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Proveedores
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <Link 
            href="/dashboard/proveedores"
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver a Proveedores
          </Link>
          <div className="border-l border-gray-300 pl-4">
            <h1 className="text-2xl font-bold text-black">
              Productos de {data?.proveedor.nombre || proveedorNombre}
            </h1>
            <p className="text-black mt-1">
              {filteredProductos.length} producto{filteredProductos.length !== 1 ? 's' : ''} encontrado{filteredProductos.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        {data?.estadisticas && (
          <div className="flex flex-wrap gap-4">
            <div className="bg-blue-50 px-3 py-2 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total</div>
              <div className="text-lg font-bold text-blue-800">{data.estadisticas.totalProductos}</div>
            </div>
            <div className="bg-green-50 px-3 py-2 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Directos</div>
              <div className="text-lg font-bold text-green-800">{data.estadisticas.productosDirectos}</div>
            </div>
            <div className="bg-orange-50 px-3 py-2 rounded-lg">
              <div className="text-sm text-orange-600 font-medium">Históricos</div>
              <div className="text-lg font-bold text-orange-800">{data.estadisticas.productosHistoricos}</div>
            </div>
            <div className="bg-purple-50 px-3 py-2 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Valor</div>
              <div className="text-lg font-bold text-purple-800">{formatPrice(data.estadisticas.valorInventario)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Filtros y controles */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nombre, SKU o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black"
              />
            </div>
          </div>

          {/* Controles */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 border rounded-lg flex items-center space-x-2 ${
                showFilters 
                  ? 'bg-green-50 border-green-300 text-green-700' 
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
            </button>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black bg-white"
            >
              <option value="active">Solo activos</option>
              <option value="all">Todos los estados</option>
              <option value="inactive">Solo inactivos</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as 'nombre' | 'precio' | 'stock' | 'ultimaCompra');
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black bg-white"
            >
              <option value="nombre-asc">Nombre A-Z</option>
              <option value="nombre-desc">Nombre Z-A</option>
              <option value="precio-asc">Precio menor</option>
              <option value="precio-desc">Precio mayor</option>
              <option value="stock-asc">Stock menor</option>
              <option value="stock-desc">Stock mayor</option>
            </select>

            {/* Toggle de vista */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 flex items-center space-x-1 transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                <span className="hidden sm:inline">Cuadrícula</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 flex items-center space-x-1 transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>
          </div>
        </div>

        {/* Panel de filtros expandido */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Tipo de relación</label>
                <select
                  value={tipoRelacionFilter}
                  onChange={(e) => setTipoRelacionFilter(e.target.value as 'all' | 'directo' | 'historico')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black bg-white"
                >
                  <option value="all">Todas las relaciones</option>
                  <option value="directo">Solo directos</option>
                  <option value="historico">Solo históricos</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Disponibilidad</label>
                <select
                  value={disponibilidadFilter}
                  onChange={(e) => setDisponibilidadFilter(e.target.value as 'all' | 'disponible' | 'agotado')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black bg-white"
                >
                  <option value="all">Todas las disponibilidades</option>
                  <option value="disponible">Solo disponibles</option>
                  <option value="agotado">Solo agotados</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Limpiar filtros</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de productos */}
      {filteredProductos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-black mb-2">
                  {searchTerm || statusFilter !== 'all' || tipoRelacionFilter !== 'all'
                    ? 'No se encontraron productos' 
                    : 'No hay productos asociados'}
                </p>
                <p className="text-gray-600 text-sm">
                  {searchTerm || statusFilter !== 'all' || tipoRelacionFilter !== 'all'
                    ? 'Intenta ajustar los filtros de búsqueda' 
                    : 'Este proveedor no tiene productos asociados'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {viewMode === 'grid' ? (
            // Vista de cuadrícula
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProductos.map((producto) => (
                <ProductCard key={producto.id} producto={producto} />
              ))}
            </div>
          ) : (
            // Vista de lista
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
                      Precio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Relación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProductos.map((producto) => (
                    <ProductRow key={producto.id} producto={producto} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Paginación */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-lg">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                   onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                   disabled={!data.pagination.hasPrev}
                   className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   Anterior
                 </button>
                 <button
                   onClick={() => setCurrentPage(Math.min(data.pagination.totalPages, currentPage + 1))}
                   disabled={!data.pagination.hasNext}
                   className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   Siguiente
                 </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrando{' '}
                    <span className="font-medium">{((data.pagination.page - 1) * data.pagination.limit) + 1}</span>
                    {' '}a{' '}
                    <span className="font-medium">
                      {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)}
                    </span>
                    {' '}de{' '}
                    <span className="font-medium">{data.pagination.total}</span>
                    {' '}productos
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                       onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                       disabled={!data.pagination.hasPrev}
                       className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       <span className="sr-only">Anterior</span>
                       <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                     </button>
                    
                    {/* Números de página */}
                    {(() => {
                      const totalPages = data.pagination.totalPages;
                      const current = data.pagination.page;
                      const pages = [];
                      
                      // Lógica para mostrar páginas relevantes
                      let startPage = Math.max(1, current - 2);
                      let endPage = Math.min(totalPages, current + 2);
                      
                      // Ajustar si estamos cerca del inicio o final
                      if (current <= 3) {
                        endPage = Math.min(5, totalPages);
                      }
                      if (current >= totalPages - 2) {
                        startPage = Math.max(1, totalPages - 4);
                      }
                      
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                              i === current
                                ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }
                      
                      return pages;
                    })()}
                    
                    <button
                       onClick={() => setCurrentPage(Math.min(data.pagination.totalPages, currentPage + 1))}
                       disabled={!data.pagination.hasNext}
                       className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       <span className="sr-only">Siguiente</span>
                       <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                     </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Estadísticas adicionales */}
      {data?.estadisticas && (
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Estadísticas del Proveedor</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.estadisticas.totalProductos}</div>
              <div className="text-sm text-gray-500">Total Productos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{data.estadisticas.productosActivos}</div>
              <div className="text-sm text-gray-500">Productos Activos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{data.estadisticas.productosDirectos}</div>
              <div className="text-sm text-gray-500">Relaciones Directas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatPrice(data.estadisticas.valorInventario)}
              </div>
              <div className="text-sm text-gray-500">Valor Inventario</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente de tarjeta de producto
function ProductCard({ producto }: { producto: Producto }) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStockStatus = (stock: number, stockMinimo: number) => {
    if (stock === 0) return { color: 'text-red-600', bg: 'bg-red-50', text: 'Agotado' };
    if (stock <= stockMinimo) return { color: 'text-orange-600', bg: 'bg-orange-50', text: 'Stock bajo' };
    return { color: 'text-green-600', bg: 'bg-green-50', text: 'Disponible' };
  };

  const stockStatus = getStockStatus(producto.stock, producto.stockMinimo);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Imagen placeholder */}
      <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
        <Package className="w-8 h-8 text-gray-400" />
      </div>

      {/* Header de la tarjeta */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-black truncate text-sm" title={producto.nombre}>
            {producto.nombre}
          </h3>
          {producto.sku && (
            <p className="text-xs text-gray-500 mt-1 font-mono">SKU: {producto.sku}</p>
          )}
        </div>
        <div className="ml-2">
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            producto.activo 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {producto.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>

      {/* Descripción */}
      <p className="text-xs text-gray-500 mb-3 line-clamp-2" title={producto.descripcion || 'Sin descripción'}>
        {producto.descripcion || 'Sin descripción'}
      </p>

      {/* Información principal */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-black">{formatPrice(producto.precio)}</span>
          {producto.categoria && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              {producto.categoria.nombre}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span className={`font-medium ${
            producto.stock > producto.stockMinimo 
              ? 'text-green-600' 
              : producto.stock > 0 
                ? 'text-yellow-600' 
                : 'text-red-600'
          }`}>
            Stock: {producto.stock}
            {producto.stockMinimo > 0 && (
              <span className="text-gray-400 ml-1">/ {producto.stockMinimo}</span>
            )}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${stockStatus.bg} ${stockStatus.color}`}>
            {stockStatus.text}
          </span>
        </div>

        {/* Unidad de medida */}
        {producto.unidadMedida && (
          <div className="text-xs text-gray-500">
            Unidad: {producto.unidadMedida.nombre} ({producto.unidadMedida.abreviatura})
          </div>
        )}
      </div>

      {/* Información de relación con proveedor */}
      <div className="border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full font-medium ${
            producto.relacion.tipo === 'directo' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {producto.relacion.tipo === 'directo' ? 'Directo' : 'Histórico'}
          </span>
        </div>
        
        {producto.relacion.tipo === 'directo' && (
          <div className="space-y-1 text-xs text-gray-600">
            {producto.relacion.precioCompra && (
              <div className="flex justify-between">
                <span>Precio compra:</span>
                <span className="font-medium text-green-600">{formatPrice(producto.relacion.precioCompra)}</span>
              </div>
            )}
            {producto.relacion.tiempoEntrega && (
              <div className="flex justify-between">
                <span>Entrega:</span>
                <span>{producto.relacion.tiempoEntrega} días</span>
              </div>
            )}
            {producto.relacion.cantidadMinima && (
              <div className="flex justify-between">
                <span>Mín. pedido:</span>
                <span>{producto.relacion.cantidadMinima}</span>
              </div>
            )}
          </div>
        )}
        
        {producto.relacion.tipo === 'historico' && (
          <div className="space-y-1 text-xs text-gray-600">
            {producto.relacion.ultimoPrecio && (
              <div className="flex justify-between">
                <span>Último precio:</span>
                <span className="font-medium text-orange-600">{formatPrice(producto.relacion.ultimoPrecio)}</span>
              </div>
            )}
            {producto.relacion.ultimaCompra && (
              <div className="flex justify-between">
                <span>Última compra:</span>
                <span>{formatDate(producto.relacion.ultimaCompra)}</span>
              </div>
            )}
            {producto.relacion.numeroPedido && (
              <div className="flex justify-between">
                <span>Pedido:</span>
                <span className="font-mono">{producto.relacion.numeroPedido}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botón de acción */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <button className="w-full text-blue-600 hover:text-blue-800 text-sm font-medium hover:bg-blue-50 py-2 rounded transition-colors">
          Ver detalles
        </button>
      </div>
    </div>
  );
}

// Componente de fila de producto para vista de lista
function ProductRow({ producto }: { producto: Producto }) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStockStatus = (stock: number, stockMinimo: number) => {
    if (stock === 0) return { color: 'text-red-600', bg: 'bg-red-50', text: 'Agotado' };
    if (stock <= stockMinimo) return { color: 'text-orange-600', bg: 'bg-orange-50', text: 'Stock bajo' };
    return { color: 'text-green-600', bg: 'bg-green-50', text: 'Disponible' };
  };

  const stockStatus = getStockStatus(producto.stock, producto.stockMinimo);

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <div className="max-w-xs">
          <div className="text-sm font-medium text-black truncate" title={producto.nombre}>
            {producto.nombre}
          </div>
          {producto.descripcion ? (
            <div className="text-sm text-gray-500 truncate" title={producto.descripcion}>
              {producto.descripcion}
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic">Sin descripción</div>
          )}
          {producto.unidadMedida && (
            <div className="text-xs text-gray-400 mt-1">
              {producto.unidadMedida.nombre} ({producto.unidadMedida.abreviatura})
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-black font-mono">
          {producto.sku || '-'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-black">
          {producto.categoria?.nombre || '-'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-black">
          {formatPrice(producto.precio)}
        </div>
        {producto.relacion.tipo === 'directo' && producto.relacion.precioCompra && (
          <div className="text-xs text-green-600">
            Compra: {formatPrice(producto.relacion.precioCompra)}
          </div>
        )}
        {producto.relacion.tipo === 'historico' && producto.relacion.ultimoPrecio && (
          <div className="text-xs text-orange-600">
            Último: {formatPrice(producto.relacion.ultimoPrecio)}
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${
            producto.stock > producto.stockMinimo 
              ? 'text-green-600' 
              : producto.stock > 0 
                ? 'text-yellow-600' 
                : 'text-red-600'
          }`}>
            {producto.stock}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${stockStatus.bg} ${stockStatus.color}`}>
            {stockStatus.text}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          Mín: {producto.stockMinimo}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="space-y-1">
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            producto.relacion.tipo === 'directo' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {producto.relacion.tipo === 'directo' ? 'Directo' : 'Histórico'}
          </span>
          {producto.relacion.ultimaCompra && (
            <div className="text-xs text-gray-500">
              {formatDate(producto.relacion.ultimaCompra)}
            </div>
          )}
          {producto.relacion.tiempoEntrega && (
            <div className="text-xs text-gray-500">
              Entrega: {producto.relacion.tiempoEntrega}d
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            producto.activo 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {producto.activo ? 'Activo' : 'Inactivo'}
          </span>
          <button className="text-blue-600 hover:text-blue-800 text-xs">
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}