import { NextRequest, NextResponse } from 'next/server';
import { getProductosParaInventario, validateProductoInventarioSync } from '../../../src/lib/producto-inventario-sync';
import { prisma, safeTransaction as _safeTransaction } from '../../../src/lib/prisma';
import { logger as _logger } from '../../../src/lib/logger';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Session as _Session } from 'next-auth';
import { 
  withAuth, 
  withErrorHandling, 
  successResponse, 
  errorResponse,
  validateActiveRecord as _validateActiveRecord
} from '../../../src/lib/api-utils';
import { z } from 'zod';

// GET /api/inventarios - Obtener productos y movimientos de inventario

export const GET = withErrorHandling(withAuth(async (request: NextRequest, _session: _Session) => {

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'productos';

    switch (action) {
      case 'productos':
        // Obtener productos para inventario
        try {
          const baseProductos = await getProductosParaInventario();
          const productos = (baseProductos || []).map((p) => {
            const { precio = 0, stock = 0, stockMinimo = 0 } = (p as { precio?: number; stock?: number; stockMinimo?: number });
             const estado = stock === 0 ? 'Agotado' : (stock <= stockMinimo ? 'Stock Bajo' : 'Normal');
             const valorStock = Number((stock * precio).toFixed(2));
             return { ...p, estado, valorStock };
           });
          const response = successResponse({ productos }, `${productos.length} productos encontrados`);
          response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
          return response;
        } catch (productosError) {
          _logger.error('Error al obtener productos', { error: productosError });
          return successResponse({ productos: [] }, 'No se pudieron cargar los productos');
        }

      case 'movimientos':
        // Obtener movimientos de inventario
        try {
          const movimientos = await prisma.movimientoInventario.findMany({
            include: {
              producto: {
                select: {
                  nombre: true,
                  sku: true
                }
              },
              usuario: {
                select: {
                  name: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
    take: 50 // Limitar a últimos 50 movimientos
          });
          
          const response = successResponse({ movimientos }, `${movimientos.length} movimientos encontrados`);
          response.headers.set('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=120');
          return response;
        } catch (movimientosError) {
          _logger.error('Error al obtener movimientos', { error: movimientosError });
          return successResponse({ movimientos: [] }, 'No se pudieron cargar los movimientos');
        }

      case 'sync-validation':
        // Validar sincronización producto-inventario
        try {
          const syncValidation = await validateProductoInventarioSync();
          const response = successResponse({ syncValidation });
          response.headers.set('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=120');
          return response;
        } catch (error) {
          _logger.error('Error en validación de sincronización', { error });
          // Devolver un objeto de validación con error
          const errorSyncValidation = {
            isValid: false,
            errors: [`Error al validar sincronización: ${error}`],
            warnings: [],
            orphanedInventory: [],
            missingInventory: []
          };
          return successResponse({ syncValidation: errorSyncValidation });
        }

      case 'estadisticas':
        // Obtener estadísticas del inventario
        const productosActivos = await prisma.producto.findMany({
          where: { activo: true },
          select: { stock: true, stockMinimo: true, precio: true }
        });

        const totalProductos = productosActivos.length;
        type ProductoResumen = { stock: number | null; stockMinimo: number | null; precio: number | null };
        const productosStockBajo = productosActivos.filter((p: ProductoResumen) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= (p.stockMinimo ?? 0)).length;
        const productosSinStock = productosActivos.filter((p: ProductoResumen) => (p.stock ?? 0) === 0).length;
        const valorTotalInventario = productosActivos.reduce((sum: number, p: ProductoResumen) => sum + ((p.stock ?? 0) * (p.precio ?? 0)), 0);

        const estadisticas = {
          totalProductos,
          productosStockBajo,
          productosSinStock,
          valorTotalInventario
        };

        const statsResponse = successResponse({ estadisticas });
        statsResponse.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
        return statsResponse;

      default:
        return errorResponse('Acción no válida', 400);
    }
}));

// POST /api/inventarios - Crear movimiento de inventario
export const POST = withErrorHandling(withAuth(async (request: NextRequest, _session: _Session) => {
  const schema = z.object({
    productoId: z.string().min(1),
    tipo: z.enum(['ENTRADA','SALIDA','AJUSTE']).or(z.enum(['entrada','salida','ajuste'])),
    cantidad: z.number().positive(),
    motivo: z.string().optional(),
    numeroGuia: z.string().nullable().optional(),
  })

  const parsed = schema.safeParse(await request.json().catch(()=>({})))
  if (!parsed.success) return errorResponse('Datos inválidos', 400, parsed.error.flatten())

  const body = parsed.data
  const productoId = body.productoId
  const tipoUpper = (typeof body.tipo === 'string' ? body.tipo.toUpperCase() : body.tipo) as 'ENTRADA'|'SALIDA'|'AJUSTE'
  const cantidad = Math.round(body.cantidad * 100) / 100
  const motivo = body.motivo || ''
  const numeroGuia = body.numeroGuia ?? null

  const producto = await _validateActiveRecord(prisma.producto, productoId, 'Producto') as { id: string; stock: number; stockMinimo?: number }

  const usuario = _session.user?.email 
    ? await prisma.user.findUnique({ where: { email: _session.user.email } })
    : await prisma.user.findFirst()
  if (!usuario) return errorResponse('Usuario no encontrado', 404)

  if (tipoUpper === 'SALIDA' && producto.stock < cantidad) return errorResponse('Stock insuficiente', 400)

  const result = await _safeTransaction(async (tx: Prisma.TransactionClient) => {
    const prod = await tx.producto.findUnique({ where: { id: productoId }, select: { stock: true, stockMinimo: true } })
    if (!prod) throw new Error('Producto no encontrado')
    const nuevoStockRaw = tipoUpper === 'ENTRADA' ? (prod.stock || 0) + cantidad : (prod.stock || 0) - cantidad
    const nuevoStock = Math.max(0, Math.round(nuevoStockRaw * 100) / 100)

    const movimiento = await tx.movimientoInventario.create({
      data: {
        productoId,
        tipo: tipoUpper,
        cantidad,
        cantidadAnterior: prod.stock || 0,
        cantidadNueva: nuevoStock,
        motivo,
        numeroGuia,
        usuarioId: usuario.id
      }
    })

    await tx.producto.update({ where: { id: productoId }, data: { stock: nuevoStock } })

    const warning = prod.stockMinimo !== undefined && nuevoStock < (prod.stockMinimo || 0)
      ? 'El nuevo stock queda por debajo del mínimo'
      : undefined

    return { movimiento, warning }
  })

  if (!result.success || !result.data) return errorResponse(result.error || 'Error al crear movimiento de inventario', 500)

  _logger.info('Movimiento de inventario creado', { movimientoId: result.data.movimiento.id, productoId, tipo: tipoUpper, cantidad, usuarioId: usuario.id })

  return successResponse({ movimiento: result.data.movimiento, warning: result.data.warning }, 'Movimiento de inventario creado exitosamente')
}))
