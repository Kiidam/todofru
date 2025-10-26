"use client";

import React, { useState, useEffect } from 'react';
import { Check, X, Loader2 } from 'lucide-react';

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

interface EditableFields {
  telefono: string;
  email: string;
  direccion: string;
  mensajePersonalizado: string;
  activo: boolean;
  [key: string]: string | boolean | undefined;
}

interface ClienteInlineEditProps {
  client: Client;
  onSave: (clientId: string, updatedData: Partial<Client>) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

export default function ClienteInlineEdit({ client, onSave, onCancel, onError }: ClienteInlineEditProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [editData, setEditData] = useState<EditableFields>({
    telefono: client.telefono || '',
    email: client.email || '',
    direccion: client.direccion || '',
    mensajePersonalizado: client.mensajePersonalizado || '',
    activo: client.activo,
  });
  const [errors, setErrors] = useState<Partial<EditableFields>>({});

  // Resetear datos cuando cambie el cliente
  useEffect(() => {
    setEditData({
      telefono: client.telefono || '',
      email: client.email || '',
      direccion: client.direccion || '',
      mensajePersonalizado: client.mensajePersonalizado || '',
      activo: client.activo,
    });
    setErrors({});
  }, [client]);

  // Validaciones mejoradas
  const validateField = (field: keyof EditableFields, value: any) => {
    const newErrors: Record<string, string> = {};
    const fieldName = String(field);

    switch (fieldName) {
      case 'direccion':
        if (!value || String(value).trim().length < 10) {
          newErrors[fieldName] = 'La dirección es obligatoria y debe tener al menos 10 caracteres';
        } else if (String(value).trim().length > 255) {
          newErrors[fieldName] = 'La dirección no puede exceder 255 caracteres';
        }
        break;

      case 'email':
        if (value && String(value).trim() !== '') {
          const email = String(value).trim();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors[fieldName] = 'El formato del email no es válido';
          } else if (email.length > 100) {
            newErrors[fieldName] = 'El email no puede exceder 100 caracteres';
          }
        }
        break;

      case 'telefono':
        if (value && String(value).trim() !== '') {
          const telefono = String(value).trim();
          if (!/^[\+]?[\d\s\-\(\)]{7,15}$/.test(telefono)) {
            newErrors[fieldName] = 'El formato del teléfono no es válido (7-15 dígitos)';
          }
        }
        break;

      case 'mensajePersonalizado':
        if (value && String(value).trim().length > 500) {
          newErrors[fieldName] = 'El mensaje personalizado no puede exceder 500 caracteres';
        }
        break;
    }

    setErrors(prev => {
      const updatedErrors = { ...prev, ...newErrors };
      if (Object.keys(newErrors).length === 0) {
        delete updatedErrors[fieldName];
      }
      return updatedErrors;
    });

    return Object.keys(newErrors).length === 0;
  };

  const validateAllFields = (): boolean => {
    const fieldsToValidate: (keyof EditableFields)[] = ['direccion', 'email', 'telefono', 'mensajePersonalizado'];

    let isValid = true;
    fieldsToValidate.forEach(field => {
      const fieldValid = validateField(field, editData[field]);
      if (!fieldValid) isValid = false;
    });

    return isValid;
  };

  const handleInputChange = (field: keyof EditableFields, value: string | boolean) => {
    setEditData(prev => ({ ...prev, [field]: value }));
    if (typeof value === 'string') {
      validateField(field, value);
    }
  };

  const handleCancel = () => {
    setEditData({
      telefono: client.telefono || '',
      email: client.email || '',
      direccion: client.direccion || '',
      mensajePersonalizado: client.mensajePersonalizado || '',
      activo: client.activo,
    });
    setErrors({});
    onCancel();
  };

