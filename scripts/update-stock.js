const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateStock() {
  try {
    console.log('📦 Actualizando stock basado en pedidos de compra...\n');

    // Obtener todos los items de pedidos de compra
    const pedidosCompra = await prisma.pedidoCompra.findMany({
      include: {
        items: true
      }
    });

    console.log(`Encontrados ${pedidosCompra.length} pedidos de compra`);

    // Agrupar cantidades por producto
    const stockUpdates = {};
    
    for (const pedido of pedidosCompra) {
      for (const item of pedido.items) {
        if (!stockUpdates[item.productoId]) {
          stockUpdates[item.productoId] = 0;
        }
        stockUpdates[item.productoId] += item.cantidad;
      }
    }

    console.log(`Actualizando stock para ${Object.keys(stockUpdates).length} productos:`);

    // Actualizar el stock de cada producto
    for (const [productoId, cantidadTotal] of Object.entries(stockUpdates)) {
      const producto = await prisma.producto.update({
        where: { id: productoId },
        data: { stock: cantidadTotal },
        select: { id: true, nombre: true, stock: true }
      });
      
      console.log(`✅ ${producto.nombre}: Stock actualizado a ${producto.stock}`);
    }

    console.log('\n🎉 Stock actualizado exitosamente!');
    
    // Verificar productos con stock
    const productosConStock = await prisma.producto.findMany({
      where: { stock: { gt: 0 } },
      select: { id: true, nombre: true, stock: true }
    });
    
    console.log(`\n📊 Productos con stock disponible: ${productosConStock.length}`);
    
  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateStock();