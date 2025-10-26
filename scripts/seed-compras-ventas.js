const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function seedComprasVentas() {
  try {
    console.log('🚀 Iniciando inserción de datos de compras y ventas...\n');

    // Obtener datos existentes
    const productos = await prisma.producto.findMany({
      select: { id: true, nombre: true, precio: true, unidadMedidaId: true }
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

    const usuarioId = usuarios[0].id; // Usar el primer usuario disponible

    console.log(`📊 Datos disponibles:`);
    console.log(`- Productos: ${productos.length}`);
    console.log(`- Clientes: ${clientes.length}`);
    console.log(`- Proveedores: ${proveedores.length}`);
    console.log(`- Usuario para transacciones: ${usuarios[0].name}\n`);

    // 1. CREAR PEDIDOS DE COMPRA
    console.log('📦 Creando pedidos de compra...');
    
    const pedidosCompra = [];
    const fechaBase = new Date();
    
    for (let i = 0; i < 5; i++) {
      const proveedor = proveedores[i % proveedores.length];
      const fecha = new Date(fechaBase);
      fecha.setDate(fecha.getDate() - (30 - i * 5)); // Fechas escalonadas en el último mes
      
      const pedidoId = randomUUID();
      const numero = `PC-${String(Date.now() + i).slice(-6)}`;
      
      // Seleccionar 2-4 productos aleatorios para este pedido
      const productosParaPedido = productos
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 3) + 2);
      
      let subtotal = 0;
      const items = [];
      
      for (const producto of productosParaPedido) {
        const cantidad = Math.floor(Math.random() * 50) + 10; // 10-59 unidades
        const precioCompra = producto.precio * 0.7; // 70% del precio de venta
        const subtotalItem = cantidad * precioCompra;
        subtotal += subtotalItem;
        
        items.push({
          id: randomUUID(),
          productoId: producto.id,
          cantidad,
          precio: precioCompra,
          subtotal: subtotalItem
        });
      }
      
      const impuestos = subtotal * 0.18; // IGV 18%
      const total = subtotal + impuestos;
      
      const pedidoCompra = {
        id: pedidoId,
        numero,
        proveedorId: proveedor.id,
        fecha,
        fechaEntrega: new Date(fecha.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 días después
        subtotal,
        impuestos,
        total,
        observaciones: `Pedido de compra a ${proveedor.nombre}`,
        usuarioId,
        items
      };
      
      pedidosCompra.push(pedidoCompra);
    }

    // Insertar pedidos de compra
    for (const pedido of pedidosCompra) {
      const { items, ...pedidoData } = pedido;
      
      await prisma.pedidoCompra.create({
        data: {
          ...pedidoData,
          items: {
            create: items
          }
        }
      });
      
      console.log(`✅ Pedido de compra ${pedido.numero} creado - Total: S/ ${pedido.total.toFixed(2)}`);
    }

    // 2. CREAR MOVIMIENTOS DE INVENTARIO PARA LAS COMPRAS
    console.log('\n📈 Creando movimientos de inventario para compras...');
    
    for (const pedido of pedidosCompra) {
      for (const item of pedido.items) {
        const producto = productos.find(p => p.id === item.productoId);
        const stockAnterior = 0; // Asumimos que empezamos con stock 0
        const stockNuevo = stockAnterior + item.cantidad;
        
        await prisma.movimientoInventario.create({
          data: {
            productoId: item.productoId,
            tipo: 'ENTRADA',
            cantidad: item.cantidad,
            cantidadAnterior: stockAnterior,
            cantidadNueva: stockNuevo,
            precio: item.precio,
            motivo: `Compra - Pedido ${pedido.numero}`,
            pedidoCompraId: pedido.id,
            usuarioId
          }
        });
        
        // Actualizar stock del producto
        await prisma.producto.update({
          where: { id: item.productoId },
          data: { stock: stockNuevo }
        });
      }
    }

    // 3. CREAR PEDIDOS DE VENTA
    console.log('\n🛒 Creando pedidos de venta...');
    
    const pedidosVenta = [];
    
    for (let i = 0; i < 8; i++) {
      const cliente = clientes[i % clientes.length];
      const fecha = new Date(fechaBase);
      fecha.setDate(fecha.getDate() - (20 - i * 2)); // Fechas más recientes que las compras
      
      const pedidoId = randomUUID();
      const numero = `PV-${String(Date.now() + i + 1000).slice(-6)}`;
      
      // Seleccionar 1-3 productos que tengan stock
      const productosConStock = productos.filter(p => {
        // Verificar si el producto tiene stock después de las compras
        return pedidosCompra.some(pc => pc.items.some(item => item.productoId === p.id));
      });
      
      const productosParaPedido = productosConStock
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 3) + 1);
      
      let subtotal = 0;
      const items = [];
      
      for (const producto of productosParaPedido) {
        const cantidadMaxima = Math.min(20, 30); // Máximo 20 unidades por venta
        const cantidad = Math.floor(Math.random() * cantidadMaxima) + 1;
        const precioVenta = producto.precio;
        const subtotalItem = cantidad * precioVenta;
        subtotal += subtotalItem;
        
        items.push({
          id: randomUUID(),
          productoId: producto.id,
          cantidad,
          precio: precioVenta,
          subtotal: subtotalItem
        });
      }
      
      const impuestos = subtotal * 0.18; // IGV 18%
      const total = subtotal + impuestos;
      
      const estados = ['PENDIENTE', 'CONFIRMADO', 'EN_PROCESO', 'COMPLETADO'];
      const estado = estados[Math.floor(Math.random() * estados.length)];
      
      const pedidoVenta = {
        id: pedidoId,
        numero,
        clienteId: cliente.id,
        fecha,
        subtotal,
        impuestos,
        total,
        estado,
        observaciones: `Pedido de venta para ${cliente.nombre}`,
        usuarioId,
        items
      };
      
      pedidosVenta.push(pedidoVenta);
    }

    // Insertar pedidos de venta
    for (const pedido of pedidosVenta) {
      const { items, ...pedidoData } = pedido;
      
      await prisma.pedidoVenta.create({
        data: {
          ...pedidoData,
          items: {
            create: items
          }
        }
      });
      
      console.log(`✅ Pedido de venta ${pedido.numero} creado - Total: S/ ${pedido.total.toFixed(2)} - Estado: ${pedido.estado}`);
    }

    // 4. CREAR MOVIMIENTOS DE INVENTARIO PARA LAS VENTAS (solo para pedidos completados)
    console.log('\n📉 Creando movimientos de inventario para ventas completadas...');
    
    for (const pedido of pedidosVenta) {
      if (pedido.estado === 'COMPLETADO') {
        for (const item of pedido.items) {
          // Obtener stock actual del producto
          const productoActual = await prisma.producto.findUnique({
            where: { id: item.productoId },
            select: { stock: true }
          });
          
          const stockAnterior = productoActual.stock;
          const stockNuevo = Math.max(0, stockAnterior - item.cantidad);
          
          await prisma.movimientoInventario.create({
            data: {
              productoId: item.productoId,
              tipo: 'SALIDA',
              cantidad: item.cantidad,
              cantidadAnterior: stockAnterior,
              cantidadNueva: stockNuevo,
              precio: item.precio,
              motivo: `Venta - Pedido ${pedido.numero}`,
              pedidoVentaId: pedido.id,
              usuarioId
            }
          });
          
          // Actualizar stock del producto
          await prisma.producto.update({
            where: { id: item.productoId },
            data: { stock: stockNuevo }
          });
        }
      }
    }

    // 5. CREAR ALGUNAS RELACIONES PRODUCTO-PROVEEDOR
    console.log('\n🔗 Creando relaciones producto-proveedor...');
    
    for (let i = 0; i < Math.min(15, productos.length * 2); i++) {
      const producto = productos[i % productos.length];
      const proveedor = proveedores[i % proveedores.length];
      
      try {
        await prisma.productoProveedor.create({
          data: {
            id: randomUUID(),
            productoId: producto.id,
            proveedorId: proveedor.id,
            precioCompra: producto.precio * 0.7,
            tiempoEntrega: Math.floor(Math.random() * 10) + 3, // 3-12 días
            cantidadMinima: Math.floor(Math.random() * 20) + 5, // 5-24 unidades
            activo: true
          }
        });
      } catch (error) {
        // Ignorar errores de duplicados
        if (!error.message.includes('Unique constraint')) {
          console.warn(`⚠️  Error al crear relación producto-proveedor: ${error.message}`);
        }
      }
    }

    // RESUMEN FINAL
    console.log('\n🎉 ¡Datos de compras y ventas insertados exitosamente!');
    console.log('\n📊 RESUMEN:');
    console.log(`✅ ${pedidosCompra.length} pedidos de compra creados`);
    console.log(`✅ ${pedidosVenta.length} pedidos de venta creados`);
    console.log(`✅ Movimientos de inventario creados para todas las transacciones`);
    console.log(`✅ Relaciones producto-proveedor establecidas`);
    
    // Mostrar estado final del inventario
    const productosConStock = await prisma.producto.findMany({
      where: { stock: { gt: 0 } },
      select: { nombre: true, stock: true }
    });
    
    console.log(`\n📦 Productos con stock disponible: ${productosConStock.length}`);
    productosConStock.slice(0, 5).forEach(p => {
      console.log(`   - ${p.nombre}: ${p.stock} unidades`);
    });

  } catch (error) {
    console.error('❌ Error al insertar datos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
seedComprasVentas()
  .then(() => {
    console.log('\n✨ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });