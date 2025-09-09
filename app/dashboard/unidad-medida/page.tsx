'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const Modal = dynamic(() => import('../../../src/components/ui/Modal'), { ssr: false });

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

        <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingUnit(null); }} ariaLabel={editingUnit ? 'Editar Unidad' : 'Crear Nueva Unidad'}>
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {editingUnit ? 'Editar Unidad' : 'Crear Nueva Unidad'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {editingUnit ? 'Modifica los datos de la unidad seleccionada' : 'Completa los datos para crear una nueva unidad de medida'}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="unit-name">
                  Nombre
                </label>
                <input
                  id="unit-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500"
                  placeholder="Ej: Kilogramo"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="unit-abbreviation">
                  Abreviación
                </label>
                <input
                  id="unit-abbreviation"
                  type="text"
                  value={formData.abbreviation}
                  onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500 font-mono"
                  placeholder="Ej: kg"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="unit-type">
                Tipo
              </label>
              <select
                id="unit-type"
                aria-label="Tipo de unidad de medida"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'weight' | 'volume' | 'length' | 'unit' })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900"
              >
                <option value="weight">Peso</option>
                <option value="volume">Volumen</option>
                <option value="length">Longitud</option>
                <option value="unit">Unidad</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="unit-base">
                  Unidad Base (opcional)
                </label>
                <input
                  id="unit-base"
                  type="text"
                  value={formData.baseUnit}
                  onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500"
                  placeholder="ej: kg, L"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="unit-conversion">
                  Factor de Conversión (opcional)
                </label>
                <input
                  id="unit-conversion"
                  type="number"
                  step="any"
                  value={formData.conversionFactor}
                  onChange={(e) => setFormData({ ...formData, conversionFactor: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900 placeholder-gray-500"
                  placeholder="ej: 0.001"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2" htmlFor="unit-status">
                Estado
              </label>
              <select
                id="unit-status"
                aria-label="Estado de la unidad"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white text-gray-900"
              >
                <option value="active">Activa</option>
                <option value="inactive">Inactiva</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); setEditingUnit(null); }}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                {editingUnit ? 'Actualizar Unidad' : 'Crear Unidad'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}