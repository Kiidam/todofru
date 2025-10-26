import { NextRequest } from 'next/server';
import { logger } from '../../../src/lib/logger';
import { prisma, safeTransaction } from '../../../src/lib/prisma';
import { Prisma } from '@prisma/client';
import { Session } from 'next-auth';
import { z } from 'zod';
import * as crypto from 'crypto';
import { 
  withAuth, 
  withErrorHandling, 
  validatePagination, 
  successResponse, 
  errorResponse,
  validateActiveRecord
} from '../../../src/lib/api-utils';

const itemSchema = z
  .object({
    productoId: z.string().min(1),
    cantidad: z.number().positive(),
    // Aceptar precioUnitario o precio para compatibilidad con frontend
    precioUnitario: z.number().min(0).optional(),
    precio: z.number().min(0).optional(),
    unidad: z.string().optional(),
  })
  .refine((i) => i.precioUnitario !== undefined || i.precio !== undefined, {
    message: 'Debe proporcionar precioUnitario o precio',
    path: ['precioUnitario'],
  });

const compraSchema = z.object({
  proveedorId: z.string().min(1),
  fecha: z.string().optional(), // YYYY-MM-DD
  observaciones: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Debe incluir al menos un producto'),
});

function generarNumeroPedido(prefix = 'PC') {
  const now = new Date();
  const y = now.getFullYear();
  const ts = String(now.getTime()).slice(-6);
  return `${prefix}-${y}-${ts}`;
}

