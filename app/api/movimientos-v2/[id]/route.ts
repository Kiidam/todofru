import { NextRequest } from 'next/server';
import { withAuth, withErrorHandling, successResponse, errorResponse } from '../../../../src/lib/api-utils';
import { prisma } from '../../../../src/lib/prisma';
import { logger } from '../../../../src/lib/logger';
import { z } from 'zod';
import { TipoMovimiento } from '../../../../src/types/todafru';
import {
  validateStockForMovement,
  syncAfterMovementUpdate,
  syncAfterMovementDelete
} from '../../../../src/lib/movimientos-v2-sync';
import { safeTransaction } from '../../../../src/lib/prisma';
import { Session } from 'next-auth';

const movimientoUpdateSchema = z.object({
  motivo: z.string().max(500, 'El motivo no puede exceder 500 caracteres').optional(),
  numeroGuia: z.string().max(100, 'El número de guía no puede exceder 100 caracteres').optional(),
});

// GET /api/movimientos-v2/[id] - Obtener movimiento específico
export const GET = withErrorHandling(withAuth(async (request: NextRequest, context: { session: Session }) => {
  const { session } = context;
  const { searchParams } = new URL(request.url);
  const productoId = searchParams.get('productoId');
  const createdAt = searchParams.get('createdAt');

  if (!productoId || !createdAt) {
    return errorResponse('Se requieren productoId y createdAt para identificar el movimiento', 400);
  }

  try {
    const movimiento = await prisma.movimientoInventario.findFirst({
      where: { 
        productoId,
        createdAt: new Date(createdAt)
      },
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            sku: true,
            activo: true,
            stock: true,
            stockMinimo: true,
            unidadMedida: { 
              select: { 
                id: true,
                nombre: true,
                simbolo: true 
              } 
            },
            categoria: {
              select: { 
                id: true,
                nombre: true 
              }
            }
          }
        },
        usuario: { 
          select: { 
            id: true,
            name: true,
            email: true
          } 
        },
        pedidoCompra: {
          select: {
            id: true,
            numero: true,
            fecha: true,
            proveedor: {
              select: {
                nombre: true
              }
            }
          }
        },
        pedidoVenta: {
          select: {
            id: true,
            numero: true,
            fecha: true,
            estado: true,
            cliente: {
              select: {
                nombre: true
              }
            }
          }
        }
      }
    });

    if (!movimiento) {
      return errorResponse('Movimiento no encontrado', 404);
    }

    // Obtener movimientos relacionados (anteriores y posteriores del mismo producto)
    const [movimientosAnteriores, movimientosPosteriores] = await Promise.all([
      prisma.movimientoInventario.findMany({
        where: {
          productoId: movimiento.productoId,
          createdAt: { lt: movimiento.createdAt }
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          tipo: true,
          cantidad: true,
          cantidadAnterior: true,
          cantidadNueva: true,
          createdAt: true,
          motivo: true
        }
      }),
      prisma.movimientoInventario.findMany({
        where: {
          productoId: movimiento.productoId,
          createdAt: { gt: movimiento.createdAt }
        },
        orderBy: { createdAt: 'asc' },
        take: 3,
        select: {
          tipo: true,
          cantidad: true,
          cantidadAnterior: true,
          cantidadNueva: true,
          createdAt: true,
          motivo: true
        }
      })
    ]);

    logger.info('Movimiento consultado exitosamente', {
      productoId,
      createdAt,
      userId: session.user.id
    });

    return successResponse({
      movimiento,
      contexto: {
        movimientosAnteriores,
        movimientosPosteriores
      }
    }, 'Movimiento encontrado');

  } catch (error) {
    logger.error('Error al consultar movimiento', { 
      error, 
      productoId,
      createdAt,
      userId: session.user.id 
    });
    return errorResponse('Error interno al consultar movimiento', 500);
  }
}));

