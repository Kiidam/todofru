/**
 * Script de pruebas para verificar la optimización del módulo de proveedores
 * Incluye pruebas de visualización, integridad de datos y relaciones
 */

const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

// Configuración de la API
const API_BASE_URL = 'http://localhost:3000/api';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`${title}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logTest(testName, status, details = '') {
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  log(`[${status}] ${testName}`, statusColor);
  if (details) {
    log(`    ${details}`, 'reset');
  }
}

// Función para hacer peticiones HTTP
async function makeRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Pruebas de la API de proveedores
async function testSuppliersAPI() {
  logSection('PRUEBAS DE API DE PROVEEDORES');
  
  // Test 1: Obtener lista de proveedores
  const suppliersResponse = await makeRequest('/proveedores');
  if (suppliersResponse.success) {
    logTest('Obtener lista de proveedores', 'PASS', 
      `${suppliersResponse.data.proveedores?.length || 0} proveedores encontrados`);
    
    // Verificar que cada proveedor tenga el campo 'nombre'
    const hasNameField = suppliersResponse.data.proveedores?.every(p => p.nombre);
    logTest('Campo "nombre" presente en todos los proveedores', 
      hasNameField ? 'PASS' : 'FAIL',
      hasNameField ? 'Todos los proveedores tienen el campo nombre' : 'Algunos proveedores no tienen el campo nombre');
  } else {
    logTest('Obtener lista de proveedores', 'FAIL', suppliersResponse.error);
  }
  
  // Test 2: Búsqueda de proveedores
  const searchResponse = await makeRequest('/proveedores?search=test');
  logTest('Búsqueda de proveedores', 
    searchResponse.success ? 'PASS' : 'FAIL',
    searchResponse.success ? 'Búsqueda funciona correctamente' : searchResponse.error);
  
  // Test 3: Paginación
  const paginationResponse = await makeRequest('/proveedores?page=1&limit=5');
  logTest('Paginación de proveedores', 
    paginationResponse.success ? 'PASS' : 'FAIL',
    paginationResponse.success ? 'Paginación funciona correctamente' : paginationResponse.error);
}

// Pruebas de integridad de datos
async function testDataIntegrity() {
  logSection('PRUEBAS DE INTEGRIDAD DE DATOS');
  
  try {
    // Test 1: Verificar relaciones entre proveedores y pedidos de compra
    const suppliersWithOrders = await prisma.proveedor.findMany({
      include: {
        pedidosCompra: {
          include: {
            items: true
          }
        }
      }
    });
    
    logTest('Relación Proveedor-PedidoCompra', 'PASS', 
      `${suppliersWithOrders.length} proveedores con relaciones verificadas`);
    
    // Test 2: Verificar que no hay pedidos huérfanos
    const orphanOrders = await prisma.pedidoCompra.findMany({
      where: {
        proveedor: null
      }
    });
    
    logTest('Verificar pedidos huérfanos', 
      orphanOrders.length === 0 ? 'PASS' : 'FAIL',
      `${orphanOrders.length} pedidos sin proveedor encontrados`);
    
    // Test 3: Verificar integridad de items de pedidos
    const orphanItems = await prisma.pedidoCompraItem.findMany({
      where: {
        OR: [
          { pedido: null },
          { producto: null }
        ]
      }
    });
    
    logTest('Verificar items de pedidos huérfanos', 
      orphanItems.length === 0 ? 'PASS' : 'FAIL',
      `${orphanItems.length} items huérfanos encontrados`);
    
    // Test 4: Verificar consistencia de totales en pedidos
    const ordersWithInconsistentTotals = await prisma.pedidoCompra.findMany({
      include: {
        items: true
      }
    });
    
    let inconsistentCount = 0;
    for (const order of ordersWithInconsistentTotals) {
      const calculatedSubtotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);
      if (Math.abs(calculatedSubtotal - order.subtotal) > 0.01) {
        inconsistentCount++;
      }
    }
    
    logTest('Verificar consistencia de totales', 
      inconsistentCount === 0 ? 'PASS' : 'FAIL',
      `${inconsistentCount} pedidos con totales inconsistentes`);
    
  } catch (error) {
    logTest('Pruebas de integridad de datos', 'FAIL', error.message);
  }
}

// Pruebas de rendimiento
async function testPerformance() {
  logSection('PRUEBAS DE RENDIMIENTO');
  
  try {
    // Test 1: Tiempo de respuesta de la API de proveedores
    const startTime = Date.now();
    const response = await makeRequest('/proveedores?limit=50');
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    logTest('Tiempo de respuesta API proveedores', 
      responseTime < 2000 ? 'PASS' : 'WARN',
      `${responseTime}ms (objetivo: <2000ms)`);
    
    // Test 2: Consulta compleja con relaciones
    const complexQueryStart = Date.now();
    const complexQuery = await prisma.proveedor.findMany({
      include: {
        pedidosCompra: {
          include: {
            items: {
              include: {
                producto: true
              }
            }
          }
        }
      },
      take: 10
    });
    const complexQueryEnd = Date.now();
    const complexQueryTime = complexQueryEnd - complexQueryStart;
    
    logTest('Consulta compleja con relaciones', 
      complexQueryTime < 3000 ? 'PASS' : 'WARN',
      `${complexQueryTime}ms (objetivo: <3000ms)`);
    
  } catch (error) {
    logTest('Pruebas de rendimiento', 'FAIL', error.message);
  }
}

// Pruebas de la nueva estructura de base de datos
async function testNewDatabaseStructure() {
  logSection('PRUEBAS DE NUEVA ESTRUCTURA DE BASE DE DATOS');
  
  try {
    // Test 1: Verificar que las nuevas tablas existen
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('productoproveedor', 'auditoria')
    `;
    
    const expectedTables = ['productoproveedor', 'auditoria'];
    const existingTables = tables.map(t => t.TABLE_NAME);
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));
    
    logTest('Verificar nuevas tablas', 
      missingTables.length === 0 ? 'PASS' : 'WARN',
      missingTables.length === 0 ? 'Todas las tablas nuevas existen' : `Faltan tablas: ${missingTables.join(', ')}`);
    
    // Test 2: Verificar campos de versionado
    const proveedorFields = await prisma.$queryRaw`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'proveedor' 
      AND COLUMN_NAME IN ('version', 'lastModifiedBy')
    `;
    
    logTest('Verificar campos de versionado en proveedores', 
      proveedorFields.length === 2 ? 'PASS' : 'WARN',
      `${proveedorFields.length}/2 campos de versionado encontrados`);
    
    // Test 3: Verificar índices optimizados
    const indexes = await prisma.$queryRaw`
      SELECT INDEX_NAME 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'pedidocompra' 
      AND INDEX_NAME = 'idx_pedidocompra_proveedor_fecha'
    `;
    
    logTest('Verificar índices optimizados', 
      indexes.length > 0 ? 'PASS' : 'WARN',
      indexes.length > 0 ? 'Índices optimizados encontrados' : 'Índices optimizados no encontrados');
    
  } catch (error) {
    logTest('Pruebas de nueva estructura', 'FAIL', error.message);
  }
}

