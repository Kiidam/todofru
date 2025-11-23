const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProductos() {
  try {
    const productos = await prisma.producto.findMany({
      select: { id: true, nombre: true }
    });
    console.log('Total productos:', productos.length);
    productos.forEach(p => {
      console.log(`  - ${p.id}: ${p.nombre}`);
    });
    
    const admin = await prisma.user.findFirst();
    console.log('\nAdmin user:', admin ? admin.id : 'NOT FOUND');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductos();
