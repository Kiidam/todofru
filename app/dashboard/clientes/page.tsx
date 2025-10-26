"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import NewClientForm from '../../../src/components/clientes/NewClientForm';
import ClienteInlineEdit from '../../../src/components/clientes/ClienteInlineEdit';
import ClienteToggleStatus from '../../../src/components/clientes/ClienteToggleStatus';
import EditClienteModal from '../../../src/components/clientes/EditClienteModal';
import { Trash2, AlertTriangle, Loader2, Plus, Search, Filter, Eye, EyeOff, Pencil, Edit3 } from 'lucide-react';


const Modal = dynamic(() => import('../../../src/components/ui/Modal'), { ssr: false });

interface Client {
  id: string;
  nombre: string;
  numeroIdentificacion?: string;
  ruc?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto?: string;
  tipoCliente: 'MAYORISTA' | 'MINORISTA';
  tipoEntidad?: 'PERSONA_NATURAL' | 'PERSONA_JURIDICA';
  nombres?: string;
  apellidos?: string;
  razonSocial?: string;
  mensajePersonalizado?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DeleteConfirmationProps {
  client: Client;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteConfirmation({ client, onConfirm, onCancel, isDeleting }: DeleteConfirmationProps) {
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
        <p className="text-black mb-2">¿Está seguro que desea eliminar el cliente:</p>
        <div className="bg-gray-50 p-3 rounded-lg border">
          <p className="font-semibold text-black">{client.nombre}</p>
          {client.numeroIdentificacion && (
            <p className="text-sm text-black">
              {client.tipoEntidad === 'PERSONA_NATURAL' ? 'DNI' : 'RUC'}: {client.numeroIdentificacion}
            </p>
          )}
          {client.email && (
            <p className="text-sm text-black">Email: {client.email}</p>
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
              <span>Eliminar Cliente</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function ClientesPage() {
  // Estados principales
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);
  const [statusChangedId, setStatusChangedId] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  // Estados de modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    client: Client;
    isDeleting: boolean;
  } | null>(null);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  // Eliminado: filtro de tipo
  // const [typeFilter, setTypeFilter] = useState<'all' | 'MAYORISTA' | 'MINORISTA'>('all');

  // Cargar clientes al montar el componente
  useEffect(() => {
    loadClients();
  }, []);



  const loadClients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/clientes', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Error al cargar clientes');
      }
      const result = await response.json();
      // La API devuelve { success: true, data: [...], message: "...", pagination: {...} }
      // Extraer el array de clientes de la propiedad data
      const clientsData = result.success && result.data ? result.data : result;
      setClients(Array.isArray(clientsData) ? clientsData : []);
    } catch (error) {
      console.error('Error loading clients:', error);
      setError('Error al cargar los clientes');
      setClients([]); // Establecer array vacío en caso de error
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle activo/inactivo
  const handleToggleActive = async (client: Client) => {
    setToggleLoadingId(client.id);
    setActionError('');
    
    try {
      const response = await fetch(`/api/clientes/${client.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          activo: !client.activo
        }),
      });

      if (!response.ok) {
        // Intentar obtener el mensaje de error específico de la API
        let errorMessage = 'Error al actualizar el cliente';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // Si no se puede parsear la respuesta, usar mensaje genérico basado en el status
          switch (response.status) {
            case 404:
              errorMessage = 'Cliente no encontrado';
              break;
            case 400:
              errorMessage = 'Datos de solicitud inválidos';
              break;
            case 401:
              errorMessage = 'No autorizado para realizar esta acción';
              break;
            case 403:
              errorMessage = 'No tiene permisos para modificar este cliente';
              break;
            case 500:
              errorMessage = 'Error interno del servidor';
              break;
            default:
              errorMessage = `Error del servidor (${response.status})`;
          }
        }
        
        // Intentar obtener más detalles del error
        let responseText = '';
        try {
          responseText = await response.text();
        } catch (textError) {
          responseText = 'No se pudo leer la respuesta';
        }

        console.error('Error al actualizar cliente:', {
          status: response.status,
          statusText: response.statusText,
          clientId: client.id,
          action: client.activo ? 'desactivar' : 'activar',
          responseBody: responseText,
          url: `/api/clientes/${client.id}`,
          method: 'PATCH',
          requestBody: JSON.stringify({ activo: !client.activo }),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        setActionError(errorMessage);
        return;
      }

      // Verificar que la respuesta sea válida
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error('Error al parsear respuesta exitosa:', parseError);
        setActionError('Error al procesar la respuesta del servidor');
        return;
      }

      // Actualizar el estado local solo si la operación fue exitosa
      setClients(prevClients => 
        prevClients.map(c => 
          c.id === client.id 
            ? { ...c, activo: !c.activo }
            : c
        )
      );
      
      setStatusChangedId(client.id);
      setTimeout(() => setStatusChangedId(null), 2000);
      
    } catch (error) {
      console.error('Error de red al cambiar estado del cliente:', {
        error: error,
        errorMessage: error instanceof Error ? error.message : 'Error desconocido',
        errorStack: error instanceof Error ? error.stack : undefined,
        clientId: client.id,
        action: client.activo ? 'desactivar' : 'activar',
        url: `/api/clientes/${client.id}`,
        method: 'PATCH',
        requestBody: JSON.stringify({ activo: !client.activo }),
        timestamp: new Date().toISOString()
      });
      
      // Determinar el tipo de error y mostrar mensaje apropiado
      let errorMessage = 'Error de conexión al actualizar el cliente';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Error de conexión. Verifique su conexión a internet';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setActionError(errorMessage);
    } finally {
      setToggleLoadingId(null);
    }
  };

  // Filtrar clientes - Asegurar que clients sea un array
  const filteredClients = (Array.isArray(clients) ? clients : []).filter((client) => {
    const matchesSearch = 
      client.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.numeroIdentificacion || '').includes(searchTerm) ||
      (client.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.telefono || '').includes(searchTerm);

    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && client.activo) ||
      (statusFilter === 'inactive' && !client.activo);

    return matchesSearch && matchesStatus;
  });

  // Manejar creación exitosa
  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    loadClients(); // Recargar la lista
  };

  // Manejar edición de cliente
  const handleEditClick = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setEditingClient(client);
      setIsEditModalOpen(true);
    }
  };

  // Manejar actualización de cliente desde el modal
  const handleModalSave = async (clientId: string, updatedData: any) => {
    // Actualizar la lista local de clientes
    setClients(prevClients => 
      prevClients.map(client => 
        client.id === clientId 
          ? { ...client, ...updatedData }
          : client
      )
    );
    
    // Cerrar el modal
    setIsEditModalOpen(false);
    setEditingClient(null);
  };

  // Manejar cierre del modal de edición
  const handleModalClose = () => {
    setIsEditModalOpen(false);
    setEditingClient(null);
  };

  // Manejar actualización de cliente (para edición inline)
  const handleClientUpdate = (clientId: string, updatedData: Partial<Client>) => {
    setClients(prevClients => 
      prevClients.map(client => 
        client.id === clientId 
          ? { ...client, ...updatedData }
          : client
      )
    );
    setEditingClientId(null);
  };

  // Manejar errores de edición
  const handleEditError = (error: string) => {
    setActionError(error);
  };

  // Manejar cancelación de edición
  const handleEditCancel = () => {
    setEditingClientId(null);
  };

  // Manejar eliminación
  const handleDeleteClick = (client: Client) => {
    setDeleteConfirmation({
      client,
      isDeleting: false
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation) return;

    try {
      setDeleteConfirmation(prev => prev ? { ...prev, isDeleting: true } : null);

      const response = await fetch(`/api/clientes/${deleteConfirmation.client.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al eliminar el cliente');
      }

      // Actualizar la lista local
      setClients(prev => prev.filter(c => c.id !== deleteConfirmation.client.id));
      setDeleteConfirmation(null);

    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      alert(error instanceof Error ? error.message : 'Error inesperado al eliminar el cliente');
      
      // Resetear estado de eliminación en caso de error
      setDeleteConfirmation(prev => prev ? { ...prev, isDeleting: false } : null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation(null);
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Formatear tipo de entidad
  const formatEntityType = (tipoEntidad?: string) => {
    switch (tipoEntidad) {
      case 'PERSONA_NATURAL':
        return 'Persona Natural';
      case 'PERSONA_JURIDICA':
        return 'Persona Jurídica';
      default:
        return 'No especificado';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            <span className="text-black font-medium">Cargando clientes...</span>
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
            <span className="font-medium text-red-700">Error al cargar clientes</span>
          </div>
          <p className="text-red-600 mt-2">{error}</p>
          <button
            onClick={loadClients}
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
          <h1 className="text-2xl font-bold text-black">Clientes</h1>
          <p className="text-black mt-1">
            {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''} encontrado{filteredClients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>Crear Cliente</span>
        </button>
      </div>

      {/* Banner de error de acción */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 font-medium">{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-sm text-red-700 hover:underline">Cerrar</button>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black bg-white"
            />
          </div>

          {/* Filtro de estado */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black bg-white appearance-none"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>

          {/* Botón limpiar filtros */}
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className="px-4 py-2 text-sm font-medium text-black bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Tabla de clientes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-black mb-2">No se encontraron clientes</h3>
            <p className="text-black">
              {searchTerm || statusFilter !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza creando tu primer cliente'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-black uppercase tracking-wider">
                    Fecha Registro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-black uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-black uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-black uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <React.Fragment key={client.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {formatDate(client.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-semibold text-black">{client.nombre}</div>
                          {client.numeroIdentificacion && (
                            <div className="text-sm text-black">
                              {client.tipoEntidad === 'PERSONA_NATURAL' ? 'DNI' : 'RUC'}: {client.numeroIdentificacion}
                            </div>
                          )}
                          <div className="text-xs text-black">{formatEntityType(client.tipoEntidad)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-black">
                          {client.telefono && (
                            <div>📞 {client.telefono}</div>
                          )}
                          {client.email && (
                            <div>✉️ {client.email}</div>
                          )}
                          {client.direccion && (
                            <div className="text-xs text-black mt-1">📍 {client.direccion}</div>
                          )}
                        </div>
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botón de toggle de estado con confirmación visual */}
                        <button
                          onClick={() => toggleClientStatus(client)}
                          disabled={toggleLoadingId === client.id}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                            toggleLoadingId === client.id
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:scale-105 cursor-pointer'
                          } ${
                            statusChangedId === client.id
                              ? 'ring-2 ring-blue-400 ring-opacity-50'
                              : ''
                          } ${
                            client.activo 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                          title={`${client.activo ? 'Desactivar' : 'Activar'} cliente`}
                        >
                          {toggleLoadingId === client.id ? (
                            <div className="flex items-center space-x-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>...</span>
                            </div>
                          ) : (
                            <>
                              {client.activo ? 'Activo' : 'Inactivo'}
                              {statusChangedId === client.id && (
                                <span className="ml-1">✓</span>
                              )}
                            </>
                          )}
                        </button>
                        
                        {/* Botón de editar */}
                        <button
                          onClick={() => handleEditClick(client.id)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar cliente"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        
                        {/* Botón de eliminar */}
                        <button
                          onClick={() => handleDeleteClick(client)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar cliente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  

                </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de creación */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <NewClientForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal 
        isOpen={!!deleteConfirmation} 
        onClose={deleteConfirmation?.isDeleting ? () => {} : handleDeleteCancel}
      >
        {deleteConfirmation && (
          <DeleteConfirmation
            client={deleteConfirmation.client}
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
            isDeleting={deleteConfirmation.isDeleting}
          />
        )}
      </Modal>

      {/* Modal de edición */}
      <EditClienteModal
        isOpen={isEditModalOpen}
        client={editingClient}
        onClose={handleModalClose}
        onSave={handleModalSave}
      />

      {/* Modal de edición inline (mantener para compatibilidad) */}
      {editingClientId && (
        <ClienteInlineEdit
          client={clients.find(c => c.id === editingClientId)!}
          onSave={handleClientUpdate}
          onCancel={handleEditCancel}
          onError={handleEditError}
        />
      )}
    </div>
  );
}
