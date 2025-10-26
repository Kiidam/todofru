/**
 * Utilidades para el manejo de datos de la API de Decolecta
 * Incluye mapeo de direcciones, validaciones y formateo de datos
 */

export interface DecolectaResponse {
  razon_social: string;
  numero_documento: string;
  estado: string;
  condicion: string;
  direccion: string;
  ubigeo: string;
  via_tipo: string;
  via_nombre: string;
  zona_codigo: string;
  zona_tipo: string;
  numero: string;
  interior: string;
  lote: string;
  dpto: string;
  manzana: string;
  kilometro: string;
  distrito: string;
  provincia: string;
  departamento: string;
  es_agente_retencion: boolean;
  es_buen_contribuyente: boolean;
  locales_anexos: any;
}

export interface MappedSupplierData {
  razonSocial: string;
  numeroDocumento: string;
  tipoIdentificacion: 'DNI' | 'RUC';
  tipoEntidad: 'PERSONA_NATURAL' | 'PERSONA_JURIDICA';
  estado: string;
  condicion: string;
  direccion: string;
  direccionCompleta: string;
  distrito: string;
  provincia: string;
  departamento: string;
  ubigeo: string;
  esAgenteRetencion: boolean;
  esBuenContribuyente: boolean;
  esActivo: boolean;
  esPersonaNatural: boolean;
}

/**
 * Valida el formato de un número de documento (DNI o RUC)
 */
export function validateDocumentNumber(numero: string): {
  isValid: boolean;
  type: 'DNI' | 'RUC' | null;
  formatted: string;
  errors: string[];
} {
  const errors: string[] = [];
  let isValid = true;
  let type: 'DNI' | 'RUC' | null = null;
  
  // Limpiar el número (solo dígitos)
  const cleaned = numero.replace(/\D/g, '');
  
  if (!cleaned) {
    errors.push('El número de documento es requerido');
    isValid = false;
  } else if (cleaned.length === 8) {
    type = 'DNI';
    // Validación básica de DNI
    if (!/^\d{8}$/.test(cleaned)) {
      errors.push('El DNI debe tener exactamente 8 dígitos');
      isValid = false;
    }
  } else if (cleaned.length === 11) {
    type = 'RUC';
    // Validación básica de RUC
    if (!/^\d{11}$/.test(cleaned)) {
      errors.push('El RUC debe tener exactamente 11 dígitos');
      isValid = false;
    }
    // Validar que comience con 10, 15, 17, 20
    const prefix = cleaned.substring(0, 2);
    if (!['10', '15', '17', '20'].includes(prefix)) {
      errors.push('El RUC debe comenzar con 10, 15, 17 o 20');
      isValid = false;
    }
  } else {
    errors.push('El documento debe tener 8 dígitos (DNI) o 11 dígitos (RUC)');
    isValid = false;
  }
  
  return {
    isValid,
    type,
    formatted: cleaned,
    errors
  };
}

/**
 * Construye una dirección completa a partir de los componentes de Decolecta
 */
export function buildCompleteAddress(data: DecolectaResponse): {
  direccionCompleta: string;
  direccionFormateada: string;
} {
  const components: string[] = [];
  
  // Tipo y nombre de vía
  if (data.via_tipo && data.via_nombre) {
    components.push(`${data.via_tipo} ${data.via_nombre}`);
  } else if (data.via_nombre) {
    components.push(data.via_nombre);
  }
  
  // Número
  if (data.numero && data.numero !== '-') {
    components.push(`NRO ${data.numero}`);
  }
  
  // Interior
  if (data.interior && data.interior !== '-') {
    components.push(`INT. ${data.interior}`);
  }
  
  // Departamento
  if (data.dpto && data.dpto !== '-') {
    components.push(`DPTO. ${data.dpto}`);
  }
  
  // Manzana
  if (data.manzana && data.manzana !== '-') {
    components.push(`MZ. ${data.manzana}`);
  }
  
  // Lote
  if (data.lote && data.lote !== '-') {
    components.push(`LT. ${data.lote}`);
  }
  
  // Kilómetro
  if (data.kilometro && data.kilometro !== '-') {
    components.push(`KM. ${data.kilometro}`);
  }
  
  // Zona
  if (data.zona_codigo && data.zona_tipo) {
    components.push(`${data.zona_codigo} ${data.zona_tipo}`);
  }
  
  const direccionCompleta = components.join(' ');
  
  // Dirección formateada con ubicación
  const ubicacion: string[] = [];
  if (data.distrito) ubicacion.push(data.distrito);
  if (data.provincia && data.provincia !== data.distrito) ubicacion.push(data.provincia);
  if (data.departamento && data.departamento !== data.provincia) ubicacion.push(data.departamento);
  
  const direccionFormateada = direccionCompleta + 
    (ubicacion.length > 0 ? ` - ${ubicacion.join(', ')}` : '');
  
  return {
    direccionCompleta,
    direccionFormateada
  };
}

