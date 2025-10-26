
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
  
  const cacheKey = key || `cache_${Date.now()}_${Math.random()}`;
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
      const cacheKey = `response_${url}`;
      
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
