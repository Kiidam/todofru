import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cuentas por Cobrar | TodoFru',
  description: 'Gestión de cuentas por cobrar de TodoFru',
};

export default function CuentasCobrarPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Cuentas por Cobrar</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Listado de Cuentas Pendientes</h2>
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md transition-colors">
            Registrar Pago
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Nº Factura</th>
                <th className="py-3 px-6 text-left">Cliente</th>
                <th className="py-3 px-6 text-left">Fecha Emisión</th>
                <th className="py-3 px-6 text-left">Fecha Vencimiento</th>
                <th className="py-3 px-6 text-left">Monto</th>
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
                <td className="py-4 px-6">-</td>
                <td className="py-4 px-6">
                  <div className="flex space-x-2">
                    <button className="text-green-500 hover:text-green-700">Registrar Pago</button>
                    <button className="text-blue-500 hover:text-blue-700">Ver Detalles</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 text-center text-gray-500 italic">
          No hay cuentas pendientes por cobrar.
        </div>
      </div>
    </div>
  );
}