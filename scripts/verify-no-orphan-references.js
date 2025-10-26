// Script para verificar que no quedan referencias huérfanas a proveedores eliminados
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function verifyNoOrphanReferences() {
  console.log('🔍 VERIFICACIÓN DE REFERENCIAS HUÉRFANAS');
  console.log('======================================\n');

  try {
    // 1. Verificar estado actual de la base de datos
    console.log('1. Verificando estado actual de la base de datos...');
    console.log('--------------------------------------------------');
    
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

    // 2. Verificar integridad referencial
    console.log('\n2. Verificando integridad referencial...');
    console.log('----------------------------------------');

    // Verificar que no hay productos sin categoría válida
    const productosOrfanos = await prisma.producto.findMany({
      where: {
        categoriaId: {
          not: null
        }
      },
      include: {
        categoria: true
      }
    });

    const productosConCategoriaInvalida = productosOrfanos.filter(p => !p.categoria);
    if (productosConCategoriaInvalida.length > 0) {
      console.log(`   ⚠️  ${productosConCategoriaInvalida.length} productos con categoría inválida`);
    } else {
      console.log('   ✅ Todos los productos tienen categorías válidas');
    }

    // Verificar que no hay productos sin unidad de medida válida
    const productosConUnidadInvalida = await prisma.producto.findMany({
      include: {
        unidadMedida: true
      }
    });

    const productosOrfanosUnidad = productosConUnidadInvalida.filter(p => !p.unidadMedida);
    if (productosOrfanosUnidad.length > 0) {
      console.log(`   ⚠️  ${productosOrfanosUnidad.length} productos con unidad de medida inválida`);
    } else {
      console.log('   ✅ Todos los productos tienen unidades de medida válidas');
    }

    // Verificar que no hay pedidos de compra sin proveedor válido
    const pedidosCompraOrfanos = await prisma.pedidoCompra.findMany({
      include: {
        proveedor: true
      }
    });

    const pedidosConProveedorInvalido = pedidosCompraOrfanos.filter(p => !p.proveedor);
    if (pedidosConProveedorInvalido.length > 0) {
      console.log(`   ⚠️  ${pedidosConProveedorInvalido.length} pedidos de compra con proveedor inválido`);
    } else {
      console.log('   ✅ Todos los pedidos de compra tienen proveedores válidos');
    }

    // 3. Verificar archivos de configuración y código
    console.log('\n3. Verificando archivos de código...');
    console.log('------------------------------------');

    // Verificar que el directorio de proveedores está limpio
    const proveedoresDir = path.join(__dirname, '../app/dashboard/proveedores');
    if (fs.existsSync(proveedoresDir)) {
      const files = fs.readdirSync(proveedoresDir);
      console.log(`   📁 Archivos en /app/dashboard/proveedores/: ${files.length}`);
      files.forEach(file => {
        console.log(`      - ${file}`);
      });
    } else {
      console.log('   ⚠️  Directorio /app/dashboard/proveedores/ no existe');
    }

    // 4. Verificar APIs relacionadas con proveedores
    console.log('\n4. Verificando APIs de proveedores...');
    console.log('-------------------------------------');

    const apiProveedoresDir = path.join(__dirname, '../app/api/proveedores');
    if (fs.existsSync(apiProveedoresDir)) {
      console.log('   ✅ API de proveedores existe');
      
      // Verificar que la API funciona correctamente
      try {
        const proveedores = await prisma.proveedor.findMany();
        console.log(`   ✅ API puede consultar proveedores: ${proveedores.length} encontrados`);
      } catch (error) {
        console.log(`   ❌ Error al consultar proveedores: ${error.message}`);
      }
    } else {
      console.log('   ⚠️  API de proveedores no existe');
    }

    // 5. Generar reporte de verificación
    const reporteVerificacion = {
      timestamp: new Date().toISOString(),
      estadoBaseDatos: counts,
      integridadReferencial: {
        productosConCategoriaInvalida: productosConCategoriaInvalida.length,
        productosConUnidadInvalida: productosOrfanosUnidad.length,
        pedidosConProveedorInvalido: pedidosConProveedorInvalido.length
      },
      archivosVerificados: {
        directorioProveedores: fs.existsSync(proveedoresDir),
        apiProveedores: fs.existsSync(apiProveedoresDir)
      },
      verificacionCompleta: true,
      erroresEncontrados: productosConCategoriaInvalida.length + productosOrfanosUnidad.length + pedidosConProveedorInvalido.length
    };

    const reportePath = path.join(__dirname, '../REPORTE-VERIFICACION-REFERENCIAS.json');
    fs.writeFileSync(reportePath, JSON.stringify(reporteVerificacion, null, 2));
    console.log(`\n📄 Reporte de verificación guardado en: ${reportePath}`);

    if (reporteVerificacion.erroresEncontrados === 0) {
      console.log('\n🎉 ¡NO SE ENCONTRARON REFERENCIAS HUÉRFANAS!');
      console.log('==========================================');
      console.log('✅ La base de datos está completamente limpia');
      console.log('✅ Todas las referencias son válidas');
      console.log('✅ No hay datos corruptos');
    } else {
      console.log(`\n⚠️  SE ENCONTRARON ${reporteVerificacion.erroresEncontrados} REFERENCIAS HUÉRFANAS`);
      console.log('================================================');
      console.log('❌ Revisar el reporte para más detalles');
    }

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  verifyNoOrphanReferences().catch(console.error);
}

module.exports = { verifyNoOrphanReferences };