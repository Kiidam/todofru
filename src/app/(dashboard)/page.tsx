'use client';

import { Metadata } from 'next';
import { Calendar, Search, X, ShoppingCart, Users, FileText, TrendingUp } from 'lucide-react';
import { useState } from 'react';

export default function DashboardPage() {
  const [fechaDesde, setFechaDesde] = useState('01/09/2025');
  const [fechaHasta, setFechaHasta] = useState('02/09/2025');
  const [empresa, setEmpresa] = useState('Todas las empresas');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      
      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm font-medium text-gray-700">Filtros</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
            <div className="relative">
              <input
                type="text"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
            <div className="relative">
              <input
                type="text"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <select
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option>Todas las empresas</option>
              <option>TodoFrut</option>
              <option>Otra empresa</option>
            </select>
          </div>
          
          <div className="flex items-end gap-2">
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
              <Search size={16} />
              Buscar
            </button>
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
              <X size={16} />
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Ventas de Septiembre */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Ventas de Septiembre</h3>
            <ShoppingCart className="text-green-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-900">S/ 0.00</p>
          <div className="flex items-center mt-2">
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">100.0% vs Agosto</span>
          </div>
        </div>

        {/* Compras de Septiembre */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Compras de Septiembre</h3>
            <ShoppingCart className="text-orange-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-900">S/ 0.00</p>
          <div className="flex items-center mt-2">
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">100.0% vs Agosto</span>
          </div>
        </div>

        {/* Clientes Nuevos */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Clientes Nuevos</h3>
            <Users className="text-purple-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-900">1</p>
          <div className="flex items-center mt-2">
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">50.0% vs Agosto</span>
          </div>
        </div>

        {/* Documentos */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Documentos (Septiembre)</h3>
            <FileText className="text-yellow-500" size={20} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Facturas:</span>
              <span className="font-medium">45</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Boletas:</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>N. Crédito:</span>
              <span className="font-medium">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secciones inferiores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas Ventas */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Últimas Ventas</h3>
            <FileText className="text-gray-400" size={20} />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Documento</span>
              <span className="text-sm text-gray-600">Cliente</span>
            </div>
            <div className="text-center text-gray-500 italic py-8">
              No hay ventas recientes para mostrar
            </div>
          </div>
        </div>

        {/* Productos Más Vendidos */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Productos Más Vendidos</h3>
            <TrendingUp className="text-gray-400" size={20} />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Monto</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-sm font-medium">ALCACHOFA REPELADA MEDIANA</span>
              <span className="text-sm font-bold text-green-600">S/ 12,078.00</span>
            </div>
            <div className="text-center text-gray-500 italic py-4">
              Mes anterior (Agosto): F: 1032, B: 0, NC: 4
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}