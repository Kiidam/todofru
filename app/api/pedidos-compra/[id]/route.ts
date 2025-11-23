import { NextRequest } from 'next/server';
import { logger } from '../../../../src/lib/logger';
import { prisma, safeTransaction } from '../../../../src/lib/prisma';
import { z } from 'zod';
import { 
  withAuth, 
  withErrorHandling, 
  successResponse, 
  errorResponse,
  validateActiveRecord
} from '../../../../src/lib/api-utils';

interface AuthContext {
  session: {
    user: {
      id?: string;
      email?: string;
    };
  };
}

const itemSchema = z.object({
  productoId: z.string().min(1),
  cantidad: z.number().positive(),
  precioUnitario: z.number().min(0),
});

const updateCompraSchema = z.object({
  proveedorId: z.string().min(1),
  fecha: z.string(),
  motivo: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Debe incluir al menos un ítem'),
});

// GET /api/pedidos-compra/[id] - Obtener un pedido específico
export const GET = withErrorHandling(withAuth(async (
  request: NextRequest, 
  context: AuthContext & { params: Promise<{ id: string }> }
) => {
  // En Next.js 15, params es una Promise que debe resolverse
  const params = await context.params;
  const pedidoId = params.id;

  logger.info('[GET] Solicitando pedido', { pedidoId });

  const pedido = await prisma.pedidoCompra.findUnique({
    where: { id: pedidoId },
    include: {
      proveedor: true,
      items: {
        include: {
          producto: {
            include: {
              unidadMedida: true,
            },
          },
        },
      },
      usuario: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!pedido) {
    logger.error('[GET] Pedido no encontrado', { pedidoId });
    return errorResponse('Pedido de compra no encontrado', 404);
  }

  logger.info('[GET] Pedido encontrado', { pedidoId, numero: pedido.numero });
  return successResponse(pedido);
}));

// PUT /api/pedidos-compra/[id] - Actualizar un pedido de compra
export const PUT = withErrorHandling(withAuth(async (
  request: NextRequest,
  context: AuthContext & { params: Promise<{ id: string }> }
) => {
  // En Next.js 15, params es una Promise que debe resolverse
  const params = await context.params;
  const pedidoId = params.id;
  const { session } = context;

  logger.info(`[PUT] Iniciando actualización de pedido`, { pedidoId });

  // Verificar que el pedido existe
  const pedidoExistente = await prisma.pedidoCompra.findUnique({
    where: { id: pedidoId },
    include: {
      items: true,
    },
  });

  if (!pedidoExistente) {
    logger.error(`[PUT] Pedido no encontrado`, { pedidoId });
    return errorResponse('Pedido de compra no encontrado', 404);
  }

  // Parsear y validar el body
  const body = await request.json();
  logger.info(`[PUT] Body recibido`, { body });

  let validated;
  try {
    validated = updateCompraSchema.parse(body);
    logger.info(`[PUT] Validación exitosa`, { validated });
  } catch (error) {
    logger.error(`[PUT] Error en validación Zod`, { error });
    if (error instanceof z.ZodError) {
      return errorResponse(
        'Datos inválidos: ' + error.issues.map((e) => e.message).join(', '),
        400
      );
    }
    return errorResponse('Error al procesar los datos', 400);
  }

  // Validar proveedor
  try {
    await validateActiveRecord(prisma.proveedor, validated.proveedorId, 'proveedor');
    logger.info(`[PUT] Proveedor validado`, { proveedorId: validated.proveedorId });
  } catch (error) {
    logger.error(`[PUT] Error al validar proveedor`, { error, proveedorId: validated.proveedorId });
    return errorResponse('Proveedor inválido o inactivo', 400);
  }

  // Validar productos
  try {
    for (const item of validated.items) {
      await validateActiveRecord(prisma.producto, item.productoId, 'producto');
    }
    logger.info(`[PUT] Productos validados`, { count: validated.items.length });
  } catch (error) {
    logger.error(`[PUT] Error al validar productos`, { error });
    return errorResponse('Uno o más productos son inválidos o están inactivos', 400);
  }

  // Obtener usuario de la sesión
  const userEmail = session?.user?.email;
  if (!userEmail) {
    logger.error(`[PUT] Email de usuario no encontrado en sesión`);
    return errorResponse('Email de usuario no encontrado en sesión', 401);
  }

  const usuarioDb = await prisma.user.findFirst({ where: { email: userEmail } });
  if (!usuarioDb) {
    logger.error(`[PUT] Usuario no encontrado en DB`, { email: userEmail });
    return errorResponse('Usuario no encontrado en la base de datos', 401);
  }

  logger.info(`[PUT] Usuario validado`, { userId: usuarioDb.id, email: userEmail });

  // Usar transacción para actualizar todo
  logger.info(`[PUT] Iniciando transacción de actualización`);
  const pedidoActualizado = await safeTransaction(async (tx) => {
    // 1. Revertir los movimientos de inventario anteriores
    logger.info(`[PUT] Paso 1: Buscando movimientos anteriores`, { pedidoId });
    const movimientosAnteriores = await tx.movimientoInventario.findMany({
      where: { pedidoCompraId: pedidoId },
    });
    logger.info(`[PUT] Movimientos encontrados`, { count: movimientosAnteriores.length });

    for (const mov of movimientosAnteriores) {
      // Revertir el stock (restar la cantidad que se había agregado)
      const producto = await tx.producto.findUnique({ where: { id: mov.productoId } });
      if (producto) {
        const nuevoStock = producto.stock - mov.cantidad;
        logger.info(`[PUT] Revirtiendo stock`, { 
          productoId: mov.productoId, 
          stockActual: producto.stock, 
          cantidad: mov.cantidad,
          nuevoStock 
        });
        await tx.producto.update({
          where: { id: mov.productoId },
          data: { stock: nuevoStock },
        });
      }
    }

    // Eliminar movimientos anteriores
    logger.info(`[PUT] Paso 2: Eliminando movimientos anteriores`);
    await tx.movimientoInventario.deleteMany({
      where: { pedidoCompraId: pedidoId },
    });

    // 2. Eliminar items anteriores
    logger.info(`[PUT] Paso 3: Eliminando items anteriores`);
    await tx.pedidoCompraItem.deleteMany({
      where: { pedidoId: pedidoId },
    });

    // 3. Calcular nuevo total
    const subtotal = validated.items.reduce((sum, it) => {
      return sum + (it.cantidad * it.precioUnitario);
    }, 0);
    const total = Number(subtotal.toFixed(2));
    logger.info(`[PUT] Paso 4: Totales calculados`, { subtotal, total });

    // 4. Actualizar el pedido
    logger.info(`[PUT] Paso 5: Actualizando pedido`, { pedidoId });
  const pedido = await tx.pedidoCompra.update({
      where: { id: pedidoId },
      data: {
        proveedorId: validated.proveedorId,
        fecha: new Date(validated.fecha),
        subtotal: subtotal,
        total: total,
    observaciones: validated.motivo ?? null,
        updatedAt: new Date(),
      },
    });
    logger.info(`[PUT] Pedido actualizado`, { pedidoId: pedido.id, numero: pedido.numero });

    // 5. Crear nuevos items
    logger.info(`[PUT] Paso 6: Creando nuevos items`, { count: validated.items.length });
    await tx.pedidoCompraItem.createMany({
      data: validated.items.map(it => ({
        id: crypto.randomUUID(),
        pedidoId: pedido.id,
        productoId: it.productoId,
        cantidad: it.cantidad,
        precio: it.precioUnitario,
        subtotal: Number((it.cantidad * it.precioUnitario).toFixed(2)),
      })),
    });
    logger.info(`[PUT] Items creados exitosamente`);

    // 6. Actualizar stock y crear nuevos movimientos
    logger.info(`[PUT] Paso 7: Actualizando stocks y creando movimientos`);
    for (const it of validated.items) {
      const prod = await tx.producto.findUnique({ where: { id: it.productoId } });
      if (!prod) {
        logger.error(`[PUT] Producto no encontrado en transacción`, { productoId: it.productoId });
        throw new Error('Producto no encontrado durante la transacción');
      }
      
      const antes = prod.stock;
      const despues = Number((antes + it.cantidad).toFixed(4));

      logger.info(`[PUT] Actualizando stock producto`, {
        productoId: it.productoId,
        stockAntes: antes,
        cantidad: it.cantidad,
        stockDespues: despues
      });

      await tx.producto.update({
        where: { id: it.productoId },
        data: { stock: despues },
      });
      
      await tx.movimientoInventario.create({
        data: {
          productoId: it.productoId,
          tipo: 'ENTRADA',
          cantidad: it.cantidad,
          cantidadAnterior: antes,
          cantidadNueva: despues,
          precio: it.precioUnitario,
          motivo: 'Compra (Editada)',
          pedidoCompraId: pedido.id,
          usuarioId: usuarioDb.id,
        },
      });
    }
    logger.info(`[PUT] Stocks y movimientos actualizados`);

    return pedido;
  });

  // Verificar si hubo error en la transacción
  if (!pedidoActualizado.success || !pedidoActualizado.data) {
    logger.error(`[PUT] Error en transacción`, { 
      error: pedidoActualizado.error,
      success: pedidoActualizado.success 
    });
    return errorResponse(pedidoActualizado.error || 'Error al actualizar el pedido', 500);
  }

  const pedidoData = pedidoActualizado.data;

  logger.info(`[PUT] Pedido de compra actualizado exitosamente`, {
    pedidoId: pedidoData.id,
    numero: pedidoData.numero,
    total: pedidoData.total,
  });

  return successResponse(pedidoData, 'Pedido de compra actualizado exitosamente');
}));

// DELETE /api/pedidos-compra/[id] - Eliminar (o marcar como inactivo) un pedido
export const DELETE = withErrorHandling(withAuth(async (
  request: NextRequest,
  context: AuthContext & { params: Promise<{ id: string }> }
) => {
  // En Next.js 15, params es una Promise que debe resolverse
  const params = await context.params;
  const pedidoId = params.id;

  logger.info('[DELETE] Solicitando eliminar pedido', { pedidoId });

  // Verificar que el pedido existe
  const pedidoExistente = await prisma.pedidoCompra.findUnique({
    where: { id: pedidoId },
  });

  if (!pedidoExistente) {
    return errorResponse('Pedido de compra no encontrado', 404);
  }

  // En lugar de eliminar, podrías marcar como inactivo o simplemente eliminar
  // Para este ejemplo, vamos a eliminar en cascada
  await safeTransaction(async (tx) => {
    // Revertir movimientos de inventario
    const movimientos = await tx.movimientoInventario.findMany({
      where: { pedidoCompraId: pedidoId },
    });

    for (const mov of movimientos) {
      const producto = await tx.producto.findUnique({ where: { id: mov.productoId } });
      if (producto) {
        await tx.producto.update({
          where: { id: mov.productoId },
          data: { stock: producto.stock - mov.cantidad },
        });
      }
    }

    // Eliminar movimientos
    await tx.movimientoInventario.deleteMany({
      where: { pedidoCompraId: pedidoId },
    });

    // Eliminar items
    await tx.pedidoCompraItem.deleteMany({
      where: { pedidoId: pedidoId },
    });

    // Eliminar pedido
    await tx.pedidoCompra.delete({
      where: { id: pedidoId },
    });
  });

  logger.info(`Pedido de compra eliminado`, { pedidoId });

  return successResponse(null, 'Pedido de compra eliminado exitosamente');
}));
