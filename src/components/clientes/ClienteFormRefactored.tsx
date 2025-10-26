"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  TipoEntidad, 
  TipoCliente,
  ClienteFormData, 
  ClientePayload, 
  clienteFormDataToPayload, 
  clientePayloadToFormData,
  determinarTipoEntidad,
  validarNumeroIdentificacion
} from "../../types/cliente";
import { 
  validateClienteForm, 
  validateClienteByTipo 
} from "../../schemas/cliente";
import { VALIDATION_CONSTANTS } from "../../constants/validation";

interface ClienteFormRefactoredProps {
  initialData?: ClientePayload;
  onCancel: () => void;
  onSave: (created: ClientePayload) => void;
}

export default function ClienteFormRefactored({
  initialData,
  onCancel,
  onSave,
}: ClienteFormRefactoredProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Estado unificado del formulario usando la nueva estructura
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

  // Estados de validación y UI
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupSuccess, setLookupSuccess] = useState<string | null>(null);
  const [autocompletedFields, setAutocompletedFields] = useState<Set<string>>(new Set());
  
  // Refs para manejo de timeouts
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup del componente
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Función para determinar automáticamente el tipo de entidad
  const actualizarTipoEntidad = useCallback((numeroIdentificacion: string) => {
    const tipoDetectado = determinarTipoEntidad(numeroIdentificacion);
    if (tipoDetectado && tipoDetectado !== formData.tipoEntidad) {
      setFormData(prev => ({
        ...prev,
        tipoEntidad: tipoDetectado,
        // Limpiar campos del tipo anterior
        nombres: tipoDetectado === 'PERSONA_JURIDICA' ? '' : prev.nombres,
        apellidos: tipoDetectado === 'PERSONA_JURIDICA' ? '' : prev.apellidos,
        razonSocial: tipoDetectado === 'PERSONA_NATURAL' ? '' : prev.razonSocial,
      }));
    }
  }, [formData.tipoEntidad]);

  // Función para validar número de identificación con debounce
  const validateIdentificationNumber = useCallback((value: string) => {
    // Limpiar timeout anterior
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Validación inmediata de formato
    const tipoDetectado = determinarTipoEntidad(value);
    const isValid = validarNumeroIdentificacion(value, tipoDetectado);
    if (!isValid && value.length > 0) {
      setValidationErrors(prev => ({
        ...prev,
        numeroIdentificacion: `Número de identificación inválido para ${tipoDetectado === 'PERSONA_NATURAL' ? 'DNI' : 'RUC'}`
      }));
      return;
    }

    // Limpiar error si es válido o está vacío
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.numeroIdentificacion;
      return newErrors;
    });

    // Si el número está completo, hacer consulta API con debounce
    const longitudCompleta = (tipoDetectado === 'PERSONA_NATURAL' && value.length === 8) ||
                            (tipoDetectado === 'PERSONA_JURIDICA' && value.length === 11);

    if (longitudCompleta) {
      debounceTimeoutRef.current = setTimeout(() => {
        consultarAPI(value);
      }, 800);
    }
  }, []);

  // Función para consultar API de RUC/DNI
  const consultarAPI = async (numeroIdentificacion: string) => {
    if (!numeroIdentificacion || numeroIdentificacion.length < 8) {
      return;
    }

    setLookupLoading(true);
    setLookupError(null);
    setLookupSuccess(null);

    try {
      const response = await fetch(`/api/clientes/ruc?ruc=${numeroIdentificacion}`);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const data = result.data;
        const newAutocompletedFields = new Set<string>();
        
        if (data.esPersonaNatural || numeroIdentificacion.length === 8) {
          // Persona Natural (DNI)
          const nombres = data.nombres || '';
          const apellidos = data.apellidos || '';
          const direccion = data.direccion || '';

          setFormData(prev => ({
            ...prev,
            tipoEntidad: 'PERSONA_NATURAL',
            nombres,
            apellidos,
            direccion: direccion || prev.direccion,
            razonSocial: ''
          }));

          if (nombres) newAutocompletedFields.add('nombres');
          if (apellidos) newAutocompletedFields.add('apellidos');
          if (direccion) newAutocompletedFields.add('direccion');
          
          setLookupSuccess('Datos autocompletados desde RENIEC');
        } else {
          // Persona Jurídica (RUC)
          const razonSocial = data.razonSocial || '';
          const direccion = data.direccion || '';

          setFormData(prev => ({
            ...prev,
            tipoEntidad: 'PERSONA_JURIDICA',
            razonSocial,
            direccion: direccion || prev.direccion,
            nombres: '',
            apellidos: ''
          }));

          if (razonSocial) newAutocompletedFields.add('razonSocial');
          if (direccion) newAutocompletedFields.add('direccion');
          
          if (data.esActivo === false) {
            setLookupError(`⚠️ RUC inactivo: ${data.estado || 'Estado desconocido'}. Verifique antes de continuar.`);
            setLookupSuccess('Datos autocompletados desde SUNAT (RUC INACTIVO)');
          } else {
            setLookupSuccess('Datos autocompletados desde SUNAT');
          }
        }

        setAutocompletedFields(newAutocompletedFields);
      } else {
        const errorMsg = result.error || 'No se encontraron datos para este número';
        const tipoDoc = numeroIdentificacion.length === 8 ? 'DNI' : 'RUC';
        const fuente = numeroIdentificacion.length === 8 ? 'RENIEC' : 'SUNAT';
        setLookupError(`${tipoDoc} no encontrado en ${fuente}: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error al consultar API:', error);
      const tipoDoc = numeroIdentificacion.length === 8 ? 'DNI' : 'RUC';
      const fuente = numeroIdentificacion.length === 8 ? 'RENIEC' : 'SUNAT';
      setLookupError(`Error al consultar ${fuente}. Verifique su conexión e intente nuevamente.`);
    } finally {
      setLookupLoading(false);
    }
  };

  // Manejar cambio en número de identificación
  const handleNumeroIdentificacionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, '').slice(0, 11); // Solo números, máximo 11
    
    // Limpiar datos autocompletados cuando el usuario modifica el campo
    if (valor !== formData.numeroIdentificacion) {
      setAutocompletedFields(new Set());
      setLookupSuccess(null);
      setLookupError(null);
    }
    
    setFormData(prev => ({ 
      ...prev, 
      numeroIdentificacion: valor
    }));
    
    // Actualizar tipo de entidad automáticamente
    actualizarTipoEntidad(valor);
    
    // Validar número
    validateIdentificationNumber(valor);
  }, [formData.numeroIdentificacion, actualizarTipoEntidad, validateIdentificationNumber]);

  // Validación del formulario completo
  const validarFormulario = useCallback(() => {
    const validation = validateClienteByTipo(formData, formData.tipoEntidad);
    
    if (!validation.success) {
      const errors: {[key: string]: string} = {};
      validation.error.issues.forEach(issue => {
        const field = issue.path[0] as string;
        errors[field] = issue.message;
      });
      setValidationErrors(errors);
      return false;
    }
    
    setValidationErrors({});
    return true;
  }, [formData]);

  // Verificar autenticación
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      setLookupError("Sesión expirada. Por favor, inicia sesión nuevamente.");
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  }, [status, router]);

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setValidationErrors({});
    setLookupError(null);
    
    try {
      // Validar formulario
      if (!validarFormulario()) {
        setLookupError('Por favor corrija los errores en el formulario antes de continuar');
        return;
      }
      
      // Verificar autenticación
      if (status === 'unauthenticated') {
        setLookupError("Sesión expirada. Por favor, inicia sesión nuevamente.");
        return;
      }
      
      if (status === 'loading') {
        setLookupError("Verificando sesión...");
        return;
      }
      
      // Transformar datos del formulario al formato del API
      const payload = clienteFormDataToPayload(formData);
      
      // Determinar si es creación o actualización
      const isEditing = initialData && initialData.id;
      const url = isEditing ? `/api/clientes/${initialData.id}` : "/api/clientes";
      const method = isEditing ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        const errorMessage = errorData.error || errorData.message || `Error al ${isEditing ? 'actualizar' : 'crear'} el cliente`;
        
        if (res.status === 400) {
          setLookupError(`Datos inválidos: ${errorMessage}`);
        } else if (res.status === 404 && isEditing) {
          setLookupError('El cliente que intenta actualizar no existe o ha sido eliminado.');
        } else if (res.status === 409) {
          setLookupError(`Ya existe un cliente con estos datos: ${errorMessage}`);
        } else if (res.status === 500) {
          setLookupError('Error interno del servidor. Por favor, intente nuevamente.');
        } else {
          setLookupError(`Error ${res.status}: ${errorMessage}`);
        }
        return;
      }
      
      const result = await res.json();
      onSave(result);
      
    } catch (error) {
      console.error('Error al enviar formulario:', error);
      setLookupError('Error de conexión. Por favor, intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper para obtener error de un campo específico
  const obtenerErrorCampo = (campo: string): string | undefined => {
    return validationErrors[campo];
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">
          {initialData ? 'Editar Cliente' : 'Crear Nuevo Cliente'}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {initialData ? 'Modifica los datos del cliente seleccionado' : 'Completa los datos para crear un nuevo cliente'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Número de Identificación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            RUC/DNI *
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.numeroIdentificacion}
              onChange={handleNumeroIdentificacionChange}
              placeholder="DNI (8 dígitos) o RUC (11 dígitos)"
              disabled={lookupLoading}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                obtenerErrorCampo('numeroIdentificacion')
                  ? 'border-red-500 bg-red-50 focus:ring-red-500'
                  : lookupSuccess
                  ? 'border-green-500 bg-green-50 focus:ring-green-500'
                  : 'border-gray-300 focus:ring-blue-500'
              } ${lookupLoading ? 'bg-gray-100' : ''}`}
            />
            
            {/* Indicador de carga */}
            {lookupLoading && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>
          
          {/* Mensajes de estado */}
          {obtenerErrorCampo('numeroIdentificacion') && (
            <p className="text-red-500 text-sm mt-1">{obtenerErrorCampo('numeroIdentificacion')}</p>
          )}
          {lookupLoading && (
            <p className="mt-1 text-sm text-blue-600 flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Consultando datos...
            </p>
          )}
          {lookupError && (
            <p className="mt-1 text-sm text-red-600">{lookupError}</p>
          )}
          {lookupSuccess && (
            <p className="mt-1 text-sm text-green-600">
              ✓ {lookupSuccess}
            </p>
          )}
        </div>

        {/* Campos específicos según tipo de entidad */}
        {formData.tipoEntidad === 'PERSONA_NATURAL' ? (
          <>
            {/* Nombres y Apellidos para Persona Natural */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombres *
                  {autocompletedFields.has('nombres') && (
                    <span className="ml-2 text-xs text-blue-600 font-normal">
                      (Autocompletado desde RENIEC)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.nombres}
                    onChange={(e) => {
                      if (!autocompletedFields.has('nombres')) {
                        setFormData(prev => ({ ...prev, nombres: e.target.value }));
                      }
                    }}
                    placeholder="Nombres completos"
                    readOnly={autocompletedFields.has('nombres')}
                    disabled={lookupLoading}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      obtenerErrorCampo('nombres')
                        ? 'border-red-500 bg-red-50 focus:ring-red-500'
                        : autocompletedFields.has('nombres')
                        ? 'border-blue-500 bg-blue-50 cursor-not-allowed focus:ring-blue-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    title={autocompletedFields.has('nombres') ? 'Este campo se autocompletó desde RENIEC y no puede ser editado' : ''}
                  />
                  {autocompletedFields.has('nombres') && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                </div>
                {obtenerErrorCampo('nombres') && (
                  <p className="text-red-500 text-sm mt-1">{obtenerErrorCampo('nombres')}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apellidos *
                  {autocompletedFields.has('apellidos') && (
                    <span className="ml-2 text-xs text-blue-600 font-normal">
                      (Autocompletado desde RENIEC)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.apellidos}
                    onChange={(e) => {
                      if (!autocompletedFields.has('apellidos')) {
                        setFormData(prev => ({ ...prev, apellidos: e.target.value }));
                      }
                    }}
                    placeholder="Apellidos completos"
                    readOnly={autocompletedFields.has('apellidos')}
                    disabled={lookupLoading}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      obtenerErrorCampo('apellidos')
                        ? 'border-red-500 bg-red-50 focus:ring-red-500'
                        : autocompletedFields.has('apellidos')
                        ? 'border-blue-500 bg-blue-50 cursor-not-allowed focus:ring-blue-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    title={autocompletedFields.has('apellidos') ? 'Este campo se autocompletó desde RENIEC y no puede ser editado' : ''}
                  />
                  {autocompletedFields.has('apellidos') && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                </div>
                {obtenerErrorCampo('apellidos') && (
                  <p className="text-red-500 text-sm mt-1">{obtenerErrorCampo('apellidos')}</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Razón Social para Persona Jurídica */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la Empresa *
                {autocompletedFields.has('razonSocial') && (
                  <span className="ml-2 text-xs text-blue-600 font-normal">
                    (Autocompletado desde SUNAT)
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.razonSocial}
                  onChange={(e) => {
                    if (!autocompletedFields.has('razonSocial')) {
                      setFormData(prev => ({ ...prev, razonSocial: e.target.value }));
                    }
                  }}
                  placeholder="Se autocompletará con el RUC"
                  readOnly={autocompletedFields.has('razonSocial')}
                  disabled={lookupLoading}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    obtenerErrorCampo('razonSocial')
                      ? 'border-red-500 bg-red-50 focus:ring-red-500'
                      : autocompletedFields.has('razonSocial')
                      ? 'border-blue-500 bg-blue-50 cursor-not-allowed focus:ring-blue-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  title={autocompletedFields.has('razonSocial') ? 'Este campo se autocompletó desde SUNAT y no puede ser editado' : ''}
                />
                {autocompletedFields.has('razonSocial') && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
              </div>
              {obtenerErrorCampo('razonSocial') && (
                <p className="text-red-500 text-sm mt-1">{obtenerErrorCampo('razonSocial')}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                El nombre debe tener al menos 3 caracteres
              </p>
            </div>
          </>
        )}

        {/* Dirección */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dirección *
            {autocompletedFields.has('direccion') && (
              <span className="ml-2 text-xs text-blue-600 font-normal">
                (Autocompletado desde {formData.tipoEntidad === 'PERSONA_NATURAL' ? 'RENIEC' : 'SUNAT'})
              </span>
            )}
          </label>
          <input
            type="text"
            value={formData.direccion}
            onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
            placeholder="Se autocompletará con el RUC"
            maxLength={200}
            disabled={lookupLoading}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              obtenerErrorCampo('direccion') 
                ? 'border-red-500 bg-red-50 focus:ring-red-500' 
                : autocompletedFields.has('direccion')
                ? 'border-green-500 bg-green-50 focus:ring-green-500'
                : 'border-gray-300 focus:ring-blue-500'
            } ${lookupLoading ? 'bg-gray-100' : ''}`}
          />
          {obtenerErrorCampo('direccion') && (
            <p className="mt-1 text-sm text-red-600">{obtenerErrorCampo('direccion')}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            La dirección debe tener al menos 10 caracteres
          </p>
        </div>

        {/* Información Adicional (Opcional) */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Información Adicional (Opcional)</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Persona de Contacto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Persona de Contacto
              </label>
              <input
                type="text"
                value={formData.contacto}
                onChange={(e) => setFormData(prev => ({ ...prev, contacto: e.target.value }))}
                placeholder="Nombre del contacto"
                disabled={lookupLoading}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  obtenerErrorCampo('contacto')
                    ? 'border-red-500 bg-red-50 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                } ${lookupLoading ? 'bg-gray-100' : ''}`}
              />
              {obtenerErrorCampo('contacto') && (
                <p className="text-red-500 text-sm mt-1">{obtenerErrorCampo('contacto')}</p>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                placeholder="+51 123 456 789"
                disabled={lookupLoading}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  obtenerErrorCampo('telefono')
                    ? 'border-red-500 bg-red-50 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                } ${lookupLoading ? 'bg-gray-100' : ''}`}
              />
              {obtenerErrorCampo('telefono') && (
                <p className="text-red-500 text-sm mt-1">{obtenerErrorCampo('telefono')}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="correo@empresa.com"
              disabled={lookupLoading}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                obtenerErrorCampo('email')
                  ? 'border-red-500 bg-red-50 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              } ${lookupLoading ? 'bg-gray-100' : ''}`}
            />
            {obtenerErrorCampo('email') && (
              <p className="text-red-500 text-sm mt-1">{obtenerErrorCampo('email')}</p>
            )}
          </div>

          {/* Mensaje Personalizado para Correos */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensaje Personalizado para Correos
            </label>
            <textarea
              value={formData.mensajePersonalizado}
              onChange={(e) => setFormData(prev => ({ ...prev, mensajePersonalizado: e.target.value }))}
              placeholder="Mensaje personalizado para incluir en los correos..."
              rows={3}
              disabled={lookupLoading}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                obtenerErrorCampo('mensajePersonalizado')
                  ? 'border-red-500 bg-red-50 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              } ${lookupLoading ? 'bg-gray-100' : ''}`}
            />
            {obtenerErrorCampo('mensajePersonalizado') && (
              <p className="text-red-500 text-sm mt-1">{obtenerErrorCampo('mensajePersonalizado')}</p>
            )}
          </div>

          {/* Tipo de Cliente y Estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Tipo de Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Cliente
              </label>
              <select
                value={formData.tipoCliente}
                onChange={(e) => setFormData(prev => ({ ...prev, tipoCliente: e.target.value as TipoCliente }))}
                disabled={lookupLoading}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  obtenerErrorCampo('tipoCliente')
                    ? 'border-red-500 bg-red-50 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                } ${lookupLoading ? 'bg-gray-100' : ''}`}
              >
                <option value="REGULAR">Regular</option>
                <option value="VIP">VIP</option>
                <option value="MAYORISTA">Mayorista</option>
              </select>
              {obtenerErrorCampo('tipoCliente') && (
                <p className="text-red-500 text-sm mt-1">{obtenerErrorCampo('tipoCliente')}</p>
              )}
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <div className="flex items-center space-x-3 pt-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="activo"
                    checked={formData.activo === true}
                    onChange={() => setFormData(prev => ({ ...prev, activo: true }))}
                    disabled={lookupLoading}
                    className="mr-2 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-green-600 font-medium">Activo</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="activo"
                    checked={formData.activo === false}
                    onChange={() => setFormData(prev => ({ ...prev, activo: false }))}
                    disabled={lookupLoading}
                    className="mr-2 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-red-600 font-medium">Inactivo</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || lookupLoading}
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {initialData ? 'Actualizando...' : 'Creando...'}
              </>
            ) : (
              initialData ? 'Actualizar Cliente' : 'Crear Cliente'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}