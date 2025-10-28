"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Check, AlertCircle, User, Building2 } from "lucide-react";

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
  const validateField = useCallback((field: string, value: unknown) => {
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

    console.log('🔍 Aplicando resultado de búsqueda:', { isDNI, data });

    setFormData(prev => {
      const updated = { ...prev };

      if (isDNI) {
        // Para DNI (Persona Natural)
        const nombres = String(data.nombres || '').trim();
        const apellidos = String(data.apellidos || '').trim();
        
        if (nombres) {
          updated.nombres = nombres;
          fieldsUpdated.add('nombres');
          console.log('✅ Nombres actualizados:', nombres);
        }
        if (apellidos) {
          updated.apellidos = apellidos;
          fieldsUpdated.add('apellidos');
          console.log('✅ Apellidos actualizados:', apellidos);
        }
        // Limpiar campos de persona jurídica
        updated.razonSocial = '';
        updated.representanteLegal = '';
      } else {
        // Para RUC (Persona Jurídica)
        const razon = String(data.razonSocial || '').trim();
        if (razon) {
          updated.razonSocial = razon;
          fieldsUpdated.add('razonSocial');
          console.log('✅ Razón Social actualizada:', razon);
        }
        // Limpiar campos de persona natural
        updated.nombres = '';
        updated.apellidos = '';
      }

      // Dirección (común para ambos)
      const direccion = String(data.direccion || '').trim();
      if (direccion) {
        updated.direccion = direccion;
        fieldsUpdated.add('direccion');
        console.log('✅ Dirección actualizada:', direccion);
      }

      console.log('✅ Campos actualizados:', Array.from(fieldsUpdated));
      return updated;
    });

    setAutocompletedFields(fieldsUpdated);
    setLookupSource(isDNI ? 'RENIEC' : 'SUNAT');
    setLookupStatus('success');
    setLookupError('');
  }, []);

  // Realizar búsqueda usando proxy unificado (RENIEC/SUNAT)
  const performLookup = useCallback(async (identification: string) => {
    try {
      setLookupStatus('loading');
      setLookupError('');

      console.log('🔍 Iniciando búsqueda para:', identification);

      // Verificar cache primero
      const cached = cacheRef.current.get(identification);
      if (cached) {
        console.log('✅ Datos encontrados en caché');
        applyLookupResult(cached, identification);
      return;
    }

  // Use the clients API endpoint for RUC/DNI lookup
  const endpoint = `/api/clientes/ruc?ruc=${identification}`;
      console.log('📡 Llamando a:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      console.log('📥 Respuesta recibida:', response.status, response.ok);

      const raw: unknown = await response.json().catch(() => ({ success: false, error: 'Respuesta inválida del servidor' }));
      console.log('📦 Datos parseados:', raw);
      
      const result = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};

      if (!response.ok || result?.success === false) {
        const tipoDoc = identification.length === 8 ? 'DNI' : 'RUC';
        const fuente = identification.length === 8 ? 'RENIEC' : 'SUNAT';
        const msg = String(result?.error ?? `Error ${response.status} al consultar ${fuente}`);
        console.error('❌ Error en respuesta:', msg);
        setLookupStatus('error');
        setLookupError(`${tipoDoc} no disponible: ${msg}`);
        return;
      }

      // Extraer data correctamente de la respuesta
      const dataField = result?.data;
      const normalizedData: Record<string, unknown> = {};
      
      if (dataField && typeof dataField === 'object') {
        const dataObj = dataField as Record<string, unknown>;
        
        console.log('🔄 Normalizando datos:', dataObj);
        
        // Mapear campos de la respuesta
        normalizedData.razonSocial = dataObj.razonSocial || dataObj.nombre || '';
        normalizedData.nombres = dataObj.nombres || '';
        normalizedData.apellidos = dataObj.apellidos || '';
        normalizedData.direccion = dataObj.direccion || '';
        normalizedData.tipoContribuyente = dataObj.tipoContribuyente || '';
        normalizedData.esPersonaNatural = dataObj.esPersonaNatural || false;
        
        console.log('✅ Datos normalizados:', normalizedData);
      }

      // Guardar en cache y aplicar resultado
      const proxyResult: ProxyResponse = { 
        success: true, 
        data: normalizedData as ProxyResponse['data']
      };
      cacheRef.current.set(identification, proxyResult);
      applyLookupResult(proxyResult, identification);

    } catch (error) {
      console.error('❌ Error en búsqueda de RUC/DNI:', error);
      setLookupStatus('error');
      const tipoDoc = identification.length === 8 ? 'DNI' : 'RUC';
      setLookupError(`Error de conexión al consultar ${tipoDoc}`);
    }
  }, [applyLookupResult]);

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
  }, [performLookup, validateField]);

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
      'telefono'
    ];

    if (formData.tipoIdentificacion === 'DNI') {
      fieldsToValidate.push('nombres', 'apellidos');
    } else {
      fieldsToValidate.push('razonSocial');
    }

    let hasErrors = false;
    fieldsToValidate.forEach(field => {
      const isValid = validateField(field, formData[field as keyof ClienteFormData]);
      if (!isValid) hasErrors = true;
    });

    if (hasErrors) {
      setSubmitError('Por favor, corrija los errores en el formulario');
      return;
    }

    try {
  setIsSubmitting(true);
  setSubmitError('');

      // Preparar payload para la API
      const payload = {
        tipoEntidad: formData.tipoIdentificacion === 'DNI' ? 'PERSONA_NATURAL' : 'PERSONA_JURIDICA',
        tipoCliente: 'MINORISTA', // Valor por defecto ya que se eliminó el campo
        numeroIdentificacion: formData.numeroIdentificacion,
        nombres: formData.nombres || undefined,
        apellidos: formData.apellidos || undefined,
        razonSocial: formData.razonSocial || undefined,
        contacto: formData.representanteLegal || undefined,
        telefono: formData.telefono || undefined,
        email: formData.email || undefined,
        direccion: formData.direccion,
        mensajePersonalizado: formData.mensajePersonalizado || undefined,
        // Campo calculado para compatibilidad
        nombre: formData.tipoIdentificacion === 'DNI' 
          ? `${formData.nombres} ${formData.apellidos}`.trim()
          : formData.razonSocial || ''
      };

      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      let rawResult: unknown = null;
      try {
        rawResult = await response.json();
      } catch (e) {
        console.error('Respuesta no-JSON del servidor al crear cliente:', e);
      }

      const result = (rawResult && typeof rawResult === 'object') ? rawResult as Record<string, unknown> : null;

  if (!response.ok || !(result && result.success)) {
        const serverMessage = (result && (result.error || result.message)) || response.statusText || 'Error al crear el cliente';
        const detailsText = result && result.details ? ` (${JSON.stringify(result.details)})` : '';
        throw new Error(`${serverMessage}${detailsText}`);
      }

  // Éxito
      // Opcional: limpiar el formulario después de crear
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

      // Emit a global event so selects across the app can refresh immediately
      try {
        // Normalize server result without using `any`.
        const normalized = (result && typeof result === 'object') ? result as Record<string, unknown> : {};
        // Attempt to find created id in common locations: data.id or id
        let createdId: string | number | null = null;
        const dataField = normalized['data'];
        if (dataField && typeof dataField === 'object') {
          const dataObj = dataField as Record<string, unknown>;
          const idVal = dataObj['id'];
          if (typeof idVal === 'string' || typeof idVal === 'number') createdId = idVal as string | number;
        }
        if (createdId === null) {
          const idTop = normalized['id'];
          if (typeof idTop === 'string' || typeof idTop === 'number') createdId = idTop as string | number;
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('entity:created', { detail: { type: 'cliente', id: createdId } }));
        }
      } catch (err) {
        // Best-effort: don't block form success if event dispatch fails
        // Log to console for diagnostics
        // eslint-disable-next-line no-console
        console.error('Failed to dispatch entity:created event', err);
      }

      if (onSuccess) {
        // Give a small delay so callers can show success UI
        setTimeout(() => { onSuccess(); }, 1200);
      } else {
        setTimeout(() => { router.refresh(); }, 1200);
      }

    } catch (error) {
      console.error('Error al crear cliente:', error);
      setSubmitError(error instanceof Error ? error.message : 'Error inesperado al crear el cliente');
      
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-black">Crear Nuevo Cliente</h3>
        <p className="text-sm text-black mt-1">
          Complete los datos para registrar un nuevo cliente con autocompletado desde RENIEC/SUNAT
        </p>
      </div>

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
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg border-2 transition-all ${
                formData.tipoIdentificacion === 'DNI'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 bg-white text-black hover:border-gray-400'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="font-medium">DNI - Persona Natural</span>
            </button>
            <button
              type="button"
              onClick={() => handleTipoIdentificacionChange('RUC')}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg border-2 transition-all ${
                formData.tipoIdentificacion === 'RUC'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 bg-white text-black hover:border-gray-400'
              }`}
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
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black ${
                fieldErrors.numeroIdentificacion ? 'border-red-500' : 'border-gray-300'
              } ${autocompletedFields.has('numeroIdentificacion') ? 'bg-green-50' : 'bg-white'}`}
              placeholder={formData.tipoIdentificacion === 'DNI' ? '12345678' : '12345678901'}
              maxLength={11}
            />
            {lookupStatus === 'loading' && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            )}
          </div>
          
          {/* Estados de búsqueda */}
          <div className="mt-2 space-y-1">
            {lookupStatus === 'loading' && (
              <p className="text-sm text-blue-600 flex items-center">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Consultando {formData.tipoIdentificacion === 'DNI' ? 'RENIEC' : 'SUNAT'}...
              </p>
            )}
            
            {lookupStatus === 'success' && lookupSource && (
              <p className="text-sm text-green-600 flex items-center font-medium">
                <Check className="w-4 h-4 mr-2" />
                Datos obtenidos de {lookupSource}
              </p>
            )}
            
            {lookupStatus === 'error' && lookupError && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {lookupError}
              </p>
            )}
            
            {fieldErrors.numeroIdentificacion && (
              <p className="text-sm text-red-600">{fieldErrors.numeroIdentificacion}</p>
            )}
          </div>
        </div>

        {/* Campos específicos para Persona Natural (DNI) */}
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
                readOnly={formData.tipoIdentificacion === 'DNI' && autocompletedFields.has('nombres')}
                title={formData.tipoIdentificacion === 'DNI' && autocompletedFields.has('nombres') ? 'Campo autocompletado por RENIEC, no editable' : undefined}
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
                readOnly={formData.tipoIdentificacion === 'DNI' && autocompletedFields.has('apellidos')}
                title={formData.tipoIdentificacion === 'DNI' && autocompletedFields.has('apellidos') ? 'Campo autocompletado por RENIEC, no editable' : undefined}
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

        {/* Campos específicos para Persona Jurídica (RUC) */}
        {formData.tipoIdentificacion === 'RUC' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                placeholder="Nombre del representante"
              />
            </div>
          </div>
        )}

        {/* Campos de contacto */}
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
  {/* success message removed; UI shows inline or via onSuccess callback */}

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
              <>
                <Plus className="w-4 h-4" />
                <span>Crear Cliente</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}