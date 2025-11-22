'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Search, Plus, Package, Edit2, Trash2, ChevronUp, ChevronDown, CheckCircle } from 'lucide-react';
import { ProductoInventarioHooks, suscribirseInventarioEventos } from '../../../src/lib/producto-inventario-sync';

const Modal = dynamic(() => import('../../../src/components/ui/Modal'), { ssr: false });

interface ApiCategoria {
  id: string;
  nombre: string;
}

interface ApiUnidadMedida {
  id: string;
  nombre: string;
  simbolo: string;
}

interface Producto {
  id: string;
  nombre: string;
  sku?: string;
  descripcion?: string;
  precio: number;
  stock: number;
  stockMinimo: number;
  porcentajeMerma: number;
  // diasVencimiento removed from schema
  tieneIGV: boolean;
  activo: boolean;
  categoria?: { id: string; nombre: string };
  tipoArticulo?: { id: string; nombre: string };
  familia?: { id: string; nombre: string };
  subfamilia?: { id: string; nombre: string };
  unidadMedida: { id: string; nombre: string; simbolo: string };
  unidadCosteo?: { id: string; nombre: string; simbolo: string };
  marca?: { id: string; nombre: string };
  agrupador?: { id: string; nombre: string };
  razonSocialProductos?: Array<{
    razonSocial: { id: string; nombre: string };
  }>;
}

interface FormData {
  nombre: string;
  sku: string;
  descripcion: string;
  precio: number;
  stockMinimo: number;
  porcentajeMerma: number;
  // diasVencimiento removed from schema
  tieneIGV: boolean;
  categoriaId: string;
  tipoArticuloId: string;
  familiaId: string;
  subfamiliaId: string;
  unidadMedidaId: string;
  unidadCosteoId: string;
  marcaId: string;
  agrupadorId: string;
  razonSocialIds: string[];
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<keyof Producto>('nombre');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string>('');
  const [selectedFamiliaId, setSelectedFamiliaId] = useState<string>('');
  const [selectedSubfamiliaId, setSelectedSubfamiliaId] = useState<string>('');
  const [productosMenuOpen, setProductosMenuOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successProduct, setSuccessProduct] = useState<{ nombre: string; sku?: string } | null>(null);

  // Eliminados: datos mock para selects. Se obtendrán desde APIs reales.

  // Datos de API para categorÃ­as y unidades de medida
  const [apiCategorias, setApiCategorias] = useState<Array<{ id: string; nombre: string }>>([]);
  const [apiUnidades, setApiUnidades] = useState<Array<{ id: string; nombre: string; simbolo: string }>>([]);

  // Eliminado: razones sociales de ejemplo.

