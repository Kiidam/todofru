"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import AddSupplierForm from "../../../src/components/proveedores/AddSupplierForm";
import EditSupplierForm from "../../../src/components/proveedores/EditSupplierForm";
import ProductosProveedorVistaModal from "../../../src/components/proveedores/ProductosProveedorVistaModal";
import { Trash2, AlertTriangle, Loader2, Plus, Search, Filter, Eye, EyeOff, Pencil, Package, Users } from 'lucide-react';

const Modal = dynamic(() => import('../../../src/components/ui/Modal'), { ssr: false });

interface Supplier {
  id: string;
  razonSocial?: string;
  nombres?: string;
  apellidos?: string;
  numeroIdentificacion?: string;
  tipoIdentificacion?: 'DNI' | 'RUC';
  telefono?: string;
  email?: string;
  direccion?: string;
  representanteLegal?: string;
  activo: boolean;
  createdAt: string;
  updatedAt?: string;
  productosCount?: number;
}

interface DeleteConfirmationProps {
  supplier: Supplier;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteConfirmation({ supplier, onConfirm, onCancel, isDeleting }: DeleteConfirmationProps) {
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
        <p className="text-black mb-3 font-medium">¿Está seguro que desea eliminar el proveedor:</p>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="font-semibold text-black text-lg">
            {supplier.razonSocial || `${supplier.nombres} ${supplier.apellidos}`}
          </p>
          {supplier.numeroIdentificacion && (
            <p className="text-sm text-gray-700 mt-1">
              <span className="font-medium">{supplier.tipoIdentificacion}:</span> {supplier.numeroIdentificacion}
            </p>
          )}
          {supplier.email && (
            <p className="text-sm text-gray-700">
              <span className="font-medium">Email:</span> {supplier.email}
            </p>
          )}
          {supplier.telefono && (
            <p className="text-sm text-gray-700">
              <span className="font-medium">Teléfono:</span> {supplier.telefono}
            </p>
          )}
          {supplier.productosCount && supplier.productosCount > 0 && (
            <p className="text-sm text-orange-600 mt-2 font-medium">
              📦 Productos asociados: {supplier.productosCount}
            </p>
          )}
        </div>
        
        {/* Advertencias importantes */}
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-bold text-red-800 mb-2">⚠️ Advertencias importantes:</h4>
          <ul className="text-xs text-red-700 space-y-1">
            <li>• Se eliminarán todos los datos del proveedor permanentemente</li>
            <li>• Se verificará que no tenga pedidos de compra pendientes</li>
            <li>• Los productos asociados no se eliminarán, solo la relación</li>
            <li>• Esta acción no afectará el historial de compras existente</li>
          </ul>
        </div>
        
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 <strong>Alternativa:</strong> Si solo desea desactivar temporalmente el proveedor, 
            use el botón &quot;Activo/Inactivo&quot; en lugar de eliminar.
          </p>
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
              <span>Eliminar Proveedor</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function ProveedoresPage() {
  // Estados principales
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);
  const [statusChangedId, setStatusChangedId] = useState<string | null>(null);

  // Estados de modales y vistas
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    supplier: Supplier;
    isDeleting: boolean;
  } | null>(null);
  const [showProductsModal, setShowProductsModal] = useState<{
    supplierId: string;
    supplierName: string;
  } | null>(null);
  const [showEditForm, setShowEditForm] = useState<Supplier | null>(null);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Cargar proveedores al montar el componente
  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setIsLoading(true);
      setError('');
      setActionError('');

