import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando seed completo del sistema TODAFRU...');
  
  // 1. CREAR USUARIO ADMINISTRADOR
  const hashedPassword = await hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@todafru.com' },
    update: {},
    create: {
      name: 'Administrador TODAFRU',
      email: 'admin@todafru.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  
  console.log('✅ Usuario admin creado');

  // 2. CREAR CATEGORÍAS
  const categorias = await Promise.all([
    prisma.categoria.upsert({
      where: { nombre: 'Frutas Cítricas' },
      update: {},
      create: { nombre: 'Frutas Cítricas', descripcion: 'Naranjas, limones, mandarinas' }
    }),
    prisma.categoria.upsert({
      where: { nombre: 'Frutas Tropicales' },
      update: {},
      create: { nombre: 'Frutas Tropicales', descripcion: 'Mango, piña, papaya' }
    }),
    prisma.categoria.upsert({
      where: { nombre: 'Verduras de Hoja' },
      update: {},
      create: { nombre: 'Verduras de Hoja', descripcion: 'Lechuga, espinaca, acelga' }
    }),
    prisma.categoria.upsert({
      where: { nombre: 'Verduras de Fruto' },
      update: {},
      create: { nombre: 'Verduras de Fruto', descripcion: 'Tomate, pepino, pimientos' }
    }),
    prisma.categoria.upsert({
      where: { nombre: 'Tubérculos' },
      update: {},
      create: { nombre: 'Tubérculos', descripcion: 'Papa, camote, yuca' }
    })
  ]);

  console.log('✅ Categorías creadas:', categorias.length);

  // 3. CREAR UNIDADES DE MEDIDA
  const unidades = await Promise.all([
    prisma.unidadMedida.upsert({
      where: { simbolo: 'kg' },
      update: {},
      create: { nombre: 'Kilogramo', simbolo: 'kg' }
    }),
    prisma.unidadMedida.upsert({
      where: { simbolo: 'und' },
      update: {},
      create: { nombre: 'Unidad', simbolo: 'und' }
    }),
    prisma.unidadMedida.upsert({
      where: { simbolo: 'caja' },
      update: {},
      create: { nombre: 'Caja', simbolo: 'caja' }
    }),
    prisma.unidadMedida.upsert({
      where: { simbolo: 'saco' },
      update: {},
      create: { nombre: 'Saco', simbolo: 'saco' }
    }),
    prisma.unidadMedida.upsert({
      where: { simbolo: 'docena' },
      update: {},
      create: { nombre: 'Docena', simbolo: 'docena' }
    })
  ]);

  console.log('✅ Unidades de medida creadas:', unidades.length);

  // 3.1. CREAR TIPOS DE ARTÍCULO
  const tiposArticulo = await Promise.all([
    prisma.tipoArticulo.upsert({
      where: { nombre: 'Producto Natural' },
      update: {},
      create: { nombre: 'Producto Natural', descripcion: 'Frutas y verduras sin procesar' }
    }),
    prisma.tipoArticulo.upsert({
      where: { nombre: 'Producto Procesado' },
      update: {},
      create: { nombre: 'Producto Procesado', descripcion: 'Productos con algún nivel de procesamiento' }
    }),
    prisma.tipoArticulo.upsert({
      where: { nombre: 'Producto Orgánico' },
      update: {},
      create: { nombre: 'Producto Orgánico', descripcion: 'Productos certificados orgánicos' }
    })
  ]);

  console.log('✅ Tipos de artículo creados:', tiposArticulo.length);

  // 3.2. CREAR FAMILIAS
  const familias = await Promise.all([
    prisma.familia.upsert({
      where: { nombre: 'Frutas' },
      update: {},
      create: { nombre: 'Frutas', descripcion: 'Todos los tipos de frutas' }
    }),
    prisma.familia.upsert({
      where: { nombre: 'Verduras' },
      update: {},
      create: { nombre: 'Verduras', descripcion: 'Todos los tipos de verduras' }
    }),
    prisma.familia.upsert({
      where: { nombre: 'Hierbas' },
      update: {},
      create: { nombre: 'Hierbas', descripcion: 'Hierbas aromáticas y medicinales' }
    })
  ]);

  console.log('✅ Familias creadas:', familias.length);

  // 3.3. CREAR SUBFAMILIAS
  const subfamilias = await Promise.all([
    // Subfamilias de Frutas
    prisma.subfamilia.upsert({
      where: { nombre: 'Cítricos' },
      update: {},
      create: { nombre: 'Cítricos', familiaId: familias[0].id, descripcion: 'Frutas cítricas' }
    }),
    prisma.subfamilia.upsert({
      where: { nombre: 'Tropicales' },
      update: {},
      create: { nombre: 'Tropicales', familiaId: familias[0].id, descripcion: 'Frutas tropicales' }
    }),
    prisma.subfamilia.upsert({
      where: { nombre: 'De Hueso' },
      update: {},
      create: { nombre: 'De Hueso', familiaId: familias[0].id, descripcion: 'Frutas con hueso' }
    }),
    // Subfamilias de Verduras
    prisma.subfamilia.upsert({
      where: { nombre: 'De Hoja Verde' },
      update: {},
      create: { nombre: 'De Hoja Verde', familiaId: familias[1].id, descripcion: 'Verduras de hoja verde' }
    }),
    prisma.subfamilia.upsert({
      where: { nombre: 'De Raíz' },
      update: {},
      create: { nombre: 'De Raíz', familiaId: familias[1].id, descripcion: 'Verduras de raíz' }
    }),
    prisma.subfamilia.upsert({
      where: { nombre: 'De Fruto' },
      update: {},
      create: { nombre: 'De Fruto', familiaId: familias[1].id, descripcion: 'Verduras de fruto' }
    })
  ]);

  console.log('✅ Subfamilias creadas:', subfamilias.length);

  // 3.4. CREAR MARCAS
  const marcas = await Promise.all([
    prisma.marca.upsert({
      where: { nombre: 'TODAFRU Premium' },
      update: {},
      create: { nombre: 'TODAFRU Premium', descripcion: 'Línea premium de productos seleccionados' }
    }),
    prisma.marca.upsert({
      where: { nombre: 'TODAFRU Orgánico' },
      update: {},
      create: { nombre: 'TODAFRU Orgánico', descripcion: 'Productos orgánicos certificados' }
    }),
    prisma.marca.upsert({
      where: { nombre: 'TODAFRU Tradicional' },
      update: {},
      create: { nombre: 'TODAFRU Tradicional', descripcion: 'Productos tradicionales del mercado' }
    }),
    prisma.marca.upsert({
      where: { nombre: 'Sin Marca' },
      update: {},
      create: { nombre: 'Sin Marca', descripcion: 'Productos sin marca específica' }
    })
  ]);

  console.log('✅ Marcas creadas:', marcas.length);

  // 3.5. CREAR AGRUPADORES
  const agrupadores = await Promise.all([
    prisma.agrupadorProducto.upsert({
      where: { nombre: 'Alta Rotación' },
      update: {},
      create: { nombre: 'Alta Rotación', descripcion: 'Productos de alta demanda y rotación' }
    }),
    prisma.agrupadorProducto.upsert({
      where: { nombre: 'Estacional' },
      update: {},
      create: { nombre: 'Estacional', descripcion: 'Productos de temporada específica' }
    }),
    prisma.agrupadorProducto.upsert({
      where: { nombre: 'Premium' },
      update: {},
      create: { nombre: 'Premium', descripcion: 'Productos de alta calidad y precio' }
    }),
    prisma.agrupadorProducto.upsert({
      where: { nombre: 'Exportación' },
      update: {},
      create: { nombre: 'Exportación', descripcion: 'Productos destinados a exportación' }
    })
  ]);

  console.log('✅ Agrupadores creados:', agrupadores.length);

  // 3.6. CREAR RAZONES SOCIALES
  const razonesSociales = await Promise.all([
    prisma.razonSocial.upsert({
      where: { nombre: 'Supermercados Wong S.A.' },
      update: {},
      create: { 
        nombre: 'Supermercados Wong S.A.',
        ruc: '20100070970',
        direccion: 'Av. Dos de Mayo 1245, San Isidro',
        telefono: '01-2157000',
        email: 'compras@wong.pe',
        tipoEmpresa: 'CORPORATION',
        sector: 'A',
        descripcion: 'Cadena de supermercados premium'
      }
    }),
    prisma.razonSocial.upsert({
      where: { nombre: 'Metro S.A.' },
      update: {},
      create: { 
        nombre: 'Metro S.A.',
        ruc: '20100070971',
        direccion: 'Av. Canaval y Moreyra 150, San Isidro',
        telefono: '01-2157100',
        email: 'proveedores@metro.pe',
        tipoEmpresa: 'CORPORATION',
        sector: 'B',
        descripcion: 'Cadena de supermercados masivo'
      }
    }),
    prisma.razonSocial.upsert({
      where: { nombre: 'Tottus S.A.' },
      update: {},
      create: { 
        nombre: 'Tottus S.A.',
        ruc: '20100070972',
        direccion: 'Av. Angamos Este 1805, Surquillo',
        telefono: '01-2157200',
        email: 'compras@tottus.pe',
        tipoEmpresa: 'CORPORATION',
        sector: 'B',
        descripcion: 'Cadena de hipermercados'
      }
    }),
    prisma.razonSocial.upsert({
      where: { nombre: 'Mercado de Productores S.A.C.' },
      update: {},
      create: { 
        nombre: 'Mercado de Productores S.A.C.',
        ruc: '20100070973',
        direccion: 'Av. Aviación 2085, San Luis',
        telefono: '01-4567890',
        email: 'ventas@mercadoproductores.pe',
        tipoEmpresa: 'COMPANY',
        sector: 'C',
        descripcion: 'Mercado mayorista de productores'
      }
    }),
    prisma.razonSocial.upsert({
      where: { nombre: 'Restaurantes Centrales S.A.C.' },
      update: {},
      create: { 
        nombre: 'Restaurantes Centrales S.A.C.',
        ruc: '20100070974',
        direccion: 'Av. Pedro de Osma 301, Barranco',
        telefono: '01-2526515',
        email: 'compras@central.pe',
        tipoEmpresa: 'COMPANY',
        sector: 'Premium',
        descripcion: 'Grupo de restaurantes de alta cocina'
      }
    })
  ]);

  console.log('✅ Razones sociales creadas:', razonesSociales.length);

  // 4. CREAR PROVEEDORES
  const proveedores = [];
  const proveedorData = [
    {
      nombre: 'Mercado Mayorista Central Lima',
      ruc: '20123456789',
      telefono: '01-4567890',
      email: 'ventas@mercadocentral.pe',
      direccion: 'Av. Aviación 2085, San Luis',
      contacto: 'Carlos Mendoza Ríos'
    },
    {
      nombre: 'Agrícola San José S.A.C.',
      ruc: '20987654321',
      telefono: '01-9876543',
      email: 'compras@agricolasanjose.com',
      direccion: 'Km 35 Carretera Central, Huarochirí',
      contacto: 'María García Flores'
    },
    {
      nombre: 'Frutícola Valle Verde',
      ruc: '20555666777',
      telefono: '01-5556667',
      email: 'administracion@valleverde.pe',
      direccion: 'Av. Los Frutales 850, Cañete',
      contacto: 'Roberto Silva Torres'
    }
  ];

  for (const data of proveedorData) {
    const proveedor = await prisma.proveedor.upsert({
      where: { ruc: data.ruc },
      update: {},
      create: data
    });
    proveedores.push(proveedor);
  }

  console.log('✅ Proveedores creados:', proveedores.length);

  // 5. CREAR CLIENTES
  const clientes = [];
  const clienteData = [
    {
      nombre: 'Supermercados Plaza Vea',
      ruc: '20111222333',
      telefono: '01-2223334',
      email: 'compras@plazavea.com.pe',
      direccion: 'Av. Brasil 789, Breña, Lima',
      contacto: 'Ana López Vargas',
      tipoCliente: 'MAYORISTA' as const
    },
    {
      nombre: 'Wong Supermercados',
      ruc: '20444555666',
      telefono: '01-5556667',
      email: 'proveedores@wong.pe',
      direccion: 'Av. Javier Prado 1235, San Isidro',
      contacto: 'Pedro Fernández Castro',
      tipoCliente: 'MAYORISTA' as const
    },
    {
      nombre: 'Restaurante El Sabor Peruano',
      ruc: '20777888999',
      telefono: '01-7778889',
      email: 'chef@elsaborperuano.com',
      direccion: 'Calle Los Olivos 321, Miraflores',
      contacto: 'Carmen Quispe Huamán',
      tipoCliente: 'MINORISTA' as const
    },
    {
      nombre: 'Hotel Costa del Sol',
      ruc: '20333444555',
      telefono: '01-3334445',
      email: 'compras@costadelsol.pe',
      direccion: 'Malecón de la Reserva 615, Miraflores',
      contacto: 'Luis Morales Sánchez',
      tipoCliente: 'MAYORISTA' as const
    }
  ];

  for (const data of clienteData) {
    const cliente = await prisma.cliente.upsert({
      where: { ruc: data.ruc! },
      update: {},
      create: data
    });
    clientes.push(cliente);
  }

  console.log('✅ Clientes creados:', clientes.length);

  // 6. CREAR PRODUCTOS COMPLETOS
  const productos = [];
  const productosData = [
    // FRUTAS CÍTRICAS
    {
      nombre: 'Naranja Valencia',
      sku: 'NAR-VAL-001',
      descripcion: 'Naranja valencia jugosa de primera calidad',
      categoriaId: categorias[0].id,
      unidadMedidaId: unidades[0].id, // kg
      precio: 3.50,
      stock: 0, // Empezamos sin stock, se llenará con compras
      stockMinimo: 50,
      perecedero: true,
      diasVencimiento: 15
    },
    {
      nombre: 'Limón Sutil',
      sku: 'LIM-SUT-001',
      descripcion: 'Limón sutil peruano extra grande',
      categoriaId: categorias[0].id,
      unidadMedidaId: unidades[0].id, // kg
      precio: 4.20,
      stock: 0,
      stockMinimo: 30,
      perecedero: true,
      diasVencimiento: 20
    },
    // FRUTAS TROPICALES
    {
      nombre: 'Mango Kent',
      sku: 'MAN-KEN-001',
      descripcion: 'Mango kent peruano de exportación',
      categoriaId: categorias[1].id,
      unidadMedidaId: unidades[0].id, // kg
      precio: 6.80,
      stock: 0,
      stockMinimo: 25,
      perecedero: true,
      diasVencimiento: 10
    },
    {
      nombre: 'Piña Golden',
      sku: 'PIN-GOL-001',
      descripcion: 'Piña golden sweet hawaiana',
      categoriaId: categorias[1].id,
      unidadMedidaId: unidades[1].id, // und
      precio: 8.50,
      stock: 0,
      stockMinimo: 20,
      perecedero: true,
      diasVencimiento: 12
    },
    // VERDURAS DE HOJA
    {
      nombre: 'Lechuga Americana',
      sku: 'LEC-AME-001',
      descripcion: 'Lechuga americana hidropónica',
      categoriaId: categorias[2].id,
      unidadMedidaId: unidades[1].id, // und
      precio: 2.50,
      stock: 0,
      stockMinimo: 40,
      perecedero: true,
      diasVencimiento: 7
    },
    {
      nombre: 'Espinaca Baby',
      sku: 'ESP-BAB-001',
      descripcion: 'Espinaca baby orgánica',
      categoriaId: categorias[2].id,
      unidadMedidaId: unidades[0].id, // kg
      precio: 12.00,
      stock: 0,
      stockMinimo: 15,
      perecedero: true,
      diasVencimiento: 5
    },
    // VERDURAS DE FRUTO
    {
      nombre: 'Tomate Italiano',
      sku: 'TOM-ITA-001',
      descripcion: 'Tomate italiano fresco de invernadero',
      categoriaId: categorias[3].id,
      unidadMedidaId: unidades[0].id, // kg
      precio: 4.80,
      stock: 0,
      stockMinimo: 35,
      perecedero: true,
      diasVencimiento: 8
    },
    {
      nombre: 'Pimiento Rojo',
      sku: 'PIM-ROJ-001',
      descripcion: 'Pimiento rojo dulce nacional',
      categoriaId: categorias[3].id,
      unidadMedidaId: unidades[0].id, // kg
      precio: 7.20,
      stock: 0,
      stockMinimo: 20,
      perecedero: true,
      diasVencimiento: 10
    },
    // TUBÉRCULOS
    {
      nombre: 'Papa Blanca Huánuco',
      sku: 'PAP-BLA-001',
      descripcion: 'Papa blanca de Huánuco primera calidad',
      categoriaId: categorias[4].id,
      unidadMedidaId: unidades[3].id, // saco
      precio: 85.00,
      stock: 0,
      stockMinimo: 10,
      perecedero: false
    },
    {
      nombre: 'Camote Naranja',
      sku: 'CAM-NAR-001',
      descripcion: 'Camote naranja dulce de Cañete',
      categoriaId: categorias[4].id,
      unidadMedidaId: unidades[0].id, // kg
      precio: 3.20,
      stock: 0,
      stockMinimo: 25,
      perecedero: false
    }
  ];

  for (const data of productosData) {
    const producto = await prisma.producto.upsert({
      where: { sku: data.sku },
      update: {},
      create: data
    });
    productos.push(producto);
  }

  console.log('✅ Productos creados:', productos.length);

  // 7. CREAR PEDIDOS DE COMPRA REALISTAS
  console.log('📦 Creando pedidos de compra...');
  
  // Pedido 1: Compra grande de frutas cítricas
  const fechaPedido1 = new Date('2025-09-01');
  const pedidoCompra1 = await prisma.pedidoCompra.upsert({
    where: { numero: 'PC-2025-001' },
    update: {},
    create: {
      numero: 'PC-2025-001',
      proveedorId: proveedores[0].id, // Mercado Central
      fecha: fechaPedido1,
      fechaEntrega: new Date('2025-09-03'),
      estado: 'COMPLETADO',
      observaciones: 'Pedido semanal de frutas cítricas',
      numeroGuia: 'GR-001-2025',
      usuarioId: admin.id,
      items: {
        create: [
          {
            productoId: productos[0].id, // Naranja Valencia
            cantidad: 150,
            precio: 3.20,
            subtotal: 480.00
          },
          {
            productoId: productos[1].id, // Limón Sutil
            cantidad: 80,
            precio: 3.80,
            subtotal: 304.00
          }
        ]
      }
    }
  });

  // Calcular totales del pedido 1
  const subtotal1 = 480.00 + 304.00;
  const impuestos1 = subtotal1 * 0.18;
  const total1 = subtotal1 + impuestos1;

  await prisma.pedidoCompra.update({
    where: { id: pedidoCompra1.id },
    data: {
      subtotal: subtotal1,
      impuestos: impuestos1,
      total: total1
    }
  });

  // Pedido 2: Compra de frutas tropicales
  const fechaPedido2 = new Date('2025-09-02');
  const pedidoCompra2 = await prisma.pedidoCompra.upsert({
    where: { numero: 'PC-2025-002' },
    update: {},
    create: {
      numero: 'PC-2025-002',
      proveedorId: proveedores[1].id, // Agrícola San José
      fecha: fechaPedido2,
      fechaEntrega: new Date('2025-09-04'),
      estado: 'COMPLETADO',
      observaciones: 'Frutas tropicales premium',
      numeroGuia: 'GR-002-2025',
      usuarioId: admin.id,
      items: {
        create: [
          {
            productoId: productos[2].id, // Mango Kent
            cantidad: 60,
            precio: 6.50,
            subtotal: 390.00
          },
          {
            productoId: productos[3].id, // Piña Golden
            cantidad: 40,
            precio: 8.00,
            subtotal: 320.00
          }
        ]
      }
    }
  });

  const subtotal2 = 390.00 + 320.00;
  const impuestos2 = subtotal2 * 0.18;
  const total2 = subtotal2 + impuestos2;

  await prisma.pedidoCompra.update({
    where: { id: pedidoCompra2.id },
    data: {
      subtotal: subtotal2,
      impuestos: impuestos2,
      total: total2
    }
  });

  // Pedido 3: Compra de verduras
  const fechaPedido3 = new Date('2025-09-05');
  const pedidoCompra3 = await prisma.pedidoCompra.upsert({
    where: { numero: 'PC-2025-003' },
    update: {},
    create: {
      numero: 'PC-2025-003',
      proveedorId: proveedores[2].id, // Valle Verde
      fecha: fechaPedido3,
      fechaEntrega: new Date('2025-09-06'),
      estado: 'COMPLETADO',
      observaciones: 'Verduras frescas orgánicas',
      numeroGuia: 'GR-003-2025',
      usuarioId: admin.id,
      items: {
        create: [
          {
            productoId: productos[4].id, // Lechuga Americana
            cantidad: 100,
            precio: 2.20,
            subtotal: 220.00
          },
          {
            productoId: productos[5].id, // Espinaca Baby
            cantidad: 25,
            precio: 11.50,
            subtotal: 287.50
          },
          {
            productoId: productos[6].id, // Tomate Italiano
            cantidad: 70,
            precio: 4.50,
            subtotal: 315.00
          },
          {
            productoId: productos[8].id, // Papa Blanca
            cantidad: 15,
            precio: 82.00,
            subtotal: 1230.00
          }
        ]
      }
    }
  });

  const subtotal3 = 220.00 + 287.50 + 315.00 + 1230.00;
  const impuestos3 = subtotal3 * 0.18;
  const total3 = subtotal3 + impuestos3;

  await prisma.pedidoCompra.update({
    where: { id: pedidoCompra3.id },
    data: {
      subtotal: subtotal3,
      impuestos: impuestos3,
      total: total3
    }
  });

  console.log('✅ Pedidos de compra creados: 3');

  // 8. CREAR MOVIMIENTOS DE INVENTARIO POR LAS COMPRAS
  console.log('📈 Actualizando inventario por compras...');

  const movimientosCompra = [
    // Movimientos del Pedido 1
    {
      productoId: productos[0].id,
      tipo: 'ENTRADA' as const,
      cantidad: 150,
      cantidadAnterior: 0,
      cantidadNueva: 150,
      precio: 3.20,
      motivo: 'Compra a proveedor - Pedido PC-2025-001',
      numeroGuia: 'GR-001-2025',
      pedidoCompraId: pedidoCompra1.id,
      usuarioId: admin.id
    },
    {
      productoId: productos[1].id,
      tipo: 'ENTRADA' as const,
      cantidad: 80,
      cantidadAnterior: 0,
      cantidadNueva: 80,
      precio: 3.80,
      motivo: 'Compra a proveedor - Pedido PC-2025-001',
      numeroGuia: 'GR-001-2025',
      pedidoCompraId: pedidoCompra1.id,
      usuarioId: admin.id
    },
    // Movimientos del Pedido 2
    {
      productoId: productos[2].id,
      tipo: 'ENTRADA' as const,
      cantidad: 60,
      cantidadAnterior: 0,
      cantidadNueva: 60,
      precio: 6.50,
      motivo: 'Compra a proveedor - Pedido PC-2025-002',
      numeroGuia: 'GR-002-2025',
      pedidoCompraId: pedidoCompra2.id,
      usuarioId: admin.id
    },
    {
      productoId: productos[3].id,
      tipo: 'ENTRADA' as const,
      cantidad: 40,
      cantidadAnterior: 0,
      cantidadNueva: 40,
      precio: 8.00,
      motivo: 'Compra a proveedor - Pedido PC-2025-002',
      numeroGuia: 'GR-002-2025',
      pedidoCompraId: pedidoCompra2.id,
      usuarioId: admin.id
    },
    // Movimientos del Pedido 3
    {
      productoId: productos[4].id,
      tipo: 'ENTRADA' as const,
      cantidad: 100,
      cantidadAnterior: 0,
      cantidadNueva: 100,
      precio: 2.20,
      motivo: 'Compra a proveedor - Pedido PC-2025-003',
      numeroGuia: 'GR-003-2025',
      pedidoCompraId: pedidoCompra3.id,
      usuarioId: admin.id
    },
    {
      productoId: productos[5].id,
      tipo: 'ENTRADA' as const,
      cantidad: 25,
      cantidadAnterior: 0,
      cantidadNueva: 25,
      precio: 11.50,
      motivo: 'Compra a proveedor - Pedido PC-2025-003',
      numeroGuia: 'GR-003-2025',
      pedidoCompraId: pedidoCompra3.id,
      usuarioId: admin.id
    },
    {
      productoId: productos[6].id,
      tipo: 'ENTRADA' as const,
      cantidad: 70,
      cantidadAnterior: 0,
      cantidadNueva: 70,
      precio: 4.50,
      motivo: 'Compra a proveedor - Pedido PC-2025-003',
      numeroGuia: 'GR-003-2025',
      pedidoCompraId: pedidoCompra3.id,
      usuarioId: admin.id
    },
    {
      productoId: productos[8].id,
      tipo: 'ENTRADA' as const,
      cantidad: 15,
      cantidadAnterior: 0,
      cantidadNueva: 15,
      precio: 82.00,
      motivo: 'Compra a proveedor - Pedido PC-2025-003',
      numeroGuia: 'GR-003-2025',
      pedidoCompraId: pedidoCompra3.id,
      usuarioId: admin.id
    }
  ];

  for (const movimiento of movimientosCompra) {
    await prisma.movimientoInventario.create({
      data: movimiento
    });
    
    // Actualizar stock del producto
    await prisma.producto.update({
      where: { id: movimiento.productoId },
      data: { stock: movimiento.cantidadNueva }
    });
  }

  console.log('✅ Movimientos de inventario (compras) creados:', movimientosCompra.length);

  // 9. CREAR CUENTAS POR PAGAR (DE LAS COMPRAS)
  console.log('💳 Creando cuentas por pagar...');

  const cuentasPorPagar = [
    {
      numero: 'CPP-2025-001',
      proveedorId: proveedores[0].id,
      pedidoCompraId: pedidoCompra1.id,
      monto: total1,
      saldo: total1,
      fechaVencimiento: new Date('2025-09-18'), // 15 días
      estado: 'PENDIENTE' as const,
      observaciones: 'Pago a 15 días - Frutas cítricas',
      usuarioId: admin.id
    },
    {
      numero: 'CPP-2025-002',
      proveedorId: proveedores[1].id,
      pedidoCompraId: pedidoCompra2.id,
      monto: total2,
      saldo: total2 * 0.4, // Pagado 60%
      montoAbonado: total2 * 0.6,
      fechaVencimiento: new Date('2025-09-17'),
      estado: 'PARCIAL' as const,
      observaciones: 'Pago parcial realizado - Frutas tropicales',
      usuarioId: admin.id
    },
    {
      numero: 'CPP-2025-003',
      proveedorId: proveedores[2].id,
      pedidoCompraId: pedidoCompra3.id,
      monto: total3,
      saldo: 0,
      montoAbonado: total3,
      fechaVencimiento: new Date('2025-09-20'),
      estado: 'PAGADO' as const,
      observaciones: 'Pago completo al contado - Verduras orgánicas',
      usuarioId: admin.id
    }
  ];

  for (const cuenta of cuentasPorPagar) {
    await prisma.cuentaPorPagar.create({
      data: cuenta
    });
  }

  console.log('✅ Cuentas por pagar creadas:', cuentasPorPagar.length);

  // 10. CREAR PEDIDOS DE VENTA (CON STOCK ACTUAL)
  console.log('🛒 Creando pedidos de venta...');

  // Venta 1: A supermercado mayorista
  const fechaVenta1 = new Date('2025-09-07');
  const pedidoVenta1 = await prisma.pedidoVenta.upsert({
    where: { numero: 'PV-2025-001' },
    update: {},
    create: {
      numero: 'PV-2025-001',
      clienteId: clientes[0].id, // Plaza Vea
      fecha: fechaVenta1,
      fechaEntrega: new Date('2025-09-08'),
      estado: 'COMPLETADO',
      observaciones: 'Pedido semanal supermercado',
      numeroGuia: 'GV-001-2025',
      usuarioId: admin.id,
      items: {
        create: [
          {
            productoId: productos[0].id, // Naranja Valencia
            cantidad: 80,
            precio: 3.50,
            subtotal: 280.00
          },
          {
            productoId: productos[2].id, // Mango Kent
            cantidad: 30,
            precio: 6.80,
            subtotal: 204.00
          },
          {
            productoId: productos[4].id, // Lechuga
            cantidad: 50,
            precio: 2.50,
            subtotal: 125.00
          }
        ]
      }
    }
  });

  const subtotalV1 = 280.00 + 204.00 + 125.00;
  const impuestosV1 = subtotalV1 * 0.18;
  const totalV1 = subtotalV1 + impuestosV1;

  await prisma.pedidoVenta.update({
    where: { id: pedidoVenta1.id },
    data: {
      subtotal: subtotalV1,
      impuestos: impuestosV1,
      total: totalV1
    }
  });

  // Venta 2: A restaurante
  const fechaVenta2 = new Date('2025-09-08');
  const pedidoVenta2 = await prisma.pedidoVenta.upsert({
    where: { numero: 'PV-2025-002' },
    update: {},
    create: {
      numero: 'PV-2025-002',
      clienteId: clientes[2].id, // Restaurante El Sabor
      fecha: fechaVenta2,
      fechaEntrega: new Date('2025-09-09'),
      estado: 'COMPLETADO',
      observaciones: 'Pedido restaurante - productos frescos',
      numeroGuia: 'GV-002-2025',
      usuarioId: admin.id,
      items: {
        create: [
          {
            productoId: productos[1].id, // Limón Sutil
            cantidad: 15,
            precio: 4.20,
            subtotal: 63.00
          },
          {
            productoId: productos[5].id, // Espinaca Baby
            cantidad: 8,
            precio: 12.00,
            subtotal: 96.00
          },
          {
            productoId: productos[6].id, // Tomate Italiano
            cantidad: 25,
            precio: 4.80,
            subtotal: 120.00
          }
        ]
      }
    }
  });

  const subtotalV2 = 63.00 + 96.00 + 120.00;
  const impuestosV2 = subtotalV2 * 0.18;
  const totalV2 = subtotalV2 + impuestosV2;

  await prisma.pedidoVenta.update({
    where: { id: pedidoVenta2.id },
    data: {
      subtotal: subtotalV2,
      impuestos: impuestosV2,
      total: totalV2
    }
  });

  console.log('✅ Pedidos de venta creados: 2');

  // 11. CREAR MOVIMIENTOS DE INVENTARIO POR VENTAS
  console.log('📉 Actualizando inventario por ventas...');

  const movimientosVenta = [
    // Movimientos de Venta 1
    {
      productoId: productos[0].id, // Naranja
      stockAnterior: 150,
      cantidad: 80,
      stockNuevo: 70
    },
    {
      productoId: productos[2].id, // Mango
      stockAnterior: 60,
      cantidad: 30,
      stockNuevo: 30
    },
    {
      productoId: productos[4].id, // Lechuga
      stockAnterior: 100,
      cantidad: 50,
      stockNuevo: 50
    },
    // Movimientos de Venta 2
    {
      productoId: productos[1].id, // Limón
      stockAnterior: 80,
      cantidad: 15,
      stockNuevo: 65
    },
    {
      productoId: productos[5].id, // Espinaca
      stockAnterior: 25,
      cantidad: 8,
      stockNuevo: 17
    },
    {
      productoId: productos[6].id, // Tomate
      stockAnterior: 70,
      cantidad: 25,
      stockNuevo: 45
    }
  ];

  for (let i = 0; i < 3; i++) {
    const mov = movimientosVenta[i];
    await prisma.movimientoInventario.create({
      data: {
        productoId: mov.productoId,
        tipo: 'SALIDA',
        cantidad: mov.cantidad,
        cantidadAnterior: mov.stockAnterior,
        cantidadNueva: mov.stockNuevo,
        motivo: 'Venta a cliente - Pedido PV-2025-001',
        numeroGuia: 'GV-001-2025',
        pedidoVentaId: pedidoVenta1.id,
        usuarioId: admin.id
      }
    });

    await prisma.producto.update({
      where: { id: mov.productoId },
      data: { stock: mov.stockNuevo }
    });
  }

  for (let i = 3; i < 6; i++) {
    const mov = movimientosVenta[i];
    await prisma.movimientoInventario.create({
      data: {
        productoId: mov.productoId,
        tipo: 'SALIDA',
        cantidad: mov.cantidad,
        cantidadAnterior: mov.stockAnterior,
        cantidadNueva: mov.stockNuevo,
        motivo: 'Venta a cliente - Pedido PV-2025-002',
        numeroGuia: 'GV-002-2025',
        pedidoVentaId: pedidoVenta2.id,
        usuarioId: admin.id
      }
    });

    await prisma.producto.update({
      where: { id: mov.productoId },
      data: { stock: mov.stockNuevo }
    });
  }

  console.log('✅ Movimientos de inventario (ventas) creados: 6');

  // 12. CREAR CUENTAS POR COBRAR (DE LAS VENTAS)
  console.log('💰 Creando cuentas por cobrar...');

  const cuentasPorCobrar = [
    {
      numero: 'CPC-2025-001',
      clienteId: clientes[0].id, // Plaza Vea
      pedidoVentaId: pedidoVenta1.id,
      monto: totalV1,
      saldo: 0,
      montoAbonado: totalV1,
      fechaVencimiento: new Date('2025-09-22'), // 15 días
      estado: 'PAGADO' as const,
      observaciones: 'Pago al contado - Supermercado Plaza Vea',
      usuarioId: admin.id
    },
    {
      numero: 'CPC-2025-002',
      clienteId: clientes[2].id, // Restaurante
      pedidoVentaId: pedidoVenta2.id,
      monto: totalV2,
      saldo: totalV2,
      fechaVencimiento: new Date('2025-09-23'),
      estado: 'PENDIENTE' as const,
      observaciones: 'Pago a 15 días - Restaurante El Sabor',
      usuarioId: admin.id
    }
  ];

  for (const cuenta of cuentasPorCobrar) {
    await prisma.cuentaPorCobrar.create({
      data: cuenta
    });
  }

  console.log('✅ Cuentas por cobrar creadas:', cuentasPorCobrar.length);

  // 13. CREAR ALGUNOS PAGOS
  console.log('💸 Creando registros de pagos...');

  // Pago parcial de cuenta por pagar
  await prisma.pagoCuentaPorPagar.create({
    data: {
      cuentaPorPagarId: (await prisma.cuentaPorPagar.findFirst({ where: { numero: 'CPP-2025-002' } }))!.id,
      monto: total2 * 0.6,
      fechaPago: new Date('2025-09-10'),
      metodoPago: 'TRANSFERENCIA',
      numeroTransaccion: 'TXN-001-2025',
      observaciones: 'Pago parcial 60% - Frutas tropicales',
      usuarioId: admin.id
    }
  });

  // Pago completo de cuenta por pagar
  await prisma.pagoCuentaPorPagar.create({
    data: {
      cuentaPorPagarId: (await prisma.cuentaPorPagar.findFirst({ where: { numero: 'CPP-2025-003' } }))!.id,
      monto: total3,
      fechaPago: new Date('2025-09-06'),
      metodoPago: 'EFECTIVO',
      observaciones: 'Pago al contado - Verduras orgánicas',
      usuarioId: admin.id
    }
  });

  // Pago de cuenta por cobrar
  await prisma.pagoCuentaPorCobrar.create({
    data: {
      cuentaPorCobrarId: (await prisma.cuentaPorCobrar.findFirst({ where: { numero: 'CPC-2025-001' } }))!.id,
      monto: totalV1,
      fechaPago: new Date('2025-09-08'),
      metodoPago: 'TRANSFERENCIA',
      numeroTransaccion: 'RXN-001-2025',
      observaciones: 'Pago al contado - Plaza Vea',
      usuarioId: admin.id
    }
  });

  console.log('✅ Pagos registrados: 3');

  // RESUMEN FINAL
  console.log('\n🎉 ¡SEED COMPLETO DEL SISTEMA TODAFRU!');
  console.log('=====================================');
  console.log('✅ Usuario admin: admin@todafru.com / admin123');
  console.log('✅ Categorías:', categorias.length);
  console.log('✅ Unidades de medida:', unidades.length);
  console.log('✅ Proveedores:', proveedores.length);
  console.log('✅ Clientes:', clientes.length);
  console.log('✅ Productos:', productos.length);
  console.log('✅ Pedidos de compra: 3 (todos completados)');
  console.log('✅ Pedidos de venta: 2 (ambos completados)');
  console.log('✅ Movimientos de inventario:', movimientosCompra.length + 6);
  console.log('✅ Cuentas por pagar: 3 (1 pendiente, 1 parcial, 1 pagada)');
  console.log('✅ Cuentas por cobrar: 2 (1 pagada, 1 pendiente)');
  console.log('✅ Pagos registrados: 3');
  console.log('\n🔄 FLUJO DE NEGOCIO COMPLETAMENTE INTEGRADO:');
  console.log('   📦 Compras → 📈 Inventario → 🛒 Ventas → 💰 Cuentas');
  console.log('\n🌐 Acceso: http://localhost:3002/dashboard');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });