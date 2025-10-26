/**
 * Script para insertar datos de prueba en la base de datos
 * Incluye clientes, productos, categorías y unidades de medida
 */

const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// Datos de prueba - Categorías
const categorias = [
  {
    id: 'cat-frutas-mock',
    nombre: 'Frutas Mock',
    descripcion: 'Frutas frescas y de temporada - Datos de prueba',
    activo: true
  },
  {
    id: 'cat-verduras-mock',
    nombre: 'Verduras Mock',
    descripcion: 'Verduras y hortalizas frescas - Datos de prueba',
    activo: true
  }
];

// Datos de prueba - Unidades de medida
const unidadesMedida = [
  {
    id: 'kg-mock',
    nombre: 'Kilogramo Mock',
    simbolo: 'kg-m',
    activo: true
  },
  {
    id: 'unidad-mock',
    nombre: 'Unidad Mock',
    simbolo: 'und-m',
    activo: true
  }
];

// Datos de prueba - Clientes
const clientes = [
  {
    id: 'cliente-001',
    tipoEntidad: 'PERSONA_NATURAL',
    tipoCliente: 'MINORISTA',
    nombres: 'Juan Carlos',
    apellidos: 'Pérez García',
    numeroIdentificacion: '12345678',
    telefono: '987654321',
    email: 'juan.perez@email.com',
    direccion: 'Av. Los Olivos 123, San Isidro, Lima',
    mensajePersonalizado: 'Cliente preferencial con descuentos especiales',
    activo: true
  },
  {
    id: 'cliente-002',
    tipoEntidad: 'PERSONA_JURIDICA',
    tipoCliente: 'MAYORISTA',
    razonSocial: 'Supermercados La Canasta S.A.C.',
    numeroIdentificacion: '20123456789',
    ruc: '20123456789',
    contacto: 'María González - Gerente de Compras',
    telefono: '014567890',
    email: 'compras@lacanasta.com',
    direccion: 'Jr. Comercio 456, Cercado de Lima',
    mensajePersonalizado: 'Mayorista con términos de pago a 30 días',
    activo: true
  },
  {
    id: 'cliente-003',
    tipoEntidad: 'PERSONA_NATURAL',
    tipoCliente: 'MINORISTA',
    nombres: 'Ana Sofía',
    apellidos: 'Rodríguez Vega',
    numeroIdentificacion: '87654321',
    telefono: '912345678',
    email: 'ana.rodriguez@gmail.com',
    direccion: 'Calle Las Flores 789, Miraflores, Lima',
    activo: false
  },
  {
    id: 'cliente-004',
    tipoEntidad: 'PERSONA_JURIDICA',
    tipoCliente: 'MAYORISTA',
    razonSocial: 'Distribuidora Norte E.I.R.L.',
    numeroIdentificacion: '20987654321',
    ruc: '20987654321',
    contacto: 'Carlos Mendoza',
    telefono: '014123456',
    email: 'ventas@distribuidoranorte.com',
    direccion: 'Av. Industrial 321, Los Olivos, Lima',
    activo: true
  },
  {
    id: 'cliente-005',
    tipoEntidad: 'PERSONA_NATURAL',
    tipoCliente: 'MINORISTA',
    nombres: 'Roberto',
    apellidos: 'Silva Castillo',
    numeroIdentificacion: '11223344',
    telefono: '998877665',
    email: 'roberto.silva@hotmail.com',
    direccion: 'Jr. Independencia 567, Breña, Lima',
    mensajePersonalizado: 'Cliente frecuente, prefiere entregas los martes',
    activo: true
  }
];

