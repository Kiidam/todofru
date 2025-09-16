const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos para sistema multi-entidad...');

  try {
    // 1. Crear Razones Sociales (diferentes sectores)
    console.log('📊 Creando razones sociales...');
    
    const mayorista = await prisma.razonSocial.upsert({
      where: { nombre: 'TODA FRUTA MAYORISTA S.A.C.' },
      update: {},
      create: {
        nombre: 'TODA FRUTA MAYORISTA S.A.C.',
        ruc: '20123456789',
        direccion: 'Av. Frutos 123, Lima',
        tipoEmpresa: 'MAYORISTA',
        activo: true
      }
    });

    const minorista = await prisma.razonSocial.upsert({
      where: { nombre: 'FRUTA RETAIL MINORISTA E.I.R.L.' },
      update: {},
      create: {
        nombre: 'FRUTA RETAIL MINORISTA E.I.R.L.',
        ruc: '20987654321',
        direccion: 'Jr. Comercio 456, Lima',
        tipoEmpresa: 'MINORISTA',
        activo: true
      }
    });

    const distribuidor = await prisma.razonSocial.upsert({
      where: { nombre: 'DISTRIBUIDORA FRUITS CORP S.A.' },
      update: {},
      create: {
        nombre: 'DISTRIBUIDORA FRUITS CORP S.A.',
        ruc: '20555777999',
        direccion: 'Av. Industrial 789, Lima',
        tipoEmpresa: 'DISTRIBUIDOR',
        activo: true
      }
    });

    console.log(`✅ Razones sociales creadas:`);
    console.log(`   - Mayorista: ${mayorista.nombre}`);
    console.log(`   - Minorista: ${minorista.nombre}`);
    console.log(`   - Distribuidor: ${distribuidor.nombre}`);

    // 2. Crear productos de ejemplo
    console.log('🍎 Creando productos de ejemplo...');
    
    const productos = [
      {
        nombre: 'Manzana Red Delicious',
        descripcion: 'Manzana roja premium importada',
        codigo: 'MANZ-RD-001',
        precioBase: 8.50,
        stock: 500,
        unidad: 'kg'
      },
      {
        nombre: 'Naranja Valencia',
        descripcion: 'Naranja fresca nacional',
        codigo: 'NAR-VAL-002',
        precioBase: 4.20,
        stock: 800,
        unidad: 'kg'
      },
      {
        nombre: 'Plátano Orgánico',
        descripcion: 'Plátano de exportación',
        codigo: 'PLAT-ORG-003',
        precioBase: 3.80,
        stock: 1200,
        unidad: 'kg'
      },
      {
        nombre: 'Uva Red Globe',
        descripcion: 'Uva roja sin semillas',
        codigo: 'UVA-RG-004',
        precioBase: 12.00,
        stock: 300,
        unidad: 'kg'
      }
    ];

    const productosCreados = [];
    for (const prod of productos) {
      const producto = await prisma.producto.upsert({
        where: { codigo: prod.codigo },
        update: {},
        create: prod
      });
      productosCreados.push(producto);
    }

    console.log(`✅ Productos creados: ${productosCreados.length}`);

    // 3. Configurar precios diferenciados por sector
    console.log('💰 Configurando precios diferenciados por sector...');
    
    const fechaInicio = new Date();
    const fechaFin = new Date();
    fechaFin.setFullYear(fechaFin.getFullYear() + 1); // Válido por 1 año

    // Para cada producto, crear precios diferenciados
    for (const producto of productosCreados) {
      // MAYORISTA - Sector A (más caro): +20% sobre precio base
      await prisma.productoPrecioRazonSocial.upsert({
        where: {
          productoId_razonSocialId: {
            productoId: producto.id,
            razonSocialId: mayorista.id
          }
        },
        update: {},
        create: {
          productoId: producto.id,
          razonSocialId: mayorista.id,
          precio: Math.round((producto.precioBase * 1.20) * 100) / 100, // +20%
          margenPorcentaje: 20.00,
          fechaInicioVigencia: fechaInicio,
          fechaFinVigencia: fechaFin,
          activo: true
        }
      });

      // DISTRIBUIDOR - Sector B (precio medio): +10% sobre precio base
      await prisma.productoPrecioRazonSocial.upsert({
        where: {
          productoId_razonSocialId: {
            productoId: producto.id,
            razonSocialId: distribuidor.id
          }
        },
        update: {},
        create: {
          productoId: producto.id,
          razonSocialId: distribuidor.id,
          precio: Math.round((producto.precioBase * 1.10) * 100) / 100, // +10%
          margenPorcentaje: 10.00,
          fechaInicioVigencia: fechaInicio,
          fechaFinVigencia: fechaFin,
          activo: true
        }
      });

      // MINORISTA - Sector C (más barato): precio base sin margen
      await prisma.productoPrecioRazonSocial.upsert({
        where: {
          productoId_razonSocialId: {
            productoId: producto.id,
            razonSocialId: minorista.id
          }
        },
        update: {},
        create: {
          productoId: producto.id,
          razonSocialId: minorista.id,
          precio: producto.precioBase, // Precio base
          margenPorcentaje: 0.00,
          fechaInicioVigencia: fechaInicio,
          fechaFinVigencia: fechaFin,
          activo: true
        }
      });
    }

    // 4. Mostrar resumen de precios creados
    console.log('📋 Resumen de configuración de precios:');
    console.log('');
    
    for (const producto of productosCreados) {
      console.log(`🍎 ${producto.nombre} (${producto.codigo}):`);
      console.log(`   💰 Precio Base: S/ ${producto.precioBase.toFixed(2)}`);
      
      const precioMayorista = Math.round((producto.precioBase * 1.20) * 100) / 100;
      const precioDistribuidor = Math.round((producto.precioBase * 1.10) * 100) / 100;
      const precioMinorista = producto.precioBase;
      
      console.log(`   🏪 MAYORISTA (Sector A - más caro): S/ ${precioMayorista.toFixed(2)} (+20%)`);
      console.log(`   📦 DISTRIBUIDOR (Sector B - medio): S/ ${precioDistribuidor.toFixed(2)} (+10%)`);
      console.log(`   🛒 MINORISTA (Sector C - más barato): S/ ${precioMinorista.toFixed(2)} (base)`);
      console.log('');
    }

    console.log('✅ ¡Seed completado exitosamente!');
    console.log('');
    console.log('🎯 Sistema configurado con:');
    console.log('   - 3 Razones Sociales (sectores empresariales)');
    console.log('   - 4 Productos con precios diferenciados');
    console.log('   - Precios por sector: MAYORISTA (+20%) > DISTRIBUIDOR (+10%) > MINORISTA (base)');
    console.log('');
    console.log('🌐 Accede al sistema en: http://localhost:3006');
    console.log('   - Razones Sociales: http://localhost:3006/dashboard/razon-social');
    console.log('   - Productos: http://localhost:3006/dashboard/productos');

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  });
