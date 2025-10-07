'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Search, Eye, Check, X } from 'lucide-react';
import dynamic from 'next/dynamic';

const Modal = dynamic(() => import('../../../src/components/ui/Modal'), { ssr: false });

interface Proveedor {
  id: string;
  nombre: string;
}

interface Producto {
  id: string;
  nombre: string;
  sku?: string;
  precio: number;
  unidadMedida: {
    simbolo: string;
  };
}

interface PedidoCompra {
  id: string;
  numero: string;
  fecha: string;
  fechaEntrega?: string;
  subtotal: number;
  impuestos: number;
  total: number;
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'EN_PROCESO' | 'COMPLETADO' | 'ANULADO';
  observaciones?: string;
  numeroGuia?: string;
  proveedor: {
    id: string;
    nombre: string;
  };
  items: Array<{
    id: string;
    cantidad: number;
    precio: number;
    subtotal: number;
    producto: {
      id: string;
      nombre: string;
      sku?: string;
      unidadMedida: {
        simbolo: string;
      };
    };
  }>;
}

interface FormData {
  proveedorId: string;
  fecha: string;
  fechaEntrega: string;
  observaciones: string;
  numeroGuia: string;
  items: Array<{
    productoId: string;
    cantidad: number;
    precio: number;
  }>;
}

