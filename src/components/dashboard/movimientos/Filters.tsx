'use client';

export interface MovimientosFiltersState {
  searchTerm: string;
  fechaDesde: string; // ISO date (YYYY-MM-DD)
  fechaHasta: string; // ISO date (YYYY-MM-DD)
  pageSize: number;
}

interface MovimientosFiltersProps {
  state: MovimientosFiltersState;
  onChange: (next: Partial<MovimientosFiltersState>) => void;
}

export default function MovimientosFilters({ state, onChange }: MovimientosFiltersProps) {
  const { searchTerm, fechaDesde, fechaHasta, pageSize } = state;

  return (
    <div className="p-4 border-b border-gray-200 bg-gray-50">
      <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
        {/* Buscador */}
        <div className="relative w-full md:max-w-sm">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar por producto o motivo"
            value={searchTerm}
            onChange={(e) => onChange({ searchTerm: e.target.value })}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 w-full"
          />
        </div>

        {/* Fecha desde */}
        <div className="flex items-center space-x-2">
          <label htmlFor="fecha-desde" className="text-sm text-gray-600">Desde</label>
          <input
            id="fecha-desde"
            type="date"
            value={fechaDesde}
            onChange={(e) => onChange({ fechaDesde: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* Fecha hasta */}
        <div className="flex items-center space-x-2">
          <label htmlFor="fecha-hasta" className="text-sm text-gray-600">Hasta</label>
          <input
            id="fecha-hasta"
            type="date"
            value={fechaHasta}
            onChange={(e) => onChange({ fechaHasta: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* Tamaño de página */}
        <div className="flex items-center space-x-2">
          <label htmlFor="page-size" className="text-sm text-gray-600">Por página</label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => onChange({ pageSize: parseInt(e.target.value, 10) })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    </div>
  );
}