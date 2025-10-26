'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Package, 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  AlertCircle, 
  Loader2,
  Eye,
  EyeOff,
  Tag,
  DollarSign,
  Package2,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';

// Interfaces para los tipos de datos
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

interface ProductosProveedorVistaModalProps {
  isOpen: boolean;
  onClose: () => void;
  proveedorId: string;
  proveedorNombre?: string;
}

const ProductosProveedorVistaModal: React.FC<ProductosProveedorVistaModalProps> = ({
  isOpen,
  onClose,
  proveedorId,
  proveedorNombre
}) => {
  // Estados
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [sortBy, setSortBy] = useState('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Obtener categorías únicas de los productos
  const categorias = React.useMemo(() => {
    if (!data?.productos) return [];
    const categoriasUnicas = new Map();
    data.productos.forEach(producto => {
      if (producto.categoria) {
        categoriasUnicas.set(producto.categoria.id, producto.categoria);
      }
    });
    return Array.from(categoriasUnicas.values());
  }, [data?.productos]);

  // Función para cargar datos
  const fetchProductos = useCallback(async () => {
    if (!proveedorId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        includeInactive: includeInactive.toString(),
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/proveedores/${proveedorId}/productos?${params}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result: ApiResponse = await response.json();
      
      if (!result.success) {
        throw new Error('Error al cargar productos');
      }
      
      setData(result);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [proveedorId, currentPage, itemsPerPage, searchTerm, includeInactive, sortBy, sortOrder]);

  // Efecto para cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen && proveedorId) {
      fetchProductos();
    }
  }, [isOpen, proveedorId, fetchProductos]);

  // Efecto para prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  // Efecto para resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, includeInactive, sortBy, sortOrder, selectedCategory]);

  // Filtrar productos por categoría
  const productosFiltrados = React.useMemo(() => {
    if (!data?.productos) return [];
    
    let productos = data.productos;
    
    if (selectedCategory) {
      productos = productos.filter(producto => 
        producto.categoria?.id === selectedCategory
      );
    }
    
    return productos;
  }, [data?.productos, selectedCategory]);

  // Función para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Función para manejar cambio de ordenamiento
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Función para limpiar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setIncludeInactive(false);
    setSortBy('nombre');
    setSortOrder('asc');
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden relative z-[10000]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <Package className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Productos del Proveedor
              </h2>
              <p className="text-sm text-gray-600">
                {data?.proveedor?.nombre || proveedorNombre || 'Cargando...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(95vh-80px)]">
          {/* Estadísticas */}
          {data?.estadisticas && (
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2">
                    <Package2 className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-gray-600">Total</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {data.estadisticas.totalProductos}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-gray-600">Activos</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {data.estadisticas.productosActivos}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-medium text-gray-600">Directos</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {data.estadisticas.productosDirectos}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-medium text-gray-600">Históricos</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {data.estadisticas.productosHistoricos}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm col-span-2">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-yellow-600" />
                    <span className="text-xs font-medium text-gray-600">Valor Inventario</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {formatCurrency(data.estadisticas.valorInventario)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filtros y búsqueda */}
          <div className="p-6 border-b border-gray-200 bg-white">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Búsqueda */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Controles de filtros */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                    showFilters 
                      ? 'bg-blue-50 border-blue-200 text-blue-700' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span>Filtros</span>
                </button>

                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Limpiar
                </button>

                <button
                  onClick={fetchProductos}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  <span>Actualizar</span>
                </button>
              </div>
            </div>

            {/* Panel de filtros expandible */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Filtro por categoría */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Todas las categorías</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro de disponibilidad */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Disponibilidad
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={includeInactive}
                        onChange={(e) => setIncludeInactive(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Incluir inactivos</span>
                    </label>
                  </div>

                  {/* Ordenamiento */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ordenar por
                    </label>
                    <div className="flex space-x-2">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="nombre">Nombre</option>
                        <option value="sku">SKU</option>
                        <option value="precio">Precio</option>
                        <option value="stock">Stock</option>
                      </select>
                      <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {sortOrder === 'asc' ? (
                          <SortAsc className="w-4 h-4" />
                        ) : (
                          <SortDesc className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lista de productos */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="text-gray-600">Cargando productos...</span>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar productos</h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <button
                    onClick={fetchProductos}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            ) : !productosFiltrados.length ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos</h3>
                  <p className="text-gray-600">
                    {searchTerm || selectedCategory 
                      ? 'No se encontraron productos con los filtros aplicados'
                      : 'Este proveedor no tiene productos registrados'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-auto h-full">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('nombre')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Producto</span>
                          {sortBy === 'nombre' && (
                            sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoría
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('precio')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Precio</span>
                          {sortBy === 'precio' && (
                            sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('stock')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Stock</span>
                          {sortBy === 'stock' && (
                            sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                          )}
                        </div>
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
                    {productosFiltrados.map((producto) => (
                      <tr key={producto.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {producto.nombre}
                            </div>
                            {producto.sku && (
                              <div className="text-sm text-gray-500">
                                SKU: {producto.sku}
                              </div>
                            )}
                            {producto.descripcion && (
                              <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                                {producto.descripcion}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {producto.categoria ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <Tag className="w-3 h-3 mr-1" />
                              {producto.categoria.nombre}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">Sin categoría</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(producto.precio)}
                          </div>
                          {producto.unidadMedida && (
                            <div className="text-xs text-gray-500">
                              por {producto.unidadMedida.abreviatura}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {producto.stock.toLocaleString()}
                          </div>
                          {producto.stock <= producto.stockMinimo && (
                            <div className="text-xs text-red-600 font-medium">
                              ⚠ Stock bajo
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            producto.relacion.tipo === 'directo'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {producto.relacion.tipo === 'directo' ? 'Directo' : 'Histórico'}
                          </span>
                          {producto.relacion.tipo === 'directo' && producto.relacion.precioCompra && (
                            <div className="text-xs text-gray-500 mt-1">
                              Compra: {formatCurrency(producto.relacion.precioCompra)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            producto.activo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {producto.activo ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Activo
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Inactivo
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Paginación */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Mostrando {((data.pagination.page - 1) * data.pagination.limit) + 1} a{' '}
                  {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} de{' '}
                  {data.pagination.total} productos
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={!data.pagination.hasPrev}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-2 text-sm text-gray-700">
                    Página {data.pagination.page} de {data.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!data.pagination.hasNext}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null;
};

export default ProductosProveedorVistaModal;