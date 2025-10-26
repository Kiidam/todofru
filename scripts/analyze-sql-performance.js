const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
});

async function analyzeSQLPerformance() {
  console.log('🔍 Analizando rendimiento de consultas SQL...\n');
  
  const performanceIssues = [];
  const recommendations = [];

  try {
    // 1. Analizar consultas de productos con joins complejos
    console.log('1. Analizando consultas de productos...');
    const startTime1 = Date.now();
    
    const productosConRelaciones = await prisma.producto.findMany({
      include: {
        categoria: true,
        unidadMedida: true,
        movimientos: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        proveedores: {
          include: {
            proveedor: true
          }
        }
      },
      take: 100
    });
    
    const time1 = Date.now() - startTime1;
    console.log(`   Tiempo: ${time1}ms para ${productosConRelaciones.length} productos`);
    
    if (time1 > 1000) {
      performanceIssues.push({
        query: 'productos_con_relaciones',
        time: time1,
        severity: 'HIGH',
        description: 'Consulta de productos con múltiples joins es lenta'
      });
      recommendations.push({
        query: 'productos_con_relaciones',
        recommendation: 'Considerar paginación más agresiva y lazy loading para movimientos'
      });
    }

    // 2. Analizar consultas de inventario
    console.log('\n2. Analizando consultas de inventario...');
    const startTime2 = Date.now();
    
    const inventario = await prisma.producto.findMany({
      select: {
        id: true,
        nombre: true,
        stock: true,
        stockMinimo: true,
        categoria: {
          select: {
            nombre: true
          }
        },
        unidadMedida: {
          select: {
            nombre: true,
            simbolo: true
          }
        }
      },
      where: {
        activo: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });
    
    const time2 = Date.now() - startTime2;
    console.log(`   Tiempo: ${time2}ms para ${inventario.length} productos de inventario`);
    
    if (time2 > 500) {
      performanceIssues.push({
        query: 'inventario_productos',
        time: time2,
        severity: 'MEDIUM',
        description: 'Consulta de inventario podría optimizarse'
      });
    }

    // 3. Analizar consultas de movimientos de inventario
    console.log('\n3. Analizando consultas de movimientos de inventario...');
    const startTime3 = Date.now();
    
    const movimientos = await prisma.movimientoInventario.findMany({
      include: {
        producto: {
          select: {
            nombre: true,
            sku: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });
    
    const time3 = Date.now() - startTime3;
    console.log(`   Tiempo: ${time3}ms para ${movimientos.length} movimientos`);
    
    if (time3 > 800) {
      performanceIssues.push({
        query: 'movimientos_inventario',
        time: time3,
        severity: 'HIGH',
        description: 'Consulta de movimientos de inventario es lenta'
      });
      recommendations.push({
        query: 'movimientos_inventario',
        recommendation: 'Implementar índices compuestos en (createdAt, productoId) y considerar particionado por fecha'
      });
    }

    // 4. Analizar consultas de pedidos con items
    console.log('\n4. Analizando consultas de pedidos de venta...');
    const startTime4 = Date.now();
    
    const pedidosVenta = await prisma.pedidoVenta.findMany({
      include: {
        cliente: {
          select: {
            nombre: true,
            numeroIdentificacion: true
          }
        },
        items: {
          include: {
            producto: {
              select: {
                nombre: true,
                sku: true
              }
            }
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      },
      take: 50
    });
    
    const time4 = Date.now() - startTime4;
    console.log(`   Tiempo: ${time4}ms para ${pedidosVenta.length} pedidos de venta`);
    
    if (time4 > 1200) {
      performanceIssues.push({
        query: 'pedidos_venta_completos',
        time: time4,
        severity: 'HIGH',
        description: 'Consulta de pedidos con items es muy lenta'
      });
      recommendations.push({
        query: 'pedidos_venta_completos',
        recommendation: 'Separar la carga de items en consulta independiente o usar paginación en items'
      });
    }

    // 5. Analizar consultas de pedidos de compra
    console.log('\n5. Analizando consultas de pedidos de compra...');
    const startTime5 = Date.now();
    
    const pedidosCompra = await prisma.pedidoCompra.findMany({
      include: {
        proveedor: {
          select: {
            nombre: true,
            numeroIdentificacion: true
          }
        },
        items: {
          include: {
            producto: {
              select: {
                nombre: true,
                sku: true
              }
            }
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      },
      take: 50
    });
    
    const time5 = Date.now() - startTime5;
    console.log(`   Tiempo: ${time5}ms para ${pedidosCompra.length} pedidos de compra`);
    
    if (time5 > 1200) {
      performanceIssues.push({
        query: 'pedidos_compra_completos',
        time: time5,
        severity: 'HIGH',
        description: 'Consulta de pedidos de compra con items es muy lenta'
      });
    }

    // 6. Analizar consultas de búsqueda de productos
    console.log('\n6. Analizando búsquedas de productos...');
    const startTime6 = Date.now();
    
    const busquedaProductos = await prisma.producto.findMany({
      where: {
        OR: [
          { nombre: { contains: 'test' } },
          { sku: { contains: 'test' } },
          { descripcion: { contains: 'test' } }
        ],
        activo: true
      },
      include: {
        categoria: true,
        unidadMedida: true
      },
      take: 20
    });
    
    const time6 = Date.now() - startTime6;
    console.log(`   Tiempo: ${time6}ms para búsqueda de productos`);
    
    if (time6 > 300) {
      performanceIssues.push({
        query: 'busqueda_productos',
        time: time6,
        severity: 'MEDIUM',
        description: 'Búsqueda de productos podría ser más rápida'
      });
      recommendations.push({
        query: 'busqueda_productos',
        recommendation: 'Implementar índices de texto completo o considerar Elasticsearch para búsquedas'
      });
    }

    // 7. Analizar consultas de agregación
    console.log('\n7. Analizando consultas de agregación...');
    const startTime7 = Date.now();
    
    const estadisticas = await Promise.all([
      prisma.producto.count({ where: { activo: true } }),
      prisma.cliente.count({ where: { activo: true } }),
      prisma.proveedor.count({ where: { activo: true } }),
      prisma.pedidoVenta.count(),
      prisma.pedidoCompra.count(),
      prisma.movimientoInventario.count()
    ]);
    
    const time7 = Date.now() - startTime7;
    console.log(`   Tiempo: ${time7}ms para estadísticas generales`);
    
    if (time7 > 500) {
      performanceIssues.push({
        query: 'estadisticas_generales',
        time: time7,
        severity: 'LOW',
        description: 'Consultas de agregación podrían optimizarse'
      });
      recommendations.push({
        query: 'estadisticas_generales',
        recommendation: 'Considerar cache de estadísticas o vistas materializadas'
      });
    }

    // 8. Verificar índices existentes
    console.log('\n8. Verificando índices de base de datos...');
    
    const indices = await prisma.$queryRaw`
      SELECT 
        TABLE_NAME,
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `;
    
    console.log(`   Encontrados ${indices.length} índices en la base de datos`);

    // Análisis de índices faltantes
    const missingIndices = [];
    
    // Verificar índices comunes que podrían faltar
    const commonQueries = [
      { table: 'movimientoinventario', columns: ['createdAt', 'tipo'] },
      { table: 'pedidoventa', columns: ['fecha', 'estado'] },
      { table: 'pedidocompra', columns: ['fecha', 'estado'] },
      { table: 'producto', columns: ['nombre', 'activo'] },
      { table: 'auditoria', columns: ['tabla', 'createdAt'] }
    ];

    for (const query of commonQueries) {
      const indexExists = indices.some(idx => 
        idx.TABLE_NAME.toLowerCase() === query.table && 
        query.columns.includes(idx.COLUMN_NAME.toLowerCase())
      );
      
      if (!indexExists) {
        missingIndices.push({
          table: query.table,
          columns: query.columns,
          reason: 'Índice compuesto recomendado para consultas frecuentes'
        });
      }
    }

    // Resumen y recomendaciones
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE ANÁLISIS DE RENDIMIENTO SQL');
    console.log('='.repeat(60));
    
    if (performanceIssues.length === 0) {
      console.log('✅ ¡Excelente! No se detectaron problemas significativos de rendimiento');
    } else {
      console.log(`⚠️  Se detectaron ${performanceIssues.length} problemas de rendimiento:`);
      
      performanceIssues.forEach((issue, index) => {
        const icon = issue.severity === 'HIGH' ? '🔴' : issue.severity === 'MEDIUM' ? '🟡' : '🟢';
        console.log(`\n${index + 1}. ${icon} ${issue.query} (${issue.severity})`);
        console.log(`   Tiempo: ${issue.time}ms`);
        console.log(`   Descripción: ${issue.description}`);
      });
    }

    if (recommendations.length > 0) {
      console.log('\n💡 RECOMENDACIONES DE OPTIMIZACIÓN:');
      recommendations.forEach((rec, index) => {
        console.log(`\n${index + 1}. ${rec.query}:`);
        console.log(`   ${rec.recommendation}`);
      });
    }

    if (missingIndices.length > 0) {
      console.log('\n🔍 ÍNDICES RECOMENDADOS:');
      missingIndices.forEach((idx, index) => {
        console.log(`\n${index + 1}. Tabla: ${idx.table}`);
        console.log(`   Columnas: ${idx.columns.join(', ')}`);
        console.log(`   Razón: ${idx.reason}`);
      });
    }

    // Guardar reporte detallado
    const reportPath = './REPORTE-RENDIMIENTO-SQL.json';
    const fs = require('fs');
    
    // Convertir BigInt a string para serialización JSON
    const convertBigIntToString = (obj) => {
      return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
    };
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: performanceIssues.length,
        highSeverityIssues: performanceIssues.filter(i => i.severity === 'HIGH').length,
        mediumSeverityIssues: performanceIssues.filter(i => i.severity === 'MEDIUM').length,
        lowSeverityIssues: performanceIssues.filter(i => i.severity === 'LOW').length,
        totalRecommendations: recommendations.length,
        missingIndicesCount: missingIndices.length
      },
      performanceIssues: performanceIssues,
      recommendations: recommendations,
      missingIndices: missingIndices,
      existingIndices: convertBigIntToString(indices)
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Reporte detallado guardado en: ${reportPath}`);

  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar análisis
analyzeSQLPerformance().catch(console.error);