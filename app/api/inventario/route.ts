import { NextRequest, NextResponse } from 'next/server';
import { getProductosParaInventario, validateProductoInventarioSync } from '../../../src/lib/producto-inventario-sync';
import { prisma, safeTransaction } from '../../../src/lib/prisma';
import { logger } from '../../../src/lib/logger';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Session } from 'next-auth';
import { 
  withAuth, 
  withErrorHandling, 
  successResponse, 
  errorResponse,
  validateActiveRecord
} from '../../../src/lib/api-utils';

// GET /api/inventarios - Obtener productos y movimientos de inventario

export const GET = withErrorHandling(withAuth(async (request: NextRequest, session: Session) => {

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
          logger.error('Error al obtener productos', { error: productosError });
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
          logger.error('Error al obtener movimientos', { error: movimientosError });
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
          logger.error('Error en validación de sincronización', { error });
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
export const POST = withErrorHandling(withAuth(async (request: NextRequest, session: Session) => {
    const body = await request.json();
    const { productoId, tipo, cantidad, motivo, numeroGuia } = body;

    // Validar datos requeridos
    if (!productoId || !tipo || !cantidad) {
      return errorResponse('Faltan datos requeridos: productoId, tipo, cantidad', 400);
    }

    // Validar que el producto existe
    const producto = await validateActiveRecord(prisma.producto, productoId, 'Producto') as { id: string; stock: number; [key: string]: any };

    // Obtener usuario
    const usuario = session.user?.email 
      ? await prisma.user.findUnique({ where: { email: session.user.email } })
      : await prisma.user.findFirst(); // Fallback para modo test

    if (!usuario) {
      return errorResponse('Usuario no encontrado', 404);
    }

    // Validar stock para salidas
    if (tipo === 'salida' && producto.stock < cantidad) {
      return errorResponse('Stock insuficiente', 400);
    }

    // Crear movimiento de inventario en transacción
    const result = await safeTransaction(async (tx) => {
      // Calcular nuevo stock
      const nuevoStock = tipo === 'entrada' 
        ? producto.stock + cantidad 
        : producto.stock - cantidad;

      // Crear el movimiento
      const movimiento = await tx.movimientoInventario.create({
        data: {
          productoId,
          tipo,
          cantidad,
          cantidadAnterior: producto.stock,
          cantidadNueva: nuevoStock,
          motivo: motivo || '',
          numeroGuia: numeroGuia || null,
          usuarioId: usuario.id
        }
      });

      // Actualizar stock del producto
      await tx.producto.update({
        where: { id: productoId },
        data: { stock: nuevoStock }
      });

      return movimiento;
    });

    if (!result.success || !result.data) {
      return errorResponse(result.error || 'Error al crear movimiento de inventario', 500);
    }

    logger.info('Movimiento de inventario creado', { 
      movimientoId: result.data.productoId,
      productoId,
      tipo,
      cantidad,
      usuarioId: usuario.id
    });

    return successResponse({ 
      movimiento: result.data 
    }, 'Movimiento de inventario creado exitosamente');
}));
