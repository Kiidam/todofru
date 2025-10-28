import { NextRequest } from 'next/server';
import { withAuth, withErrorHandling, successResponse, errorResponse } from '../../../../src/lib/api-utils';
import { logger } from '../../../../src/lib/logger';
import { validateMovimientosIntegrity } from '../../../../src/lib/movimientos-v2-sync';
import { Session } from 'next-auth';

// GET /api/movimientos-v2/sync-validation - Validar integridad de movimientos
export const GET = withErrorHandling(withAuth(async (request: NextRequest, context: { session: Session }) => {
  const { session } = context;
  
  try {
    const validation = await validateMovimientosIntegrity();
    
    logger.info('Validación de integridad de movimientos ejecutada', {
      userId: session.user.id,
      success: validation.success,
      errorsCount: validation.errors?.length || 0
    });

    const response = successResponse(
      {
        ...(validation.data && typeof validation.data === 'object' ? validation.data : {}),
        validationSummary: {
          isValid: validation.success,
          totalErrors: validation.errors?.length || 0,
          message: validation.message
        }
      },
      validation.success 
        ? 'Validación de integridad completada exitosamente'
        : 'Se encontraron problemas de integridad'
    );
    
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    return response;

  } catch (error) {
    logger.error('Error al validar integridad de movimientos', { 
      error, 
      userId: session.user.id 
    });
    return errorResponse('Error interno al validar integridad', 500);
  }
}));

// POST /api/movimientos-v2/sync-validation - Ejecutar acciones de reparación
export const POST = withErrorHandling(withAuth(async (request: NextRequest, context: { session: Session }) => {
  const { session } = context;
  
  try {
    const { action } = await request.json();

    // Solo administradores pueden ejecutar acciones de reparación
    if (session.user.role !== 'ADMIN') {
      return errorResponse('Solo los administradores pueden ejecutar acciones de reparación', 403);
    }

    switch (action) {
      case 'validate':
        const validation = await validateMovimientosIntegrity();
        
        logger.info('Validación de integridad ejecutada por administrador', { 
          success: validation.success,
          adminId: session.user.id 
        });
        
        return successResponse(
          validation.data,
          validation.success 
            ? 'Validación completada exitosamente'
            : 'Se encontraron problemas de integridad'
        );

      default:
        return errorResponse('Acción no válida. Acciones disponibles: validate', 400);
    }

  } catch (error) {
    logger.error('Error al ejecutar acción de sincronización', { 
      error, 
      userId: session.user.id 
    });
    return errorResponse('Error interno al ejecutar acción', 500);
  }
}));