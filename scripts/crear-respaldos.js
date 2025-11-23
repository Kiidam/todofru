const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function crearRespaldos() {
  console.log('💾 CREACIÓN DE RESPALDOS DE SEGURIDAD');
  console.log('=' .repeat(60));

  const prisma = new PrismaClient();
  const reporte = {
    timestamp: new Date().toISOString(),
    respaldos: [],
    errores: [],
    resumen: {
      totalRespaldos: 0,
      respaldosExitosos: 0,
      respaldosFallidos: 0,
      tamañoTotal: 0
    }
  };

  // Bases de datos problemáticas identificadas
  const basesProblematicas = ['grade_db', 'sistema_parqueo'];
  const directorioRespaldos = path.join(process.cwd(), 'respaldos-bases-datos');

  try {
    // 1. Crear directorio de respaldos
    console.log('\n📁 Creando directorio de respaldos...');
    try {
      await fs.mkdir(directorioRespaldos, { recursive: true });
      console.log(`   ✅ Directorio creado: ${directorioRespaldos}`);
    } catch (error) {
      console.log(`   ⚠️  Directorio ya existe: ${directorioRespaldos}`);
    }

    // 2. Obtener información de conexión
    console.log('\n🔍 Obteniendo información de conexión...');
    const [infoConexion] = await prisma.$queryRaw`
      SELECT 
        USER() as usuario_actual,
        DATABASE() as base_actual,
        @@hostname as servidor,
        @@port as puerto
    `;
    
    console.log(`   📊 Servidor: ${infoConexion.servidor}:${infoConexion.puerto}`);
    console.log(`   👤 Usuario: ${infoConexion.usuario_actual}`);
    console.log(`   🗄️  Base actual: ${infoConexion.base_actual}`);

    // 3. Crear respaldos de cada base problemática
    for (const nombreDB of basesProblematicas) {
      console.log(`\n💾 Creando respaldo de: ${nombreDB}`);
      
      const timestampRespaldo = new Date().toISOString().replace(/[:.]/g, '-');
      const nombreArchivo = `${nombreDB}_backup_${timestampRespaldo}.sql`;
      const rutaRespaldo = path.join(directorioRespaldos, nombreArchivo);
      
      const respaldoInfo = {
        baseDatos: nombreDB,
        archivo: nombreArchivo,
        ruta: rutaRespaldo,
        timestamp: timestampRespaldo,
        estado: 'pendiente',
        tamaño: 0,
        estructura: null,
        datos: null
      };

      try {
        // 3.1. Obtener información detallada de la base
        console.log(`   🔍 Analizando estructura de ${nombreDB}...`);
        
        const tablasInfo = await prisma.$queryRawUnsafe(`
          SELECT 
            TABLE_NAME,
            TABLE_ROWS,
            DATA_LENGTH,
            INDEX_LENGTH,
            (DATA_LENGTH + INDEX_LENGTH) as TOTAL_SIZE,
            CREATE_TIME,
            UPDATE_TIME,
            TABLE_COMMENT
          FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = ?
          ORDER BY TABLE_NAME
        `, nombreDB);

        respaldoInfo.estructura = {
          totalTablas: tablasInfo.length,
          tablas: tablasInfo.map(t => ({
            nombre: t.TABLE_NAME,
            filas: Number(t.TABLE_ROWS || 0),
            tamaño: Number(t.TOTAL_SIZE || 0),
            comentario: t.TABLE_COMMENT
          })),
          tamañoTotal: tablasInfo.reduce((sum, t) => sum + Number(t.TOTAL_SIZE || 0), 0)
        };

        console.log(`   📊 Tablas: ${respaldoInfo.estructura.totalTablas}`);
        console.log(`   📊 Tamaño: ${(respaldoInfo.estructura.tamañoTotal / 1024).toFixed(2)} KB`);

        // 3.2. Crear respaldo usando mysqldump (estructura y datos)
        console.log(`   💾 Generando respaldo SQL...`);
        
        // Crear respaldo completo con estructura y datos
        const contenidoRespaldo = await crearRespaldoSQL(prisma, nombreDB, respaldoInfo.estructura);
        
        // Escribir archivo de respaldo
        await fs.writeFile(rutaRespaldo, contenidoRespaldo, 'utf8');
        
        // Verificar tamaño del archivo
        const stats = await fs.stat(rutaRespaldo);
        respaldoInfo.tamaño = stats.size;
        respaldoInfo.estado = 'completado';
        
        console.log(`   ✅ Respaldo creado: ${nombreArchivo}`);
        console.log(`   📊 Tamaño del archivo: ${(respaldoInfo.tamaño / 1024).toFixed(2)} KB`);
        
        reporte.resumen.respaldosExitosos++;
        reporte.resumen.tamañoTotal += respaldoInfo.tamaño;

      } catch (error) {
        console.log(`   ❌ Error creando respaldo de ${nombreDB}: ${error.message}`);
        respaldoInfo.estado = 'error';
        respaldoInfo.error = error.message;
        
        reporte.errores.push({
          baseDatos: nombreDB,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        reporte.resumen.respaldosFallidos++;
      }

      reporte.respaldos.push(respaldoInfo);
      reporte.resumen.totalRespaldos++;
    }

    // 4. Crear archivo de información adicional
    console.log('\n📄 Creando archivo de información...');
    const archivoInfo = {
      timestamp: new Date().toISOString(),
      proposito: 'Respaldos de bases de datos problemáticas antes de eliminación',
      basesRespaldadas: basesProblematicas,
      razonEliminacion: 'Bases de datos con estructura pero sin datos útiles',
      sistemaOriginal: {
        servidor: infoConexion.servidor,
        puerto: infoConexion.puerto,
        usuario: infoConexion.usuario_actual,
        basePrincipal: infoConexion.base_actual
      },
      instruccionesRestauracion: [
        '1. Para restaurar una base de datos:',
        '   mysql -u [usuario] -p -e "CREATE DATABASE [nombre_base];"',
        '   mysql -u [usuario] -p [nombre_base] < [archivo_respaldo].sql',
        '',
        '2. Verificar restauración:',
        '   mysql -u [usuario] -p -e "USE [nombre_base]; SHOW TABLES;"'
      ]
    };

    const rutaInfo = path.join(directorioRespaldos, 'INFORMACION_RESPALDOS.json');
    await fs.writeFile(rutaInfo, JSON.stringify(archivoInfo, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value, 2), 'utf8');
    console.log(`   ✅ Información guardada: INFORMACION_RESPALDOS.json`);

    // 5. Resumen final
    console.log('\n📊 RESUMEN DE RESPALDOS:');
    console.log(`   Total de respaldos: ${reporte.resumen.totalRespaldos}`);
    console.log(`   Respaldos exitosos: ${reporte.resumen.respaldosExitosos}`);
    console.log(`   Respaldos fallidos: ${reporte.resumen.respaldosFallidos}`);
    console.log(`   Tamaño total: ${(reporte.resumen.tamañoTotal / 1024).toFixed(2)} KB`);
    console.log(`   Directorio: ${directorioRespaldos}`);

    if (reporte.errores.length > 0) {
      console.log('\n❌ ERRORES:');
      reporte.errores.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.baseDatos}: ${error.error}`);
      });
    }

    // 6. Guardar reporte
    const rutaReporte = path.join(process.cwd(), 'REPORTE-RESPALDOS.json');
    const reporteJSON = JSON.stringify(reporte, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value, 2);
    await fs.writeFile(rutaReporte, reporteJSON, 'utf8');
    console.log(`\n💾 Reporte guardado en: ${rutaReporte}`);

    return reporte;

  } catch (error) {
    console.error('❌ Error durante la creación de respaldos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function crearRespaldoSQL(prisma, nombreDB, estructura) {
  let contenidoSQL = '';
  
  // Encabezado del respaldo
  contenidoSQL += `-- Respaldo de base de datos: ${nombreDB}\n`;
  contenidoSQL += `-- Generado el: ${new Date().toISOString()}\n`;
  contenidoSQL += `-- Sistema: TodoFru - Limpieza de bases problemáticas\n\n`;
  
  contenidoSQL += `-- Crear base de datos\n`;
  contenidoSQL += `CREATE DATABASE IF NOT EXISTS \`${nombreDB}\`;\n`;
  contenidoSQL += `USE \`${nombreDB}\`;\n\n`;

  try {
    // Obtener y respaldar estructura de cada tabla
    for (const tabla of estructura.tablas) {
      console.log(`     • Respaldando tabla: ${tabla.nombre}`);
      
      // Obtener CREATE TABLE
      const [createTable] = await prisma.$queryRawUnsafe(`SHOW CREATE TABLE \`${nombreDB}\`.\`${tabla.nombre}\``);
      contenidoSQL += `-- Estructura de tabla: ${tabla.nombre}\n`;
      contenidoSQL += `DROP TABLE IF EXISTS \`${tabla.nombre}\`;\n`;
      contenidoSQL += `${createTable['Create Table']};\n\n`;
      
      // Obtener datos si existen
      if (tabla.filas > 0) {
        const datos = await prisma.$queryRawUnsafe(`SELECT * FROM \`${nombreDB}\`.\`${tabla.nombre}\``);
        if (datos.length > 0) {
          contenidoSQL += `-- Datos de tabla: ${tabla.nombre}\n`;
          contenidoSQL += `INSERT INTO \`${tabla.nombre}\` VALUES\n`;
          
          const valoresSQL = datos.map(fila => {
            const valores = Object.values(fila).map(valor => {
              if (valor === null) return 'NULL';
              if (typeof valor === 'string') return `'${valor.replace(/'/g, "\\'")}'`;
              if (valor instanceof Date) return `'${valor.toISOString().slice(0, 19).replace('T', ' ')}'`;
              return valor;
            });
            return `(${valores.join(', ')})`;
          });
          
          contenidoSQL += valoresSQL.join(',\n') + ';\n\n';
        }
      }
    }
    
    contenidoSQL += `-- Fin del respaldo de ${nombreDB}\n`;
    
  } catch (error) {
    contenidoSQL += `-- ERROR durante el respaldo: ${error.message}\n`;
    throw error;
  }
  
  return contenidoSQL;
}

// Ejecutar creación de respaldos
if (require.main === module) {
  crearRespaldos()
    .then((reporte) => {
      console.log('\n✅ Creación de respaldos completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error durante la creación de respaldos:', error);
      process.exit(1);
    });
}

module.exports = { crearRespaldos };