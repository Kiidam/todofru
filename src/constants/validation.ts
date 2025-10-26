/**
 * Constantes de validación compartidas entre formularios
 * Estas constantes aseguran consistencia en las validaciones
 * entre proveedores y clientes
 */

export const VALIDATION_CONSTANTS = {
  // Longitudes de identificación
  DNI_LENGTH: 8,
  RUC_LENGTH: 11,
  
  // Longitudes mínimas y máximas de campos
  NOMBRES: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  
  APELLIDOS: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  
  RAZON_SOCIAL: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 200,
  },
  
  DIRECCION: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 200,
  },
  
  EMAIL: {
    MAX_LENGTH: 100,
  },
  
  TELEFONO: {
    MIN_LENGTH: 7,
    MAX_LENGTH: 20,
  },
  
  CONTACTO: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  
  REPRESENTANTE_LEGAL: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  
  MENSAJE_PERSONALIZADO: {
    MAX_LENGTH: 500,
  },
  
  // Patrones de validación
  PATTERNS: {
    // Solo números para DNI/RUC
    NUMERIC_ONLY: /^\d+$/,
    
    // Email básico
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    
    // Teléfono (permite números, espacios, guiones, paréntesis y +)
    PHONE: /^[\d\s\-\(\)\+]+$/,
    
    // Solo letras y espacios para nombres
    NAMES_ONLY: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
    
    // Texto general (letras, números, espacios y algunos símbolos)
    GENERAL_TEXT: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\.\,\-\(\)]+$/,
  },
  
  // Expresiones regulares (mantenidas para compatibilidad)
  DNI_REGEX: /^\d{8}$/,
  RUC_REGEX: /^\d{11}$/,
  PHONE_REGEX: /^[+]?[\d\s\-\(\)]{7,15}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Mensajes de error estándar
  ERROR_MESSAGES: {
    REQUIRED: 'Este campo es obligatorio',
    INVALID_FORMAT: 'Formato inválido',
    TOO_SHORT: (min: number) => `Debe tener al menos ${min} caracteres`,
    TOO_LONG: (max: number) => `No puede exceder ${max} caracteres`,
    INVALID_EMAIL: 'Ingrese un email válido',
    INVALID_PHONE: 'Ingrese un teléfono válido',
    INVALID_DNI: 'El DNI debe tener exactamente 8 dígitos',
    INVALID_RUC: 'El RUC debe tener exactamente 11 dígitos',
    INVALID_IDENTIFICATION: 'Ingrese un DNI (8 dígitos) o RUC (11 dígitos) válido',
    ONLY_LETTERS: 'Solo se permiten letras y espacios',
    ONLY_NUMBERS: 'Solo se permiten números',
    
    // Mensajes legacy (mantenidos para compatibilidad)
    DNI_INVALID_LENGTH: 'DNI debe tener exactamente 8 dígitos',
    RUC_INVALID_LENGTH: 'RUC debe tener exactamente 11 dígitos',
    DNI_INVALID_FORMAT: 'DNI debe contener solo números',
    RUC_INVALID_FORMAT: 'RUC debe contener solo números',
    PHONE_INVALID: 'Número de teléfono inválido',
    EMAIL_INVALID: 'Email inválido',
    REQUIRED_FIELD: 'Este campo es requerido'
  },
  
  // Configuración de debounce
  DEBOUNCE: {
    VALIDATION_DELAY: 300, // ms para validación de campos
    API_LOOKUP_DELAY: 800,  // ms para consultas a API externa
  },
  
  // Configuración de API
  API: {
    TIMEOUT: 10000, // 10 segundos
    RETRY_ATTEMPTS: 3,
  },
} as const;

// Funciones de validación reutilizables (mantenidas para compatibilidad)
export const validateDNI = (dni: string): boolean => {
  return VALIDATION_CONSTANTS.DNI_REGEX.test(dni.replace(/\D/g, ''));
};

export const validateRUC = (ruc: string): boolean => {
  return VALIDATION_CONSTANTS.RUC_REGEX.test(ruc.replace(/\D/g, ''));
};

export const validatePhone = (phone: string): boolean => {
  return VALIDATION_CONSTANTS.PHONE_REGEX.test(phone);
};

export const validateEmail = (email: string): boolean => {
  return VALIDATION_CONSTANTS.EMAIL_REGEX.test(email);
};

/**
 * Función para validar DNI
 */
export function validarDNI(dni: string): boolean {
  if (!dni || dni.length !== VALIDATION_CONSTANTS.DNI_LENGTH) {
    return false;
  }
  
  return VALIDATION_CONSTANTS.PATTERNS.NUMERIC_ONLY.test(dni);
}

/**
 * Función para validar RUC básico
 */
export function validarRUC(ruc: string): boolean {
  if (!ruc || ruc.length !== VALIDATION_CONSTANTS.RUC_LENGTH) {
    return false;
  }
  
  return VALIDATION_CONSTANTS.PATTERNS.NUMERIC_ONLY.test(ruc);
}

/**
 * Función para validar email
 */
export function validarEmail(email: string): boolean {
  if (!email) return true; // Email es opcional
  
  return VALIDATION_CONSTANTS.PATTERNS.EMAIL.test(email) && 
         email.length <= VALIDATION_CONSTANTS.EMAIL.MAX_LENGTH;
}

/**
 * Función para validar teléfono
 */
export function validarTelefono(telefono: string): boolean {
  if (!telefono) return true; // Teléfono es opcional
  
  const cleanPhone = telefono.replace(/\s/g, '');
  return VALIDATION_CONSTANTS.PATTERNS.PHONE.test(telefono) &&
         cleanPhone.length >= VALIDATION_CONSTANTS.TELEFONO.MIN_LENGTH &&
         cleanPhone.length <= VALIDATION_CONSTANTS.TELEFONO.MAX_LENGTH;
}

/**
 * Función para limpiar y formatear número de identificación
 */
export function limpiarNumeroIdentificacion(numero: string): string {
  return numero.replace(/\D/g, '').slice(0, VALIDATION_CONSTANTS.RUC_LENGTH);
}

/**
 * Función para determinar el tipo de documento basado en la longitud
 */
export function determinarTipoDocumento(numero: string): 'DNI' | 'RUC' | null {
  const cleanNumber = limpiarNumeroIdentificacion(numero);
  
  if (cleanNumber.length === VALIDATION_CONSTANTS.DNI_LENGTH) {
    return 'DNI';
  } else if (cleanNumber.length === VALIDATION_CONSTANTS.RUC_LENGTH) {
    return 'RUC';
  }
  
  return null;
}

/**
 * Función para validar que un texto contenga solo letras y espacios
 */
export function validarSoloLetras(texto: string): boolean {
  return VALIDATION_CONSTANTS.PATTERNS.NAMES_ONLY.test(texto);
}

/**
 * Función para validar longitud de texto
 */
export function validarLongitud(
  texto: string, 
  minLength: number, 
  maxLength: number
): { valido: boolean; mensaje?: string } {
  if (texto.length < minLength) {
    return {
      valido: false,
      mensaje: VALIDATION_CONSTANTS.ERROR_MESSAGES.TOO_SHORT(minLength)
    };
  }
  
  if (texto.length > maxLength) {
    return {
      valido: false,
      mensaje: VALIDATION_CONSTANTS.ERROR_MESSAGES.TOO_LONG(maxLength)
    };
  }
  
  return { valido: true };
}

/**
 * Función para sanitizar texto general
 */
export function sanitizarTexto(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ');
}

/**
 * Función para capitalizar primera letra de cada palabra
 */
export function capitalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}