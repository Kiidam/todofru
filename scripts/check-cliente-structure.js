const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkClienteStructure() {
  console.log('🔍 Verificando estructura de la tabla cliente...\n');

  try {
    // Verificar estructura de la tabla cliente
    const result = await prisma.$queryRaw`DESCRIBE cliente`;
    
    console.log('Estructura de la tabla cliente:');
    console.table(result);

    // Verificar el esquema de Prisma para cliente
    console.log('\n📋 Campos definidos en el esquema de Prisma:');
    
    // Intentar una consulta simple para ver qué campos están disponibles
    const clienteCount = await prisma.cliente.count();
    console.log(`Total de clientes en la base de datos: ${clienteCount}`);

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkClienteStructure().catch(console.error);