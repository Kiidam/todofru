async function testAPI() {
  try {
    console.log('Probando API de inventarios...\n');
    
    // Test 1: Obtener productos
    console.log('1. Obteniendo productos...');
    const productosResponse = await fetch('http://localhost:3000/api/inventarios?action=productos');
    
    if (!productosResponse.ok) {
      throw new Error(`HTTP ${productosResponse.status}: ${productosResponse.statusText}`);
    }
    
    const productos = await productosResponse.json();
    console.log(`✓ Productos obtenidos: ${productos.length} productos`);
    console.log('Primer producto:', productos[0] ? productos[0].nombre : 'No hay productos');
    
    // Test 2: Obtener movimientos
    console.log('\n2. Obteniendo movimientos...');
    const movimientosResponse = await fetch('http://localhost:3000/api/inventarios?action=movimientos');
    const movimientos = await movimientosResponse.json();
    console.log(`✓ Movimientos obtenidos: ${movimientos.length} movimientos`);
    console.log('Primer movimiento:', movimientos[0] ? `${movimientos[0].tipoMovimiento} - ${movimientos[0].cantidad}` : 'No hay movimientos');
    
    // Test 3: Obtener validación de sincronización
    console.log('\n3. Obteniendo validación de sincronización...');
    const syncResponse = await fetch('http://localhost:3000/api/inventarios?action=sync-validation');
    const syncData = await syncResponse.json();
    console.log(`✓ Validación obtenida: ${syncData.length} resultados`);
    
    // Test 4: Obtener estadísticas
    console.log('\n4. Obteniendo estadísticas...');
    const statsResponse = await fetch('http://localhost:3000/api/inventarios?action=estadisticas');
    const stats = await statsResponse.json();
    console.log('✓ Estadísticas obtenidas:', stats);
    
    console.log('\n🎉 Todas las pruebas de API completadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en prueba de API:', error.message);
    process.exit(1);
  }
}

testAPI();