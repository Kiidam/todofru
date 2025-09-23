'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const Modal = dynamic(() => import('../../../src/components/ui/Modal'), { ssr: false });

interface Supplier {
  id: string;
  name: string;
  ruc: string;
  contactName: string;
  email: string;
  phone: string;
  website?: string;
  paymentType: string;
  createdAt: string;
  productsCount: number;
}

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    {
      id: '1',
      name: 'Frutas del Valle S.A.',
      ruc: '12345678901',
      contactName: 'María González',
      email: 'maria@frutasdelvalle.com',
      phone: '+34 123 456 789',
      website: 'https://frutasdelvalle.com',
      paymentType: 'contado',
      createdAt: '2024-01-15',
      productsCount: 25
    },
    {
      id: '2',
      name: 'Verduras Frescas Ltda.',
      ruc: '23456789012',
      contactName: 'Carlos Rodríguez',
      email: 'carlos@verdurasfrescas.com',
      phone: '+34 987 654 321',
      website: 'https://verdurasfrescas.com',
      paymentType: 'credito7',
      createdAt: '2024-01-10',
      productsCount: 18
    },
    {
      id: '3',
      name: 'Distribuidora Tropical',
      ruc: '34567890123',
      contactName: 'Ana Martínez',
      email: 'ana@tropical.com',
      phone: '+34 555 123 456',
      website: '',
      paymentType: 'credito15',
      createdAt: '2024-01-05',
      productsCount: 12
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Removed statusFilter, not needed

  const [formData, setFormData] = useState({
    name: '',
    ruc: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    paymentType: 'contado'
  });

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSupplier) {
      setSuppliers(prev => prev.map(supplier => 
        supplier.id === editingSupplier.id 
          ? { ...supplier, ...formData }
          : supplier
      ));
    } else {
      const newSupplier: Supplier = {
        id: Date.now().toString(),
        ...formData,
        productsCount: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setSuppliers(prev => [...prev, newSupplier]);
    }
    
    setIsModalOpen(false);
    setEditingSupplier(null);
    setFormData({
  name: '',
  ruc: '',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  paymentType: 'contado'
    });
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
  name: supplier.name,
  ruc: supplier.ruc,
  contactName: supplier.contactName,
  email: supplier.email,
  phone: supplier.phone,
  website: supplier.website || '',
  paymentType: supplier.paymentType
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este proveedor?')) {
      setSuppliers(prev => prev.filter(supplier => supplier.id !== id));
    }
  };

  const openModal = () => {
    setEditingSupplier(null);
    setFormData({
  name: '',
  ruc: '',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  paymentType: 'contado'
    });
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
              <p className="text-gray-600 mt-1">{filteredSuppliers.length} proveedores encontrados</p>
            </div>
            <button
              onClick={openModal}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Crear Proveedor
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar proveedores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              {/* Removed status filter buttons */}
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
                    Empresa
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Contacto
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Teléfono
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Ubicación
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Productos
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
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="font-medium text-gray-900">{supplier.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="text-gray-600">{supplier.contactName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="text-gray-600">{supplier.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="text-gray-600">{supplier.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="text-gray-600">{supplier.ruc}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="text-gray-600">{supplier.website}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="text-gray-600">{
                        supplier.paymentType === 'contado' ? 'Pago al Contado' :
                        supplier.paymentType === 'credito7' ? 'Crédito (7 días)' :
                        supplier.paymentType === 'credito15' ? 'Crédito (15 días)' :
                        supplier.paymentType === 'credito30' ? 'Crédito (30 días)' : supplier.paymentType
                      }</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {supplier.productsCount} productos
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Form */}
        <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingSupplier(null); }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="supplier-name">
                Razón Social*
              </label>
              <input
                id="supplier-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500"
                placeholder="Ej: Frutas del Valle S.A."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="supplier-ruc">
                RUC/DNI*
              </label>
              <input
                id="supplier-ruc"
                type="text"
                value={formData.ruc}
                onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500"
                placeholder="Ej: 12345678901"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="supplier-contact">
                Nombre de Contacto*
              </label>
              <input
                id="supplier-contact"
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500"
                placeholder="Ej: María González"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="supplier-email">
                Email*
              </label>
              <input
                id="supplier-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500"
                placeholder="contacto@empresa.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="supplier-phone">
                Teléfono*
              </label>
              <input
                id="supplier-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500"
                placeholder="+34 123 456 789"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="supplier-website">
                Sitio Web
              </label>
              <input
                id="supplier-website"
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500"
                placeholder="https://empresa.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="supplier-payment-type">
                Tipo de Pago
              </label>
              <select
                id="supplier-payment-type"
                value={formData.paymentType}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900"
              >
                <option value="contado">Pago al Contado</option>
                <option value="credito7">Crédito (7 días)</option>
                <option value="credito15">Crédito (15 días)</option>
                <option value="credito30">Crédito (30 días)</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); setEditingSupplier(null); }}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                {editingSupplier ? 'Actualizar Proveedor' : 'Crear Proveedor'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}