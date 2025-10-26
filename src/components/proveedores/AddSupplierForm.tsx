"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Loader2, Check, AlertCircle, User, Building2, Lock } from "lucide-react";
import { validateDocument, sanitizeNumericInput, isDocumentComplete } from "@/utils/documentValidation";

// Tipos para el formulario
interface SupplierFormData {
  tipoIdentificacion: 'DNI' | 'RUC';
  numeroIdentificacion: string;
  nombres?: string;
  apellidos?: string;
  razonSocial?: string;
  representanteLegal?: string;
  telefono?: string;
  email?: string;
  direccion: string; // Obligatorio
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

interface AddSupplierFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AddSupplierForm({ onSuccess, onCancel }: AddSupplierFormProps) {
  const { data: session } = useSession();

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
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Estados de validación
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Estado para controlar bloqueo de campos
  const [isDocumentValid, setIsDocumentValid] = useState(false);
  const [fieldsLocked, setFieldsLocked] = useState(false);

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
        {
          const strVal = sanitizeNumericInput(String(value || ''));
          if (!strVal || strVal.trim() === '') {
            errors[field] = 'El número de identificación es obligatorio';
          } else {
            const validation = validateDocument(strVal);
            if (!validation.isValid) {
              errors[field] = validation.error || 'Documento inválido';
            }
          }
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
        if (value && String(value).trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
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

    // Sanitizar entrada: solo dígitos, hasta 11
    const value = sanitizeNumericInput(rawValue).slice(0, 11);

    // Auto-cambiar tipo según longitud
    const nextType: 'DNI' | 'RUC' = value.length >= 9 ? 'RUC' : 'DNI';
    setFormData(prev => ({ ...prev, numeroIdentificacion: value, tipoIdentificacion: nextType }));
    
    // Validar documento usando las nuevas utilidades
    const validation = validateDocument(value);
    const isValidDocument = validation.isValid;
    
    // Actualizar estados de validación y bloqueo
    setIsDocumentValid(isValidDocument);
    setFieldsLocked(isValidDocument);
    
    // Validar campo
    validateField('numeroIdentificacion', value);

    // Si el valor está vacío o es inválido, limpiar estados
    if (!value || value.trim() === '' || !isValidDocument) {
      setLookupStatus('idle');
      setLookupError('');
      setAutocompletedFields(new Set());
      setLookupSource('');
      
      // Si no es válido, desbloquear campos
      if (!isValidDocument) {
        setFieldsLocked(false);
      }
      return;
    }

    // Configurar debounce para búsqueda solo si el documento es válido
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
        applyLookupResult(cached, identification);
        return;
      }

      // Usar endpoint para proveedores (RUC/DNI)
      const endpoint = `/api/proveedores/ruc?ruc=${identification}`;
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
    setSubmitSuccess('');

    try {
      // Mapear tipoIdentificacion a tipoEntidad según el esquema del backend
      const tipoEntidad = formData.tipoIdentificacion === 'DNI' ? 'PERSONA_NATURAL' : 'PERSONA_JURIDICA';
      
      // Construir el nombre según el tipo de entidad
      const nombre = formData.tipoIdentificacion === 'DNI' 
        ? `${formData.nombres} ${formData.apellidos}`.trim()
        : formData.razonSocial || '';

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

      const response = await fetch('/api/proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        // Manejar errores específicos del backend
        if (result.issues && Array.isArray(result.issues)) {
          // Errores de validación de Zod
          const validationErrors = result.issues.map((issue: any) => {
            const field = issue.path?.join('.') || 'campo';
            return `${field}: ${issue.message}`;
          }).join(', ');
          throw new Error(`Errores de validación: ${validationErrors}`);
        } else if (result.error) {
          // Error específico del backend
          throw new Error(result.error);
        } else {
          // Error genérico
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
      }

      setSubmitSuccess('Proveedor creado exitosamente');
      
      // Limpiar formulario después de éxito
      setTimeout(() => {
        setFormData({
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
        setAutocompletedFields(new Set());
        setLookupStatus('idle');
        setLookupError('');
        setLookupSource('');
        setFieldErrors({});
        setSubmitSuccess('');
        
        if (onSuccess) {
          onSuccess();
        }
      }, 1500);

    } catch (error) {
      console.error('Error al crear proveedor:', error);
      setSubmitError(error instanceof Error ? error.message : 'Error desconocido al crear el proveedor');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSuccess]);

  return (
    <div className="p-6">
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
              className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-all font-medium ${
                formData.tipoIdentificacion === 'DNI'
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <User className="h-4 w-4" />
              DNI
            </button>
            <button
              type="button"
              onClick={() => handleTipoIdentificacionChange('RUC')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-all font-medium ${
                formData.tipoIdentificacion === 'RUC'
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
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
          <>
            <div>
              <label htmlFor="nombres" className="block text-sm font-medium text-gray-700 mb-2">
                Nombres *
                {fieldsLocked && (
                  <span className="ml-2 inline-flex items-center text-xs text-amber-600">
                    <Lock className="w-3 h-3 mr-1" />
                    Bloqueado por documento válido
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="nombres"
                  value={formData.nombres || ''}
                  onChange={(e) => handleFieldChange('nombres', e.target.value)}
                  disabled={fieldsLocked}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldsLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' :
                    fieldErrors.nombres ? 'border-red-500' : 
                    autocompletedFields.has('nombres') ? 'border-green-500 bg-green-50' : 'border-gray-300'
                  }`}
                  placeholder="Nombres del proveedor"
                />
                {fieldsLocked && (
                  <Lock className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                )}
              </div>
              {fieldErrors.nombres && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.nombres}</p>
              )}
              {fieldsLocked && !fieldErrors.nombres && (
                <p className="mt-1 text-sm text-amber-600">
                  El nombre no puede modificarse una vez registrado el documento válido
                </p>
              )}
            </div>

            <div>
              <label htmlFor="apellidos" className="block text-sm font-medium text-gray-700 mb-2">
                Apellidos *
                {fieldsLocked && (
                  <span className="ml-2 inline-flex items-center text-xs text-amber-600">
                    <Lock className="w-3 h-3 mr-1" />
                    Bloqueado por documento válido
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="apellidos"
                  value={formData.apellidos || ''}
                  onChange={(e) => handleFieldChange('apellidos', e.target.value)}
                  disabled={fieldsLocked}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldsLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' :
                    fieldErrors.apellidos ? 'border-red-500' : 
                    autocompletedFields.has('apellidos') ? 'border-green-500 bg-green-50' : 'border-gray-300'
                  }`}
                  placeholder="Apellidos del proveedor"
                />
                {fieldsLocked && (
                  <Lock className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                )}
              </div>
              {fieldErrors.apellidos && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.apellidos}</p>
              )}
              {fieldsLocked && !fieldErrors.apellidos && (
                <p className="mt-1 text-sm text-amber-600">
                  El nombre no puede modificarse una vez registrado el documento válido
                </p>
              )}
            </div>
          </>
        )}

        {/* Campos específicos para RUC */}
        {formData.tipoIdentificacion === 'RUC' && (
          <>
            <div>
              <label htmlFor="razonSocial" className="block text-sm font-medium text-gray-700 mb-2">
                Razón Social *
                {fieldsLocked && (
                  <span className="ml-2 inline-flex items-center text-xs text-amber-600">
                    <Lock className="w-3 h-3 mr-1" />
                    Bloqueado por documento válido
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="razonSocial"
                  value={formData.razonSocial || ''}
                  onChange={(e) => handleFieldChange('razonSocial', e.target.value)}
                  disabled={fieldsLocked}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldsLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' :
                    fieldErrors.razonSocial ? 'border-red-500' : 
                    autocompletedFields.has('razonSocial') ? 'border-green-500 bg-green-50' : 'border-gray-300'
                  }`}
                  placeholder="Razón social de la empresa"
                />
                {fieldsLocked && (
                  <Lock className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                )}
              </div>
              {fieldErrors.razonSocial && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.razonSocial}</p>
              )}
              {fieldsLocked && !fieldErrors.razonSocial && (
                <p className="mt-1 text-sm text-amber-600">
                  La razón social no puede modificarse una vez registrado el documento válido
                </p>
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

        {/* Mensajes de estado */}
        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}

        {submitSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">{submitSuccess}</p>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-green-50 text-green-700 py-2 px-4 rounded-md hover:bg-green-100 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 border border-green-200 font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Crear Proveedor
              </>
            )}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-200 text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}