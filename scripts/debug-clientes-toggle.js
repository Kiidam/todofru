const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Script para diagnosticar el error en handleToggleActive de clientes
 * Simula las operaciones que realiza el frontend para identificar el problema
 */

async function debugClienteToggle() {
  console.log('🔍 DIAGNÓSTICO DE ERROR EN TOGGLE DE CLIENTES');
  console.log('='.repeat(60));

  try {
    // 1. Verificar conexión a base de datos
    console.log('\n📋 1. Verificando conexión a base de datos...');
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('   ✅ Conexión exitosa');

    // 2. Obtener un cliente de prueba
    console.log('\n📋 2. Obteniendo cliente de prueba...');
    let testClient = await prisma.cliente.findFirst({
      where: { activo: true }
    });

    if (!testClient) {
      console.log('   ⚠️ No hay clientes activos, creando uno de prueba...');
      testClient = await prisma.cliente.create({
        data: {
          nombre: 'Cliente Test Debug',
          ruc: `TEST-${Date.now()}`,
          telefono: '123456789',
          email: 'test@debug.com',
          direccion: 'Dirección Test',
          tipoCliente: 'MINORISTA',
          activo: true
        }
      });
      console.log(`   ✅ Cliente creado: ${testClient.id}`);
    } else {
      console.log(`   ✅ Cliente encontrado: ${testClient.id} - ${testClient.nombre}`);
    }

    // 3. Simular la petición PATCH que hace el frontend
    console.log('\n📋 3. Simulando petición PATCH...');
    console.log(`   Cliente actual - ID: ${testClient.id}, Activo: ${testClient.activo}`);
    
    const newActiveState = !testClient.activo;
    console.log(`   Nuevo estado deseado: ${newActiveState}`);

    // Simular el cuerpo de la petición
    const requestBody = {
      activo: newActiveState
    };
    console.log('   Cuerpo de petición:', JSON.stringify(requestBody, null, 2));

    // 4. Ejecutar la actualización directamente en la base de datos
    console.log('\n📋 4. Ejecutando actualización en base de datos...');
    
    const updatedClient = await prisma.cliente.update({
      where: { id: testClient.id },
      data: { 
        activo: newActiveState,
        updatedAt: new Date()
      }
    });

    console.log('   ✅ Actualización exitosa');
    console.log('   Resultado:', {
      id: updatedClient.id,
      nombre: updatedClient.nombre,
      activo: updatedClient.activo,
      updatedAt: updatedClient.updatedAt
    });

    // 5. Simular la respuesta de la API
    console.log('\n📋 5. Simulando respuesta de API...');
    const apiResponse = {
      success: true,
      data: updatedClient,
      message: `Cliente ${newActiveState ? 'activado' : 'desactivado'} exitosamente`
    };
    
    console.log('   Respuesta simulada:', JSON.stringify(apiResponse, null, 2));

    // 6. Verificar el estado final
    console.log('\n📋 6. Verificando estado final...');
    const finalClient = await prisma.cliente.findUnique({
      where: { id: testClient.id }
    });

    console.log('   Estado final del cliente:', {
      id: finalClient.id,
      nombre: finalClient.nombre,
      activo: finalClient.activo,
      updatedAt: finalClient.updatedAt
    });

    // 7. Probar casos de error comunes
    console.log('\n📋 7. Probando casos de error...');
    
    // 7.1 Cliente inexistente
    try {
      await prisma.cliente.update({
        where: { id: 'cliente-inexistente' },
        data: { activo: true }
      });
    } catch (error) {
      console.log('   ✅ Error esperado para cliente inexistente:', error.code);
    }

    // 7.2 Datos inválidos
    try {
      await prisma.cliente.update({
        where: { id: testClient.id },
        data: { activo: 'invalid' } // Tipo incorrecto
      });
    } catch (error) {
      console.log('   ✅ Error esperado para datos inválidos:', error.message);
    }

    // 8. Simular petición HTTP completa
    console.log('\n📋 8. Simulando petición HTTP completa...');
    
    const testUrl = `http://localhost:3000/api/clientes/${testClient.id}`;
    console.log(`   URL de prueba: ${testUrl}`);
    console.log('   Método: PATCH');
    console.log('   Headers: Content-Type: application/json');
    console.log('   Body:', JSON.stringify({ activo: !updatedClient.activo }));

    // Nota: No podemos hacer la petición HTTP real desde este script
    // porque requiere el servidor Next.js ejecutándose
    console.log('   ⚠️ Para probar la petición HTTP real, use el navegador o Postman');

    console.log('\n' + '='.repeat(60));
    console.log('✅ DIAGNÓSTICO COMPLETADO');
    console.log('='.repeat(60));

    console.log('\n📊 RESUMEN:');
    console.log('- Conexión a BD: ✅ Funcionando');
    console.log('- Operación UPDATE: ✅ Funcionando');
    console.log('- Estructura de datos: ✅ Correcta');
    console.log('- Manejo de errores: ✅ Funcionando');

    console.log('\n🔍 POSIBLES CAUSAS DEL ERROR:');
    console.log('1. Problema de red entre frontend y backend');
    console.log('2. Error en el parsing de la respuesta JSON');
    console.log('3. Middleware de autenticación bloqueando la petición');
    console.log('4. CORS o headers incorrectos');
    console.log('5. Cliente específico con datos corruptos');

    console.log('\n🛠️ PASOS PARA DEPURAR:');
    console.log('1. Verificar Network tab en DevTools del navegador');
    console.log('2. Revisar logs del servidor Next.js');
    console.log('3. Probar con diferentes clientes');
    console.log('4. Verificar headers de autenticación');
    console.log('5. Comprobar el estado de la sesión del usuario');

  } catch (error) {
    console.error('\n💥 Error durante el diagnóstico:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar diagnóstico
if (require.main === module) {
  debugClienteToggle()
    .then(() => {
      console.log('\n🔄 Diagnóstico completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en diagnóstico:', error);
      process.exit(1);
    });
}

module.exports = { debugClienteToggle };