"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, User, Building2, Loader2, Check, AlertCircle, CheckCircle } from "lucide-react";

// Tipos para respuesta del proxy
interface ProxyResponse {
  success: boolean;
  data?: {
    nombres?: string;
    apellidos?: string;
    razonSocial?: string;
    direccion?: string;
  };
  error?: string;
}

// Tipos para el formulario
interface ClienteFormData {
  tipoIdentificacion: 'DNI' | 'RUC';
  numeroIdentificacion: string;
  nombres?: string;
  apellidos?: string;
  razonSocial?: string;
  representanteLegal?: string;
  telefono?: string;
  email?: string;
  direccion: string; // Obligatorio
  mensajePersonalizado?: string;
}

interface NewClientFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function NewClientForm({ onSuccess, onCancel }: NewClientFormProps) {
  const { data: session } = useSession();
  const router = useRouter();

  // Estados del formulario
  const [formData, setFormData] = useState<ClienteFormData>({
    tipoIdentificacion: 'DNI',
    numeroIdentificacion: '',
    nombres: '',
    apellidos: '',
    razonSocial: '',
    representanteLegal: '',
    telefono: '',
    email: '',
    direccion: '',
    mensajePersonalizado: ''
  });

  // Estados de autocompletado
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lookupError, setLookupError] = useState('');
  const [autocompletedFields, setAutocompletedFields] = useState<Set<string>>(new Set());
  const [lookupSource, setLookupSource] = useState('');

  // Estados de envío
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  // Agregar estado para éxito de envío
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Estados de validación
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Referencia para debounce
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Cache para resultados de búsqueda
  const cacheRef = useRef<Map<string, ProxyResponse>>(new Map());

  // Limpiar debounce al desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Validar campos en tiempo real
  const validateField = useCallback((field: string, value: any) => {
    const errors: Record<string, string> = {};

    switch (field) {
      case 'numeroIdentificacion':
        // Validar según el valor actual, no según el estado previo
        // Si tiene 9+ dígitos, tratamos como RUC; si no, como DNI
        {
          const strVal = String(value || '').replace(/[^0-9]/g, '');
          const computedType: 'DNI' | 'RUC' = strVal.length >= 9 ? 'RUC' : 'DNI';
          if (!strVal || strVal.trim() === '') {
            errors[field] = 'El número de identificación es obligatorio';
          } else if (computedType === 'DNI' && !/^\d{8}$/.test(strVal)) {
            errors[field] = 'El DNI debe tener exactamente 8 dígitos';
          } else if (computedType === 'RUC' && !/^\d{11}$/.test(strVal)) {
            errors[field] = 'El RUC debe tener exactamente 11 dígitos';
          }
        }
        break;

      case 'nombres':
        if (formData.tipoIdentificacion === 'DNI') {
          if (!value || String(value).trim().length < 2) {
            errors[field] = 'Los nombres son obligatorios para personas naturales';
          } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(String(value).trim())) {
            errors[field] = 'Los nombres solo pueden contener letras y espacios';
          }
        }
        break;

      case 'apellidos':
        if (formData.tipoIdentificacion === 'DNI') {
          if (!value || String(value).trim().length < 2) {
            errors[field] = 'Los apellidos son obligatorios para personas naturales';
          } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(String(value).trim())) {
            errors[field] = 'Los apellidos solo pueden contener letras y espacios';
          }
        }
        break;

      case 'razonSocial':
        if (formData.tipoIdentificacion === 'RUC') {
          if (!value || String(value).trim().length < 3) {
            errors[field] = 'La razón social es obligatoria para personas jurídicas';
          } else if (String(value).trim().length > 100) {
            errors[field] = 'La razón social no puede exceder 100 caracteres';
          }
        }
        break;

      case 'representanteLegal':
        if (value && String(value).trim() !== '') {
          if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(String(value).trim())) {
            errors[field] = 'El representante legal solo puede contener letras y espacios';
          } else if (String(value).trim().length > 50) {
            errors[field] = 'El representante legal no puede exceder 50 caracteres';
          }
        }
        break;

      case 'direccion':
        if (!value || String(value).trim().length < 10) {
          errors[field] = 'La dirección es obligatoria y debe tener al menos 10 caracteres';
        } else if (String(value).trim().length > 200) {
          errors[field] = 'La dirección no puede exceder 200 caracteres';
        }
        break;

      case 'email':
        if (value && String(value).trim() !== '') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(value))) {
            errors[field] = 'El formato del email no es válido';
          } else if (String(value).length > 100) {
            errors[field] = 'El email no puede exceder 100 caracteres';
          }
        }
        break;

      case 'telefono':
        if (value && String(value).trim() !== '') {
          const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,15}$/;
          if (!phoneRegex.test(String(value))) {
            errors[field] = 'El formato del teléfono no es válido (ej: +51 123 456 789)';
          }
        }
        break;

      case 'mensajePersonalizado':
        if (value && String(value).trim() !== '') {
          if (String(value).trim().length > 500) {
            errors[field] = 'El mensaje personalizado no puede exceder 500 caracteres';
          }
        }
        break;
    }

    setFieldErrors(prev => {
      const newErrors = { ...prev, ...errors };
      if (Object.keys(errors).length === 0) {
        delete newErrors[field];
      }
      return newErrors;
    });

    return Object.keys(errors).length === 0;
  }, [formData.tipoIdentificacion]);

  // Manejar cambio en número de identificación con debounce y auto detección de tipo
  const handleIdentificationChange = useCallback((rawValue: string) => {
    // Limpiar timeout anterior
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Normalizar: solo dígitos, hasta 11
    const value = rawValue.replace(/[^0-9]/g, '').slice(0, 11);

    // Auto-cambiar tipo según longitud
    const nextType: 'DNI' | 'RUC' = value.length >= 9 ? 'RUC' : 'DNI';
    setFormData(prev => ({ ...prev, numeroIdentificacion: value, tipoIdentificacion: nextType }));
    
    // Validar campo según tipo
    validateField('numeroIdentificacion', value);

    // Si el valor está vacío o es inválido, limpiar estados
    if (!value || value.trim() === '') {
      setLookupStatus('idle');
      setLookupError('');
      setAutocompletedFields(new Set());
      setLookupSource('');
      return;
    }

    // Verificar formato básico (permitir 8 o 11)
    const isValid = /^\d{8}$|^\d{11}$/.test(value);
    if (!isValid) {
      setLookupStatus('idle');
      setLookupError('');
      setAutocompletedFields(new Set());
      setLookupSource('');
      return;
    }

    // Configurar debounce para búsqueda
    debounceRef.current = setTimeout(() => {
      performLookup(value);
    }, 800);
  }, []);

  // Realizar búsqueda usando proxy unificado (RENIEC/SUNAT)
  const performLookup = useCallback(async (identification: string) => {
    try {
      setLookupStatus('loading');
      setLookupError('');

      // Verificar cache primero
      const cached = cacheRef.current.get(identification);
      if (cached) {
        applyLookupResult(cached, identification);
        return;
      }

      // Usar endpoint correcto para clientes (RUC/DNI)
      const endpoint = `/api/clientes/ruc?ruc=${identification}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      const result: any = await response.json().catch(() => ({ success: false, error: 'Respuesta inválida del servidor' }));

      if (!response.ok || result?.success === false) {
        const tipoDoc = identification.length === 8 ? 'DNI' : 'RUC';
        const fuente = identification.length === 8 ? 'RENIEC' : 'SUNAT';
        const msg = result?.error || `Error ${response.status} al consultar ${fuente}`;
        setLookupStatus('error');
        setLookupError(`${tipoDoc} no disponible: ${msg}`);
        return;
      }

      // Guardar en cache y aplicar resultado
      const data = result?.data || result;
      cacheRef.current.set(identification, data);
      applyLookupResult({ success: true, data }, identification);

    } catch (error) {
      console.error('Error en búsqueda de RUC/DNI:', error);
      setLookupStatus('error');
      const tipoDoc = identification.length === 8 ? 'DNI' : 'RUC';
      setLookupError(`Error de conexión al consultar ${tipoDoc}`);
    }
  }, []);

  // Aplicar resultado de búsqueda al formulario
  const applyLookupResult = useCallback((result: ProxyResponse, identification: string) => {
    if (!result.success || !result.data) {
      setLookupStatus('error');
      setLookupError(result.error || 'No se encontraron datos para este documento');
      return;
    }

    const { data } = result;
    const isDNI = identification.length === 8;
    const fieldsUpdated = new Set<string>();

    setFormData(prev => {
      const updated = { ...prev };

      if (isDNI) {
        // Para DNI (Persona Natural)
        const nombres = (data.nombres || '').trim();
        const apellidos = (data.apellidos || '').trim();
        if (nombres) {
          updated.nombres = nombres;
          fieldsUpdated.add('nombres');
        }
        if (apellidos) {
          updated.apellidos = apellidos;
          fieldsUpdated.add('apellidos');
        }
        // Limpiar campos de persona jurídica
        updated.razonSocial = '';
        updated.representanteLegal = '';
      } else {
        // Para RUC (Persona Jurídica)
        const razon = (data.razonSocial || '').trim();
        if (razon) {
          updated.razonSocial = razon;
          fieldsUpdated.add('razonSocial');
        }
        // Limpiar campos de persona natural
        updated.nombres = '';
        updated.apellidos = '';
      }

      // Dirección (común para ambos)
      if (data.direccion && data.direccion.trim()) {
        updated.direccion = data.direccion.trim();
        fieldsUpdated.add('direccion');
      }

      return updated;
    });

    setAutocompletedFields(fieldsUpdated);
    setLookupSource(isDNI ? 'RENIEC' : 'SUNAT');
    setLookupStatus('success');
    setLookupError('');
  }, []);

  // Manejar cambio de tipo de identificación manual
  const handleTipoIdentificacionChange = (tipo: 'DNI' | 'RUC') => {
    setFormData(prev => ({
      ...prev,
      tipoIdentificacion: tipo,
      numeroIdentificacion: '',
      nombres: '',
      apellidos: '',
      razonSocial: '',
      representanteLegal: ''
    }));
    setLookupStatus('idle');
    setLookupError('');
    setAutocompletedFields(new Set());
    setLookupSource('');
    setFieldErrors({});
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar todos los campos
    const fieldsToValidate = [
      'numeroIdentificacion',
      'direccion',
      'email',
      'telefono',
      'mensajePersonalizado'
    ];

    if (formData.tipoIdentificacion === 'DNI') {
      fieldsToValidate.push('nombres', 'apellidos');
    } else {
      fieldsToValidate.push('razonSocial', 'representanteLegal');
    }

    let hasErrors = false;
    const errorFields: string[] = [];
    
    fieldsToValidate.forEach(field => {
      const isValid = validateField(field, formData[field as keyof ClienteFormData]);
      if (!isValid) {
        hasErrors = true;
        errorFields.push(field);
      }
    });

    if (hasErrors) {
      const fieldNames: Record<string, string> = {
        numeroIdentificacion: formData.tipoIdentificacion,
        nombres: 'Nombres',
        apellidos: 'Apellidos',
        razonSocial: 'Razón Social',
        representanteLegal: 'Representante Legal',
        direccion: 'Dirección',
        email: 'Email',
        telefono: 'Teléfono',
        mensajePersonalizado: 'Mensaje Personalizado'
      };
      
      const errorFieldNames = errorFields.map(field => fieldNames[field]).filter(Boolean);
      const errorMessage = errorFieldNames.length === 1 
        ? `Por favor, corrija el error en el campo: ${errorFieldNames[0]}`
        : `Por favor, corrija los errores en los siguientes campos: ${errorFieldNames.join(', ')}`;
      
      setSubmitError(errorMessage);
      setSubmitSuccess('');
      
      // Scroll al primer campo con error
      const firstErrorField = document.querySelector('.border-red-500');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (firstErrorField as HTMLElement).focus();
      }
      
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');
      setSubmitSuccess('');

      // Preparar payload optimizado para la API
      const payload = {
        tipoEntidad: formData.tipoIdentificacion === 'DNI' ? 'PERSONA_NATURAL' : 'PERSONA_JURIDICA',
        tipoCliente: 'MINORISTA', // Valor por defecto
        numeroIdentificacion: formData.numeroIdentificacion.trim(),
        nombres: formData.nombres?.trim() || undefined,
        apellidos: formData.apellidos?.trim() || undefined,
        razonSocial: formData.razonSocial?.trim() || undefined,
        contacto: formData.representanteLegal?.trim() || undefined,
        telefono: formData.telefono?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        direccion: formData.direccion.trim(),
        mensajePersonalizado: formData.mensajePersonalizado?.trim() || undefined,
        // Campo calculado para compatibilidad con el backend
        nombre: formData.tipoIdentificacion === 'DNI' 
          ? `${formData.nombres?.trim()} ${formData.apellidos?.trim()}`.trim()
          : formData.razonSocial?.trim() || ''
      };

      // Validación adicional antes del envío
      if (payload.tipoEntidad === 'PERSONA_NATURAL') {
        if (!payload.nombres || !payload.apellidos) {
          throw new Error('Los nombres y apellidos son requeridos para personas naturales');
        }
      } else {
        if (!payload.razonSocial) {
          throw new Error('La razón social es requerida para personas jurídicas');
        }
      }

      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      let result: any = null;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('Error en la respuesta del servidor. Por favor, intente nuevamente.');
      }

      if (!response.ok) {
        // Manejo específico de errores del servidor
        if (response.status === 400) {
          const serverMessage = result?.error || result?.message || 'Datos inválidos';
          if (serverMessage.toLowerCase().includes('duplicado') || serverMessage.toLowerCase().includes('existe')) {
            throw new Error(`Ya existe un cliente con el ${formData.tipoIdentificacion} ${formData.numeroIdentificacion}`);
          } else if (result.details && Array.isArray(result.details)) {
            // Errores de validación del servidor (Zod)
            const validationMessages = result.details.map((detail: any) => detail.message).join(', ');
            throw new Error(`Errores de validación: ${validationMessages}`);
          } else if (serverMessage.toLowerCase().includes('validación')) {
            throw new Error('Los datos proporcionados no son válidos. Verifique la información e intente nuevamente.');
          } else {
            throw new Error(serverMessage);
          }
        } else if (response.status === 500) {
          throw new Error('Error interno del servidor. Por favor, contacte al administrador del sistema.');
        } else if (response.status === 403) {
          throw new Error('No tiene permisos para realizar esta acción.');
        } else if (response.status === 401) {
          throw new Error('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        } else {
          const serverMessage = result?.error || result?.message || response.statusText || 'Error desconocido';
          throw new Error(`Error del servidor (${response.status}): ${serverMessage}`);
        }
      }

      // Verificar que la respuesta sea exitosa
      if (!result.success) {
        throw new Error(result.error || 'Error al procesar la solicitud');
      }

      // Éxito
      const clienteName = formData.tipoIdentificacion === 'DNI' 
        ? `${formData.nombres} ${formData.apellidos}` 
        : formData.razonSocial;
      setSubmitSuccess(`¡Cliente ${clienteName} creado exitosamente!`);
      
      // Limpiar errores de validación
      setFieldErrors({});
      
      // Limpiar el formulario después de un breve delay para mostrar el mensaje
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          numeroIdentificacion: '',
          nombres: '',
          apellidos: '',
          razonSocial: '',
          representanteLegal: '',
          telefono: '',
          email: '',
          direccion: '',
          mensajePersonalizado: ''
        }));

        // Limpiar estados de autocompletado
        setAutocompletedFields(new Set());
        setLookupStatus('idle');
        setLookupError('');
        setLookupSource('');
        setSubmitSuccess('');

        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
      }, 2000);

    } catch (error) {
      console.error('Error al crear cliente:', error);
      let errorMessage = 'Error inesperado al crear el cliente. Por favor, intente nuevamente.';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Error de conexión. Por favor, verifique su conexión a internet e intente nuevamente.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setSubmitError(errorMessage);
      setSubmitSuccess('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">Crear Nuevo Cliente</h2>
        <p className="text-sm sm:text-base text-gray-600">
          Complete los datos para registrar un nuevo cliente con autocompletado desde RENIEC/SUNAT
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" role="form" aria-label="Formulario de creación de cliente">
        {/* Tipo de Identificación */}
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-3">
            Tipo de Identificación <span className="text-red-500" aria-label="campo requerido">*</span>
          </legend>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4" role="radiogroup" aria-labelledby="tipo-identificacion">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="tipoIdentificacion"
                value="DNI"
                checked={formData.tipoIdentificacion === 'DNI'}
                onChange={(e) => handleTipoIdentificacionChange(e.target.value as 'DNI' | 'RUC')}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                aria-describedby="dni-description"
              />
              <span className="ml-2 text-sm text-gray-700 flex items-center" id="dni-description">
                <User className="w-4 h-4 mr-1" aria-hidden="true" />
                DNI - Persona Natural
              </span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="tipoIdentificacion"
                value="RUC"
                checked={formData.tipoIdentificacion === 'RUC'}
                onChange={(e) => handleTipoIdentificacionChange(e.target.value as 'DNI' | 'RUC')}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                aria-describedby="ruc-description"
              />
              <span className="ml-2 text-sm text-gray-700 flex items-center" id="ruc-description">
                <Building2 className="w-4 h-4 mr-1" aria-hidden="true" />
                RUC - Persona Jurídica
              </span>
            </label>
          </div>
        </fieldset>

        {/* Número de Identificación */}
        <div>
          <label htmlFor="numeroIdentificacion" className="block text-sm font-medium text-gray-700 mb-2">
            {formData.tipoIdentificacion} <span className="text-red-500" aria-label="campo requerido">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="numeroIdentificacion"
              name="numeroIdentificacion"
              value={formData.numeroIdentificacion}
              onChange={(e) => handleIdentificationChange(e.target.value)}
              placeholder={formData.tipoIdentificacion === 'DNI' ? '12345678' : '20123456789'}
              className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                fieldErrors.numeroIdentificacion ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={11}
              aria-describedby={`${fieldErrors.numeroIdentificacion ? 'numeroIdentificacion-error' : ''} ${lookupError ? 'numeroIdentificacion-lookup-error' : ''} ${lookupStatus === 'success' && lookupSource ? 'numeroIdentificacion-success' : ''}`.trim()}
              aria-invalid={fieldErrors.numeroIdentificacion ? 'true' : 'false'}
              required
            />
            {lookupStatus === 'loading' && (
              <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-green-500" aria-hidden="true" />
            )}
            {lookupStatus === 'success' && (
              <Check className="absolute right-3 top-2.5 h-5 w-5 text-green-500" aria-hidden="true" />
            )}
            {lookupStatus === 'error' && (
              <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" aria-hidden="true" />
            )}
          </div>
          {fieldErrors.numeroIdentificacion && (
            <p id="numeroIdentificacion-error" className="mt-1 text-sm text-red-600" role="alert">{fieldErrors.numeroIdentificacion}</p>
          )}
          {lookupError && (
            <p id="numeroIdentificacion-lookup-error" className="mt-1 text-sm text-orange-600" role="alert">{lookupError}</p>
          )}
          {lookupStatus === 'success' && lookupSource && (
            <p id="numeroIdentificacion-success" className="mt-1 text-sm text-green-600" aria-live="polite">✓ Datos obtenidos de {lookupSource}</p>
          )}
        </div>

        {/* Campos de persona natural (DNI) */}
        {formData.tipoIdentificacion === 'DNI' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombres <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nombres || ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, nombres: e.target.value }));
                  validateField('nombres', e.target.value);
                }}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  fieldErrors.nombres ? 'border-red-500' : 'border-gray-300'
                } ${autocompletedFields.has('nombres') ? 'bg-green-50' : ''}`}
                placeholder="Juan Carlos"
              />
              {fieldErrors.nombres && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.nombres}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apellidos <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.apellidos || ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, apellidos: e.target.value }));
                  validateField('apellidos', e.target.value);
                }}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  fieldErrors.apellidos ? 'border-red-500' : 'border-gray-300'
                } ${autocompletedFields.has('apellidos') ? 'bg-green-50' : ''}`}
                placeholder="Pérez García"
              />
              {fieldErrors.apellidos && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.apellidos}</p>
              )}
            </div>
          </div>
        )}

        {/* Campos de persona jurídica (RUC) */}
        {formData.tipoIdentificacion === 'RUC' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Razón Social <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.razonSocial || ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, razonSocial: e.target.value }));
                  validateField('razonSocial', e.target.value);
                }}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  fieldErrors.razonSocial ? 'border-red-500' : 'border-gray-300'
                } ${autocompletedFields.has('razonSocial') ? 'bg-green-50' : ''}`}
                placeholder="CORPORACION ACEROS AREQUIPA S.A."
              />
              {fieldErrors.razonSocial && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.razonSocial}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Representante Legal
              </label>
              <input
                type="text"
                value={formData.representanteLegal || ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, representanteLegal: e.target.value }));
                  validateField('representanteLegal', e.target.value);
                }}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  fieldErrors.representanteLegal ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nombre del representante legal"
              />
              {fieldErrors.representanteLegal && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.representanteLegal}</p>
              )}
            </div>
          </>
        )}

        {/* Teléfono y Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.telefono || ''}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, telefono: e.target.value }));
                validateField('telefono', e.target.value);
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                fieldErrors.telefono ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="+51 123 456 789"
            />
            {fieldErrors.telefono && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.telefono}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, email: e.target.value }));
                validateField('email', e.target.value);
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                fieldErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="correo@ejemplo.com"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </div>
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dirección <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.direccion}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, direccion: e.target.value }));
              validateField('direccion', e.target.value);
            }}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
              fieldErrors.direccion ? 'border-red-500' : 'border-gray-300'
            } ${autocompletedFields.has('direccion') ? 'bg-green-50' : ''}`}
            placeholder="Av. Principal 123, Distrito, Provincia, Departamento"
          />
          {fieldErrors.direccion && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.direccion}</p>
          )}
        </div>

        {/* Mensaje Personalizado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mensaje Personalizado
          </label>
          <textarea
            value={formData.mensajePersonalizado || ''}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, mensajePersonalizado: e.target.value }));
              validateField('mensajePersonalizado', e.target.value);
            }}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
              fieldErrors.mensajePersonalizado ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Mensaje personalizado para incluir en comunicaciones..."
          />
          {fieldErrors.mensajePersonalizado && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.mensajePersonalizado}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {(formData.mensajePersonalizado || '').length}/500 caracteres
          </p>
        </div>

        {/* Mensajes de estado */}
        {submitError && (
          <div id="submit-error" className="bg-red-50 border border-red-200 rounded-md p-4 animate-in slide-in-from-top-2 duration-300" role="alert" aria-live="assertive">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-red-500 mr-3 animate-pulse" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-red-800">{submitError}</p>
                <p className="text-xs text-red-600 mt-1">Por favor, revise la información e intente nuevamente.</p>
              </div>
            </div>
          </div>
        )}

        {submitSuccess && (
          <div id="submit-success" className="bg-green-50 border border-green-200 rounded-md p-4 animate-in slide-in-from-top-2 duration-300" role="status" aria-live="polite">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-500 mr-3 animate-bounce" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-green-800">{submitSuccess}</p>
                <p className="text-xs text-green-600 mt-1">El cliente ha sido registrado correctamente en el sistema.</p>
              </div>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              aria-label="Cancelar creación de cliente"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full sm:w-auto px-6 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
              isSubmitting
                ? 'bg-green-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
            aria-label={isSubmitting ? 'Creando cliente, por favor espere' : 'Crear nuevo cliente'}
            aria-describedby={submitError ? 'submit-error' : submitSuccess ? 'submit-success' : undefined}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="inline-block h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                Creando Cliente...
              </>
            ) : (
              <>
                <Plus className="inline-block h-4 w-4 mr-2" aria-hidden="true" />
                Crear Cliente
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}