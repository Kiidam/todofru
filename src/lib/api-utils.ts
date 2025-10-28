/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from './nextauth';
import { ZodError } from 'zod';
import { logger } from './logger';

// Tipos para respuestas estandarizadas
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
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
// Define handler types compatible with Next route handlers but allow the
// wrapped handler to accept additional parameters (e.g., session, params).
export type NextHandler = (request: NextRequest, context?: unknown) => Promise<NextResponse> | NextResponse;
export type AnyHandler = (...args: any[]) => Promise<NextResponse> | NextResponse;

export function withAuth(handler: AnyHandler): NextHandler {
  return async (request: NextRequest, context?: unknown): Promise<NextResponse> => {
    // Separar la fase de obtención de sesión/autenticación para atrapar solo errores de auth
    const bypass = shouldBypassAuth(request);

  let session: unknown = undefined;

    if (!bypass) {
      try {
        // App Router: pass authOptions to ensure callbacks (role/id) are applied
        session = await getServerSession(authOptions as any);
      } catch (err) {
        logger.error('Error al obtener la sesión de usuario:', { error: err });
        return NextResponse.json(
          { success: false, error: 'Error de autenticación' } as ApiResponse,
          { status: 500 }
        );
      }

      if (!session) {
        return NextResponse.json(
          { success: false, error: 'No autorizado' } as ApiResponse,
          { status: 401 }
        );
      }
    } else {
      // En modo bypass, crear una sesión mock
      session = {
        user: {
          id: 'test-user',
          email: 'test@example.com',
          name: 'Test User',
          role: 'ADMIN'
        }
      };
    }

    // Llamar al handler y dejar que withErrorHandling capture errores del handler
    if (handler.length >= 3) {
      // handler expects (request, session, context)
      return await handler(request, session, context);
    }

    if (handler.length >= 2) {
      // handler expects (request, session)
      return await handler(request, session);
    }

    // handler expects only (request)
    return await handler(request);
  };
}

// Wrapper para manejo de errores estandarizado
export function withErrorHandling(handler: NextHandler): NextHandler {
  return async (request: NextRequest, context?: unknown): Promise<NextResponse> => {
    try {
      return await handler(request, context);
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
        const prismaError = error as { code: string; meta?: unknown };
        
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
  details?: unknown
): NextResponse {
  return NextResponse.json({
    success: false,
    error,
    details
  } as ApiResponse, { status });
}

// Función para validar que un registro existe y está activo
export async function validateActiveRecord<T>(
  model: { findUnique: (args: { where: { id: string } }) => Promise<T | null> },
  id: string,
  entityName: string
): Promise<T> {
  const record = await model.findUnique({
    where: { id }
  });

  if (!record) {
    throw new Error(`${entityName} no encontrado`);
  }

  if (typeof record === 'object' && record !== null && 'activo' in record && !(record as Record<string, unknown>)['activo']) {
    throw new Error(`${entityName} inactivo`);
  }

  return record;
}

// Función para validar unicidad de campo
export async function validateUniqueness(
  model: { findFirst: (args: { where: Record<string, unknown> }) => Promise<unknown | null> },
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