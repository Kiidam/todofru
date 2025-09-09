'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const Modal = dynamic(() => import('../../../src/components/ui/Modal'), { ssr: false });

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  clientType: 'individual' | 'business';
  status: 'active' | 'inactive';
  createdAt: string;
  totalOrders: number;
  totalSpent: number;
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([
    {
      id: '1',
      name: 'Restaurante El Jardín',
      email: 'pedidos@eljardin.com',
      phone: '+34 123 456 789',
      address: 'Calle Mayor 123',
      city: 'Madrid',
      country: 'España',
      clientType: 'business',
      status: 'active',
      createdAt: '2024-01-15',
      totalOrders: 45,
      totalSpent: 12500.50
    },
    {
      id: '2',
      name: 'María García López',
      email: 'maria.garcia@email.com',
      phone: '+34 987 654 321',
      address: 'Avenida Central 456',
      city: 'Barcelona',
      country: 'España',
      clientType: 'individual',
      status: 'active',
      createdAt: '2024-01-10',
      totalOrders: 12,
      totalSpent: 850.25
    },
    {
      id: '3',
      name: 'Supermercado Fresh',
      email: 'compras@fresh.com',
      phone: '+34 555 123 456',
      address: 'Plaza del Mercado 789',
      city: 'Valencia',
      country: 'España',
      clientType: 'business',
      status: 'inactive',
      createdAt: '2024-01-05',
      totalOrders: 28,
      totalSpent: 8750.00
    },
    {
      id: '4',
      name: 'Carlos Rodríguez',
      email: 'carlos.rodriguez@email.com',
      phone: '+34 666 789 012',
      address: 'Calle de la Paz 321',
      city: 'Sevilla',
      country: 'España',
      clientType: 'individual',
      status: 'active',
      createdAt: '2024-01-08',
      totalOrders: 8,
      totalSpent: 425.75
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'individual' | 'business'>('all');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    clientType: 'individual' as 'individual' | 'business',
    status: 'active' as 'active' | 'inactive'
  });

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    const matchesType = typeFilter === 'all' || client.clientType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingClient) {
      setClients(prev => prev.map(client => 
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
      setClients(prev => [...prev, newClient]);
    }
    
    setIsModalOpen(false);
    setEditingClient(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      clientType: 'individual',
      status: 'active'
    });
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      country: client.country,
      clientType: client.clientType,
      status: client.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
      setClients(prev => prev.filter(client => client.id !== id));
    }
  };

  const openModal = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      clientType: 'individual',
      status: 'active'
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
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div>
                        <div className="font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-500">{client.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="text-gray-600">{client.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="text-gray-600">{client.city}, {client.country}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        client.clientType === 'business'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {client.clientType === 'business' ? 'Empresa' : 'Individual'}
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
                        client.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {client.status === 'active' ? 'Activo' : 'Inactivo'}
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
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="client-name">
                  Nombre
                </label>
                <input
                  id="client-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500"
                  placeholder="Ej: Restaurante El Jardín"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="client-type">
                  Tipo de Cliente
                </label>
                <select
                  id="client-type"
                  aria-label="Tipo de cliente"
                  value={formData.clientType}
                  onChange={(e) => setFormData({ ...formData, clientType: e.target.value as 'individual' | 'business' })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900"
                >
                  <option value="individual">Individual</option>
                  <option value="business">Empresa</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="client-email">
                  Email
                </label>
                <input
                  id="client-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500"
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="client-phone">
                  Teléfono
                </label>
                <input
                  id="client-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500"
                  placeholder="+34 123 456 789"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="client-address">
                Dirección
              </label>
              <input
                id="client-address"
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500"
                placeholder="Calle Mayor 123"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="client-city">
                  Ciudad
                </label>
                <input
                  id="client-city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500"
                  placeholder="Ej: Madrid"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="client-country">
                  País
                </label>
                <input
                  id="client-country"
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500"
                  placeholder="Ej: España"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="client-status">
                Estado
              </label>
              <select
                id="client-status"
                aria-label="Estado del cliente"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); setEditingClient(null); }}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                {editingClient ? 'Actualizar Cliente' : 'Crear Cliente'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}