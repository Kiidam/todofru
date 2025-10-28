import { NextRequest } from 'next/server';
import { logger } from '../../../src/lib/logger';
import { prisma, safeTransaction } from '../../../src/lib/prisma';
import { z } from 'zod';
import { randomUUID } from 'crypto';
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
      id: string;
      email?: string;
    };
  };
}

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

export const POST = withErrorHandling(withAuth(async (request: NextRequest, context: AuthContext) => {
    const { session } = context;
    
    try {
      const body = await request.json();
      console.log('📥 Body recibido en /api/pedidos-venta:', JSON.stringify(body, null, 2));
      console.log('🔐 Session recibida:', session ? 'Sí' : 'No');
      console.log('👤 Usuario en session:', session?.user ? 'Sí' : 'No');
      console.log('🆔 User ID:', session?.user?.id || 'undefined');
      
      const parsed = ventaSchema.safeParse(body);
      if (!parsed.success) {
        console.error('❌ Error de validación:', parsed.error);
        return errorResponse('Datos inválidos', 400, { details: parsed.error.flatten() });
      }

  const { clienteId, fecha, motivo, numeroPedido, fechaEntrega, items } = parsed.data;
      console.log('✅ Datos validados:', { clienteId, fecha, motivo, numeroPedido, fechaEntrega, itemsCount: items.length });

      // Validar que no haya productos duplicados en los items
      const ids = items.map(i => i.productoId);
      const duplicados = ids.filter((id, idx) => ids.indexOf(id) !== idx);
      if (duplicados.length) {
        const unicos = Array.from(new Set(duplicados));
        console.error('❌ Productos duplicados:', unicos);
        return errorResponse('Productos duplicados en los items del pedido de venta', 400, { productosDuplicados: unicos });
      }

      // Validar cliente activo
      console.log('🔍 Validando cliente:', clienteId);
      const cliente = await validateActiveRecord(prisma.cliente, clienteId, 'Cliente');
      console.log('✅ Cliente validado:', cliente.id);

      console.log('🔍 Validando productos...');
      const productoIds = Array.from(new Set(items.map(i => i.productoId)));
      const productos = await prisma.producto.findMany({ where: { id: { in: productoIds }, activo: true } });
      console.log(`✅ Productos encontrados: ${productos.length} de ${productoIds.length}`);
      
      if (productos.length !== productoIds.length) {
        console.error('❌ Algunos productos no existen o están inactivos');
        return errorResponse('Uno o más productos no existen o están inactivos', 400);
      }

      // Validar stock suficiente para cada item
      console.log('🔍 Validando stock...');
      const stockMap = new Map(productos.map(p => [p.id, p.stock]));
      for (const it of items) {
        const stock = stockMap.get(it.productoId) ?? 0;
        console.log(`  Producto ${it.productoId}: stock=${stock}, necesario=${it.cantidad}`);
        if (it.cantidad > stock) {
          console.error(`❌ Stock insuficiente para producto ${it.productoId}`);
          return errorResponse(`Stock insuficiente para producto ${it.productoId}`, 400);
        }
      }
      console.log('✅ Stock suficiente para todos los productos');

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
      console.log('💰 Totales calculados:', { subtotal, impuestos, total });

      const numero = numeroPedido || generarNumeroPedido('PV');
      
      // Obtener usuarioId de forma segura
      let usuarioId: string;
      if (session?.user?.id) {
        usuarioId = session.user.id;
      } else if (session?.user?.email) {
        // Buscar usuario por email como fallback
        console.log('⚠️ Usuario ID no disponible, buscando por email:', session.user.email);
        const usuario = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!usuario) {
          console.error('❌ Usuario no encontrado por email');
          return errorResponse('Usuario no encontrado', 404);
        }
        usuarioId = usuario.id;
      } else {
        // Último recurso: usar el primer usuario disponible (solo para desarrollo/testing)
        console.log('⚠️ Session sin user.id ni user.email, buscando primer usuario disponible');
        const usuario = await prisma.user.findFirst();
        if (!usuario) {
          console.error('❌ No hay usuarios en el sistema');
          return errorResponse('No hay usuarios disponibles en el sistema', 500);
        }
        usuarioId = usuario.id;
        console.log('⚠️ Usando usuario por defecto:', usuarioId);
      }
      
  const fechaVenta = fecha ? new Date(fecha) : new Date();
  const fechaEntregaDt = fechaEntrega ? new Date(fechaEntrega) : null;
      
      console.log('🔍 Usuario ID:', usuarioId);
      console.log('📅 Fecha de venta:', fechaVenta);
      console.log('📝 Número de pedido:', numero);

      console.log('💾 Iniciando transacción...');
      const result = await safeTransaction(async (tx) => {
        const createData: any = {
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
        };
        // Evitar pasar campos no reconocidos por el cliente en caliente
        const pedido = await tx.pedidoVenta.create({ data: createData });
        // Fallback: actualizar fechaEntrega vía SQL bruto si fue enviada
        if (fechaEntregaDt) {
          try {
            await tx.$executeRawUnsafe(
              'UPDATE `pedidoventa` SET `fechaEntrega` = ? WHERE `id` = ?',
              fechaEntregaDt,
              pedido.id
            );
          } catch (e) {
            // No interrumpir la transacción si la columna no existe aún
            console.warn('No se pudo establecer fechaEntrega en pedidoventa (fallback):', e);
          }
        }
        console.log('✅ Pedido creado:', pedido.id);

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
        console.log('✅ Items del pedido creados');

        for (const it of items) {
          const prod = await tx.producto.findUnique({ where: { id: it.productoId } });
          if (!prod) throw new Error('Producto no encontrado durante la transacción');
          const antes = prod.stock;
          const despues = Number((antes - it.cantidad).toFixed(4));

          await tx.producto.update({ where: { id: it.productoId }, data: { stock: despues } });
          console.log(`✅ Stock actualizado para ${it.productoId}: ${antes} → ${despues}`);

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
          console.log(`✅ Movimiento de inventario creado para ${it.productoId}`);
        }

        return pedido;
      });

      if (!result.success || !result.data) {
        console.error('❌ Error en transacción:', result.error);
        return errorResponse(result.error || 'Error al crear pedido de venta', 500);
      }

      console.log('✅ Transacción completada exitosamente');

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
      
    } catch (error) {
      console.error('❌ Error general en POST /api/pedidos-venta:', error);
      logger.error('Error al crear pedido de venta', { error });
      return errorResponse(`Error interno del servidor: ${error}`, 500);
    }
  }));

