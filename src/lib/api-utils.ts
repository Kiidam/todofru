import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ZodError } from 'zod';
import { logger } from './logger';

// Tipos para respuestas estandarizadas
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Función para verificar bypass de autenticación en modo test
export function shouldBypassAuth(request: NextRequest): boolean {
  const header = request.headers.get('x-test-bypass-auth');
  return (
    process.env.TEST_API === '1' ||
    header === '1' ||
    header === 'true'
  );
}

// Wrapper para manejo de autenticación
export function withAuth<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
): (...args: T) => Promise<NextResponse> {
  return async (...args: T): Promise<NextResponse> => {
    try {
      const request = args[0] as NextRequest;
      const bypass = shouldBypassAuth(request);
      
      if (!bypass) {
        const { authOptions } = await import('../../app/api/auth/[...nextauth]/route');
        const session = await getServerSession(authOptions);
        
        if (!session) {
          return NextResponse.json(
            { success: false, error: 'No autorizado' } as ApiResponse,
            { status: 401 }
          );
        }
        
        // Insertar la sesión como segundo parámetro
        const newArgs = [args[0], session, ...args.slice(1)] as any;
        return await handler(...newArgs);
      } else {
        // En modo bypass, crear una sesión mock
        const mockSession = {
          user: {
            id: 'test-user',
            email: 'test@example.com',
            name: 'Test User'
          }
        };
        
        const newArgs = [args[0], mockSession, ...args.slice(1)] as any;
        return await handler(...newArgs);
      }
    } catch (error) {
      logger.error('Error en autenticación:', { error });
      return NextResponse.json(
        { success: false, error: 'Error de autenticación' } as ApiResponse,
        { status: 500 }
      );
    }
  };
}

// Wrapper para manejo de errores estandarizado
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Datos inválidos',
            details: error.flatten()
          } as ApiResponse,
          { status: 400 }
        );
      }

      // Errores de Prisma
      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as any;
        
        switch (prismaError.code) {
          case 'P2002':
            return NextResponse.json(
              {
                success: false,
                error: 'Violación de restricción única',
                details: prismaError.meta
              } as ApiResponse,
              { status: 400 }
            );
          case 'P2025':
            return NextResponse.json(
              {
                success: false,
                error: 'Registro no encontrado'
              } as ApiResponse,
              { status: 404 }
            );
          case 'P2003':
            return NextResponse.json(
              {
                success: false,
                error: 'Violación de clave foránea',
                details: prismaError.meta
              } as ApiResponse,
              { status: 400 }
            );
          default:
            logger.error('Error de Prisma:', { error: prismaError });
            return NextResponse.json(
              {
                success: false,
                error: 'Error de base de datos'
              } as ApiResponse,
              { status: 500 }
            );
        }
      }

      logger.error('Error no manejado:', { error });
      return NextResponse.json(
        {
          success: false,
          error: 'Error interno del servidor'
        } as ApiResponse,
        { status: 500 }
      );
    }
  };
}

// Función para validar parámetros de paginación
export function validatePagination(searchParams: URLSearchParams) {
  const pageRaw = searchParams.get('page');
  const limitRaw = searchParams.get('limit');
  
  const page = Number.isFinite(Number(pageRaw)) && Number(pageRaw) > 0
    ? Math.floor(Number(pageRaw))
    : 1;
    
  const limitParsed = Number.isFinite(Number(limitRaw)) && Number(limitRaw) > 0
    ? Math.floor(Number(limitRaw))
    : 10;
    
  const limit = Math.min(Math.max(limitParsed, 1), 100);
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

// Función para crear respuesta de éxito
export function successResponse<T>(
  data: T,
  message?: string,
  pagination?: ApiResponse['pagination']
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message,
    pagination
  } as ApiResponse<T>);
}

// Función para crear respuesta de error
export function errorResponse(
  error: string,
  status: number = 400,
  details?: any
): NextResponse {
  return NextResponse.json({
    success: false,
    error,
    details
  } as ApiResponse, { status });
}

// Función para validar que un registro existe y está activo
export async function validateActiveRecord<T>(
  model: any,
  id: string,
  entityName: string
): Promise<T> {
  const record = await model.findUnique({
    where: { id }
  });

  if (!record) {
    throw new Error(`${entityName} no encontrado`);
  }

  if ('activo' in record && !record.activo) {
    throw new Error(`${entityName} inactivo`);
  }

  return record;
}

// Función para validar unicidad de campo
export async function validateUniqueness(
  model: any,
  field: string,
  value: string,
  entityName: string,
  excludeId?: string
): Promise<void> {
  const where = {
    [field]: value,
    activo: true,
    ...(excludeId && { id: { not: excludeId } })
  };

  const existing = await model.findFirst({ where });

  if (existing) {
    throw new Error(`Ya existe un ${entityName} con ese ${field}`);
  }
}