import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withErrorHandling, successResponse, errorResponse } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(withAuth(async (req: NextRequest) => {
  const causas = await prisma.causaMerma.findMany({
    where: { activo: true },
    include: {
      tipo: true
    },
    orderBy: { nombre: 'asc' }
  });

  return successResponse(causas);
}));

export const POST = withErrorHandling(withAuth(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const { nombre, tipoMermaId } = body;

  if (!nombre?.trim() || !tipoMermaId) {
    return errorResponse('El nombre y tipo de merma son requeridos', 400);
  }

  const causa = await prisma.causaMerma.create({
    data: {
      id: randomUUID(),
      nombre: nombre.trim(),
      tipoMermaId,
      activo: true
    },
    include: {
      tipo: true
    }
  });

  return successResponse(causa);
}));
