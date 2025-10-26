async function testAPI() {
  try {
    console.log('Probando API de inventarios...\n');
    const headers = { 'X-Test-Bypass-Auth': '1' };
    
    // Test 1: Obtener productos
    console.log('1. Obteniendo productos...');
    const productosResponse = await fetch('http://localhost:3001/api/inventario?action=productos', { headers });
    
    if (!productosResponse.ok) {
      throw new Error(`HTTP ${productosResponse.status}: ${productosResponse.statusText}`);
    }
    
    const productosData = await productosResponse.json();
    const productos = productosData.productos || productosData.data || [];
    console.log(`✓ Productos obtenidos: ${productos.length} productos`);
    console.log('Primer producto:', productos[0] ? productos[0].nombre : 'No hay productos');
    
    // Test 2: Obtener movimientos
    console.log('\n2. Obteniendo movimientos...');
    const movimientosResponse = await fetch('http://localhost:3001/api/inventario?action=movimientos', { headers });
    const movimientosData = await movimientosResponse.json();
    const movimientos = movimientosData.movimientos || [];
    console.log(`✓ Movimientos obtenidos: ${movimientos.length} movimientos`);
    console.log('Primer movimiento:', movimientos[0] ? `${movimientos[0].tipo} - ${movimientos[0].cantidad}` : 'No hay movimientos');
    
    // Test 3: Obtener validación de sincronización
    console.log('\n3. Obteniendo validación de sincronización...');
    const syncResponse = await fetch('http://localhost:3001/api/inventario?action=sync-validation', { headers });
    const syncData = await syncResponse.json();
    const syncValidation = syncData.syncValidation || syncData;
    const issuesCount = Array.isArray(syncValidation?.issues) ? syncValidation.issues.length : (Array.isArray(syncValidation) ? syncValidation.length : 0);
    console.log(`✓ Validación obtenida: ${issuesCount} resultados`);
    
    // Test 4: Obtener estadísticas
    console.log('\n4. Obteniendo estadísticas...');
    const statsResponse = await fetch('http://localhost:3001/api/inventario?action=estadisticas', { headers });
    const stats = await statsResponse.json();
    const estadisticas = stats.estadisticas || stats;
    console.log('✓ Estadísticas obtenidas:', estadisticas);
    
    console.log('\n🎉 Todas las pruebas de API completadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en prueba de API:', error.message);
    process.exit(1);
  }
}

testAPI();
