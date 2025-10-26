
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
      response.headers.set('X-Response-Time', `${responseTime}ms`);
      
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
    const key = `${metric.method} ${metric.endpoint}`;
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
