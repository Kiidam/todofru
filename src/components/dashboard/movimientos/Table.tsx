'use client';

import { Eye, Printer, Edit2 } from 'lucide-react';

export interface MovimientoRow {
  id: string;
  fecha: string; // ISO string
  producto: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'COMPRA' | 'VENTA';
  cantidad: number;
  stockAnterior?: number;
  stockNuevo?: number;
  motivo?: string;
  usuario?: string;
}

interface MovimientosTableProps {
  rows: MovimientoRow[];
  emptyMessage?: string;
  onDetail?: (row: MovimientoRow) => void;
  onAction?: (action: 'view' | 'print' | 'edit', row: MovimientoRow) => void;
}

export default function MovimientosTable({ rows, emptyMessage = 'No hay movimientos para mostrar.', onDetail, onAction }: MovimientosTableProps) {
  if (!rows.length) {
    return (
      <div className="p-6 text-center text-gray-500">{emptyMessage}</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Anterior</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Nuevo</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
            {onDetail && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalle</th>
            )}
            {onAction && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {new Date(row.fecha).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.producto}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                  {row.tipo}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.cantidad}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.stockAnterior ?? '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.stockNuevo ?? '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.motivo ?? '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.usuario ?? '-'}</td>
              {onDetail && (
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    type="button"
                    onClick={() => onDetail(row)}
                    className="px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Ver
                  </button>
                </td>
              )}
              {onAction && (
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      title="Ver"
                      onClick={() => onAction('view', row)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      title="Imprimir"
                      onClick={() => onAction('print', row)}
                      className="text-gray-700 hover:text-gray-900"
                    >
                      <Printer className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      title="Editar"
                      onClick={() => onAction('edit', row)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}