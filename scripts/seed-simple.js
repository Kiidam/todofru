const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function seedSimple() {
  try {
    console.log('🚀 Iniciando inserción simplificada de datos de compras y ventas...\n');

    // Obtener datos existentes
    const productos = await prisma.producto.findMany({
      select: { id: true, nombre: true, precio: true, stock: true }
    });
    
    const clientes = await prisma.cliente.findMany({
      select: { id: true, nombre: true }
    });
    
    const proveedores = await prisma.proveedor.findMany({
      select: { id: true, nombre: true }
    });

    const usuarios = await prisma.user.findMany({
      select: { id: true, name: true }
    });

    if (productos.length === 0 || clientes.length === 0 || proveedores.length === 0 || usuarios.length === 0) {
      throw new Error('Faltan datos base: productos, clientes, proveedores o usuarios');
    }

    const usuarioId = usuarios[0].id;

    console.log(`📊 Datos disponibles:`);
    console.log(`- Productos: ${productos.length}`);
    console.log(`- Clientes: ${clientes.length}`);
    console.log(`- Proveedores: ${proveedores.length}`);
    console.log(`- Usuario para transacciones: ${usuarios[0].name}\n`);

    // 1. CREAR PEDIDOS DE COMPRA
    console.log('📦 Creando pedidos de compra...');
    
    for (let i = 0; i < 5; i++) {
      const proveedor = proveedores[i % proveedores.length];
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - (30 - i * 5));
      
      const pedidoId = randomUUID();
      
      // Seleccionar 2-4 productos aleatorios
      const numProductos = Math.floor(Math.random() * 3) + 2;
      const selectedProducts = [];
      for (let j = 0; j < numProductos; j++) {
        const producto = productos[Math.floor(Math.random() * productos.length)];
        if (!selectedProducts.find(p => p.id === producto.id)) {
          selectedProducts.push(producto);
        }
      }
      
      // Crear items para este pedido
      const itemsData = selectedProducts.map(product => ({
        id: randomUUID(),
        productoId: product.id,
        cantidad: Math.floor(Math.random() * 50) + 10,
        precio: product.precio * 0.8,
        subtotal: 0
      }));

      // Calcular subtotales
      itemsData.forEach(item => {
        item.subtotal = item.cantidad * item.precio;
      });

      const subtotal = itemsData.reduce((sum, item) => sum + item.subtotal, 0);
      const impuestos = subtotal * 0.18;
      const total = subtotal + impuestos;

      // Crear el pedido de compra
      const pedidoCompra = await prisma.pedidoCompra.create({
        data: {
          id: pedidoId,
          numero: `PC-${String(i + 1).padStart(4, '0')}`,
          proveedorId: proveedor.id,
          fecha: fecha,
          subtotal: subtotal,
          impuestos: impuestos,
          total: total,
          observaciones: `Pedido de compra a ${proveedor.nombre}`,
          usuarioId: usuarioId,
          items: {
            create: itemsData
          }
        }
      });

      console.log(`✅ Pedido de compra ${pedidoCompra.numero} creado con ${itemsData.length} productos`);
    }

    // 2. CREAR PEDIDOS DE VENTA
    console.log('\n🛒 Creando pedidos de venta...');
    
    const estados = ['PENDIENTE', 'CONFIRMADO', 'ENTREGADO', 'CANCELADO'];
    
    for (let i = 0; i < 8; i++) {
      const cliente = clientes[i % clientes.length];
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - (15 - i * 2));
      
      const pedidoId = randomUUID();
      
      // Seleccionar 1-3 productos con stock
      const productosConStock = productos.filter(p => p.stock > 0);
      if (productosConStock.length === 0) continue;
      
      const numProductos = Math.floor(Math.random() * 3) + 1;
      const selectedProducts = [];
      for (let j = 0; j < numProductos && j < productosConStock.length; j++) {
        const producto = productosConStock[Math.floor(Math.random() * productosConStock.length)];
        if (!selectedProducts.find(p => p.id === producto.id)) {
          selectedProducts.push(producto);
        }
      }
      
      if (selectedProducts.length === 0) continue;
      
      // Crear items para este pedido
      const itemsData = selectedProducts.map(product => ({
        id: randomUUID(),
        productoId: product.id,
        cantidad: Math.floor(Math.random() * Math.min(product.stock, 10)) + 1,
        precio: product.precio,
        subtotal: 0
      }));

      // Calcular subtotales
      itemsData.forEach(item => {
        item.subtotal = item.cantidad * item.precio;
      });

      const subtotal = itemsData.reduce((sum, item) => sum + item.subtotal, 0);
      const impuestos = subtotal * 0.18;
      const total = subtotal + impuestos;

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
          estado: estados[Math.floor(Math.random() * estados.length)],
          observaciones: `Pedido de venta para ${cliente.nombre}`,
          usuarioId: usuarioId,
          items: {
            create: itemsData
          }
        }
      });

      console.log(`✅ Pedido de venta ${pedidoVenta.numero} creado con ${itemsData.length} productos`);
    }

    // 3. VERIFICAR RESULTADOS
    console.log('\n📊 Verificando resultados...');
    
    const totalPedidosCompra = await prisma.pedidoCompra.count();
    const totalPedidosVenta = await prisma.pedidoVenta.count();
    
    console.log(`✅ Pedidos de compra creados: ${totalPedidosCompra}`);
    console.log(`✅ Pedidos de venta creados: ${totalPedidosVenta}`);
    
    console.log('\n🎉 ¡Datos de compras y ventas insertados exitosamente!');
    
  } catch (error) {
    console.error('💥 Error fatal:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSimple();