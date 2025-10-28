const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMovimientoStructure() {
  console.log('🔍 Verificando estructura de la tabla movimientoinventario...\n');

  try {
    // Verificar estructura de la tabla
    const result = await prisma.$queryRaw`DESCRIBE movimientoinventario`;
    
    console.log('Estructura de la tabla movimientoinventario:');
    console.table(result);

    // Verificar si hay registros
    const count = await prisma.movimientoInventario.count();
    console.log(`\nTotal de registros: ${count}`);

    // Intentar una consulta simple
    const movimientos = await prisma.movimientoInventario.findMany({ take: 1 });
    console.log(`✅ Consulta exitosa: ${movimientos.length} registros`);

  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkMovimientoStructure().catch(console.error);