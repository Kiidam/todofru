'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const Modal = dynamic(() => import('../../../src/components/ui/Modal'), { ssr: false });

interface ClientGroup {
  id: string;
  name: string;
  description: string;
  discount: number;
  clientsCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export default function GrupoClientePage() {
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([
    {
      id: '1',
      name: 'Clientes VIP',
      description: 'Clientes con mayor volumen de compras',
      discount: 15,
      clientsCount: 8,
      status: 'active',
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      name: 'Restaurantes',
      description: 'Grupo de clientes del sector restauración',
      discount: 10,
      clientsCount: 12,
      status: 'active',
      createdAt: '2024-01-10'
    },
    {
      id: '3',
      name: 'Mayoristas',
      description: 'Clientes que compran al por mayor',
      discount: 20,
      clientsCount: 5,
      status: 'inactive',
      createdAt: '2024-01-08'
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ClientGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount: 0,
    status: 'active' as 'active' | 'inactive'
  });

  const filteredGroups = clientGroups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || group.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingGroup) {
      setClientGroups(prev => prev.map(group => 
        group.id === editingGroup.id 
          ? { ...group, ...formData }
          : group
      ));
    } else {
      const newGroup: ClientGroup = {
        id: Date.now().toString(),
        ...formData,
        clientsCount: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setClientGroups(prev => [...prev, newGroup]);
    }
    
    setIsModalOpen(false);
    setEditingGroup(null);
    setFormData({ name: '', description: '', discount: 0, status: 'active' });
  };

  const handleEdit = (group: ClientGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description,
      discount: group.discount,
      status: group.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este grupo de cliente?')) {
      setClientGroups(prev => prev.filter(group => group.id !== id));
    }
  };

  const openModal = () => {
    setEditingGroup(null);
    setFormData({ name: '', description: '', discount: 0, status: 'active' });
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Grupo de Cliente</h1>
              <p className="text-gray-600 mt-1">{filteredGroups.length} grupos encontrados</p>
            </div>
            <button
              onClick={openModal}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Crear Grupo
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar grupos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
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
                    Nombre
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Descripción
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Descuento
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Clientes
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Fecha Creación
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="font-medium text-gray-900">{group.name}</div>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-200">
                      <div className="text-gray-600 max-w-xs truncate">{group.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {group.discount}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {group.clientsCount} clientes
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        group.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {group.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 border-r border-gray-200">
                      {new Date(group.createdAt).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(group)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(group.id)}
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
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          ariaLabel={editingGroup ? 'Editar grupo de clientes' : 'Crear nuevo grupo de clientes'}
        >
          <div className="modal-header">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {editingGroup ? 'Editar Grupo' : 'Crear Nuevo Grupo'}
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="grupo-name" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre
              </label>
              <input
                id="grupo-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ingrese el nombre del grupo"
                required
                aria-describedby="grupo-name-help"
              />
              <span id="grupo-name-help" className="text-xs text-gray-500">
                Nombre único para identificar el grupo de clientes
              </span>
            </div>
            
            <div>
              <label htmlFor="grupo-description" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                id="grupo-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Describa las características del grupo"
                required
                aria-describedby="grupo-description-help"
              />
              <span id="grupo-description-help" className="text-xs text-gray-500">
                Descripción detallada del tipo de clientes del grupo
              </span>
            </div>
            
            <div>
              <label htmlFor="grupo-discount" className="block text-sm font-medium text-gray-700 mb-2">
                Descuento (%)
              </label>
              <input
                id="grupo-discount"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.0"
                required
                aria-describedby="grupo-discount-help"
              />
              <span id="grupo-discount-help" className="text-xs text-gray-500">
                Porcentaje de descuento para este grupo (0-100%)
              </span>
            </div>
            
            <div>
              <label htmlFor="grupo-status" className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                id="grupo-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                aria-describedby="grupo-status-help"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
              <span id="grupo-status-help" className="text-xs text-gray-500">
                Estado actual del grupo en el sistema
              </span>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {editingGroup ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}