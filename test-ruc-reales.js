// Prueba con RUCs reales válidos conocidos

// Función de validación de RUC
function validarRUC(ruc) {
  if (!ruc) {
    return { valido: false, mensaje: 'RUC es obligatorio' };
  }

  const rucLimpio = ruc.replace(/\D/g, '');

  if (rucLimpio.length !== 11) {
    return { valido: false, mensaje: 'RUC debe tener 11 dígitos' };
  }

  if (/^0+$/.test(rucLimpio) || /^(\d)\1{10}$/.test(rucLimpio)) {
    return { valido: false, mensaje: 'RUC no válido' };
  }

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

// RUCs reales válidos conocidos (empresas públicas y conocidas)
const rucsValidos = [
  '20100070970', // Banco de Crédito del Perú
  '20100017491', // Telefónica del Perú
  '20131312955', // Supermercados Peruanos S.A.
  '20100128218', // Saga Falabella S.A.
  '20100047218', // Ripley Corp S.A.
  '20100130204', // Cencosud Retail Perú S.A.
];

console.log('=== PRUEBAS CON RUCs REALES VÁLIDOS ===\n');

rucsValidos.forEach(ruc => {
  const resultado = validarRUC(ruc);
  console.log(`RUC: ${ruc} -> ${resultado.valido ? '✅ VÁLIDO' : '❌ INVÁLIDO'} ${resultado.mensaje || ''}`);
});

// Generar algunos RUCs válidos para pruebas
console.log('\n=== GENERANDO RUCs VÁLIDOS PARA PRUEBAS ===\n');

function generarRUCValido(prefijo = '20') {
  // Generar 8 dígitos aleatorios después del prefijo (total 10 dígitos)
  let ruc = prefijo;
  for (let i = 0; i < 8; i++) {
    ruc += Math.floor(Math.random() * 10);
  }
  
  // Calcular dígito verificador
  const digitos = ruc.split('').map(Number);
  const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  
  let suma = 0;
  for (let i = 0; i < 10; i++) {
    suma += digitos[i] * factores[i];
  }
  
  const resto = suma % 11;
  const digitoVerificador = resto < 2 ? resto : 11 - resto;
  
  return ruc + digitoVerificador;
}

// Generar algunos RUCs válidos para pruebas
for (let i = 0; i < 5; i++) {
  const rucGenerado = generarRUCValido('20');
  const validacion = validarRUC(rucGenerado);
  console.log(`RUC generado: ${rucGenerado} -> ${validacion.valido ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
}

console.log('\n=== FIN DE PRUEBAS ===');