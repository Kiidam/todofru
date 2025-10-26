// Script de prueba para verificar la configuración de Decolecta
require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.DECOLECTA_BASE_URL || 'https://api.decolecta.pe';
const API_TOKEN = process.env.DECOLECTA_API_TOKEN || '';

console.log('🔍 Verificando configuración de Decolecta...\n');

// 1. Verificar variables de entorno
console.log('📋 Variables de entorno:');
console.log(`DECOLECTA_BASE_URL: ${BASE_URL}`);
console.log(`DECOLECTA_API_TOKEN: ${API_TOKEN ? '✅ Configurado' : '❌ NO CONFIGURADO'}`);
console.log(`DECOLECTA_SUNAT_URL: ${process.env.DECOLECTA_SUNAT_URL || '/sunat/ruc (default)'}`);
console.log(`DECOLECTA_RENIEC_URL: ${process.env.DECOLECTA_RENIEC_URL || '/reniec/dni (default)'}\n`);

if (!API_TOKEN) {
  console.log('❌ ERROR: DECOLECTA_API_TOKEN no está configurado en .env.local');
  console.log('📝 Solución: Agrega tu token de Decolecta en el archivo .env.local');
  process.exit(1);
}

// 2. Verificar conectividad al servicio
async function testConnectivity() {
  console.log('🌐 Probando conectividad al servicio...');
  
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Accept': 'application/json',
      },
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('✅ Servicio disponible');
    } else {
      console.log('⚠️ Servicio responde pero con error');
      const text = await response.text();
      console.log('Respuesta:', text);
    }
  } catch (error) {
    console.log('❌ Error de conectividad:', error.message);
  }
}

// 3. Probar consulta DNI de prueba
async function testDNI() {
  console.log('\n🆔 Probando consulta DNI...');
  const testDNI = '12345678'; // DNI de prueba
  
  try {
    const endpoint = process.env.DECOLECTA_RENIEC_URL || '/reniec/dni';
    const url = `${BASE_URL}${endpoint}?dni=${testDNI}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Accept': 'application/json',
      },
    });
    
    console.log(`DNI Test - Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Consulta DNI exitosa');
      console.log('Respuesta:', JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('⚠️ Error en consulta DNI:', text);
    }
  } catch (error) {
    console.log('❌ Error en consulta DNI:', error.message);
  }
}

// 4. Probar consulta RUC de prueba
async function testRUC() {
  console.log('\n🏢 Probando consulta RUC...');
  const testRUC = '20123456789'; // RUC de prueba
  
  try {
    const endpoint = process.env.DECOLECTA_SUNAT_URL || '/sunat/ruc';
    const url = `${BASE_URL}${endpoint}?ruc=${testRUC}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Accept': 'application/json',
      },
    });
    
    console.log(`RUC Test - Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Consulta RUC exitosa');
      console.log('Respuesta:', JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('⚠️ Error en consulta RUC:', text);
    }
  } catch (error) {
    console.log('❌ Error en consulta RUC:', error.message);
  }
}

// Ejecutar todas las pruebas
async function runTests() {
  await testConnectivity();
  await testDNI();
  await testRUC();
  
  console.log('\n✅ Pruebas completadas');
  console.log('\n📝 Notas importantes:');
  console.log('- Si ves errores 401/403: Verifica que tu token sea válido y tenga permisos');
  console.log('- Si ves errores de conectividad: Verifica tu conexión a internet');
  console.log('- Los DNI/RUC de prueba pueden no existir en la base de datos real');
}

runTests().catch(console.error);