export const GET = withErrorHandling(withAuth(async (request: NextRequest, context: AuthContext) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = validatePagination(searchParams);

    const [pedidos, total] = await Promise.all([
      prisma.pedidoVenta.findMany({ 
        include: { 
          cliente: true, 
          usuario: true,
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
        take: limit 
      }),
      prisma.pedidoVenta.count(),
    ]);

    // Hydrate fechaEntrega via raw SQL to avoid client/datamodel drift
    try {
      const ids = pedidos.map((p: any) => p.id);
      if (ids.length) {
        const placeholders = ids.map(() => '?').join(',');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT id, fechaEntrega FROM pedidoventa WHERE id IN (${placeholders})`,
          ...ids
        );
        const map = new Map<string, Date | null>(rows.map(r => [String(r.id), r.fechaEntrega ? new Date(r.fechaEntrega) : null]));
        for (const p of pedidos as any[]) {
          if (map.has(p.id)) (p as any).fechaEntrega = map.get(p.id);
        }
      }
    } catch (e) {
      console.warn('No se pudo hidratar fechaEntrega en listado (fallback):', e);
    }

    // Return the array directly in `data` and use the top-level `pagination`
    // to match the frontend expectation: json.data -> PedidoVenta[]
    return successResponse(
      pedidos,
      `${pedidos.length} pedidos de venta encontrados`,
      { total, page, limit, totalPages: Math.ceil(total / limit) }
    );
}));