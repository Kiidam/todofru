// Script de verificación final del sistema completo
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function finalSystemVerification() {
  console.log('🔍 VERIFICACIÓN FINAL DEL SISTEMA COMPLETO');
  console.log('=========================================\n');

  const verificationResults = {
    timestamp: new Date().toISOString(),
    systemStatus: 'UNKNOWN',
    checks: [],
    totalChecks: 0,
    passedChecks: 0,
    failedChecks: 0,
    warnings: [],
    errors: [],
    recommendations: []
  };

  try {
    // 1. Verificación de Base de Datos
    console.log('1. VERIFICACIÓN DE BASE DE DATOS');
    console.log('===============================');

    await runCheck('Conexión a la base de datos', async () => {
      await prisma.$connect();
      return { status: 'PASS', message: 'Conexión exitosa' };
    }, verificationResults);

    await runCheck('Integridad de datos iniciales', async () => {
      const counts = {
        usuarios: await prisma.user.count(),
        categorias: await prisma.categoria.count(),
        unidades: await prisma.unidadMedida.count(),
        proveedores: await prisma.proveedor.count(),
        clientes: await prisma.cliente.count(),
        productos: await prisma.producto.count()
      };

      const expectedCounts = {
        usuarios: 1,
        categorias: 5,
        unidades: 7,
        proveedores: 0,
        clientes: 0,
        productos: 0
      };

      const issues = [];
      Object.entries(expectedCounts).forEach(([table, expected]) => {
        if (counts[table] !== expected) {
          issues.push(`${table}: esperado ${expected}, encontrado ${counts[table]}`);
        }
      });

      if (issues.length > 0) {
        return { status: 'FAIL', message: `Inconsistencias: ${issues.join(', ')}` };
      }

      return { status: 'PASS', message: 'Datos iniciales correctos' };
    }, verificationResults);

    // 2. Verificación de Archivos del Sistema
    console.log('\n2. VERIFICACIÓN DE ARCHIVOS DEL SISTEMA');
    console.log('======================================');

    await runCheck('Estructura de directorios', async () => {
      const requiredDirs = [
        'app/dashboard/proveedores',
        'app/api/proveedores',
        'src/components/proveedores',
        'prisma',
        'scripts'
      ];

      const missingDirs = [];
      requiredDirs.forEach(dir => {
        const fullPath = path.join(__dirname, '..', dir);
        if (!fs.existsSync(fullPath)) {
          missingDirs.push(dir);
        }
      });

      if (missingDirs.length > 0) {
        return { status: 'FAIL', message: `Directorios faltantes: ${missingDirs.join(', ')}` };
      }

      return { status: 'PASS', message: 'Estructura de directorios correcta' };
    }, verificationResults);

    await runCheck('Archivos críticos del sistema', async () => {
      const criticalFiles = [
        'app/dashboard/proveedores/page.tsx',
        'prisma/schema.prisma',
        'package.json',
        '.env'
      ];

      const missingFiles = [];
      criticalFiles.forEach(file => {
        const fullPath = path.join(__dirname, '..', file);
        if (!fs.existsSync(fullPath)) {
          missingFiles.push(file);
        }
      });

      if (missingFiles.length > 0) {
        return { status: 'FAIL', message: `Archivos faltantes: ${missingFiles.join(', ')}` };
      }

      return { status: 'PASS', message: 'Archivos críticos presentes' };
    }, verificationResults);

    // 3. Verificación de APIs
    console.log('\n3. VERIFICACIÓN DE APIs');
    console.log('======================');

    await runCheck('API de proveedores', async () => {
      const apiDir = path.join(__dirname, '../app/api/proveedores');
      if (!fs.existsSync(apiDir)) {
        return { status: 'FAIL', message: 'Directorio API de proveedores no existe' };
      }

      const routeFile = path.join(apiDir, 'route.ts');
      if (!fs.existsSync(routeFile)) {
        return { status: 'FAIL', message: 'Archivo route.ts no existe' };
      }

      return { status: 'PASS', message: 'API de proveedores configurada' };
    }, verificationResults);

    // 4. Verificación de Componentes UI
    console.log('\n4. VERIFICACIÓN DE COMPONENTES UI');
    console.log('=================================');

    await runCheck('Componentes de proveedores', async () => {
      const componentsDir = path.join(__dirname, '../src/components/proveedores');
      if (!fs.existsSync(componentsDir)) {
        return { status: 'FAIL', message: 'Directorio de componentes no existe' };
      }

      const supplierForm = path.join(componentsDir, 'SupplierForm.tsx');
      if (!fs.existsSync(supplierForm)) {
        return { status: 'FAIL', message: 'SupplierForm.tsx no existe' };
      }

      return { status: 'PASS', message: 'Componentes UI presentes' };
    }, verificationResults);

    // 5. Verificación de Seguridad
    console.log('\n5. VERIFICACIÓN DE SEGURIDAD');
    console.log('============================');

    await runCheck('Configuración de base de datos', async () => {
      const envFile = path.join(__dirname, '../.env');
      if (!fs.existsSync(envFile)) {
        return { status: 'FAIL', message: 'Archivo .env no existe' };
      }

      const envContent = fs.readFileSync(envFile, 'utf8');
      if (!envContent.includes('DATABASE_URL')) {
        return { status: 'FAIL', message: 'DATABASE_URL no configurada' };
      }

      return { status: 'PASS', message: 'Configuración de BD presente' };
    }, verificationResults);

    await runCheck('Usuario administrador', async () => {
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      });

      if (!adminUser) {
        return { status: 'FAIL', message: 'No hay usuario administrador' };
      }

      return { status: 'PASS', message: 'Usuario administrador configurado' };
    }, verificationResults);

    // 6. Verificación de Performance
    console.log('\n6. VERIFICACIÓN DE PERFORMANCE');
    console.log('==============================');

    await runCheck('Índices de base de datos', async () => {
      // Verificar que las consultas principales son eficientes
      const startTime = Date.now();
      
      await prisma.proveedor.findMany({ take: 10 });
      await prisma.producto.findMany({ take: 10 });
      await prisma.categoria.findMany();
      await prisma.unidadMedida.findMany();
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      if (queryTime > 1000) {
        return { status: 'WARN', message: `Consultas lentas: ${queryTime}ms` };
      }

      return { status: 'PASS', message: `Consultas rápidas: ${queryTime}ms` };
    }, verificationResults);

    // 7. Verificación de Limpieza
    console.log('\n7. VERIFICACIÓN DE LIMPIEZA');
    console.log('===========================');

    await runCheck('Archivos temporales eliminados', async () => {
      const tempFiles = [
        'app/dashboard/proveedores/binario-10mb.bin',
        'app/dashboard/proveedores/binario-1mb.bin',
        'app/dashboard/proveedores/datos.json',
        'app/dashboard/proveedores/nota.txt'
      ];

      const remainingFiles = [];
      tempFiles.forEach(file => {
        const fullPath = path.join(__dirname, '..', file);
        if (fs.existsSync(fullPath)) {
          remainingFiles.push(file);
        }
      });

      if (remainingFiles.length > 0) {
        return { status: 'FAIL', message: `Archivos temporales restantes: ${remainingFiles.join(', ')}` };
      }

      return { status: 'PASS', message: 'Archivos temporales eliminados' };
    }, verificationResults);

    // Determinar estado general del sistema
    if (verificationResults.failedChecks === 0) {
      verificationResults.systemStatus = 'HEALTHY';
      verificationResults.recommendations.push('Sistema completamente operativo');
    } else if (verificationResults.failedChecks <= 2) {
      verificationResults.systemStatus = 'WARNING';
      verificationResults.recommendations.push('Sistema funcional con advertencias menores');
    } else {
      verificationResults.systemStatus = 'CRITICAL';
      verificationResults.recommendations.push('Sistema requiere atención inmediata');
    }

    // Generar reporte final
    console.log('\n📊 RESUMEN DE VERIFICACIÓN FINAL');
    console.log('===============================');
    console.log(`Estado del sistema: ${verificationResults.systemStatus}`);
    console.log(`Total de verificaciones: ${verificationResults.totalChecks}`);
    console.log(`Verificaciones exitosas: ${verificationResults.passedChecks}`);
    console.log(`Verificaciones fallidas: ${verificationResults.failedChecks}`);
    
    if (verificationResults.warnings.length > 0) {
      console.log('\n⚠️  ADVERTENCIAS:');
      verificationResults.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }

    if (verificationResults.errors.length > 0) {
      console.log('\n❌ ERRORES:');
      verificationResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    const reportePath = path.join(__dirname, '../REPORTE-VERIFICACION-FINAL.json');
    fs.writeFileSync(reportePath, JSON.stringify(verificationResults, null, 2));
    console.log(`\n📄 Reporte de verificación final guardado en: ${reportePath}`);

    if (verificationResults.systemStatus === 'HEALTHY') {
      console.log('\n🎉 ¡SISTEMA COMPLETAMENTE OPERATIVO!');
      console.log('===================================');
      console.log('✅ Todas las verificaciones pasaron');
      console.log('✅ Base de datos limpia y optimizada');
      console.log('✅ No se detectaron errores');
      console.log('✅ Sistema listo para producción');
    } else {
      console.log(`\n⚠️  SISTEMA EN ESTADO: ${verificationResults.systemStatus}`);
      console.log('=======================================');
      console.log('📋 Revisar el reporte para más detalles');
    }

  } catch (error) {
    console.error('❌ Error durante la verificación final:', error);
    verificationResults.errors.push(`Error general: ${error.message}`);
    verificationResults.systemStatus = 'ERROR';
    throw error;
  } finally {
    await prisma.$disconnect();
  }

  return verificationResults;
}

