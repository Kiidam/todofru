const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany();
    console.log('Usuarios encontrados:', users.length);
    
    if (users.length > 0) {
      console.log('Primer usuario:', users[0]);
    } else {
      console.log('No hay usuarios en la BD');
      
      // Crear un usuario de prueba
      console.log('Creando usuario de prueba...');
      const newUser = await prisma.user.create({
        data: {
          id: 'admin-user-001',
          name: 'Administrador',
          email: 'admin@todofru.com',
          role: 'ADMIN'
        }
      });
      console.log('Usuario creado:', newUser);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();