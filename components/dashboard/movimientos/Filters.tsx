import React from 'react';

export interface MovimientosFiltersState {
  searchTerm: string;
  fechaDesde: string;
  fechaHasta: string;
}

interface FiltersProps {
  state: MovimientosFiltersState;
  onChange: (updates: Partial<MovimientosFiltersState>) => void;
}

const Filters: React.FC<FiltersProps> = ({ state, onChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Buscar
        </label>
        <input
          type="text"
          placeholder="Buscar por producto, proveedor o número..."
          value={state.searchTerm}
          onChange={(e) => onChange({ searchTerm: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fecha desde
        </label>
        <input
          type="date"
          value={state.fechaDesde}
          onChange={(e) => onChange({ fechaDesde: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fecha hasta
        </label>
        <input
          type="date"
          value={state.fechaHasta}
          onChange={(e) => onChange({ fechaHasta: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>
    </div>
  );
};

export default Filters;