// Datos de prueba - Productos
const productos = [
  {
    id: 'producto-001',
    nombre: 'Manzana Red Delicious',
    sku: 'MANZ-RD-001',
    descripcion: 'Manzanas rojas frescas de primera calidad',
    categoriaId: 'cat-frutas-mock',
    unidadMedidaId: 'kg-mock',
    precio: 8.50,
    porcentajeMerma: 5.0,
    stockMinimo: 50.0,
    perecedero: true,
    diasVencimiento: 15,
    tieneIGV: true,
    activo: true,
    version: 1
  },
  {
    id: 'producto-002',
    nombre: 'Plátano de Seda',
    sku: 'PLAT-SED-002',
    descripcion: 'Plátanos maduros ideales para consumo directo',
    categoriaId: 'cat-frutas-mock',
    unidadMedidaId: 'kg-mock',
    precio: 4.20,
    porcentajeMerma: 8.0,
    stockMinimo: 30.0,
    perecedero: true,
    diasVencimiento: 7,
    tieneIGV: true,
    activo: true,
    version: 1
  },
  {
    id: 'producto-003',
    nombre: 'Naranja Valencia',
    sku: 'NAR-VAL-003',
    descripcion: 'Naranjas jugosas para jugo y consumo',
    categoriaId: 'cat-frutas-mock',
    unidadMedidaId: 'kg-mock',
    precio: 6.80,
    porcentajeMerma: 6.0,
    stockMinimo: 40.0,
    perecedero: true,
    diasVencimiento: 20,
    tieneIGV: true,
    activo: true,
    version: 1
  },
  {
    id: 'producto-004',
    nombre: 'Tomate Cherry',
    sku: 'TOM-CHE-004',
    descripcion: 'Tomates cherry frescos para ensaladas',
    categoriaId: 'cat-verduras-mock',
    unidadMedidaId: 'kg-mock',
    precio: 12.50,
    porcentajeMerma: 10.0,
    stockMinimo: 20.0,
    perecedero: true,
    diasVencimiento: 10,
    tieneIGV: true,
    activo: true,
    version: 1
  },
  {
    id: 'producto-005',
    nombre: 'Lechuga Hidropónica',
    sku: 'LEC-HID-005',
    descripcion: 'Lechuga fresca cultivada hidropónicamente',
    categoriaId: 'cat-verduras-mock',
    unidadMedidaId: 'unidad-mock',
    precio: 3.50,
    porcentajeMerma: 15.0,
    stockMinimo: 25.0,
    perecedero: true,
    diasVencimiento: 5,
    tieneIGV: true,
    activo: true,
    version: 1
  },
  {
    id: 'producto-006',
    nombre: 'Zanahoria Baby',
    sku: 'ZAN-BAB-006',
    descripcion: 'Zanahorias baby tiernas y dulces',
    categoriaId: 'cat-verduras-mock',
    unidadMedidaId: 'kg-mock',
    precio: 7.20,
    porcentajeMerma: 5.0,
    stockMinimo: 35.0,
    perecedero: true,
    diasVencimiento: 25,
    tieneIGV: true,
    activo: false,
    version: 1
  },
  {
    id: 'producto-007',
    nombre: 'Palta Hass',
    sku: 'PAL-HAS-007',
    descripcion: 'Paltas Hass maduras listas para consumo',
    categoriaId: 'cat-frutas-mock',
    unidadMedidaId: 'kg-mock',
    precio: 15.80,
    porcentajeMerma: 12.0,
    stockMinimo: 15.0,
    perecedero: true,
    diasVencimiento: 8,
    tieneIGV: true,
    activo: true,
    version: 1
  },
  {
    id: 'producto-008',
    nombre: 'Limón Tahití',
    sku: 'LIM-TAH-008',
    descripcion: 'Limones Tahití jugosos y ácidos',
    categoriaId: 'cat-frutas-mock',
    unidadMedidaId: 'kg-mock',
    precio: 5.60,
    porcentajeMerma: 7.0,
    stockMinimo: 45.0,
    perecedero: true,
    diasVencimiento: 30,
    tieneIGV: true,
    activo: true,
    version: 1
  },
  {
    id: 'producto-009',
    nombre: 'Brócoli Fresco',
    sku: 'BRO-FRE-009',
    descripcion: 'Brócoli fresco rico en vitaminas',
    categoriaId: 'cat-verduras-mock',
    unidadMedidaId: 'kg-mock',
    precio: 9.40,
    porcentajeMerma: 8.0,
    stockMinimo: 20.0,
    perecedero: true,
    diasVencimiento: 12,
    tieneIGV: true,
    activo: true,
    version: 1
  },
  {
    id: 'producto-010',
    nombre: 'Uva Red Globe',
    sku: 'UVA-RED-010',
    descripcion: 'Uvas rojas sin semilla de exportación',
    categoriaId: 'cat-frutas-mock',
    unidadMedidaId: 'kg-mock',
    precio: 18.90,
    porcentajeMerma: 4.0,
    stockMinimo: 10.0,
    perecedero: true,
    diasVencimiento: 14,
    tieneIGV: true,
    activo: true,
    version: 1
  }
];

