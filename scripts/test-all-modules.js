// Script para realizar pruebas exhaustivas de todos los módulos afectados
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function testAllModules() {
  console.log('🧪 PRUEBAS EXHAUSTIVAS DE TODOS LOS MÓDULOS');
  console.log('==========================================\n');

  const testResults = {
    timestamp: new Date().toISOString(),
    tests: [],
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    errors: []
  };

  try {
    // 1. Pruebas de Base de Datos
    console.log('1. PRUEBAS DE BASE DE DATOS');
    console.log('==========================');

    // Test 1.1: Conexión a la base de datos
    await runTest('Conexión a la base de datos', async () => {
      await prisma.$connect();
      return true;
    }, testResults);

    // Test 1.2: Verificar tablas principales
    await runTest('Verificar tablas principales', async () => {
      const tables = ['user', 'categoria', 'unidadMedida', 'proveedor', 'cliente', 'producto'];
      for (const table of tables) {
        await prisma[table === 'user' ? 'user' : table === 'unidadMedida' ? 'unidadMedida' : table].findMany({ take: 1 });
      }
      return true;
    }, testResults);

    // Test 1.3: Verificar datos iniciales
    await runTest('Verificar datos iniciales', async () => {
      const userCount = await prisma.user.count();
      const categoriaCount = await prisma.categoria.count();
      const unidadCount = await prisma.unidadMedida.count();
      
      if (userCount !== 1) throw new Error(`Esperado 1 usuario, encontrado ${userCount}`);
      if (categoriaCount !== 5) throw new Error(`Esperado 5 categorías, encontrado ${categoriaCount}`);
      if (unidadCount !== 7) throw new Error(`Esperado 7 unidades, encontrado ${unidadCount}`);
      
      return true;
    }, testResults);

    // 2. Pruebas de CRUD de Proveedores
    console.log('\n2. PRUEBAS DE CRUD DE PROVEEDORES');
    console.log('================================');

    let testProveedor = null;

    // Test 2.1: Crear proveedor
    await runTest('Crear proveedor', async () => {
      testProveedor = await prisma.proveedor.create({
        data: {
          id: 'test-proveedor-001',
          tipoEntidad: 'PERSONA_JURIDICA',
          nombre: 'Proveedor Test S.A.C.',
          numeroIdentificacion: '20123456789',
          razonSocial: 'Proveedor Test S.A.C.',
          telefono: '987654321',
          email: 'test@proveedor.com',
          direccion: 'Av. Test 123',
          contacto: 'Juan Test'
        }
      });
      return testProveedor !== null;
    }, testResults);

    // Test 2.2: Leer proveedor
    await runTest('Leer proveedor', async () => {
      const proveedor = await prisma.proveedor.findUnique({
        where: { id: 'test-proveedor-001' }
      });
      return proveedor !== null && proveedor.nombre === 'Proveedor Test S.A.C.';
    }, testResults);

    // Test 2.3: Actualizar proveedor
    await runTest('Actualizar proveedor', async () => {
      const updatedProveedor = await prisma.proveedor.update({
        where: { id: 'test-proveedor-001' },
        data: { telefono: '999888777' }
      });
      return updatedProveedor.telefono === '999888777';
    }, testResults);

    // Test 2.4: Listar proveedores
    await runTest('Listar proveedores', async () => {
      const proveedores = await prisma.proveedor.findMany();
      return proveedores.length === 1;
    }, testResults);

    // 3. Pruebas de CRUD de Productos
    console.log('\n3. PRUEBAS DE CRUD DE PRODUCTOS');
    console.log('==============================');

    let testProducto = null;

    // Test 3.1: Crear producto
    await runTest('Crear producto', async () => {
      testProducto = await prisma.producto.create({
        data: {
          id: 'test-producto-001',
          nombre: 'Producto Test',
          sku: 'TEST-001',
          descripcion: 'Producto de prueba',
          categoriaId: 'frutas',
          unidadMedidaId: 'kg',
          precio: 10.50,
          stock: 100,
          stockMinimo: 10
        }
      });
      return testProducto !== null;
    }, testResults);

    // Test 3.2: Leer producto con relaciones
    await runTest('Leer producto con relaciones', async () => {
      const producto = await prisma.producto.findUnique({
        where: { id: 'test-producto-001' },
        include: {
          categoria: true,
          unidadMedida: true
        }
      });
      return producto !== null && producto.categoria !== null && producto.unidadMedida !== null;
    }, testResults);

    // 4. Pruebas de CRUD de Clientes
    console.log('\n4. PRUEBAS DE CRUD DE CLIENTES');
    console.log('=============================');

    let testCliente = null;

    // Test 4.1: Crear cliente
    await runTest('Crear cliente', async () => {
      testCliente = await prisma.cliente.create({
        data: {
          id: 'test-cliente-001',
          nombre: 'Cliente Test',
          tipoEntidad: 'PERSONA_NATURAL',
          numeroIdentificacion: '12345678',
          nombres: 'Juan',
          apellidos: 'Pérez Test',
          telefono: '987654321',
          email: 'cliente@test.com',
          direccion: 'Av. Cliente 456'
        }
      });
      return testCliente !== null;
    }, testResults);

    // 5. Pruebas de Pedidos de Compra
    console.log('\n5. PRUEBAS DE PEDIDOS DE COMPRA');
    console.log('==============================');

    // Test 5.1: Crear pedido de compra
    await runTest('Crear pedido de compra', async () => {
      const pedido = await prisma.pedidoCompra.create({
        data: {
          id: 'test-pedido-001',
          numero: 'PC-TEST-001',
          proveedorId: 'test-proveedor-001',
          usuarioId: 'admin-user-001',
          subtotal: 100.00,
          total: 118.00,
          impuestos: 18.00
        }
      });
      return pedido !== null;
    }, testResults);

    // 6. Pruebas de Pedidos de Venta
    console.log('\n6. PRUEBAS DE PEDIDOS DE VENTA');
    console.log('=============================');

    // Test 6.1: Crear pedido de venta
    await runTest('Crear pedido de venta', async () => {
      const pedido = await prisma.pedidoVenta.create({
        data: {
          id: 'test-venta-001',
          numero: 'PV-TEST-001',
          clienteId: 'test-cliente-001',
          usuarioId: 'admin-user-001',
          subtotal: 50.00,
          total: 59.00,
          impuestos: 9.00
        }
      });
      return pedido !== null;
    }, testResults);

    // 7. Limpieza de datos de prueba
    console.log('\n7. LIMPIEZA DE DATOS DE PRUEBA');
    console.log('=============================');

    await runTest('Eliminar datos de prueba', async () => {
      await prisma.pedidoVenta.deleteMany({ where: { numero: { startsWith: 'PV-TEST-' } } });
      await prisma.pedidoCompra.deleteMany({ where: { numero: { startsWith: 'PC-TEST-' } } });
      await prisma.producto.deleteMany({ where: { sku: { startsWith: 'TEST-' } } });
      await prisma.cliente.deleteMany({ where: { id: { startsWith: 'test-cliente-' } } });
      await prisma.proveedor.deleteMany({ where: { id: { startsWith: 'test-proveedor-' } } });
      return true;
    }, testResults);

    // 8. Verificación final
    console.log('\n8. VERIFICACIÓN FINAL');
    console.log('====================');

    await runTest('Verificar limpieza de datos de prueba', async () => {
      const counts = {
        proveedores: await prisma.proveedor.count(),
        clientes: await prisma.cliente.count(),
        productos: await prisma.producto.count(),
        pedidosCompra: await prisma.pedidoCompra.count(),
        pedidosVenta: await prisma.pedidoVenta.count()
      };
      
      return Object.values(counts).every(count => count === 0);
    }, testResults);

    // Generar reporte final
    console.log('\n📊 RESUMEN DE PRUEBAS');
    console.log('====================');
    console.log(`Total de pruebas: ${testResults.totalTests}`);
    console.log(`Pruebas exitosas: ${testResults.passedTests}`);
    console.log(`Pruebas fallidas: ${testResults.failedTests}`);
    
    if (testResults.failedTests > 0) {
      console.log('\n❌ ERRORES ENCONTRADOS:');
      testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    const reportePath = path.join(__dirname, '../REPORTE-PRUEBAS-MODULOS.json');
    fs.writeFileSync(reportePath, JSON.stringify(testResults, null, 2));
    console.log(`\n📄 Reporte de pruebas guardado en: ${reportePath}`);

    if (testResults.failedTests === 0) {
      console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
      console.log('==========================================');
      console.log('✅ Todos los módulos funcionan correctamente');
      console.log('✅ La base de datos está operativa');
      console.log('✅ No se detectaron errores');
    } else {
      console.log('\n❌ ALGUNAS PRUEBAS FALLARON');
      console.log('==========================');
      console.log('⚠️  Revisar el reporte para más detalles');
    }

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
    testResults.errors.push(`Error general: ${error.message}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }

  return testResults;
}

async function runTest(testName, testFunction, testResults) {
  testResults.totalTests++;
  
  try {
    console.log(`   🧪 ${testName}...`);
    const result = await testFunction();
    
    if (result) {
      console.log(`   ✅ ${testName} - PASÓ`);
      testResults.passedTests++;
      testResults.tests.push({
        name: testName,
        status: 'PASSED',
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`   ❌ ${testName} - FALLÓ`);
      testResults.failedTests++;
      testResults.errors.push(`${testName}: Test retornó false`);
      testResults.tests.push({
        name: testName,
        status: 'FAILED',
        error: 'Test retornó false',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.log(`   ❌ ${testName} - ERROR: ${error.message}`);
    testResults.failedTests++;
    testResults.errors.push(`${testName}: ${error.message}`);
    testResults.tests.push({
      name: testName,
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  testAllModules().catch(console.error);
}

module.exports = { testAllModules };