const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTableStructure() {
  console.log('🔍 Verificando estructura de tablas...\n');

  try {
    // Verificar estructura de tabla pedidocompra
    console.log('1. Estructura de tabla pedidocompra:');
    const pedidoCompraColumns = await prisma.$queryRaw`DESCRIBE pedidocompra`;
    console.table(pedidoCompraColumns);

    console.log('\n2. Estructura de tabla pedidoventa:');
    const pedidoVentaColumns = await prisma.$queryRaw`DESCRIBE pedidoventa`;
    console.table(pedidoVentaColumns);

    console.log('\n3. Estructura de tabla proveedor:');
    const proveedorColumns = await prisma.$queryRaw`DESCRIBE proveedor`;
    console.table(proveedorColumns);

    console.log('\n4. Verificando datos existentes...');
    
    // Contar registros
    const pedidoCompraCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM pedidocompra`;
    const pedidoVentaCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM pedidoventa`;
    const proveedorCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM proveedor`;
    
    console.log(`- Pedidos de compra: ${pedidoCompraCount[0].count}`);
    console.log(`- Pedidos de venta: ${pedidoVentaCount[0].count}`);
    console.log(`- Proveedores: ${proveedorCount[0].count}`);

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTableStructure().catch(console.error);