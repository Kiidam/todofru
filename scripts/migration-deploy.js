const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Script de migración para aplicar optimizaciones y correcciones en otros entornos
 * Este script debe ejecutarse después de aplicar las migraciones de Prisma
 */

async function deployOptimizations() {
  console.log('🚀 INICIANDO MIGRACIÓN DE OPTIMIZACIONES');
  console.log('='.repeat(60));
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    steps: [],
    summary: {
      totalSteps: 0,
      successfulSteps: 0,
      failedSteps: 0,
      status: 'PENDING'
    }
  };

  async function executeStep(name, operation) {
    console.log(`\n📋 Ejecutando: ${name}`);
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      console.log(`   ✅ COMPLETADO (${duration}ms)`);
      
      report.steps.push({
        name,
        status: 'SUCCESS',
        duration,
        result,
        timestamp: new Date().toISOString()
      });
      
      report.summary.successfulSteps++;
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.log(`   ❌ ERROR (${duration}ms): ${error.message}`);
      
      report.steps.push({
        name,
        status: 'ERROR',
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      report.summary.failedSteps++;
      throw error;
    }
  }

  try {
    // 1. Verificar conexión a base de datos
    await executeStep('Verificación de conexión a base de datos', async () => {
      await prisma.$queryRaw`SELECT 1 as test`;
      return { connected: true };
    });

    // 2. Crear índices optimizados
    await executeStep('Creación de índices optimizados', async () => {
      const indices = [
        {
          name: 'idx_movimiento_fecha_tipo',
          sql: 'CREATE INDEX idx_movimiento_fecha_tipo ON movimientoinventario (createdAt, tipo)'
        },
        {
          name: 'idx_pedido_venta_estado_fecha',
          sql: 'CREATE INDEX idx_pedido_venta_estado_fecha ON pedidoventa (estado, fecha)'
        },
        {
          name: 'idx_producto_categoria_activo',
          sql: 'CREATE INDEX idx_producto_categoria_activo ON producto (categoriaId, activo)'
        },
        {
          name: 'idx_auditoria_tabla_fecha',
          sql: 'CREATE INDEX idx_auditoria_tabla_fecha ON auditoria (tabla, createdAt)'
        },
        {
          name: 'idx_pedido_compra_item_producto',
          sql: 'CREATE INDEX idx_pedido_compra_item_producto ON pedidocompraitem (productoId, cantidad)'
        },
        {
          name: 'idx_pedido_venta_item_producto',
          sql: 'CREATE INDEX idx_pedido_venta_item_producto ON pedidoventaitem (productoId, cantidad)'
        }
      ];

      const results = [];
      for (const index of indices) {
        try {
          await prisma.$executeRawUnsafe(index.sql);
          results.push({ name: index.name, status: 'created' });
          console.log(`     ✓ Índice creado: ${index.name}`);
        } catch (error) {
          if (error.message.includes('Duplicate key name')) {
            results.push({ name: index.name, status: 'already_exists' });
            console.log(`     ⚠ Índice ya existe: ${index.name}`);
          } else {
            results.push({ name: index.name, status: 'error', error: error.message });
            console.log(`     ❌ Error creando índice ${index.name}: ${error.message}`);
          }
        }
      }
      
      return { indices: results };
    });

    // 3. Verificar integridad de datos
    await executeStep('Verificación de integridad de datos', async () => {
      const checks = [];
      
      // Verificar productos sin categoría válida
      const productosOrfanos = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM producto p 
        LEFT JOIN categoria c ON p.categoriaId = c.id 
        WHERE p.categoriaId IS NOT NULL AND c.id IS NULL
      `;
      checks.push({ 
        name: 'productos_sin_categoria', 
        count: Number(productosOrfanos[0].count),
        status: Number(productosOrfanos[0].count) === 0 ? 'OK' : 'WARNING'
      });

      // Verificar movimientos sin usuario válido
      const movimientosOrfanos = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM movimientoinventario m 
        LEFT JOIN user u ON m.usuarioId = u.id 
        WHERE u.id IS NULL
      `;
      checks.push({ 
        name: 'movimientos_sin_usuario', 
        count: Number(movimientosOrfanos[0].count),
        status: Number(movimientosOrfanos[0].count) === 0 ? 'OK' : 'WARNING'
      });

      return { checks };
    });

    // 4. Crear directorios necesarios para archivos de configuración
    await executeStep('Creación de directorios de configuración', async () => {
      const directories = ['./lib', './logs'];
      const created = [];
      
      for (const dir of directories) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          created.push(dir);
        }
      }
      
      return { created };
    });

    // 5. Generar archivos de configuración optimizada
    await executeStep('Generación de archivos de configuración', async () => {
      const configs = [];
      
      // Configuración optimizada de Prisma
      const prismaConfig = `import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Configuración de pool de conexiones optimizada
export const prismaConfig = {
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  charset: 'utf8mb4'
};
`;

      if (!fs.existsSync('./lib/prisma-optimized.ts')) {
        fs.writeFileSync('./lib/prisma-optimized.ts', prismaConfig);
        configs.push('prisma-optimized.ts');
      }

      return { configs };
    });

    // 6. Verificar rendimiento de consultas críticas
    await executeStep('Verificación de rendimiento de consultas', async () => {
      const performanceTests = [];
      
      // Consulta de productos con joins
      const startProducts = Date.now();
      await prisma.producto.findMany({
        take: 100,
        include: {
          categoria: true,
          unidadMedida: true
        }
      });
      performanceTests.push({
        query: 'productos_con_joins',
        duration: Date.now() - startProducts,
        status: Date.now() - startProducts < 1000 ? 'GOOD' : 'SLOW'
      });

      // Consulta de movimientos recientes
      const startMovements = Date.now();
      await prisma.movimientoInventario.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          producto: true,
          usuario: true
        }
      });
      performanceTests.push({
        query: 'movimientos_recientes',
        duration: Date.now() - startMovements,
        status: Date.now() - startMovements < 500 ? 'GOOD' : 'SLOW'
      });

      return { performanceTests };
    });

    report.summary.totalSteps = report.steps.length;
    report.summary.status = report.summary.failedSteps === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS';

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`📈 Pasos totales: ${report.summary.totalSteps}`);
    console.log(`✅ Pasos exitosos: ${report.summary.successfulSteps}`);
    console.log(`❌ Pasos fallidos: ${report.summary.failedSteps}`);
    console.log(`🎯 Estado: ${report.summary.status}`);

    if (report.summary.failedSteps > 0) {
      console.log('\n❌ PASOS FALLIDOS:');
      report.steps
        .filter(step => step.status === 'ERROR')
        .forEach((step, index) => {
          console.log(`${index + 1}. ${step.name}: ${step.error}`);
        });
    }

  } catch (error) {
    console.error('\n💥 Error crítico durante la migración:', error);
    report.summary.status = 'FAILED';
  } finally {
    // Guardar reporte
    const reportPath = './REPORTE-MIGRACION.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Reporte detallado guardado en: ${reportPath}`);
    
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  deployOptimizations()
    .then(() => {
      console.log('\n🎉 Migración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en migración:', error);
      process.exit(1);
    });
}

module.exports = { deployOptimizations };