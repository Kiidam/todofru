
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
  
  return `${ip}:${userAgent}`;
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
