const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyDatabaseRelations() {
  console.log('🔍 Verificando relaciones entre tablas...\n');
  
  const issues = [];
  
  try {
    // 1. Verificar productos sin categoría válida
    console.log('1. Verificando productos con categorías inválidas...');
    const productosConCategoriaInvalida = await prisma.producto.findMany({
      where: {
        categoriaId: {
          not: null
        },
        categoria: null
      },
      select: {
        id: true,
        nombre: true,
        categoriaId: true
      }
    });
    
    if (productosConCategoriaInvalida.length > 0) {
      issues.push({
        type: 'FOREIGN_KEY_VIOLATION',
        table: 'producto',
        field: 'categoriaId',
        count: productosConCategoriaInvalida.length,
        details: productosConCategoriaInvalida
      });
      console.log(`❌ Encontrados ${productosConCategoriaInvalida.length} productos con categorías inválidas`);
    } else {
      console.log('✅ Todas las categorías de productos son válidas');
    }

    // 2. Verificar productos sin unidad de medida válida
    console.log('\n2. Verificando productos con unidades de medida inválidas...');
    const productosConUnidadInvalida = await prisma.$queryRaw`
      SELECT p.id, p.nombre, p.unidadMedidaId 
      FROM producto p 
      LEFT JOIN unidadmedida u ON p.unidadMedidaId = u.id 
      WHERE u.id IS NULL
    `;
    
    if (productosConUnidadInvalida.length > 0) {
      issues.push({
        type: 'FOREIGN_KEY_VIOLATION',
        table: 'producto',
        field: 'unidadMedidaId',
        count: productosConUnidadInvalida.length,
        details: productosConUnidadInvalida
      });
      console.log(`❌ Encontrados ${productosConUnidadInvalida.length} productos con unidades de medida inválidas`);
    } else {
      console.log('✅ Todas las unidades de medida de productos son válidas');
    }

    // 3. Verificar movimientos de inventario con productos inválidos
    console.log('\n3. Verificando movimientos de inventario con productos inválidos...');
    const movimientosConProductoInvalido = await prisma.$queryRaw`
      SELECT m.productoId, m.createdAt, m.tipo 
      FROM movimientoinventario m 
      LEFT JOIN producto p ON m.productoId = p.id 
      WHERE p.id IS NULL
      LIMIT 10
    `;
    
    if (movimientosConProductoInvalido.length > 0) {
      issues.push({
        type: 'FOREIGN_KEY_VIOLATION',
        table: 'movimientoinventario',
        field: 'productoId',
        count: movimientosConProductoInvalido.length,
        details: movimientosConProductoInvalido
      });
      console.log(`❌ Encontrados ${movimientosConProductoInvalido.length} movimientos con productos inválidos`);
    } else {
      console.log('✅ Todos los movimientos tienen productos válidos');
    }

    // 4. Verificar pedidos de compra con proveedores inválidos
    console.log('\n4. Verificando pedidos de compra con proveedores inválidos...');
    const pedidosCompraConProveedorInvalido = await prisma.$queryRaw`
      SELECT pc.id, pc.numero, pc.proveedorId, pc.fecha 
      FROM pedidocompra pc 
      LEFT JOIN proveedor p ON pc.proveedorId = p.id 
      WHERE p.id IS NULL
    `;
    
    if (pedidosCompraConProveedorInvalido.length > 0) {
      issues.push({
        type: 'FOREIGN_KEY_VIOLATION',
        table: 'pedidocompra',
        field: 'proveedorId',
        count: pedidosCompraConProveedorInvalido.length,
        details: pedidosCompraConProveedorInvalido
      });
      console.log(`❌ Encontrados ${pedidosCompraConProveedorInvalido.length} pedidos de compra con proveedores inválidos`);
    } else {
      console.log('✅ Todos los pedidos de compra tienen proveedores válidos');
    }

    // 5. Verificar pedidos de venta con clientes inválidos
    console.log('\n5. Verificando pedidos de venta con clientes inválidos...');
    const pedidosVentaConClienteInvalido = await prisma.$queryRaw`
      SELECT pv.id, pv.numero, pv.clienteId, pv.fecha 
      FROM pedidoventa pv 
      LEFT JOIN cliente c ON pv.clienteId = c.id 
      WHERE c.id IS NULL
    `;
    
    if (pedidosVentaConClienteInvalido.length > 0) {
      issues.push({
        type: 'FOREIGN_KEY_VIOLATION',
        table: 'pedidoventa',
        field: 'clienteId',
        count: pedidosVentaConClienteInvalido.length,
        details: pedidosVentaConClienteInvalido
      });
      console.log(`❌ Encontrados ${pedidosVentaConClienteInvalido.length} pedidos de venta con clientes inválidos`);
    } else {
      console.log('✅ Todos los pedidos de venta tienen clientes válidos');
    }

    // 6. Verificar items de pedidos de compra huérfanos
    console.log('\n6. Verificando items de pedidos de compra huérfanos...');
    const itemsCompraHuerfanos = await prisma.$queryRaw`
      SELECT pci.id, pci.pedidoId, pci.productoId 
      FROM pedidocompraitem pci 
      LEFT JOIN pedidocompra pc ON pci.pedidoId = pc.id 
      LEFT JOIN producto p ON pci.productoId = p.id 
      WHERE pc.id IS NULL OR p.id IS NULL
    `;
    
    if (itemsCompraHuerfanos.length > 0) {
      issues.push({
        type: 'ORPHANED_RECORDS',
        table: 'pedidocompraitem',
        count: itemsCompraHuerfanos.length,
        details: itemsCompraHuerfanos
      });
      console.log(`❌ Encontrados ${itemsCompraHuerfanos.length} items de compra huérfanos`);
    } else {
      console.log('✅ Todos los items de compra tienen relaciones válidas');
    }

    // 7. Verificar items de pedidos de venta huérfanos
    console.log('\n7. Verificando items de pedidos de venta huérfanos...');
    const itemsVentaHuerfanos = await prisma.$queryRaw`
      SELECT pvi.id, pvi.pedidoId, pvi.productoId 
      FROM pedidoventaitem pvi 
      LEFT JOIN pedidoventa pv ON pvi.pedidoId = pv.id 
      LEFT JOIN producto p ON pvi.productoId = p.id 
      WHERE pv.id IS NULL OR p.id IS NULL
    `;
    
    if (itemsVentaHuerfanos.length > 0) {
      issues.push({
        type: 'ORPHANED_RECORDS',
        table: 'pedidoventaitem',
        count: itemsVentaHuerfanos.length,
        details: itemsVentaHuerfanos
      });
      console.log(`❌ Encontrados ${itemsVentaHuerfanos.length} items de venta huérfanos`);
    } else {
      console.log('✅ Todos los items de venta tienen relaciones válidas');
    }

    // 8. Verificar relaciones producto-proveedor inválidas
    console.log('\n8. Verificando relaciones producto-proveedor inválidas...');
    const relacionesInvalidas = await prisma.$queryRaw`
      SELECT pp.id, pp.productoId, pp.proveedorId 
      FROM productoproveedor pp 
      LEFT JOIN producto p ON pp.productoId = p.id 
      LEFT JOIN proveedor pr ON pp.proveedorId = pr.id 
      WHERE p.id IS NULL OR pr.id IS NULL
    `;
    
    if (relacionesInvalidas.length > 0) {
      issues.push({
        type: 'FOREIGN_KEY_VIOLATION',
        table: 'productoproveedor',
        count: relacionesInvalidas.length,
        details: relacionesInvalidas
      });
      console.log(`❌ Encontradas ${relacionesInvalidas.length} relaciones producto-proveedor inválidas`);
    } else {
      console.log('✅ Todas las relaciones producto-proveedor son válidas');
    }

    // 9. Verificar duplicados en relaciones únicas
    console.log('\n9. Verificando duplicados en relaciones únicas...');
    
    // Verificar duplicados en producto-proveedor
    const duplicadosProductoProveedor = await prisma.$queryRaw`
      SELECT productoId, proveedorId, COUNT(*) as count
      FROM productoproveedor 
      GROUP BY productoId, proveedorId 
      HAVING COUNT(*) > 1
    `;
    
    if (duplicadosProductoProveedor.length > 0) {
      issues.push({
        type: 'DUPLICATE_UNIQUE_CONSTRAINT',
        table: 'productoproveedor',
        count: duplicadosProductoProveedor.length,
        details: duplicadosProductoProveedor
      });
      console.log(`❌ Encontrados ${duplicadosProductoProveedor.length} duplicados en producto-proveedor`);
    } else {
      console.log('✅ No hay duplicados en relaciones producto-proveedor');
    }

    // 10. Verificar integridad de auditoría
    console.log('\n10. Verificando integridad de auditoría...');
    const auditoriasConUsuarioInvalido = await prisma.$queryRaw`
      SELECT a.id, a.usuarioId, a.tabla, a.accion 
      FROM auditoria a 
      LEFT JOIN user u ON a.usuarioId = u.id 
      WHERE u.id IS NULL
      LIMIT 10
    `;
    
    if (auditoriasConUsuarioInvalido.length > 0) {
      issues.push({
        type: 'FOREIGN_KEY_VIOLATION',
        table: 'auditoria',
        field: 'usuarioId',
        count: auditoriasConUsuarioInvalido.length,
        details: auditoriasConUsuarioInvalido
      });
      console.log(`❌ Encontradas ${auditoriasConUsuarioInvalido.length} auditorías con usuarios inválidos`);
    } else {
      console.log('✅ Todas las auditorías tienen usuarios válidos');
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE VERIFICACIÓN DE RELACIONES');
    console.log('='.repeat(60));
    
    if (issues.length === 0) {
      console.log('✅ ¡Excelente! No se encontraron problemas de integridad referencial');
    } else {
      console.log(`❌ Se encontraron ${issues.length} tipos de problemas:`);
      
      issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.type} en tabla '${issue.table}':`);
        console.log(`   - Registros afectados: ${issue.count}`);
        if (issue.field) {
          console.log(`   - Campo problemático: ${issue.field}`);
        }
      });
      
      console.log('\n💡 Recomendaciones:');
      console.log('1. Ejecutar scripts de limpieza para eliminar registros huérfanos');
      console.log('2. Actualizar referencias inválidas con valores por defecto');
      console.log('3. Implementar validaciones más estrictas en las APIs');
      console.log('4. Considerar agregar restricciones de clave foránea más estrictas');
    }

    // Guardar reporte detallado
    const reportPath = './REPORTE-VERIFICACION-RELACIONES.json';
    const fs = require('fs');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: issues.length,
        status: issues.length === 0 ? 'HEALTHY' : 'ISSUES_FOUND'
      },
      issues: issues
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Reporte detallado guardado en: ${reportPath}`);

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar verificación
verifyDatabaseRelations().catch(console.error);