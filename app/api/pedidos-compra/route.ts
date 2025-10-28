import { NextRequest } from 'next/server';
import { logger } from '../../../src/lib/logger';
import { prisma, safeTransaction } from '../../../src/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';
import { 
  withAuth, 
  withErrorHandling, 
  validatePagination, 
  successResponse, 
  errorResponse,
  validateActiveRecord
} from '../../../src/lib/api-utils';

// Tipos para el contexto de autenticación
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

const compraSchema = z.object({
  proveedorId: z.string().min(1),
  fecha: z.string().optional(),
  observaciones: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

function generarNumeroPedido(prefix = 'PC') {
  const now = new Date();
  const y = now.getFullYear();
  const ts = String(now.getTime()).slice(-6);
  return `${prefix}-${y}-${ts}`;
}

export const POST = withErrorHandling(withAuth(async (request: NextRequest, context: AuthContext) => {
    const { session } = context;
    const body = await request.json();
    const parsed = compraSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Datos inválidos', 400, { details: parsed.error.flatten() });
    }

    const { proveedorId, fecha, observaciones, items } = parsed.data;

    // Validar que no haya productos duplicados en los items
    const ids = items.map(i => i.productoId);
    const duplicados = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    if (duplicados.length) {
      const unicos = Array.from(new Set(duplicados));
      return errorResponse('Productos duplicados en los items del pedido de compra', 400, { productosDuplicados: unicos });
    }

    // Validar proveedor activo
    const proveedor = await validateActiveRecord(prisma.proveedor, proveedorId, 'Proveedor');

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
    if (session?.user?.id) orConditions.push({ id: session.user.id });
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
      for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx];
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

export const GET = withErrorHandling(withAuth(async (request: NextRequest, context: AuthContext) => {
  const { session } = context;
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
                unidadMedida: true
              }
            }
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
    { data: pedidos, pagination: { total, page, limit } }
  );
  response.headers.set('Cache-Control', 'no-store');
  return response;
}));