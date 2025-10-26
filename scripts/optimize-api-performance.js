const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function optimizeAPIPerformance() {
  console.log('🚀 Iniciando optimización proactiva de APIs...\n');
  
  const optimizations = [];
  
  try {
    // 1. Crear índices compuestos optimizados
    console.log('1. Creando índices compuestos optimizados...');
    
    const indexQueries = [
      // Índice para consultas de movimientos por fecha y tipo
      `CREATE INDEX idx_movimiento_fecha_tipo 
       ON movimientoinventario (createdAt DESC, tipo, productoId)`,
      
      // Índice para consultas de pedidos por estado y fecha
      `CREATE INDEX idx_pedido_venta_estado_fecha 
       ON pedidoventa (estado, fecha DESC, clienteId)`,
       
      `CREATE INDEX idx_pedido_compra_estado_fecha 
       ON pedidocompra (estado, fecha DESC, proveedorId)`,
      
      // Índice para búsquedas de productos
      `CREATE INDEX idx_producto_busqueda 
       ON producto (activo, nombre(50), sku)`,
      
      // Índice para auditoría por tabla y fecha
      `CREATE INDEX idx_auditoria_tabla_fecha 
       ON auditoria (tabla, createdAt DESC, usuarioId)`,
      
      // Índice para productos por categoría activa
      `CREATE INDEX idx_producto_categoria_activo 
       ON producto (categoriaId, activo, nombre(50))`,
       
      // Índice para items de pedidos por producto
      `CREATE INDEX idx_pedido_venta_item_producto 
       ON pedidoventaitem (productoId, pedidoId)`,
       
      `CREATE INDEX idx_pedido_compra_item_producto 
       ON pedidocompraitem (productoId, pedidoId)`
    ];
    
    for (const query of indexQueries) {
      try {
        await prisma.$executeRawUnsafe(query);
        console.log(`   ✅ Índice creado: ${query.split('\\n')[0].split('idx_')[1]?.split(' ')[0] || 'índice'}`);
        optimizations.push({
          type: 'INDEX_CREATION',
          description: query.split('\\n')[0],
          status: 'SUCCESS'
        });
      } catch (error) {
        console.log(`   ⚠️  Índice ya existe o error: ${error.message.split('\\n')[0]}`);
        optimizations.push({
          type: 'INDEX_CREATION',
          description: query.split('\\n')[0],
          status: 'SKIPPED',
          reason: error.message
        });
      }
    }

    // 2. Optimizar configuración de Prisma
    console.log('\n2. Creando configuración optimizada de Prisma...');
    
    // Crear directorio lib si no existe
    if (!fs.existsSync('./lib')) {
      fs.mkdirSync('./lib', { recursive: true });
    }
    
    const optimizedPrismaConfig = `
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
    console.warn(\`🐌 Consulta lenta detectada: \${params.model}.\${params.action} - \${queryTime}ms\`);
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
`;

    fs.writeFileSync('./lib/prisma-optimized.ts', optimizedPrismaConfig);
    console.log('   ✅ Configuración optimizada de Prisma creada');
    
    optimizations.push({
      type: 'PRISMA_OPTIMIZATION',
      description: 'Configuración optimizada de Prisma con pool de conexiones y cache',
      status: 'SUCCESS'
    });

    // 3. Crear utilidades de cache para APIs
    console.log('\\n3. Creando utilidades de cache para APIs...');
    
    const cacheUtils = `
import { NextRequest, NextResponse } from 'next/server';

// Cache en memoria simple (para desarrollo)
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export interface CacheOptions {
  ttl?: number; // Time to live en milisegundos
  key?: string; // Clave personalizada
  tags?: string[]; // Tags para invalidación
}

export function withCache<T>(
  handler: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 5 * 60 * 1000, key, tags = [] } = options; // 5 minutos por defecto
  
  const cacheKey = key || \`cache_\${Date.now()}_\${Math.random()}\`;
  const cached = cache.get(cacheKey);
  
  // Verificar si el cache es válido
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return Promise.resolve(cached.data);
  }
  
  // Ejecutar handler y cachear resultado
  return handler().then(result => {
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      ttl
    });
    
    return result;
  });
}

export function invalidateCache(pattern?: string | RegExp) {
  if (!pattern) {
    cache.clear();
    return;
  }
  
  const keys = Array.from(cache.keys());
  
  if (typeof pattern === 'string') {
    keys.forEach(key => {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    });
  } else {
    keys.forEach(key => {
      if (pattern.test(key)) {
        cache.delete(key);
      }
    });
  }
}

export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
    totalMemory: JSON.stringify(Array.from(cache.values())).length
  };
}

// Middleware para cache automático de respuestas GET
export function withResponseCache(ttl: number = 5 * 60 * 1000) {
  return function(handler: Function) {
    return async function(request: NextRequest, context: any) {
      // Solo cachear GET requests
      if (request.method !== 'GET') {
        return handler(request, context);
      }
      
      const url = request.url;
      const cacheKey = \`response_\${url}\`;
      
      return withCache(
        () => handler(request, context),
        { key: cacheKey, ttl }
      );
    };
  };
}

// Utilidad para paginación optimizada
export interface PaginationOptions {
  page?: number;
  limit?: number;
  maxLimit?: number;
}

export function optimizePagination(options: PaginationOptions = {}) {
  const { page = 1, limit = 10, maxLimit = 100 } = options;
  
  const normalizedPage = Math.max(1, page);
  const normalizedLimit = Math.min(Math.max(1, limit), maxLimit);
  const skip = (normalizedPage - 1) * normalizedLimit;
  
  return {
    skip,
    take: normalizedLimit,
    page: normalizedPage,
    limit: normalizedLimit
  };
}

// Utilidad para consultas optimizadas de productos
export const optimizedProductQueries = {
  // Consulta básica de productos con relaciones mínimas
  basic: {
    select: {
      id: true,
      nombre: true,
      sku: true,
      precio: true,
      stock: true,
      stockMinimo: true,
      activo: true,
      categoria: {
        select: {
          id: true,
          nombre: true
        }
      },
      unidadMedida: {
        select: {
          id: true,
          nombre: true,
          simbolo: true
        }
      }
    }
  },
  
  // Consulta para inventario
  inventory: {
    select: {
      id: true,
      nombre: true,
      sku: true,
      stock: true,
      stockMinimo: true,
      perecedero: true,
      diasVencimiento: true,
      categoria: {
        select: {
          nombre: true
        }
      },
      unidadMedida: {
        select: {
          simbolo: true
        }
      }
    },
    where: {
      activo: true
    }
  },
  
  // Consulta para búsqueda
  search: (term: string) => ({
    where: {
      AND: [
        { activo: true },
        {
          OR: [
            { nombre: { contains: term, mode: 'insensitive' } },
            { sku: { contains: term, mode: 'insensitive' } },
            { descripcion: { contains: term, mode: 'insensitive' } }
          ]
        }
      ]
    },
    select: {
      id: true,
      nombre: true,
      sku: true,
      descripcion: true,
      precio: true,
      categoria: {
        select: {
          nombre: true
        }
      }
    }
  })
};

export default {
  withCache,
  invalidateCache,
  getCacheStats,
  withResponseCache,
  optimizePagination,
  optimizedProductQueries
};
`;

    fs.writeFileSync('./lib/cache-utils.ts', cacheUtils);
    console.log('   ✅ Utilidades de cache creadas');
    
    optimizations.push({
      type: 'CACHE_UTILITIES',
      description: 'Utilidades de cache para APIs con invalidación y paginación optimizada',
      status: 'SUCCESS'
    });

    // 4. Crear middleware de rate limiting
    console.log('\\n4. Creando middleware de rate limiting...');
    
    const rateLimitMiddleware = `
import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Ventana de tiempo en milisegundos
  maxRequests: number; // Máximo número de requests por ventana
  message?: string; // Mensaje de error personalizado
  skipSuccessfulRequests?: boolean; // No contar requests exitosos
}

// Store en memoria para rate limiting (usar Redis en producción)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function createRateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false
  } = config;

  return async function rateLimitMiddleware(
    request: NextRequest,
    handler: Function
  ) {
    // Obtener identificador del cliente (IP + User Agent)
    const clientId = getClientId(request);
    const now = Date.now();
    
    // Limpiar entradas expiradas
    cleanupExpiredEntries(now);
    
    // Obtener o crear contador para este cliente
    let clientData = requestCounts.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      clientData = {
        count: 0,
        resetTime: now + windowMs
      };
    }
    
    // Verificar si excede el límite
    if (clientData.count >= maxRequests) {
      return NextResponse.json(
        { error: message },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': clientData.resetTime.toString()
          }
        }
      );
    }
    
    // Incrementar contador
    clientData.count++;
    requestCounts.set(clientId, clientData);
    
    // Ejecutar handler
    const response = await handler(request);
    
    // Si skipSuccessfulRequests está habilitado y la respuesta es exitosa,
    // decrementar el contador
    if (skipSuccessfulRequests && response.status < 400) {
      clientData.count--;
      requestCounts.set(clientId, clientData);
    }
    
    // Agregar headers de rate limit
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', (maxRequests - clientData.count).toString());
    response.headers.set('X-RateLimit-Reset', clientData.resetTime.toString());
    
    return response;
  };
}

function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return \`\${ip}:\${userAgent}\`;
}

function cleanupExpiredEntries(now: number) {
  for (const [key, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(key);
    }
  }
}

// Configuraciones predefinidas
export const rateLimitConfigs = {
  // Para APIs públicas
  public: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 100,
    message: 'Too many requests from this IP, please try again later.'
  },
  
  // Para APIs de autenticación
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later.'
  },
  
  // Para APIs de escritura
  write: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 10,
    message: 'Too many write operations, please slow down.'
  },
  
  // Para APIs de búsqueda
  search: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 30,
    message: 'Too many search requests, please try again later.'
  }
};

export default createRateLimit;
`;

    fs.writeFileSync('./lib/rate-limit.ts', rateLimitMiddleware);
    console.log('   ✅ Middleware de rate limiting creado');
    
    optimizations.push({
      type: 'RATE_LIMITING',
      description: 'Middleware de rate limiting con configuraciones predefinidas',
      status: 'SUCCESS'
    });

    // 5. Crear script de monitoreo de rendimiento
    console.log('\\n5. Creando script de monitoreo de rendimiento...');
    
    const performanceMonitor = `
import { NextRequest, NextResponse } from 'next/server';

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: number;
  userAgent?: string;
  ip?: string;
}

// Store de métricas (usar base de datos en producción)
const metrics: PerformanceMetrics[] = [];
const MAX_METRICS = 10000; // Límite de métricas en memoria

export function withPerformanceMonitoring(handler: Function) {
  return async function performanceWrapper(request: NextRequest, context: any) {
    const startTime = Date.now();
    const endpoint = new URL(request.url).pathname;
    const method = request.method;
    
    try {
      const response = await handler(request, context);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Registrar métrica
      recordMetric({
        endpoint,
        method,
        responseTime,
        statusCode: response.status,
        timestamp: startTime,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || request.ip || undefined
      });
      
      // Agregar header de tiempo de respuesta
      response.headers.set('X-Response-Time', \`\${responseTime}ms\`);
      
      return response;
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Registrar métrica de error
      recordMetric({
        endpoint,
        method,
        responseTime,
        statusCode: 500,
        timestamp: startTime,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || request.ip || undefined
      });
      
      throw error;
    }
  };
}

function recordMetric(metric: PerformanceMetrics) {
  metrics.push(metric);
  
  // Mantener solo las últimas métricas
  if (metrics.length > MAX_METRICS) {
    metrics.splice(0, metrics.length - MAX_METRICS);
  }
}

export function getPerformanceStats(timeWindow: number = 60 * 60 * 1000) {
  const now = Date.now();
  const windowStart = now - timeWindow;
  
  const recentMetrics = metrics.filter(m => m.timestamp >= windowStart);
  
  if (recentMetrics.length === 0) {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      slowestEndpoints: [],
      statusCodeDistribution: {}
    };
  }
  
  const totalRequests = recentMetrics.length;
  const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
  const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
  const errorRate = (errorCount / totalRequests) * 100;
  
  // Endpoints más lentos
  const endpointStats = new Map<string, { count: number; totalTime: number; errors: number }>();
  
  recentMetrics.forEach(metric => {
    const key = \`\${metric.method} \${metric.endpoint}\`;
    const stats = endpointStats.get(key) || { count: 0, totalTime: 0, errors: 0 };
    
    stats.count++;
    stats.totalTime += metric.responseTime;
    if (metric.statusCode >= 400) stats.errors++;
    
    endpointStats.set(key, stats);
  });
  
  const slowestEndpoints = Array.from(endpointStats.entries())
    .map(([endpoint, stats]) => ({
      endpoint,
      averageTime: stats.totalTime / stats.count,
      requestCount: stats.count,
      errorRate: (stats.errors / stats.count) * 100
    }))
    .sort((a, b) => b.averageTime - a.averageTime)
    .slice(0, 10);
  
  // Distribución de códigos de estado
  const statusCodeDistribution: Record<number, number> = {};
  recentMetrics.forEach(metric => {
    statusCodeDistribution[metric.statusCode] = (statusCodeDistribution[metric.statusCode] || 0) + 1;
  });
  
  return {
    totalRequests,
    averageResponseTime: Math.round(averageResponseTime),
    errorRate: Math.round(errorRate * 100) / 100,
    slowestEndpoints,
    statusCodeDistribution,
    timeWindow: timeWindow / 1000 / 60 // en minutos
  };
}

export function clearMetrics() {
  metrics.length = 0;
}

export default withPerformanceMonitoring;
`;

    fs.writeFileSync('./lib/performance-monitor.ts', performanceMonitor);
    console.log('   ✅ Script de monitoreo de rendimiento creado');
    
    optimizations.push({
      type: 'PERFORMANCE_MONITORING',
      description: 'Sistema de monitoreo de rendimiento con métricas detalladas',
      status: 'SUCCESS'
    });

    // 6. Crear endpoint de métricas
    console.log('\\n6. Creando endpoint de métricas...');
    
    const metricsEndpoint = `
import { NextRequest, NextResponse } from 'next/server';
import { getPerformanceStats } from '@/lib/performance-monitor';
import { getCacheStats } from '@/lib/cache-utils';
import { withAuth } from '@/lib/api-utils';

async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const timeWindow = parseInt(url.searchParams.get('window') || '3600') * 1000; // Default 1 hora
  
  const performanceStats = getPerformanceStats(timeWindow);
  const cacheStats = getCacheStats();
  
  const systemStats = {
    timestamp: new Date().toISOString(),
    performance: performanceStats,
    cache: cacheStats,
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    }
  };
  
  return NextResponse.json(systemStats);
}

export { withAuth(GET) as GET };
`;

    // Crear directorio si no existe
    const metricsDir = './app/api/admin/metrics';
    if (!fs.existsSync(metricsDir)) {
      fs.mkdirSync(metricsDir, { recursive: true });
    }
    
    fs.writeFileSync(`${metricsDir}/route.ts`, metricsEndpoint);
    console.log('   ✅ Endpoint de métricas creado en /api/admin/metrics');
    
    optimizations.push({
      type: 'METRICS_ENDPOINT',
      description: 'Endpoint para consultar métricas de rendimiento y sistema',
      status: 'SUCCESS'
    });

    // Resumen final
    console.log('\\n' + '='.repeat(60));
    console.log('🚀 RESUMEN DE OPTIMIZACIONES APLICADAS');
    console.log('='.repeat(60));
    
    const successCount = optimizations.filter(o => o.status === 'SUCCESS').length;
    const skippedCount = optimizations.filter(o => o.status === 'SKIPPED').length;
    
    console.log(`✅ Optimizaciones aplicadas exitosamente: ${successCount}`);
    if (skippedCount > 0) {
      console.log(`⚠️  Optimizaciones omitidas: ${skippedCount}`);
    }
    
    console.log('\\n📋 Detalles de optimizaciones:');
    optimizations.forEach((opt, index) => {
      const icon = opt.status === 'SUCCESS' ? '✅' : '⚠️';
      console.log(`${index + 1}. ${icon} ${opt.type}: ${opt.description}`);
      if (opt.reason) {
        console.log(`   Razón: ${opt.reason}`);
      }
    });
    
    console.log('\\n💡 Próximos pasos recomendados:');
    console.log('1. Implementar los nuevos middlewares en las APIs críticas');
    console.log('2. Configurar Redis para cache distribuido en producción');
    console.log('3. Monitorear métricas en /api/admin/metrics');
    console.log('4. Ajustar límites de rate limiting según el uso real');
    console.log('5. Considerar implementar CDN para assets estáticos');

    // Guardar reporte
    const reportPath = './REPORTE-OPTIMIZACIONES.json';
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalOptimizations: optimizations.length,
        successfulOptimizations: successCount,
        skippedOptimizations: skippedCount
      },
      optimizations: optimizations
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\\n📄 Reporte detallado guardado en: ${reportPath}`);

  } catch (error) {
    console.error('❌ Error durante la optimización:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar optimización
optimizeAPIPerformance().catch(console.error);