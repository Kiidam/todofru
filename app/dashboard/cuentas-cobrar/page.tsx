'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, AlertTriangle, DollarSign, Calendar } from 'lucide-react';
import dynamic from 'next/dynamic';

const Modal = dynamic(() => import('../../../src/components/ui/Modal'), { ssr: false });

interface Cliente {
  id: string;
  nombre: string;
  tipoCliente: string;
}

interface CuentaPorCobrar {
  id: string;
  numero: string;
  monto: number;
  montoAbonado: number;
  saldo: number;
  fechaEmision: string;
  fechaVencimiento: string;
  estado: 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'VENCIDO' | 'ANULADO';
  observaciones?: string;
  cliente: {
    id: string;
    nombre: string;
    tipoCliente: string;
  };
  pagos?: Array<{
    id: string;
    monto: number;
    fechaPago: string;
    metodoPago: string;
  }>;
}

export default function CuentasPorCobrarPage() {
  const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredCuentas, setFilteredCuentas] = useState<CuentaPorCobrar[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Estadísticas
  const [stats, setStats] = useState({
    totalPorCobrar: 0,
    vencidas: 0,
    porVencer: 0,
    cobradas: 0
  });

  useEffect(() => {
    fetchCuentas();
    fetchClientes();
  }, []);

  useEffect(() => {
    filterCuentas();
    calculateStats();
  }, [cuentas, searchTerm, estadoFilter]);

  const fetchCuentas = async () => {
    try {
      const response = await fetch('/api/cuentas-por-cobrar');
      const data = await response.json();
      
      if (data.success) {
        setCuentas(data.data);
      }
    } catch (error) {
      console.error('Error al cargar cuentas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const response = await fetch('/api/clientes?limit=100');
      const data = await response.json();
      
      if (data.success) {
        setClientes(data.data);
      }
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  };

  const calculateStats = () => {
    const now = new Date();
    const totalPorCobrar = cuentas
      .filter(c => c.estado === 'PENDIENTE' || c.estado === 'PARCIAL')
      .reduce((sum, c) => sum + c.saldo, 0);
    
    const vencidas = cuentas.filter(c => 
      (c.estado === 'PENDIENTE' || c.estado === 'PARCIAL') && 
      new Date(c.fechaVencimiento) < now
    ).length;
    
    const porVencer = cuentas.filter(c => 
      (c.estado === 'PENDIENTE' || c.estado === 'PARCIAL') && 
      new Date(c.fechaVencimiento) >= now
    ).length;
    
    const cobradas = cuentas.filter(c => c.estado === 'PAGADO').length;

    setStats({ totalPorCobrar, vencidas, porVencer, cobradas });
  };

  const filterCuentas = () => {
    let filtered = cuentas;

    if (searchTerm) {
      filtered = filtered.filter(cuenta =>
        cuenta.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cuenta.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (estadoFilter !== 'all') {
      if (estadoFilter === 'vencidas') {
        const now = new Date();
        filtered = filtered.filter(cuenta => 
          (cuenta.estado === 'PENDIENTE' || cuenta.estado === 'PARCIAL') && 
          new Date(cuenta.fechaVencimiento) < now
        );
      } else {
        filtered = filtered.filter(cuenta => cuenta.estado === estadoFilter);
      }
    }

    setFilteredCuentas(filtered);
  };

  const getEstadoColor = (cuenta: CuentaPorCobrar) => {
    if (cuenta.estado === 'PAGADO') return 'text-green-800 bg-green-100';
    if (cuenta.estado === 'ANULADO') return 'text-red-800 bg-red-100';
    
    const now = new Date();
    const vencimiento = new Date(cuenta.fechaVencimiento);
    
    if (vencimiento < now) return 'text-red-800 bg-red-100';
    if (cuenta.estado === 'PARCIAL') return 'text-yellow-800 bg-yellow-100';
    return 'text-blue-800 bg-blue-100';
  };

  const getEstadoText = (cuenta: CuentaPorCobrar) => {
    if (cuenta.estado === 'PAGADO') return 'Pagado';
    if (cuenta.estado === 'ANULADO') return 'Anulado';
    
    const now = new Date();
    const vencimiento = new Date(cuenta.fechaVencimiento);
    
    if (vencimiento < now) return 'Vencida';
    if (cuenta.estado === 'PARCIAL') return 'Parcial';
    return 'Pendiente';
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const cuentaData = {
      clienteId: formData.get('clienteId') as string,
      numero: formData.get('numero') as string,
      monto: parseFloat(formData.get('monto') as string),
      fechaVencimiento: formData.get('fechaVencimiento') as string,
      observaciones: formData.get('observaciones') as string || null,
    };

    try {
      const response = await fetch('/api/cuentas-por-cobrar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cuentaData),
      });

      const result = await response.json();

      if (result.success) {
        setShowModal(false);
        fetchCuentas(); // Recargar la lista
        (e.target as HTMLFormElement).reset(); // Limpiar formulario
      } else {
        alert('Error al crear cuenta: ' + result.error);
      }
    } catch (error) {
      console.error('Error al crear cuenta:', error);
      alert('Error al crear cuenta');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando cuentas por cobrar...</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Cuentas por Cobrar</h1>
          <p className="text-gray-600">Gestión de cobranzas a clientes</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cuenta
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Por Cobrar</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalPorCobrar)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Vencidas</p>
              <p className="text-2xl font-bold text-red-600">{stats.vencidas}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Por Vencer</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.porVencer}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CreditCard className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Cobradas</p>
              <p className="text-2xl font-bold text-green-600">{stats.cobradas}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar cuentas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            
            <select
              title="Filtrar por estado"
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">Todos los estados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="PARCIAL">Parciales</option>
              <option value="PAGADO">Pagadas</option>
              <option value="vencidas">Vencidas</option>
              <option value="ANULADO">Anuladas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de cuentas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vencimiento
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
              {filteredCuentas.map((cuenta) => (
                <tr key={cuenta.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{cuenta.numero}</div>
                    <div className="text-sm text-gray-500">Emisión: {formatDate(cuenta.fechaEmision)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{cuenta.cliente.nombre}</div>
                    <div className="text-sm text-gray-500">{cuenta.cliente.tipoCliente}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(cuenta.monto)}</div>
                    {cuenta.montoAbonado > 0 && (
                      <div className="text-sm text-green-600">Abonado: {formatCurrency(cuenta.montoAbonado)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(cuenta.saldo)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(cuenta.fechaVencimiento)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(cuenta)}`}>
                      {getEstadoText(cuenta)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {(cuenta.estado === 'PENDIENTE' || cuenta.estado === 'PARCIAL') && (
                      <button
                        onClick={() => {/* registrar pago */}}
                        className="text-green-600 hover:text-green-900"
                        title="Registrar pago"
                      >
                        Cobrar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCuentas.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay cuentas</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || estadoFilter !== 'all' 
                ? 'No se encontraron cuentas con los filtros aplicados.'
                : 'Comienza creando tu primera cuenta por cobrar.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Modal para agregar nueva cuenta */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} ariaLabel="Nueva Cuenta por Cobrar">
        <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
          {/* HEADER */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Nueva Cuenta por Cobrar</h2>
            <p className="text-sm text-gray-600 mt-1">Completa los datos para registrar una nueva cuenta</p>
          </div>
          {/* FORMULARIO */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cliente" className="block text-sm font-medium text-gray-900 mb-2">Cliente *</label>
                <select
                  id="cliente"
                  name="clienteId"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Seleccionar cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="numero" className="block text-sm font-medium text-gray-900 mb-2">Número de Cuenta *</label>
                <input
                  type="text"
                  id="numero"
                  name="numero"
                  required
                  placeholder="CC-001"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label htmlFor="monto" className="block text-sm font-medium text-gray-900 mb-2">Monto *</label>
                <input
                  type="number"
                  id="monto"
                  name="monto"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label htmlFor="fechaVencimiento" className="block text-sm font-medium text-gray-900 mb-2">Fecha de Vencimiento *</label>
                <input
                  type="date"
                  id="fechaVencimiento"
                  name="fechaVencimiento"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="observaciones" className="block text-sm font-medium text-gray-900 mb-2">Observaciones</label>
              <textarea
                id="observaciones"
                name="observaciones"
                rows={3}
                placeholder="Observaciones adicionales..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
