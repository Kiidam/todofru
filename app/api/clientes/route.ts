import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../src/lib/prisma';
import { logger } from '../../../src/lib/logger';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { 
  withAuth, 
  withErrorHandling, 
  validatePagination, 
  successResponse, 
  validateUniqueness
} from '../../../src/lib/api-utils';
import { clientePayloadSchema, validateClientePayload } from '../../../src/schemas/cliente';

type TipoCliente = 'MAYORISTA' | 'MINORISTA';
type TipoEntidad = 'PERSONA_NATURAL' | 'PERSONA_JURIDICA';

// Esquema de validación para clientes (estructura antigua - retrocompatibilidad)
const clienteSchemaLegacy = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  ruc: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  direccion: z.string().optional(),
  contacto: z.string().optional(),
  tipoCliente: z.enum(['MAYORISTA', 'MINORISTA']),
});

// Función para detectar si es estructura nueva o antigua
function isNewStructure(data: any): boolean {
  return data.tipoEntidad !== undefined || data.numeroIdentificacion !== undefined;
}

// GET /api/clientes - Listar clientes
export const GET = withErrorHandling(withAuth(async (request: NextRequest, session: any) => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const tipoCliente = searchParams.get('tipoCliente');
    const { page, limit, skip } = validatePagination(searchParams);

    const where = {
      activo: true,
      ...(search && {
        OR: [
          { nombre: { contains: search } },
          { ruc: { contains: search } },
          { contacto: { contains: search } }
        ]
      }),
      ...(tipoCliente && { tipoCliente: tipoCliente as TipoCliente })
    };

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        include: {
          _count: {
            select: { 
              pedidos: true
            }
          }
        },
        orderBy: { nombre: 'asc' },
        skip,
        take: limit
      }),
      prisma.cliente.count({ where })
    ]);

    const response = successResponse(clientes, `${clientes.length} clientes encontrados`, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
    return response;
}));

// POST /api/clientes - Crear nuevo cliente
export const POST = withErrorHandling(withAuth(async (request: NextRequest, session: any) => {
    const body = await request.json();
    
    let validatedData: any;
    let clienteData: any;
    
    if (isNewStructure(body)) {
      // Nueva estructura (formularios refactorizados)
      const validation = validateClientePayload(body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: 'Datos inválidos', details: validation.error.issues },
          { status: 400 }
        );
      }
      validatedData = validation.data;
      
      // Verificar número de identificación único
      if (validatedData.numeroIdentificacion) {
        const existingCliente = await prisma.cliente.findFirst({
          where: { 
            OR: [
              { ruc: validatedData.numeroIdentificacion },
              { numeroIdentificacion: validatedData.numeroIdentificacion }
            ],
            activo: true 
          }
        });

        if (existingCliente) {
          const tipoDoc = validatedData.numeroIdentificacion.length === 8 ? 'DNI' : 'RUC';
          return NextResponse.json(
            { success: false, error: `Ya existe un cliente con ese ${tipoDoc}` },
            { status: 400 }
          );
        }
      }
      
      // Calcular nombre según tipo de entidad
      const nombreCalculado = validatedData.tipoEntidad === 'PERSONA_NATURAL'
        ? `${(validatedData.nombres || '').trim()} ${(validatedData.apellidos || '').trim()}`.trim().replace(/\s+/g, ' ')
        : (validatedData.razonSocial || '').trim();
      
      // Preparar datos para la base de datos
      clienteData = {
        id: randomUUID(),
        nombre: nombreCalculado,
        // Guardar RUC solo para persona jurídica (compatibilidad)
        ruc: validatedData.tipoEntidad === 'PERSONA_JURIDICA' ? validatedData.numeroIdentificacion : undefined,
        numeroIdentificacion: validatedData.numeroIdentificacion,
        telefono: validatedData.telefono,
        email: validatedData.email,
        direccion: validatedData.direccion,
        contacto: validatedData.contacto,
        tipoCliente: validatedData.tipoCliente,
        mensajePersonalizado: validatedData.mensajePersonalizado,
        activo: true,
        // Campos adicionales para nueva estructura
        tipoEntidad: validatedData.tipoEntidad,
        nombres: validatedData.nombres,
        apellidos: validatedData.apellidos,
        razonSocial: validatedData.razonSocial,
      };
    } else {
      // Estructura antigua (retrocompatibilidad)
      validatedData = clienteSchemaLegacy.parse(body);
      
      // Verificar RUC único si se proporciona
      if (validatedData.ruc) {
        await validateUniqueness(prisma.cliente, 'ruc', validatedData.ruc, 'cliente');
      }
      
      clienteData = {
        id: randomUUID(),
        ...validatedData,
        activo: true,
      };
    }

    const cliente = await prisma.cliente.create({
      data: clienteData
    });

    return new NextResponse(
      JSON.stringify(successResponse(cliente, 'Cliente creado exitosamente').body),
      { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
}));
