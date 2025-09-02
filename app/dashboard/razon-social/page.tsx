'use client';

import { useState } from 'react';

interface BusinessName {
  id: string;
  name: string;
  taxId: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  type: 'individual' | 'company' | 'corporation';
  status: 'active' | 'inactive';
  createdAt: string;
  transactionsCount: number;
}

export default function RazonSocialPage() {
  const [businessNames, setBusinessNames] = useState<BusinessName[]>([
    {
      id: '1',
      name: 'TodoFru S.A.S.',
      taxId: '900123456-7',
      address: 'Calle 123 #45-67, Bogotá',
      phone: '+57 1 234 5678',
      email: 'info@todofru.com',
      website: 'https://todofru.com',
      type: 'company',
      status: 'active',
      createdAt: '2024-01-15',
      transactionsCount: 156
    },
    {
      id: '2',
      name: 'Distribuidora Frutas del Valle Ltda.',
      taxId: '800987654-3',
      address: 'Carrera 50 #30-20, Cali',
      phone: '+57 2 345 6789',
      email: 'ventas@frutasdelvalle.com',
      type: 'company',
      status: 'active',
      createdAt: '2024-01-10',
      transactionsCount: 89
    },
    {
      id: '3',
      name: 'Juan Carlos Pérez',
      taxId: '12345678-9',
      address: 'Avenida 80 #25-15, Medellín',
      phone: '+57 4 567 8901',
      type: 'individual',
      status: 'inactive',
      createdAt: '2024-01-08',
      transactionsCount: 23
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBusinessName, setEditingBusinessName] = useState<BusinessName | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'individual' | 'company' | 'corporation'>('all');

  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    type: 'company' as 'individual' | 'company' | 'corporation',
    status: 'active' as 'active' | 'inactive'
  });

  const filteredBusinessNames = businessNames.filter(business => {
    const matchesSearch = business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         business.taxId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || business.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeLabel = (type: string) => {
    const labels = {
      individual: 'Persona Natural',
      company: 'Empresa',
      corporation: 'Corporación'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      individual: 'bg-blue-100 text-blue-800',
      company: 'bg-green-100 text-green-800',
      corporation: 'bg-purple-100 text-purple-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingBusinessName) {
      setBusinessNames(prev => prev.map(business => 
        business.id === editingBusinessName.id 
          ? { ...business, ...formData }
          : business
      ));
    } else {
      const newBusinessName: BusinessName = {
        id: Date.now().toString(),
        ...formData,
        transactionsCount: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setBusinessNames(prev => [...prev, newBusinessName]);
    }
    
    setIsModalOpen(false);
    setEditingBusinessName(null);
    setFormData({ 
      name: '', 
      taxId: '', 
      address: '', 
      phone: '', 
      email: '', 
      website: '', 
      type: 'company', 
      status: 'active' 
    });
  };

  const handleEdit = (business: BusinessName) => {
    setEditingBusinessName(business);
    setFormData({
      name: business.name,
      taxId: business.taxId,
      address: business.address,
      phone: business.phone || '',
      email: business.email || '',
      website: business.website || '',
      type: business.type,
      status: business.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta razón social?')) {
      setBusinessNames(prev => prev.filter(business => business.id !== id));
    }
  };

  const openModal = () => {
    setEditingBusinessName(null);
    setFormData({ 
      name: '', 
      taxId: '', 
      address: '', 
      phone: '', 
      email: '', 
      website: '', 
      type: 'company', 
      status: 'active' 
    });
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Razón Social</h1>
              <p className="text-gray-600 mt-1">{filteredBusinessNames.length} razones sociales encontradas</p>
            </div>
            <button
              onClick={openModal}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Crear Razón Social
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por nombre o NIT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  typeFilter === 'all'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setTypeFilter('individual')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  typeFilter === 'individual'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Persona Natural
              </button>
              <button
                onClick={() => setTypeFilter('company')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  typeFilter === 'company'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Empresa
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Nombre
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    NIT/Cédula
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Tipo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Contacto
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Transacciones
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
                {filteredBusinessNames.map((business) => (
                  <tr key={business.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 border-r border-gray-200">
                      <div className="font-medium text-gray-900">{business.name}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{business.address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="font-mono text-sm text-gray-900">{business.taxId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(business.type)}`}>
                        {getTypeLabel(business.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-200">
                      <div className="text-sm text-gray-900">
                        {business.phone && <div>{business.phone}</div>}
                        {business.email && (
                          <div>
                            <a href={`mailto:${business.email}`} className="text-blue-600 hover:text-blue-800">
                              {business.email}
                            </a>
                          </div>
                        )}
                        {business.website && (
                          <div>
                            <a 
                              href={business.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Sitio web
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {business.transactionsCount} transacciones
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        business.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {business.status === 'active' ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(business)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(business.id)}
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

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
              <h2 className="text-xl font-bold mb-4">
                {editingBusinessName ? 'Editar Razón Social' : 'Crear Nueva Razón Social'}
              </h2>
              
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre / Razón Social
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NIT / Cédula
                    </label>
                    <input
                      type="text"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'individual' | 'company' | 'corporation' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="individual">Persona Natural</option>
                      <option value="company">Empresa</option>
                      <option value="corporation">Corporación</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono (opcional)
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email (opcional)
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sitio Web (opcional)
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="https://ejemplo.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="active">Activa</option>
                      <option value="inactive">Inactiva</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {editingBusinessName ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}