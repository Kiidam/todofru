// Script para probar la API de proveedores y diagnosticar problemas de autenticación
const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          text: () => Promise.resolve(data),
          json: () => Promise.resolve(JSON.parse(data)),
          ok: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function testProveedoresAPI() {
  console.log('=== DIAGNÓSTICO DE API DE PROVEEDORES ===\n');

  try {
    // Test 1: Probar API sin autenticación
    console.log('1. Probando API sin autenticación...');
    const response1 = await makeRequest('/api/proveedores');
    console.log(`   Status: ${response1.status}`);
    console.log(`   Status Text: ${response1.statusText}`);
    
    if (response1.status === 401) {
      console.log('   ❌ Error 401: API requiere autenticación');
      const errorText = await response1.text();
      console.log(`   Error: ${errorText}`);
    } else if (response1.ok) {
      const data = await response1.json();
      console.log('   ✅ API responde correctamente');
      console.log(`   Proveedores encontrados: ${data.data?.length || 0}`);
    }

    // Test 2: Verificar endpoint de autenticación
    console.log('\n2. Verificando endpoint de autenticación...');
    const authResponse = await makeRequest('/api/auth/session');
    console.log(`   Auth Status: ${authResponse.status}`);
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('   ✅ Endpoint de autenticación disponible');
      console.log(`   Usuario autenticado: ${authData.user ? 'Sí' : 'No'}`);
    } else {
      console.log('   ❌ Problema con endpoint de autenticación');
    }

    // Test 3: Verificar si hay cookies de sesión
    console.log('\n3. Verificando cookies de sesión...');
    const cookieHeader = authResponse.headers['set-cookie'];
    if (cookieHeader) {
      console.log('   ✅ Cookies de sesión encontradas');
      console.log(`   Cookies: ${cookieHeader}`);
    } else {
      console.log('   ⚠️  No se encontraron cookies de sesión');
    }

    // Test 4: Verificar estructura de respuesta de error
    console.log('\n4. Analizando estructura de respuesta de error...');
    try {
      const errorData = await response1.json();
      console.log('   Estructura del error:', JSON.stringify(errorData, null, 2));
    } catch (e) {
      console.log('   Error no es JSON válido');
    }

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
  }
}

// Ejecutar las pruebas
testProveedoresAPI().catch(console.error);