// PUT /api/movimientos-v2/[id] - Actualizar movimiento (solo campos editables)
export const PUT = withErrorHandling(withAuth(async (request: NextRequest, context: { session: Session }) => {
  const { session } = context;
  const { searchParams } = new URL(request.url);
  const productoId = searchParams.get('productoId');
  const createdAt = searchParams.get('createdAt');

  if (!productoId || !createdAt) {
    return errorResponse('Se requieren productoId y createdAt para identificar el movimiento', 400);
  }

  try {
    const body = await request.json();
    const validatedData = movimientoUpdateSchema.parse(body);

    // Verificar que el movimiento existe
  const movimientoExistente = await prisma.movimientoInventario.findFirst({
      where: { 
        productoId,
        createdAt: new Date(createdAt)
      },
      select: {
        tipo: true,
        cantidad: true,
        productoId: true,
        usuarioId: true,
        createdAt: true,
        producto: {
          select: { nombre: true }
        }
      }
    });

    if (!movimientoExistente) {
      return errorResponse('Movimiento no encontrado', 404);
    }

    // Verificar permisos (solo el usuario que creó el movimiento o admin puede editarlo)
    const isAdmin = session.user.role === 'ADMIN';
    const isOwner = movimientoExistente.usuarioId === session.user.id;
    
    if (!isAdmin && !isOwner) {
      return errorResponse('No tienes permisos para editar este movimiento', 403);
    }

    // Verificar que el movimiento no sea muy antiguo (máximo 24 horas para edición)
    const horasTranscurridas = (Date.now() - movimientoExistente.createdAt.getTime()) / (1000 * 60 * 60);
    if (horasTranscurridas > 24 && !isAdmin) {
      return errorResponse('No se pueden editar movimientos con más de 24 horas de antigüedad', 400);
    }

    // Actualizar solo los campos permitidos
    await prisma.movimientoInventario.updateMany({
      where: { 
        productoId,
        createdAt: new Date(createdAt)
      },
      data: { ...validatedData }
    });

    const movimientoActualizado = await prisma.movimientoInventario.findFirst({
      where: { 
        productoId,
        createdAt: new Date(createdAt)
      },
      include: {
        producto: {
          select: {
            nombre: true,
            sku: true,
            unidadMedida: { select: { simbolo: true } }
          }
        },
        usuario: { select: { name: true } }
      }
    });

    // Ejecutar sincronización después de actualizar el movimiento
    const syncResult = await syncAfterMovementUpdate(productoId, new Date(createdAt));
    
    if (!syncResult.success) {
      logger.warn('Sincronización fallida después de actualizar movimiento', {
        productoId,
        createdAt,
        syncError: syncResult.message,
        errors: syncResult.errors
      });
    }

    logger.info('Movimiento actualizado exitosamente', {
      productoId,
      createdAt,
      cambios: validatedData,
      userId: session.user.id,
      syncSuccess: syncResult.success
    });

    const response = {
      ...movimientoActualizado,
      sync: {
        success: syncResult.success,
        message: syncResult.message
      }
    };

    return successResponse(response, 'Movimiento actualizado exitosamente');

  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Datos de entrada inválidos', 400, {
        validationErrors: error.issues
      });
    }

    logger.error('Error al actualizar movimiento', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      productoId,
      createdAt,
      userId: session.user.id
    });

    return errorResponse(
      error instanceof Error ? error.message : 'Error interno al actualizar movimiento',
      500
    );
  }
}));

