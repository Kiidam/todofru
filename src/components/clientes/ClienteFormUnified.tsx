"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  User, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Save, 
  X, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  
} from 'lucide-react';

import { useClientes } from '../../contexts/ClientesContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useClienteValidation } from '../../hooks/useClienteValidation';
import { 
  ClienteFormData, 
  ClientePayload, 
  TipoEntidad, 
  TipoCliente,
  clienteFormDataToPayload,
  clientePayloadToFormData,
  determinarTipoEntidad
} from '../../types/cliente';

// Props del componente
interface ClienteFormUnifiedProps {
  initialData?: ClientePayload;
  mode: 'create' | 'edit';
  onSuccess?: (cliente: ClientePayload) => void;
  onCancel?: () => void;
  className?: string;
}

// Componente principal
export default function ClienteFormUnified({
  initialData,
  mode,
  onSuccess,
  onCancel,
  className = '',
}: ClienteFormUnifiedProps) {
  const { data: session, status } = useSession();
  const { actions: clientesActions } = useClientes();
  const { showSuccess, showError, showWarning } = useNotifications();
  const {
    errors,
    isValidating,
    validateField,
    validateForm,
    validateAsync,
    clearFieldError,
    getFieldError,
    hasFieldError,
    clearErrors,
  } = useClienteValidation();

  // Estado del formulario
  const [formData, setFormData] = useState<ClienteFormData>(() => {
    if (initialData) {
      return clientePayloadToFormData(initialData);
    }
    return {
      tipoEntidad: 'PERSONA_JURIDICA' as TipoEntidad,
      numeroIdentificacion: '',
      nombres: '',
      apellidos: '',
      razonSocial: '',
      telefono: '',
      email: '',
      direccion: '',
      contacto: '',
      tipoCliente: 'MINORISTA' as TipoCliente,
      activo: true,
      mensajePersonalizado: '',
    };
  });

  // Estados de UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupSuccess, setLookupSuccess] = useState<string | null>(null);
  const [autocompletedFields, setAutocompletedFields] = useState<Set<string>>(new Set());
  // advanced config removed by UX, keep placeholders if needed in future
  const [isDirty, setIsDirty] = useState(false);

  // Refs
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lookupControllerRef = useRef<AbortController | null>(null);
  interface LookupCacheEntry { tipoEntidad: TipoEntidad; data: Record<string, unknown>; ts: number }
  const lookupCacheRef = useRef<Map<string, LookupCacheEntry>>(new Map());
  const isMountedRef = useRef(true);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Función para actualizar campo del formulario
  const updateFormField = useCallback((field: keyof ClienteFormData, value: unknown) => {
    setFormData(prev => {
      const normalized = typeof value === 'string' ? value : String(value ?? '');
      const newData = { ...prev, [field]: normalized } as ClienteFormData;
      
      // Limpiar error del campo cuando el usuario lo modifica
      if (hasFieldError(field)) {
        clearFieldError(field);
      }
      
      // Marcar como modificado
      setIsDirty(true);
      
      return newData;
    });
  }, [hasFieldError, clearFieldError]);

  // Función para actualizar tipo de entidad automáticamente
  const actualizarTipoEntidad = useCallback((numeroIdentificacion: string) => {
    if (numeroIdentificacion.length >= 8) {
      const tipoDetectado = determinarTipoEntidad(numeroIdentificacion);
      if (tipoDetectado !== formData.tipoEntidad) {
        updateFormField('tipoEntidad', tipoDetectado);
        
        // Limpiar campos específicos del tipo anterior
        if (tipoDetectado === 'PERSONA_NATURAL') {
          updateFormField('razonSocial', '');
          updateFormField('contacto', '');
        } else {
          updateFormField('nombres', '');
          updateFormField('apellidos', '');
        }
      }
    }
  }, [formData.tipoEntidad, updateFormField]);

  // Función para buscar datos en RENIEC/SUNAT
  const buscarDatosExternos = async (numeroIdentificacion: string) => {
    if (!numeroIdentificacion || numeroIdentificacion.length < 8) return;

    // Check cache first
    const cached = lookupCacheRef.current.get(numeroIdentificacion);
    if (cached) {
      // apply cached result synchronously
      const { tipoEntidad, data } = cached;
      const fieldsToUpdate = new Set<string>();
      
      // Actualizar formData directamente
      setFormData(prev => {
        const updated = { ...prev };
        
        if (tipoEntidad === 'PERSONA_NATURAL' && typeof data.nombres === 'string' && typeof data.apellidos === 'string') {
          updated.nombres = String(data.nombres);
          updated.apellidos = String(data.apellidos);
          fieldsToUpdate.add('nombres');
          fieldsToUpdate.add('apellidos');
        } else if (tipoEntidad === 'PERSONA_JURIDICA' && typeof data.razonSocial === 'string') {
          updated.razonSocial = String(data.razonSocial);
          fieldsToUpdate.add('razonSocial');
          if (typeof data.direccion === 'string') {
            updated.direccion = String(data.direccion);
            fieldsToUpdate.add('direccion');
          }
        }
        
        return updated;
      });
      
      setAutocompletedFields(fieldsToUpdate);
      setLookupSuccess(`Datos encontrados en ${tipoEntidad === 'PERSONA_NATURAL' ? 'RENIEC' : 'SUNAT'}`);
      return;
    }

    setLookupLoading(true);
    setLookupSuccess(null);

    // Abort previous request
    if (lookupControllerRef.current) {
      try { lookupControllerRef.current.abort(); } catch {};
    }

    const controller = new AbortController();
    lookupControllerRef.current = controller;
    const signal = controller.signal;

    // timeout for the fetch
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const tipoEntidad = determinarTipoEntidad(numeroIdentificacion);

      // Use the clientes proxy which now mirrors proveedores behavior
      const endpoint = `/api/clientes/ruc?ruc=${numeroIdentificacion}`;

      const resp = await fetch(endpoint, { signal });
      clearTimeout(timeout);

      if (!isMountedRef.current) return;

      if (resp.ok) {
        const data = await resp.json();
        // Normalize the response which can be { success: true, data: {...} } or raw data
        const payload = (data && typeof data === 'object' && 'data' in data) ? (data.data as Record<string, unknown>) : (data as Record<string, unknown>);
        if (data.success === false) {
          showWarning('Datos no encontrados', `No se encontraron datos para este ${tipoEntidad === 'PERSONA_NATURAL' ? 'DNI' : 'RUC'}`);
        } else if (payload) {
          // cache the response
          lookupCacheRef.current.set(numeroIdentificacion, { tipoEntidad, data: payload, ts: Date.now() });

          const fieldsToUpdate = new Set<string>();
          const isDNI = tipoEntidad === 'PERSONA_NATURAL';
          
          // Actualizar formData directamente
          setFormData(prev => {
            const updated = { ...prev };
            
            if (isDNI && payload['nombres'] && payload['apellidos']) {
              updated.nombres = String(payload['nombres']);
              updated.apellidos = String(payload['apellidos']);
              fieldsToUpdate.add('nombres');
              fieldsToUpdate.add('apellidos');
            } else if (!isDNI && payload['razonSocial']) {
              updated.razonSocial = String(payload['razonSocial']);
              fieldsToUpdate.add('razonSocial');
              if (payload['direccion']) {
                updated.direccion = String(payload['direccion']);
                fieldsToUpdate.add('direccion');
              }
            }
            
            return updated;
          });

          setAutocompletedFields(fieldsToUpdate);
          setLookupSuccess(`Datos encontrados en ${isDNI ? 'RENIEC' : 'SUNAT'}`);
        } else {
          showWarning('Datos no encontrados', `No se encontraron datos en ${tipoEntidad === 'PERSONA_NATURAL' ? 'RENIEC' : 'SUNAT'} para este ${tipoEntidad === 'PERSONA_NATURAL' ? 'DNI' : 'RUC'}`);
        }
      } else {
        showWarning('Error de consulta', 'No se pudieron consultar los datos externos.');
      }
    } catch (error) {
      const err = error as unknown as { name?: string };
      if (err?.name === 'AbortError') {
        // ignore aborts
      } else {
        console.error('Error al buscar datos externos:', error);
        showWarning(
          'Error de consulta',
          'No se pudieron consultar los datos externos. Puede continuar ingresando los datos manualmente.'
        );
      }
    } finally {
      if (isMountedRef.current) setLookupLoading(false);
      lookupControllerRef.current = null;
    }
  };

  // Manejar cambio en número de identificación
  const handleNumeroIdentificacionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, '').slice(0, 11);
    
    // Limpiar datos autocompletados cuando el usuario modifica el campo
    if (valor !== formData.numeroIdentificacion) {
      setAutocompletedFields(new Set());
      setLookupSuccess(null);
    }
    
    // Actualizar formData directamente
    setFormData(prev => ({ ...prev, numeroIdentificacion: valor }));
    actualizarTipoEntidad(valor);
    
    // Validar en tiempo real
    const error = validateField('numeroIdentificacion', valor, formData);
    if (error) {
      clearFieldError('numeroIdentificacion');
    }
    
    // Buscar datos externos con debounce
    // Cancel previous debounce and any in-flight lookup
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (lookupControllerRef.current) {
      try { lookupControllerRef.current.abort(); } catch {};
      lookupControllerRef.current = null;
    }

    if (valor.length === 8 || valor.length === 11) {
      debounceTimeoutRef.current = setTimeout(() => {
        buscarDatosExternos(valor);
      }, 600);
    } else {
      // If input becomes invalid length, clear lookup indicators
      setAutocompletedFields(new Set());
      setLookupSuccess(null);
    }
  };

  // Manejar envío del formulario
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Verificar autenticación
    if (status === 'unauthenticated') {
      showError('Sesión expirada', 'Por favor, inicia sesión nuevamente.');
      return;
    }
    
    if (status === 'loading') {
      showWarning('Verificando sesión', 'Por favor, espere...');
      return;
    }
    
    setIsSubmitting(true);
    clearErrors();
    
    try {
      // Validar formulario
      const validation = await validateAsync(formData, initialData?.id);
      
      if (!validation.isValid) {
        showError(
          'Errores en el formulario',
          'Por favor corrija los errores antes de continuar'
        );
        return;
      }
      
      // Transformar datos para el API
      const payload = clienteFormDataToPayload(formData);
      
      // Crear o actualizar cliente
      let cliente: ClientePayload;
      
      if (mode === 'create') {
        cliente = await clientesActions.createCliente(payload);
        showSuccess(
          'Cliente creado',
          `El cliente ${cliente.nombre} ha sido creado exitosamente`
        );
      } else {
        if (!initialData?.id) {
          throw new Error('ID de cliente requerido para edición');
        }
        cliente = await clientesActions.updateCliente(initialData.id, payload);
        showSuccess(
          'Cliente actualizado',
          `El cliente ${cliente.nombre} ha sido actualizado exitosamente`
        );
      }
      
      // Callback de éxito
      if (onSuccess) {
        onSuccess(cliente);
      }
      
      // Limpiar formulario si es creación
      if (mode === 'create') {
        setFormData({
          tipoEntidad: 'PERSONA_JURIDICA',
          numeroIdentificacion: '',
          nombres: '',
          apellidos: '',
          razonSocial: '',
          telefono: '',
          email: '',
          direccion: '',
          contacto: '',
          tipoCliente: 'MINORISTA',
          activo: true,
          mensajePersonalizado: '',
        });
        setIsDirty(false);
        setAutocompletedFields(new Set());
        setLookupSuccess(null);
      }

      // Emitir evento global para que selects abiertos se sincronicen
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('entity:created', { detail: { type: 'cliente', id: String(cliente.id ?? '') } }));
        }
      } catch (err) {
        // noop
      }
      
    } catch (error) {
      console.error('Error al enviar formulario:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(
        `Error al ${mode === 'create' ? 'crear' : 'actualizar'} cliente`,
        errorMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    status,
    formData,
    initialData,
    mode,
    validateAsync,
    clientesActions,
    onSuccess,
    showSuccess,
    showError,
    showWarning,
    clearErrors
  ]);

  // Función para obtener clases CSS de campo con error
  const getFieldClasses = useCallback((field: string, baseClasses: string = '') => {
    const hasError = hasFieldError(field);
    const isAutocompleted = autocompletedFields.has(field);
    
    return `${baseClasses} ${
      hasError
        ? 'border-red-500 bg-red-50 focus:ring-red-500'
        : isAutocompleted
        ? 'border-green-500 bg-green-50 focus:ring-green-500'
        : 'border-gray-300 focus:ring-blue-500'
    } ${lookupLoading ? 'bg-gray-100' : ''}`;
  }, [hasFieldError, autocompletedFields, lookupLoading]);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {formData.tipoEntidad === 'PERSONA_NATURAL' ? (
                <User className="w-5 h-5 text-blue-600" />
              ) : (
                <Building2 className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {mode === 'create' ? 'Nuevo Cliente' : 'Editar Cliente'}
              </h2>
              <p className="text-sm text-gray-500">
                {formData.tipoEntidad === 'PERSONA_NATURAL' ? 'Persona Natural' : 'Persona Jurídica'}
              </p>
            </div>
          </div>
          
          {/* Indicadores de estado */}
          <div className="flex items-center space-x-2">
            {lookupLoading && (
              <div className="flex items-center space-x-2 text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Consultando...</span>
              </div>
            )}
            
            {lookupSuccess && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">{lookupSuccess}</span>
              </div>
            )}
            
            {isDirty && (
              <div className="flex items-center space-x-2 text-orange-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Sin guardar</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Tipo de Entidad */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Entidad *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateFormField('tipoEntidad', 'PERSONA_NATURAL')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  formData.tipoEntidad === 'PERSONA_NATURAL'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={lookupLoading}
              >
                <User className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs font-medium">Persona Natural</div>
              </button>
              <button
                type="button"
                onClick={() => updateFormField('tipoEntidad', 'PERSONA_JURIDICA')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  formData.tipoEntidad === 'PERSONA_JURIDICA'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={lookupLoading}
              >
                <Building2 className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs font-medium">Persona Jurídica</div>
              </button>
            </div>
          </div>

          {/* Número de Identificación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.tipoEntidad === 'PERSONA_NATURAL' ? 'DNI' : 'RUC'} *
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.numeroIdentificacion}
                onChange={handleNumeroIdentificacionChange}
                placeholder={formData.tipoEntidad === 'PERSONA_NATURAL' ? '12345678' : '12345678901'}
                maxLength={formData.tipoEntidad === 'PERSONA_NATURAL' ? 8 : 11}
                disabled={lookupLoading}
                className={getFieldClasses(
                  'numeroIdentificacion',
                  'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2'
                )}
              />
              {lookupLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                </div>
              )}
            </div>
            {getFieldError('numeroIdentificacion') && (
              <p className="text-red-500 text-sm mt-1">{getFieldError('numeroIdentificacion')}</p>
            )}
          </div>
        </div>

        {/* Campos específicos por tipo de entidad */}
        {formData.tipoEntidad === 'PERSONA_NATURAL' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombres *
              </label>
              <input
                type="text"
                value={formData.nombres}
                onChange={(e) => updateFormField('nombres', e.target.value)}
                placeholder="Juan Carlos"
                disabled={lookupLoading}
                className={getFieldClasses(
                  'nombres',
                  'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2'
                )}
              />
              {getFieldError('nombres') && (
                <p className="text-red-500 text-sm mt-1">{getFieldError('nombres')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apellidos *
              </label>
              <input
                type="text"
                value={formData.apellidos}
                onChange={(e) => updateFormField('apellidos', e.target.value)}
                placeholder="Pérez García"
                disabled={lookupLoading}
                className={getFieldClasses(
                  'apellidos',
                  'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2'
                )}
              />
              {getFieldError('apellidos') && (
                <p className="text-red-500 text-sm mt-1">{getFieldError('apellidos')}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Razón Social *
              </label>
              <input
                type="text"
                value={formData.razonSocial}
                onChange={(e) => updateFormField('razonSocial', e.target.value)}
                placeholder="Empresa S.A.C."
                disabled={lookupLoading}
                className={getFieldClasses(
                  'razonSocial',
                  'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2'
                )}
              />
              {getFieldError('razonSocial') && (
                <p className="text-red-500 text-sm mt-1">{getFieldError('razonSocial')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Persona de Contacto
              </label>
              <input
                type="text"
                value={formData.contacto}
                onChange={(e) => updateFormField('contacto', e.target.value)}
                placeholder="Nombre del contacto"
                disabled={lookupLoading}
                className={getFieldClasses(
                  'contacto',
                  'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2'
                )}
              />
              {getFieldError('contacto') && (
                <p className="text-red-500 text-sm mt-1">{getFieldError('contacto')}</p>
              )}
            </div>
          </div>
        )}

        {/* Información de contacto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => updateFormField('telefono', e.target.value)}
              placeholder="999 999 999"
              disabled={lookupLoading}
              className={getFieldClasses(
                'telefono',
                'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2'
              )}
            />
            {getFieldError('telefono') && (
              <p className="text-red-500 text-sm mt-1">{getFieldError('telefono')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateFormField('email', e.target.value)}
              placeholder="cliente@email.com"
              disabled={lookupLoading}
              className={getFieldClasses(
                'email',
                'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2'
              )}
            />
            {getFieldError('email') && (
              <p className="text-red-500 text-sm mt-1">{getFieldError('email')}</p>
            )}
          </div>
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Dirección
          </label>
          <input
            type="text"
            value={formData.direccion}
            onChange={(e) => updateFormField('direccion', e.target.value)}
            placeholder="Av. Principal 123, Distrito, Ciudad"
            disabled={lookupLoading}
            className={getFieldClasses(
              'direccion',
              'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2'
            )}
          />
          {getFieldError('direccion') && (
            <p className="text-red-500 text-sm mt-1">{getFieldError('direccion')}</p>
          )}
        </div>

  {/* Tipo de Cliente removed per UX requirement */}

        {/* Mensaje personalizado (siempre visible; sin icono) */}
        <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mensaje Personalizado</label>
            <textarea
              value={formData.mensajePersonalizado || ''}
              onChange={(e) => updateFormField('mensajePersonalizado', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Mensaje personalizado para incluir en los correos..."
            />
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <X className="w-4 h-4 inline mr-2" />
              Cancelar
            </button>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting || lookupLoading || isValidating}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{mode === 'create' ? 'Creando...' : 'Actualizando...'}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{mode === 'create' ? 'Crear Cliente' : 'Actualizar Cliente'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}