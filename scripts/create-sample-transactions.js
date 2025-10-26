const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createSampleTransactions() {
  console.log('🧪 Creando transacciones de ejemplo (Compra y Venta) ...')

  try {
    // Obtener entidades base
    const admin = await prisma.user.findUnique({ where: { email: 'admin@todafru.com' } })
    const proveedor = await prisma.proveedor.findUnique({ where: { ruc: '20123456789' } })
    const cliente = await prisma.cliente.findUnique({ where: { ruc: '20555777999' } })
    const producto = await prisma.producto.findUnique({ where: { sku: 'NAR-VAL-001' } })

    if (!admin || !proveedor || !cliente || !producto) {
      throw new Error('Faltan entidades base para crear transacciones. Verifique seed básico.')
    }

    // 1) Pedido de Compra (idempotente)
    console.log('🛒 Creando/Verificando Pedido de Compra PC-2025-001 ...')
    const cantidadCompra = 10 // 10 kg
    const precioCompra = producto.precio // usar precio del producto como referencia

    let pedidoCompra = await prisma.pedidoCompra.findUnique({ where: { id: 'pc-2025-001' } })
    if (!pedidoCompra) {
      pedidoCompra = await prisma.pedidoCompra.create({
        data: {
          id: 'pc-2025-001',
          numero: 'PC-2025-001',
          proveedorId: proveedor.id,
          fecha: new Date(),
          subtotal: cantidadCompra * precioCompra,
          impuestos: 0,
          total: cantidadCompra * precioCompra,
          usuarioId: admin.id,
          items: {
            create: [
              {
                id: 'pci-2025-001',
                productoId: producto.id,
                cantidad: cantidadCompra,
                precio: precioCompra,
                subtotal: cantidadCompra * precioCompra,
              },
            ],
          },
        },
      })
    } else {
      // Asegurar items
      await prisma.pedidoCompraItem.createMany({
        data: [
          {
            id: 'pci-2025-001',
            pedidoId: pedidoCompra.id,
            productoId: producto.id,
            cantidad: cantidadCompra,
            precio: precioCompra,
            subtotal: cantidadCompra * precioCompra,
          },
        ],
        skipDuplicates: true,
      })
    }

    // Movimiento de Inventario ENTRADA (idempotente) y actualización de stock
    const entradaExistente = await prisma.movimientoInventario.findFirst({
      where: { pedidoCompraId: pedidoCompra.id, productoId: producto.id, tipo: 'ENTRADA' },
    })
    if (!entradaExistente) {
      const stockAnteriorCompra = producto.stock
      const stockNuevoCompra = stockAnteriorCompra + cantidadCompra
      const createdAtEntrada = new Date(Math.floor(Date.now() / 1000) * 1000)

      await prisma.movimientoInventario.create({
        data: {
          productoId: producto.id,
          tipo: 'ENTRADA',
          cantidad: cantidadCompra,
          cantidadAnterior: stockAnteriorCompra,
          cantidadNueva: stockNuevoCompra,
          precio: precioCompra,
          motivo: 'Compra PC-2025-001',
          pedidoCompraId: pedidoCompra.id,
          usuarioId: admin.id,
          createdAt: createdAtEntrada,
        },
      })

      await prisma.producto.update({ where: { id: producto.id }, data: { stock: stockNuevoCompra } })
      console.log('✅ Pedido de Compra y movimiento ENTRADA creados/actualizados')
    } else {
      console.log('ℹ️ Movimiento ENTRADA ya existe; no se modifica stock')
    }

    // Refrescar producto después de la entrada
    const productoPostEntrada = await prisma.producto.findUnique({ where: { id: producto.id } })

    // 2) Pedido de Venta (idempotente)
    console.log('🛍️  Creando/Verificando Pedido de Venta PV-2025-001 ...')
    const cantidadVenta = 5 // 5 kg
    const precioVenta = productoPostEntrada.precio // mismo precio

    let pedidoVenta = await prisma.pedidoVenta.findUnique({ where: { id: 'pv-2025-001' } })
    if (!pedidoVenta) {
      pedidoVenta = await prisma.pedidoVenta.create({
        data: {
          id: 'pv-2025-001',
          numero: 'PV-2025-001',
          clienteId: cliente.id,
          fecha: new Date(),
          subtotal: cantidadVenta * precioVenta,
          impuestos: 0,
          total: cantidadVenta * precioVenta,
          usuarioId: admin.id,
          items: {
            create: [
              {
                id: 'pvi-2025-001',
                productoId: producto.id,
                cantidad: cantidadVenta,
                precio: precioVenta,
                subtotal: cantidadVenta * precioVenta,
              },
            ],
          },
        },
      })
    } else {
      // Asegurar items
      await prisma.pedidoVentaItem.createMany({
        data: [
          {
            id: 'pvi-2025-001',
            pedidoId: pedidoVenta.id,
            productoId: producto.id,
            cantidad: cantidadVenta,
            precio: precioVenta,
            subtotal: cantidadVenta * precioVenta,
          },
        ],
        skipDuplicates: true,
      })
    }

    // Movimiento de Inventario SALIDA (idempotente) y actualización de stock
    const salidaExistente = await prisma.movimientoInventario.findFirst({
      where: { pedidoVentaId: pedidoVenta.id, productoId: producto.id, tipo: 'SALIDA' },
    })
    if (!salidaExistente) {
      const stockAnteriorVenta = productoPostEntrada.stock
      const stockNuevoVenta = stockAnteriorVenta - cantidadVenta
      const createdAtSalida = new Date(Math.floor(Date.now() / 1000) * 1000)

      await prisma.movimientoInventario.create({
        data: {
          productoId: producto.id,
          tipo: 'SALIDA',
          cantidad: cantidadVenta,
          cantidadAnterior: stockAnteriorVenta,
          cantidadNueva: stockNuevoVenta,
          precio: precioVenta,
          motivo: 'Venta PV-2025-001',
          pedidoVentaId: pedidoVenta.id,
          usuarioId: admin.id,
          createdAt: createdAtSalida,
        },
      })

      await prisma.producto.update({ where: { id: producto.id }, data: { stock: stockNuevoVenta } })
      console.log('✅ Pedido de Venta y movimiento SALIDA creados/actualizados')
    } else {
      console.log('ℹ️ Movimiento SALIDA ya existe; no se modifica stock')
    }

    console.log('🎯 Transacciones de ejemplo creadas/verificadas correctamente.')
  } catch (error) {
    console.error('❌ Error creando transacciones de ejemplo:', error)
    throw error
  }
}

createSampleTransactions()
  .catch((e) => {
    console.error('❌ Error fatal:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })