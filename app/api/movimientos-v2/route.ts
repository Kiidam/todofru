import { NextRequest, NextResponse } from 'next/server';
import { prisma, safeTransaction } from '../../../src/lib/prisma';
import { logger } from '../../../src/lib/logger';
import { 
  withAuth, 
  withErrorHandling, 
  successResponse, 
  errorResponse,
  validatePagination
} from '../../../src/lib/api-utils';
import { z } from 'zod';
import { validateProductoParaMovimiento } from '../../../src/lib/producto-inventario-sync';
import { 
  validateStockForMovement, 
  syncAfterMovementCreate 
} from '../../../src/lib/movimientos-v2-sync';
import type { TipoMovimiento } from '@/src/types/todafru';

// Tipos para el contexto de autenticación
interface AuthContext {
  session: {
    user: {
      id: string;
    };
  };
}

// Esquemas de validación mejorados
const movimientoCreateSchema = z.object({
  productoId: z.string().min(1, 'El producto es requerido'),
  tipo: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE']),
  cantidad: z.number().positive('La cantidad debe ser positiva'),
  precio: z.number().min(0, 'El precio no puede ser negativo').optional(),
  motivo: z.string().max(500, 'El motivo no puede exceder 500 caracteres').optional(),
  numeroGuia: z.string().max(100, 'El número de guía no puede exceder 100 caracteres').optional(),
});

