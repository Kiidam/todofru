// Script para analizar duplicados de proveedores en profundidad
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function analyzeDuplicates() {
  console.log('🔍 ANÁLISIS EXHAUSTIVO DE DUPLICADOS DE PROVEEDORES');
  console.log('======================================================\n');

  try {
    // 1. Obtener todos los proveedores
    const proveedores = await prisma.proveedor.findMany({
      include: {
        pedidosCompra: true,
        _count: {
          select: {
            pedidosCompra: true
          }
        }
      }
    });

    console.log(`📊 Total de proveedores en base de datos: ${proveedores.length}\n`);

    // 2. Analizar duplicados por RUC
    const proveedoresPorRuc = {};
    const duplicadosRuc = [];

    proveedores.forEach(proveedor => {
      const ruc = proveedor.ruc || proveedor.numeroIdentificacion || 'SIN_RUC';
      if (!proveedoresPorRuc[ruc]) {
        proveedoresPorRuc[ruc] = [];
      }
      proveedoresPorRuc[ruc].push(proveedor);
    });

    Object.entries(proveedoresPorRuc).forEach(([ruc, provs]) => {
      if (provs.length > 1) {
        duplicadosRuc.push({ ruc, proveedores: provs });
      }
    });

    // 3. Analizar duplicados por nombre
    const proveedoresPorNombre = {};
    const duplicadosNombre = [];

    proveedores.forEach(proveedor => {
      const nombre = (proveedor.nombre || '').toLowerCase().trim();
      if (nombre && nombre !== '') {
        if (!proveedoresPorNombre[nombre]) {
          proveedoresPorNombre[nombre] = [];
        }
        proveedoresPorNombre[nombre].push(proveedor);
      }
    });

    Object.entries(proveedoresPorNombre).forEach(([nombre, provs]) => {
      if (provs.length > 1) {
        duplicadosNombre.push({ nombre, proveedores: provs });
      }
    });

    // 4. Analizar duplicados por email
    const proveedoresPorEmail = {};
    const duplicadosEmail = [];

    proveedores.forEach(proveedor => {
      const email = (proveedor.email || '').toLowerCase().trim();
      if (email && email !== '') {
        if (!proveedoresPorEmail[email]) {
          proveedoresPorEmail[email] = [];
        }
        proveedoresPorEmail[email].push(proveedor);
      }
    });

    Object.entries(proveedoresPorEmail).forEach(([email, provs]) => {
      if (provs.length > 1) {
        duplicadosEmail.push({ email, proveedores: provs });
      }
    });

    // 5. Mostrar resultados
    console.log('🔍 DUPLICADOS POR RUC/NÚMERO DE IDENTIFICACIÓN:');
    console.log('------------------------------------------------');
    if (duplicadosRuc.length === 0) {
      console.log('✅ No se encontraron duplicados por RUC\n');
    } else {
      duplicadosRuc.forEach(dup => {
        console.log(`❌ RUC: ${dup.ruc} (${dup.proveedores.length} duplicados)`);
        dup.proveedores.forEach((prov, index) => {
          console.log(`   ${index + 1}. ID: ${prov.id} | Nombre: ${prov.nombre} | Pedidos: ${prov._count.pedidosCompra}`);
        });
        console.log('');
      });
    }

    console.log('🔍 DUPLICADOS POR NOMBRE:');
    console.log('-------------------------');
    if (duplicadosNombre.length === 0) {
      console.log('✅ No se encontraron duplicados por nombre\n');
    } else {
      duplicadosNombre.forEach(dup => {
        console.log(`❌ Nombre: ${dup.nombre} (${dup.proveedores.length} duplicados)`);
        dup.proveedores.forEach((prov, index) => {
          console.log(`   ${index + 1}. ID: ${prov.id} | RUC: ${prov.ruc || prov.numeroIdentificacion || 'Sin RUC'} | Pedidos: ${prov._count.pedidosCompra}`);
        });
        console.log('');
      });
    }

    console.log('🔍 DUPLICADOS POR EMAIL:');
    console.log('------------------------');
    if (duplicadosEmail.length === 0) {
      console.log('✅ No se encontraron duplicados por email\n');
    } else {
      duplicadosEmail.forEach(dup => {
        console.log(`❌ Email: ${dup.email} (${dup.proveedores.length} duplicados)`);
        dup.proveedores.forEach((prov, index) => {
          console.log(`   ${index + 1}. ID: ${prov.id} | Nombre: ${prov.nombre} | Pedidos: ${prov._count.pedidosCompra}`);
        });
        console.log('');
      });
    }

    // 6. Analizar archivos en la carpeta de proveedores
    console.log('📁 ANÁLISIS DE ARCHIVOS EN CARPETA PROVEEDORES:');
    console.log('-----------------------------------------------');
    const proveedoresDir = path.join(__dirname, '../app/dashboard/proveedores');
    
    if (fs.existsSync(proveedoresDir)) {
      const files = fs.readdirSync(proveedoresDir);
      console.log(`📂 Archivos encontrados: ${files.length}`);
      
      files.forEach(file => {
        const filePath = path.join(proveedoresDir, file);
        const stats = fs.statSync(filePath);
        console.log(`   📄 ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
        
        // Analizar contenido de archivos sospechosos
        if (file.endsWith('.json') || file.endsWith('.txt')) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            console.log(`      Contenido: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
          } catch (error) {
            console.log(`      ⚠️ Error leyendo archivo: ${error.message}`);
          }
        }
      });
    } else {
      console.log('❌ Carpeta de proveedores no encontrada');
    }

    // 7. Resumen final
    console.log('\n📊 RESUMEN DEL ANÁLISIS:');
    console.log('========================');
    console.log(`Total de proveedores: ${proveedores.length}`);
    console.log(`Duplicados por RUC: ${duplicadosRuc.length}`);
    console.log(`Duplicados por nombre: ${duplicadosNombre.length}`);
    console.log(`Duplicados por email: ${duplicadosEmail.length}`);
    
    const totalDuplicados = duplicadosRuc.length + duplicadosNombre.length + duplicadosEmail.length;
    if (totalDuplicados === 0) {
      console.log('✅ No se encontraron duplicados en la base de datos');
    } else {
      console.log(`❌ Se encontraron ${totalDuplicados} tipos de duplicados`);
    }

    // 8. Generar reporte detallado
    const reporte = {
      timestamp: new Date().toISOString(),
      totalProveedores: proveedores.length,
      duplicados: {
        porRuc: duplicadosRuc,
        porNombre: duplicadosNombre,
        porEmail: duplicadosEmail
      },
      proveedores: proveedores.map(p => ({
        id: p.id,
        nombre: p.nombre,
        ruc: p.ruc,
        numeroIdentificacion: p.numeroIdentificacion,
        email: p.email,
        telefono: p.telefono,
        direccion: p.direccion,
        pedidosCompra: p._count.pedidosCompra,
        activo: p.activo,
        createdAt: p.createdAt
      }))
    };

    const reportePath = path.join(__dirname, '../REPORTE-DUPLICADOS-PROVEEDORES.json');
    fs.writeFileSync(reportePath, JSON.stringify(reporte, null, 2));
    console.log(`\n📄 Reporte detallado guardado en: ${reportePath}`);

  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDuplicates();