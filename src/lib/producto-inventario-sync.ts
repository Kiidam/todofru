/**
 * Servicio de Sincronización entre Productos e Inventario
 * 
 * Este mÃ³dulo asegura que:
 * 1. Los productos son la fuente Ãºnica de verdad
 * 2. No existen productos "fantasma" en inventario
 * 3. Los movimientos de inventario solo pueden usar productos existentes
 * 4. La sincronización es automática y bidireccional
 */

import { prisma } from './prisma';
import { logger } from './logger';
import { Prisma } from '@prisma/client';

export interface ProductoInventarioSync {
  id: string;
  nombre: string;
  sku: string | null;
  stock: number;
  stockMinimo: number;
  precio: number;
  activo: boolean;
  categoria?: {
    nombre: string;
  } | null;
  unidadMedida: {
    simbolo: string;
  };
}

export interface SyncValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  orphanedInventory: string[]; // productos en inventario sin referencia en catálogo
  missingInventory: string[]; // productos en catálogo sin entrada en inventario
}

/**
 * Valida la consistencia entre productos e inventario
 */
export async function validateProductoInventarioSync(): Promise<SyncValidationResult> {
  const result: SyncValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    orphanedInventory: [],
    missingInventory: []
  };

  try {
    // Obtener todos los productos del catálogo
    const catalogoProductos = await prisma.producto.findMany({
      select: {
        id: true,
        nombre: true,
        sku: true,
        activo: true
      }
    });

    // Obtener todos los movimientos de inventario únicos por producto
    const movimientosInventario = await prisma.movimientoInventario.groupBy({
      by: ['productoId'],
      _count: {
        productoId: true
      }
    });

    const productosEnInventario = movimientosInventario.map((m: { productoId: string }) => m.productoId);
    const productosEnCatalogo = catalogoProductos.map((p: { id: string }) => p.id);

    // Buscar productos huérfanos en inventario (sin referencia en catálogo)
    result.orphanedInventory = productosEnInventario.filter(
      (productoId: string) => !productosEnCatalogo.includes(productoId)
    );

    // Buscar productos en catálogo sin movimientos de inventario
    result.missingInventory = productosEnCatalogo.filter(
      (productoId: string) => !productosEnInventario.includes(productoId)
    );

    // Generar reportes
    if (result.orphanedInventory.length > 0) {
      result.isValid = false;
      result.errors.push(
        `Encontrados ${result.orphanedInventory.length} productos en inventario sin referencia en catálogo`
      );
    }

    if (result.missingInventory.length > 0) {
      result.warnings.push(
        `Encontrados ${result.missingInventory.length} productos en catálogo sin movimientos de inventario`
      );
    }

  } catch (error) {
    result.isValid = false;
    result.errors.push(`Error al validar sincronización: ${error}`);
  }

  return result;
}

/**
 * Obtiene productos vÃ¡lidos para usar en inventario
 * Solo devuelve productos activos del catÃ¡logo
 */
