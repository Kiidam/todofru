import { NextRequest } from 'next/server';
import { logger } from '../../../src/lib/logger';
import { prisma, safeTransaction } from '../../../src/lib/prisma';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { Session } from 'next-auth';
import { 
  withAuth, 
  withErrorHandling, 
  validatePagination, 
  successResponse, 
  errorResponse,
  validateActiveRecord
} from '../../../src/lib/api-utils';

const itemSchema = z.object({
  productoId: z.string().min(1),
  cantidad: z.number().positive(),
  precio: z.number().min(0),
  unidad: z.string().optional(),
});

const ventaSchema = z.object({
  clienteId: z.string().min(1),
  fecha: z.string().optional(),
  motivo: z.string().optional(),
  numeroPedido: z.string().optional(),
  fechaEntrega: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

function generarNumeroPedido(prefix = 'PV') {
  const now = new Date();
  const y = now.getFullYear();
  const ts = String(now.getTime()).slice(-6);
  return `${prefix}-${y}-${ts}`;
}

export const POST = withErrorHandling(withAuth(async (request: NextRequest, session: Session) => {
    const body = await request.json();
    const parsed = ventaSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Datos inválidos', 400, { details: parsed.error.flatten() });
    }

    const { clienteId, fecha, motivo, numeroPedido, fechaEntrega, items } = parsed.data;

    // Validar que no haya productos duplicados en los items
    const ids = items.map(i => i.productoId);
    const duplicados = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    if (duplicados.length) {
      const unicos = Array.from(new Set(duplicados));
      return errorResponse('Productos duplicados en los items del pedido de venta', 400, { productosDuplicados: unicos });
    }

    // Validar cliente activo
    const cliente = await validateActiveRecord(prisma.cliente, clienteId, 'Cliente');

    const productoIds = Array.from(new Set(items.map(i => i.productoId)));
    const productos = await prisma.producto.findMany({ where: { id: { in: productoIds }, activo: true } });
    if (productos.length !== productoIds.length) {
      return errorResponse('Uno o más productos no existen o están inactivos', 400);
    }

    // Validar stock suficiente para cada item
    const stockMap = new Map(productos.map(p => [p.id, p.stock]));
    for (const it of items) {
      const stock = stockMap.get(it.productoId) ?? 0;
      if (it.cantidad > stock) {
        return errorResponse(`Stock insuficiente para producto ${it.productoId}`, 400);
      }
    }

    // Totales (IGV 18% si el producto tieneIGV)
    let subtotal = 0;
    let impuestos = 0;
    const mapProductoIGV = new Map(productos.map(p => [p.id, p.tieneIGV]));
    items.forEach(it => {
      const sub = it.cantidad * it.precio;
      subtotal += sub;
      if (mapProductoIGV.get(it.productoId)) impuestos += sub * 0.18;
    });
    const total = Number((subtotal + impuestos).toFixed(2));

    const numero = numeroPedido || generarNumeroPedido('PV');
    const usuarioId = session.user?.id || 'system';
    const fechaVenta = fecha ? new Date(fecha) : new Date();

    const result = await safeTransaction(async (tx) => {
      const pedido = await tx.pedidoVenta.create({
        data: {
          id: randomUUID(),
          numero,
          clienteId,
          fecha: fechaVenta,
          subtotal: Number(subtotal.toFixed(2)),
          impuestos: Number(impuestos.toFixed(2)),
          total,
          observaciones: motivo,
          usuarioId,
          estado: 'CONFIRMADO',
        },
      });

      await tx.pedidoVentaItem.createMany({
        data: items.map(it => ({
          id: randomUUID(),
          pedidoId: pedido.id,
          productoId: it.productoId,
          cantidad: it.cantidad,
          precio: it.precio,
          subtotal: Number((it.cantidad * it.precio).toFixed(2)),
        })),
      });

      for (const it of items) {
        const prod = await tx.producto.findUnique({ where: { id: it.productoId } });
        if (!prod) throw new Error('Producto no encontrado durante la transacción');
        const antes = prod.stock;
        const despues = Number((antes - it.cantidad).toFixed(4));

        await tx.producto.update({ where: { id: it.productoId }, data: { stock: despues } });

        await tx.movimientoInventario.create({
          data: {
            productoId: it.productoId,
            tipo: 'SALIDA',
            cantidad: it.cantidad,
            cantidadAnterior: antes,
            cantidadNueva: despues,
            precio: it.precio,
            motivo: 'Venta',
            pedidoVentaId: pedido.id,
            usuarioId,
          },
        });
      }

      return pedido;
    });

    if (!result.success || !result.data) {
      return errorResponse(result.error || 'Error al crear pedido de venta', 500);
    }

    logger.info('Pedido de venta creado', { 
      pedidoId: result.data.id,
      numero: result.data.numero,
      clienteId,
      total: result.data.total,
      usuarioId
    });

    return successResponse({ 
      id: result.data.id, 
      numero: result.data.numero, 
      total: result.data.total 
    }, 'Pedido de venta creado exitosamente');
}));

export const GET = withErrorHandling(withAuth(async (request: NextRequest, session: Session) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = validatePagination(searchParams);

    const [pedidos, total] = await Promise.all([
      prisma.pedidoVenta.findMany({ 
        include: { cliente: true, items: true }, 
        orderBy: { createdAt: 'desc' }, 
        skip, 
        take: limit 
      }),
      prisma.pedidoVenta.count(),
    ]);

    const response = successResponse({ 
      pedidos, 
      pagination: { total, page, limit, pages: Math.ceil(total / limit) } 
    }, `${pedidos.length} pedidos de venta encontrados`);
    
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    return response;
}));