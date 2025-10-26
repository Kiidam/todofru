const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed básico del sistema TODAFRU...');

  try {
    // 1. CREAR USUARIO ADMINISTRADOR
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@todafru.com' },
      update: {},
      create: {
        id: 'user-admin-001',
        name: 'Administrador TODAFRU',
        email: 'admin@todafru.com',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
    console.log('✅ Usuario admin creado:', admin.email);

    // 2. CREAR CATEGORÍAS
    const categorias = [
      { id: 'cat-001', nombre: 'Frutas Cítricas', descripcion: 'Naranjas, limones, mandarinas' },
      { id: 'cat-002', nombre: 'Frutas Tropicales', descripcion: 'Mango, piña, papaya' },
      { id: 'cat-003', nombre: 'Verduras de Hoja', descripcion: 'Lechuga, espinaca, acelga' },
      { id: 'cat-004', nombre: 'Tubérculos', descripcion: 'Papa, camote, yuca' }
    ];

    for (const cat of categorias) {
      await prisma.categoria.upsert({
        where: { nombre: cat.nombre },
        update: {},
        create: cat
      });
    }
    console.log('✅ Categorías creadas:', categorias.length);

    // 3. CREAR UNIDADES DE MEDIDA
    const unidades = [
      { id: 'um-001', nombre: 'Kilogramo', simbolo: 'kg' },
      { id: 'um-002', nombre: 'Gramo', simbolo: 'g' },
      { id: 'um-003', nombre: 'Unidad', simbolo: 'und' },
      { id: 'um-004', nombre: 'Caja', simbolo: 'caja' },
      { id: 'um-005', nombre: 'Saco', simbolo: 'saco' }
    ];

    for (const um of unidades) {
      await prisma.unidadMedida.upsert({
        where: { nombre: um.nombre },
        update: {},
        create: um
      });
    }
    console.log('✅ Unidades de medida creadas:', unidades.length);

    // 4. CREAR PROVEEDORES
    const proveedores = [
      {
        id: 'prov-001',
        nombre: 'FRUTAS DEL VALLE S.A.C.',
        ruc: '20123456789',
        telefono: '01-234-5678',
        email: 'ventas@frutasdelvalle.com',
        direccion: 'Av. Los Frutales 123, Lima'
      },
      {
        id: 'prov-002',
        nombre: 'DISTRIBUIDORA VERDE LTDA',
        ruc: '20987654321',
        telefono: '01-987-6543',
        email: 'pedidos@distribuidoraverde.com',
        direccion: 'Jr. Comercio 456, Lima'
      }
    ];

    for (const prov of proveedores) {
      await prisma.proveedor.upsert({
        where: { ruc: prov.ruc },
        update: {},
        create: prov
      });
    }
    console.log('✅ Proveedores creados:', proveedores.length);

    // 5. CREAR CLIENTES
    const clientes = [
      {
        id: 'cli-001',
        nombre: 'SUPERMERCADOS PLAZA S.A.',
        ruc: '20555777999',
        telefono: '01-555-7777',
        email: 'compras@superplaza.com',
        direccion: 'Av. Principal 789, Lima',
        tipoCliente: 'MAYORISTA'
      },
      {
        id: 'cli-002',
        nombre: 'BODEGA SAN MARTIN',
        ruc: '20111222333',
        telefono: '01-111-2222',
        email: 'bodegasanmartin@gmail.com',
        direccion: 'Jr. San Martin 321, Lima',
        tipoCliente: 'MINORISTA'
      }
    ];

    for (const cli of clientes) {
      await prisma.cliente.upsert({
        where: { ruc: cli.ruc },
        update: {},
        create: cli
      });
    }
    console.log('✅ Clientes creados:', clientes.length);

    // 6. CREAR PRODUCTOS
    const productos = [
      {
        id: 'prod-001',
        nombre: 'Naranja Valencia',
        sku: 'NAR-VAL-001',
        descripcion: 'Naranja valencia fresca, calibre mediano',
        categoriaId: 'cat-001',
        unidadMedidaId: 'um-001',
        precio: 3.50,
        stock: 100,
        stockMinimo: 20,
        perecedero: true,
        diasVencimiento: 15
      },
      {
        id: 'prod-002',
        nombre: 'Mango Kent',
        sku: 'MAN-KEN-001',
        descripcion: 'Mango kent maduro, primera calidad',
        categoriaId: 'cat-002',
        unidadMedidaId: 'um-001',
        precio: 8.00,
        stock: 50,
        stockMinimo: 10,
        perecedero: true,
        diasVencimiento: 7
      },
      {
        id: 'prod-003',
        nombre: 'Papa Blanca',
        sku: 'PAP-BLA-001',
        descripcion: 'Papa blanca extra, calibre grande',
        categoriaId: 'cat-004',
        unidadMedidaId: 'um-004',
        precio: 2.80,
        stock: 200,
        stockMinimo: 50,
        perecedero: false
      }
    ];

    for (const prod of productos) {
      await prisma.producto.upsert({
        where: { sku: prod.sku },
        update: {},
        create: prod
      });
    }
    console.log('✅ Productos creados:', productos.length);

    console.log('🎉 Seed básico completado exitosamente!');
    console.log('📊 Resumen:');
    console.log(`   - Usuarios: 1`);
    console.log(`   - Categorías: ${categorias.length}`);
    console.log(`   - Unidades de medida: ${unidades.length}`);
    console.log(`   - Proveedores: ${proveedores.length}`);
    console.log(`   - Clientes: ${clientes.length}`);
    console.log(`   - Productos: ${productos.length}`);

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });