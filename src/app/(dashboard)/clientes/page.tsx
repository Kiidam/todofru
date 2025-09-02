'use client';

import { Metadata } from 'next';
import { Search, Plus, Mail, DollarSign, MapPin, Check, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

// Datos de ejemplo basados en la imagen
const clientesData = [
  {
    id: 1,
    nombre: 'LA PLAZA GASTRONO...',
    fechaCreacion: '22/4/2025',
    grupoCliente: 'RUSTICA',
    contacto: 'Roycer Villegas',
    ruc: '20601651531',
    activo: true
  },
  {
    id: 2,
    nombre: 'SABORES CRIOLLOS D...',
    fechaCreacion: '22/4/2025',
    grupoCliente: 'RUSTICA',
    contacto: 'Roycer Villegas',
    ruc: '20601143371',
    activo: true
  },
  {
    id: 3,
    nombre: 'RISTORANTE SAPORE ...',
    fechaCreacion: '22/4/2025',
    grupoCliente: 'RUSTICA',
    contacto: 'Roycer Villegas',
    ruc: '20601144923',
    activo: true
  },
  {
    id: 4,
    nombre: 'PASTIFIQUEOS ITALIA...',
    fechaCreacion: '22/4/2025',
    grupoCliente: 'RUSTICA',
    contacto: 'Roycer Villegas',
    ruc: '20600161106',
    activo: true
  },
  {
    id: 5,
    nombre: 'PIQUEOS Y SABORES ...',
    fechaCreacion: '22/4/2025',
    grupoCliente: 'RUSTICA',
    contacto: 'Roycer Villegas',
    ruc: '20600158439',
    activo: true
  },
  {
    id: 6,
    nombre: 'LA ESQUINA DE SAN ...',
    fechaCreacion: '22/4/2025',
    grupoCliente: 'SAN ANTONIO',
    contacto: 'Adhemir Zarate',
    ruc: '20502117549',
    activo: true
  }
];

export default function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClientes, setFilteredClientes] = useState(clientesData);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = clientesData.filter(cliente => 
      cliente.nombre.toLowerCase().includes(term.toLowerCase()) ||
      cliente.contacto.toLowerCase().includes(term.toLowerCase()) ||
      cliente.ruc.includes(term)
    );
    setFilteredClientes(filtered);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Administrador de Clientes (39)</h1>
        </div>
        <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
          <Plus size={16} />
          Crear Cliente
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar un Cliente"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente / Fecha de creación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grupo de Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contacto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                RUC
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredClientes.map((cliente) => (
              <tr key={cliente.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-2 h-8 bg-green-500 rounded-sm mr-3"></div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{cliente.nombre}</div>
                      <div className="text-sm text-gray-500">{cliente.fechaCreacion}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex px-3 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                    {cliente.grupoCliente}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {cliente.contacto}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {cliente.ruc}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <button className="p-2 bg-green-100 text-green-600 rounded-md hover:bg-green-200 transition-colors">
                      <Mail size={16} />
                    </button>
                    <button className="p-2 bg-orange-100 text-orange-600 rounded-md hover:bg-orange-200 transition-colors">
                      <DollarSign size={16} />
                    </button>
                    <button className="p-2 bg-purple-100 text-purple-600 rounded-md hover:bg-purple-200 transition-colors">
                      <MapPin size={16} />
                    </button>
                    <button className="p-2 bg-green-100 text-green-600 rounded-md hover:bg-green-200 transition-colors">
                      <Check size={16} />
                    </button>
                    <button className="p-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors">
                      <Edit size={16} />
                    </button>
                    <button className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}