export default function PedidosCompraPage() {
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredPedidos, setFilteredPedidos] = useState<PedidoCompra[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [viewingPedido, setViewingPedido] = useState<PedidoCompra | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    proveedorId: '',
    fecha: new Date().toISOString().split('T')[0], // Fecha actual por defecto
    fechaEntrega: '',
    observaciones: '',
    numeroGuia: '',
    items: []
  });

  useEffect(() => {
    fetchPedidos();
    fetchProveedores();
    fetchProductos();
  }, []);

  useEffect(() => {
    let filtered = pedidos;

    if (searchTerm) {
      filtered = filtered.filter(pedido =>
        pedido.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.numeroGuia?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (estadoFilter !== 'all') {
      filtered = filtered.filter(pedido => pedido.estado === estadoFilter);
    }

    setFilteredPedidos(filtered);
  }, [pedidos, searchTerm, estadoFilter]);

  const fetchPedidos = async () => {
    try {
      const response = await fetch('/api/pedidos-compra');
      const data = await response.json();
      
      if (data.success) {
        setPedidos(data.data);
      } else {
        // Datos mock si la API falla
        setPedidos([
          {
            id: '1',
            numero: 'PC-2025-003',
            fecha: '2025-09-16',
            fechaEntrega: '2025-09-26',
            subtotal: 150.00,
            impuestos: 27.00,
            total: 177.00,
            estado: 'COMPLETADO' as const,
            observaciones: 'Pedido urgente para evento',
            numeroGuia: 'GR-003-2025',
            proveedor: { id: '1', nombre: 'Proveedor ABC S.A.C.' },
            items: [
              {
                id: '1',
                cantidad: 10,
                precio: 5.50,
                subtotal: 55.00,
                producto: {
                  id: '1',
                  nombre: 'Camote Negro',
                  sku: 'CAM-001',
                  unidadMedida: { simbolo: 'kg' }
                }
              }
            ]
          },
          {
            id: '2',
            numero: 'PC-2025-002',
            fecha: '2025-09-15',
            fechaEntrega: '2025-09-25',
            subtotal: 200.00,
            impuestos: 36.00,
            total: 236.00,
            estado: 'COMPLETADO' as const,
            observaciones: '',
            numeroGuia: 'GR-002-2025',
            proveedor: { id: '2', nombre: 'Distribuidora XYZ E.I.R.L.' },
            items: [
              {
                id: '2',
                cantidad: 20,
                precio: 3.20,
                subtotal: 64.00,
                producto: {
                  id: '2',
                  nombre: 'Papa Blanca',
                  sku: 'PAP-001',
                  unidadMedida: { simbolo: 'kg' }
                }
              }
            ]
          },
          {
            id: '3',
            numero: 'PC-2025-001',
            fecha: '2025-09-14',
            fechaEntrega: '2025-09-24',
            subtotal: 120.00,
            impuestos: 21.60,
            total: 141.60,
            estado: 'COMPLETADO' as const,
            observaciones: '',
            numeroGuia: 'GR-001-2025',
            proveedor: { id: '3', nombre: 'Comercial 123 S.R.L.' },
            items: [
              {
                id: '3',
                cantidad: 15,
                precio: 4.80,
                subtotal: 72.00,
                producto: {
                  id: '3',
                  nombre: 'Cebolla Roja',
                  sku: 'CEB-001',
                  unidadMedida: { simbolo: 'kg' }
                }
              }
            ]
          }
        ]);
      }
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      // Datos mock en caso de error
      setPedidos([
        {
          id: '1',
          numero: 'PC-2025-003',
          fecha: '2025-09-16',
          fechaEntrega: '2025-09-26',
          subtotal: 150.00,
          impuestos: 27.00,
          total: 177.00,
          estado: 'COMPLETADO' as const,
          observaciones: 'Pedido urgente para evento',
          numeroGuia: 'GR-003-2025',
          proveedor: { id: '1', nombre: 'Proveedor ABC S.A.C.' },
          items: [
            {
              id: '1',
              cantidad: 10,
              precio: 5.50,
              subtotal: 55.00,
              producto: {
                id: '1',
                nombre: 'Camote Negro',
                sku: 'CAM-001',
                unidadMedida: { simbolo: 'kg' }
              }
            }
          ]
        },
        {
          id: '2',
          numero: 'PC-2025-002',
          fecha: '2025-09-15',
          fechaEntrega: '2025-09-25',
          subtotal: 200.00,
          impuestos: 36.00,
          total: 236.00,
          estado: 'COMPLETADO' as const,
          observaciones: '',
          numeroGuia: 'GR-002-2025',
          proveedor: { id: '2', nombre: 'Distribuidora XYZ E.I.R.L.' },
          items: [
            {
              id: '2',
              cantidad: 20,
              precio: 3.20,
              subtotal: 64.00,
              producto: {
                id: '2',
                nombre: 'Papa Blanca',
                sku: 'PAP-001',
                unidadMedida: { simbolo: 'kg' }
              }
            }
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProveedores = async () => {
    try {
      const response = await fetch('/api/proveedores?limit=100');
      const data = await response.json();
      
      if (data.success) {
        setProveedores(data.data);
      } else {
        // Datos mock si la API falla
        setProveedores([
          { id: '1', nombre: 'Proveedor ABC S.A.C.' },
          { id: '2', nombre: 'Distribuidora XYZ E.I.R.L.' },
          { id: '3', nombre: 'Comercial 123 S.R.L.' },
          { id: '4', nombre: 'Importadora DEF S.A.' },
          { id: '5', nombre: 'Suministros GHI S.A.C.' }
        ]);
      }
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
      // Datos mock en caso de error
      setProveedores([
        { id: '1', nombre: 'Proveedor ABC S.A.C.' },
        { id: '2', nombre: 'Distribuidora XYZ E.I.R.L.' },
        { id: '3', nombre: 'Comercial 123 S.R.L.' },
        { id: '4', nombre: 'Importadora DEF S.A.' },
        { id: '5', nombre: 'Suministros GHI S.A.C.' }
      ]);
    }
  };

  const fetchProductos = async () => {
    try {
      const response = await fetch('/api/productos?limit=100');
      const data = await response.json();
      
      if (data.success) {
        setProductos(data.data);
      } else {
        // Datos mock si la API falla
        setProductos([
          { id: '1', nombre: 'Camote Negro', sku: 'CAM-001', precio: 5.50, unidadMedida: { simbolo: 'kg' } },
          { id: '2', nombre: 'Papa Blanca', sku: 'PAP-001', precio: 3.20, unidadMedida: { simbolo: 'kg' } },
          { id: '3', nombre: 'Cebolla Roja', sku: 'CEB-001', precio: 4.80, unidadMedida: { simbolo: 'kg' } },
          { id: '4', nombre: 'Tomate', sku: 'TOM-001', precio: 6.00, unidadMedida: { simbolo: 'kg' } },
          { id: '5', nombre: 'Zanahoria', sku: 'ZAN-001', precio: 2.90, unidadMedida: { simbolo: 'kg' } },
          { id: '6', nombre: 'Lechuga', sku: 'LEC-001', precio: 1.50, unidadMedida: { simbolo: 'und' } },
          { id: '7', nombre: 'Apio', sku: 'API-001', precio: 3.50, unidadMedida: { simbolo: 'kg' } },
          { id: '8', nombre: 'Brócoli', sku: 'BRO-001', precio: 7.20, unidadMedida: { simbolo: 'kg' } }
        ]);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
      // Datos mock en caso de error
      setProductos([
        { id: '1', nombre: 'Camote Negro', sku: 'CAM-001', precio: 5.50, unidadMedida: { simbolo: 'kg' } },
        { id: '2', nombre: 'Papa Blanca', sku: 'PAP-001', precio: 3.20, unidadMedida: { simbolo: 'kg' } },
        { id: '3', nombre: 'Cebolla Roja', sku: 'CEB-001', precio: 4.80, unidadMedida: { simbolo: 'kg' } },
        { id: '4', nombre: 'Tomate', sku: 'TOM-001', precio: 6.00, unidadMedida: { simbolo: 'kg' } },
        { id: '5', nombre: 'Zanahoria', sku: 'ZAN-001', precio: 2.90, unidadMedida: { simbolo: 'kg' } },
        { id: '6', nombre: 'Lechuga', sku: 'LEC-001', precio: 1.50, unidadMedida: { simbolo: 'und' } },
        { id: '7', nombre: 'Apio', sku: 'API-001', precio: 3.50, unidadMedida: { simbolo: 'kg' } },
        { id: '8', nombre: 'Brócoli', sku: 'BRO-001', precio: 7.20, unidadMedida: { simbolo: 'kg' } }
      ]);
    }
  };


  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'text-yellow-800 bg-yellow-100';
      case 'CONFIRMADO':
        return 'text-blue-800 bg-blue-100';
      case 'EN_PROCESO':
        return 'text-purple-800 bg-purple-100';
      case 'COMPLETADO':
        return 'text-green-800 bg-green-100';
      case 'ANULADO':
        return 'text-red-800 bg-red-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE');
  };

  const addItemToForm = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productoId: '', cantidad: 1, precio: 0 }]
    }));
  };

  const removeItemFromForm = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => {
      if (item.productoId && item.cantidad > 0 && item.precio > 0) {
        return sum + (item.cantidad * item.precio);
      }
      return sum;
    }, 0);
    
    const impuestos = subtotal * 0.18; // IGV del 18%
    const total = subtotal + impuestos;
    
    return { subtotal, impuestos, total };
  };

  const { subtotal, impuestos, total } = calculateTotals();

  const updateFormItem = (index: number, field: 'productoId' | 'cantidad' | 'precio', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value as never };
          
          // Si se cambió el producto, actualizar el precio automáticamente
          if (field === 'productoId' && typeof value === 'string' && value) {
            const producto = productos.find(p => p.id === value);
            if (producto) {
              updatedItem.precio = producto.precio;
            }
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.proveedorId || formData.items.length === 0) {
      alert('Por favor, selecciona un proveedor y agrega al menos un producto');
      return;
    }

    // Validar que todos los productos tengan cantidad y precio
    const hasInvalidItems = formData.items.some(item => 
      !item.productoId || item.cantidad <= 0 || item.precio <= 0
    );

    if (hasInvalidItems) {
      alert('Por favor, completa todos los campos de los productos (producto, cantidad y precio)');
      return;
    }

    try {
      const response = await fetch('/api/pedidos-compra', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Pedido de compra creado exitosamente');
        setShowModal(false);
        setFormData({
          proveedorId: '',
          fecha: new Date().toISOString().split('T')[0],
          fechaEntrega: '',
          observaciones: '',
          numeroGuia: '',
          items: []
        });
        fetchPedidos(); // Recargar la lista
      } else {
        // Crear pedido mock si la API falla
        const proveedor = proveedores.find(p => p.id === formData.proveedorId);
        const subtotal = formData.items.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);
        const impuestos = subtotal * 0.18;
        const total = subtotal + impuestos;

        const nuevoPedido: PedidoCompra = {
          id: Date.now().toString(),
          numero: `PC-2025-${String(pedidos.length + 1).padStart(3, '0')}`,
          fecha: formData.fecha,
          fechaEntrega: formData.fechaEntrega,
          subtotal,
          impuestos,
          total,
          estado: 'PENDIENTE',
          observaciones: formData.observaciones,
          numeroGuia: formData.numeroGuia,
          proveedor: { id: proveedor!.id, nombre: proveedor!.nombre },
          items: formData.items.map((item, index) => {
            const producto = productos.find(p => p.id === item.productoId)!;
            return {
              id: `${Date.now()}-${index}`,
              cantidad: item.cantidad,
              precio: item.precio,
              subtotal: item.cantidad * item.precio,
              producto: {
                id: producto.id,
                nombre: producto.nombre,
                sku: producto.sku,
                unidadMedida: producto.unidadMedida
              }
            };
          })
        };

        setPedidos(prev => [nuevoPedido, ...prev]);
        alert('Pedido de compra creado exitosamente (modo demo)');
        setShowModal(false);
        setFormData({
          proveedorId: '',
          fecha: new Date().toISOString().split('T')[0],
          fechaEntrega: '',
          observaciones: '',
          numeroGuia: '',
          items: []
        });
      }
    } catch (error) {
      console.error('Error al crear pedido:', error);
      alert('Error al crear el pedido de compra');
    }
  };

  const completarPedido = async (pedidoId: string) => {
    if (!confirm('¿Estás seguro de que deseas completar este pedido? Esto actualizará el inventario.')) {
      return;
    }

    try {
      const response = await fetch(`/api/pedidos-compra/${pedidoId}/completar`, {
        method: 'PUT',
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Pedido completado exitosamente. Inventario actualizado.');
        fetchPedidos();
      } else {
        alert(data.error || 'Error al completar el pedido');
      }
    } catch (error) {
      console.error('Error al completar pedido:', error);
      alert('Error al completar el pedido');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando pedidos de compra...</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-600">Gestión de pedidos a proveedores</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Pedido
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar pedidos..."
                aria-label="Buscar pedidos por número, proveedor o guía"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            
            <select
              title="Filtrar por estado"
              aria-label="Filtrar pedidos por estado"
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="CONFIRMADO">Confirmado</option>
              <option value="EN_PROCESO">En Proceso</option>
              <option value="COMPLETADO">Completado</option>
              <option value="ANULADO">Anulado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de pedidos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPedidos.map((pedido) => (
                <tr key={pedido.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{pedido.numero}</div>
                    {pedido.numeroGuia && (
                      <div className="text-sm text-gray-500">Guía: {pedido.numeroGuia}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{pedido.proveedor.nombre}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(pedido.fecha)}</div>
                    {pedido.fechaEntrega && (
                      <div className="text-sm text-gray-500">Entrega: {formatDate(pedido.fechaEntrega)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(pedido.total)}</div>
                    <div className="text-sm text-gray-500">{pedido.items.length} productos</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(pedido.estado)}`}>
                      {pedido.estado.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setViewingPedido(pedido)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Ver detalles del pedido"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {(pedido.estado === 'PENDIENTE' || pedido.estado === 'CONFIRMADO') && (
                      <button
                        onClick={() => completarPedido(pedido.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Completar pedido"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPedidos.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay pedidos</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || estadoFilter !== 'all' 
                ? 'No se encontraron pedidos con los filtros aplicados.'
                : 'Comienza creando tu primer pedido de compra.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Modal de nuevo pedido */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} ariaLabel="Crear Nuevo Pedido">
        <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Crear Nuevo Pedido</h3>
          </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Empresa y Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="empresa-select" className="block text-sm font-medium text-gray-900 mb-2">Empresa *</label>
                  <select
                    id="empresa-select"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                    required
                  >
                    <option value="">Seleccionar empresa</option>
                    <option value="todofrut">TodoFrut S.A.C.</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="cliente-select" className="block text-sm font-medium text-gray-900 mb-2">Cliente *</label>
                  <select
                    id="cliente-select"
                    title="Seleccionar cliente"
                    value={formData.proveedorId}
                    onChange={(e) => setFormData(prev => ({ ...prev, proveedorId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                    required
                  >
                    <option value="">Seleccionar cliente</option>
                    {proveedores.map(proveedor => (
                      <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dirección del Cliente */}
              <div>
                <label htmlFor="direccion-cliente" className="block text-sm font-medium text-gray-900 mb-2">Dirección del Cliente *</label>
                <select
                  id="direccion-cliente"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                  required
                >
                  <option value="">Seleccionar dirección</option>
                  <option value="direccion1">Dirección principal</option>
                </select>
              </div>

              {/* Moneda y Fechas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="moneda-select" className="block text-sm font-medium text-gray-900 mb-2">Moneda *</label>
                  <select
                    id="moneda-select"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                    required
                  >
                    <option value="PEN">Soles (S/.)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="fecha-pedido" className="block text-sm font-medium text-gray-900 mb-2">Fecha Pedido *</label>
                  <input
                    id="fecha-pedido"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="fecha-entrega" className="block text-sm font-medium text-gray-900 mb-2">Fecha Entrega</label>
                  <input
                    id="fecha-entrega"
                    type="date"
                    value={formData.fechaEntrega || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, fechaEntrega: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                  />
                </div>
              </div>

              {/* Productos */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Productos</h4>
                  <button
                    type="button"
                    onClick={addItemToForm}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md flex items-center text-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Producto
                  </button>
                </div>

                {formData.items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    No hay productos agregados
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {formData.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                            <td className="px-4 py-3">
                              <select
                                value={item.productoId}
                                onChange={(e) => updateFormItem(index, 'productoId', e.target.value)}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 bg-white"
                                aria-label={`Seleccionar producto para el ítem ${index + 1}`}
                                required
                              >
                                <option value="">Seleccionar producto</option>
                                {productos.map(producto => (
                                  <option key={producto.id} value={producto.id}>
                                    {producto.nombre} {producto.sku ? `(${producto.sku})` : ''}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="1"
                                value={item.cantidad}
                                onChange={(e) => updateFormItem(index, 'cantidad', parseInt(e.target.value) || 0)}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 bg-white"
                                aria-label={`Cantidad para el ítem ${index + 1}`}
                                placeholder="Cantidad"
                                required
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {productos.find(p => p.id === item.productoId)?.unidadMedida?.simbolo || '-'}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.precio}
                                onChange={(e) => updateFormItem(index, 'precio', parseFloat(e.target.value) || 0)}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 bg-white"
                                aria-label={`Precio unitario para el ítem ${index + 1}`}
                                placeholder="Precio"
                                required
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              S/ {(item.cantidad * item.precio).toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => removeItemFromForm(index)}
                                className="text-red-600 hover:text-red-800 text-sm"
                                aria-label="Eliminar producto"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Resumen de totales */}
                {formData.items.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="text-sm font-medium text-gray-900 mb-3">Resumen del Pedido</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">S/ {subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">IGV (18%):</span>
                        <span className="font-medium">S/ {impuestos.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-base font-semibold border-t pt-2">
                        <span className="text-gray-900">Total:</span>
                        <span className="text-green-600">S/ {total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Observaciones */}
              <div>
                <label htmlFor="observaciones-pedido" className="block text-sm font-medium text-gray-900 mb-2">Observaciones</label>
                <textarea
                  id="observaciones-pedido"
                  rows={3}
                  value={formData.observaciones || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                  placeholder="Observaciones del pedido..."
                />
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                >
                  Crear Pedido
                </button>
              </div>
            </form>
        </div>
      </Modal>

      {/* Modal de vista de pedido */}
      <Modal isOpen={!!viewingPedido} onClose={() => setViewingPedido(null)} ariaLabel="Detalle del Pedido">
        {viewingPedido && (
          <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                Detalle del Pedido {viewingPedido.numero}
              </h3>
            </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-gray-900"><strong>Proveedor:</strong> {viewingPedido.proveedor?.nombre || 'N/A'}</p>
                  <p className="text-gray-900"><strong>Fecha:</strong> {formatDate(viewingPedido.fecha)}</p>
                  {viewingPedido.fechaEntrega && (
                    <p className="text-gray-900"><strong>Fecha de Entrega:</strong> {formatDate(viewingPedido.fechaEntrega)}</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-900"><strong>Estado:</strong> <span className={`px-2 py-1 text-xs rounded-full ${getEstadoColor(viewingPedido.estado)}`}>
                    {viewingPedido.estado.replace('_', ' ')}
                  </span></p>
                  {viewingPedido.numeroGuia && (
                    <p className="text-gray-900"><strong>Número de Guía:</strong> {viewingPedido.numeroGuia}</p>
                  )}
                  {viewingPedido.observaciones && (
                    <p className="text-gray-900"><strong>Observaciones:</strong> {viewingPedido.observaciones}</p>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Productos</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {viewingPedido.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {item.producto?.nombre || 'N/A'}
                            {item.producto?.sku && <div className="text-gray-500">({item.producto.sku})</div>}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {item.cantidad} {item.producto?.unidadMedida?.simbolo || ''}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.precio)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      )) || []}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-gray-900">
                  <span className="font-medium">Subtotal:</span>
                  <span>{formatCurrency(viewingPedido.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between text-gray-900">
                  <span className="font-medium">Impuestos (18%):</span>
                  <span>{formatCurrency(viewingPedido.impuestos || 0)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total:</span>
                  <span>{formatCurrency(viewingPedido.total || 0)}</span>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setViewingPedido(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cerrar
                </button>
              </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
