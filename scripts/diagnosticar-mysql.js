const mysql = require('mysql2/promise');
const { PrismaClient } = require('@prisma/client');

async function diagnosticarMySQL() {
  console.log('🔍 DIAGNÓSTICO DE CONEXIÓN MYSQL');
  console.log('=' .repeat(50));

  // 1. Verificar variables de entorno
  console.log('\n1️⃣ Variables de entorno:');
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'Configurada' : 'No configurada'}`);
  console.log(`DATABASE_HOST: ${process.env.DATABASE_HOST || 'No configurada'}`);
  console.log(`DATABASE_USER: ${process.env.DATABASE_USER || 'No configurada'}`);
  console.log(`DATABASE_PASSWORD: ${process.env.DATABASE_PASSWORD ? 'Configurada' : 'No configurada'}`);

  // 2. Probar conexión con Prisma
  console.log('\n2️⃣ Probando conexión con Prisma...');
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    
    const [result] = await prisma.$queryRaw`SELECT DATABASE() as current_db, VERSION() as version`;
    console.log(`✅ Prisma conectado exitosamente`);
    console.log(`   Base de datos actual: ${result.current_db}`);
    console.log(`   Versión MySQL: ${result.version}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.log(`❌ Error con Prisma: ${error.message}`);
  }

  // 3. Probar conexión directa a MySQL
  console.log('\n3️⃣ Probando conexión directa a MySQL...');
  
  const configs = [
    {
      name: 'Configuración por defecto',
      config: {
        host: 'localhost',
        user: 'root',
        password: '',
        port: 3306
      }
    },
    {
      name: 'Configuración con variables de entorno',
      config: {
        host: process.env.DATABASE_HOST || 'localhost',
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || '',
        port: process.env.DATABASE_PORT || 3306
      }
    }
  ];

  for (const { name, config } of configs) {
    console.log(`\n   Probando: ${name}`);
    console.log(`   Host: ${config.host}, User: ${config.user}, Port: ${config.port}`);
    
    try {
      const connection = await mysql.createConnection(config);
      
      const [databases] = await connection.execute('SHOW DATABASES');
      console.log(`   ✅ Conexión exitosa - ${databases.length} bases de datos encontradas`);
      
      // Mostrar bases de datos del sistema
      const systemDbs = databases.filter(db => {
        const name = db.Database.toLowerCase();
        return name.includes('todofru') || name.includes('inventario') || name.includes('todafru');
      });
      
      if (systemDbs.length > 0) {
        console.log(`   📊 Bases del sistema encontradas:`);
        systemDbs.forEach(db => console.log(`      • ${db.Database}`));
      } else {
        console.log(`   ⚠️  No se encontraron bases de datos del sistema`);
      }
      
      await connection.end();
      return { success: true, config, databases: databases.map(db => db.Database) };
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  return { success: false };
}

// Ejecutar diagnóstico
if (require.main === module) {
  diagnosticarMySQL()
    .then((result) => {
      if (result.success) {
        console.log('\n✅ Diagnóstico completado - Conexión MySQL funcional');
      } else {
        console.log('\n❌ Diagnóstico falló - No se pudo conectar a MySQL');
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n❌ Error durante diagnóstico:', error);
      process.exit(1);
    });
}

module.exports = { diagnosticarMySQL };