export const POST = withErrorHandling(withAuth(async (request: NextRequest, session: Session) => {
    const body = await request.json();
    const parsed = compraSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Datos inválidos', 400, { details: parsed.error.flatten() });
    }

    const { proveedorId, fecha, observaciones } = parsed.data;
    // Normalizar items: usar precioUnitario si existe, de lo contrario precio
    const items = parsed.data.items.map((it) => ({
      ...it,
      precioUnitario: it.precioUnitario ?? it.precio ?? 0,
    }));

    // Validar que no haya productos duplicados en los items
    const ids = items.map(i => i.productoId);
    const duplicados = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    if (duplicados.length) {
      const unicos = Array.from(new Set(duplicados));
      return errorResponse('Productos duplicados en los items del pedido de compra', 400, { productosDuplicados: unicos });
    }

    // Validar proveedor activo
    let proveedor: { id: string; nombre: string; ruc: string | null; activo: boolean } | null = null;
    try {
      proveedor = await validateActiveRecord(prisma.proveedor, proveedorId, 'Proveedor');
    } catch (err: unknown) {
      // Fallback para esquemas con columnas faltantes
      const msg = err instanceof Error ? String(err.message).toLowerCase() : '';
      let code: string | undefined;
      let missingColumn = '';
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        code = err.code;
        const meta = err.meta as { column?: string } | undefined;
        missingColumn = typeof meta?.column === 'string' ? meta.column.toLowerCase() : '';
      }
      const unknownColumn = msg.includes('unknown column');
      const contactoMissing = (unknownColumn && msg.includes('contacto')) || (code === 'P2022' && (missingColumn.includes('contacto') || msg.includes('contacto')));
      const direccionMissing = (unknownColumn && msg.includes('direccion')) || (code === 'P2022' && (missingColumn.includes('direccion') || msg.includes('direccion')));
      if (contactoMissing || direccionMissing) {
        const safeId = String(proveedorId).replace(/'/g, "''");
        const rows = await prisma.$queryRawUnsafe<Array<{ id: string; nombre: string; ruc: string | null; activo: number }>>(
          `SELECT id, nombre, ruc, 1 as activo FROM proveedor WHERE id = '${safeId}' LIMIT 1;`
        );
        proveedor = rows?.[0] ? { ...rows[0], activo: !!rows[0].activo } : null;
      } else {
        throw err;
      }
    }
    if (!proveedor || !proveedor.activo) {
      return errorResponse('Proveedor no válido', 400);
    }

    const productoIds = Array.from(new Set(items.map(i => i.productoId)));
    const productos = await prisma.producto.findMany({ where: { id: { in: productoIds }, activo: true } });
    if (productos.length !== productoIds.length) {
      return errorResponse('Uno o más productos no existen o están inactivos', 400);
    }

    // Calcular totales (IGV 18% para productos con tieneIGV)
    let subtotal = 0;
    let impuestos = 0;
    const mapProductoIGV = new Map(productos.map(p => [p.id, p.tieneIGV]));
    items.forEach(it => {
      const sub = it.cantidad * it.precioUnitario;
      subtotal += sub;
      if (mapProductoIGV.get(it.productoId)) impuestos += sub * 0.18;
    });
    const total = Number((subtotal + impuestos).toFixed(2));

    const numero = generarNumeroPedido('PC');
    const fechaCompra = fecha ? new Date(fecha) : new Date();

    // Buscar usuario en BD (por id o email) para relaciones
    const orConditions: Array<{ id?: string; email?: string }> = [];
    if ((session?.user as any)?.id) orConditions.push({ id: (session.user as any).id });
    if (session?.user?.email) orConditions.push({ email: session.user.email });
    const usuarioDb = await prisma.user.findFirst({
      where: {
        OR: orConditions.length ? orConditions : undefined,
      },
    });
    if (!usuarioDb) {
      return errorResponse('Usuario no encontrado', 404);
    }

    const result = await safeTransaction(async (tx) => {
      const pedido = await tx.pedidoCompra.create({
        data: {
          id: crypto.randomUUID(),
          numero,
          fecha: fechaCompra,
          subtotal: Number(subtotal.toFixed(2)),
          impuestos: Number(impuestos.toFixed(2)),
          total,
          observaciones,
          proveedor: { connect: { id: proveedorId } },
          usuario: { connect: { id: usuarioDb.id } },
        },
      });

      await tx.pedidoCompraItem.createMany({
        data: items.map(it => ({
          id: crypto.randomUUID(),
          pedidoId: pedido.id,
          productoId: it.productoId,
          cantidad: it.cantidad,
          precio: it.precioUnitario,
          subtotal: Number((it.cantidad * it.precioUnitario).toFixed(2)),
        })),
      });

      // Actualizar stock y registrar movimientos
      for (const it of items) {
        const prod = await tx.producto.findUnique({ where: { id: it.productoId } });
        if (!prod) throw new Error('Producto no encontrado durante la transacción');
        const antes = prod.stock;
        const despues = Number((antes + it.cantidad).toFixed(4));

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
            motivo: 'Compra',
            pedidoCompraId: pedido.id,
            usuarioId: usuarioDb.id,
          },
        });
      }

      return pedido;
    });

    logger.info('Pedido de compra creado exitosamente', { 
      pedidoId: result.data?.id, 
      numero: result.data?.numero, 
      total: result.data?.total,
      proveedorId,
      itemsCount: items.length 
    });

    return successResponse({ id: result.data?.id, numero: result.data?.numero, total: result.data?.total }, 'Pedido de compra creado exitosamente');
}));

export const GET = withErrorHandling(withAuth(async (request: NextRequest, session: Session) => {
  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = validatePagination(searchParams);

  const [pedidos, total] = await Promise.all([
    prisma.pedidoCompra.findMany({
      include: { 
        proveedor: true, 
        items: {
          include: {
            producto: {
              include: {
                unidadMedida: true,
                categoria: true
              }
            }
          }
        },
        usuario: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.pedidoCompra.count(),
  ]);

  const response = successResponse(
    { data: pedidos, pagination: { total, page, limit, pages: Math.ceil(total / limit) } },
    `${pedidos.length} pedidos de compra encontrados`
  );
  response.headers.set('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=120');
  return response;
}));