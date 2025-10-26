// Borra la tabla interna de Prisma en MySQL si existe
const { PrismaClient } = require('@prisma/client');

async function dropPrismaMigrationsTable() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS __prisma_migrations;');
    console.log('✅ Tabla __prisma_migrations eliminada (si existía)');
  } catch (error) {
    console.error('❌ Error al eliminar __prisma_migrations:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

dropPrismaMigrationsTable();