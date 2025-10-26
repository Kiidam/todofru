// Script para poblar la nueva base de datos limpia con datos básicos
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function seedCleanDatabase() {
  console.log('🌱 POBLANDO NUEVA BASE DE DATOS LIMPIA');
  console.log('====================================\n');

  try {
    // 1. Crear unidades de medida básicas
    console.log('1. Creando unidades de medida básicas...');
    const unidades = [
      { id: 'kg', nombre: 'Kilogramo', simbolo: 'kg' },
      { id: 'g', nombre: 'Gramo', simbolo: 'g' },
      { id: 'l', nombre: 'Litro', simbolo: 'l' },
      { id: 'ml', nombre: 'Mililitro', simbolo: 'ml' },
      { id: 'unidad', nombre: 'Unidad', simbolo: 'und' },
      { id: 'caja', nombre: 'Caja', simbolo: 'caja' },
      { id: 'paquete', nombre: 'Paquete', simbolo: 'paq' }
    ];

    for (const unidad of unidades) {
      await prisma.unidadMedida.create({
        data: unidad
      });
      console.log(`   ✅ Unidad creada: ${unidad.nombre} (${unidad.simbolo})`);
    }

    // 2. Crear categorías básicas
    console.log('\n2. Creando categorías básicas...');
    const categorias = [
      { id: 'frutas', nombre: 'Frutas', descripcion: 'Frutas frescas y productos derivados' },
      { id: 'verduras', nombre: 'Verduras', descripcion: 'Verduras y hortalizas frescas' },
      { id: 'lacteos', nombre: 'Lácteos', descripcion: 'Productos lácteos y derivados' },
      { id: 'carnes', nombre: 'Carnes', descripcion: 'Carnes frescas y embutidos' },
      { id: 'abarrotes', nombre: 'Abarrotes', descripcion: 'Productos secos y enlatados' }
    ];

    for (const categoria of categorias) {
      await prisma.categoria.create({
        data: categoria
      });
      console.log(`   ✅ Categoría creada: ${categoria.nombre}`);
    }

    // 3. Crear usuario administrador
    console.log('\n3. Creando usuario administrador...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await prisma.user.create({
      data: {
        id: 'admin-user-001',
        name: 'Administrador',
        email: 'admin@todafru.com',
        password: hashedPassword,
        role: 'ADMIN'
      }
    });
    console.log(`   ✅ Usuario administrador creado: ${adminUser.email}`);

    // 4. Verificar estado final
    console.log('\n📊 Estado final de la base de datos:');
    console.log('-----------------------------------');
    
    const finalCounts = {
      usuarios: await prisma.user.count(),
      categorias: await prisma.categoria.count(),
      unidades: await prisma.unidadMedida.count(),
      proveedores: await prisma.proveedor.count(),
      clientes: await prisma.cliente.count(),
      productos: await prisma.producto.count()
    };

    Object.entries(finalCounts).forEach(([tabla, count]) => {
      console.log(`   ${tabla}: ${count} registros`);
    });

    // 5. Generar reporte de inicialización
    const reporteInicializacion = {
      timestamp: new Date().toISOString(),
      estadoFinal: finalCounts,
      datosCreados: {
        unidadesMedida: unidades.length,
        categorias: categorias.length,
        usuarios: 1
      },
      inicializacionCompleta: true,
      credencialesAdmin: {
        email: 'admin@todafru.com',
        password: 'admin123 (cambiar después del primer login)'
      }
    };

    const reportePath = path.join(__dirname, '../REPORTE-INICIALIZACION-BD.json');
    fs.writeFileSync(reportePath, JSON.stringify(reporteInicializacion, null, 2));
    console.log(`\n📄 Reporte de inicialización guardado en: ${reportePath}`);

    console.log('\n🎉 ¡BASE DE DATOS INICIALIZADA CORRECTAMENTE!');
    console.log('============================================');
    console.log('📧 Email admin: admin@todafru.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Recuerda cambiar la contraseña después del primer login');

  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  seedCleanDatabase().catch(console.error);
}

module.exports = { seedCleanDatabase };