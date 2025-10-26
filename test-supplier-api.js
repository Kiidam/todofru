// Script de prueba para verificar la API de proveedores
// Usar fetch nativo de Node.js (disponible desde v18)

const BASE_URL = 'http://localhost:3000';

async function testRUC(ruc, description) {
  console.log(`\n🔍 Probando ${description}: ${ruc}`);
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(`${BASE_URL}/api/proveedores/ruc?ruc=${ruc}`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Éxito:', data.data.razonSocial || data.data.nombres);
      console.log('📋 Tipo:', data.data.tipoContribuyente);
      console.log('🏢 Es Persona Natural:', data.data.esPersonaNatural ? 'Sí' : 'No');
      
      if (data.data.esPersonaNatural) {
        console.log('👤 Nombres:', data.data.nombres);
        if (data.raw) {
          console.log('📝 Apellidos:', `${data.raw.first_last_name || ''} ${data.raw.second_last_name || ''}`.trim());
        }
      } else {
        console.log('🏢 Razón Social:', data.data.razonSocial);
      }
      
      console.log('📍 Dirección:', data.data.direccion || 'No disponible');
      console.log('✅ Estado:', data.data.esActivo !== false ? 'Activo' : 'Inactivo');
    } else {
      console.log('❌ Error:', data.error || 'No se encontraron datos');
    }
  } catch (error) {
    console.log('💥 Error de conexión:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Iniciando pruebas de la API de proveedores...\n');
  
  // Probar RUCs que sabemos que funcionan
  await testRUC('72156778', 'Persona Natural con RUC');
  await testRUC('74216474', 'Persona Natural con RUC');
  
  // Probar RUCs que no existen
  await testRUC('20370146994', 'RUC que no existe');
  await testRUC('12345678', 'DNI de prueba');
  
  console.log('\n✨ Pruebas completadas');
}

runTests().catch(console.error);