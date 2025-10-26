const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const [productos, clientes, proveedores, pedidosCompra, pedidosVenta] = await Promise.all([
      prisma.producto.count(),
      prisma.cliente.count(),
      prisma.proveedor.count(),
      prisma.pedidoCompra.count(),
      prisma.pedidoVenta.count()
    ]);
    
    console.log('=== ESTADO ACTUAL DE LA BASE DE DATOS ===');
    console.log('Productos:', productos);
    console.log('Clientes:', clientes);
    console.log('Proveedores:', proveedores);
    console.log('Pedidos de Compra:', pedidosCompra);
    console.log('Pedidos de Venta:', pedidosVenta);
    
    if (productos > 0) {
      const productosData = await prisma.producto.findMany({
        select: { id: true, nombre: true, stock: true, precio: true },
        take: 5
      });
      console.log('\nPrimeros 5 productos:');
      productosData.forEach(p => console.log(`- ${p.nombre} (Stock: ${p.stock}, Precio: ${p.precio})`));
    }
    
    if (clientes > 0) {
      const clientesData = await prisma.cliente.findMany({
        select: { id: true, nombre: true },
        take: 3
      });
      console.log('\nPrimeros 3 clientes:');
      clientesData.forEach(c => console.log(`- ${c.nombre}`));
    }
    
    if (proveedores > 0) {
      const proveedoresData = await prisma.proveedor.findMany({
        select: { id: true, nombre: true },
        take: 3
      });
      console.log('\nPrimeros 3 proveedores:');
      proveedoresData.forEach(p => console.log(`- ${p.nombre}`));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();