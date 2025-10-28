/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../../../src/lib/prisma';
import { withAuth, withErrorHandling, errorResponse, successResponse } from '../../../../../src/lib/api-utils';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Contraseña mínima 8 caracteres')
});

export const POST = withErrorHandling(withAuth(async (request: NextRequest, session: any) => {
  if (!(session?.user?.role === 'ADMIN')) {
    return errorResponse('No autorizado', 403);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Datos inválidos', 400, parsed.error.flatten());
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return errorResponse('Usuario no encontrado', 404);
  }

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { email }, data: { password: hash } });

  return successResponse({ email }, 'Contraseña actualizada');
}));
