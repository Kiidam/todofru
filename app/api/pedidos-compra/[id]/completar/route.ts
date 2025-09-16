import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';

// PUT /api/pedidos-compra/[id]/completar - Completar pedido de compra
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
    const pedido = await prisma.pedidoCompra.findUnique({
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

    // Completar pedido y actualizar inventario en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // Actualizar estado del pedido
      const pedidoActualizado = await tx.pedidoCompra.update({
        where: { id: params.id },
        data: { estado: 'COMPLETADO' }
      });

      // Crear movimientos de inventario y actualizar stock para cada item
      const movimientos = [];
      for (const item of pedido.items) {
        const stockAnterior = item.producto.stock;
        const stockNuevo = stockAnterior + item.cantidad;

        // Crear movimiento de inventario
        const movimiento = await tx.movimientoInventario.create({
          data: {
            productoId: item.productoId,
            tipo: 'ENTRADA',
            cantidad: item.cantidad,
            cantidadAnterior: stockAnterior,
            cantidadNueva: stockNuevo,
            precio: item.precio,
            motivo: `Entrada por pedido de compra ${pedido.numero}`,
            numeroGuia: pedido.numeroGuia,
            pedidoCompraId: pedido.id,
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
    const pedidoCompleto = await prisma.pedidoCompra.findUnique({
      where: { id: params.id },
      include: {
        proveedor: { select: { id: true, nombre: true } },
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
    console.error('Error al completar pedido:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
