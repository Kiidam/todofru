const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyDatabaseFixes() {
  console.log('🔧 Aplicando correcciones a la base de datos...\n');

  try {
    // 1. Agregar columnas faltantes a pedidocompra
    console.log('1. Agregando columnas faltantes a pedidocompra...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE pedidocompra 
        ADD COLUMN lastModifiedBy VARCHAR(255) NULL
      `;
      console.log('✅ Columna lastModifiedBy agregada a pedidocompra');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('ℹ️  Columna lastModifiedBy ya existe en pedidocompra');
      } else {
        throw error;
      }
    }

    try {
      await prisma.$executeRaw`
        ALTER TABLE pedidocompra 
        ADD COLUMN version INT NOT NULL DEFAULT 1
      `;
      console.log('✅ Columna version agregada a pedidocompra');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('ℹ️  Columna version ya existe en pedidocompra');
      } else {
        throw error;
      }
    }

    // 2. Agregar columnas faltantes a proveedor
    console.log('\n2. Agregando columnas faltantes a proveedor...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE proveedor 
        ADD COLUMN lastModifiedBy VARCHAR(255) NULL
      `;
      console.log('✅ Columna lastModifiedBy agregada a proveedor');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('ℹ️  Columna lastModifiedBy ya existe en proveedor');
      } else {
        throw error;
      }
    }

    try {
      await prisma.$executeRaw`
        ALTER TABLE proveedor 
        ADD COLUMN version INT NOT NULL DEFAULT 1
      `;
      console.log('✅ Columna version agregada a proveedor');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('ℹ️  Columna version ya existe en proveedor');
      } else {
        throw error;
      }
    }

    // 3. Crear índices para optimización
    console.log('\n3. Creando índices de optimización...');
    try {
      await prisma.$executeRaw`
        CREATE INDEX idx_proveedor_version ON proveedor(version)
      `;
      console.log('✅ Índice idx_proveedor_version creado');
    } catch (error) {
      if (error.message.includes('Duplicate key name')) {
        console.log('ℹ️  Índice idx_proveedor_version ya existe');
      } else {
        console.log('⚠️  Error creando índice:', error.message);
      }
    }

    // 4. Actualizar registros existentes
    console.log('\n4. Actualizando registros existentes...');
    
    const updatedPedidoCompra = await prisma.$executeRaw`
      UPDATE pedidocompra SET version = 1 WHERE version IS NULL OR version = 0
    `;
    console.log(`✅ Actualizados registros de pedidocompra: ${updatedPedidoCompra}`);

    const updatedProveedor = await prisma.$executeRaw`
      UPDATE proveedor SET version = 1 WHERE version IS NULL OR version = 0
    `;
    console.log(`✅ Actualizados registros de proveedor: ${updatedProveedor}`);

    // 5. Verificar que las correcciones funcionaron
    console.log('\n5. Verificando correcciones...');
    
    // Probar consulta que antes fallaba
    try {
      const testPedidoCompra = await prisma.pedidoCompra.findMany({
        take: 1,
        include: {
          proveedor: true,
          usuario: true
        }
      });
      console.log('✅ Consulta de pedidoCompra funciona correctamente');
    } catch (error) {
      console.log('❌ Error en consulta de pedidoCompra:', error.message);
    }

    try {
      const testProveedor = await prisma.proveedor.findMany({
        take: 1
      });
      console.log('✅ Consulta de proveedor funciona correctamente');
    } catch (error) {
      console.log('❌ Error en consulta de proveedor:', error.message);
    }

    console.log('\n🎉 Correcciones aplicadas exitosamente!');

  } catch (error) {
    console.log('❌ Error aplicando correcciones:', error.message);
    console.log('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

applyDatabaseFixes().catch(console.error);