/**
 * Determina si es persona natural basado en el RUC
 */
export function isPersonaNatural(ruc: string): boolean {
  if (ruc.length !== 11) return false;
  const prefix = ruc.substring(0, 2);
  return prefix === '10'; // RUCs que empiezan con 10 son personas naturales
}

/**
 * Mapea los datos de Decolecta al formato interno del sistema
 */
export function mapDecolectaToSupplier(data: DecolectaResponse): MappedSupplierData {
  const validation = validateDocumentNumber(data.numero_documento);
  const { direccionCompleta, direccionFormateada } = buildCompleteAddress(data);
  const esPersonaNatural = validation.type === 'RUC' ? isPersonaNatural(data.numero_documento) : true;
  
  return {
    razonSocial: data.razon_social || '',
    numeroDocumento: validation.formatted,
    tipoIdentificacion: validation.type || 'RUC',
    tipoEntidad: esPersonaNatural ? 'PERSONA_NATURAL' : 'PERSONA_JURIDICA',
    estado: data.estado || '',
    condicion: data.condicion || '',
    direccion: direccionCompleta,
    direccionCompleta: direccionFormateada,
    distrito: data.distrito || '',
    provincia: data.provincia || '',
    departamento: data.departamento || '',
    ubigeo: data.ubigeo || '',
    esAgenteRetencion: data.es_agente_retencion || false,
    esBuenContribuyente: data.es_buen_contribuyente || false,
    esActivo: data.estado === 'ACTIVO' && data.condicion === 'HABIDO',
    esPersonaNatural
  };
}

/**
 * Valida que los datos mapeados estén completos
 */
export function validateMappedData(data: MappedSupplierData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validaciones obligatorias
  if (!data.razonSocial) {
    errors.push('Razón social es requerida');
  }
  
  if (!data.numeroDocumento) {
    errors.push('Número de documento es requerido');
  }
  
  if (!data.estado) {
    warnings.push('Estado no disponible');
  }
  
  if (!data.condicion) {
    warnings.push('Condición no disponible');
  }
  
  if (!data.direccion) {
    warnings.push('Dirección no disponible');
  }
  
  // Validaciones de estado
  if (!data.esActivo) {
    warnings.push(`Contribuyente ${data.estado || 'INACTIVO'} - ${data.condicion || 'NO HABIDO'}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Formatea un número de documento para mostrar
 */
export function formatDocumentForDisplay(numero: string, tipo: 'DNI' | 'RUC'): string {
  const cleaned = numero.replace(/\D/g, '');
  
  if (tipo === 'DNI' && cleaned.length === 8) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
  }
  
  if (tipo === 'RUC' && cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1.$2.$3.$4');
  }
  
  return cleaned;
}

/**
 * Extrae nombres y apellidos de la razón social para personas naturales
 */
export function extractNamesFromRazonSocial(razonSocial: string): {
  nombres: string;
  apellidos: string;
} {
  // Para personas naturales, la razón social suele estar en formato:
  // "APELLIDO1 APELLIDO2 NOMBRES" o "APELLIDOS, NOMBRES"
  
  const parts = razonSocial.trim().split(/\s+/);
  
  if (parts.length >= 3) {
    // Asumir que los primeros 2 son apellidos y el resto nombres
    const apellidos = parts.slice(0, 2).join(' ');
    const nombres = parts.slice(2).join(' ');
    return { nombres, apellidos };
  } else if (parts.length === 2) {
    // Solo 2 partes, asumir que la primera es apellido
    return { nombres: parts[1], apellidos: parts[0] };
  } else {
    // Solo una parte, ponerla como nombres
    return { nombres: razonSocial, apellidos: '' };
  }
}