  // Funcion para generar SKU automatico (prioriza datos de API)
  const generateSKU = useCallback((nombre: string, categoriaId: string, familiaId: string) => {
    if (!nombre || !categoriaId) return '';

    const categoria = apiCategorias.find(c => c.id === categoriaId);
    // Sin catálogo de familias cargado aún, derivar código a partir del identificador

    const nombreParts = nombre.split(' ').slice(0, 2);
    const nombreCode = nombreParts.map(part => part.substring(0, 3).toUpperCase()).join('-');

    const categoriaCode = categoria ? categoria.nombre.substring(0, 3).toUpperCase() : 'GEN';
    const familiaCode = familiaId ? familiaId.substring(0, 3).toUpperCase() : '';

    const timestamp = Date.now().toString().slice(-3);

    return `${categoriaCode}-${familiaCode ? familiaCode + '-' : ''}${nombreCode}-${timestamp}`;
  }, [apiCategorias]);

  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    sku: '',
    descripcion: '',
    precio: 0,
    stockMinimo: 0,
    porcentajeMerma: 0,
    // diasVencimiento removed
    tieneIGV: true,
    categoriaId: '',
    tipoArticuloId: '',
    familiaId: '',
    subfamiliaId: '',
    unidadMedidaId: '',
    unidadCosteoId: '',
    marcaId: '',
    agrupadorId: '',
    razonSocialIds: [],
  });

  useEffect(() => {
    fetchProductos();
  }, []);

  // SuscripciÃ³n en tiempo real a eventos de inventario
  useEffect(() => {
    const unsubscribe = suscribirseInventarioEventos((evt) => {
      setProductos(prev => prev.map(p => {
        if (p.id !== evt.productoId) return p;
        if (evt.tipo === 'AJUSTE') {
          return { ...p, stock: evt.cantidadNueva };
        }
        const delta = evt.delta || 0;
        const nuevo = evt.tipo === 'ENTRADA' ? p.stock + delta : p.stock - delta;
        return { ...p, stock: Math.max(0, nuevo) };
      }));
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  // Leer query params para abrir modal de creaciÃ³n y aplicar filtros iniciales
  const searchParams = useSearchParams();
  useEffect(() => {
    const add = searchParams.get('add');
    const sub = searchParams.get('subfamiliaId') || '';
    const cat = searchParams.get('categoriaId') || '';
    const fam = searchParams.get('familiaId') || '';
    if (add) {
      resetForm();
      setShowModal(true);
    }
    if (cat) setSelectedCategoriaId(cat);
    if (fam) setSelectedFamiliaId(fam);
    if (sub) setSelectedSubfamiliaId(sub);
  }, [searchParams]);

  // Estado para errores de API y helper centralizado de fetch con credenciales
  const [apiError, setApiError] = useState<string>('');
  const apiFetch = async (url: string, init?: RequestInit) => {
    const res = await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', ...(init?.headers || {}) },
      ...init,
    });
    if (res.status === 401) {
      setApiError('No autorizado. Inicia sesiÃ³n para continuar.');
    }
    return res;
  };

  // SincronizaciÃ³n dinÃ¡mica de stock con Inventario
  useEffect(() => {
    const syncStockFromInventario = async () => {
      try {
        const ts = Date.now();
        const res = await apiFetch(`/api/inventario?action=productos&ts=${ts}`);
        if (!res.ok) return;
        const data = await res.json();
        const invProductos = Array.isArray(data?.productos) ? data.productos : [];
        if (invProductos.length > 0) {
          setProductos(prev => prev.map(p => {
            const inv = invProductos.find((ip: { id: string; stock?: number; stockMinimo?: number }) => ip.id === p.id);
            if (!inv) return p;
            return {
              ...p,
              stock: typeof inv.stock === 'number' ? inv.stock : p.stock,
              stockMinimo: typeof inv.stockMinimo === 'number' ? inv.stockMinimo : p.stockMinimo,
            };
          }));
        }
      } catch (error) {
        // silencioso: si falla, no interrumpir UI
        console.error('Error sincronizando inventario:', error);
      }
    };

  // primera sincronizaciÃ³n inmediata y luego cada 10s
  syncStockFromInventario();
  const id = setInterval(syncStockFromInventario, 10000);
  return () => clearInterval(id);
  }, []);

  // Cargar categorÃ­as y unidades desde API
  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        // Evitar cachÃ© del navegador/Next y forzar datos frescos
        const ts = Date.now();
        const [respCat, respUni] = await Promise.all([
          apiFetch(`/api/categorias?ts=${ts}`),
          apiFetch(`/api/unidades-medida?ts=${ts}`)
        ]);

        const [dataCat, dataUni] = await Promise.all([
          respCat.json(),
          respUni.json()
        ]);

        if (dataCat?.success && Array.isArray(dataCat.data)) {
          setApiCategorias(dataCat.data.map((c: ApiCategoria) => ({ id: c.id, nombre: c.nombre })));
        }
        if (dataUni?.success && Array.isArray(dataUni.data)) {
          const unidades = dataUni.data.map((u: ApiUnidadMedida) => ({ id: u.id, nombre: u.nombre, simbolo: u.simbolo }));
          setApiUnidades(unidades);
          // Aplicar unidad por defecto desde localStorage si existe y no hay valor actual
          const defaultUnidadId = typeof window !== 'undefined' ? localStorage.getItem('defaultUnidadMedidaId') : null;
          if (defaultUnidadId && !formData.unidadMedidaId && unidades.some((u: ApiUnidadMedida) => u.id === defaultUnidadId)) {
            setFormData(prev => ({ ...prev, unidadMedidaId: defaultUnidadId as string }));
          }
        }
      } catch (error) {
        console.error('Error cargando catÃ¡logos de API:', error);
      }
    };
    // Cargar una sola vez al montar para estado inicial
    cargarCatalogos();
  }, []);

  // Efecto para generar SKU automatico
  useEffect(() => {
    if (formData.nombre && formData.categoriaId && !editingProduct) {
      const generatedSKU = generateSKU(formData.nombre, formData.categoriaId, formData.familiaId);
      setFormData(prev => ({ ...prev, sku: generatedSKU }));
    }
  }, [formData.nombre, formData.categoriaId, formData.familiaId, editingProduct, generateSKU]);

  const fetchProductos = async () => {
    setLoading(true);
    try {
      const ts = Date.now();
      const response = await apiFetch(`/api/productos?limit=100&ts=${ts}`);
      if (!response.ok) {
        // 401 ya fue notificado por apiFetch; evitar fallback en producciÃ³n
        if (response.status !== 401) {
          const text = await response.text().catch(() => '');
          console.error('Error HTTP en productos:', response.status, text);
          setApiError('No se pudo cargar productos.');
          setProductos([]);
        }
        return;
      }
      const data = await response.json();
      
      if (data.success) {
        const apiList: Producto[] = data.data || [];
        setProductos(apiList);
      } else {
        console.error('Error en la respuesta de la API:', data.error);
        setApiError(data.error || 'Error al cargar productos');
        setProductos([]);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      sku: '',
      descripcion: '',
      precio: 0,
      stockMinimo: 0,
      porcentajeMerma: 0,
      tieneIGV: true,
      categoriaId: '',
      tipoArticuloId: '',
      familiaId: '',
      subfamiliaId: '',
      unidadMedidaId: '',
      unidadCosteoId: '',
      marcaId: '',
      agrupadorId: '',
      razonSocialIds: [],
    });
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validaciones mejoradas
      if (!formData.nombre.trim()) {
        alert('El nombre del producto es requerido');
        return;
      }

      if (!formData.categoriaId) {
        alert('La categoria es requerida');
        return;
      }

      if (!formData.descripcion.trim()) {
        alert('La descripciÃ³n es requerida');
        return;
      }

      if (!formData.unidadMedidaId) {
        alert('La unidad de medida es requerida');
        return;
      }

      // Validaciones de precio, stock mÃ­nimo, merma, IGV y dÃ­as de vencimiento removidas

      // Generar SKU si no existe
      const finalSKU = formData.sku || generateSKU(formData.nombre, formData.categoriaId, formData.familiaId);

      if (editingProduct) {
        const resp = await apiFetch(`/api/productos/${editingProduct.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: formData.nombre,
            sku: finalSKU,
            descripcion: formData.descripcion,
            categoriaId: formData.categoriaId,
            unidadMedidaId: formData.unidadMedidaId,
          })
        });
        const result = await resp.json();
        if (!resp.ok || result?.success === false) {
          const message = result?.error || 'Error al actualizar producto';
          alert(message);
          return;
        }
        await fetchProductos();
      } else {
        const resp = await apiFetch('/api/productos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: formData.nombre,
            sku: finalSKU,
            descripcion: formData.descripcion,
            categoriaId: formData.categoriaId,
            unidadMedidaId: formData.unidadMedidaId,
          })
        });

        const result = await resp.json();

        if (!resp.ok || !result.success) {
          const message = result?.error || 'Error al crear producto';
          alert(message);
          return;
        }

  const productoCreado: Producto = {
          id: result.data.id,
          nombre: result.data.nombre,
          sku: result.data.sku,
          descripcion: result.data.descripcion,
          precio: result.data.precio,
          stock: result.data.stock ?? 0,
          stockMinimo: result.data.stockMinimo,
          porcentajeMerma: 0,
          tieneIGV: false,
          activo: true,
          categoria: result.data.categoria,
          unidadMedida: result.data.unidadMedida,
          tipoArticulo: undefined,
          familia: undefined,
          subfamilia: undefined,
          unidadCosteo: undefined,
          marca: undefined,
          agrupador: undefined,
          razonSocialProductos: []
        };

        // Revalidar lista desde el servidor para reflejar cambios de inmediato
  await fetchProductos();
  setSuccessProduct({ nombre: result.data.nombre, sku: result.data.sku });
  setSuccessModalOpen(true);
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error al guardar producto:', error);
      alert('Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (producto: Producto) => {
    setEditingProduct(producto);
    setFormData({
      nombre: producto.nombre,
      sku: producto.sku || '',
      descripcion: producto.descripcion || '',
      precio: 0,
      stockMinimo: 0,
      porcentajeMerma: 0,
      tieneIGV: false,
      categoriaId: producto.categoria?.id || '',
      tipoArticuloId: producto.tipoArticulo?.id || '',
      familiaId: producto.familia?.id || '',
      subfamiliaId: producto.subfamilia?.id || '',
      unidadMedidaId: producto.unidadMedida.id,
      unidadCosteoId: producto.unidadCosteo?.id || '',
      marcaId: producto.marca?.id || '',
      agrupadorId: producto.agrupador?.id || '',
      razonSocialIds: producto.razonSocialProductos?.map(rsp => rsp.razonSocial.id) || [],
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      // Validar si el producto puede ser eliminado (sin movimientos de inventario)
      const validation = await ProductoInventarioHooks.beforeDeleteProducto(id);
      
      if (!validation.canDelete) {
        alert(`No se puede eliminar el producto:\n${validation.reason}\n\nPrimero debe resolver los movimientos de inventario asociados.`);
        return;
      }

      if (confirm('¿Estás seguro de que deseas eliminar este producto?\n\nEsta acción eliminará el producto del catálogo y ya no estará disponible para nuevos movimientos de inventario.')) {
        const resp = await apiFetch(`/api/productos/${id}`, { method: 'DELETE' });
        const result = await resp.json();
        if (!resp.ok || result?.success === false) {
          alert(result?.error || 'No se pudo eliminar el producto');
          return;
        }
        await fetchProductos();
        alert('Producto eliminado exitosamente');
      }
    } catch (error) {
      console.error('Error al validar eliminación:', error);
      // Fallback
      if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
        const resp = await apiFetch(`/api/productos/${id}`, { method: 'DELETE' });
        const result = await resp.json();
        if (!resp.ok || result?.success === false) {
          alert(result?.error || 'No se pudo eliminar el producto');
          return;
        }
        await fetchProductos();
        alert('Producto eliminado exitosamente');
      }
    }
  };

  const toggleEstado = async (id: string) => {
    const prod = productos.find(p => p.id === id);
    if (!prod) return;
    const next = !prod.activo;
    const resp = await apiFetch(`/api/productos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: next })
    });
    const result = await resp.json();
    if (!resp.ok || result?.success === false) {
      alert(result?.error || 'No se pudo cambiar el estado');
      return;
    }
    await fetchProductos();
  };

  const filteredAndSortedProductos = productos
    .filter(producto => {
      const matchesSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (producto.sku && producto.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && producto.activo) ||
        (statusFilter === 'inactive' && !producto.activo);

      const matchesCategory = !selectedCategoriaId || producto.categoria?.id === selectedCategoriaId;
      const matchesFamilia = !selectedFamiliaId || producto.familia?.id === selectedFamiliaId;
      const matchesSubfamilia = !selectedSubfamiliaId || producto.subfamilia?.id === selectedSubfamiliaId;

      return matchesSearch && matchesStatus && matchesCategory && matchesFamilia && matchesSubfamilia;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Manejar valores undefined o null
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      // Convertir a string para comparaciÃ³n
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (sortDirection === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });

  // Calcular paginaciÃ³n
  const totalItems = filteredAndSortedProductos.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProductos = filteredAndSortedProductos.slice(startIndex, endIndex);

  const handleSort = (field: keyof Producto) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Helper para indicador de stock (color y etiqueta accesible)
  const getStockIndicator = (p: Producto) => {
    const isLow = p.stock < p.stockMinimo;
    return {
      color: isLow ? '#ef4444' : '#2563eb',
      label: isLow ? 'Stock bajo' : 'Stock adecuado'
    };
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
            <p className="text-gray-600">Gestion completa de productos con clasificacion avanzada</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Agregar Producto
            </button>
            {/* Dropdown de Productos movido al Sidebar */}
          </div>
        </div>

        {apiError && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3" role="alert" aria-live="polite">
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos por nombre o SKU"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Estado</span>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Por página</span>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando productos...</p>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                      <button 
                        onClick={() => handleSort('nombre')}
                        className="flex items-center gap-1 hover:text-gray-900"
                      >
                        Producto
                        {sortField === 'nombre' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                      CategorÃ­a
                    </th>
                    {/* Columna de Stock removida: el badge al lado del nombre muestra esta info */}
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Unidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                      DescripciÃ³n
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedProductos.map((producto) => (
                    <tr key={producto.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {/* Indicador visual de stock: rojo si bajo, azul si ok */}
                            {(() => {
                              const ind = getStockIndicator(producto);
                              return (
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 12 12"
                                  className="mr-2 flex-shrink-0"
                                  aria-label={ind.label}
                                >
                                  <circle cx="6" cy="6" r="5" fill={ind.color} />
                                </svg>
                              );
                            })()}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {producto.nombre}
                              </div>
                              <div className="text-sm text-gray-500">
                                SKU: {producto.sku || 'Sin SKU'}
                              </div>
                            </div>
                          </div>
                          {/* Icono representativo al costado derecho: rojo si stock bajo, azul si adecuado */}
                          {(() => {
                            const isLow = producto.stock < producto.stockMinimo;
                            const pkgColorClass = isLow ? 'text-red-600' : 'text-blue-600';
return (
  <div className="relative ml-3" aria-live="polite" title={`Stock: ${producto.stock}`}>
    <Package className={`h-6 w-6 ${pkgColorClass}`} aria-label={isLow ? 'Stock bajo' : 'Stock adecuado'} />
    <span className={`absolute -top-2 -right-3 text-[10px] font-semibold ${pkgColorClass}`}>{producto.stock}</span>
  </div>
);
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {producto.categoria ? (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                              {producto.categoria.nombre}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Sin categorÃ­a</span>
                          )}
                        </div>
                      </td>
                      {/* Celda de Stock removida: badge junto al nombre ocupa su lugar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {producto.unidadMedida ? (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-green-50 text-green-700 border border-green-200">
                              {producto.unidadMedida.nombre} ({producto.unidadMedida.simbolo})
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Sin unidad</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 line-clamp-2">
                          {producto.descripcion || 'â€”'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleEstado(producto.id)}
                            className={`px-2 py-1 text-xs rounded ${
                              producto.activo 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                            title={producto.activo ? 'Desactivar producto' : 'Activar producto'}
                          >
                            {producto.activo ? 'Activo' : 'Inactivo'}
                          </button>
                          <button
                            onClick={() => handleEdit(producto)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar producto"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(producto.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Eliminar producto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paginatedProductos.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  {searchTerm 
                    ? 'No se encontraron productos con ese criterio de busqueda' 
                    : 'No hay productos registrados'
                  }
                </div>
              )}
            </>
          )}
          
          {/* PaginaciÃ³n */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                      <span className="font-medium">{Math.min(endIndex, totalItems)}</span> de{' '}
                      <span className="font-medium">{totalItems}</span> productos
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {[...Array(Math.min(5, totalPages))].map((_, index) => {
                        let pageNumber;
                        if (totalPages <= 5) {
                          pageNumber = index + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = index + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + index;
                        } else {
                          pageNumber = currentPage - 2 + index;
                        }
                        
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => setCurrentPage(pageNumber)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNumber
                                ? 'z-10 bg-green-50 border-green-500 text-green-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

  <Modal isOpen={showModal} onClose={() => setShowModal(false)} ariaLabel={editingProduct ? "Editar Producto" : "Crear Nuevo Producto"}>
        <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg max-h-screen flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <h3 className="text-lg font-bold text-gray-900">
              {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {editingProduct ? 'Modifica los datos del producto seleccionado' : 'Completa los datos para crear un nuevo producto'}
            </p>
          </div>
          <div className="overflow-y-auto flex-1">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-900 mb-2">
                Nombre del Producto *
              </label>
              <input
                id="nombre"
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            

            <div>
              <label htmlFor="descripcion" className="block text-sm font-medium text-gray-900 mb-2">
                Descripcion
              </label>
              <textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Descripcion detallada del producto"
                required
              />
            </div>

            {/* Campos removidos: Precio, Stock mÃ­nimo, IGV y Merma */}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="categoria" className="block text-sm font-medium text-gray-900 mb-2">
                  Categoria *
                </label>
                <select
                  id="categoria"
                  value={formData.categoriaId}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoriaId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Seleccionar categoria</option>
                  {apiCategorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="unidadMedida" className="block text-sm font-medium text-gray-900 mb-2">
                  Unidad de Medida *
                </label>
                <select
                  id="unidadMedida"
                  value={formData.unidadMedidaId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, unidadMedidaId: value }));
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('defaultUnidadMedidaId', value);
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Seleccionar unidad</option>
                  {apiUnidades.map(unidad => (
                    <option key={unidad.id} value={unidad.id}>{unidad.nombre} ({unidad.simbolo})</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Campo DÃ­as de vencimiento removido */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Guardando...' : (editingProduct ? 'Actualizar' : 'Crear')} Producto
              </button>
            </div>
            </form>
          </div>
        </div>
      </Modal>

      {/* Modal de éxito para creación de producto */}
      <Modal isOpen={successModalOpen} onClose={() => setSuccessModalOpen(false)} ariaLabel="Producto creado">
        <div className="text-center py-6">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">¡Producto creado exitosamente!</h3>
          {successProduct && (
            <div className="mt-4 bg-gray-50 rounded-lg p-4 text-left">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Nombre:</span>
                <span className="text-sm font-semibold text-gray-900">{successProduct.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">SKU:</span>
                <span className="text-sm font-semibold text-green-600">{successProduct.sku || '—'}</span>
              </div>
            </div>
          )}
          <button
            onClick={() => setSuccessModalOpen(false)}
            className="mt-6 px-6 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 font-medium"
          >
            Aceptar
          </button>
        </div>
      </Modal>

      {/* GestiÃ³n de categorÃ­as ahora se realiza desde la secciÃ³n del Sidebar */}
    </div>
  );
}

