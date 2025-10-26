/**
 * Script de prueba para verificar que el endpoint RUC funciona correctamente
 * desde el formulario web de clientes
 */

const testRUCs = [
  '20601030013', // REXTIE S.A.C.
  '20100070970', // SUPERMERCADOS PERUANOS SOCIEDAD ANONIMA
  '46027897',    // DNI de persona natural
  '20123456789', // RUC inactivo (mock)
  '20999999999'  // RUC no encontrado (mock)
];

async function testRUCEndpoint() {
  console.log('🧪 Iniciando pruebas del endpoint RUC...\n');
  
  for (const ruc of testRUCs) {
    try {
      console.log(`📋 Probando ${ruc.length === 8 ? 'DNI' : 'RUC'}: ${ruc}`);
      
      const response = await fetch(`http://localhost:3004/api/clientes/ruc?ruc=${ruc}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log(`✅ Éxito: ${data.data.razonSocial || 'Sin razón social'}`);
        console.log(`   📍 Dirección: ${data.data.direccion || 'Sin dirección'}`);
        console.log(`   🏢 Tipo: ${data.data.tipoContribuyente || 'Sin tipo'}`);
        if (data.data.estado) {
          console.log(`   📊 Estado: ${data.data.estado} - ${data.data.condicion || 'Sin condición'}`);
        }
      } else {
        console.log(`❌ Error: ${data.error || 'Error desconocido'}`);
      }
      
    } catch (error) {
      console.log(`💥 Error de conexión: ${error.message}`);
    }
    
    console.log(''); // Línea en blanco
  }
  
  console.log('🎉 Pruebas completadas!');
}

// Ejecutar las pruebas
testRUCEndpoint().catch(console.error);