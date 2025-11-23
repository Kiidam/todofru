'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';

const Modal = dynamic(() => import('../../../src/components/ui/Modal'), { ssr: false });

interface UnidadMedida {
  id: string;
  nombre: string;
  simbolo: string;
  _count?: { productos: number };
  activo?: boolean;
}

export default function UnidadesMedidaPage() {
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ nombre: '', simbolo: '' });

  // Eliminado: valores de ejemplo

  const loadUnidades = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const ts = Date.now();
      const resp = await fetch(`/api/unidades-medida?ts=${ts}`, { cache: 'no-store' });
      const data = await resp.json();
      if (data?.success && Array.isArray(data.data)) {
        setUnidades(data.data as UnidadMedida[]);
      } else {
        setApiError('No se pudieron cargar las unidades de medida');
        setUnidades([]);
      }
    } catch (e) {
      console.error('Error cargando unidades:', e);
      setApiError('Error interno del servidor');
      setUnidades([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnidades();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.simbolo.trim()) return;
    setLoading(true);
    setApiError(null);
    try {
      const endpoint = editId ? `/api/unidades-medida/${editId}` : '/api/unidades-medida';
      const method = editId ? 'PUT' : 'POST';
      const resp = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: form.nombre.trim(), simbolo: form.simbolo.trim() })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setApiError(data?.error || 'No se pudo crear la unidad');
        return;
      }
      setShowModal(false);
      setEditId(null);
      setForm({ nombre: '', simbolo: '' });
      await loadUnidades();
    } catch (err) {
      console.error('Error creando unidad:', err);
      setApiError('Error interno del servidor');
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setEditId(null);
    setForm({ nombre: '', simbolo: '' });
    setShowModal(true);
  };

  const startEdit = (u: UnidadMedida) => {
    setEditId(u.id);
    setForm({ nombre: u.nombre, simbolo: u.simbolo });
    setShowModal(true);
  };

  const deleteUnidad = async (id: string) => {
    setLoading(true);
    setApiError(null);
    try {
      const resp = await fetch(`/api/unidades-medida/${id}`, { method: 'DELETE' });
      const data = await resp.json();
      if (!resp.ok) {
        setApiError(data?.error || 'No se pudo eliminar la unidad');
        return;
      }
      await loadUnidades();
    } catch (err) {
      console.error('Error eliminando unidad:', err);
      setApiError('Error interno del servidor');
    } finally {
      setLoading(false);
    }
  };

  const toggleEstado = async (u: UnidadMedida) => {
    try {
      const nuevoEstado = !(u.activo ?? true);
      const resp = await fetch(`/api/unidades-medida/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nuevoEstado })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setApiError(data?.error || 'No se pudo cambiar el estado');
        return;
      }
      await loadUnidades();
    } catch (err) {
      console.error('Error cambiando estado unidad:', err);
      setApiError('Error interno del servidor');
    }
  };

  const filtered = unidades.filter(u => {
    const q = search.trim().toLowerCase();
    return !q || u.nombre.toLowerCase().includes(q) || u.simbolo.toLowerCase().includes(q);
  });

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Unidades de Medida</h1>
            <p className="text-gray-600">Gestiona las unidades utilizadas por los productos</p>
          </div>
          <button
            onClick={startCreate}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nueva Unidad
          </button>
        </div>

        {apiError && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3" role="alert" aria-live="polite">
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}

        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o símbolo"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="bg-white shadow rounded-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Símbolo</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Productos</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-center text-gray-500" colSpan={5}>
                    {loading ? 'Cargando unidades...' : 'No hay unidades registradas'}
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{u.nombre}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {u.simbolo}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{u._count?.productos ?? 0}</td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => toggleEstado(u)}
                      className={(u.activo ?? true)
                        ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'
                        : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700'}
                      title={(u.activo ?? true) ? 'Desactivar unidad' : 'Activar unidad'}
                    >
                      {(u.activo ?? true) ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button onClick={() => startEdit(u)} className="text-blue-600 hover:text-blue-800" title="Editar" aria-label={`Editar ${u.nombre}`}>
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteUnidad(u.id)} className="text-red-600 hover:text-red-800" title="Eliminar" aria-label={`Eliminar ${u.nombre}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditId(null); }} ariaLabel={editId ? 'Editar unidad de medida' : 'Crear nueva unidad de medida'}>
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{editId ? 'Editar Unidad de Medida' : 'Nueva Unidad de Medida'}</h2>
            <p className="text-sm text-gray-600 mb-4">{editId ? 'Actualiza el nombre y símbolo.' : 'Define el nombre y símbolo para usar en productos y movimientos.'}</p>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="unidad-nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  id="unidad-nombre"
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ej. Kilogramos"
                  required
                />
              </div>
              <div>
                <label htmlFor="unidad-simbolo" className="block text-sm font-medium text-gray-700 mb-1">Símbolo</label>
                <input
                  id="unidad-simbolo"
                  type="text"
                  value={form.simbolo}
                  onChange={(e) => setForm(prev => ({ ...prev, simbolo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ej. kg"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : (editId ? 'Guardar cambios' : 'Crear Unidad')}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      </div>
    </div>
  );
}
