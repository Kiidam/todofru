const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

/**
 * Script de rollback para revertir optimizaciones en caso de problemas
 * Este script elimina índices creados y restaura configuraciones anteriores
 */

async function rollbackOptimizations() {
  console.log('🔄 INICIANDO ROLLBACK DE OPTIMIZACIONES');
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
      // No lanzar error para continuar con otros pasos
      return null;
    }
  }

  try {
    // 1. Verificar conexión a base de datos
    await executeStep('Verificación de conexión a base de datos', async () => {
      await prisma.$queryRaw`SELECT 1 as test`;
      return { connected: true };
    });

    // 2. Eliminar índices optimizados
    await executeStep('Eliminación de índices optimizados', async () => {
      const indices = [
        'idx_movimiento_fecha_tipo',
        'idx_pedido_venta_estado_fecha',
        'idx_producto_categoria_activo',
        'idx_auditoria_tabla_fecha',
        'idx_pedido_compra_item_producto',
        'idx_pedido_venta_item_producto'
      ];

      const results = [];
      for (const indexName of indices) {
        try {
          await prisma.$executeRawUnsafe(`DROP INDEX ${indexName}`);
          results.push({ name: indexName, status: 'dropped' });
          console.log(`     ✓ Índice eliminado: ${indexName}`);
        } catch (error) {
          if (error.message.includes("doesn't exist")) {
            results.push({ name: indexName, status: 'not_found' });
            console.log(`     ⚠ Índice no encontrado: ${indexName}`);
          } else {
            results.push({ name: indexName, status: 'error', error: error.message });
            console.log(`     ❌ Error eliminando índice ${indexName}: ${error.message}`);
          }
        }
      }
      
      return { indices: results };
    });

    // 3. Crear backup de archivos de configuración antes de eliminar
    await executeStep('Backup y eliminación de archivos de configuración', async () => {
      const configFiles = [
        './lib/prisma-optimized.ts',
        './lib/cache-utils.ts',
        './lib/rate-limit.ts',
        './lib/performance-monitor.ts'
      ];

      const backupDir = './backups/config-rollback';
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const processed = [];
      for (const file of configFiles) {
        if (fs.existsSync(file)) {
          // Crear backup
          const backupFile = `${backupDir}/${path.basename(file)}.backup.${Date.now()}`;
          fs.copyFileSync(file, backupFile);
          
          // Eliminar archivo original
          fs.unlinkSync(file);
          
          processed.push({ 
            file, 
            status: 'backed_up_and_removed',
            backup: backupFile
          });
          console.log(`     ✓ Archivo respaldado y eliminado: ${file}`);
        } else {
          processed.push({ file, status: 'not_found' });
          console.log(`     ⚠ Archivo no encontrado: ${file}`);
        }
      }
      
      return { processed };
    });

    // 4. Verificar estado de la base de datos después del rollback
    await executeStep('Verificación post-rollback', async () => {
      const checks = [];
      
      // Verificar que los índices fueron eliminados
      const indices = await prisma.$queryRaw`
        SELECT INDEX_NAME 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND INDEX_NAME LIKE 'idx_%'
        AND INDEX_NAME IN (
          'idx_movimiento_fecha_tipo',
          'idx_pedido_venta_estado_fecha', 
          'idx_producto_categoria_activo',
          'idx_auditoria_tabla_fecha',
          'idx_pedido_compra_item_producto',
          'idx_pedido_venta_item_producto'
        )
      `;
      
      checks.push({
        name: 'indices_eliminados',
        remaining: indices.length,
        status: indices.length === 0 ? 'OK' : 'WARNING'
      });

      // Verificar funcionalidad básica
      const productCount = await prisma.producto.count();
      checks.push({
        name: 'funcionalidad_basica',
        productCount,
        status: 'OK'
      });

      return { checks };
    });

    report.summary.totalSteps = report.steps.length;
    report.summary.status = report.summary.failedSteps === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS';

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE ROLLBACK');
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

    console.log('\n⚠️ IMPORTANTE: Después del rollback, considere:');
    console.log('1. Reiniciar la aplicación para limpiar caché');
    console.log('2. Verificar que todas las funcionalidades trabajen correctamente');
    console.log('3. Monitorear el rendimiento de las consultas');

  } catch (error) {
    console.error('\n💥 Error crítico durante el rollback:', error);
    report.summary.status = 'FAILED';
  } finally {
    // Guardar reporte
    const reportPath = './REPORTE-ROLLBACK.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Reporte detallado guardado en: ${reportPath}`);
    
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  console.log('⚠️ ADVERTENCIA: Este script revertirá todas las optimizaciones aplicadas.');
  console.log('¿Está seguro de que desea continuar? (Ctrl+C para cancelar)');
  
  // Esperar 5 segundos antes de continuar
  setTimeout(() => {
    rollbackOptimizations()
      .then(() => {
        console.log('\n🔄 Rollback completado');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 Error en rollback:', error);
        process.exit(1);
      });
  }, 5000);
}

module.exports = { rollbackOptimizations };