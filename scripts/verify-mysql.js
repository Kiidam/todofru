// Script para verificar conexión MySQL y listar tablas
const { PrismaClient } = require('@prisma/client');

async function verifyMySQLConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔗 Conectando a MySQL...');
    
    // Verificar conexión
    await prisma.$connect();
    console.log('✅ Conexión a MySQL exitosa');
    
    // Listar tablas usando SQL directo
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'todofru'
      ORDER BY TABLE_NAME;
    `;
    
    console.log('\n📋 Tablas creadas en la base de datos:');
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.TABLE_NAME}`);
    });
    
    // Verificar algunas tablas específicas
    console.log('\n🔍 Verificando estructura de tablas principales...');
    
    const productCount = await prisma.producto.count();
    console.log(`- Productos: ${productCount} registros`);
    
    const movimientosCount = await prisma.movimientoInventario.count();
    console.log(`- Movimientos de Inventario: ${movimientosCount} registros`);
    
    const userCount = await prisma.user.count();
    console.log(`- Usuarios: ${userCount} registros`);
    
    console.log('\n🎉 Migración a MySQL completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('Código de error:', error.code);
    }
  } finally {
    await prisma.$disconnect();
  }
}

verifyMySQLConnection();