export async function getProductosParaInventario(): Promise<ProductoInventarioSync[]> {
  try {
    const productos = await prisma.producto.findMany({
      where: {
        activo: true
      },
      select: {
        id: true,
        nombre: true,
        sku: true,
        stock: true,
        stockMinimo: true,
        precio: true,
        activo: true,
        categoria: {
          select: {
            nombre: true
          }
        },
        unidadMedida: {
          select: {
            simbolo: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    return productos;
  } catch (error) {
    logger.error('Error al obtener productos para inventario', { error });
    return [];
  }
}

/**
 * Valida si un producto existe y estÃ¡ activo antes de permitir movimientos
 */
export async function validateProductoParaMovimiento(productoId: string): Promise<{
  isValid: boolean;
  error?: string;
  producto?: ProductoInventarioSync;
}> {
  try {
    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
      select: {
        id: true,
        nombre: true,
        sku: true,
        stock: true,
        stockMinimo: true,
        precio: true,
        activo: true,
        categoria: {
          select: {
            nombre: true
          }
        },
        unidadMedida: {
          select: {
            simbolo: true
          }
        }
      }
    });

    if (!producto) {
      return {
        isValid: false,
        error: 'El producto no existe en el catÃ¡logo'
      };
    }

    if (!producto.activo) {
      return {
        isValid: false,
        error: 'El producto estÃ¡ inactivo y no puede tener movimientos'
      };
    }

    return {
      isValid: true,
      producto
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Error al validar producto: ${error}`
    };
  }
}

/**
 * Actualiza el stock de un producto despuÃ©s de un movimiento
 */
export async function actualizarStockProducto(
  productoId: string,
  nuevaCantidad: number,
  transaccion?: Prisma.TransactionClient
) {
  const prismaClient = transaccion || prisma;
  
  try {
    await prismaClient.producto.update({
      where: { id: productoId },
      data: { stock: nuevaCantidad }
    });
  } catch (error) {
    throw new Error(`Error al actualizar stock del producto: ${error}`);
  }
}

/**
 * Migra productos huÃ©rfanos en inventario
 * Crea entradas en el catÃ¡logo para productos que solo existen en movimientos
 */
export async function migrarProductosHuerfanos(): Promise<{
  success: boolean;
  migrated: number;
  errors: string[];
}> {
  const result = {
    success: true,
    migrated: 0,
    errors: [] as string[]
  };

  try {
    const validation = await validateProductoInventarioSync();
    
    if (validation.orphanedInventory.length === 0) {
      return result;
    }

    // Para cada producto huÃ©rfano, intentar crear una entrada en el catÃ¡logo
    for (const productoId of validation.orphanedInventory) {
      try {
        // Obtener informaciÃ³n del primer movimiento para crear el producto
        const primerMovimiento = await prisma.movimientoInventario.findFirst({
          where: { productoId },
          orderBy: { createdAt: 'asc' }
        });

        if (primerMovimiento) {
          // Crear producto en catÃ¡logo con informaciÃ³n bÃ¡sica
          await prisma.producto.create({
            data: {
              id: productoId,
              nombre: `Producto Migrado ${productoId.slice(-8)}`,
              sku: `MIG-${productoId.slice(-8)}`,
              descripcion: 'Producto migrado automÃ¡ticamente desde inventario',
              unidadMedidaId: 'unidad-default', // NecesitarÃ¡ una unidad por defecto
              stock: 0, // Se calcularÃ¡ despuÃ©s
              activo: false, // Marcado como inactivo para revisiÃ³n manual
            }
          });

          result.migrated++;
        }
      } catch (error) {
        result.errors.push(`Error migrando producto ${productoId}: ${error}`);
        result.success = false;
      }
    }

  } catch (error) {
    result.success = false;
    result.errors.push(`Error general en migraciÃ³n: ${error}`);
  }

  return result;
}

/**
 * Limpia productos huérfanos eliminando sus movimientos
 * PRECAUCIÃ“N: Esta operaciÃ³n es irreversible
 */
export async function limpiarProductosHuerfanos(): Promise<{
  success: boolean;
  deleted: number;
  errors: string[];
}> {
  const result = {
    success: true,
    deleted: 0,
    errors: [] as string[]
  };

  try {
    const validation = await validateProductoInventarioSync();
    
    if (validation.orphanedInventory.length === 0) {
      return result;
    }

 // Eliminar movimientos de productos huérfanos
    const deleteResult = await prisma.movimientoInventario.deleteMany({
      where: {
        productoId: {
          in: validation.orphanedInventory
        }
      }
    });

    result.deleted = deleteResult.count;

  } catch (error) {
    result.success = false;
 result.errors.push(`Error al limpiar productos huérfanos: ${error}`);
  }

  return result;
}

/**
 * Hooks para mantener sincronización automática
 */
export const ProductoInventarioHooks = {
  /**
   * Hook para despuÃ©s de crear un producto
   */
  afterCreateProducto: async (_productoId: string) => {
    void _productoId;
    // Por ahora no hacemos nada, el stock inicial es 0
    // En el futuro podrÃ­an agregarse movimientos automÃ¡ticos de inicializaciÃ³n
  },

  /**
   * Hook para antes de eliminar un producto
   */
  beforeDeleteProducto: async (productoId: string): Promise<{
    canDelete: boolean;
    reason?: string;
    movimientosCount?: number;
  }> => {
    try {
      const movimientosCount = await prisma.movimientoInventario.count({
        where: { productoId }
      });

      if (movimientosCount > 0) {
        return {
          canDelete: false,
          reason: `El producto tiene ${movimientosCount} movimientos de inventario asociados`,
          movimientosCount
        };
      }

      return { canDelete: true };
    } catch (error) {
      return {
        canDelete: false,
        reason: `Error al validar eliminaciÃ³n: ${error}`
      };
    }
  }
};