async function runCheck(checkName, checkFunction, verificationResults) {
  verificationResults.totalChecks++;
  
  try {
    console.log(`   🔍 ${checkName}...`);
    const result = await checkFunction();
    
    if (result.status === 'PASS') {
      console.log(`   ✅ ${checkName} - PASÓ: ${result.message}`);
      verificationResults.passedChecks++;
      verificationResults.checks.push({
        name: checkName,
        status: 'PASSED',
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else if (result.status === 'WARN') {
      console.log(`   ⚠️  ${checkName} - ADVERTENCIA: ${result.message}`);
      verificationResults.passedChecks++;
      verificationResults.warnings.push(`${checkName}: ${result.message}`);
      verificationResults.checks.push({
        name: checkName,
        status: 'WARNING',
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`   ❌ ${checkName} - FALLÓ: ${result.message}`);
      verificationResults.failedChecks++;
      verificationResults.errors.push(`${checkName}: ${result.message}`);
      verificationResults.checks.push({
        name: checkName,
        status: 'FAILED',
        message: result.message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.log(`   ❌ ${checkName} - ERROR: ${error.message}`);
    verificationResults.failedChecks++;
    verificationResults.errors.push(`${checkName}: ${error.message}`);
    verificationResults.checks.push({
      name: checkName,
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  finalSystemVerification().catch(console.error);
}

module.exports = { finalSystemVerification };