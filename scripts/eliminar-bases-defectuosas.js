const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

async function eliminarBasesDefectuosas() {
  console.log('🗑️  ELIMINACIÓN SEGURA DE BASES DEFECTUOSAS');
  console.log('=' .repeat(60));

  const prisma = new PrismaClient();
  const reporte = {
    timestamp: new Date().toISOString(),
    basesEliminadas: [],
    errores: [],
    verificacionesPreEliminacion: [],
    verificacionesPostEliminacion: [],
    resumen: {
      totalBasesEvaluadas: 0,
      basesEliminadas: 0,
      basesConservadas: 0,
      errores: 0,
      espacioLiberado: 0
    }
  };

  // Bases de datos problemáticas identificadas (solo las que tienen respaldo)
  const basesParaEliminar = ['grade_db', 'sistema_parqueo'];
  const baseCritica = 'todofru'; // Base principal que NUNCA debe eliminarse

  try {
    // 1. Verificaciones de seguridad pre-eliminación
    console.log('\n🔒 VERIFICACIONES DE SEGURIDAD...');
    
    // 1.1. Verificar que la base principal está funcionando
    console.log('   🔍 Verificando base principal...');
    try {
      const [infoSistema] = await prisma.$queryRaw`SELECT DATABASE() as current_db, VERSION() as version`;
      const tablasBase = await prisma.$queryRaw`SHOW TABLES`;
      
      reporte.verificacionesPreEliminacion.push({
        tipo: 'BASE_PRINCIPAL',
        estado: 'OK',
        baseDatos: infoSistema.current_db,
        version: infoSistema.version,
        tablas: tablasBase.length,
        mensaje: 'Base principal operativa'
      });
      
      console.log(`   ✅ Base principal '${infoSistema.current_db}' operativa (${tablasBase.length} tablas)`);
      
      if (infoSistema.current_db !== baseCritica) {
        throw new Error(`Base actual '${infoSistema.current_db}' no es la esperada '${baseCritica}'`);
      }
      
    } catch (error) {
      reporte.verificacionesPreEliminacion.push({
        tipo: 'BASE_PRINCIPAL',
        estado: 'ERROR',
        error: error.message
      });
      throw new Error(`Error crítico: Base principal no operativa - ${error.message}`);
    }

    // 1.2. Verificar que existen respaldos
    console.log('   🔍 Verificando respaldos...');
    const directorioRespaldos = path.join(process.cwd(), 'respaldos-bases-datos');
    try {
      const archivosRespaldo = await fs.readdir(directorioRespaldos);
      const respaldosEncontrados = archivosRespaldo.filter(archivo => archivo.endsWith('.sql'));
      
      reporte.verificacionesPreEliminacion.push({
        tipo: 'RESPALDOS',
        estado: 'OK',
        directorio: directorioRespaldos,
        archivos: respaldosEncontrados.length,
        mensaje: 'Respaldos verificados'
      });
      
      console.log(`   ✅ Respaldos encontrados: ${respaldosEncontrados.length} archivos`);
      respaldosEncontrados.forEach(archivo => console.log(`      • ${archivo}`));
      
    } catch (error) {
      reporte.verificacionesPreEliminacion.push({
        tipo: 'RESPALDOS',
        estado: 'ERROR',
        error: error.message
      });
      throw new Error(`Error crítico: No se pueden verificar respaldos - ${error.message}`);
    }

    // 2. Listar todas las bases antes de eliminación
    console.log('\n📊 ESTADO ACTUAL DE BASES DE DATOS...');
    const basesAntes = await prisma.$queryRaw`SHOW DATABASES`;
    const nombreBasesAntes = basesAntes.map(db => db.Database);
    
    console.log(`   Total de bases de datos: ${nombreBasesAntes.length}`);
    nombreBasesAntes.forEach(db => {
      const estado = basesParaEliminar.includes(db) ? '🗑️  [PARA ELIMINAR]' : 
                    db === baseCritica ? '🔒 [CRÍTICA]' : '📁 [CONSERVAR]';
      console.log(`   ${estado} ${db}`);
    });

    reporte.resumen.totalBasesEvaluadas = nombreBasesAntes.length;

    // 3. Proceso de eliminación
    console.log('\n🗑️  INICIANDO ELIMINACIÓN...');
    
    for (const nombreDB of basesParaEliminar) {
      console.log(`\n🔍 Procesando: ${nombreDB}`);
      
      try {
        // 3.1. Verificar que la base existe
        if (!nombreBasesAntes.includes(nombreDB)) {
          console.log(`   ⚠️  Base '${nombreDB}' no existe, omitiendo...`);
          reporte.basesEliminadas.push({
            nombre: nombreDB,
            estado: 'NO_EXISTE',
            mensaje: 'Base de datos no encontrada'
          });
          continue;
        }

        // 3.2. Obtener información final antes de eliminar
        console.log(`   📊 Obteniendo información final...`);
        const infoFinal = await prisma.$queryRawUnsafe(`
          SELECT 
            SUM(DATA_LENGTH + INDEX_LENGTH) as tamaño_total,
            COUNT(*) as total_tablas
          FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = ?
        `, nombreDB);

        const tamañoBytes = Number(infoFinal[0]?.tamaño_total || 0);
        const totalTablas = Number(infoFinal[0]?.total_tablas || 0);

        console.log(`   📊 Tamaño: ${(tamañoBytes / 1024).toFixed(2)} KB`);
        console.log(`   📊 Tablas: ${totalTablas}`);

        // 3.3. Verificación final de seguridad
        if (nombreDB === baseCritica) {
          throw new Error(`SEGURIDAD: Intento de eliminar base crítica '${baseCritica}' - OPERACIÓN ABORTADA`);
        }

        // 3.4. Eliminar la base de datos
        console.log(`   🗑️  Eliminando base de datos...`);
        await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${nombreDB}\``);
        
        // 3.5. Verificar eliminación
        const basesPostEliminacion = await prisma.$queryRaw`SHOW DATABASES`;
        const nombreBasesPost = basesPostEliminacion.map(db => db.Database);
        
        if (nombreBasesPost.includes(nombreDB)) {
          throw new Error(`La base '${nombreDB}' aún existe después de la eliminación`);
        }

        console.log(`   ✅ Base '${nombreDB}' eliminada exitosamente`);
        
        reporte.basesEliminadas.push({
          nombre: nombreDB,
          estado: 'ELIMINADA',
          tamañoBytes: tamañoBytes,
          tamañoKB: (tamañoBytes / 1024).toFixed(2),
          totalTablas: totalTablas,
          timestamp: new Date().toISOString(),
          mensaje: 'Eliminación exitosa'
        });

        reporte.resumen.basesEliminadas++;
        reporte.resumen.espacioLiberado += tamañoBytes;

      } catch (error) {
        console.log(`   ❌ Error eliminando '${nombreDB}': ${error.message}`);
        
        reporte.errores.push({
          baseDatos: nombreDB,
          error: error.message,
          timestamp: new Date().toISOString(),
          tipo: 'ELIMINACION'
        });
        
        reporte.basesEliminadas.push({
          nombre: nombreDB,
          estado: 'ERROR',
          error: error.message,
          mensaje: 'Error durante eliminación'
        });

        reporte.resumen.errores++;
      }
    }

    // 4. Verificaciones post-eliminación
    console.log('\n🔍 VERIFICACIONES POST-ELIMINACIÓN...');
    
    // 4.1. Verificar estado final de bases
    const basesFinal = await prisma.$queryRaw`SHOW DATABASES`;
    const nombreBasesFinal = basesFinal.map(db => db.Database);
    
    console.log(`   📊 Bases de datos restantes: ${nombreBasesFinal.length}`);
    nombreBasesFinal.forEach(db => {
      const estado = db === baseCritica ? '🔒 [CRÍTICA]' : '📁 [CONSERVADA]';
      console.log(`   ${estado} ${db}`);
    });

    reporte.verificacionesPostEliminacion.push({
      tipo: 'ESTADO_FINAL',
      estado: 'OK',
      basesRestantes: nombreBasesFinal.length,
      bases: nombreBasesFinal,
      mensaje: 'Verificación de estado final completada'
    });

    // 4.2. Verificar que la base principal sigue operativa
    try {
      const testFinal = await prisma.$queryRaw`SELECT COUNT(*) as test FROM usuarios`;
      console.log(`   ✅ Base principal operativa (${Number(testFinal[0].test)} usuarios)`);
      
      reporte.verificacionesPostEliminacion.push({
        tipo: 'BASE_PRINCIPAL_POST',
        estado: 'OK',
        mensaje: 'Base principal operativa después de eliminaciones'
      });
      
    } catch (error) {
      reporte.verificacionesPostEliminacion.push({
        tipo: 'BASE_PRINCIPAL_POST',
        estado: 'ERROR',
        error: error.message
      });
      throw new Error(`Error crítico: Base principal no operativa después de eliminaciones - ${error.message}`);
    }

    // 5. Calcular estadísticas finales
    reporte.resumen.basesConservadas = nombreBasesFinal.length;
    const espacioLiberadoKB = (reporte.resumen.espacioLiberado / 1024).toFixed(2);
    const espacioLiberadoMB = (reporte.resumen.espacioLiberado / 1024 / 1024).toFixed(2);

    // 6. Resumen final
    console.log('\n📊 RESUMEN DE ELIMINACIÓN:');
    console.log(`   Bases evaluadas: ${reporte.resumen.totalBasesEvaluadas}`);
    console.log(`   Bases eliminadas: ${reporte.resumen.basesEliminadas}`);
    console.log(`   Bases conservadas: ${reporte.resumen.basesConservadas}`);
    console.log(`   Errores: ${reporte.resumen.errores}`);
    console.log(`   Espacio liberado: ${espacioLiberadoKB} KB (${espacioLiberadoMB} MB)`);

    if (reporte.basesEliminadas.length > 0) {
      console.log('\n🗑️  BASES ELIMINADAS:');
      reporte.basesEliminadas.forEach((base, index) => {
        if (base.estado === 'ELIMINADA') {
          console.log(`   ${index + 1}. ${base.nombre} - ${base.tamañoKB} KB (${base.totalTablas} tablas)`);
        } else {
          console.log(`   ${index + 1}. ${base.nombre} - ${base.estado}: ${base.mensaje}`);
        }
      });
    }

    if (reporte.errores.length > 0) {
      console.log('\n❌ ERRORES:');
      reporte.errores.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.baseDatos}: ${error.error}`);
      });
    }

    // 7. Guardar reporte
    const rutaReporte = path.join(process.cwd(), 'REPORTE-ELIMINACION-BASES.json');
    const reporteJSON = JSON.stringify(reporte, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value, 2);
    await fs.writeFile(rutaReporte, reporteJSON, 'utf8');
    console.log(`\n💾 Reporte guardado en: ${rutaReporte}`);

    return reporte;

  } catch (error) {
    console.error('❌ Error durante la eliminación:', error);
    
    // Guardar reporte de error
    reporte.errores.push({
      tipo: 'CRITICO',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    const rutaReporte = path.join(process.cwd(), 'REPORTE-ELIMINACION-BASES-ERROR.json');
    const reporteJSON = JSON.stringify(reporte, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value, 2);
    await fs.writeFile(rutaReporte, reporteJSON, 'utf8');
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar eliminación
if (require.main === module) {
  eliminarBasesDefectuosas()
    .then((reporte) => {
      console.log('\n✅ Eliminación de bases defectuosas completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error durante la eliminación:', error);
      process.exit(1);
    });
}

module.exports = { eliminarBasesDefectuosas };