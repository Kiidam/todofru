import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/grupo-cliente - Listar grupos de cliente
export async function GET(request: NextRequest) {
  try {
    // Si esto da error, asegúrate de haber corrido `npx prisma generate` y que el modelo en schema.prisma es `model GrupoCliente { ... }`
    const grupos = await prisma.grupoCliente.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });
    return NextResponse.json({ success: true, data: grupos });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error al obtener grupos de cliente' }, { status: 500 });
  }
}