// Función para calcular el nombre del cliente
function calcularNombreCliente(cliente) {
  if (cliente.tipoEntidad === 'PERSONA_NATURAL') {
    return `${cliente.nombres} ${cliente.apellidos}`;
  } else {
    return cliente.razonSocial;
  }
}

async function seedMockData() {
  console.log('🌱 Iniciando inserción de datos de prueba...');

  try {
    // 1. Insertar categorías
    console.log('📁 Insertando categorías...');
    for (const categoria of categorias) {
      await prisma.categoria.upsert({
        where: { id: categoria.id },
        update: categoria,
        create: categoria
      });
    }
    console.log(`✅ ${categorias.length} categorías insertadas`);

    // 2. Insertar unidades de medida
    console.log('📏 Insertando unidades de medida...');
    for (const unidad of unidadesMedida) {
      await prisma.unidadMedida.upsert({
        where: { id: unidad.id },
        update: unidad,
        create: unidad
      });
    }
    console.log(`✅ ${unidadesMedida.length} unidades de medida insertadas`);

    // 3. Insertar clientes
    console.log('👥 Insertando clientes...');
    for (const cliente of clientes) {
      const clienteData = {
        ...cliente,
        nombre: calcularNombreCliente(cliente)
      };
      
      await prisma.cliente.upsert({
        where: { id: cliente.id },
        update: clienteData,
        create: clienteData
      });
    }
    console.log(`✅ ${clientes.length} clientes insertados`);

    // 4. Insertar productos
    console.log('📦 Insertando productos...');
    for (const producto of productos) {
      await prisma.producto.upsert({
        where: { id: producto.id },
        update: producto,
        create: producto
      });
    }
    console.log(`✅ ${productos.length} productos insertados`);

    // 5. Verificar datos insertados
    console.log('\n📊 Verificando datos insertados:');
    const totalCategorias = await prisma.categoria.count();
    const totalUnidades = await prisma.unidadMedida.count();
    const totalClientes = await prisma.cliente.count();
    const totalProductos = await prisma.producto.count();

    console.log(`   - Categorías: ${totalCategorias}`);
    console.log(`   - Unidades de medida: ${totalUnidades}`);
    console.log(`   - Clientes: ${totalClientes}`);
    console.log(`   - Productos: ${totalProductos}`);

    console.log('\n🎉 ¡Datos de prueba insertados exitosamente!');
    console.log('\nDatos insertados:');
    console.log('- 5 clientes (3 activos, 2 inactivos)');
    console.log('- 10 productos (9 activos, 1 inactivo)');
    console.log('- 2 categorías (Frutas y Verduras)');
    console.log('- 2 unidades de medida (kg y unidad)');
    console.log('\nAhora puedes usar las APIs normales con datos reales.');

  } catch (error) {
    console.error('❌ Error al insertar datos de prueba:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
if (require.main === module) {
  seedMockData()
    .then(() => {
      console.log('\n✨ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en el script:', error);
      process.exit(1);
    });
}

module.exports = { seedMockData };