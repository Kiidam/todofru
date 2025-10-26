const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const fs = require('fs');

const prisma = new PrismaClient();

async function comprehensiveSystemTest() {
  console.log('🧪 Iniciando pruebas integrales del sistema...\n');
  
  const testResults = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Helper function para ejecutar tests
  async function runTest(testName, testFunction) {
    totalTests++;
    console.log(`🔍 Ejecutando: ${testName}`);
    
    try {
      const startTime = Date.now();
      const result = await testFunction();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`   ✅ PASÓ (${duration}ms)`);
      passedTests++;
      
      testResults.push({
        name: testName,
        status: 'PASSED',
        duration: duration,
        result: result
      });
      
      return result;
    } catch (error) {
      console.log(`   ❌ FALLÓ: ${error.message}`);
      failedTests++;
      
      testResults.push({
        name: testName,
        status: 'FAILED',
        error: error.message,
        stack: error.stack
      });
      
      return null;
    }
  }

  try {
    // 1. PRUEBAS DE CONECTIVIDAD Y CONFIGURACIÓN
    console.log('📡 PRUEBAS DE CONECTIVIDAD Y CONFIGURACIÓN');
    console.log('='.repeat(50));

    await runTest('Conexión a base de datos', async () => {
      await prisma.$connect();
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      return { connected: true, testQuery: result };
    });

    await runTest('Verificación de tablas principales', async () => {
      const tables = await prisma.$queryRaw`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_TYPE = 'BASE TABLE'
      `;
      
      const requiredTables = [
        'producto', 'categoria', 'unidadmedida', 'proveedor',
        'cliente', 'pedidocompra', 'pedidoventa', 'movimientoinventario',
        'auditoria', 'user'
      ];
      
      const existingTables = tables.map(t => t.TABLE_NAME.toLowerCase());
      const missingTables = requiredTables.filter(table => 
        !existingTables.includes(table)
      );
      
      if (missingTables.length > 0) {
        throw new Error(`Tablas faltantes: ${missingTables.join(', ')}`);
      }
      
      return { totalTables: tables.length, requiredTables: requiredTables.length };
    });

    await runTest('Verificación de índices optimizados', async () => {
      const indices = await prisma.$queryRaw`
        SELECT INDEX_NAME, TABLE_NAME, COLUMN_NAME
        FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND INDEX_NAME LIKE 'idx_%'
        ORDER BY TABLE_NAME, INDEX_NAME
      `;
      
      const optimizedIndices = [
        'idx_movimiento_fecha_tipo',
        'idx_pedido_venta_estado_fecha',
        'idx_producto_busqueda',
        'idx_auditoria_tabla_fecha',
        'idx_producto_categoria_activo',
        'idx_pedido_venta_item_producto',
        'idx_pedido_compra_item_producto'
      ];
      
      const existingOptimizedIndices = indices.filter(idx => 
        optimizedIndices.includes(idx.INDEX_NAME)
      );
      
      return { 
        totalOptimizedIndices: existingOptimizedIndices.length,
        expectedIndices: optimizedIndices.length,
        indices: existingOptimizedIndices.map(idx => idx.INDEX_NAME)
      };
    });

    // 2. PRUEBAS DE FUNCIONALIDAD CRUD
    console.log('\n📝 PRUEBAS DE FUNCIONALIDAD CRUD');
    console.log('='.repeat(50));

    let testCategoryId, testProductId, testSupplierId, testClientId, testUserId;

     // Crear usuario de prueba primero
     await runTest('Creación de Usuario de Prueba', async () => {
       const usuario = await prisma.user.create({
         data: {
           id: randomUUID(),
           name: 'Usuario Test',
           email: 'test@todafru.com',
           password: 'test123',
           role: 'ADMIN'
         }
       });
       testUserId = usuario.id;
       console.log(`Usuario de prueba creado: ${testUserId}`);
     });

     await runTest('CRUD Categorías', async () => {
      // Crear
      const categoria = await prisma.categoria.create({
        data: {
          id: randomUUID(),
          nombre: 'Test Category',
          descripcion: 'Categoría de prueba'
        }
      });
      testCategoryId = categoria.id;
      
      // Leer
      const categoriaLeida = await prisma.categoria.findUnique({
        where: { id: categoria.id }
      });
      
      // Actualizar
      const categoriaActualizada = await prisma.categoria.update({
        where: { id: categoria.id },
        data: { descripcion: 'Categoría actualizada' }
      });
      
      return {
        created: !!categoria.id,
        read: !!categoriaLeida,
        updated: categoriaActualizada.descripcion === 'Categoría actualizada'
      };
    });

    await runTest('CRUD Proveedores', async () => {
      // Crear
      const proveedor = await prisma.proveedor.create({
        data: {
          id: randomUUID(),
          nombre: 'Test Supplier',
          numeroIdentificacion: '12345678901',
          telefono: '123456789'
        }
      });
      testSupplierId = proveedor.id;
      
      // Leer
      const proveedorLeido = await prisma.proveedor.findUnique({
        where: { id: proveedor.id }
      });
      
      // Actualizar
      const proveedorActualizado = await prisma.proveedor.update({
        where: { id: proveedor.id },
        data: { telefono: '987654321' }
      });
      
      return {
        created: !!proveedor.id,
        read: !!proveedorLeido,
        updated: proveedorActualizado.telefono === '987654321'
      };
    });

    await runTest('CRUD Clientes', async () => {
      // Crear
      const cliente = await prisma.cliente.create({
        data: {
          id: randomUUID(),
          nombre: 'Test Client',
          telefono: '123456789',
          tipoCliente: 'MINORISTA'
        }
      });
      testClientId = cliente.id;
      
      // Leer
      const clienteLeido = await prisma.cliente.findUnique({
        where: { id: cliente.id }
      });
      
      // Actualizar
      const clienteActualizado = await prisma.cliente.update({
        where: { id: cliente.id },
        data: { telefono: '987654321' }
      });
      
      return {
        created: !!cliente.id,
        read: !!clienteLeido,
        updated: clienteActualizado.telefono === '987654321'
      };
    });

    await runTest('CRUD Productos', async () => {
      // Obtener unidad de medida
      const unidadMedida = await prisma.unidadMedida.findFirst();
      if (!unidadMedida) {
        throw new Error('No hay unidades de medida disponibles');
      }
      
      // Crear
      const producto = await prisma.producto.create({
        data: {
          id: randomUUID(),
          nombre: 'Test Product',
          sku: 'TEST-001',
          precio: 10.50,
          stock: 100,
          stockMinimo: 10,
          categoriaId: testCategoryId,
          unidadMedidaId: unidadMedida.id
        }
      });
      testProductId = producto.id;
      
      // Leer
      const productoLeido = await prisma.producto.findUnique({
        where: { id: producto.id },
        include: {
          categoria: true,
          unidadMedida: true
        }
      });
      
      // Actualizar
      const productoActualizado = await prisma.producto.update({
        where: { id: producto.id },
        data: { precio: 15.75 }
      });
      
      return {
        created: !!producto.id,
        read: !!productoLeido && !!productoLeido.categoria,
        updated: productoActualizado.precio === 15.75
      };
    });

    // 3. PRUEBAS DE RELACIONES Y INTEGRIDAD
    console.log('\n🔗 PRUEBAS DE RELACIONES Y INTEGRIDAD');
    console.log('='.repeat(50));

    await runTest('Relaciones Producto-Categoría-UnidadMedida', async () => {
      const producto = await prisma.producto.findUnique({
        where: { id: testProductId },
        include: {
          categoria: true,
          unidadMedida: true
        }
      });
      
      return {
        hasCategory: !!producto.categoria,
        hasUnit: !!producto.unidadMedida,
        categoryName: producto.categoria?.nombre,
        unitName: producto.unidadMedida?.nombre
      };
    });

    await runTest('Verificación de Movimientos de Inventario', async () => {
      // Verificar que podemos consultar movimientos existentes
      const movimientos = await prisma.movimientoInventario.findMany({
        take: 5,
        include: {
          producto: true,
          usuario: true
        }
      });
      
      // Verificar estructura de la tabla
      const count = await prisma.movimientoInventario.count();
      
      return {
        canQuery: true,
        totalMovimientos: count,
        sampleMovimientos: movimientos.length,
        hasRelations: movimientos.length > 0 ? !!movimientos[0].producto : false
      };
    });

    await runTest('Creación de Pedido de Compra', async () => {
      const pedido = await prisma.pedidoCompra.create({
          data: {
            id: randomUUID(),
            numero: 'PC-TEST-001',
            proveedorId: testSupplierId,
            fecha: new Date(),
            total: 525.00,
            observaciones: 'Pedido de prueba',
            usuarioId: testUserId,
          items: {
            create: [{
              id: randomUUID(),
               productoId: testProductId,
               cantidad: 50,
               precio: 10.50,
               subtotal: 525.00
            }]
          }
        },
        include: {
          items: {
            include: {
              producto: true
            }
          },
          proveedor: true
        }
      });
      
      return {
        created: !!pedido.id,
        hasSupplier: !!pedido.proveedor,
        hasItems: pedido.items.length > 0,
        itemsWithProducts: pedido.items.every(item => !!item.producto)
      };
    });

    await runTest('Creación de Pedido de Venta', async () => {
      const pedido = await prisma.pedidoVenta.create({
          data: {
            id: randomUUID(),
            numero: 'PV-TEST-001',
            clienteId: testClientId,
            fecha: new Date(),
            estado: 'PENDIENTE',
            total: 157.50,
            usuarioId: testUserId,
          observaciones: 'Pedido de venta de prueba',
          items: {
            create: [{
              id: randomUUID(),
               productoId: testProductId,
               cantidad: 10,
               precio: 15.75,
               subtotal: 157.50
            }]
          }
        },
        include: {
          items: {
            include: {
              producto: true
            }
          },
          cliente: true
        }
      });
      
      return {
        created: !!pedido.id,
        hasClient: !!pedido.cliente,
        hasItems: pedido.items.length > 0,
        itemsWithProducts: pedido.items.every(item => !!item.producto),
        status: pedido.estado
      };
    });

    // 4. PRUEBAS DE RENDIMIENTO
    console.log('\n⚡ PRUEBAS DE RENDIMIENTO');
    console.log('='.repeat(50));

    await runTest('Consulta optimizada de productos', async () => {
      const startTime = Date.now();
      
      const productos = await prisma.producto.findMany({
        where: { activo: true },
        include: {
          categoria: {
            select: { nombre: true }
          },
          unidadMedida: {
            select: { nombre: true, simbolo: true }
          }
        },
        take: 50
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      return {
        count: productos.length,
        duration: duration,
        performanceGood: duration < 1000 // Menos de 1 segundo
      };
    });

    await runTest('Consulta de inventario con stock bajo', async () => {
      const startTime = Date.now();
      
      const productosStockBajo = await prisma.producto.findMany({
        where: {
          AND: [
            { activo: true },
            {
              OR: [
                { stock: { lte: prisma.producto.fields.stockMinimo } },
                { stock: { equals: 0 } }
              ]
            }
          ]
        },
        include: {
          categoria: true,
          unidadMedida: true
        }
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      return {
        count: productosStockBajo.length,
        duration: duration,
        performanceGood: duration < 500
      };
    });

    await runTest('Consulta de movimientos recientes', async () => {
      const startTime = Date.now();
      
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - 30); // Últimos 30 días
      
      const movimientos = await prisma.movimientoInventario.findMany({
        where: {
          createdAt: { gte: fechaLimite }
        },
        include: {
          producto: {
            select: {
              nombre: true,
              sku: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      return {
        count: movimientos.length,
        duration: duration,
        performanceGood: duration < 500
      };
    });

    // 5. PRUEBAS DE VALIDACIÓN Y CONSTRAINTS
    console.log('\n🛡️ PRUEBAS DE VALIDACIÓN Y CONSTRAINTS');
    console.log('='.repeat(50));

    await runTest('Validación de RUC único en proveedores', async () => {
      try {
        await prisma.proveedor.create({
          data: {
            id: randomUUID(),
            nombre: 'Proveedor Duplicado',
            numeroIdentificacion: '12345678901' // RUC ya usado
          }
        });
        throw new Error('Debería haber fallado por RUC duplicado');
      } catch (error) {
        if (error.code === 'P2002') {
          return { uniqueConstraintWorking: true };
        }
        throw error;
      }
    });

    await runTest('Validación de SKU único en productos', async () => {
      try {
        const unidadMedida = await prisma.unidadMedida.findFirst();
        
        await prisma.producto.create({
          data: {
            id: randomUUID(),
            nombre: 'Producto Duplicado',
            sku: 'TEST-001', // SKU ya usado
            precio: 5.00,
            categoriaId: testCategoryId,
            unidadMedidaId: unidadMedida.id
          }
        });
        throw new Error('Debería haber fallado por SKU duplicado');
      } catch (error) {
        if (error.code === 'P2002') {
          return { uniqueConstraintWorking: true };
        }
        throw error;
      }
    });

    // 6. LIMPIEZA DE DATOS DE PRUEBA
    console.log('\n🧹 LIMPIEZA DE DATOS DE PRUEBA');
    console.log('='.repeat(50));

    await runTest('Limpieza de datos de prueba', async () => {
      // Eliminar en orden correcto para respetar foreign keys
      await prisma.movimientoInventario.deleteMany({
        where: { productoId: testProductId }
      });
      
      await prisma.pedidoCompraItem.deleteMany({
        where: { productoId: testProductId }
      });
      
      await prisma.pedidoVentaItem.deleteMany({
        where: { productoId: testProductId }
      });
      
      await prisma.pedidoCompra.deleteMany({
        where: { proveedorId: testSupplierId }
      });
      
      await prisma.pedidoVenta.deleteMany({
        where: { clienteId: testClientId }
      });
      
      if (testProductId) {
        await prisma.producto.delete({ where: { id: testProductId } });
      }
      
      if (testSupplierId) {
        await prisma.proveedor.delete({ where: { id: testSupplierId } });
      }
      
      if (testClientId) {
        await prisma.cliente.delete({ where: { id: testClientId } });
      }
      
      if (testCategoryId) {
        await prisma.categoria.delete({ where: { id: testCategoryId } });
      }
      
      if (testUserId) {
        await prisma.user.delete({ where: { id: testUserId } });
      }
      
      return { cleaned: true };
    });

    // RESUMEN FINAL
    console.log('\n' + '='.repeat(60));
    console.log('🧪 RESUMEN DE PRUEBAS INTEGRALES');
    console.log('='.repeat(60));
    
    console.log(`📊 Total de pruebas: ${totalTests}`);
    console.log(`✅ Pruebas exitosas: ${passedTests}`);
    console.log(`❌ Pruebas fallidas: ${failedTests}`);
    console.log(`📈 Tasa de éxito: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    const overallStatus = failedTests === 0 ? 'EXITOSO' : 'CON ERRORES';
    console.log(`🎯 Estado general: ${overallStatus}`);
    
    if (failedTests > 0) {
      console.log('\n❌ PRUEBAS FALLIDAS:');
      testResults
        .filter(test => test.status === 'FAILED')
        .forEach((test, index) => {
          console.log(`${index + 1}. ${test.name}: ${test.error}`);
        });
    }
    
    // Guardar reporte detallado
    const reportPath = './REPORTE-PRUEBAS-INTEGRALES.json';
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: ((passedTests / totalTests) * 100).toFixed(1),
        overallStatus
      },
      testResults: testResults
    };
    
    // Convertir BigInt a string para serialización
    const reportString = JSON.stringify(report, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value, 2
    );
    fs.writeFileSync(reportPath, reportString);
    console.log(`\n📄 Reporte detallado guardado en: ${reportPath}`);

  } catch (error) {
    console.error('❌ Error crítico durante las pruebas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar pruebas
comprehensiveSystemTest().catch(console.error);