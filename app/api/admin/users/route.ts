/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../../src/lib/prisma';
import { withAuth, withErrorHandling, successResponse, errorResponse } from '../../../../src/lib/api-utils';
import { sendWelcomeEmail } from '../../../../src/lib/mailer';

const createAdminSchema = z.object({
  name: z.string().min(3, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Contraseña mínima 8 caracteres'),
  role: z.literal('ADMIN').default('ADMIN'),
});

async function isAdmin(session: any): Promise<boolean> {
  try {
    if (session?.user?.role === 'ADMIN') return true;
    const email = session?.user?.email as string | undefined;
    if (!email) return false;
    const dbUser = await prisma.user.findUnique({ where: { email }, select: { role: true } });
    return dbUser?.role === 'ADMIN';
  } catch {
    return false;
  }
}

export const POST = withErrorHandling(withAuth(async (request: NextRequest, session: any) => {
  if (!(await isAdmin(session))) {
    return errorResponse('No autorizado', 403);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createAdminSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Datos inválidos', 400, parsed.error.flatten());
  }

  const { name, email, password } = parsed.data;

  // Duplicados
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return errorResponse('Ya existe un usuario con ese email', 400);
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name,
      email,
      password: hashed,
      role: 'ADMIN',
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });

  // Enviar email de bienvenida (tolerante a fallos)
  try {
    await sendWelcomeEmail({ to: email, name, email, password });
  } catch (e) {
    // Log only; do not fail the request if email fails
    console.error('No se pudo enviar email de bienvenida:', e);
  }

  return successResponse(user, 'Usuario administrador creado');
}));
