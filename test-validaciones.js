// Script de prueba para validaciones de RUC/DNI y direcciones

// Simular las funciones de validación
class ValidacionesService {
  
  /**
   * Valida formato de RUC (11 dígitos)
   */
  static validarRUC(ruc) {
    if (!ruc) {
      return { valido: false, mensaje: 'RUC es obligatorio' };
    }

    // Remover espacios y caracteres no numéricos
    const rucLimpio = ruc.replace(/\D/g, '');

    if (rucLimpio.length !== 11) {
      return { valido: false, mensaje: 'RUC debe tener 11 dígitos' };
    }

    // Validar que no sean todos ceros o números repetidos
    if (/^0+$/.test(rucLimpio) || /^(\d)\1{10}$/.test(rucLimpio)) {
      return { valido: false, mensaje: 'RUC no válido' };
    }

    // Validar dígito verificador usando algoritmo oficial
    const digitos = rucLimpio.split('').map(Number);
    const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    
    let suma = 0;
    for (let i = 0; i < 10; i++) {
      suma += digitos[i] * factores[i];
    }
    
    const resto = suma % 11;
    const digitoVerificador = resto < 2 ? resto : 11 - resto;
    
    if (digitoVerificador !== digitos[10]) {
      return { valido: false, mensaje: 'RUC no válido (dígito verificador incorrecto)' };
    }

    return { valido: true };
  }

  /**
   * Valida formato de DNI (8 dígitos)
   */
  static validarDNI(dni) {
    if (!dni) {
      return { valido: false, mensaje: 'DNI es obligatorio' };
    }

    // Remover espacios y caracteres no numéricos
    const dniLimpio = dni.replace(/\D/g, '');

    if (dniLimpio.length !== 8) {
      return { valido: false, mensaje: 'DNI debe tener 8 dígitos' };
    }

    // Validar que no sean todos ceros o números repetidos
    if (/^0+$/.test(dniLimpio) || /^(\d)\1{7}$/.test(dniLimpio)) {
      return { valido: false, mensaje: 'DNI no válido' };
    }

    // Validar rango válido (DNI peruano)
    const numero = parseInt(dniLimpio);
    if (numero < 1000000 || numero > 99999999) {
      return { valido: false, mensaje: 'DNI fuera del rango válido' };
    }

    return { valido: true };
  }

  /**
   * Valida dirección física (que sea una dirección real)
   */
  static validarDireccionFisica(direccion) {
    if (!direccion || direccion.trim().length === 0) {
      return { valida: false, mensaje: 'Dirección es obligatoria' };
    }

    const direccionLimpia = direccion.toLowerCase().trim();

    // Patrones que indican una dirección física válida
    const patronesValidos = [
      /\b(av|avenida|jr|jirón|calle|ca|psje|pasaje|mz|manzana|lt|lote|urb|urbanización|pueblo|villa|sector|zona)\b/,
      /\d+/, // Debe tener al menos un número
      /\b(cuadra|cdra|km|kilómetro|metro|mts)\b/
    ];

    // Verificar que tenga al menos algunos patrones válidos
    const patronesEncontrados = patronesValidos.filter(patron => patron.test(direccionLimpia));
    
    if (patronesEncontrados.length < 2) {
      return { 
        valida: false, 
        mensaje: 'La dirección debe incluir información específica (calle, número, urbanización, etc.)' 
      };
    }

    // Patrones que indican direcciones no válidas
    const patronesInvalidos = [
      /\b(sin dirección|no tiene|n\/a|ninguna|no aplica|sin datos|desconocido|no especifica)\b/,
      /^[.\-\s]*$/, // Solo puntos, guiones o espacios
      /^(x+|z+|a+|1+|0+)$/i // Caracteres repetidos
    ];

    if (patronesInvalidos.some(patron => patron.test(direccionLimpia))) {
      return { valida: false, mensaje: 'Ingrese una dirección específica válida' };
    }

    return { valida: true };
  }
}

// Casos de prueba
console.log('=== PRUEBAS DE VALIDACIÓN ===\n');

// Pruebas de RUC
console.log('--- Pruebas de RUC ---');
const casosRUC = [
  '20123456789', // RUC válido ejemplo
  '10123456789', // RUC válido ejemplo
  '1234567890',  // 10 dígitos (inválido)
  '123456789012', // 12 dígitos (inválido)
  '00000000000', // Todos ceros (inválido)
  '11111111111', // Números repetidos (inválido)
  '20123456788', // Dígito verificador incorrecto
  '', // Vacío
];

casosRUC.forEach(ruc => {
  const resultado = ValidacionesService.validarRUC(ruc);
  console.log(`RUC: "${ruc}" -> ${resultado.valido ? 'VÁLIDO' : 'INVÁLIDO'} ${resultado.mensaje || ''}`);
});

// Pruebas de DNI
console.log('\n--- Pruebas de DNI ---');
const casosDNI = [
  '12345678', // DNI válido ejemplo
  '87654321', // DNI válido ejemplo
  '1234567',  // 7 dígitos (inválido)
  '123456789', // 9 dígitos (inválido)
  '00000000', // Todos ceros (inválido)
  '11111111', // Números repetidos (inválido)
  '99999999', // Límite superior válido
  '10000000', // Límite inferior válido
  '00999999', // Fuera del rango (inválido)
  '', // Vacío
];

casosDNI.forEach(dni => {
  const resultado = ValidacionesService.validarDNI(dni);
  console.log(`DNI: "${dni}" -> ${resultado.valido ? 'VÁLIDO' : 'INVÁLIDO'} ${resultado.mensaje || ''}`);
});

// Pruebas de direcciones
console.log('\n--- Pruebas de Direcciones ---');
const casosDirecciones = [
  'Av. Javier Prado Este 123, Urb. Los Jardines', // Válida
  'Jr. Comercio 456, Mz. A Lt. 5', // Válida
  'Calle Las Flores 789, San Isidro', // Válida
  'Av. Industrial 321, Km. 5.5', // Válida
  'Casa sin número', // Inválida (sin número)
  'Sin dirección', // Inválida (texto genérico)
  'N/A', // Inválida (texto genérico)
  'Avenida', // Inválida (incompleta)
  '', // Vacía
  'Av. Principal 123', // Válida (mínima)
];

casosDirecciones.forEach(direccion => {
  const resultado = ValidacionesService.validarDireccionFisica(direccion);
  console.log(`Dirección: "${direccion}" -> ${resultado.valida ? 'VÁLIDA' : 'INVÁLIDA'} ${resultado.mensaje || ''}`);
});

console.log('\n=== FIN DE PRUEBAS ===');