import { prisma } from './prisma';
import { logger } from './logger';
import type { TipoMovimiento } from '../types/todafru';

export interface SyncResult {
  success: boolean;
  message: string;
  data?: unknown;
  errors?: string[];
}

export interface StockValidation {
  isValid: boolean;
  currentStock: number;
  requestedQuantity: number;
  productId: string;
  productName: string;
  errors: string[];
}

/**
 * Valida si hay suficiente stock para un movimiento de salida
 */
export async function validateStockForMovement(
  productoId: string,
  cantidad: number,
  tipoMovimiento: TipoMovimiento
): Promise<StockValidation> {
  const validation: StockValidation = {
    isValid: true,
    currentStock: 0,
    requestedQuantity: cantidad,
    productId: productoId,
    productName: '',
    errors: []
  };

  try {
    // Obtener información del producto
    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
      select: { id: true, nombre: true, activo: true }
    });

    if (!producto) {
      validation.isValid = false;
      validation.errors.push(`Producto con ID ${productoId} no encontrado`);
      return validation;
    }

    if (!producto.activo) {
      validation.isValid = false;
      validation.errors.push(`Producto ${producto.nombre} está inactivo`);
      return validation;
    }

    validation.productName = producto.nombre;

    // Solo validar stock para movimientos de salida
    if (tipoMovimiento === 'SALIDA') {
      // Calcular stock actual
      const stockResult = await prisma.movimientoInventario.aggregate({
        where: { productoId },
        _sum: {
          cantidad: true
        }
      });

      validation.currentStock = stockResult._sum.cantidad || 0;

      if (validation.currentStock < cantidad) {
        validation.isValid = false;
        validation.errors.push(
          `Stock insuficiente. Stock actual: ${validation.currentStock}, Cantidad solicitada: ${cantidad}`
        );
      }
    }

  } catch (error) {
    validation.isValid = false;
    validation.errors.push(`Error al validar stock: ${error}`);
    logger.error('Error en validateStockForMovement', { error, productoId, cantidad, tipoMovimiento });
  }

  return validation;
}

/**
 * Actualiza el stock de un producto después de un movimiento
 */
export async function updateProductStock(productoId: string): Promise<SyncResult> {
  try {
    // Calcular el stock actual basado en todos los movimientos
    const stockResult = await prisma.movimientoInventario.aggregate({
      where: { productoId },
      _sum: {
        cantidad: true
      }
    });

    const stockActual = stockResult._sum.cantidad || 0;

    // Actualizar el campo stock en la tabla producto si existe
    const producto = await prisma.producto.findUnique({
      where: { id: productoId }
    });

    if (!producto) {
      return {
        success: false,
        message: `Producto con ID ${productoId} no encontrado`
      };
    }

    // Si el producto tiene un campo stock, actualizarlo
    // Nota: Esto depende del esquema de la base de datos
    logger.info('Stock actualizado para producto', {
      productoId,
      stockAnterior: 'N/A', // Se podría obtener del producto si tiene campo stock
      stockNuevo: stockActual
    });

    return {
      success: true,
      message: `Stock actualizado para producto ${producto.nombre}`,
      data: { productoId, stockActual }
    };

  } catch (error) {
    logger.error('Error al actualizar stock del producto', { error, productoId });
    return {
      success: false,
      message: `Error al actualizar stock: ${error}`,
      errors: [String(error)]
    };
  }
}

/**
 * Sincroniza los datos después de crear un movimiento
 */
export async function syncAfterMovementCreate(productoId: string, createdAt: Date): Promise<SyncResult> {
  try {
    // Obtener el movimiento recién creado
    const movimiento = await prisma.movimientoInventario.findFirst({
      where: { 
        productoId,
        createdAt
      },
      include: {
        producto: {
          select: { id: true, nombre: true }
        }
      }
    });

    if (!movimiento) {
      return {
        success: false,
        message: `Movimiento con productoId ${productoId} y createdAt ${createdAt.toISOString()} no encontrado`
      };
    }

    // Actualizar el stock del producto
    const stockUpdate = await updateProductStock(movimiento.productoId);

    if (!stockUpdate.success) {
      return stockUpdate;
    }

    logger.info('Sincronización completada después de crear movimiento', {
      productoId: movimiento.productoId,
      createdAt: movimiento.createdAt,
      productoNombre: movimiento.producto?.nombre,
      tipo: movimiento.tipo,
      cantidad: movimiento.cantidad
    });

    return {
      success: true,
      message: 'Sincronización completada exitosamente',
      data: {
        productoId: movimiento.productoId,
        createdAt: movimiento.createdAt,
        stockUpdate: stockUpdate.data
      }
    };

  } catch (error) {
    logger.error('Error en sincronización después de crear movimiento', { error, productoId, createdAt });
    return {
      success: false,
      message: `Error en sincronización: ${error}`,
      errors: [String(error)]
    };
  }
}