      // Fetch fresh list (no-store) and accept multiple response shapes
      const response = await fetch('/api/proveedores?simple=true&limit=1000', { cache: 'no-store' });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        // try to extract a helpful message if present
        const resObj = (result && typeof result === 'object') ? result as Record<string, unknown> : {};
        const errMsg = String(resObj['error'] ?? resObj['message'] ?? 'Error al cargar los proveedores');
        throw new Error(errMsg);
      }

      // Support shapes: { success:true, data:{ data:[..] } }, { data: [...] }, { proveedores: [...] }, or direct array
      const suppliersData = result?.data?.data ?? result?.data ?? result?.proveedores ?? result ?? [];
      const baseSuppliers = Array.isArray(suppliersData) ? suppliersData : [];
      // Attach productosCount to each supplier by querying provider products endpoint in parallel
      const withCounts = await Promise.all(baseSuppliers.map(async (s: unknown) => {
        // normalize unknown supplier shape into our Supplier interface while preserving id
        const sup = (s as Record<string, unknown> | null) ?? {};
        try {
          // request without cache to ensure fresh counts
          const id = String(sup['id'] ?? sup['ID'] ?? '');
          const r = await fetch(`/api/proveedores/${id}/productos`, { cache: 'no-store' });
          const j = await r.json().catch(() => ({}));
          // Support different response shapes: { data: { data: [...] } } | { data: [...] } | [...] | { productos: [...] }
          const list = j?.data?.data || j?.data || j?.productos || j || [];
          const count = Array.isArray(list) ? list.length : (typeof list === 'number' ? list : Number(j?.count ?? j?.total ?? 0) || 0);

          const supplierObj: Supplier = {
            id: id,
            razonSocial: typeof sup['razonSocial'] === 'string' ? String(sup['razonSocial']) : undefined,
            nombres: typeof sup['nombres'] === 'string' ? String(sup['nombres']) : undefined,
            apellidos: typeof sup['apellidos'] === 'string' ? String(sup['apellidos']) : undefined,
            numeroIdentificacion: typeof sup['numeroIdentificacion'] === 'string' ? String(sup['numeroIdentificacion']) : undefined,
            tipoIdentificacion: (sup['tipoIdentificacion'] === 'DNI' || sup['tipoIdentificacion'] === 'RUC') ? (sup['tipoIdentificacion'] as 'DNI' | 'RUC') : undefined,
            telefono: typeof sup['telefono'] === 'string' ? String(sup['telefono']) : undefined,
            email: typeof sup['email'] === 'string' ? String(sup['email']) : undefined,
            direccion: typeof sup['direccion'] === 'string' ? String(sup['direccion']) : undefined,
            representanteLegal: typeof sup['representanteLegal'] === 'string' ? String(sup['representanteLegal']) : undefined,
            activo: typeof sup['activo'] === 'boolean' ? sup['activo'] as boolean : true,
            createdAt: typeof sup['createdAt'] === 'string' ? String(sup['createdAt']) : new Date().toISOString(),
            updatedAt: typeof sup['updatedAt'] === 'string' ? String(sup['updatedAt']) : undefined,
            productosCount: Number(count),
          };

          return supplierObj;
        } catch (err) {
          const supplierObj: Supplier = {
            id: String(sup['id'] ?? ''),
            razonSocial: typeof sup['razonSocial'] === 'string' ? String(sup['razonSocial']) : undefined,
            nombres: typeof sup['nombres'] === 'string' ? String(sup['nombres']) : undefined,
            apellidos: typeof sup['apellidos'] === 'string' ? String(sup['apellidos']) : undefined,
            numeroIdentificacion: typeof sup['numeroIdentificacion'] === 'string' ? String(sup['numeroIdentificacion']) : undefined,
            tipoIdentificacion: (sup['tipoIdentificacion'] === 'DNI' || sup['tipoIdentificacion'] === 'RUC') ? (sup['tipoIdentificacion'] as 'DNI' | 'RUC') : undefined,
            telefono: typeof sup['telefono'] === 'string' ? String(sup['telefono']) : undefined,
            email: typeof sup['email'] === 'string' ? String(sup['email']) : undefined,
            direccion: typeof sup['direccion'] === 'string' ? String(sup['direccion']) : undefined,
            representanteLegal: typeof sup['representanteLegal'] === 'string' ? String(sup['representanteLegal']) : undefined,
            activo: typeof sup['activo'] === 'boolean' ? sup['activo'] as boolean : true,
            createdAt: typeof sup['createdAt'] === 'string' ? String(sup['createdAt']) : new Date().toISOString(),
            updatedAt: typeof sup['updatedAt'] === 'string' ? String(sup['updatedAt']) : undefined,
            productosCount: 0,
          };

          return supplierObj;
        }
      }));

      setSuppliers(withCounts);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
      setError(error instanceof Error ? error.message : 'Error inesperado al cargar los proveedores');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Función para validar formato de documento
  const validateDocumentFormat = (tipo: string, numero: string) => {
    if (tipo === 'DNI') {
      return numero.length === 8 && /^\d{8}$/.test(numero);
    } else if (tipo === 'RUC') {
      return numero.length === 11 && /^\d{11}$/.test(numero);
    }
    return true;
  };

  // Toggle activo/inactivo
  const handleToggleActive = async (supplier: Supplier) => {
    try {
      setToggleLoadingId(supplier.id);
      setActionError('');
      const desired = !supplier.activo;

      const resp = await fetch(`/api/proveedores/${supplier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: desired })
      });

      const json = await resp.json().catch(() => ({ success: false, error: 'Respuesta inválida del servidor' }));

      if (!resp.ok || json?.success === false) {
        const j = (json && typeof json === 'object') ? (json as Record<string, unknown>) : {};
        const msg = String(j.error ?? j.message ?? 'No se pudo actualizar el estado');
        setActionError(msg);
        setToggleLoadingId(null);
        return;
      }

      const j = (json && typeof json === 'object') ? (json as Record<string, unknown>) : {};
      const updated = ('data' in j) ? j.data as Record<string, unknown> : j;

      // Update local list safely, guarding unknown shape from server
      setSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, activo: updated && typeof updated === 'object' && 'activo' in (updated as Record<string, unknown>) ? Boolean((updated as Record<string, unknown>).activo) : desired, updatedAt: updated && typeof updated === 'object' && 'updatedAt' in (updated as Record<string, unknown>) ? String((updated as Record<string, unknown>).updatedAt) : new Date().toISOString() } : s));

      setStatusChangedId(supplier.id);
      setTimeout(() => setStatusChangedId(null), 2000);
    } catch (err: unknown) {
      // Normalize unknown error
      console.error('Error al alternar estado:', err);
      const message = err instanceof Error ? err.message : String(err ?? 'Error inesperado al actualizar el estado');
      setActionError(message);
    } finally {
      setToggleLoadingId(null);
    }
  };

  // Filtrar proveedores - Validación robusta para asegurar que suppliers sea un array
  const suppliersArray = Array.isArray(suppliers) ? suppliers : [];
  const filteredSuppliers = suppliersArray.filter((supplier) => {
    const supplierName = supplier.razonSocial || `${supplier.nombres} ${supplier.apellidos}`;
    const matchesSearch = 
      supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.numeroIdentificacion || '').includes(searchTerm) ||
      (supplier.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.telefono || '').includes(searchTerm);

    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && supplier.activo) ||
      (statusFilter === 'inactive' && !supplier.activo);

    return matchesSearch && matchesStatus;
  });

  // Manejar creación exitosa
  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    loadSuppliers(); // Recargar la lista
  };

  const handleEditSuccess = (updatedSupplier: Record<string, unknown>) => {
    // Safely merge updated fields into existing supplier entry
    const id = String(updatedSupplier.id ?? '');
    const partial: Partial<Supplier> = {};
    // Map known fields if present
    if (updatedSupplier.razonSocial !== undefined) partial.razonSocial = String(updatedSupplier.razonSocial);
    if (updatedSupplier.nombres !== undefined) partial.nombres = String(updatedSupplier.nombres);
    if (updatedSupplier.apellidos !== undefined) partial.apellidos = String(updatedSupplier.apellidos);
    if (updatedSupplier.numeroIdentificacion !== undefined) partial.numeroIdentificacion = String(updatedSupplier.numeroIdentificacion);
    if (updatedSupplier.tipoIdentificacion !== undefined) partial.tipoIdentificacion = (updatedSupplier.tipoIdentificacion as 'DNI' | 'RUC');
    if (updatedSupplier.telefono !== undefined) partial.telefono = String(updatedSupplier.telefono);
    if (updatedSupplier.email !== undefined) partial.email = String(updatedSupplier.email);
    if (updatedSupplier.direccion !== undefined) partial.direccion = String(updatedSupplier.direccion);
    if (updatedSupplier.representanteLegal !== undefined) partial.representanteLegal = String(updatedSupplier.representanteLegal);
    if (updatedSupplier.activo !== undefined) partial.activo = Boolean(updatedSupplier.activo);
    if (updatedSupplier.updatedAt !== undefined) partial.updatedAt = String(updatedSupplier.updatedAt);
    if (updatedSupplier.productosCount !== undefined) partial.productosCount = Number(updatedSupplier.productosCount);

    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...partial } : s));
    setShowEditForm(null);
  };

  // Manejar eliminación
  const handleDeleteClick = (supplier: Supplier) => {
    setDeleteConfirmation({
      supplier,
      isDeleting: false
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation) return;

    try {
      setDeleteConfirmation(prev => prev ? { ...prev, isDeleting: true } : null);
      setActionError('');

      const response = await fetch(`/api/proveedores/${deleteConfirmation.supplier.id}`, {
        method: 'DELETE'
      });

      const result = await response.json().catch(() => ({ success: false, error: 'Respuesta inválida del servidor' }));

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al eliminar el proveedor');
      }

      // Actualizar lista local
      setSuppliers(prev => prev.filter(s => s.id !== deleteConfirmation.supplier.id));
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error al eliminar proveedor:', error);
      setActionError(error instanceof Error ? error.message : 'Error inesperado al eliminar el proveedor');
      setDeleteConfirmation(prev => prev ? { ...prev, isDeleting: false } : null);
    }
  };

  const handleDeleteCancel = () => {
    if (!deleteConfirmation?.isDeleting) {
      setDeleteConfirmation(null);
    }
  };

  const handleProductsClick = (supplier: Supplier) => {
    const supplierName = supplier.razonSocial || `${supplier.nombres} ${supplier.apellidos}`.trim() || 'Sin nombre';
    setShowProductsModal({
      supplierId: supplier.id,
      supplierName
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            <span className="text-black font-medium">Cargando proveedores...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="font-medium text-red-700">Error al cargar proveedores</span>
          </div>
          <p className="text-red-600 mt-2">{error}</p>
          <button
            onClick={loadSuppliers}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-black">Proveedores</h1>
          <p className="text-black mt-1">
            {filteredSuppliers.length} proveedor{filteredSuppliers.length !== 1 ? 'es' : ''} encontrado{filteredSuppliers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Proveedor</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nombre, documento, email o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black bg-white"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error de acciones */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="font-medium text-red-700">Error en la operación</span>
          </div>
          <p className="text-red-600 mt-1">{actionError}</p>
        </div>
      )}

      {/* Lista de proveedores */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredSuppliers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-black mb-2">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No se encontraron proveedores' 
                    : 'No hay proveedores registrados'}
                </p>
                <p className="text-gray-600 text-sm">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Intenta ajustar los filtros de búsqueda' 
                    : 'Comienza agregando tu primer proveedor'}
                </p>
              </div>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  <span>Agregar primer proveedor</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Vista de tabla para pantallas grandes */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200" role="table" aria-label="Lista de proveedores">
                <thead className="bg-gray-50">
                  <tr role="row">
                    <th scope="col" className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de Creación
                    </th>
                    <th scope="col" className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proveedor
                    </th>
                    {/* Removed Contacto column - document shown under name; Productos stays; Estado removed (moved to actions) */}
                    <th scope="col" className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Productos
                    </th>
                    <th scope="col" className="px-4 xl:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSuppliers.map((supplier) => (
                    <tr 
                      key={supplier.id} 
                      className={`hover:bg-gray-50 transition-colors ${statusChangedId === supplier.id ? 'bg-green-50' : ''}`}
                      role="row"
                    >
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-black font-medium">
                          {formatDate(supplier.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 xl:px-6 py-4">
                        <div className="max-w-xs">
                          <div className="text-sm font-medium text-black truncate" title={supplier.razonSocial || `${supplier.nombres} ${supplier.apellidos}`}>
                            {supplier.razonSocial || `${supplier.nombres} ${supplier.apellidos}`}
                          </div>
                          {/* Documento mostrado debajo del nombre según corresponda */}
                          {supplier.numeroIdentificacion && (
                            <div className="text-sm text-gray-700 mt-1 truncate" title={`${supplier.tipoIdentificacion}: ${supplier.numeroIdentificacion}`}>
                              <span className="font-medium">{supplier.tipoIdentificacion}:</span> {supplier.numeroIdentificacion}
                            </div>
                          )}
                          {supplier.representanteLegal && (
                            <div className="text-sm text-gray-500 truncate" title={`Rep. Legal: ${supplier.representanteLegal}`}>
                              Rep. Legal: {supplier.representanteLegal}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                         <button
                           onClick={() => handleProductsClick(supplier)}
                           className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                           aria-label={`Ver ${supplier.productosCount || 0} productos del proveedor ${supplier.razonSocial || `${supplier.nombres} ${supplier.apellidos}`}`}
                         >
                           <Package className="w-4 h-4" />
                           <span className="text-sm font-medium">
                             {supplier.productosCount || 0} producto{(supplier.productosCount || 0) !== 1 ? 's' : ''}
                           </span>
                         </button>
                       </td>
                      {/* Estado moved to actions column - removed empty cell */}
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setShowEditForm(supplier)}
                              className="flex items-center space-x-1 xl:space-x-2 px-2 xl:px-3 py-2 rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label={`Editar proveedor ${supplier.razonSocial || `${supplier.nombres} ${supplier.apellidos}`}`}
                            >
                              <Pencil className="w-4 h-4" />
                              <span className="hidden xl:inline">Editar</span>
                            </button>

                            {/* Estado como botón de acción */}
                            <button
                              onClick={() => handleToggleActive(supplier)}
                              disabled={toggleLoadingId === supplier.id}
                              className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer hover:opacity-80 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                supplier.activo 
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200 focus:ring-green-500' 
                                  : 'bg-red-100 text-red-800 hover:bg-red-200 focus:ring-red-500'
                              }`}
                              aria-label={`Cambiar estado del proveedor a ${supplier.activo ? 'Inactivo' : 'Activo'}`}
                            >
                              {toggleLoadingId === supplier.id ? (
                                <div className="flex items-center space-x-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>...</span>
                                </div>
                              ) : (
                                supplier.activo ? 'Activo' : 'Inactivo'
                              )}
                            </button>

                            <button
                              onClick={() => handleDeleteClick(supplier)}
                              className="text-red-600 hover:text-red-900 transition-colors p-2 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                              aria-label={`Eliminar proveedor ${supplier.razonSocial || `${supplier.nombres} ${supplier.apellidos}`}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista de tarjetas para pantallas pequeñas y medianas */}
            <div className="lg:hidden space-y-4 p-4">
              {filteredSuppliers.map((supplier) => (
                <div 
                  key={supplier.id} 
                  className={`border border-gray-200 rounded-lg p-4 space-y-3 transition-colors ${statusChangedId === supplier.id ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'}`}
                >
                  {/* Header de la tarjeta */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-black truncate" title={supplier.razonSocial || `${supplier.nombres} ${supplier.apellidos}`}>
                        {supplier.razonSocial || `${supplier.nombres} ${supplier.apellidos}`}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Creado: {formatDate(supplier.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {/* Status moved to actions area to match clients visual design */}
                    </div>
                  </div>

                  {/* Documento mostrado debajo del nombre en la tarjeta, contacto se muestra como detalles pero no como columna en la tabla */}
                  <div className="border-t border-gray-100 pt-3">
                    <div className="text-sm">
                      <span className={`${
                        validateDocumentFormat(supplier.tipoIdentificacion || '', supplier.numeroIdentificacion || '') 
                          ? 'text-black' 
                          : 'text-red-600 font-medium'
                      }`}>
                        {supplier.tipoIdentificacion}: {supplier.numeroIdentificacion}
                      </span>
                      {!validateDocumentFormat(supplier.tipoIdentificacion || '', supplier.numeroIdentificacion || '') && (
                        <div className="text-xs text-red-500 mt-1" role="alert">
                          Formato inválido ({supplier.tipoIdentificacion === 'DNI' ? '8 dígitos' : '11 dígitos'})
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Información de contacto (mantener en tarjeta pero no como columna en tabla) */}
                  <div className="border-t border-gray-100 pt-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Contacto:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <span aria-label="Teléfono">📞</span>
                        <span className="text-black">{supplier.telefono || 'No registrado'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span aria-label="Email">✉️</span>
                        <span className="text-gray-600 break-all">{supplier.email || 'No registrado'}</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span aria-label="Dirección">📍</span>
                        <span className="text-gray-600 text-sm leading-relaxed">
                          {supplier.direccion || 'No registrada'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Productos y acciones */}
                  <div className="border-t border-gray-100 pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <button
                      onClick={() => handleProductsClick(supplier)}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto justify-center sm:justify-start"
                      aria-label={`Ver ${supplier.productosCount || 0} productos del proveedor`}
                    >
                      <Package className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {supplier.productosCount || 0} producto{(supplier.productosCount || 0) !== 1 ? 's' : ''}
                      </span>
                    </button>
                    
                    <div className="flex space-x-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleToggleActive(supplier)}
                        disabled={toggleLoadingId === supplier.id}
                        className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold ${supplier.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} w-full sm:w-auto`}
                      >{toggleLoadingId === supplier.id ? <Loader2 className="w-4 h-4 animate-spin"/> : (supplier.activo ? 'Activo' : 'Inactivo')}</button>

                      <button
                        onClick={() => setShowEditForm(supplier)}
                        className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
                        aria-label={`Editar proveedor ${supplier.razonSocial || `${supplier.nombres} ${supplier.apellidos}`}`}
                      >
                        <Pencil className="w-4 h-4" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(supplier)}
                        className="flex items-center justify-center text-red-600 hover:text-red-900 transition-colors p-2 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                        aria-label={`Eliminar proveedor ${supplier.razonSocial || `${supplier.nombres} ${supplier.apellidos}`}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Formulario de creación */}
      <Modal 
        isOpen={showCreateForm} 
        onClose={() => setShowCreateForm(false)}
        ariaLabel="Crear nuevo proveedor"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Nuevo Proveedor</h3>
          <p className="text-sm text-gray-600 mt-1">Completa los datos del proveedor</p>
        </div>
        <AddSupplierForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreateForm(false)}
        />
      </Modal>

      {/* Formulario de edición */}
      <Modal 
        isOpen={!!showEditForm} 
        onClose={() => setShowEditForm(null)}
        ariaLabel="Editar proveedor"
      >
        {showEditForm && (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Editar Proveedor</h3>
              <p className="text-sm text-gray-600 mt-1">
                Modifica los datos de {showEditForm.razonSocial || `${showEditForm.nombres} ${showEditForm.apellidos}`}
              </p>
            </div>
            <EditSupplierForm
              supplier={showEditForm}
              onSuccess={handleEditSuccess}
              onCancel={() => setShowEditForm(null)}
            />
          </>
        )}
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal 
        isOpen={!!deleteConfirmation} 
        onClose={deleteConfirmation?.isDeleting ? () => {} : handleDeleteCancel}
      >
        {deleteConfirmation && (
          <DeleteConfirmation
            supplier={deleteConfirmation.supplier}
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
            isDeleting={deleteConfirmation.isDeleting}
          />
        )}
      </Modal>

      {/* Modal de productos del proveedor */}
      <ProductosProveedorVistaModal
        isOpen={!!showProductsModal}
        onClose={() => setShowProductsModal(null)}
        proveedorId={showProductsModal?.supplierId || ''}
        proveedorNombre={showProductsModal?.supplierName}
      />
    </div>
  );
}