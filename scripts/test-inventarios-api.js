// Test API Inventarios
async function testInventariosAPI() {
  console.log('🧪 Probando API de Inventarios...\n');

  try {
    // Test 1: Productos
    console.log('1️⃣ Probando /api/inventarios?action=productos');
    const productosResponse = await fetch('http://localhost:3001/api/inventarios?action=productos');
    console.log('Status:', productosResponse.status);
    
    if (productosResponse.ok) {
      const productosData = await productosResponse.json();
      console.log('✅ Productos OK:', productosData.productos?.length || 0, 'productos');
    } else {
      console.log('❌ Error productos:', productosResponse.statusText);
    }

    // Test 2: Movimientos
    console.log('\n2️⃣ Probando /api/inventarios?action=movimientos');
    const movimientosResponse = await fetch('http://localhost:3001/api/inventarios?action=movimientos');
    console.log('Status:', movimientosResponse.status);
    
    if (movimientosResponse.ok) {
      const movimientosData = await movimientosResponse.json();
      console.log('✅ Movimientos OK:', movimientosData.movimientos?.length || 0, 'movimientos');
    } else {
      console.log('❌ Error movimientos:', movimientosResponse.statusText);
    }

    // Test 3: Sync Validation
    console.log('\n3️⃣ Probando /api/inventarios?action=sync-validation');
    const syncResponse = await fetch('http://localhost:3001/api/inventarios?action=sync-validation');
    console.log('Status:', syncResponse.status);
    
    if (syncResponse.ok) {
      const syncData = await syncResponse.json();
      console.log('✅ Sync validation OK:', syncData.syncValidation?.isValid ? 'Válido' : 'Inválido');
    } else {
      console.log('❌ Error sync:', syncResponse.statusText);
    }

    // Test 4: Estadísticas
    console.log('\n4️⃣ Probando /api/inventarios?action=estadisticas');
    const statsResponse = await fetch('http://localhost:3001/api/inventarios?action=estadisticas');
    console.log('Status:', statsResponse.status);
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✅ Estadísticas OK:', JSON.stringify(statsData.estadisticas, null, 2));
    } else {
      console.log('❌ Error stats:', statsResponse.statusText);
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

testInventariosAPI();
