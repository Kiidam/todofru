// Script de prueba para verificar el servicio de Decolecta desde el cliente
// Este script simula las llamadas que hace el hook useSupplierAutocomplete

const testDecolectaService = async () => {
  console.log('🔍 Probando servicio de Decolecta...\n');
  
  // Configuración
  const baseUrl = 'https://api.decolecta.pe';
  const apiToken = 'sk_11221.I28KPPxodUzjpFQpmZL6kq699UsuP1ev';
  
  // Números de prueba (usando RUCs reales para la prueba)
  const testNumbers = [
    { numero: '20100070970', tipo: 'RUC', endpoint: '/sunat/ruc', param: 'ruc' }, // Supermercados Peruanos
    { numero: '20131312955', tipo: 'RUC', endpoint: '/sunat/ruc', param: 'ruc' }  // Saga Falabella
  ];
  
  for (const test of testNumbers) {
    console.log(`📋 Probando ${test.tipo}: ${test.numero}`);
    
    try {
      const url = `${baseUrl}${test.endpoint}?${test.param}=${test.numero}`;
      console.log(`🌐 URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        }
      });
      
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Respuesta exitosa:');
        console.log(`   Razón Social: ${data.razon_social || 'N/A'}`);
        console.log(`   Estado: ${data.estado || 'N/A'}`);
        console.log(`   Dirección: ${data.direccion || 'N/A'}`);
      } else {
        const errorText = await response.text();
        console.log('❌ Error:', errorText);
      }
      
    } catch (error) {
      console.log('💥 Error de red:', error.message);
      
      // Intentar con URL alternativa
      console.log('🔄 Probando URL alternativa...');
      try {
        const altUrl = `https://api.decolecta.com/v1${test.endpoint}?${test.param}=${test.numero}`;
        console.log(`🌐 URL alternativa: ${altUrl}`);
        
        const altResponse = await fetch(altUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`
          }
        });
        
        console.log(`📊 Status alternativo: ${altResponse.status} ${altResponse.statusText}`);
        
        if (altResponse.ok) {
          const data = await altResponse.json();
          console.log('✅ Respuesta exitosa con URL alternativa:');
          console.log(`   Razón Social: ${data.razon_social || 'N/A'}`);
        } else {
          const errorText = await altResponse.text();
          console.log('❌ Error con URL alternativa:', errorText);
        }
      } catch (altError) {
        console.log('💥 Error también con URL alternativa:', altError.message);
      }
    }
    
    console.log('---\n');
  }
};

// Ejecutar si estamos en Node.js
if (typeof window === 'undefined') {
  testDecolectaService();
}

// Exportar para uso en el navegador
if (typeof window !== 'undefined') {
  window.testDecolectaService = testDecolectaService;
}