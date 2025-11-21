'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, User, Building2, Phone, Mail, MapPin, Save, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Cliente {
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

interface EditClienteModalProps {
  client: Cliente | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditClienteModal({ client, onClose, onSuccess }: EditClienteModalProps) {
  const [formData, setFormData] = useState({
    // Campos de solo lectura (no editables)
    nombre: '',
    numeroIdentificacion: '',
    tipoCliente: 'MINORISTA' as 'MAYORISTA' | 'MINORISTA',
    tipoEntidad: 'PERSONA_NATURAL' as 'PERSONA_NATURAL' | 'PERSONA_JURIDICA',
    nombres: '',
    apellidos: '',
    razonSocial: '',
    email: '',
    contacto: '',
    mensajePersonalizado: '',
    activo: true,
    
    // Campos editables
    telefono: '',
    direccion: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar datos del cliente cuando se abre el modal
  useEffect(() => {
    if (client) {
      setFormData({
        // Campos de solo lectura
        nombre: client.nombre || '',
        numeroIdentificacion: client.numeroIdentificacion || client.ruc || '',
        tipoCliente: client.tipoCliente || 'MINORISTA',
        tipoEntidad: client.tipoEntidad || 'PERSONA_NATURAL',
        nombres: client.nombres || '',
        apellidos: client.apellidos || '',
        razonSocial: client.razonSocial || '',
        email: client.email || '',
        contacto: client.contacto || '',
        mensajePersonalizado: client.mensajePersonalizado || '',
        activo: client.activo,
        
        // Campos editables
        telefono: client.telefono || '',
        direccion: client.direccion || ''
      });
      setErrors({});
    }
  }, [client]);

  // Validar formulario - solo campos editables
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validar teléfono (opcional pero si se proporciona debe tener formato válido)
    if (formData.telefono && formData.telefono.trim()) {
      const phoneRegex = /^[+]?[\d\s\-()]{7,15}$/;
      if (!phoneRegex.test(formData.telefono.trim())) {
        newErrors.telefono = 'El teléfono debe tener un formato válido (7-15 dígitos)';
      }
    }

    // Validar dirección (opcional pero si se proporciona debe tener al menos 5 caracteres)
    if (formData.direccion && formData.direccion.trim() && formData.direccion.trim().length < 5) {
      newErrors.direccion = 'La dirección debe tener al menos 5 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar cambios en el formulario - solo campos editables
  const handleInputChange = (field: string, value: string) => {
    // Solo permitir edición de teléfono y dirección
    if (field === 'telefono' || field === 'direccion') {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));

      // Limpiar error del campo cuando el usuario empiece a escribir
      if (errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: ''
        }));
      }
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !client) return;

    setIsSubmitting(true);

    try {
      // Preparar datos para la API - solo campos editables
      const updateData = {
        telefono: formData.telefono.trim(),
        direccion: formData.direccion.trim()
      };

      const response = await fetch(`/api/clientes/${client.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el cliente');
      }

      const result = await response.json();
      const updatedClient = result.data || result;
      
      toast.success('Cliente actualizado exitosamente');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar el cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!client) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Editar Cliente</h2>
              <p className="text-sm text-gray-500">Modifica la información del cliente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información de solo lectura */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Lock className="h-4 w-4 mr-2" />
              Información no editable
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo de Entidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Entidad
                </label>
                <input
                  type="text"
                  value={formData.tipoEntidad === 'PERSONA_NATURAL' ? 'Persona Natural' : 'Persona Jurídica'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              {/* Número de Identificación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.tipoEntidad === 'PERSONA_NATURAL' ? 'DNI' : 'RUC'}
                </label>
                <input
                  type="text"
                  value={formData.numeroIdentificacion}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              {/* Nombre/Razón Social */}
              {formData.tipoEntidad === 'PERSONA_NATURAL' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombres
                    </label>
                    <input
                      type="text"
                      value={formData.nombres}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Apellidos
                    </label>
                    <input
                      type="text"
                      value={formData.apellidos}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                </>
              ) : (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Razón Social
                  </label>
                  <input
                    type="text"
                    value={formData.razonSocial}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              {/* Tipo de Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Cliente
                </label>
                <input
                  type="text"
                  value={formData.tipoCliente}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Campos editables */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Información editable</h3>



            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="h-4 w-4 inline mr-1" />
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => handleInputChange('telefono', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.telefono ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ingrese el teléfono"
              />
              {errors.telefono && (
                <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>
              )}
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="h-4 w-4 inline mr-1" />
                Dirección
              </label>
              <textarea
                value={formData.direccion}
                onChange={(e) => handleInputChange('direccion', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.direccion ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ingrese la dirección"
                rows={3}
              />
              {errors.direccion && (
                <p className="mt-1 text-sm text-red-600">{errors.direccion}</p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}