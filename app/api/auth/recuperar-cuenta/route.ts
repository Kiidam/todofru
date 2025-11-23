import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// Sistema de recuperación de cuenta en 3 pasos con preguntas de seguridad
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { step, usuario, respuesta, nuevaPassword } = body;

    // PASO 1: Verificar usuario y obtener pregunta
    if (step === 'verificar-usuario') {
      if (!usuario) {
        return NextResponse.json(
          { success: false, error: 'Usuario o email requerido' },
          { status: 400 }
        );
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: usuario },
            { email: usuario }
          ]
        },
        select: {
          id: true,
          username: true,
          email: true,
          securityQuestion: true,
          securityAnswer: true
        }
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      if (!user.securityQuestion || !user.securityAnswer) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Este usuario no tiene pregunta de seguridad configurada. Contacte al administrador.' 
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          userId: user.id,
          pregunta: user.securityQuestion
        }
      });
    }

    // PASO 2: Verificar respuesta de seguridad
    if (step === 'verificar-respuesta') {
      if (!usuario || !respuesta) {
        return NextResponse.json(
          { success: false, error: 'Usuario y respuesta requeridos' },
          { status: 400 }
        );
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: usuario },
            { email: usuario }
          ]
        },
        select: {
          id: true,
          securityAnswer: true
        }
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      const respuestaCorrecta = user.securityAnswer?.toLowerCase().trim();
      const respuestaIngresada = respuesta.toLowerCase().trim();

      if (respuestaCorrecta !== respuestaIngresada) {
        return NextResponse.json(
          { success: false, error: 'Respuesta incorrecta' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          userId: user.id,
          mensaje: 'Respuesta correcta. Puede cambiar su contraseña.'
        }
      });
    }

    // PASO 3: Cambiar contraseña
    if (step === 'cambiar-password') {
      if (!usuario || !respuesta || !nuevaPassword) {
        return NextResponse.json(
          { success: false, error: 'Todos los campos son requeridos' },
          { status: 400 }
        );
      }

      if (nuevaPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'La contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        );
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: usuario },
            { email: usuario }
          ]
        },
        select: {
          id: true,
          securityAnswer: true
        }
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      const respuestaCorrecta = user.securityAnswer?.toLowerCase().trim();
      const respuestaIngresada = respuesta.toLowerCase().trim();

      if (respuestaCorrecta !== respuestaIngresada) {
        return NextResponse.json(
          { success: false, error: 'Respuesta incorrecta' },
          { status: 401 }
        );
      }

      const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });

      return NextResponse.json({
        success: true,
        data: {
          mensaje: 'Contraseña cambiada exitosamente. Ya puede iniciar sesión.'
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Paso inválido' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error en recuperar-cuenta:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
