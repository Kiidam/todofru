const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function createVentas() {
  try {
    console.log('🛒 Creando pedidos de venta...\n');

    // Obtener datos necesarios
    const productos = await prisma.producto.findMany({
      where: { stock: { gt: 0 } },
      select: { id: true, nombre: true, precio: true, stock: true }
    });
    
    const clientes = await prisma.cliente.findMany({
      select: { id: true, nombre: true }
    });

    const usuarios = await prisma.user.findMany({
      select: { id: true, name: true }
    });

    const usuarioId = usuarios[0].id;
    const estados = ['PENDIENTE', 'CONFIRMADO', 'EN_PROCESO', 'COMPLETADO', 'ANULADO'];

    console.log(`📊 Datos disponibles:`);
    console.log(`- Productos con stock: ${productos.length}`);
    console.log(`- Clientes: ${clientes.length}\n`);

    // Crear 8 pedidos de venta
    for (let i = 0; i < 8; i++) {
      const cliente = clientes[i % clientes.length];
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - (15 - i * 2)); // Fechas escalonadas en los últimos 15 días
      
      const pedidoId = randomUUID();
      
      // Seleccionar 1-3 productos aleatorios con stock
      const numProductos = Math.floor(Math.random() * 3) + 1;
      const selectedProducts = [];
      
      for (let j = 0; j < numProductos; j++) {
        const producto = productos[Math.floor(Math.random() * productos.length)];
        if (!selectedProducts.find(p => p.id === producto.id)) {
          selectedProducts.push(producto);
        }
      }
      
      if (selectedProducts.length === 0) continue;
      
      // Crear items para este pedido
      const itemsData = selectedProducts.map(product => ({
        id: randomUUID(),
        productoId: product.id,
        cantidad: Math.floor(Math.random() * Math.min(product.stock, 20)) + 1, // 1 a min(stock, 20)
        precio: product.precio,
        subtotal: 0
      }));

      // Calcular subtotales
      itemsData.forEach(item => {
        item.subtotal = item.cantidad * item.precio;
      });

      const subtotal = itemsData.reduce((sum, item) => sum + item.subtotal, 0);
      const impuestos = subtotal * 0.18; // 18% IGV
      const total = subtotal + impuestos;
      const estado = estados[Math.floor(Math.random() * estados.length)];

      // Crear el pedido de venta
      const pedidoVenta = await prisma.pedidoVenta.create({
        data: {
          id: pedidoId,
          numero: `PV-${String(i + 1).padStart(4, '0')}`,
          clienteId: cliente.id,
          fecha: fecha,
          subtotal: subtotal,
          impuestos: impuestos,
          total: total,
          estado: estado,
          observaciones: `Pedido de venta para ${cliente.nombre}`,
          usuarioId: usuarioId,
          items: {
            create: itemsData
          }
        }
      });

      console.log(`✅ Pedido ${pedidoVenta.numero} creado - Cliente: ${cliente.nombre} - Estado: ${estado} - Total: S/ ${total.toFixed(2)}`);
      
      // Si el pedido está completado, reducir el stock
      if (estado === 'COMPLETADO') {
        for (const item of itemsData) {
          await prisma.producto.update({
            where: { id: item.productoId },
            data: { stock: { decrement: item.cantidad } }
          });
        }
        console.log(`  📦 Stock reducido para pedido completado`);
      }
    }

    // Verificar resultados
    console.log('\n📊 Verificando resultados...');
    
    const totalPedidosVenta = await prisma.pedidoVenta.count();
    const pedidosPorEstado = await prisma.pedidoVenta.groupBy({
      by: ['estado'],
      _count: { estado: true }
    });
    
    console.log(`✅ Total pedidos de venta: ${totalPedidosVenta}`);
    console.log('📈 Pedidos por estado:');
    pedidosPorEstado.forEach(grupo => {
      console.log(`  - ${grupo.estado}: ${grupo._count.estado}`);
    });
    
    console.log('\n🎉 ¡Pedidos de venta creados exitosamente!');
    
  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createVentas();