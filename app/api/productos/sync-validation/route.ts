import { NextRequest } from 'next/server';
import { withAuth, withErrorHandling, successResponse, errorResponse } from '../../../../src/lib/api-utils';
import { logger } from '../../../../src/lib/logger';
import { 
  validateProductoInventarioSync, 
  migrarProductosHuerfanos, 
  limpiarProductosHuerfanos 
} from '../../../../src/lib/producto-inventario-sync';
import { Session } from 'next-auth';

// GET /api/productos/sync-validation - Validar sincronización
export const GET = withErrorHandling(withAuth(async (request: NextRequest, session: Session) => {
  const validation = await validateProductoInventarioSync();
  
  const response = successResponse(validation);
  response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
  return response;
}));

// POST /api/productos/sync-validation - Ejecutar acciones de sincronización
export const POST = withErrorHandling(withAuth(async (request: NextRequest, session: Session) => {
  const { action } = await request.json();

  switch (action) {
    case 'migrate':
      const migrationResult = await migrarProductosHuerfanos();
      logger.info('Migración de productos ejecutada', { 
        success: migrationResult.success,
        migrated: migrationResult.migrated 
      });
      
      return successResponse(
        migrationResult,
        migrationResult.success 
          ? `${migrationResult.migrated} productos migrados exitosamente`
          : 'Error en la migración'
      );

    case 'clean':
      const cleanResult = await limpiarProductosHuerfanos();
      logger.info('Limpieza de productos ejecutada', { 
        success: cleanResult.success,
        deleted: cleanResult.deleted 
      });
      
      return successResponse(
        cleanResult,
        cleanResult.success
          ? `${cleanResult.deleted} movimientos eliminados exitosamente`
          : 'Error en la limpieza'
      );

    default:
      return errorResponse('Acción no válida', 400);
  }
}));