'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { User, Building2, Loader2, Check, AlertCircle, Save, X } from 'lucide-react';

// Tipos
interface SupplierFormData {
  tipoIdentificacion: 'DNI' | 'RUC';
  numeroIdentificacion: string;
  nombres: string;
  apellidos: string;
  razonSocial: string;
  representanteLegal: string;
  telefono: string;
  email: string;
  direccion: string;
}

interface ProxyResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

type SupplierProp = Partial<SupplierFormData> & {
  id?: string;
  numeroIdentificacion?: string;
};

interface EditSupplierFormProps {
  supplier: SupplierProp | null; // Datos del proveedor a editar
  onSuccess?: (updatedSupplier: Record<string, unknown>) => void;
  onCancel?: () => void;
}

export default function EditSupplierForm({ supplier, onSuccess, onCancel }: EditSupplierFormProps) {
  // Estados del formulario
  const [formData, setFormData] = useState<SupplierFormData>({
    tipoIdentificacion: 'DNI',
    numeroIdentificacion: '',
    nombres: '',
    apellidos: '',
    razonSocial: '',
    representanteLegal: '',
    telefono: '',
    email: '',
    direccion: ''
  });

  // Estados de autocompletado
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lookupError, setLookupError] = useState('');
  const [autocompletedFields, setAutocompletedFields] = useState<Set<string>>(new Set());
  const [lookupSource, setLookupSource] = useState('');

  // Estados de envío
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Estados de validación
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Referencias
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<Map<string, unknown>>(new Map());

  // Inicializar formulario con datos del proveedor
  useEffect(() => {
    if (supplier) {
      const tipoIdentificacion = supplier.numeroIdentificacion && supplier.numeroIdentificacion.length === 8 ? 'DNI' : 'RUC';
      setFormData({
        tipoIdentificacion: (tipoIdentificacion as 'DNI' | 'RUC') ?? 'DNI',
        numeroIdentificacion: supplier.numeroIdentificacion || '',
        nombres: supplier.nombres || '',
        apellidos: supplier.apellidos || '',
        razonSocial: supplier.razonSocial || '',
        representanteLegal: supplier.representanteLegal || '',
        telefono: supplier.telefono || '',
        email: supplier.email || '',
        direccion: supplier.direccion || ''
      });
    }
  }, [supplier]);

  // Validar campo individual
  const validateField = useCallback((field: string, value: unknown): boolean => {
    const errors: Record<string, string> = {};

    switch (field) {
      case 'numeroIdentificacion':
        const expectedLength = formData.tipoIdentificacion === 'DNI' ? 8 : 11;
  if (value === undefined || value === null || String(value).trim() === '') {
          errors[field] = `El ${formData.tipoIdentificacion} es obligatorio`;
        } else if (!/^\d+$/.test(String(value))) {
          errors[field] = `El ${formData.tipoIdentificacion} debe contener solo números`;
        } else if (String(value).length !== expectedLength) {
          errors[field] = `El ${formData.tipoIdentificacion} debe tener ${expectedLength} dígitos`;
        }
        break;

      case 'nombres':
        if (formData.tipoIdentificacion === 'DNI' && (!value || String(value).trim().length < 2)) {
          errors[field] = 'Los nombres son obligatorios para personas naturales';
        }
        break;

      case 'apellidos':
        if (formData.tipoIdentificacion === 'DNI' && (!value || String(value).trim().length < 2)) {
          errors[field] = 'Los apellidos son obligatorios para personas naturales';
        }
        break;

      case 'razonSocial':
        if (formData.tipoIdentificacion === 'RUC' && (!value || String(value).trim().length < 3)) {
          errors[field] = 'La razón social es obligatoria para personas jurídicas';
        }
        break;

      case 'direccion':
        if (!value || String(value).trim().length < 10) {
          errors[field] = 'La dirección es obligatoria y debe tener al menos 10 caracteres';
        }
        break;

      case 'email':
  if (value !== undefined && value !== null && String(value).trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          errors[field] = 'El formato del email no es válido';
        }
        break;

      case 'telefono':
        if (value && String(value).trim() !== '' && /^[\+]?[\d\s\-\(\)]{7,15}$/.test(String(value)) === false) {
          errors[field] = 'El formato del teléfono no es válido';
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
    }, 500);
  }, []);

  // Realizar búsqueda usando proxy unificado (RENIEC/SUNAT)
  const performLookup = useCallback(async (identification: string) => {
    try {
      setLookupStatus('loading');
      setLookupError('');

      // Verificar cache primero
      const cached = cacheRef.current.get(identification);
      if (cached) {
        // Normalize cached entry to ProxyResponse if possible
        const normalized: ProxyResponse = (cached && typeof cached === 'object' && 'success' in (cached as Record<string, unknown>)) ? (cached as ProxyResponse) : { success: true, data: cached };
        applyLookupResult(normalized, identification);
        return;
      }

      // Usar endpoint para proveedores (RUC/DNI)
      const endpoint = `/api/proveedores/ruc?ruc=${identification}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      const raw: unknown = await response.json().catch(() => ({ success: false, error: 'Respuesta inválida del servidor' }));
      const result = raw as Record<string, unknown>;

      if (!response.ok || result?.success === false) {
        const tipoDoc = identification.length === 8 ? 'DNI' : 'RUC';
        const fuente = identification.length === 8 ? 'RENIEC' : 'SUNAT';
        const msg = String(result?.error ?? `Error ${response.status} al consultar ${fuente}`);
        setLookupStatus('error');
        setLookupError(`${tipoDoc} no disponible: ${msg}`);
        return;
      }

      // Guardar en cache y aplicar resultado
      const data = (result?.data ?? result) as unknown;
      cacheRef.current.set(identification, data);
      applyLookupResult({ success: true, data }, identification);

    } catch (error: unknown) {
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

    const data = result.data as Record<string, unknown>;
    const isDNI = identification.length === 8;
    const fieldsUpdated = new Set<string>();

    setFormData(prev => {
      const updated = { ...prev };

      if (isDNI) {
        const nombres = String(data.nombres ?? '').trim();
        const apellidos = String(data.apellidos ?? '').trim();
        if (nombres) {
          updated.nombres = nombres;
          fieldsUpdated.add('nombres');
        }
        if (apellidos) {
          updated.apellidos = apellidos;
          fieldsUpdated.add('apellidos');
        }
        updated.razonSocial = '';
        updated.representanteLegal = '';
      } else {
        const razon = String(data.razonSocial ?? '').trim();
        if (razon) {
          updated.razonSocial = razon;
          fieldsUpdated.add('razonSocial');
        }
        updated.nombres = '';
        updated.apellidos = '';
      }

      const direccion = String(data.direccion ?? '').trim();
      if (direccion) {
        updated.direccion = direccion;
        fieldsUpdated.add('direccion');
      }

      return updated;
    });

    setAutocompletedFields(fieldsUpdated);
    setLookupSource(isDNI ? 'RENIEC' : 'SUNAT');
    setLookupStatus('success');
    setLookupError('');
  }, []);

  // Manejar cambio de tipo de identificación
  const handleTipoIdentificacionChange = useCallback((tipo: 'DNI' | 'RUC') => {
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
  }, []);

  // Manejar cambios en otros campos
  const handleFieldChange = useCallback((field: keyof SupplierFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  }, [validateField]);

  // Validar formulario completo
  const validateForm = useCallback((): boolean => {
    const fields = ['numeroIdentificacion', 'direccion'];
    
    if (formData.tipoIdentificacion === 'DNI') {
      fields.push('nombres', 'apellidos');
    } else {
      fields.push('razonSocial');
    }

    if (formData.email) fields.push('email');
    if (formData.telefono) fields.push('telefono');

    let isValid = true;
    fields.forEach(field => {
      const fieldValue = formData[field as keyof SupplierFormData];
      if (!validateField(field, fieldValue)) {
        isValid = false;
      }
    });

    return isValid;
  }, [formData, validateField]);

  // Manejar envío del formulario
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSubmitError('Por favor, corrige los errores en el formulario');
      return;
    }

  setIsSubmitting(true);
  setSubmitError('');

    try {
      // Construir payload conforme al esquema del API (tipoEntidad + nombre requerido)
      const tipoEntidad = formData.tipoIdentificacion === 'DNI' ? 'PERSONA_NATURAL' : 'PERSONA_JURIDICA';
      const nombre = formData.tipoIdentificacion === 'DNI'
        ? `${formData.nombres} ${formData.apellidos}`.trim()
        : formData.razonSocial;

      const payload = {
        tipoEntidad,
        nombre,
        numeroIdentificacion: formData.numeroIdentificacion,
        direccion: formData.direccion,
        telefono: formData.telefono || undefined,
        email: formData.email || undefined,
        ...(formData.tipoIdentificacion === 'DNI' ? {
          nombres: formData.nombres,
          apellidos: formData.apellidos
        } : {
          razonSocial: formData.razonSocial,
          representanteLegal: formData.representanteLegal || undefined
        })
      };

      if (!supplier || !supplier.id) {
        throw new Error('Proveedor inválido');
      }
      const response = await fetch(`/api/proveedores/${supplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const rawResult: unknown = await response.json().catch(() => ({ success: false }));
      const result = rawResult as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(String(result.error ?? `Error ${response.status}: ${response.statusText}`));
      }

  // success handled via onSuccess

      // Llamar callback de éxito después de un breve delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(result ?? {});
        }
      }, 1500);

    } catch (error) {
      console.error('Error al actualizar proveedor:', error);
      setSubmitError(error instanceof Error ? error.message : 'Error desconocido al actualizar el proveedor');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSuccess, supplier]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Editar Proveedor</h3>
        <p className="text-sm text-gray-600">Modifica los datos del proveedor</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo de Identificación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tipo de Identificación
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => handleTipoIdentificacionChange('DNI')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                formData.tipoIdentificacion === 'DNI'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <User className="h-4 w-4" />
              DNI
            </button>
            <button
              type="button"
              onClick={() => handleTipoIdentificacionChange('RUC')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                formData.tipoIdentificacion === 'RUC'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <Building2 className="h-4 w-4" />
              RUC
            </button>
          </div>
        </div>

        {/* Número de Identificación */}
        <div>
          <label htmlFor="numeroIdentificacion" className="block text-sm font-medium text-gray-700 mb-2">
            {formData.tipoIdentificacion} {formData.tipoIdentificacion === 'DNI' ? '(8 dígitos)' : '(11 dígitos)'}
          </label>
          <div className="relative">
            <input
              type="text"
              id="numeroIdentificacion"
              value={formData.numeroIdentificacion}
              onChange={(e) => handleIdentificationChange(e.target.value)}
              placeholder={`Ingrese el ${formData.tipoIdentificacion}`}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.numeroIdentificacion ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={formData.tipoIdentificacion === 'DNI' ? 8 : 11}
            />
            {lookupStatus === 'loading' && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              </div>
            )}
            {lookupStatus === 'success' && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Check className="h-4 w-4 text-green-500" />
              </div>
            )}
            {lookupStatus === 'error' && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <AlertCircle className="h-4 w-4 text-red-500" />
              </div>
            )}
          </div>
          {fieldErrors.numeroIdentificacion && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.numeroIdentificacion}</p>
          )}
          {lookupError && (
            <p className="mt-1 text-sm text-red-600">{lookupError}</p>
          )}
          {lookupStatus === 'success' && lookupSource && (
            <p className="mt-1 text-sm text-green-600">
              Datos obtenidos de {lookupSource}
            </p>
          )}
        </div>

        {/* Campos específicos para DNI */}
        {formData.tipoIdentificacion === 'DNI' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nombres" className="block text-sm font-medium text-gray-700 mb-2">
                Nombres *
              </label>
              <input
                type="text"
                id="nombres"
                value={formData.nombres || ''}
                onChange={(e) => handleFieldChange('nombres', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  fieldErrors.nombres ? 'border-red-500' : 
                  autocompletedFields.has('nombres') ? 'border-green-500 bg-green-50' : 'border-gray-300'
                }`}
                placeholder="Nombres del proveedor"
              />
              {fieldErrors.nombres && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.nombres}</p>
              )}
            </div>

            <div>
              <label htmlFor="apellidos" className="block text-sm font-medium text-gray-700 mb-2">
                Apellidos *
              </label>
              <input
                type="text"
                id="apellidos"
                value={formData.apellidos || ''}
                onChange={(e) => handleFieldChange('apellidos', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  fieldErrors.apellidos ? 'border-red-500' : 
                  autocompletedFields.has('apellidos') ? 'border-green-500 bg-green-50' : 'border-gray-300'
                }`}
                placeholder="Apellidos del proveedor"
              />
              {fieldErrors.apellidos && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.apellidos}</p>
              )}
            </div>
          </div>
        )}

        {/* Campos específicos para RUC */}
        {formData.tipoIdentificacion === 'RUC' && (
          <>
            <div>
              <label htmlFor="razonSocial" className="block text-sm font-medium text-gray-700 mb-2">
                Razón Social *
              </label>
              <input
                type="text"
                id="razonSocial"
                value={formData.razonSocial || ''}
                onChange={(e) => handleFieldChange('razonSocial', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  fieldErrors.razonSocial ? 'border-red-500' : 
                  autocompletedFields.has('razonSocial') ? 'border-green-500 bg-green-50' : 'border-gray-300'
                }`}
                placeholder="Razón social de la empresa"
              />
              {fieldErrors.razonSocial && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.razonSocial}</p>
              )}
            </div>

            <div>
              <label htmlFor="representanteLegal" className="block text-sm font-medium text-gray-700 mb-2">
                Representante Legal
              </label>
              <input
                type="text"
                id="representanteLegal"
                value={formData.representanteLegal || ''}
                onChange={(e) => handleFieldChange('representanteLegal', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nombre del representante legal"
              />
            </div>
          </>
        )}

        {/* Dirección */}
        <div>
          <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-2">
            Dirección *
          </label>
          <textarea
            id="direccion"
            value={formData.direccion}
            onChange={(e) => handleFieldChange('direccion', e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              fieldErrors.direccion ? 'border-red-500' : 
              autocompletedFields.has('direccion') ? 'border-green-500 bg-green-50' : 'border-gray-300'
            }`}
            placeholder="Dirección completa del proveedor"
          />
          {fieldErrors.direccion && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.direccion}</p>
          )}
        </div>

        {/* Campos de contacto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Teléfono */}
          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              id="telefono"
              value={formData.telefono || ''}
              onChange={(e) => handleFieldChange('telefono', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.telefono ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Número de teléfono"
            />
            {fieldErrors.telefono && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.telefono}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email || ''}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Correo electrónico"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </div>
        </div>

        {/* Mensajes de estado */}
        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}

  {/* success handled via onSuccess */}

        {/* Botones */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Actualizar Proveedor
              </>
            )}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}