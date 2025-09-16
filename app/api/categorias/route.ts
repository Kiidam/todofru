import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Esquema de validación para categorías
const categoriaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
});

// GET /api/categorias - Listar todas las categorías
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const categorias = await prisma.categoria.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: { productos: true }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: categorias 
    });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/categorias - Crear nueva categoría
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = categoriaSchema.parse(body);

    // Verificar que no exista una categoría con el mismo nombre
    const existingCategoria = await prisma.categoria.findFirst({
      where: { 
        nombre: validatedData.nombre,
        activo: true 
      }
    });

    if (existingCategoria) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una categoría con ese nombre' },
        { status: 400 }
      );
    }

    const categoria = await prisma.categoria.create({
      data: validatedData
    });

    return NextResponse.json({ 
      success: true, 
      data: categoria,
      message: 'Categoría creada exitosamente'
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error al crear categoría:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
