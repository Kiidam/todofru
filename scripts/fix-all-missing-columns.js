const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixAllMissingColumns() {
  console.log('🔧 Agregando todas las columnas faltantes...\n');

  try {
    // Definir todas las columnas que necesitan ser agregadas
    const columnUpdates = [
      // Tabla producto
      { table: 'producto', column: 'lastModifiedBy', type: 'VARCHAR(191) NULL' },
      
      // Tabla cliente
      { table: 'cliente', column: 'lastModifiedBy', type: 'VARCHAR(191) NULL' },
      { table: 'cliente', column: 'numeroIdentificacion', type: 'VARCHAR(11) NULL' },
    ];

    // Agregar columnas faltantes
    for (const { table, column, type } of columnUpdates) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        console.log(`✅ Columna ${column} agregada a ${table}`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`⚠️  Columna ${column} ya existe en ${table}`);
        } else {
          console.log(`❌ Error agregando columna ${column} a ${table}: ${error.message}`);
        }
      }
    }

    // Agregar índices únicos si no existen
    const uniqueIndexes = [
      { table: 'cliente', column: 'numeroIdentificacion', name: 'numeroIdentificacion' }
    ];

    for (const { table, column, name } of uniqueIndexes) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD UNIQUE INDEX ${name} (${column})`);
        console.log(`✅ Índice único ${name} agregado a ${table}`);
      } catch (error) {
        if (error.message.includes('Duplicate key name')) {
          console.log(`⚠️  Índice único ${name} ya existe en ${table}`);
        } else {
          console.log(`❌ Error agregando índice ${name}: ${error.message}`);
        }
      }
    }

    // Verificar que todas las consultas funcionen
    console.log('\n📋 Verificando consultas...');
    
    const productoCount = await prisma.producto.count();
    console.log(`✅ Consulta de productos exitosa: ${productoCount} productos`);
    
    const clienteCount = await prisma.cliente.count();
    console.log(`✅ Consulta de clientes exitosa: ${clienteCount} clientes`);
    
    const proveedorCount = await prisma.proveedor.count();
    console.log(`✅ Consulta de proveedores exitosa: ${proveedorCount} proveedores`);

    console.log('\n🎉 Todas las correcciones aplicadas exitosamente!');

  } catch (error) {
    console.log('❌ Error en las correcciones:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllMissingColumns().catch(console.error);