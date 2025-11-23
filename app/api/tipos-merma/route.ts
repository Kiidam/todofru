import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withErrorHandling, successResponse, errorResponse } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(withAuth(async (req: NextRequest) => {
  const tipos = await prisma.tipoMerma.findMany({
    where: { activo: true },
    include: {
      causas: {
        where: { activo: true },
        orderBy: { nombre: 'asc' }
      }
    },
    orderBy: { nombre: 'asc' }
  });

  return successResponse(tipos);
}));

export const POST = withErrorHandling(withAuth(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const { nombre } = body;

  if (!nombre?.trim()) {
    return errorResponse('El nombre es requerido', 400);
  }

  const tipo = await prisma.tipoMerma.create({
    data: {
      id: randomUUID(),
      nombre: nombre.trim(),
      activo: true
    }
  });

  return successResponse(tipo);
}));