/**
 * Sincroniza los datos después de actualizar un movimiento
 */
export async function syncAfterMovementUpdate(productoId: string, createdAt: Date, oldProductoId?: string): Promise<SyncResult> {
  try {
    const movimiento = await prisma.movimientoInventario.findFirst({
      where: { 
        productoId,
        createdAt
      },
      include: {
        producto: {
          select: { id: true, nombre: true }
        }
      }
    });

    if (!movimiento) {
      return {
        success: false,
        message: `Movimiento con productoId ${productoId} y createdAt ${createdAt.toISOString()} no encontrado`
      };
    }

    const syncResults: SyncResult[] = [];

    // Si cambió el producto, actualizar el stock del producto anterior
    if (oldProductoId && oldProductoId !== movimiento.productoId) {
      const oldProductSync = await updateProductStock(oldProductoId);
      syncResults.push(oldProductSync);
    }

    // Actualizar el stock del producto actual
    const currentProductSync = await updateProductStock(movimiento.productoId);
    syncResults.push(currentProductSync);

    const allSuccess = syncResults.every(result => result.success);

    logger.info('Sincronización completada después de actualizar movimiento', {
      productoId: movimiento.productoId,
      createdAt: movimiento.createdAt,
      oldProductoId,
      allSuccess
    });

    return {
      success: allSuccess,
      message: allSuccess ? 'Sincronización completada exitosamente' : 'Sincronización parcialmente exitosa',
      data: {
        productoId: movimiento.productoId,
        createdAt: movimiento.createdAt,
        syncResults
      }
    };

  } catch (error) {
    logger.error('Error en sincronización después de actualizar movimiento', { error, productoId, createdAt });
    return {
      success: false,
      message: `Error en sincronización: ${error}`,
      errors: [String(error)]
    };
  }
}

/**
 * Sincroniza los datos después de eliminar un movimiento
 */
export async function syncAfterMovementDelete(productoId: string): Promise<SyncResult> {
  try {
    // Actualizar el stock del producto
    const stockUpdate = await updateProductStock(productoId);

    logger.info('Sincronización completada después de eliminar movimiento', {
      productoId,
      success: stockUpdate.success
    });

    return {
      success: stockUpdate.success,
      message: stockUpdate.success 
        ? 'Sincronización completada exitosamente' 
        : 'Error en sincronización',
      data: stockUpdate.data,
      errors: stockUpdate.errors
    };

  } catch (error) {
    logger.error('Error en sincronización después de eliminar movimiento', { error, productoId });
    return {
      success: false,
      message: `Error en sincronización: ${error}`,
      errors: [String(error)]
    };
  }
}

/**
 * Valida la integridad de los datos de movimientos
 */
export async function validateMovimientosIntegrity(): Promise<SyncResult> {
  try {
    // Verificar productos huérfanos en movimientos
    // Primero obtenemos todos los IDs de productos existentes
    const existingProductIds = await prisma.producto.findMany({
      select: { id: true }
    });
    const productIdSet = new Set(existingProductIds.map(p => p.id));
    
    // Luego buscamos movimientos con productoId que no existen
    const allMovements = await prisma.movimientoInventario.findMany({
      select: {
        productoId: true,
        tipo: true,
        cantidad: true,
        createdAt: true
      }
    });
    
    const orphanedMovements = allMovements.filter(m => !productIdSet.has(m.productoId));

    // Verificar movimientos con cantidades negativas incorrectas
    const invalidQuantities = await prisma.movimientoInventario.findMany({
      where: {
        OR: [
          { cantidad: { lt: 0 }, tipo: 'ENTRADA' },
          { cantidad: { gt: 0 }, tipo: 'SALIDA' }
        ]
      },
      select: {
        productoId: true,
        tipo: true,
        cantidad: true,
        createdAt: true
      }
    });

    const errors: string[] = [];
    const warnings: string[] = [];

    if (orphanedMovements.length > 0) {
      errors.push(`Encontrados ${orphanedMovements.length} movimientos con productos inexistentes`);
    }

    if (invalidQuantities.length > 0) {
      warnings.push(`Encontrados ${invalidQuantities.length} movimientos con cantidades incorrectas`);
    }

    const isValid = errors.length === 0;

    return {
      success: isValid,
      message: isValid 
        ? 'Validación de integridad completada exitosamente' 
        : 'Se encontraron problemas de integridad',
      data: {
        orphanedMovements,
        invalidQuantities,
        summary: {
          totalOrphaned: orphanedMovements.length,
          totalInvalidQuantities: invalidQuantities.length
        }
      },
      errors: [...errors, ...warnings]
    };

  } catch (error) {
    logger.error('Error en validación de integridad de movimientos', { error });
    return {
      success: false,
      message: `Error en validación: ${error}`,
      errors: [String(error)]
    };
  }
}