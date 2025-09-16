import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Esquema de validación para proveedores
const proveedorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  ruc: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  direccion: z.string().optional(),
  contacto: z.string().optional(),
});

// GET /api/proveedores - Listar proveedores
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: any = {
      activo: true,
      ...(search && {
        OR: [
          { nombre: { contains: search, mode: 'insensitive' } },
          { ruc: { contains: search, mode: 'insensitive' } },
          { contacto: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [proveedores, total] = await Promise.all([
      prisma.proveedor.findMany({
        where,
        include: {
          _count: {
            select: { 
              pedidosCompra: true,
              cuentasPorPagar: { where: { estado: { in: ['PENDIENTE', 'PARCIAL'] } } }
            }
          }
        },
        orderBy: { nombre: 'asc' },
        skip,
        take: limit
      }),
      prisma.proveedor.count({ where })
    ]);

    return NextResponse.json({ 
      success: true, 
      data: proveedores,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/proveedores - Crear nuevo proveedor
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = proveedorSchema.parse(body);

    // Verificar RUC único si se proporciona
    if (validatedData.ruc) {
      const existingProveedor = await prisma.proveedor.findFirst({
        where: { ruc: validatedData.ruc, activo: true }
      });

      if (existingProveedor) {
        return NextResponse.json(
          { success: false, error: 'Ya existe un proveedor con ese RUC' },
          { status: 400 }
        );
      }
    }

    const proveedor = await prisma.proveedor.create({
      data: validatedData
    });

    return NextResponse.json({ 
      success: true, 
      data: proveedor,
      message: 'Proveedor creado exitosamente'
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error al crear proveedor:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
