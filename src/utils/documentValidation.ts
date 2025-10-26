/**
 * Utilidades para validación de documentos peruanos (DNI y RUC)
 * Incluye algoritmos de verificación checksum oficiales
 */

// Códigos válidos para el primer dígito del RUC en Perú
const VALID_RUC_PREFIXES = [10, 11, 15, 16, 17, 20];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  type?: 'DNI' | 'RUC';
}

/**
 * Valida si una cadena contiene solo dígitos
 */
export function isNumeric(value: string): boolean {
  return /^\d+$/.test(value);
}

/**
 * Sanitiza la entrada removiendo caracteres no numéricos
 */
export function sanitizeNumericInput(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Valida DNI peruano (8 dígitos)
 */
export function validateDNI(dni: string): ValidationResult {
  // Sanitizar entrada
  const cleanDNI = sanitizeNumericInput(dni);
  
  // Verificar longitud exacta
  if (cleanDNI.length !== 8) {
    return {
      isValid: false,
      error: 'El DNI debe tener exactamente 8 dígitos',
      type: 'DNI'
    };
  }

  // Verificar que no sean todos ceros o números repetidos
  if (/^0+$/.test(cleanDNI) || /^(\d)\1{7}$/.test(cleanDNI)) {
    return {
      isValid: false,
      error: 'DNI inválido: no puede ser todos ceros o números repetidos',
      type: 'DNI'
    };
  }

  // Verificar rango válido (10,000,000 - 99,999,999)
  const dniNumber = parseInt(cleanDNI, 10);
  if (dniNumber < 10000000 || dniNumber > 99999999) {
    return {
      isValid: false,
      error: 'DNI fuera del rango válido (10,000,000 - 99,999,999)',
      type: 'DNI'
    };
  }

  return {
    isValid: true,
    type: 'DNI'
  };
}

/**
 * Algoritmo de verificación de dígito checksum para RUC peruano
 */
function calculateRUCChecksum(ruc: string): number {
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 10; i++) {
    sum += parseInt(ruc[i], 10) * weights[i];
  }

  const remainder = sum % 11;
  const checkDigit = 11 - remainder;

  if (checkDigit === 10) return 0;
  if (checkDigit === 11) return 1;
  return checkDigit;
}

/**
 * Valida RUC peruano (11 dígitos con algoritmo checksum)
 */
export function validateRUC(ruc: string): ValidationResult {
  // Sanitizar entrada
  const cleanRUC = sanitizeNumericInput(ruc);
  
  // Verificar longitud exacta
  if (cleanRUC.length !== 11) {
    return {
      isValid: false,
      error: 'El RUC debe tener exactamente 11 dígitos',
      type: 'RUC'
    };
  }

  // Verificar que no sean todos ceros o números repetidos
  if (/^0+$/.test(cleanRUC) || /^(\d)\1{10}$/.test(cleanRUC)) {
    return {
      isValid: false,
      error: 'RUC inválido: no puede ser todos ceros o números repetidos',
      type: 'RUC'
    };
  }

  // Verificar prefijo válido (primeros 2 dígitos)
  const prefix = parseInt(cleanRUC.substring(0, 2), 10);
  if (!VALID_RUC_PREFIXES.includes(prefix)) {
    return {
      isValid: false,
      error: `RUC inválido: prefijo ${prefix} no es válido para Perú`,
      type: 'RUC'
    };
  }

  // Verificar dígito checksum
  const calculatedChecksum = calculateRUCChecksum(cleanRUC);
  const providedChecksum = parseInt(cleanRUC[10], 10);

  if (calculatedChecksum !== providedChecksum) {
    return {
      isValid: false,
      error: 'RUC inválido: dígito verificador incorrecto',
      type: 'RUC'
    };
  }

  return {
    isValid: true,
    type: 'RUC'
  };
}

/**
 * Valida documento automáticamente según su longitud
 */
export function validateDocument(document: string): ValidationResult {
  const cleanDocument = sanitizeNumericInput(document);
  
  if (cleanDocument.length === 0) {
    return {
      isValid: false,
      error: 'Documento requerido'
    };
  }

  if (cleanDocument.length === 8) {
    return validateDNI(cleanDocument);
  }

  if (cleanDocument.length === 11) {
    return validateRUC(cleanDocument);
  }

  return {
    isValid: false,
    error: 'Documento debe tener 8 dígitos (DNI) o 11 dígitos (RUC)'
  };
}

/**
 * Determina el tipo de documento basado en su longitud
 */
export function getDocumentType(document: string): 'DNI' | 'RUC' | null {
  const cleanDocument = sanitizeNumericInput(document);
  
  if (cleanDocument.length === 8) return 'DNI';
  if (cleanDocument.length === 11) return 'RUC';
  return null;
}

/**
 * Formatea un documento para mostrar (con separadores)
 */
export function formatDocument(document: string): string {
  const cleanDocument = sanitizeNumericInput(document);
  
  if (cleanDocument.length === 8) {
    // DNI: 12345678
    return cleanDocument;
  }
  
  if (cleanDocument.length === 11) {
    // RUC: 20123456789
    return cleanDocument;
  }
  
  return cleanDocument;
}

/**
 * Valida si un documento está completo y es válido
 */
export function isDocumentComplete(document: string): boolean {
  const validation = validateDocument(document);
  return validation.isValid;
}

/**
 * Obtiene el mensaje de error más específico para un documento
 */
export function getDocumentError(document: string): string | null {
  const validation = validateDocument(document);
  return validation.error || null;
}