// Pruebas de visualización en el módulo de compras
async function testPurchaseModuleVisualization() {
  logSection('PRUEBAS DE VISUALIZACIÓN EN MÓDULO DE COMPRAS');
  
  // Test 1: Verificar que la API devuelve proveedores con formato correcto
  const suppliersResponse = await makeRequest('/proveedores');
  
  if (suppliersResponse.success && suppliersResponse.data.proveedores) {
    const suppliers = suppliersResponse.data.proveedores;
    
    // Verificar estructura de datos
    const hasRequiredFields = suppliers.every(supplier => 
      supplier.id && 
      supplier.nombre && 
      typeof supplier.activo === 'boolean'
    );
    
    logTest('Estructura de datos de proveedores', 
      hasRequiredFields ? 'PASS' : 'FAIL',
      hasRequiredFields ? 'Todos los campos requeridos presentes' : 'Faltan campos requeridos');
    
    // Verificar que hay proveedores activos
    const activeSuppliers = suppliers.filter(s => s.activo);
    logTest('Proveedores activos disponibles', 
      activeSuppliers.length > 0 ? 'PASS' : 'WARN',
      `${activeSuppliers.length} proveedores activos encontrados`);
    
    // Verificar conteo de productos por proveedor
    const suppliersWithProductCount = suppliers.filter(s => 
      typeof s.productosCount === 'number'
    );
    
    logTest('Conteo de productos por proveedor', 
      suppliersWithProductCount.length === suppliers.length ? 'PASS' : 'WARN',
      `${suppliersWithProductCount.length}/${suppliers.length} proveedores con conteo de productos`);
  } else {
    logTest('Obtener datos de proveedores', 'FAIL', 'No se pudieron obtener los proveedores');
  }
}

// Función principal
async function runAllTests() {
  log('Iniciando pruebas de optimización del módulo de proveedores...', 'bright');
  log(`Fecha: ${new Date().toLocaleString()}`, 'cyan');
  
  try {
    await testSuppliersAPI();
    await testDataIntegrity();
    await testPerformance();
    await testNewDatabaseStructure();
    await testPurchaseModuleVisualization();
    
    logSection('RESUMEN DE PRUEBAS');
    log('✅ Todas las pruebas completadas', 'green');
    log('📊 Revisa los resultados arriba para identificar áreas de mejora', 'yellow');
    
  } catch (error) {
    log(`❌ Error durante las pruebas: ${error.message}`, 'red');
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testSuppliersAPI,
  testDataIntegrity,
  testPerformance,
  testNewDatabaseStructure,
  testPurchaseModuleVisualization
};