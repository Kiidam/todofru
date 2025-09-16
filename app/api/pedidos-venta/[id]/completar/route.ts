import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';

// PUT /api/pedidos-venta/[id]/completar - Completar pedido de venta
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el pedido existe y está en estado válido
    const pedido = await prisma.pedidoVenta.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            producto: true
          }
        }
      }
    });

    if (!pedido) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    if (pedido.estado === 'COMPLETADO') {
      return NextResponse.json(
        { success: false, error: 'El pedido ya está completado' },
        { status: 400 }
      );
    }

    if (pedido.estado === 'ANULADO') {
      return NextResponse.json(
        { success: false, error: 'No se puede completar un pedido anulado' },
        { status: 400 }
      );
    }

    // Verificar stock disponible antes de completar
    const stockInsuficiente = [];
    for (const item of pedido.items) {
      if (item.producto.stock < item.cantidad) {
        stockInsuficiente.push({
          producto: item.producto.nombre,
          disponible: item.producto.stock,
          requerido: item.cantidad
        });
      }
    }

    if (stockInsuficiente.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Stock insuficiente para completar el pedido',
          stockInsuficiente 
        },
        { status: 400 }
      );
    }

    // Completar pedido y actualizar inventario en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // Actualizar estado del pedido
      const pedidoActualizado = await tx.pedidoVenta.update({
        where: { id: params.id },
        data: { estado: 'COMPLETADO' }
      });

      // Crear movimientos de inventario y actualizar stock para cada item
      const movimientos = [];
      for (const item of pedido.items) {
        const stockAnterior = item.producto.stock;
        const stockNuevo = stockAnterior - item.cantidad;

        // Crear movimiento de inventario
        const movimiento = await tx.movimientoInventario.create({
          data: {
            productoId: item.productoId,
            tipo: 'SALIDA',
            cantidad: item.cantidad,
            cantidadAnterior: stockAnterior,
            cantidadNueva: stockNuevo,
            precio: item.precio,
            motivo: `Salida por pedido de venta ${pedido.numero}`,
            numeroGuia: pedido.numeroGuia,
            pedidoVentaId: pedido.id,
            usuarioId: session.user.id
          }
        });

        // Actualizar stock del producto
        await tx.producto.update({
          where: { id: item.productoId },
          data: { stock: stockNuevo }
        });

        movimientos.push(movimiento);
      }

      return { pedido: pedidoActualizado, movimientos };
    });

    // Obtener el pedido actualizado con relaciones
    const pedidoCompleto = await prisma.pedidoVenta.findUnique({
      where: { id: params.id },
      include: {
        cliente: { select: { id: true, nombre: true, tipoCliente: true } },
        items: {
          include: {
            producto: { 
              select: { 
                id: true, 
                nombre: true, 
                sku: true,
                stock: true,
                unidadMedida: { select: { simbolo: true } }
              } 
            }
          }
        },
        movimientos: {
          include: {
            producto: { select: { nombre: true } }
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: pedidoCompleto,
      message: 'Pedido completado exitosamente. Inventario actualizado.'
    });
  } catch (error) {
    console.error('Error al completar pedido de venta:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
