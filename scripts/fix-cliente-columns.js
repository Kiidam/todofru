const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixClienteColumns() {
  console.log('🔧 Agregando columnas faltantes a la tabla cliente...\n');

  try {
    // Agregar columnas faltantes a la tabla cliente
    const columnsToAdd = [
      'ADD COLUMN apellidos VARCHAR(100) NULL',
      'ADD COLUMN mensajePersonalizado TEXT NULL',
      'ADD COLUMN nombres VARCHAR(100) NULL',
      'ADD COLUMN numeroIdentificacion VARCHAR(11) NULL',
      'ADD COLUMN razonSocial VARCHAR(200) NULL',
      'ADD COLUMN tipoEntidad VARCHAR(20) NULL'
    ];

    for (const column of columnsToAdd) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE cliente ${column}`);
        console.log(`✅ Columna agregada: ${column.split(' ')[2]}`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`⚠️  Columna ya existe: ${column.split(' ')[2]}`);
        } else {
          console.log(`❌ Error agregando columna ${column.split(' ')[2]}: ${error.message}`);
        }
      }
    }

    // Agregar índice único para numeroIdentificacion
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE cliente ADD UNIQUE INDEX numeroIdentificacion (numeroIdentificacion)`);
      console.log('✅ Índice único agregado para numeroIdentificacion');
    } catch (error) {
      if (error.message.includes('Duplicate key name')) {
        console.log('⚠️  Índice único ya existe para numeroIdentificacion');
      } else {
        console.log(`❌ Error agregando índice: ${error.message}`);
      }
    }

    // Verificar la estructura actualizada
    console.log('\n📋 Verificando estructura actualizada...');
    const result = await prisma.$queryRaw`DESCRIBE cliente`;
    console.log(`Total de columnas en cliente: ${result.length}`);

    // Probar una consulta simple
    const clienteCount = await prisma.cliente.count();
    console.log(`✅ Consulta de prueba exitosa: ${clienteCount} clientes`);

    console.log('\n🎉 Correcciones aplicadas exitosamente a la tabla cliente!');

  } catch (error) {
    console.log('❌ Error en las correcciones:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixClienteColumns().catch(console.error);