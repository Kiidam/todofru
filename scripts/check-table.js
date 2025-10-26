const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTable() {
  try {
    // Verificar si la tabla existe
    const result = await prisma.$queryRaw`DESCRIBE movimientoinventario`;
    console.log('Estructura de la tabla movimientoinventario:');
    console.table(result);
    
    // Verificar si hay registros existentes
    const count = await prisma.movimientoInventario.count();
    console.log(`\nRegistros existentes: ${count}`);
    
    if (count > 0) {
      const sample = await prisma.movimientoInventario.findMany({ take: 3 });
      console.log('\nMuestra de registros:');
      console.log(sample);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    
    // Intentar verificar si la tabla existe de otra manera
    try {
      const tables = await prisma.$queryRaw`SHOW TABLES LIKE 'movimientoinventario'`;
      console.log('Resultado de SHOW TABLES:', tables);
    } catch (err) {
      console.error('Error verificando tablas:', err.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkTable();