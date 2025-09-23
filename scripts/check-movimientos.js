const { PrismaClient } = require('@prisma/client');

async function checkMovimientos() {
  const prisma = new PrismaClient();
  
  try {
    const count = await prisma.movimientoInventario.count();
    console.log('📊 Movimientos en BD:', count);
    
    if (count > 0) {
      const sample = await prisma.movimientoInventario.findFirst({
        include: {
          producto: { select: { nombre: true } },
          usuario: { select: { name: true } }
        }
      });
      console.log('📋 Ejemplo:', JSON.stringify(sample, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMovimientos();