import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { 
  validateProductoInventarioSync, 
  migrarProductosHuerfanos, 
  limpiarProductosHuerfanos 
} from '@/lib/producto-inventario-sync';

// GET /api/productos/sync-validation - Validar sincronización
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const validation = await validateProductoInventarioSync();
    
    return NextResponse.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error en validación de sincronización:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// POST /api/productos/sync-validation - Ejecutar acciones de sincronización
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { action } = await request.json();

    switch (action) {
      case 'migrate':
        const migrationResult = await migrarProductosHuerfanos();
        return NextResponse.json({
          success: migrationResult.success,
          data: migrationResult,
          message: migrationResult.success 
            ? `${migrationResult.migrated} productos migrados exitosamente`
            : 'Error en la migración'
        });

      case 'clean':
        const cleanResult = await limpiarProductosHuerfanos();
        return NextResponse.json({
          success: cleanResult.success,
          data: cleanResult,
          message: cleanResult.success
            ? `${cleanResult.deleted} movimientos eliminados exitosamente`
            : 'Error en la limpieza'
        });

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error en acción de sincronización:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}