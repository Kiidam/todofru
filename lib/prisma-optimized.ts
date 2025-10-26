
// Configuración optimizada de Prisma para producción
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Configuraciones de optimización
  __internal: {
    engine: {
      // Pool de conexiones optimizado
      connectionLimit: 20,
      poolTimeout: 10000,
      // Cache de consultas
      enableQueryCache: true,
      // Timeout de consultas
      queryTimeout: 30000,
    },
  },
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Middleware para logging de consultas lentas
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  
  const queryTime = after - before;
  
  // Log consultas que tomen más de 1 segundo
  if (queryTime > 1000) {
    console.warn(`🐌 Consulta lenta detectada: ${params.model}.${params.action} - ${queryTime}ms`);
  }
  
  return result;
});

// Middleware para cache de consultas frecuentes
const queryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

prisma.$use(async (params, next) => {
  // Solo cachear consultas SELECT
  if (params.action === 'findMany' || params.action === 'findFirst') {
    const cacheKey = JSON.stringify(params);
    const cached = queryCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    
    const result = await next(params);
    
    // Cachear solo resultados pequeños
    if (JSON.stringify(result).length < 10000) {
      queryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
    }
    
    return result;
  }
  
  return next(params);
});

export default prisma;
