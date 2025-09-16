import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const categoriaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
});

// GET /api/categorias/[id] - Obtener categoría por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const categoria = await prisma.categoria.findUnique({
      where: { id: params.id },
      include: {
        productos: {
          where: { activo: true },
          select: {
            id: true,
            nombre: true,
            sku: true,
            stock: true
          }
        }
      }
    });

    if (!categoria) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: categoria 
    });
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/categorias/[id] - Actualizar categoría
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = categoriaSchema.parse(body);

    // Verificar que la categoría existe
    const existingCategoria = await prisma.categoria.findUnique({
      where: { id: params.id }
    });

    if (!existingCategoria) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que no exista otra categoría con el mismo nombre
    const duplicateCategoria = await prisma.categoria.findFirst({
      where: { 
        nombre: validatedData.nombre,
        activo: true,
        id: { not: params.id }
      }
    });

    if (duplicateCategoria) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una categoría con ese nombre' },
        { status: 400 }
      );
    }

    const categoria = await prisma.categoria.update({
      where: { id: params.id },
      data: validatedData
    });

    return NextResponse.json({ 
      success: true, 
      data: categoria,
      message: 'Categoría actualizada exitosamente'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error al actualizar categoría:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/categorias/[id] - Eliminar categoría (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que la categoría existe
    const existingCategoria = await prisma.categoria.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { productos: { where: { activo: true } } }
        }
      }
    });

    if (!existingCategoria) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    // No permitir eliminar si tiene productos activos
    if (existingCategoria._count.productos > 0) {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar una categoría que tiene productos asociados' },
        { status: 400 }
      );
    }

    await prisma.categoria.update({
      where: { id: params.id },
      data: { activo: false }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
