const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixVersionColumns() {
  console.log('🔧 Agregando columnas version faltantes...\n');

  try {
    // Tablas que necesitan la columna version
    const tables = ['producto', 'cliente'];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN version INT NOT NULL DEFAULT 1`);
        console.log(`✅ Columna version agregada a ${table}`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`⚠️  Columna version ya existe en ${table}`);
        } else {
          console.log(`❌ Error agregando columna version a ${table}: ${error.message}`);
        }
      }
    }

    // Agregar índices para optimización
    const indexQueries = [
      'CREATE INDEX idx_producto_version ON producto(version)',
      'CREATE INDEX idx_cliente_version ON cliente(version)'
    ];

    for (const query of indexQueries) {
      try {
        await prisma.$executeRawUnsafe(query);
        console.log(`✅ Índice creado: ${query.split(' ')[2]}`);
      } catch (error) {
        if (error.message.includes('Duplicate key name')) {
          console.log(`⚠️  Índice ya existe: ${query.split(' ')[2]}`);
        } else {
          console.log(`❌ Error creando índice: ${error.message}`);
        }
      }
    }

    // Verificar que las consultas funcionen
    console.log('\n📋 Verificando consultas...');
    
    const productoCount = await prisma.producto.count();
    console.log(`✅ Consulta de productos exitosa: ${productoCount} productos`);
    
    const clienteCount = await prisma.cliente.count();
    console.log(`✅ Consulta de clientes exitosa: ${clienteCount} clientes`);

    console.log('\n🎉 Correcciones de columnas version aplicadas exitosamente!');

  } catch (error) {
    console.log('❌ Error en las correcciones:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixVersionColumns().catch(console.error);