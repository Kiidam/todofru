"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const Modal = dynamic(() => import('../../../src/components/ui/Modal'), { ssr: false });

interface GrupoCliente {
  id: string;
  nombre: string;
}

interface Client {
  id: string;
  nombre: string;
  ruc?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto?: string;
  tipoCliente: 'MAYORISTA' | 'MINORISTA';
  activo: boolean;
  grupoClienteId?: string;
  metodoPago?: string;
  website?: string;
  mensajePersonalizado?: string;
  createdAt: string;
  totalOrders: number;
  totalSpent: number;
}

export default function ClientesPage() {
// ...existing code...

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([
    {
      id: '1',
      nombre: 'Restaurante El Jardín',
      ruc: '12345678901',
      telefono: '+34 123 456 789',
      email: 'jardin@restaurante.com',
      direccion: 'Calle Mayor 123',
      contacto: 'Ana Pérez',
      tipoCliente: 'MAYORISTA',
      activo: true,
      grupoClienteId: '',
      metodoPago: 'TRANSFERENCIA',
      website: 'https://eljardin.com',
      mensajePersonalizado: 'Gracias por confiar en nosotros.',
      createdAt: '2025-09-01',
      totalOrders: 12,
      totalSpent: 1500.50
    },
    {
      id: '2',
      nombre: 'Frutería La Esquina',
      ruc: '98765432109',
      telefono: '+34 987 654 321',
      email: 'contacto@laesquina.com',
      direccion: 'Avenida Central 45',
      contacto: 'Luis Gómez',
      tipoCliente: 'MINORISTA',
      activo: true,
      grupoClienteId: '',
      metodoPago: 'EFECTIVO',
      website: '',
      mensajePersonalizado: '',
      createdAt: '2025-08-15',
      totalOrders: 5,
      totalSpent: 320.00
    },
    {
      id: '3',
      nombre: 'Supermercado Central',
      ruc: '11223344556',
      telefono: '+34 555 666 777',
      email: 'compras@supercentral.com',
      direccion: 'Plaza Mayor 1',
      contacto: 'Marta Ruiz',
      tipoCliente: 'MAYORISTA',
      activo: false,
      grupoClienteId: '',
      metodoPago: 'CHEQUE',
      website: 'https://supercentral.com',
      mensajePersonalizado: '',
      createdAt: '2025-07-10',
      totalOrders: 20,
      totalSpent: 5000.00
    }
  ]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'individual' | 'business'>('all');

  const [formData, setFormData] = useState({
    nombre: '',
    ruc: '',
    telefono: '',
    email: '',
    direccion: '',
    contacto: '',
    tipoCliente: 'MINORISTA' as 'MAYORISTA' | 'MINORISTA',
    activo: true,
    grupoClienteId: '',
    metodoPago: '',
    website: '',
    mensajePersonalizado: ''
  });

  const [grupos, setGrupos] = useState<GrupoCliente[]>([]);

  useEffect(() => {
    fetch('/api/grupo-cliente')
      .then(res => res.json())
      .then(data => {
        if (data.success) setGrupos(data.data);
      });
  }, []);

  const filteredClients = clients.filter((client: Client): boolean => {
    const matchesSearch = client.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    // Puedes agregar más filtros aquí si es necesario
    return matchesSearch;
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
    
    if (editingClient) {
      setClients((prev: Client[]) => prev.map((client: Client) =>
        client.id === editingClient.id
          ? { ...client, ...formData }
          : client
      ));
    } else {
      const newClient: Client = {
        id: Date.now().toString(),
        ...formData,
        totalOrders: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setClients((prev: Client[]) => [...prev, newClient]);
    }
    
    setIsModalOpen(false);
    setEditingClient(null);
    setFormData({
      nombre: '',
      ruc: '',
      telefono: '',
      email: '',
      direccion: '',
      contacto: '',
      tipoCliente: 'MINORISTA',
      activo: true,
      grupoClienteId: '',
      metodoPago: '',
      website: '',
      mensajePersonalizado: ''
    });
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      nombre: client.nombre,
      ruc: client.ruc || '',
      telefono: client.telefono || '',
      email: client.email || '',
      direccion: client.direccion || '',
      contacto: client.contacto || '',
      tipoCliente: client.tipoCliente,
      activo: client.activo,
      grupoClienteId: client.grupoClienteId || '',
      metodoPago: client.metodoPago || '',
      website: client.website || '',
      mensajePersonalizado: client.mensajePersonalizado || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
      setClients((prev: Client[]) => prev.filter((client: Client) => client.id !== id));
    }
  };

  const openModal = () => {
    setEditingClient(null);
    setFormData({
      nombre: '',
      ruc: '',
      telefono: '',
      email: '',
      direccion: '',
      contacto: '',
      tipoCliente: 'MINORISTA',
      activo: true,
      grupoClienteId: '',
      metodoPago: '',
      website: '',
      mensajePersonalizado: ''
    });
    setIsModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
              <p className="text-gray-600 mt-1">{filteredClients.length} clientes encontrados</p>
            </div>
            <button
              onClick={openModal}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Crear Cliente
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                aria-label="Filtrar por tipo de cliente"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'individual' | 'business')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">Todos los tipos</option>
                <option value="individual">Individual</option>
                <option value="business">Empresa</option>
              </select>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === 'active'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Activos
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === 'inactive'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Inactivos
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Cliente
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Contacto
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Ubicación
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Tipo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Pedidos
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Total Gastado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client: Client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div>
                        <div className="font-medium text-gray-900">{client.nombre}</div>
                        <div className="text-sm text-gray-500">{client.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="text-gray-600">{client.telefono}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="text-gray-600">{client.direccion}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        client.tipoCliente === 'MAYORISTA'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {client.tipoCliente === 'MAYORISTA' ? 'Mayorista' : 'Minorista'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="text-gray-600">{client.totalOrders}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="font-medium text-gray-900">{formatCurrency(client.totalSpent)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        client.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {client.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(client)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingClient(null); }} ariaLabel={editingClient ? 'Editar Cliente' : 'Crear Nuevo Cliente'}>
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {editingClient ? 'Editar Cliente' : 'Crear Nuevo Cliente'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {editingClient ? 'Modifica los datos del cliente seleccionado' : 'Completa los datos para crear un nuevo cliente'}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="nombre">Nombre</label>
                <input id="nombre" type="text" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500" placeholder="Ej: Restaurante El Jardín" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="ruc">RUC</label>
                <input id="ruc" type="text" value={formData.ruc} onChange={e => setFormData({ ...formData, ruc: e.target.value })} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500" placeholder="RUC" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="telefono">Teléfono</label>
                <input id="telefono" type="tel" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500" placeholder="+34 123 456 789" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="email">Email</label>
                <input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500" placeholder="correo@ejemplo.com" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="direccion">Dirección</label>
                <input id="direccion" type="text" value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500" placeholder="Calle Mayor 123" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="contacto">Contacto</label>
                <input id="contacto" type="text" value={formData.contacto} onChange={e => setFormData({ ...formData, contacto: e.target.value })} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500" placeholder="Nombre del contacto" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="tipoCliente">Tipo de Cliente</label>
                <select id="tipoCliente" value={formData.tipoCliente} onChange={e => setFormData({ ...formData, tipoCliente: e.target.value as 'MAYORISTA' | 'MINORISTA' })} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900">
                  <option value="MAYORISTA">Mayorista</option>
                  <option value="MINORISTA">Minorista</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="grupoClienteId">Grupo de Cliente</label>
                <select id="grupoClienteId" value={formData.grupoClienteId} onChange={e => setFormData({ ...formData, grupoClienteId: e.target.value })} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900">
                  <option value="">Sin grupo</option>
                  {grupos.map(grupo => (
                    <option key={grupo.id} value={grupo.id}>{grupo.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="metodoPago">Tipo de Pago</label>
                <select id="metodoPago" value={formData.metodoPago} onChange={e => setFormData({ ...formData, metodoPago: e.target.value })} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900">
                  <option value="">Seleccione</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="YAPE">Yape</option>
                  <option value="PLIN">Plin</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="website">Sitio Web</label>
                <input id="website" type="text" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500" placeholder="https://" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="mensajePersonalizado">Mensaje Personalizado para Correos</label>
              <textarea id="mensajePersonalizado" value={formData.mensajePersonalizado} onChange={e => setFormData({ ...formData, mensajePersonalizado: e.target.value })} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500" placeholder="Mensaje personalizado..." rows={2} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="activo">Estado</label>
              <select id="activo" value={formData.activo ? 'activo' : 'inactivo'} onChange={e => setFormData({ ...formData, activo: e.target.value === 'activo' })} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900">
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button type="button" onClick={() => { setIsModalOpen(false); setEditingClient(null); }} className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancelar</button>
              <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm">{editingClient ? 'Actualizar Cliente' : 'Crear Cliente'}</button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
