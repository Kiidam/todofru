// Script para eliminar completamente la base de datos y crear una nueva limpia
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🗑️  LIMPIEZA COMPLETA DE LA BASE DE DATOS');
  console.log('=========================================\n');

  try {
    console.log('📊 Estado actual de la base de datos:');
    console.log('------------------------------------');
    
    // Obtener conteos actuales
    const counts = {
      usuarios: await prisma.user.count(),
      categorias: await prisma.categoria.count(),
      unidades: await prisma.unidadMedida.count(),
      proveedores: await prisma.proveedor.count(),
      clientes: await prisma.cliente.count(),
      productos: await prisma.producto.count(),
      pedidosCompra: await prisma.pedidoCompra.count(),
      pedidosVenta: await prisma.pedidoVenta.count(),
      movimientos: await prisma.movimientoInventario.count()
    };

    Object.entries(counts).forEach(([tabla, count]) => {
      console.log(`   ${tabla}: ${count} registros`);
    });

    console.log('\n🗑️  Iniciando eliminación de datos...');
    console.log('-------------------------------------');

    // Eliminar en orden correcto para respetar las relaciones
    console.log('1. Eliminando movimientos de inventario...');
    const deletedMovimientos = await prisma.movimientoInventario.deleteMany();
    console.log(`   ✅ ${deletedMovimientos.count} movimientos eliminados`);

    console.log('2. Eliminando detalles de pedidos de venta...');
    const deletedDetallesVenta = await prisma.pedidoVentaItem.deleteMany();
    console.log(`   ✅ ${deletedDetallesVenta.count} detalles de venta eliminados`);

    console.log('3. Eliminando pedidos de venta...');
    const deletedPedidosVenta = await prisma.pedidoVenta.deleteMany();
    console.log(`   ✅ ${deletedPedidosVenta.count} pedidos de venta eliminados`);

    console.log('4. Eliminando detalles de pedidos de compra...');
    const deletedDetallesCompra = await prisma.pedidoCompraItem.deleteMany();
    console.log(`   ✅ ${deletedDetallesCompra.count} detalles de compra eliminados`);

    console.log('5. Eliminando pedidos de compra...');
    const deletedPedidosCompra = await prisma.pedidoCompra.deleteMany();
    console.log(`   ✅ ${deletedPedidosCompra.count} pedidos de compra eliminados`);

    console.log('6. Eliminando productos...');
    const deletedProductos = await prisma.producto.deleteMany();
    console.log(`   ✅ ${deletedProductos.count} productos eliminados`);

    console.log('7. Eliminando proveedores...');
    const deletedProveedores = await prisma.proveedor.deleteMany();
    console.log(`   ✅ ${deletedProveedores.count} proveedores eliminados`);

    console.log('8. Eliminando clientes...');
    const deletedClientes = await prisma.cliente.deleteMany();
    console.log(`   ✅ ${deletedClientes.count} clientes eliminados`);

    console.log('9. Eliminando categorías...');
    const deletedCategorias = await prisma.categoria.deleteMany();
    console.log(`   ✅ ${deletedCategorias.count} categorías eliminadas`);

    console.log('10. Eliminando unidades de medida...');
    const deletedUnidades = await prisma.unidadMedida.deleteMany();
    console.log(`   ✅ ${deletedUnidades.count} unidades eliminadas`);

    console.log('11. Eliminando usuarios...');
    const deletedUsuarios = await prisma.user.deleteMany();
    console.log(`   ✅ ${deletedUsuarios.count} usuarios eliminados`);

    console.log('\n✅ BASE DE DATOS COMPLETAMENTE LIMPIA');
    console.log('====================================');

    // Verificar que todo está limpio
    const finalCounts = {
      usuarios: await prisma.user.count(),
      categorias: await prisma.categoria.count(),
      unidades: await prisma.unidadMedida.count(),
      proveedores: await prisma.proveedor.count(),
      clientes: await prisma.cliente.count(),
      productos: await prisma.producto.count(),
      pedidosCompra: await prisma.pedidoCompra.count(),
      pedidosVenta: await prisma.pedidoVenta.count(),
      movimientos: await prisma.movimientoInventario.count()
    };

    console.log('\n📊 Estado final de la base de datos:');
    console.log('-----------------------------------');
    Object.entries(finalCounts).forEach(([tabla, count]) => {
      console.log(`   ${tabla}: ${count} registros`);
    });

    const totalRecords = Object.values(finalCounts).reduce((sum, count) => sum + count, 0);
    if (totalRecords === 0) {
      console.log('\n🎉 ¡BASE DE DATOS COMPLETAMENTE LIMPIA!');
    } else {
      console.log(`\n⚠️  Aún quedan ${totalRecords} registros en la base de datos`);
    }

    // Generar reporte de limpieza
    const reporteLimpieza = {
      timestamp: new Date().toISOString(),
      estadoInicial: counts,
      estadoFinal: finalCounts,
      registrosEliminados: {
        movimientos: deletedMovimientos.count,
        detallesVenta: deletedDetallesVenta.count,
        pedidosVenta: deletedPedidosVenta.count,
        detallesCompra: deletedDetallesCompra.count,
        pedidosCompra: deletedPedidosCompra.count,
        productos: deletedProductos.count,
        proveedores: deletedProveedores.count,
        clientes: deletedClientes.count,
        categorias: deletedCategorias.count,
        unidades: deletedUnidades.count,
        usuarios: deletedUsuarios.count
      },
      totalEliminado: Object.values(counts).reduce((sum, count) => sum + count, 0),
      limpiezaCompleta: totalRecords === 0
    };

    const reportePath = path.join(__dirname, '../REPORTE-LIMPIEZA-BD.json');
    fs.writeFileSync(reportePath, JSON.stringify(reporteLimpieza, null, 2));
    console.log(`\n📄 Reporte de limpieza guardado en: ${reportePath}`);

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  cleanDatabase().catch(console.error);
}

module.exports = { cleanDatabase };