const movimientoFiltersSchema = z.object({
  productoId: z.string().optional(),
  tipo: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE']).optional(),
  fechaDesde: z.string().optional().refine((val) => {
    if (!val) return true;
    return !isNaN(Date.parse(val));
  }, { message: 'Fecha desde inválida' }),
  fechaHasta: z.string().optional().refine((val) => {
    if (!val) return true;
    return !isNaN(Date.parse(val));
  }, { message: 'Fecha hasta inválida' }),
  motivo: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// GET /api/movimientos-v2 - Listar movimientos con filtros avanzados
export const GET = withErrorHandling(withAuth(async (request: NextRequest, context: AuthContext) => {
  const { session } = context;
  const { searchParams } = new URL(request.url);
  
  try {
    // Log de parámetros recibidos para debugging
    const rawParams = {
      productoId: searchParams.get('productoId'),
      tipo: searchParams.get('tipo'),
      fechaDesde: searchParams.get('fechaDesde'),
      fechaHasta: searchParams.get('fechaHasta'),
      motivo: searchParams.get('motivo'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    };
    
    logger.info('Parámetros recibidos en movimientos-v2:', rawParams);
    
    // Validar parámetros de entrada
    const filters = movimientoFiltersSchema.parse(rawParams);

    // Construir filtros de base de datos
    const where = {
      ...(filters.productoId && { productoId: filters.productoId }),
      ...(filters.tipo && { tipo: filters.tipo as TipoMovimiento }),
      ...(filters.motivo && { 
        motivo: { 
          contains: filters.motivo,
          mode: 'insensitive' as const
        }
      }),
      ...(filters.fechaDesde || filters.fechaHasta) && {
        createdAt: {
          ...(filters.fechaDesde && { gte: new Date(filters.fechaDesde) }),
          ...(filters.fechaHasta && { lte: new Date(filters.fechaHasta) })
        }
      }
    };

    const skip = (filters.page - 1) * filters.limit;

    // Ejecutar consultas en paralelo para mejor rendimiento
    const [movimientos, total, estadisticas] = await Promise.all([
      prisma.movimientoInventario.findMany({
        where,
        include: {
          producto: {
            select: {
              id: true,
              nombre: true,
              sku: true,
              activo: true,
              unidadMedida: { 
                select: { simbolo: true } 
              },
              categoria: {
                select: { nombre: true }
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
              numero: true
            }
          },
          pedidoVenta: {
            select: {
              id: true,
              numero: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: filters.limit
      }),
      prisma.movimientoInventario.count({ where }),
      // Estadísticas adicionales
      prisma.movimientoInventario.groupBy({
        by: ['tipo'],
        where,
        _count: { tipo: true },
        _sum: { cantidad: true }
      })
    ]);

    const pagination = {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
      hasNext: filters.page < Math.ceil(total / filters.limit),
      hasPrev: filters.page > 1
    };

    // Formatear estadísticas
    const stats = estadisticas.reduce((acc, stat) => {
      acc[stat.tipo] = {
        count: stat._count.tipo,
        totalCantidad: stat._sum.cantidad || 0
      };
      return acc;
    }, {} as Record<string, { count: number; totalCantidad: number }>);

    logger.info('Movimientos consultados exitosamente', {
      userId: session.user.id,
      filters,
      total,
      page: filters.page
    });

    return successResponse({
      movimientos,
      estadisticas: stats,
      filtros: filters
    }, `${movimientos.length} movimientos encontrados`, pagination);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Parámetros de consulta inválidos', 400, {
        validationErrors: error.issues
      });
    }
    
    logger.error('Error al consultar movimientos', { 
      error, 
      userId: session.user.id 
    });
    return errorResponse('Error interno al consultar movimientos', 500);
  }
}));

// POST /api/movimientos-v2 - Crear nuevo movimiento con validaciones robustas
export const POST = withErrorHandling(withAuth(async (request: NextRequest, context: AuthContext) => {
  const { session } = context;
  
  try {
    const body = await request.json();
    const validatedData = movimientoCreateSchema.parse(body);

    // Validación de sincronización del producto
    const validationResult = await validateProductoParaMovimiento(validatedData.productoId);
    
    if (!validationResult.isValid) {
      logger.warn('Intento de movimiento con producto inválido', {
        productoId: validatedData.productoId,
        error: validationResult.error,
        userId: session.user.id
      });
      
      return errorResponse('Producto no válido para movimiento', 400, {
        syncError: true,
        details: validationResult.error,
        suggestions: [
          'Verificar que el producto existe en el catálogo',
          'Activar el producto si está inactivo',
          'Contactar al administrador si el problema persiste'
        ]
      });
    }

    // Validación de stock usando el nuevo sistema de sincronización
    const stockValidation = await validateStockForMovement(
      validatedData.productoId,
      validatedData.cantidad,
      validatedData.tipo
    );

    if (!stockValidation.isValid) {
      logger.warn('Intento de movimiento con stock insuficiente', {
        productoId: validatedData.productoId,
        cantidad: validatedData.cantidad,
        stockActual: stockValidation.currentStock,
        errors: stockValidation.errors,
        userId: session.user.id
      });

      return errorResponse('Validación de stock fallida', 400, {
        stockError: true,
        currentStock: stockValidation.currentStock,
        requestedQuantity: stockValidation.requestedQuantity,
        productName: stockValidation.productName,
        errors: stockValidation.errors
      });
    }

    // Obtener información del usuario
    const usuario = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true }
    });

    if (!usuario) {
      return errorResponse('Usuario no encontrado', 401);
    }

    // Ejecutar transacción para crear movimiento y actualizar stock
    const result = await safeTransaction(async (tx) => {
      // Obtener producto actual con lock para evitar condiciones de carrera
      const producto = await tx.producto.findUnique({
        where: { id: validatedData.productoId },
        select: { 
          id: true, 
          nombre: true, 
          stock: true, 
          activo: true,
          stockMinimo: true
        }
      });

      if (!producto) {
        throw new Error('Producto no encontrado');
      }

      if (!producto.activo) {
        throw new Error('No se pueden crear movimientos para productos inactivos');
      }

      const stockAnterior = producto.stock;
      let stockNuevo: number;

      // Calcular nuevo stock según el tipo de movimiento
      switch (validatedData.tipo) {
        case 'ENTRADA':
          stockNuevo = Number((stockAnterior + validatedData.cantidad).toFixed(4));
          break;
        case 'SALIDA':
          stockNuevo = Number((stockAnterior - validatedData.cantidad).toFixed(4));
          if (stockNuevo < 0) {
            throw new Error(`Stock insuficiente. Stock actual: ${stockAnterior}, cantidad solicitada: ${validatedData.cantidad}`);
          }
          break;
        case 'AJUSTE':
          stockNuevo = Number(validatedData.cantidad.toFixed(4));
          break;
        default:
          throw new Error('Tipo de movimiento no válido');
      }

      // Crear el movimiento
      const movimiento = await tx.movimientoInventario.create({
        data: {
          productoId: validatedData.productoId,
          tipo: validatedData.tipo,
          cantidad: validatedData.cantidad,
          cantidadAnterior: stockAnterior,
          cantidadNueva: stockNuevo,
          precio: validatedData.precio,
          motivo: validatedData.motivo,
          numeroGuia: validatedData.numeroGuia,
          usuarioId: usuario.id,
        },
        include: {
          producto: {
            select: {
              nombre: true,
              sku: true,
              unidadMedida: { select: { simbolo: true } }
            }
          },
          usuario: {
            select: { name: true }
          }
        }
      });

      // Actualizar stock del producto
      await tx.producto.update({
        where: { id: validatedData.productoId },
        data: { stock: stockNuevo }
      });

      return {
        movimiento,
        stockAnterior,
        stockNuevo,
        alertaStockBajo: stockNuevo <= producto.stockMinimo && stockNuevo > 0
      };
    });

    if (!result.success || !result.data) {
      logger.error('Error en transacción de movimiento', {
        error: result.error,
        data: validatedData,
        userId: session.user.id
      });
      return errorResponse(result.error || 'Error al crear movimiento de inventario', 500);
    }

    const { movimiento, stockAnterior, stockNuevo, alertaStockBajo } = result.data;

    // Ejecutar sincronización después de crear el movimiento
    const syncResult = await syncAfterMovementCreate(movimiento.productoId, movimiento.createdAt);
    
    if (!syncResult.success) {
      logger.warn('Sincronización fallida después de crear movimiento', {
        productoId: movimiento.productoId,
        createdAt: movimiento.createdAt,
        syncError: syncResult.message,
        errors: syncResult.errors
      });
    }

    logger.info('Movimiento de inventario creado exitosamente', {
      productoId: movimiento.productoId,
      createdAt: movimiento.createdAt,
      tipo: validatedData.tipo,
      cantidad: validatedData.cantidad,
      stockAnterior,
      stockNuevo,
      usuarioId: usuario.id,
      syncSuccess: syncResult.success
    });

    const response = {
      movimiento,
      stockInfo: {
        anterior: stockAnterior,
        nuevo: stockNuevo,
        diferencia: stockNuevo - stockAnterior
      },
      alertas: alertaStockBajo ? ['Stock bajo detectado'] : [],
      sync: {
        success: syncResult.success,
        message: syncResult.message
      }
    };

    return successResponse(response, 'Movimiento de inventario creado exitosamente');

  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Datos de entrada inválidos', 400, {
        validationErrors: error.issues
      });
    }

    logger.error('Error al crear movimiento de inventario', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      userId: session.user.id,
      stack: error instanceof Error ? error.stack : undefined
    });

    return errorResponse(
      error instanceof Error ? error.message : 'Error interno al crear movimiento',
      500
    );
  }
}));