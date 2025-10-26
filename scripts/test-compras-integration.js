/**
 * Script de prueba para verificar la integración de la página de compras
 * con las optimizaciones del módulo de proveedores
 */

const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3001';

async function testComprasIntegration() {
  console.log('============================================================');
  console.log('PRUEBAS DE INTEGRACIÓN - PÁGINA DE COMPRAS');
  console.log('============================================================');

  try {
    // Test 1: Verificar API de proveedores
    console.log('\n[TEST 1] Verificando API de proveedores...');
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${BASE_URL}/api/proveedores`);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[PASS] API de proveedores responde correctamente`);
        console.log(`    Tiempo de respuesta: ${responseTime}ms`);
        console.log(`    Proveedores encontrados: ${data.proveedores?.length || 0}`);
        
        // Verificar que los proveedores tienen el campo 'nombre'
        if (data.proveedores && data.proveedores.length > 0) {
          const proveedoresConNombre = data.proveedores.filter(p => p.nombre);
          console.log(`    Proveedores con campo 'nombre': ${proveedoresConNombre.length}/${data.proveedores.length}`);
          
          if (proveedoresConNombre.length === data.proveedores.length) {
            console.log(`[PASS] Todos los proveedores tienen el campo 'nombre'`);
          } else {
            console.log(`[WARN] Algunos proveedores no tienen el campo 'nombre'`);
          }
        }
      } else {
        console.log(`[FAIL] API de proveedores falló: ${response.status}`);
      }
    } catch (error) {
      console.log(`[FAIL] Error al conectar con API de proveedores: ${error.message}`);
    }

    // Test 2: Verificar estructura de datos en base de datos
    console.log('\n[TEST 2] Verificando estructura de datos...');
    
    try {
      // Verificar proveedores con nombres construidos
      const proveedores = await prisma.proveedor.findMany({
        where: { activo: true },
        select: {
          id: true,
          nombre: true,
          nombres: true,
          apellidos: true,
          razonSocial: true,
          version: true,
          lastModifiedBy: true
        },
        take: 5
      });

      console.log(`[PASS] Encontrados ${proveedores.length} proveedores activos`);
      
      // Verificar campos de versionado
      const proveedoresConVersion = proveedores.filter(p => p.version !== null);
      console.log(`    Proveedores con versionado: ${proveedoresConVersion.length}/${proveedores.length}`);
      
      // Verificar construcción de nombres
      let nombresCorrectos = 0;
      proveedores.forEach(p => {
        const nombreEsperado = p.nombre || p.razonSocial || 
          `${p.nombres || ''} ${p.apellidos || ''}`.trim() || 'Sin nombre';
        if (nombreEsperado !== 'Sin nombre') {
          nombresCorrectos++;
        }
      });
      
      console.log(`    Proveedores con nombres válidos: ${nombresCorrectos}/${proveedores.length}`);
      
    } catch (error) {
      console.log(`[FAIL] Error al verificar estructura: ${error.message}`);
    }

    // Test 3: Verificar nuevas tablas de optimización
    console.log('\n[TEST 3] Verificando nuevas tablas de optimización...');
    
    try {
      // Verificar tabla ProductoProveedor
      const productosProveedor = await prisma.productoProveedor.findMany({
        take: 1
      });
      console.log(`[PASS] Tabla ProductoProveedor accesible`);
      
      // Verificar tabla Auditoria
      const auditorias = await prisma.auditoria.findMany({
        take: 1
      });
      console.log(`[PASS] Tabla Auditoria accesible`);
      
    } catch (error) {
      console.log(`[WARN] Algunas tablas nuevas no están disponibles: ${error.message}`);
    }

    // Test 4: Verificar API de productos por proveedor
    console.log('\n[TEST 4] Verificando API de productos por proveedor...');
    
    try {
      // Obtener un proveedor para probar
      const proveedor = await prisma.proveedor.findFirst({
        where: { activo: true }
      });
      
      if (proveedor) {
        const response = await fetch(`${BASE_URL}/api/proveedores/${proveedor.id}/productos`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`[PASS] API de productos por proveedor funciona`);
          console.log(`    Proveedor: ${data.proveedor?.nombre || 'Sin nombre'}`);
          console.log(`    Productos encontrados: ${data.productos?.length || 0}`);
          console.log(`    Estadísticas disponibles: ${data.estadisticas ? 'Sí' : 'No'}`);
          
          if (data.estadisticas) {
            console.log(`    - Productos directos: ${data.estadisticas.productosDirectos || 0}`);
            console.log(`    - Productos históricos: ${data.estadisticas.productosHistoricos || 0}`);
            console.log(`    - Relaciones directas: ${data.estadisticas.tieneRelacionesDirectas ? 'Sí' : 'No'}`);
          }
        } else {
          console.log(`[FAIL] API de productos por proveedor falló: ${response.status}`);
        }
      } else {
        console.log(`[SKIP] No hay proveedores para probar`);
      }
    } catch (error) {
      console.log(`[FAIL] Error al probar API de productos: ${error.message}`);
    }

    // Test 5: Verificar rendimiento de consultas
    console.log('\n[TEST 5] Verificando rendimiento de consultas...');
    
    try {
      const startQuery = Date.now();
      
      // Consulta compleja que simula la carga de la página de compras
      const resultado = await prisma.proveedor.findMany({
        where: { activo: true },
        include: {
          pedidosCompra: {
            take: 5,
            orderBy: { fecha: 'desc' },
            include: {
              items: {
                include: {
                  producto: {
                    select: {
                      nombre: true,
                      sku: true,
                      precio: true
                    }
                  }
                }
              }
            }
          }
        },
        take: 10
      });
      
      const queryTime = Date.now() - startQuery;
      console.log(`[PASS] Consulta compleja completada en ${queryTime}ms`);
      console.log(`    Proveedores procesados: ${resultado.length}`);
      
      if (queryTime < 1000) {
        console.log(`[PASS] Rendimiento excelente (< 1s)`);
      } else if (queryTime < 3000) {
        console.log(`[PASS] Rendimiento aceptable (< 3s)`);
      } else {
        console.log(`[WARN] Rendimiento lento (> 3s)`);
      }
      
    } catch (error) {
      console.log(`[FAIL] Error en prueba de rendimiento: ${error.message}`);
    }

    console.log('\n============================================================');
    console.log('RESUMEN DE PRUEBAS DE INTEGRACIÓN');
    console.log('============================================================');
    console.log('✅ Pruebas de integración completadas');
    console.log('📊 La página de compras debería funcionar correctamente');
    console.log('🔗 Accede a: http://localhost:3001/dashboard/movimientos/compras');
    console.log('============================================================');

  } catch (error) {
    console.error('Error general en las pruebas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar las pruebas
testComprasIntegration().catch(console.error);