// DELETE /api/movimientos-v2/[id] - Eliminar movimiento (solo admins y con restricciones)
export const DELETE = withErrorHandling(withAuth(async (request: NextRequest, context: { session: Session }) => {
  const { session } = context;
  const { searchParams } = new URL(request.url);
  const productoId = searchParams.get('productoId');
  const createdAt = searchParams.get('createdAt');

  if (!productoId || !createdAt) {
    return errorResponse('Se requieren productoId y createdAt para identificar el movimiento', 400);
  }

  try {
    // Solo administradores pueden eliminar movimientos
    if (session.user.role !== 'ADMIN') {
      return errorResponse('Solo los administradores pueden eliminar movimientos', 403);
    }

    // Verificar que el movimiento existe
    const movimiento = await prisma.movimientoInventario.findFirst({
      where: { 
        productoId,
        createdAt: new Date(createdAt)
      }
    });

    if (!movimiento) {
      return errorResponse('Movimiento no encontrado', 404);
    }

    // Verificar que no sea muy antiguo (máximo 48 horas para eliminación)
    const horasTranscurridas = (Date.now() - movimiento.createdAt.getTime()) / (1000 * 60 * 60);
    if (horasTranscurridas > 48) {
      return errorResponse('No se pueden eliminar movimientos con más de 48 horas de antigüedad', 400);
    }

    // Verificar que no esté asociado a pedidos
    if (movimiento.pedidoCompraId || movimiento.pedidoVentaId) {
      return errorResponse('No se pueden eliminar movimientos asociados a pedidos', 400);
    }

    // Ejecutar transacción para eliminar movimiento y revertir stock
  const result = await safeTransaction(async (tx) => {
      // Obtener datos del producto en la transacción para asegurar consistencia
      const producto = await tx.producto.findUnique({
        where: { id: movimiento.productoId },
        select: { stock: true, nombre: true }
      });
      const stockActual = producto?.stock ?? 0;
      let stockRevertido: number;

      // Calcular stock revertido según el tipo de movimiento
      switch (movimiento.tipo) {
        case 'ENTRADA':
          stockRevertido = Number((stockActual - movimiento.cantidad).toFixed(4));
          break;
        case 'SALIDA':
          stockRevertido = Number((stockActual + movimiento.cantidad).toFixed(4));
          break;
        case 'AJUSTE':
          // Para ajustes, revertir al stock anterior
          stockRevertido = movimiento.cantidadAnterior;
          break;
        default:
          throw new Error('Tipo de movimiento no válido');
      }

      if (stockRevertido < 0) {
        throw new Error('La eliminación resultaría en stock negativo');
      }

      // Eliminar el movimiento
      await tx.movimientoInventario.deleteMany({
        where: { 
          productoId,
          createdAt: new Date(createdAt)
        }
      });

      // Actualizar stock del producto
      await tx.producto.update({
        where: { id: movimiento.productoId },
        data: { stock: stockRevertido }
      });

      return {
        stockAnterior: stockActual,
        stockRevertido,
        movimientoEliminado: movimiento,
        productoNombre: producto?.nombre || ''
      };
    });

    if (!result.success || !result.data) {
      logger.error('Error en transacción de eliminación de movimiento', {
        error: result.error,
        productoId,
        createdAt,
        userId: session.user.id
      });
      return errorResponse(result.error || 'Error al eliminar movimiento', 500);
    }

    // Ejecutar sincronización después de eliminar el movimiento
  const syncResult = await syncAfterMovementDelete(movimiento.productoId);
    
    if (!syncResult.success) {
      logger.warn('Sincronización fallida después de eliminar movimiento', {
        productoId,
        createdAt,
        syncError: syncResult.message,
        errors: syncResult.errors
      });
    }

    logger.warn('Movimiento eliminado por administrador', {
      productoId,
      createdAt,
      tipo: movimiento.tipo,
      cantidad: movimiento.cantidad,
      stockAnterior: result.data.stockAnterior,
      stockRevertido: result.data.stockRevertido,
      adminId: session.user.id,
      syncSuccess: syncResult.success
    });

    return successResponse({
      movimientoEliminado: {
        productoId: movimiento.productoId,
        createdAt: movimiento.createdAt,
        tipo: movimiento.tipo,
        cantidad: movimiento.cantidad,
        producto: result.data.productoNombre
      },
      stockInfo: {
        anterior: result.data.stockAnterior,
        revertido: result.data.stockRevertido,
        diferencia: result.data.stockRevertido - result.data.stockAnterior
      },
      sync: {
        success: syncResult.success,
        message: syncResult.message
      }
    }, 'Movimiento eliminado exitosamente');

  } catch (error) {
    logger.error('Error al eliminar movimiento', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      productoId,
      createdAt,
      userId: session.user.id
    });

    return errorResponse(
      error instanceof Error ? error.message : 'Error interno al eliminar movimiento',
      500
    );
  }
}));