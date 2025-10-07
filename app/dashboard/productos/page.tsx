'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Search, Plus, Package, Edit2, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { ProductoInventarioHooks } from '../../../src/lib/producto-inventario-sync';

const Modal = dynamic(() => import('../../../src/components/ui/Modal'), { ssr: false });

interface Producto {
  id: string;
  nombre: string;
  sku?: string;
  descripcion?: string;
  precio: number;
  stock: number;
  stockMinimo: number;
  porcentajeMerma: number;
  perecedero: boolean;
  diasVencimiento?: number;
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
  perecedero: boolean;
  diasVencimiento: number;
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

  // Mock data para los selectores
  const mockCategorias = useMemo(() => [
    { id: '1', nombre: 'Frutas Citricas' },
    { id: '2', nombre: 'Frutas Tropicales' },
    { id: '3', nombre: 'Verduras de Hoja' },
    { id: '4', nombre: 'Verduras de Fruto' },
    { id: '5', nombre: 'Tuberculos' },
  ], []);

  const mockTiposArticulo = useMemo(() => [
    { id: '1', nombre: 'Producto Natural' },
    { id: '2', nombre: 'Producto Procesado' },
    { id: '3', nombre: 'Producto Organico' },
  ], []);

  const mockFamilias = useMemo(() => [
    { id: '1', nombre: 'Frutas' },
    { id: '2', nombre: 'Verduras' },
    { id: '3', nombre: 'Hierbas' },
  ], []);

  const mockSubfamilias = useMemo(() => [
    { id: '1', nombre: 'Citricos' },
    { id: '2', nombre: 'Tropicales' },
    { id: '3', nombre: 'De Hueso' },
    { id: '4', nombre: 'De Hoja Verde' },
    { id: '5', nombre: 'De Raiz' },
    { id: '6', nombre: 'De Fruto' },
  ], []);

  const mockUnidades = useMemo(() => [
    { id: '1', nombre: 'Kilogramo', simbolo: 'kg' },
    { id: '2', nombre: 'Unidad', simbolo: 'und' },
    { id: '3', nombre: 'Caja', simbolo: 'caja' },
    { id: '4', nombre: 'Saco', simbolo: 'saco' },
    { id: '5', nombre: 'Docena', simbolo: 'docena' },
  ], []);

  const mockMarcas = useMemo(() => [
    { id: '1', nombre: 'TODAFRU Premium' },
    { id: '2', nombre: 'TODAFRU Organico' },
    { id: '3', nombre: 'TODAFRU Tradicional' },
    { id: '4', nombre: 'Sin Marca' },
  ], []);

  const mockAgrupadores = useMemo(() => [
    { id: '1', nombre: 'Alta Rotacion' },
    { id: '2', nombre: 'Estacional' },
    { id: '3', nombre: 'Premium' },
    { id: '4', nombre: 'Exportacion' },
  ], []);

  const mockRazonesSociales = useMemo(() => [
    { id: '1', nombre: 'Supermercados Wong S.A.' },
    { id: '2', nombre: 'Metro S.A.' },
    { id: '3', nombre: 'Tottus S.A.' },
    { id: '4', nombre: 'Plaza Vea S.A.' },
    { id: '5', nombre: 'Restaurantes Centrales S.A.C.' },
  ], []);

  // Funcion para generar SKU automatico
  const generateSKU = useCallback((nombre: string, categoriaId: string, familiaId: string) => {
    if (!nombre || !categoriaId) return '';
    
    const categoria = mockCategorias.find(c => c.id === categoriaId);
    const familia = mockFamilias.find(f => f.id === familiaId);
    
    const nombreParts = nombre.split(' ').slice(0, 2);
    const nombreCode = nombreParts.map(part => part.substring(0, 3).toUpperCase()).join('-');
    
    const categoriaCode = categoria ? categoria.nombre.substring(0, 3).toUpperCase() : 'GEN';
    const familiaCode = familia ? familia.nombre.substring(0, 3).toUpperCase() : '';
    
    const timestamp = Date.now().toString().slice(-3);
    
    return `${categoriaCode}-${familiaCode ? familiaCode + '-' : ''}${nombreCode}-${timestamp}`;
  }, [mockCategorias, mockFamilias]);

  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    sku: '',
    descripcion: '',
    precio: 0,
    stockMinimo: 0,
    porcentajeMerma: 0,
    perecedero: true,
    diasVencimiento: 7,
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
      const response = await fetch('/api/productos?limit=100');
      const data = await response.json();
      
