
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
