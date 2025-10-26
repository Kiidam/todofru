"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import AddSupplierForm from "@/components/proveedores/AddSupplierForm";
import EditSupplierForm from "@/components/proveedores/EditSupplierForm";
import ProductosProveedorVistaModal from "@/components/proveedores/ProductosProveedorVistaModal";
import { Trash2, AlertTriangle, Loader2, Plus, Search, Filter, Eye, EyeOff, Pencil, Package } from 'lucide-react';

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
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-md mx-auto">
      <div className="flex items-center space-x-3 mb-4">
        <div className="flex-shrink-0">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-black">Confirmar Eliminación</h3>
          <p className="text-sm text-black mt-1">Esta acción no se puede deshacer</p>
        </div>
      </div>
      
      <div className="mb-6">
        <p className="text-black mb-2">¿Está seguro que desea eliminar el proveedor:</p>
        <div className="bg-gray-50 p-3 rounded-lg border">
          <p className="font-semibold text-black">
            {supplier.razonSocial || `${supplier.nombres} ${supplier.apellidos}`}
          </p>
          {supplier.numeroIdentificacion && (
            <p className="text-sm text-black">
              {supplier.tipoIdentificacion}: {supplier.numeroIdentificacion}
            </p>
          )}
          {supplier.email && (
            <p className="text-sm text-black">Email: {supplier.email}</p>
          )}
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

      const response = await fetch('/api/proveedores');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al cargar los proveedores');
      }

      // La API devuelve { success: true, data: { data: [...], pagination: {...} } }
      const suppliersData = result.data?.data || result.data || [];
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
      setError(error instanceof Error ? error.message : 'Error inesperado al cargar los proveedores');
    } finally {
      setIsLoading(false);
    }
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
        const msg = json?.error || json?.message || 'No se pudo actualizar el estado';
        throw new Error(msg);
      }
      const updated = json?.data || json;
      // Actualizar lista local
      setSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, activo: updated?.activo ?? desired, updatedAt: updated?.updatedAt || new Date().toISOString() } : s));
      setStatusChangedId(supplier.id);
      setTimeout(() => setStatusChangedId(null), 2000);
    } catch (err: any) {
      console.error('Error al alternar estado:', err);
      setActionError(err?.message || 'Error inesperado al actualizar el estado');
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

  const handleEditSuccess = (updatedSupplier: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
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
            <p className="text-black">
              {searchTerm || statusFilter !== 'all' 
                ? 'No se encontraron proveedores con los filtros aplicados' 
                : 'No hay proveedores registrados'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Agregar primer proveedor
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className={statusChangedId === supplier.id ? 'bg-green-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-black">
                          {supplier.razonSocial || `${supplier.nombres} ${supplier.apellidos}`}
                        </div>
                        {supplier.representanteLegal && (
                          <div className="text-sm text-gray-500">
                            Rep. Legal: {supplier.representanteLegal}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">
                        {supplier.tipoIdentificacion}: {supplier.numeroIdentificacion}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{supplier.telefono}</div>
                      <div className="text-sm text-gray-500">{supplier.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <button
                         onClick={() => handleProductsClick(supplier)}
                         className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                         title="Ver productos del proveedor"
                       >
                         <Package className="w-4 h-4" />
                         <span className="text-sm font-medium">
                           {supplier.productosCount || 0} producto{(supplier.productosCount || 0) !== 1 ? 's' : ''}
                         </span>
                       </button>
                     </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        supplier.activo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {supplier.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end gap-2">
                      <button
                        onClick={() => setShowEditForm(supplier)}
                        className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700"
                        title="Editar proveedor"
                      >
                        <Pencil className="w-4 h-4" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(supplier)}
                        className="text-red-600 hover:text-red-900 transition-colors p-2 rounded-lg hover:bg-red-50"
                        title="Eliminar proveedor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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