      if (data.success) {
        // Los datos de la API ya vienen en el formato correcto
        setProductos(data.data);
      } else {
        console.error('Error en la respuesta de la API:', data.error);
        // Fallback a datos mock solo si la API falla
        const mockProductos: Producto[] = [
          {
            id: '1',
            nombre: 'Manzana Fuji Premium',
            sku: 'FRU-CIT-MAN-001',
            descripcion: 'Manzana Fuji de primera calidad, importada',
            precio: 8.50,
            stock: 150,
            stockMinimo: 20,
            porcentajeMerma: 5,
            perecedero: true,
            diasVencimiento: 15,
            tieneIGV: true,
            activo: true,
            categoria: { id: '1', nombre: 'Frutas Citricas' },
            tipoArticulo: { id: '1', nombre: 'Producto Natural' },
            familia: { id: '1', nombre: 'Frutas' },
            subfamilia: { id: '1', nombre: 'Citricos' },
            unidadMedida: { id: '1', nombre: 'Kilogramo', simbolo: 'kg' },
            unidadCosteo: { id: '1', nombre: 'Kilogramo', simbolo: 'kg' },
            marca: { id: '1', nombre: 'TODAFRU Premium' },
            agrupador: { id: '1', nombre: 'Alta Rotacion' },
            razonSocialProductos: [
              { razonSocial: { id: '1', nombre: 'Supermercados Wong S.A.' } },
              { razonSocial: { id: '2', nombre: 'Metro S.A.' } }
            ]
          }
        ];
        
        setProductos(mockProductos);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
      // En caso de error de red, usar datos mock
      const mockProductos: Producto[] = [
        {
          id: '1',
          nombre: 'Manzana Fuji Premium',
          sku: 'FRU-CIT-MAN-001',
          descripcion: 'Manzana Fuji de primera calidad, importada',
          precio: 8.50,
          stock: 150,
          stockMinimo: 20,
          porcentajeMerma: 5,
          perecedero: true,
          diasVencimiento: 15,
          tieneIGV: true,
          activo: true,
          categoria: { id: '1', nombre: 'Frutas Citricas' },
          tipoArticulo: { id: '1', nombre: 'Producto Natural' },
          familia: { id: '1', nombre: 'Frutas' },
          subfamilia: { id: '1', nombre: 'Citricos' },
          unidadMedida: { id: '1', nombre: 'Kilogramo', simbolo: 'kg' },
          unidadCosteo: { id: '1', nombre: 'Kilogramo', simbolo: 'kg' },
          marca: { id: '1', nombre: 'TODAFRU Premium' },
          agrupador: { id: '1', nombre: 'Alta Rotacion' },
          razonSocialProductos: [
            { razonSocial: { id: '1', nombre: 'Supermercados Wong S.A.' } },
            { razonSocial: { id: '2', nombre: 'Metro S.A.' } }
          ]
        }
      ];
      
      setProductos(mockProductos);
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
      perecedero: true,
      diasVencimiento: 7,
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

      if (!formData.unidadMedidaId) {
        alert('La unidad de medida es requerida');
        return;
      }

      if (formData.precio <= 0) {
        alert('El precio debe ser mayor a 0');
        return;
      }

      if (formData.perecedero && (!formData.diasVencimiento || formData.diasVencimiento <= 0)) {
        alert('Los dias de vencimiento son requeridos para productos perecederos');
        return;
      }

      if (formData.porcentajeMerma < 0 || formData.porcentajeMerma > 100) {
        alert('El porcentaje de merma debe estar entre 0 y 100');
        return;
      }

      // Generar SKU si no existe
      const finalSKU = formData.sku || generateSKU(formData.nombre, formData.categoriaId, formData.familiaId);

      if (editingProduct) {
        const updatedProductos = productos.map(p => 
          p.id === editingProduct.id 
            ? { 
                ...p, 
                ...formData, 
                sku: finalSKU,
                id: editingProduct.id,
                // Mapear las relaciones
                categoria: mockCategorias.find(c => c.id === formData.categoriaId),
                tipoArticulo: mockTiposArticulo.find(t => t.id === formData.tipoArticuloId),
                familia: mockFamilias.find(f => f.id === formData.familiaId),
                subfamilia: mockSubfamilias.find(s => s.id === formData.subfamiliaId),
                unidadMedida: mockUnidades.find(u => u.id === formData.unidadMedidaId)!,
                unidadCosteo: mockUnidades.find(u => u.id === formData.unidadCosteoId),
                marca: mockMarcas.find(m => m.id === formData.marcaId),
                agrupador: mockAgrupadores.find(a => a.id === formData.agrupadorId),
                razonSocialProductos: formData.razonSocialIds.map(id => ({
                  razonSocial: mockRazonesSociales.find(r => r.id === id)!
                }))
              }
            : p
        );
        setProductos(updatedProductos);
        alert('Producto actualizado exitosamente');
      } else {
        const nuevoProducto: Producto = {
          id: Date.now().toString(),
          nombre: formData.nombre,
          sku: finalSKU,
          descripcion: formData.descripcion,
          precio: formData.precio,
          stock: 0,
          stockMinimo: formData.stockMinimo,
          porcentajeMerma: formData.porcentajeMerma,
          perecedero: formData.perecedero,
          diasVencimiento: formData.diasVencimiento,
          tieneIGV: formData.tieneIGV,
          activo: true,
          categoria: mockCategorias.find(c => c.id === formData.categoriaId),
          tipoArticulo: mockTiposArticulo.find(t => t.id === formData.tipoArticuloId),
          familia: mockFamilias.find(f => f.id === formData.familiaId),
          subfamilia: mockSubfamilias.find(s => s.id === formData.subfamiliaId),
          unidadMedida: mockUnidades.find(u => u.id === formData.unidadMedidaId)!,
          unidadCosteo: mockUnidades.find(u => u.id === formData.unidadCosteoId),
          marca: mockMarcas.find(m => m.id === formData.marcaId),
          agrupador: mockAgrupadores.find(a => a.id === formData.agrupadorId),
          razonSocialProductos: formData.razonSocialIds.map(id => ({
            razonSocial: mockRazonesSociales.find(r => r.id === id)!
          }))
        };
        
        setProductos(prev => [...prev, nuevoProducto]);
        alert('Producto creado exitosamente');
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
      precio: producto.precio,
      stockMinimo: producto.stockMinimo,
      porcentajeMerma: producto.porcentajeMerma,
      perecedero: producto.perecedero,
      diasVencimiento: producto.diasVencimiento || 7,
      tieneIGV: producto.tieneIGV,
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
        setProductos(prev => prev.filter(p => p.id !== id));
        alert('Producto eliminado exitosamente');
      }
    } catch (error) {
      console.error('Error al validar eliminación:', error);
      // Fallback al comportamiento anterior si hay error en la validación
      if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
        setProductos(prev => prev.filter(p => p.id !== id));
        alert('Producto eliminado exitosamente');
      }
    }
  };

  const toggleEstado = (id: string) => {
    setProductos(prev => prev.map(p => 
      p.id === id ? { ...p, activo: !p.activo } : p
    ));
  };

  const filteredAndSortedProductos = productos
    .filter(producto => {
      const matchesSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (producto.sku && producto.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && producto.activo) ||
        (statusFilter === 'inactive' && !producto.activo);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Manejar valores undefined o null
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      // Convertir a string para comparación
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (sortDirection === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });

  // Calcular paginación
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

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
            <p className="text-gray-600">Gestion completa de productos con clasificacion avanzada</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por estado
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">Todos los productos</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="itemsPerPage" className="block text-sm font-medium text-gray-700 mb-1">
              Productos por página
            </label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value={5}>5 productos</option>
              <option value={10}>10 productos</option>
              <option value={20}>20 productos</option>
              <option value={50}>50 productos</option>
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
            <div className="overflow-x-auto">
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
                      Clasificación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                      <button 
                        onClick={() => handleSort('precio')}
                        className="flex items-center gap-1 hover:text-gray-900"
                      >
                        Precio/Stock
                        {sortField === 'precio' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Características
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Razones Sociales
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
                        <div className="flex items-center">
                          <Package className="h-8 w-8 text-green-600 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {producto.nombre}
                            </div>
                            <div className="text-sm text-gray-500">
                              SKU: {producto.sku || 'Sin SKU'}
                            </div>
                            {producto.descripcion && (
                              <div className="text-xs text-gray-400 mt-1">
                                {producto.descripcion}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs space-y-1">
                          {producto.categoria && (
                            <div><span className="font-medium">Cat:</span> {producto.categoria.nombre}</div>
                          )}
                          {producto.familia && (
                            <div><span className="font-medium">Fam:</span> {producto.familia.nombre}</div>
                          )}
                          {producto.subfamilia && (
                            <div><span className="font-medium">Sub:</span> {producto.subfamilia.nombre}</div>
                          )}
                          {producto.marca && (
                            <div><span className="font-medium">Marca:</span> {producto.marca.nombre}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            S/ {producto.precio.toFixed(2)} / {producto.unidadMedida.simbolo}
                          </div>
                          <div className="text-gray-500">
                            Stock: {producto.stock} {producto.unidadMedida.simbolo}
                          </div>
                          <div className="text-xs text-gray-400">
                            Min: {producto.stockMinimo} {producto.unidadMedida.simbolo}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              producto.perecedero 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {producto.perecedero ? 'Perecedero' : 'No Perecedero'}
                            </span>
                          </div>
                          {producto.perecedero && producto.diasVencimiento && (
                            <div>Vida util: {producto.diasVencimiento} dias</div>
                          )}
                          <div>Merma: {producto.porcentajeMerma}%</div>
                          <div>{producto.tieneIGV ? 'Con IGV' : 'Sin IGV'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs space-y-1">
                          {producto.razonSocialProductos?.map((rsp, index) => (
                            <div key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {rsp.razonSocial.nombre}
                            </div>
                          )) || (
                            <div className="text-gray-400">Sin asignar</div>
                          )}
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
            </div>
          )}
          
          {/* Paginación */}
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
              <label htmlFor="sku" className="block text-sm font-medium text-gray-900 mb-2">
                SKU
              </label>
              <input
                id="sku"
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Se genera automaticamente"
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
              />
            </div>

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
                  {mockCategorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="tipoArticulo" className="block text-sm font-medium text-gray-900 mb-2">
                  Tipo de Articulo
                </label>
                <select
                  id="tipoArticulo"
                  value={formData.tipoArticuloId}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipoArticuloId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Seleccionar tipo</option>
                  {mockTiposArticulo.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="familia" className="block text-sm font-medium text-gray-900 mb-2">
                  Familia
                </label>
                <select
                  id="familia"
                  value={formData.familiaId}
                  onChange={(e) => setFormData(prev => ({ ...prev, familiaId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Seleccionar familia</option>
                  {mockFamilias.map(fam => (
                    <option key={fam.id} value={fam.id}>{fam.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="subfamilia" className="block text-sm font-medium text-gray-900 mb-2">
                  Subfamilia
                </label>
                <select
                  id="subfamilia"
                  value={formData.subfamiliaId}
                  onChange={(e) => setFormData(prev => ({ ...prev, subfamiliaId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Seleccionar subfamilia</option>
                  {mockSubfamilias.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.nombre}</option>
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
                  onChange={(e) => setFormData(prev => ({ ...prev, unidadMedidaId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Seleccionar unidad</option>
                  {mockUnidades.map(unidad => (
                    <option key={unidad.id} value={unidad.id}>{unidad.nombre} ({unidad.simbolo})</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="unidadCosteo" className="block text-sm font-medium text-gray-900 mb-2">
                  Unidad de Costeo
                </label>
                <select
                  id="unidadCosteo"
                  value={formData.unidadCosteoId}
                  onChange={(e) => setFormData(prev => ({ ...prev, unidadCosteoId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Seleccionar unidad de costeo</option>
                  {mockUnidades.map(unidad => (
                    <option key={unidad.id} value={unidad.id}>{unidad.nombre} ({unidad.simbolo})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="marca" className="block text-sm font-medium text-gray-900 mb-2">
                  Marca
                </label>
                <select
                  id="marca"
                  value={formData.marcaId}
                  onChange={(e) => setFormData(prev => ({ ...prev, marcaId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Seleccionar marca</option>
                  {mockMarcas.map(marca => (
                    <option key={marca.id} value={marca.id}>{marca.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="agrupador" className="block text-sm font-medium text-gray-900 mb-2">
                  Agrupador
                </label>
                <select
                  id="agrupador"
                  value={formData.agrupadorId}
                  onChange={(e) => setFormData(prev => ({ ...prev, agrupadorId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Seleccionar agrupador</option>
                  {mockAgrupadores.map(agrup => (
                    <option key={agrup.id} value={agrup.id}>{agrup.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Razones Sociales
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3">
                {mockRazonesSociales.map(razon => (
                  <div key={razon.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`razon-${razon.id}`}
                      checked={formData.razonSocialIds.includes(razon.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            razonSocialIds: [...prev.razonSocialIds, razon.id]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            razonSocialIds: prev.razonSocialIds.filter(id => id !== razon.id)
                          }));
                        }
                      }}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`razon-${razon.id}`} className="ml-2 text-sm text-gray-900">
                      {razon.nombre}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="precio" className="block text-sm font-medium text-gray-900 mb-2">
                  Precio de Venta *
                </label>
                <input
                  id="precio"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.precio}
                  onChange={(e) => setFormData(prev => ({ ...prev, precio: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="stockMinimo" className="block text-sm font-medium text-gray-900 mb-2">
                  Stock Minimo
                </label>
                <input
                  id="stockMinimo"
                  type="number"
                  min="0"
                  value={formData.stockMinimo}
                  onChange={(e) => setFormData(prev => ({ ...prev, stockMinimo: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="porcentajeMerma" className="block text-sm font-medium text-gray-900 mb-2">
                % Merma
              </label>
              <input
                id="porcentajeMerma"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.porcentajeMerma}
                onChange={(e) => setFormData(prev => ({ ...prev, porcentajeMerma: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  id="perecedero"
                  type="checkbox"
                  checked={formData.perecedero}
                  onChange={(e) => setFormData(prev => ({ ...prev, perecedero: e.target.checked }))}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="perecedero" className="ml-2 block text-sm text-gray-900">
                  Producto Perecedero
                </label>
              </div>

              <div>
                <label htmlFor="diasVencimiento" className="block text-sm font-medium text-gray-900 mb-2">
                  Dias de Vencimiento
                </label>
                <input
                  id="diasVencimiento"
                  type="number"
                  min="1"
                  value={formData.diasVencimiento}
                  onChange={(e) => setFormData(prev => ({ ...prev, diasVencimiento: parseInt(e.target.value) || 7 }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                  disabled={!formData.perecedero}
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="tieneIGV"
                type="checkbox"
                checked={formData.tieneIGV}
                onChange={(e) => setFormData(prev => ({ ...prev, tieneIGV: e.target.checked }))}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="tieneIGV" className="ml-2 block text-sm text-gray-900">
                Tiene IGV
              </label>
            </div>

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
    </div>
  );
}