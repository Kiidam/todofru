import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Configuración mejorada del cliente Prisma con mejor manejo de errores
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn', 'info'] 
      : ['error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Nota: El middleware $use ha sido removido en versiones recientes de Prisma
// Para logging de queries, usar Prisma logging configuration en el constructor

// Manejo de desconexión graceful
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Función helper para verificar conexión
export async function checkDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Función helper para transacciones seguras
export async function safeTransaction<T>(
  fn: (prisma: PrismaClient) => Promise<T>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      return await fn(tx as PrismaClient);
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Transaction failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown transaction error' 
    };
  }
}