  const handleSave = async () => {
    if (!validateAllFields()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Preparar datos con validación adicional
      const updateData = {
        telefono: editData.telefono.trim() || null,
        email: editData.email.trim() || null,
        direccion: editData.direccion.trim(),
        mensajePersonalizado: editData.mensajePersonalizado.trim() || null,
        activo: editData.activo,
        // Incluir timestamp para control de concurrencia
        lastUpdated: client.updatedAt,
      };

      // Validación final antes del envío
      if (!updateData.direccion || updateData.direccion.length < 10) {
        throw new Error('La dirección es obligatoria y debe tener al menos 10 caracteres');
      }

      const response = await fetch(`/api/clientes/${client.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'If-Unmodified-Since': client.updatedAt, // Control de concurrencia
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        let errorMessage = 'Error al actualizar el cliente';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
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
            case 409:
              errorMessage = 'Conflicto de concurrencia. El cliente fue modificado por otro usuario.';
              break;
            case 500:
              errorMessage = 'Error interno del servidor';
              break;
            default:
              errorMessage = `Error del servidor (${response.status})`;
          }
        }
        throw new Error(errorMessage);
      }

      const updatedClient = await response.json();
      
      // Actualizar el cliente en el estado padre
      onSave(client.id, {
        telefono: updateData.telefono || undefined,
        email: updateData.email || undefined,
        direccion: updateData.direccion,
        mensajePersonalizado: updateData.mensajePersonalizado || undefined,
        activo: updateData.activo,
        updatedAt: new Date().toISOString(),
      });

    } catch (error) {
      onError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = !editData.activo;
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/clientes/${client.id}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'If-Unmodified-Since': client.updatedAt, // Control de concurrencia
        },
        credentials: 'include',
        body: JSON.stringify({ 
          activo: newStatus,
          lastUpdated: client.updatedAt 
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Error al cambiar el estado del cliente';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          switch (response.status) {
            case 404:
              errorMessage = 'Cliente no encontrado';
              break;
            case 409:
              errorMessage = 'El cliente fue modificado por otro usuario. Recargue la página.';
              break;
            case 403:
              errorMessage = 'No tiene permisos para cambiar el estado del cliente';
              break;
            default:
              errorMessage = `Error del servidor (${response.status})`;
          }
        }
        throw new Error(errorMessage);
      }

      const updatedClient = await response.json();
      setEditData(prev => ({ ...prev, activo: newStatus }));
      
      // Actualizar inmediatamente en el estado padre
      onSave(client.id, { 
        activo: newStatus, 
        updatedAt: updatedClient.updatedAt || new Date().toISOString() 
      });
      
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Error al cambiar el estado');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        {/* Overlay de carga */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              <p className="text-sm text-gray-600 font-medium">Procesando...</p>
            </div>
          </div>
        )}
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-black">Editar Cliente</h3>
              <p className="text-sm text-black mt-1">
                Modifique los datos del cliente
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Información de solo lectura */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-semibold text-black mb-3">Información del Cliente (Solo lectura)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Fecha de Registro</label>
                  <div className="text-sm text-black font-medium">{formatDate(client.createdAt)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nombre</label>
                  <div className="text-sm text-black font-medium">{client.nombre}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Identificación</label>
                  <div className="text-sm text-black">
                    {client.tipoEntidad === 'PERSONA_NATURAL' ? 'DNI' : 'RUC'}: {client.numeroIdentificacion}
                  </div>
                </div>
              </div>
            </div>

            {/* Estado con toggle */}
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-semibold text-black mb-1">Estado del Cliente</label>
                  <p className="text-xs text-gray-600">Cambiar entre activo e inactivo</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`text-sm font-medium ${editData.activo ? 'text-green-600' : 'text-red-600'}`}>
                    {editData.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <button
                    onClick={handleToggleStatus}
                    disabled={isLoading}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                      editData.activo
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                        : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      editData.activo ? 'Desactivar' : 'Activar'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Campos editables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="telefono" className="block text-sm font-semibold text-black mb-2">
                  Teléfono
                </label>
                <input
                  id="telefono"
                  type="tel"
                  value={editData.telefono}
                  onChange={(e) => handleInputChange('telefono', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black ${
                    errors.telefono ? 'border-red-500' : 'border-gray-300'
                  } bg-white`}
                  placeholder="+51 123 456 789"
                  disabled={isLoading}
                />
                {errors.telefono && (
                  <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-black mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={editData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  } bg-white`}
                  placeholder="correo@ejemplo.com"
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Dirección (obligatoria) */}
            <div>
              <label htmlFor="direccion" className="block text-sm font-semibold text-black mb-2">
                Dirección *
              </label>
              <input
                id="direccion"
                type="text"
                value={editData.direccion}
                onChange={(e) => handleInputChange('direccion', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black ${
                  errors.direccion ? 'border-red-500' : 'border-gray-300'
                } bg-white`}
                placeholder="Av. Principal 123, Distrito, Provincia, Departamento"
                disabled={isLoading}
              />
              {errors.direccion && (
                <p className="mt-1 text-sm text-red-600">{errors.direccion}</p>
              )}
            </div>

            {/* Mensaje personalizado */}
            <div>
              <label htmlFor="mensajePersonalizado" className="block text-sm font-semibold text-black mb-2">
                Mensaje Personalizado
              </label>
              <textarea
                id="mensajePersonalizado"
                value={editData.mensajePersonalizado}
                onChange={(e) => handleInputChange('mensajePersonalizado', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-black resize-none"
                rows={3}
                placeholder="Mensaje personalizado para este cliente (opcional)"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}