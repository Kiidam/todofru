"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Trash2, AlertTriangle, Loader2, Plus, Search, Pencil, Package, Users } from 'lucide-react';

import { ClientesProvider, useClientes } from '../../../src/contexts/ClientesContext';
import { NotificationProvider } from '../../../src/contexts/NotificationContext';
import ClienteFormUnified from '../../../src/components/clientes/ClienteFormUnified';
import { ClientePayload } from '../../../src/types/cliente';

const Modal = dynamic(() => import('../../../src/components/ui/Modal'), { ssr: false });

// Helper para mostrar nombre legible
function getClienteDisplayName(cliente: ClientePayload) {
  if (cliente.nombre && cliente.nombre.trim()) return cliente.nombre;
  if (cliente.razonSocial && cliente.razonSocial.trim()) return cliente.razonSocial;
  const n = `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim();
  return n || '—';
}

function getDocumentoLabel(cliente: ClientePayload) {
  return cliente.tipoEntidad === 'PERSONA_JURIDICA' ? 'RUC' : 'DNI';
}

function getDocumentoNumber(cliente: ClientePayload) {
  return cliente.numeroIdentificacion || cliente.ruc || '';
}

// Small helper type to avoid using `any` directly (satisfies ESLint)
type ClienteMaybeMeta = { createdAt?: string | Date; updatedAt?: string | Date; activo?: boolean };

function getCreatedDate(cliente: ClientePayload) {
  const meta = cliente as unknown as ClienteMaybeMeta;
  const v = meta.createdAt;
  if (!v) return 'N/A';
  const d = typeof v === 'string' ? new Date(v) : v instanceof Date ? v : new Date(v);
  return d.toLocaleDateString('es-PE');
}

// getUpdatedDate removed (unused) to satisfy linter

function isActive(cliente: ClientePayload) {
  const meta = cliente as unknown as ClienteMaybeMeta;
  return Boolean(meta.activo);
}

interface DeleteConfirmationProps {
  cliente: ClientePayload;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteConfirmation({ cliente, onConfirm, onCancel, isDeleting }: DeleteConfirmationProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-lg mx-auto">
      <div className="flex items-center space-x-3 mb-4">
        <div className="flex-shrink-0">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-black">⚠️ Confirmar Eliminación</h3>
          <p className="text-sm text-red-600 mt-1 font-medium">Esta acción no se puede deshacer</p>
        </div>
      </div>
      
      <div className="mb-6">
        <p className="text-black mb-3 font-medium">¿Está seguro que desea eliminar el cliente:</p>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="font-semibold text-black text-lg">{cliente.nombre}</p>
          {cliente.numeroIdentificacion && (
            <p className="text-sm text-gray-700 mt-1">
              <span className="font-medium">Documento:</span> {cliente.numeroIdentificacion}
            </p>
          )}
          {cliente.email && (
            <p className="text-sm text-gray-700">
              <span className="font-medium">Email:</span> {cliente.email}
            </p>
          )}
          {cliente.telefono && (
            <p className="text-sm text-gray-700">
              <span className="font-medium">Teléfono:</span> {cliente.telefono}
            </p>
          )}
        </div>
        
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-bold text-red-800 mb-2">⚠️ Advertencias importantes:</h4>
          <ul className="text-xs text-red-700 space-y-1">
            <li>• Se eliminarán todos los datos del cliente permanentemente</li>
            <li>• Se verificará que no tenga pedidos de venta pendientes</li>
            <li>• Esta acción no afectará el historial de ventas existente</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
          className="px-4 py-2 text-sm font-medium text-black bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isDeleting}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
        >
          {isDeleting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Eliminando...</span>
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              <span>Eliminar Cliente</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface ClienteRowProps {
  cliente: ClientePayload;
  onEdit: (cliente: ClientePayload) => void;
  onDelete: (cliente: ClientePayload) => void;
  onToggleStatus: (cliente: ClientePayload) => void;
  isToggling: boolean;
}

function ClienteRow({ cliente, onEdit, onDelete, onToggleStatus, isToggling }: ClienteRowProps) {
  const createdDate = getCreatedDate(cliente);

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-black font-medium">{createdDate}</div>
        </td>
        <td className="px-4 xl:px-6 py-4">
          <div className="max-w-xs">
            <div className="text-sm font-medium text-black truncate" title={getClienteDisplayName(cliente)}>{getClienteDisplayName(cliente)}</div>
            {/* Documento mostrado debajo del nombre según corresponda */}
            {getDocumentoNumber(cliente) && (
              <div className="text-sm text-gray-700 mt-1 truncate" title={`${getDocumentoLabel(cliente)}: ${getDocumentoNumber(cliente)}`}>
                <span className="font-medium">{getDocumentoLabel(cliente)}:</span> {getDocumentoNumber(cliente)}
              </div>
            )}
          </div>
        </td>
        <td className="px-4 xl:px-6 py-4">
          <div className="text-sm text-black space-y-1 max-w-xs">
            <div className="flex items-center space-x-1"><span className="font-medium" aria-label="Teléfono">📞</span><span className="truncate" title={cliente.telefono || 'No registrado'}>{cliente.telefono || 'No registrado'}</span></div>
            <div className="flex items-center space-x-1"><span className="font-medium" aria-label="Email">✉️</span><span className="text-gray-600 truncate" title={cliente.email || 'No registrado'}>{cliente.email || 'No registrado'}</span></div>
            <div className="flex items-start space-x-1"><span className="font-medium" aria-label="Dirección">📍</span><span className="text-gray-600 text-xs leading-tight line-clamp-2" title={cliente.direccion || 'No registrada'}>{cliente.direccion || 'No registrada'}</span></div>
          </div>
        </td>
        {/* Removed 'Tipo' column and moved estado button to actions */}
        <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div className="flex items-center justify-end gap-2">
            {/* Estado como botón de acción */}
            <button onClick={() => onToggleStatus(cliente)} disabled={isToggling} className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full transition-colors ${isActive(cliente) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {isToggling ? <Loader2 className="w-3 h-3 animate-spin"/> : (isActive(cliente) ? 'Activo' : 'Inactivo')}
            </button>

            <button onClick={() => onEdit(cliente)} className="flex items-center space-x-1 xl:space-x-2 px-2 xl:px-3 py-2 rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700">
              <Pencil className="w-4 h-4" /> <span className="hidden xl:inline">Editar</span>
            </button>
            <button onClick={() => onDelete(cliente)} className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4"/></button>
          </div>
        </td>
      </tr>

  {/* Details removed - flat actions now */}
    </>
  );
}

const ClientesPageContent: React.FC = () => {
  const {
    state: { clientes, loading, error },
    actions: { fetchClientes, deleteCliente, toggleClienteStatus, clearError }
  } = useClientes();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<ClientePayload | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ cliente: ClientePayload; isDeleting: boolean } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  // removed tipoFilter as not used (requested)
  const [entidadFilter, setEntidadFilter] = useState('all');
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const filteredClientes = Array.isArray(clientes) ? clientes.filter(cliente => {
    const name = getClienteDisplayName(cliente).toLowerCase();
    const doc = getDocumentoNumber(cliente).toLowerCase();
    const matchesSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || doc.includes(searchTerm.toLowerCase()) || (cliente.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || (cliente.telefono || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && isActive(cliente)) || (statusFilter === 'inactive' && !isActive(cliente));
    const matchesEntidad = entidadFilter === 'all' || cliente.tipoEntidad === entidadFilter;
    return matchesSearch && matchesStatus && matchesEntidad;
  }) : [];

  const handleDeleteClick = (cliente: ClientePayload) => setDeleteConfirmation({ cliente, isDeleting: false });

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation) return;
    try {
      setDeleteConfirmation(prev => prev ? { ...prev, isDeleting: true } : null);
  if (!deleteConfirmation.cliente.id) throw new Error('Cliente sin identificador');
  await deleteCliente(deleteConfirmation.cliente.id);
      setDeleteConfirmation(null);
    } catch (err) {
      console.error('Error al eliminar cliente:', err);
      setDeleteConfirmation(prev => prev ? { ...prev, isDeleting: false } : null);
    }
  };

  const handleToggleStatus = async (cliente: ClientePayload) => {
    try {
  if (!cliente.id) return;
  setToggleLoadingId(cliente.id);
  await toggleClienteStatus(cliente.id);
    } catch (err) {
      console.error(err);
    } finally {
      setToggleLoadingId(null);
    }
  };

  const handleCreateSuccess = () => { setIsCreateModalOpen(false); fetchClientes(); };
  const handleEditSuccess = (updated: ClientePayload) => { setEditingCliente(null); fetchClientes(); };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-black">Clientes</h1>
          <p className="text-black mt-1">{filteredClientes.length} cliente{filteredClientes.length !== 1 ? 's' : ''} encontrado{filteredClientes.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"><Plus className="w-4 h-4"/><span>Agregar Cliente</span></button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="text" placeholder="Buscar por nombre, documento, email o teléfono..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black" />
            </div>
          </div>
          <div className="flex gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black bg-white">
              <option value="all">Todos los estados</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4"><div className="flex items-center space-x-2"><AlertTriangle className="w-5 h-5 text-red-500"/><span className="font-medium text-red-700">Error</span></div><p className="text-red-600 mt-1">{error}</p></div>}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredClientes.length === 0 ? (
          <div className="p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center"><Users className="w-8 h-8 text-gray-400"/></div>
              <div>
                <p className="text-lg font-medium text-black mb-2">{searchTerm || statusFilter !== 'all' ? 'No se encontraron clientes' : 'No hay clientes registrados'}</p>
                <p className="text-gray-600 text-sm">{searchTerm || statusFilter !== 'all' ? 'Intenta ajustar los filtros de búsqueda' : 'Comienza agregando tu primer cliente'}</p>
              </div>
              {!searchTerm && statusFilter === 'all' && (<button onClick={() => setIsCreateModalOpen(true)} className="mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 font-medium"><Plus className="w-5 h-5"/><span>Agregar primer cliente</span></button>)}
            </div>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200" role="table" aria-label="Lista de clientes">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de Creación</th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                    <th className="px-4 xl:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClientes.map((cliente) => (
                    <ClienteRow key={cliente.id} cliente={cliente} onEdit={setEditingCliente} onDelete={handleDeleteClick} onToggleStatus={handleToggleStatus} isToggling={toggleLoadingId === cliente.id} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden space-y-4 p-4">
              {filteredClientes.map((cliente) => (
                <div key={cliente.id} className="border border-gray-200 rounded-lg p-4 space-y-3 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-black truncate">{getClienteDisplayName(cliente)}</h3>
                      <p className="text-sm text-gray-600 mt-1">Creado: {getCreatedDate(cliente)}</p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button onClick={() => handleToggleStatus(cliente)} disabled={toggleLoadingId === cliente.id} className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${isActive(cliente) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{toggleLoadingId === cliente.id ? <Loader2 className="w-3 h-3 animate-spin"/> : (isActive(cliente) ? 'Activo' : 'Inactivo')}</button>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <div className="text-sm"><span className="font-medium text-gray-700">Documento: </span><span className="text-black">{getDocumentoLabel(cliente)}: {getDocumentoNumber(cliente) || '—'}</span></div>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Contacto:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2"><span>📞</span><span className="text-black">{cliente.telefono || 'No registrado'}</span></div>
                      <div className="flex items-center space-x-2"><span>✉️</span><span className="text-gray-600 break-all">{cliente.email || 'No registrado'}</span></div>
                      <div className="flex items-start space-x-2"><span>📍</span><span className="text-gray-600 text-sm leading-relaxed">{cliente.direccion || 'No registrada'}</span></div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center space-x-2"><Package className="w-4 h-4"/><span className="text-sm font-medium">— productos</span></div>
                          <div className="flex space-x-2 w-full sm:w-auto">
                            <button onClick={() => handleToggleStatus(cliente)} disabled={toggleLoadingId === cliente.id} className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold ${isActive(cliente) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} w-full sm:w-auto`}>{toggleLoadingId === cliente.id ? <Loader2 className="w-4 h-4 animate-spin"/> : (isActive(cliente) ? 'Activo' : 'Inactivo')}</button>
                            <button onClick={() => setEditingCliente(cliente)} className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex-1 sm:flex-none"><Pencil className="w-4 h-4"/><span>Editar</span></button>
                            <button onClick={() => handleDeleteClick(cliente)} className="flex items-center justify-center text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} ariaLabel="Crear nuevo cliente">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Nuevo Cliente</h3>
          <p className="text-sm text-gray-600 mt-1">Completa los datos del cliente</p>
        </div>
        <ClienteFormUnified mode="create" onSuccess={handleCreateSuccess} onCancel={() => setIsCreateModalOpen(false)} />
      </Modal>

      <Modal isOpen={!!editingCliente} onClose={() => setEditingCliente(null)} ariaLabel="Editar cliente">
        {editingCliente && (<><div className="px-6 py-4 border-b border-gray-200"><h3 className="text-lg font-bold text-gray-900">Editar Cliente</h3><p className="text-sm text-gray-600 mt-1">Modifica los datos de {editingCliente.nombre}</p></div><ClienteFormUnified mode="edit" initialData={editingCliente} onSuccess={handleEditSuccess} onCancel={() => setEditingCliente(null)} /></>)}
      </Modal>

      <Modal isOpen={!!deleteConfirmation} onClose={deleteConfirmation?.isDeleting ? () => {} : () => setDeleteConfirmation(null)}>
        {deleteConfirmation && <DeleteConfirmation cliente={deleteConfirmation.cliente} onConfirm={handleDeleteConfirm} onCancel={() => setDeleteConfirmation(null)} isDeleting={deleteConfirmation.isDeleting} />}
      </Modal>
    </div>
  );
}

export default function ClientesPage() {
  return (
    <NotificationProvider>
      <ClientesProvider>
        <ClientesPageContent />
      </ClientesProvider>
    </NotificationProvider>
  );
}
