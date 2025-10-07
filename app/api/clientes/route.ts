import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { TipoCliente } from '@prisma/client';

// Esquema de validación para clientes
const clienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  ruc: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  direccion: z.string().optional(),
  contacto: z.string().optional(),
  tipoCliente: z.enum(['MAYORISTA', 'MINORISTA']),
});

// GET /api/clientes - Listar clientes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const tipoCliente = searchParams.get('tipoCliente');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where = {
      activo: true,
      ...(search && {
        OR: [
          { nombre: { contains: search, mode: 'insensitive' } },
          { ruc: { contains: search, mode: 'insensitive' } },
          { contacto: { contains: search, mode: 'insensitive' } }
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
              pedidosVenta: true,
              cuentasPorCobrar: { where: { estado: { in: ['PENDIENTE', 'PARCIAL'] } } }
            }
          }
        },
        orderBy: { nombre: 'asc' },
        skip,
        take: limit
      }),
      prisma.cliente.count({ where })
    ]);

    return NextResponse.json({ 
      success: true, 
      data: clientes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/clientes - Crear nuevo cliente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = clienteSchema.parse(body);

    // Verificar RUC único si se proporciona
    if (validatedData.ruc) {
      const existingCliente = await prisma.cliente.findFirst({
        where: { ruc: validatedData.ruc, activo: true }
      });

      if (existingCliente) {
        return NextResponse.json(
          { success: false, error: 'Ya existe un cliente con ese RUC' },
          { status: 400 }
        );
      }
    }

    const cliente = await prisma.cliente.create({
      data: validatedData
    });

    return NextResponse.json({ 
      success: true, 
      data: cliente,
      message: 'Cliente creado exitosamente'
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error al crear cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
