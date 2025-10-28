/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma, safeTransaction } from '../../../../src/lib/prisma';
import { withAuth, withErrorHandling, errorResponse, successResponse, validateActiveRecord } from '../../../../src/lib/api-utils';

const itemSchema = z.object({
  productoId: z.string().min(1),
  cantidad: z.number().positive(),
  precio: z.number().min(0),
});

const updateSchema = z.object({
  fecha: z.string().optional(),
  fechaEntrega: z.string().optional(),
  motivo: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

export const PUT = withErrorHandling(withAuth(async (request: NextRequest, session: any, context: any) => {
  // Next.js 15 may pass params as an async object. Resolve it defensively.
  const maybeParams = (context as any)?.params;
  const params = typeof maybeParams?.then === 'function' ? await maybeParams : maybeParams;
  const id = params?.id as string | undefined;
  if (!id) return errorResponse('Id de pedido requerido', 400);

  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Datos inválidos', 400, parsed.error.flatten());
  }

  // Cargar pedido existente con items
  const pedido = await prisma.pedidoVenta.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!pedido) return errorResponse('Pedido de venta no encontrado', 404);
  if (pedido.estado === 'ANULADO' || pedido.estado === 'COMPLETADO') {
    return errorResponse('No se puede editar un pedido ANULADO o COMPLETADO', 400);
  }

  const { fecha, fechaEntrega, motivo, items } = parsed.data;

  // validar productos y duplicados
  const productoIds = Array.from(new Set(items.map(i => i.productoId)));
  if (productoIds.length !== items.length) {
    return errorResponse('Productos duplicados en los items', 400);
  }

  // Validar productos activos
  const productos = await prisma.producto.findMany({ where: { id: { in: productoIds }, activo: true } });
  if (productos.length !== productoIds.length) {
    return errorResponse('Uno o más productos no existen o están inactivos', 400);
  }

  // Prevalidar stock considerando devolución de items antiguos
  const oldByProd = new Map<string, number>();
  for (const it of pedido.items) oldByProd.set(it.productoId, (oldByProd.get(it.productoId) ?? 0) + it.cantidad);
  const newByProd = new Map<string, number>();
  for (const it of items) newByProd.set(it.productoId, (newByProd.get(it.productoId) ?? 0) + it.cantidad);

  const prodStocks = await prisma.producto.findMany({ where: { id: { in: Array.from(new Set([...oldByProd.keys(), ...newByProd.keys()])) } }, select: { id: true, stock: true } });
  const stockMap = new Map(prodStocks.map(p => [p.id, p.stock] as const));

  for (const pid of stockMap.keys()) {
    const oldQty = oldByProd.get(pid) ?? 0;
    const newQty = newByProd.get(pid) ?? 0;
    const current = stockMap.get(pid) ?? 0;
    const after = current + oldQty - newQty; // se devuelve lo viejo y se descuenta lo nuevo
    if (after < 0) {
      return errorResponse(`Stock insuficiente para producto ${pid}`, 400);
    }
  }

  // Recalcular totales con IGV 18% para productos con tieneIGV
  const fullProductos = await prisma.producto.findMany({ where: { id: { in: productoIds } }, select: { id: true, tieneIGV: true } });
  const igvMap = new Map(fullProductos.map(p => [p.id, p.tieneIGV] as const));
  let subtotal = 0, impuestos = 0;
  for (const it of items) {
    const sub = it.cantidad * it.precio;
    subtotal += sub;
    if (igvMap.get(it.productoId)) impuestos += sub * 0.18;
  }
  const total = Number((subtotal + impuestos).toFixed(2));

  // Obtener usuarioId para auditoría/movimientos
  let usuarioId: string | undefined = session?.user?.id;
  if (!usuarioId && session?.user?.email) {
    const u = await prisma.user.findUnique({ where: { email: session.user.email } });
    usuarioId = u?.id;
  }
  if (!usuarioId) {
    const u = await prisma.user.findFirst();
    usuarioId = u?.id;
  }
  if (!usuarioId) return errorResponse('No hay usuario válido para registrar movimientos', 500);

  // Transacción: ajustar stock, reemplazar items, actualizar pedido y crear movimientos
  const txResult = await safeTransaction(async (tx) => {
    // Map de deltas
    const allProdIds = Array.from(new Set([...oldByProd.keys(), ...newByProd.keys()]));
    for (const pid of allProdIds) {
      const oldQty = oldByProd.get(pid) ?? 0;
      const newQty = newByProd.get(pid) ?? 0;
      const delta = newQty - oldQty; // positivo => más salida, negativo => devolución
      if (delta !== 0) {
        const prod = await tx.producto.findUnique({ where: { id: pid } });
        if (!prod) throw new Error('Producto no encontrado en edición');
        const antes = prod.stock;
        const despues = Number((antes - delta).toFixed(4));
        await tx.producto.update({ where: { id: pid }, data: { stock: despues } });
        await tx.movimientoInventario.create({
          data: {
            productoId: pid,
            tipo: 'AJUSTE',
            cantidad: Math.abs(delta),
            cantidadAnterior: antes,
            cantidadNueva: despues,
            precio: null,
            motivo: 'Ajuste edición de venta',
            pedidoVentaId: id,
            usuarioId,
          }
        });
      }
    }

    // Reemplazar items
    await tx.pedidoVentaItem.deleteMany({ where: { pedidoId: id } });
    await tx.pedidoVentaItem.createMany({ data: items.map(it => ({
      id: crypto.randomUUID(),
      pedidoId: id,
      productoId: it.productoId,
      cantidad: it.cantidad,
      precio: it.precio,
      subtotal: Number((it.cantidad * it.precio).toFixed(2)),
    })) });

    // Actualizar cabecera
    const updateData: any = {
      fecha: fecha ? new Date(fecha) : pedido.fecha,
      subtotal: Number(subtotal.toFixed(2)),
      impuestos: Number(impuestos.toFixed(2)),
      total,
      observaciones: typeof motivo === 'string' ? motivo : pedido.observaciones,
    };
    const updated = await tx.pedidoVenta.update({ where: { id }, data: updateData });
    // Fallback: actualizar fechaEntrega vía SQL si fue provista
    if (typeof fechaEntrega === 'string' && fechaEntrega) {
      try {
        await tx.$executeRawUnsafe(
          'UPDATE `pedidoventa` SET `fechaEntrega` = ? WHERE `id` = ?',
          new Date(fechaEntrega),
          id
        );
      } catch (e) {
        console.warn('No se pudo actualizar fechaEntrega en pedidoventa (fallback):', e);
      }
    }

    // Auditoría
    try {
      await tx.auditoria.create({
        data: {
          id: crypto.randomUUID(),
          tabla: 'pedidoventa',
          registroId: id,
          accion: 'UPDATE',
          datosAnteriores: pedido as unknown as any,
          datosNuevos: {
            fecha: updated.fecha,
            subtotal: updated.subtotal,
            impuestos: updated.impuestos,
            total: updated.total,
            observaciones: updated.observaciones,
            items,
          } as any,
          usuarioId,
          ip: request.headers.get('x-forwarded-for') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        }
      });
    } catch { /* no-op */ }

    return updated;
  });

  if (!txResult.success || !txResult.data) {
    return errorResponse(txResult.error || 'Error al actualizar pedido de venta', 500);
  }

  return successResponse({ id: txResult.data.id }, 'Pedido de venta actualizado');
}));
