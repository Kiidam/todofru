'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [metrics, setMetrics] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [errorMetrics, setErrorMetrics] = useState<string | null>(null);

  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const fetchMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const r = await fetch(`/api/dashboard/metrics${qs.toString() ? `?${qs.toString()}` : ''}`, { cache: 'no-store' });
      const j = await r.json().catch(() => ({ success: false, error: 'Respuesta inválida' }));
      if (!r.ok || j?.success === false) throw new Error(String(j?.error || `Error ${r.status}`));
      setMetrics(j.data);
      setErrorMetrics(null);
    } catch (e: any) {
      setErrorMetrics(e?.message || 'Error al cargar métricas');
    } finally {
      setLoadingMetrics(false);
    }
  }

  useEffect(() => { fetchMetrics(); }, []);


  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="w-full py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full py-6">
          <div className="text-center">
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center relative">
                  <div className="w-6 h-6 absolute -top-1 -right-1 bg-green-600 rounded-full transform rotate-45"></div>
                  <div className="w-6 h-6 absolute -top-2 bg-green-600 rounded-tr-full rounded-tl-full h-3"></div>
                </div>
              </div>
              <div className="text-4xl font-bold text-green-700 tracking-wider">
                TODOFRU<span className="text-lg align-top">®</span>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              ¡Bienvenido al Dashboard de TodoFrut!
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Sistema de gestión para fruterías y verdulerías
            </p>
            
            {/* Filtros */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div>
                  <label className="text-sm text-gray-600">Fecha Desde</label>
                  <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent w-full" />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Fecha Hasta</label>
                  <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent w-full" />
                </div>
                <div className="flex gap-2">
                  <button onClick={fetchMetrics} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Buscar</button>
                  <button onClick={() => { setFrom(''); setTo(''); fetchMetrics(); }} className="px-4 py-2 bg-gray-100 rounded-md border">Limpiar</button>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-medium text-gray-500">Ventas últimos 30 días</h3>
                <p className="mt-2 text-2xl font-bold text-gray-900">S/ {loadingMetrics || !metrics ? '—' : metrics.ventas.totalSoles.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Órdenes: {loadingMetrics || !metrics ? '—' : metrics.ventas.ordenes}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-medium text-gray-500">Compras últimos 30 días</h3>
                <p className="mt-2 text-2xl font-bold text-gray-900">S/ {loadingMetrics || !metrics ? '—' : metrics.compras.totalSoles.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Órdenes: {loadingMetrics || !metrics ? '—' : metrics.compras.ordenes}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-medium text-gray-500">Clientes y Proveedores</h3>
                <p className="mt-2 text-lg font-semibold text-gray-900">Clientes: {loadingMetrics || !metrics ? '—' : metrics.clientes.total}</p>
                <p className="text-sm text-gray-600">Proveedores: {loadingMetrics || !metrics ? '—' : metrics.proveedores.total}</p>
              </div>
            </div>

            {/* Top productos y bajo stock */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900">Top productos por ventas</h3>
                {errorMetrics && <p className="text-sm text-red-600 mt-2">{errorMetrics}</p>}
                <div className="mt-4">
                  {loadingMetrics ? (
                    <p className="text-gray-600">Cargando...</p>
                  ) : (
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ventas (S/)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {metrics?.topProductos?.length ? metrics.topProductos.map((p: any) => (
                          <tr key={p.productoId}>
                            <td className="py-2 text-sm text-gray-900">{p.producto}</td>
                            <td className="py-2 text-sm text-right">{p.cantidad}</td>
                            <td className="py-2 text-sm text-right">S/ {p.ventas.toFixed(2)}</td>
                          </tr>
                        )) : (
                          <tr><td className="py-2 text-sm text-gray-600" colSpan={3}>Sin datos</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900">Productos con bajo stock</h3>
                <div className="mt-4">
                  {loadingMetrics ? (
                    <p className="text-gray-600">Cargando...</p>
                  ) : (
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Mínimo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {metrics?.inventario?.lowStock?.length ? metrics.inventario.lowStock.map((p: any) => (
                          <tr key={p.id}>
                            <td className="py-2 text-sm text-gray-900">{p.nombre}</td>
                            <td className="py-2 text-sm text-right">{p.stock}</td>
                            <td className="py-2 text-sm text-right">{p.minimo}</td>
                          </tr>
                        )) : (
                          <tr><td className="py-2 text-sm text-gray-600" colSpan={3}>Sin alertas</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Últimas Ventas */}
            <div className="bg-white p-6 rounded-lg shadow-md mt-8">
              <h3 className="text-lg font-semibold text-gray-900">Últimas Ventas</h3>
              <div className="mt-4 overflow-x-auto">
                {loadingMetrics ? (
                  <p className="text-gray-600">Cargando...</p>
                ) : (
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                        <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto (S/)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {metrics?.ultimasVentas?.length ? metrics.ultimasVentas.map((v: any) => (
                        <tr key={v.numero + v.fecha}>
                          <td className="py-2 text-sm text-gray-900">{v.numero}</td>
                          <td className="py-2 text-sm text-gray-900">{v.cliente}</td>
                          <td className="py-2 text-sm text-right">S/ {Number(v.total).toFixed(2)}</td>
                        </tr>
                      )) : (
                        <tr><td className="py-2 text-sm text-gray-600" colSpan={3}>Sin ventas en el periodo</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Tendencia Ventas vs Compras (últimos 6 meses) */}
            <div className="bg-white p-6 rounded-lg shadow-md mt-8">
              <h3 className="text-lg font-semibold text-gray-900">Tendencia de Ventas vs Compras (6 meses)</h3>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-4">
                {(metrics?.trend || []).map((t: any) => (
                  <div key={t.month} className="flex flex-col">
                    <div className="text-xs text-gray-600 mb-1">{t.month}</div>
                    <div className="h-20 bg-gray-100 rounded relative">
                      <div className="absolute bottom-0 left-1 right-1 bg-green-500 rounded" style={{ height: `${Math.min(100, (t.ventas || 0) / Math.max(1, (metrics?.ventas?.totalSoles || 1)) * 100)}%` }}></div>
                      <div className="absolute bottom-0 left-1 right-1 bg-orange-400 rounded opacity-80" style={{ height: `${Math.min(100, (t.compras || 0) / Math.max(1, (metrics?.compras?.totalSoles || 1)) * 100)}%` }}></div>
                    </div>
                    <div className="mt-1 text-xs text-gray-700">V: S/ {t.ventas.toFixed(0)} • C: S/ {t.compras.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-green-50 rounded-lg">
              <p className="text-green-800">
                <strong>Periodo:</strong> {metrics ? new Date(metrics.period.from).toLocaleDateString('es-PE') : '—'}
                {' '}–{' '}
                {metrics ? new Date(metrics.period.to).toLocaleDateString('es-PE') : '—'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
