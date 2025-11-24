import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import authOptions from '@/src/lib/nextauth';

// GET - Listar todos los usuarios
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuarios = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        securityQuestion: true,
        securityAnswer: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo usuario
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado. Solo administradores pueden crear usuarios.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, username, password, role, securityQuestion, securityAnswer } = body;

    // Validar datos
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      );
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generar ID único
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Crear usuario
    const newUser = await prisma.user.create({
      data: {
        id: userId,
        name,
        email,
        username: username || null,
        password: hashedPassword,
        role: role || 'USER',
        securityQuestion: securityQuestion || null,
        securityAnswer: securityAnswer || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        securityQuestion: true,
        securityAnswer: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear usuario:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear usuario' },
      { status: 500 }
    );
  }
}
