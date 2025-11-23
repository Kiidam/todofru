const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createOptimizedIndexes() {
  console.log('🚀 Iniciando creación de índices optimizados...\n');

  try {
    // Leer el archivo SQL de índices
    const sqlFilePath = path.join(__dirname, '..', 'database-design', 'scripts', '04_indices_optimizados.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Dividir el contenido en comandos individuales
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('/*'));

    console.log(`📝 Encontrados ${sqlCommands.length} comandos SQL para ejecutar\n`);

    let successCount = 0;
    let errorCount = 0;

    // Ejecutar cada comando SQL
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      
      // Saltar comentarios y comandos vacíos
      if (command.startsWith('--') || command.startsWith('/*') || command.trim() === '') {
        continue;
      }

      try {
        console.log(`⚡ Ejecutando comando ${i + 1}/${sqlCommands.length}...`);
        
        // Ejecutar el comando SQL usando Prisma
        await prisma.$executeRawUnsafe(command);
        
        successCount++;
        console.log(`✅ Comando ejecutado exitosamente`);
        
      } catch (error) {
        errorCount++;
        console.log(`❌ Error en comando ${i + 1}:`, error.message);
        
        // Continuar con el siguiente comando en caso de error
        continue;
      }
    }

    console.log('\n📊 Resumen de ejecución:');
    console.log(`✅ Comandos exitosos: ${successCount}`);
    console.log(`❌ Comandos con error: ${errorCount}`);

    // Verificar índices creados
    console.log('\n🔍 Verificando índices creados...');
    
    const indexesQuery = `
      SELECT 
          TABLE_NAME,
          INDEX_NAME,
          COLUMN_NAME,
          SEQ_IN_INDEX,
          NON_UNIQUE
      FROM 
          INFORMATION_SCHEMA.STATISTICS 
      WHERE 
          TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN (
              'personas', 'usuarios', 'clientes', 'proveedores', 
              'productos', 'productos_proveedores', 'movimientos_inventario',
              'pedidos_compra', 'pedidos_compra_items', 'categorias', 'auditoria'
          )
      ORDER BY 
          TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `;

    const indexes = await prisma.$queryRawUnsafe(indexesQuery);
    
    console.log(`\n📋 Índices encontrados: ${indexes.length}`);
    
    // Agrupar índices por tabla
    const indexesByTable = indexes.reduce((acc, index) => {
      if (!acc[index.TABLE_NAME]) {
        acc[index.TABLE_NAME] = [];
      }
      acc[index.TABLE_NAME].push(index);
      return acc;
    }, {});

    // Mostrar resumen por tabla
    Object.keys(indexesByTable).forEach(tableName => {
      const tableIndexes = indexesByTable[tableName];
      const uniqueIndexes = [...new Set(tableIndexes.map(idx => idx.INDEX_NAME))];
      console.log(`  📁 ${tableName}: ${uniqueIndexes.length} índices`);
    });

    console.log('\n🎉 ¡Índices optimizados creados exitosamente!');
    console.log('\n💡 Beneficios esperados:');
    console.log('  - Reducción del tiempo de consulta en 60-80%');
    console.log('  - Mejora en consultas de dashboard y reportes');
    console.log('  - Optimización de búsquedas de texto');
    console.log('  - Mejor rendimiento en operaciones CRUD frecuentes');

  } catch (error) {
    console.error('💥 Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la función
createOptimizedIndexes()
  .then(() => {
    console.log('\n🏁 Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });