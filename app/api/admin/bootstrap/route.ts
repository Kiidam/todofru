/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { prisma } from '../../../../src/lib/prisma';
import { successResponse, errorResponse, withErrorHandling, withAuth } from '../../../../src/lib/api-utils';
import bcrypt from 'bcryptjs';

export const POST = withErrorHandling(withAuth(async (_req: NextRequest, session: any) => {
  // Permitir sólo ADMIN para prevenir abusos; en bypass de test, role=ADMIN
  if (!(session?.user?.role === 'ADMIN')) {
    return errorResponse('No autorizado', 403);
  }

  // Si ya existe algún admin, no crear otro automáticamente
  const exists = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (exists) {
    return successResponse({ created: false, reason: 'admin-exists' }, 'Ya existe un administrador');
  }

  const email = 'admin@todofru.com';
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      id: crypto.randomUUID(),
      name: 'Administrador',
      email,
      password: hash,
      role: 'ADMIN',
    },
    select: { id: true, email: true, role: true }
  });

  return successResponse({ created: true, user }, 'Administrador inicial creado');
}));
