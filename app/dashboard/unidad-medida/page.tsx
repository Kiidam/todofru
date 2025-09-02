'use client';

import { useState } from 'react';

interface UnitOfMeasure {
  id: string;
  name: string;
  abbreviation: string;
  type: 'weight' | 'volume' | 'length' | 'unit';
  baseUnit?: string;
  conversionFactor?: number;
  status: 'active' | 'inactive';
  createdAt: string;
  productsCount: number;
}

export default function UnidadMedidaPage() {
  const [units, setUnits] = useState<UnitOfMeasure[]>([
    {
      id: '1',
      name: 'Kilogramo',
      abbreviation: 'kg',
      type: 'weight',
      status: 'active',
      createdAt: '2024-01-15',
      productsCount: 35
    },
    {
      id: '2',
      name: 'Gramo',
      abbreviation: 'g',
      type: 'weight',
      baseUnit: 'kg',
      conversionFactor: 0.001,
      status: 'active',
      createdAt: '2024-01-10',
      productsCount: 28
    },
    {
      id: '3',
      name: 'Litro',
      abbreviation: 'L',
      type: 'volume',
      status: 'active',
      createdAt: '2024-01-08',
      productsCount: 15
    },
    {
      id: '4',
      name: 'Unidad',
      abbreviation: 'und',
      type: 'unit',
      status: 'active',
      createdAt: '2024-01-05',
      productsCount: 42
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitOfMeasure | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'weight' | 'volume' | 'length' | 'unit'>('all');

  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    type: 'weight' as 'weight' | 'volume' | 'length' | 'unit',
    baseUnit: '',
    conversionFactor: '',
    status: 'active' as 'active' | 'inactive'
  });

  const filteredUnits = units.filter(unit => {
    const matchesSearch = unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         unit.abbreviation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || unit.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeLabel = (type: string) => {
    const labels = {
      weight: 'Peso',
      volume: 'Volumen',
      length: 'Longitud',
      unit: 'Unidad'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      weight: 'bg-blue-100 text-blue-800',
      volume: 'bg-green-100 text-green-800',
      length: 'bg-yellow-100 text-yellow-800',
      unit: 'bg-purple-100 text-purple-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUnit) {
      setUnits(prev => prev.map(unit => 
        unit.id === editingUnit.id 
          ? { 
              ...unit, 
              ...formData,
              conversionFactor: formData.conversionFactor ? parseFloat(formData.conversionFactor) : undefined
            }
          : unit
      ));
    } else {
      const newUnit: UnitOfMeasure = {
        id: Date.now().toString(),
        ...formData,
        conversionFactor: formData.conversionFactor ? parseFloat(formData.conversionFactor) : undefined,
        productsCount: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setUnits(prev => [...prev, newUnit]);
    }
    
    setIsModalOpen(false);
    setEditingUnit(null);
    setFormData({ 
      name: '', 
      abbreviation: '', 
      type: 'weight', 
      baseUnit: '', 
      conversionFactor: '', 
      status: 'active' 
    });
  };

  const handleEdit = (unit: UnitOfMeasure) => {
    setEditingUnit(unit);
    setFormData({
      name: unit.name,
      abbreviation: unit.abbreviation,
      type: unit.type,
      baseUnit: unit.baseUnit || '',
      conversionFactor: unit.conversionFactor?.toString() || '',
      status: unit.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta unidad de medida?')) {
      setUnits(prev => prev.filter(unit => unit.id !== id));
    }
  };

  const openModal = () => {
    setEditingUnit(null);
    setFormData({ 
      name: '', 
      abbreviation: '', 
      type: 'weight', 
      baseUnit: '', 
      conversionFactor: '', 
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
              <h1 className="text-2xl font-bold text-gray-900">Unidad de Medida</h1>
              <p className="text-gray-600 mt-1">{filteredUnits.length} unidades encontradas</p>
            </div>
            <button
              onClick={openModal}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Crear Unidad
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar unidades..."
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
                onClick={() => setTypeFilter('weight')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  typeFilter === 'weight'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Peso
              </button>
              <button
                onClick={() => setTypeFilter('volume')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  typeFilter === 'volume'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Volumen
              </button>
              <button
                onClick={() => setTypeFilter('unit')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  typeFilter === 'unit'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Unidad
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
                    Abreviación
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Tipo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Conversión
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
                {filteredUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="font-medium text-gray-900">{unit.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="font-mono text-sm text-gray-900">{unit.abbreviation}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(unit.type)}`}>
                        {getTypeLabel(unit.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      {unit.baseUnit && unit.conversionFactor ? (
                        <div className="text-sm text-gray-600">
                          1 {unit.abbreviation} = {unit.conversionFactor} {unit.baseUnit}
                        </div>
                      ) : (
                        <span className="text-gray-400">Unidad base</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {unit.productsCount} productos
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        unit.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {unit.status === 'active' ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(unit)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(unit.id)}
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
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-bold mb-4">
                {editingUnit ? 'Editar Unidad' : 'Crear Nueva Unidad'}
              </h2>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Abreviación
                  </label>
                  <input
                    type="text"
                    value={formData.abbreviation}
                    onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'weight' | 'volume' | 'length' | 'unit' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="weight">Peso</option>
                    <option value="volume">Volumen</option>
                    <option value="length">Longitud</option>
                    <option value="unit">Unidad</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unidad Base (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.baseUnit}
                    onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="ej: kg, L"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Factor de Conversión (opcional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.conversionFactor}
                    onChange={(e) => setFormData({ ...formData, conversionFactor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="ej: 0.001"
                  />
                </div>
                
                <div className="mb-6">
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
                
                <div className="flex justify-end space-x-3">
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
                    {editingUnit ? 'Actualizar' : 'Crear'}
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