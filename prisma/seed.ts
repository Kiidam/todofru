import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Limpiar la base de datos
  await prisma.user.deleteMany();
  
  // Crear usuario administrador
  const hashedPassword = await hash('admin123', 10);
  
  const admin = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@todofru.com',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });
  
  console.log({ admin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });