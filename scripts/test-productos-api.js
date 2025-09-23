async function testProductosAPI() {
  try {
    console.log('Probando API de productos...\n');
    
    // Test: Obtener productos
    console.log('1. Obteniendo productos desde /api/productos...');
    const response = await fetch('http://localhost:3000/api/productos?limit=10');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ API exitosa: ${data.data.length} productos encontrados`);
      console.log(`📊 Total en BD: ${data.pagination?.total || 'N/A'} productos`);
      
      console.log('\nPrimeros productos de la API:');
      data.data.slice(0, 3).forEach((producto, index) => {
        console.log(`${index + 1}. ${producto.nombre} (${producto.sku || 'Sin SKU'})`);
        console.log(`   Stock: ${producto.stock} | Precio: S/ ${producto.precio}`);
        console.log(`   Categoría: ${producto.categoria?.nombre || 'N/A'}`);
      });
    } else {
      console.log('❌ API devolvió error:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Error en prueba de API:', error.message);
  }
}

testProductosAPI();