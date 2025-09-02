import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Facturación | TodoFru',
  description: 'Gestión de facturación de TodoFru',
};

export default function FacturacionPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Gestión de Facturación</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Listado de Facturas</h2>
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md transition-colors">
            Nueva Factura
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Nº Factura</th>
                <th className="py-3 px-6 text-left">Cliente</th>
                <th className="py-3 px-6 text-left">Fecha</th>
                <th className="py-3 px-6 text-left">Total</th>
                <th className="py-3 px-6 text-left">Estado</th>
                <th className="py-3 px-6 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-4 px-6">-</td>
                <td className="py-4 px-6">-</td>
                <td className="py-4 px-6">-</td>
                <td className="py-4 px-6">-</td>
                <td className="py-4 px-6">-</td>
                <td className="py-4 px-6">
                  <div className="flex space-x-2">
                    <button className="text-blue-500 hover:text-blue-700">Ver</button>
                    <button className="text-green-500 hover:text-green-700">Imprimir</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 text-center text-gray-500 italic">
          No hay facturas registradas.
        </div>
      </div>
    </div>
  );
}