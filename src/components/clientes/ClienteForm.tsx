"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Check, AlertCircle, User, Building2 } from "lucide-react";
import { validateDocumentNumber } from "../../utils/decolecta-utils";

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

// Respuesta normalizada del proxy interno
interface ProxyResponse {
  success: boolean;
  data?: {
    razonSocial?: string;
    nombres?: string;
    apellidos?: string;
    direccion?: string;
    tipoContribuyente?: string;
    esPersonaNatural?: boolean;
  };
  error?: string;
}

interface ClienteFormProps {
  initialData?: Partial<ClienteFormData>;
  onSubmit: (data: ClienteFormData) => Promise<void>;
  onCancel?: () => void;
  submitButtonText?: string;
  isSubmitting?: boolean;
  submitError?: string;
  submitSuccess?: string;
  isEditMode?: boolean;
}

export default function ClienteForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  submitButtonText = "Guardar Cliente",
  isSubmitting = false,
  submitError = '',
  submitSuccess = '',
  isEditMode = false
}: ClienteFormProps) {
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
    mensajePersonalizado: '',
    ...initialData
  });

  // Estados de autocompletado
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lookupError, setLookupError] = useState('');
  const [autocompletedFields, setAutocompletedFields] = useState<Set<string>>(new Set());
  const [lookupSource, setLookupSource] = useState('');

  // Estados de validación
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Referencia para debounce
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Cache para resultados de búsqueda
  const cacheRef = useRef<Map<string, ProxyResponse>>(new Map());

  // Actualizar formData cuando cambie initialData
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData
      }));
    }
  }, [initialData]);

  // Limpiar debounce al desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Validar campos en tiempo real
  const validateField = useCallback((field: keyof ClienteFormData, value: any) => {
    const fieldName = String(field);
    const errors: Record<string, string> = {};

    switch (fieldName) {
      case 'numeroIdentificacion':
        // Validar según el valor actual, no según el estado previo
        // Si tiene 9+ dígitos, tratamos como RUC; si no, como DNI
        {
          const strVal = String(value || '').replace(/[^0-9]/g, '');
          const computedType: 'DNI' | 'RUC' = strVal.length >= 9 ? 'RUC' : 'DNI';
          
          if (!strVal || strVal.trim() === '') {
            errors[fieldName] = 'El número de identificación es obligatorio';
          } else if (computedType === 'DNI' && !/^\d{8}$/.test(strVal)) {
            errors[fieldName] = 'El DNI debe tener exactamente 8 dígitos';
          } else if (computedType === 'RUC' && !/^\d{11}$/.test(strVal)) {
            errors[fieldName] = 'El RUC debe tener exactamente 11 dígitos';
          }
        }
        break;

      case 'nombres':
        if (formData.tipoIdentificacion === 'DNI' && (!value || String(value).trim().length < 2)) {
          errors[fieldName] = 'Los nombres son obligatorios para personas naturales';
        }
        break;

      case 'apellidos':
        if (formData.tipoIdentificacion === 'DNI' && (!value || String(value).trim().length < 2)) {
          errors[fieldName] = 'Los apellidos son obligatorios para personas naturales';
        }
        break;

      case 'razonSocial':
        if (formData.tipoIdentificacion === 'RUC' && (!value || String(value).trim().length < 3)) {
          errors[fieldName] = 'La razón social es obligatoria para personas jurídicas';
        }
        break;

      case 'direccion':
        if (!value || String(value).trim().length < 10) {
          errors[fieldName] = 'La dirección es obligatoria y debe tener al menos 10 caracteres';
        }
        break;

      case 'email':
        if (value && String(value).trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          errors[fieldName] = 'El formato del email no es válido';
        }
        break;

      case 'telefono':
        if (value && String(value).trim() !== '' && /^[\+]?[\d\s\-\(\)]{7,15}$/.test(String(value)) === false) {
          errors[fieldName] = 'El formato del teléfono no es válido';
        }
        break;
    }

    setFieldErrors(prev => {
      const newErrors = { ...prev, ...errors };
      if (Object.keys(errors).length === 0) {
        delete newErrors[fieldName];
      }
      return newErrors;
    });

    return Object.keys(errors).length === 0;
  }, [formData.tipoIdentificacion]);

  // Realizar búsqueda en RENIEC/SUNAT
  const performLookup = useCallback(async (numeroIdentificacion: string) => {
    // Verificar cache primero
    const cacheKey = numeroIdentificacion;
    if (cacheRef.current.has(cacheKey)) {
      const cachedResult = cacheRef.current.get(cacheKey)!;
      applyLookupResult(cachedResult, numeroIdentificacion);
      return;
    }

    setLookupStatus('loading');
    setLookupError('');

    try {
      const response = await fetch('/api/clientes/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroIdentificacion })
      });

      const result: ProxyResponse = await response.json();
      
      // Guardar en cache
      cacheRef.current.set(cacheKey, result);
      
      applyLookupResult(result, numeroIdentificacion);

    } catch (error) {
      console.error('Error en lookup:', error);
      setLookupStatus('error');
      setLookupError('Error al consultar los datos. Verifique su conexión.');
    }
  }, []);

  // Aplicar resultado de búsqueda
  const applyLookupResult = useCallback((result: ProxyResponse, numeroIdentificacion: string) => {
    if (result.success && result.data) {
      setLookupStatus('success');
      const newAutocompletedFields = new Set<string>();
      
      setFormData(prev => {
        const updated = { ...prev };
        
        if (result.data?.nombres && !prev.nombres) {
          updated.nombres = result.data.nombres;
          newAutocompletedFields.add('nombres');
        }
        
        if (result.data?.apellidos && !prev.apellidos) {
          updated.apellidos = result.data.apellidos;
          newAutocompletedFields.add('apellidos');
        }
        
        if (result.data?.razonSocial && !prev.razonSocial) {
          updated.razonSocial = result.data.razonSocial;
          newAutocompletedFields.add('razonSocial');
        }
        
        if (result.data?.direccion && !prev.direccion) {
          updated.direccion = result.data.direccion;
          newAutocompletedFields.add('direccion');
        }
        
        return updated;
      });
      
      setAutocompletedFields(newAutocompletedFields);
      setLookupSource(numeroIdentificacion.length === 8 ? 'RENIEC' : 'SUNAT');
      
    } else {
      setLookupStatus('error');
      setLookupError(result.error || 'No se encontraron datos para este documento');
      setAutocompletedFields(new Set());
      setLookupSource('');
    }
  }, []);

  // Manejar cambio en número de identificación con debounce y auto detección de tipo
  const handleIdentificationChange = useCallback((rawValue: string) => {
    // Limpiar timeout anterior
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Normalizar: solo dígitos, hasta 11
    const value = rawValue.replace(/[^0-9]/g, '').slice(0, 11);

    // Auto-cambiar tipo según longitud (solo si no estamos en modo edición)
    if (!isEditMode) {
      const nextType: 'DNI' | 'RUC' = value.length >= 9 ? 'RUC' : 'DNI';
      setFormData(prev => ({ ...prev, numeroIdentificacion: value, tipoIdentificacion: nextType }));
    } else {
      setFormData(prev => ({ ...prev, numeroIdentificacion: value }));
    }
    
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

    // Configurar debounce para búsqueda (solo si no estamos en modo edición)
    if (!isEditMode) {
      debounceRef.current = setTimeout(() => {
        performLookup(value);
      }, 800);
    }
  }, [isEditMode, validateField, performLookup]);

  // Manejar cambio de tipo de identificación
  const handleTipoIdentificacionChange = useCallback((tipo: 'DNI' | 'RUC') => {
    setFormData(prev => ({
      ...prev,
      tipoIdentificacion: tipo,
      numeroIdentificacion: '', // Limpiar número al cambiar tipo
      nombres: tipo === 'RUC' ? '' : prev.nombres,
      apellidos: tipo === 'RUC' ? '' : prev.apellidos,
      razonSocial: tipo === 'DNI' ? '' : prev.razonSocial,
      representanteLegal: tipo === 'DNI' ? '' : prev.representanteLegal
    }));
    
    // Limpiar estados de autocompletado
    setLookupStatus('idle');
    setLookupError('');
    setAutocompletedFields(new Set());
    setLookupSource('');
    setFieldErrors({});
  }, []);

  // Validar todos los campos
  const validateAllFields = useCallback(() => {
    const fieldsToValidate: (keyof ClienteFormData)[] = [
      'numeroIdentificacion',
      'direccion'
    ];

    if (formData.tipoIdentificacion === 'DNI') {
      fieldsToValidate.push('nombres', 'apellidos');
    } else {
      fieldsToValidate.push('razonSocial');
    }

    if (formData.email) fieldsToValidate.push('email');
    if (formData.telefono) fieldsToValidate.push('telefono');

    let isValid = true;
    fieldsToValidate.forEach(field => {
      const fieldValid = validateField(field, formData[field]);
      if (!fieldValid) isValid = false;
    });

    return isValid;
  }, [formData, validateField]);

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAllFields()) {
      return;
    }

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selector de tipo de identificación */}
      <div>
        <label className="block text-sm font-semibold text-black mb-3">
          Tipo de Identificación *
        </label>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => handleTipoIdentificacionChange('DNI')}
            disabled={isEditMode}
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg border-2 transition-all ${
              formData.tipoIdentificacion === 'DNI'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 bg-white text-black hover:border-gray-400'
            } ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <User className="w-5 h-5" />
            <span className="font-medium">DNI - Persona Natural</span>
          </button>
          <button
            type="button"
            onClick={() => handleTipoIdentificacionChange('RUC')}
            disabled={isEditMode}
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg border-2 transition-all ${
              formData.tipoIdentificacion === 'RUC'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 bg-white text-black hover:border-gray-400'
            } ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Building2 className="w-5 h-5" />
            <span className="font-medium">RUC - Persona Jurídica</span>
          </button>
        </div>
      </div>

      {/* Número de identificación */}
      <div>
        <label htmlFor="numeroIdentificacion" className="block text-sm font-semibold text-black mb-2">
          {formData.tipoIdentificacion === 'DNI' ? 'DNI' : 'RUC'} *
        </label>
        <div className="relative">
          <input
            id="numeroIdentificacion"
            type="text"
            value={formData.numeroIdentificacion}
            onChange={(e) => {
              handleIdentificationChange(e.target.value);
            }}
            disabled={isEditMode}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black ${
              fieldErrors.numeroIdentificacion ? 'border-red-500' : 'border-gray-300'
            } ${autocompletedFields.has('numeroIdentificacion') ? 'bg-green-50' : 'bg-white'} ${
              isEditMode ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            placeholder={formData.tipoIdentificacion === 'DNI' ? '12345678' : '12345678901'}
            maxLength={11}
          />
          {lookupStatus === 'loading' && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            </div>
          )}
        </div>
        {fieldErrors.numeroIdentificacion && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.numeroIdentificacion}</p>
        )}
      </div>

      {/* Mensaje de estado de búsqueda */}
      {lookupStatus === 'success' && lookupSource && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-700">
              Datos encontrados en {lookupSource} y completados automáticamente
            </p>
          </div>
        </div>
      )}

      {lookupError && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <p className="text-sm text-yellow-700">{lookupError}</p>
          </div>
        </div>
      )}

      {/* Campos específicos para DNI */}
      {formData.tipoIdentificacion === 'DNI' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="nombres" className="block text-sm font-semibold text-black mb-2">
              Nombres *
            </label>
            <input
              id="nombres"
              type="text"
              value={formData.nombres}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, nombres: e.target.value }));
                validateField('nombres', e.target.value);
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black ${
                fieldErrors.nombres ? 'border-red-500' : 'border-gray-300'
              } ${autocompletedFields.has('nombres') ? 'bg-green-50' : 'bg-white'}`}
              placeholder="Juan Carlos"
            />
            {fieldErrors.nombres && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.nombres}</p>
            )}
          </div>

          <div>
            <label htmlFor="apellidos" className="block text-sm font-semibold text-black mb-2">
              Apellidos *
            </label>
            <input
              id="apellidos"
              type="text"
              value={formData.apellidos}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, apellidos: e.target.value }));
                validateField('apellidos', e.target.value);
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black ${
                fieldErrors.apellidos ? 'border-red-500' : 'border-gray-300'
              } ${autocompletedFields.has('apellidos') ? 'bg-green-50' : 'bg-white'}`}
              placeholder="Pérez García"
            />
            {fieldErrors.apellidos && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.apellidos}</p>
            )}
          </div>
        </div>
      )}

      {/* Campos específicos para RUC */}
      {formData.tipoIdentificacion === 'RUC' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="razonSocial" className="block text-sm font-semibold text-black mb-2">
              Razón Social *
            </label>
            <input
              id="razonSocial"
              type="text"
              value={formData.razonSocial}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, razonSocial: e.target.value }));
                validateField('razonSocial', e.target.value);
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black ${
                fieldErrors.razonSocial ? 'border-red-500' : 'border-gray-300'
              } ${autocompletedFields.has('razonSocial') ? 'bg-green-50' : 'bg-white'}`}
              placeholder="Empresa S.A.C."
            />
            {fieldErrors.razonSocial && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.razonSocial}</p>
            )}
          </div>

          <div>
            <label htmlFor="representanteLegal" className="block text-sm font-semibold text-black mb-2">
              Representante Legal
            </label>
            <input
              id="representanteLegal"
              type="text"
              value={formData.representanteLegal}
              onChange={(e) => setFormData(prev => ({ ...prev, representanteLegal: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-black"
              placeholder="Nombre del representante legal"
            />
          </div>
        </div>
      )}

      {/* Teléfono y Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="telefono" className="block text-sm font-semibold text-black mb-2">
            Teléfono
          </label>
          <input
            id="telefono"
            type="tel"
            value={formData.telefono}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, telefono: e.target.value }));
              validateField('telefono', e.target.value);
            }}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black ${
              fieldErrors.telefono ? 'border-red-500' : 'border-gray-300'
            } bg-white`}
            placeholder="+51 123 456 789"
          />
          {fieldErrors.telefono && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.telefono}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-black mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, email: e.target.value }));
              validateField('email', e.target.value);
            }}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black ${
              fieldErrors.email ? 'border-red-500' : 'border-gray-300'
            } bg-white`}
            placeholder="correo@ejemplo.com"
          />
          {fieldErrors.email && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
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
          value={formData.direccion}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, direccion: e.target.value }));
            validateField('direccion', e.target.value);
          }}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black ${
            fieldErrors.direccion ? 'border-red-500' : 'border-gray-300'
          } ${autocompletedFields.has('direccion') ? 'bg-green-50' : 'bg-white'}`}
          placeholder="Av. Principal 123, Distrito, Provincia, Departamento"
        />
        {fieldErrors.direccion && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.direccion}</p>
        )}
      </div>

      {/* Mensaje personalizado */}
      <div>
        <label htmlFor="mensajePersonalizado" className="block text-sm font-semibold text-black mb-2">
          Mensaje Personalizado
        </label>
        <textarea
          id="mensajePersonalizado"
          value={formData.mensajePersonalizado}
          onChange={(e) => setFormData(prev => ({ ...prev, mensajePersonalizado: e.target.value }))}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-black"
          placeholder="Mensaje personalizado para incluir en comunicaciones..."
          rows={3}
        />
      </div>

      {/* Mensaje de éxito */}
      {submitSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 font-medium">{submitSuccess}</p>
        </div>
      )}

      {/* Error de envío */}
      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">{submitError}</p>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 text-sm font-medium text-black bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <span>{submitButtonText}</span>
          )}
        </button>
      </div>
    </form>
  );
}