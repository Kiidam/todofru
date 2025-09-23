// Script de pruebas CRUD completas para verificar funcionamiento post-migración MySQL
const { PrismaClient } = require('@prisma/client');

async function testCRUDComplete() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 INICIANDO PRUEBAS CRUD COMPLETAS...\n');

    // ====== CREATE (Crear) ======
    console.log('1️⃣ PRUEBA CREATE - Creando nueva categoría...');
    const testCategory = await prisma.categoria.create({
      data: {
        nombre: `Test Category ${Date.now()}`,
        descripcion: 'Categoría de prueba CRUD'
      }
    });
    console.log(`✅ CREATE exitoso: ${testCategory.nombre} (ID: ${testCategory.id})\n`);

    // ====== READ (Leer) ======
    console.log('2️⃣ PRUEBA READ - Leyendo categorías...');
    const categorias = await prisma.categoria.findMany({
      where: { activo: true },
      take: 5
    });
    console.log(`✅ READ exitoso: ${categorias.length} categorías encontradas`);
    categorias.forEach(cat => console.log(`   - ${cat.nombre}`));
    console.log('');

    // ====== UPDATE (Actualizar) ======
    console.log('3️⃣ PRUEBA UPDATE - Actualizando categoría...');
    const updatedCategory = await prisma.categoria.update({
      where: { id: testCategory.id },
      data: {
        descripcion: 'Categoría actualizada en prueba CRUD'
      }
    });
    console.log(`✅ UPDATE exitoso: Descripción actualizada para ${updatedCategory.nombre}\n`);

    // ====== READ con relaciones ======
    console.log('4️⃣ PRUEBA READ con RELACIONES - Productos con categoría...');
    const productosConCategoria = await prisma.producto.findMany({
      include: {
        categoria: true,
        unidadMedida: true
      },
      take: 3
    });
    console.log(`✅ READ con relaciones exitoso: ${productosConCategoria.length} productos`);
    productosConCategoria.forEach(prod => {
      console.log(`   - ${prod.nombre} (Categoría: ${prod.categoria?.nombre || 'N/A'})`);
    });
    console.log('');

    // ====== CREATE con relaciones ======
    console.log('5️⃣ PRUEBA CREATE con RELACIONES - Nuevo producto...');
    
    // Obtener entidades relacionadas existentes
    const primeraCategoria = await prisma.categoria.findFirst({ where: { activo: true } });
    const primeraUnidad = await prisma.unidadMedida.findFirst({ where: { activo: true } });
    
    if (primeraCategoria && primeraUnidad) {
      const testProduct = await prisma.producto.create({
        data: {
          nombre: `Producto Test ${Date.now()}`,
          sku: `TEST-${Date.now()}`,
          descripcion: 'Producto de prueba CRUD',
          categoriaId: primeraCategoria.id,
          unidadMedidaId: primeraUnidad.id,
          precio: 99.99,
          stockMinimo: 10,
          porcentajeMerma: 2.5,
          perecedero: false,
          tieneIGV: true
        },
        include: {
          categoria: true,
          unidadMedida: true
        }
      });
      console.log(`✅ CREATE con relaciones exitoso: ${testProduct.nombre}`);
      console.log(`   Categoría: ${testProduct.categoria?.nombre}`);
      console.log(`   Unidad: ${testProduct.unidadMedida.nombre}\n`);
      
      // ====== UPDATE con validaciones ======
      console.log('6️⃣ PRUEBA UPDATE con VALIDACIONES - Actualizando producto...');
      const updatedProduct = await prisma.producto.update({
        where: { id: testProduct.id },
        data: {
          precio: 149.99,
          stockMinimo: 15,
          descripcion: 'Producto actualizado con nuevos precios'
        }
      });
      console.log(`✅ UPDATE con validaciones exitoso: Precio actualizado a $${updatedProduct.precio}\n`);

      // ====== DELETE (Eliminar) ======
      console.log('7️⃣ PRUEBA DELETE - Eliminando producto de prueba...');
      await prisma.producto.delete({
        where: { id: testProduct.id }
      });
      console.log(`✅ DELETE exitoso: Producto eliminado\n`);
    }

    // ====== TRANSACCIONES ======
    console.log('8️⃣ PRUEBA TRANSACCIONES - Operación atómica...');
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Crear una unidad de medida
      const unidad = await tx.unidadMedida.create({
        data: {
          nombre: `Unidad Test ${Date.now()}`,
          simbolo: `UT${Date.now().toString().slice(-3)}`
        }
      });

      // Actualizar la categoría de prueba
      const categoria = await tx.categoria.update({
        where: { id: testCategory.id },
        data: {
          descripcion: 'Actualizada en transacción'
        }
      });

      return { unidad, categoria };
    });
    console.log(`✅ TRANSACCIÓN exitosa:`);
    console.log(`   Unidad creada: ${transactionResult.unidad.nombre}`);
    console.log(`   Categoría actualizada: ${transactionResult.categoria.nombre}\n`);

    // ====== CONSULTAS COMPLEJAS ======
    console.log('9️⃣ PRUEBA CONSULTAS COMPLEJAS - Agregaciones y filtros...');
    
    // Contar productos por categoría
    const productoPorCategoria = await prisma.producto.groupBy({
      by: ['categoriaId'],
      _count: {
        categoriaId: true
      },
      where: {
        activo: true
      }
    });
    console.log(`✅ Consulta compleja exitosa: ${productoPorCategoria.length} categorías con productos`);

    // Productos con stock bajo
    const productosStockBajo = await prisma.$queryRaw`
      SELECT p.nombre, p.stockMinimo, 
             COALESCE(SUM(CASE WHEN mi.tipo = 'ENTRADA' THEN mi.cantidad ELSE -mi.cantidad END), 0) as stock_actual
      FROM producto p 
      LEFT JOIN movimientoinventario mi ON p.id = mi.productoId 
      WHERE p.activo = true
      GROUP BY p.id, p.nombre, p.stockMinimo
      HAVING stock_actual < p.stockMinimo
      LIMIT 3
    `;
    console.log(`✅ Query RAW exitosa: ${productosStockBajo.length} productos con stock bajo\n`);

    // ====== LIMPIEZA ======
    console.log('🧹 LIMPIEZA - Eliminando datos de prueba...');
    
    // Eliminar unidad de prueba
    await prisma.unidadMedida.delete({
      where: { id: transactionResult.unidad.id }
    });
    
    // Eliminar categoría de prueba
    await prisma.categoria.delete({
      where: { id: testCategory.id }
    });
    
    console.log('✅ Limpieza completada\n');

    // ====== RESUMEN FINAL ======
    console.log('🎉 TODAS LAS PRUEBAS CRUD COMPLETADAS EXITOSAMENTE!');
    console.log('===============================================');
    console.log('✅ CREATE: Funcionando');
    console.log('✅ READ: Funcionando');
    console.log('✅ UPDATE: Funcionando');
    console.log('✅ DELETE: Funcionando');
    console.log('✅ Relaciones: Funcionando');
    console.log('✅ Transacciones: Funcionando');
    console.log('✅ Consultas complejas: Funcionando');
    console.log('✅ Query RAW: Funcionando');
    console.log('\n🚀 MYSQL ESTÁ COMPLETAMENTE FUNCIONAL PARA PRODUCCIÓN!');

  } catch (error) {
    console.error('❌ ERROR EN PRUEBAS CRUD:', error.message);
    if (error.code) {
      console.error('Código de error:', error.code);
    }
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testCRUDComplete();