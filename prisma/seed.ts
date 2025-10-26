import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando seed completo del sistema TODAFRU...');
  
  // 1. CREAR USUARIO ADMINISTRADOR
  const hashedPassword = await hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@todafru.com' },
    update: {},
    create: {
      id: randomUUID(),
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
      create: { id: randomUUID(), nombre: 'Frutas Cítricas', descripcion: 'Naranjas, limones, mandarinas' }
    }),
    prisma.categoria.upsert({
      where: { nombre: 'Frutas Tropicales' },
      update: {},
      create: { id: randomUUID(), nombre: 'Frutas Tropicales', descripcion: 'Mango, piña, papaya' }
    }),
    prisma.categoria.upsert({
      where: { nombre: 'Verduras de Hoja' },
      update: {},
      create: { id: randomUUID(), nombre: 'Verduras de Hoja', descripcion: 'Lechuga, espinaca, acelga' }
    }),
    prisma.categoria.upsert({
      where: { nombre: 'Verduras de Fruto' },
      update: {},
      create: { id: randomUUID(), nombre: 'Verduras de Fruto', descripcion: 'Tomate, pepino, pimientos' }
    }),
    prisma.categoria.upsert({
      where: { nombre: 'Tubérculos' },
      update: {},
      create: { id: randomUUID(), nombre: 'Tubérculos', descripcion: 'Papa, camote, yuca' }
    })
  ]);

  console.log('✅ Categorías creadas:', categorias.length);

  // 3. CREAR UNIDADES DE MEDIDA
  const unidades = await Promise.all([
    prisma.unidadMedida.upsert({
      where: { simbolo: 'kg' },
      update: {},
      create: { id: randomUUID(), nombre: 'Kilogramo', simbolo: 'kg' }
    }),
    prisma.unidadMedida.upsert({
      where: { simbolo: 'und' },
      update: {},
      create: { id: randomUUID(), nombre: 'Unidad', simbolo: 'und' }
    }),
    prisma.unidadMedida.upsert({
      where: { simbolo: 'caja' },
      update: {},
      create: { id: randomUUID(), nombre: 'Caja', simbolo: 'caja' }
    }),
    prisma.unidadMedida.upsert({
      where: { simbolo: 'saco' },
      update: {},
      create: { id: randomUUID(), nombre: 'Saco', simbolo: 'saco' }
    }),
    prisma.unidadMedida.upsert({
      where: { simbolo: 'docena' },
      update: {},
      create: { id: randomUUID(), nombre: 'Docena', simbolo: 'docena' }
    })
  ]);

  console.log('✅ Unidades de medida creadas:', unidades.length);

  // 3.1. TIPOS DE ARTÍCULO - COMENTADO: Modelo no existe en schema actual
  // const tiposArticulo = await Promise.all([...]);
  // console.log('✅ Tipos de artículo creados:', tiposArticulo.length);

  // 3.2. FAMILIAS - COMENTADO: Modelo no existe en schema actual
  // const familias = await Promise.all([...]);
  // console.log('✅ Familias creadas:', familias.length);

  // 3.3. SUBFAMILIAS - COMENTADO: Modelo no existe en schema actual
  // const subfamilias = await Promise.all([...]);
  // console.log('✅ Subfamilias creadas:', subfamilias.length);

  // 3.4. MARCAS - COMENTADO: Modelo no existe en schema actual
  // const marcas = await Promise.all([...]);
  // console.log('✅ Marcas creadas:', marcas.length);

  // 3.5. AGRUPADORES - COMENTADO: Modelo no existe en schema actual
  // const agrupadores = await Promise.all([...]);
  // console.log('✅ Agrupadores creados:', agrupadores.length);

  // 3.6. RAZONES SOCIALES - COMENTADO: Modelo no existe en schema actual
  // const razonesSociales = await Promise.all([...]);
  // console.log('✅ Razones sociales creadas:', razonesSociales.length);

  // 4. CREAR PROVEEDORES
  const proveedores = [];
  const proveedorData = [
    {
      id: 'prov-001',
      nombre: 'Mercado Mayorista Central Lima',
      numeroIdentificacion: '20123456789',
      telefono: '01-4567890',
      email: 'ventas@mercadocentral.pe',
      direccion: 'Av. Aviación 2085, San Luis',
      
    },
    {
      id: 'prov-002',
      nombre: 'Agrícola San José S.A.C.',
      numeroIdentificacion: '20987654321',
      telefono: '01-9876543',
      email: 'compras@agricolasanjose.com',
      direccion: 'Km 35 Carretera Central, Huarochirí',
      
    },
    {
      id: 'prov-003',
      nombre: 'Frutícola Valle Verde',
      numeroIdentificacion: '20555666777',
      telefono: '01-5556667',
      email: 'administracion@valleverde.pe',
      direccion: 'Av. Los Frutales 850, Cañete',
      
    }
  ];

  for (const data of proveedorData) {
    const proveedor = await prisma.proveedor.upsert({
      where: { numeroIdentificacion: data.numeroIdentificacion },
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
      id: 'cli-001',
      nombre: 'Supermercados Plaza Vea',
      ruc: '20111222333',
      telefono: '01-2223334',
      email: 'compras@plazavea.com.pe',
      direccion: 'Av. Brasil 789, Breña, Lima',
      contacto: 'Ana López Vargas',
      tipoCliente: 'MAYORISTA' as const
    },
    {
      id: 'cli-002',
      nombre: 'Wong Supermercados',
      ruc: '20444555666',
      telefono: '01-5556667',
      email: 'proveedores@wong.pe',
      direccion: 'Av. Javier Prado 1235, San Isidro',
      contacto: 'Pedro Fernández Castro',
      tipoCliente: 'MAYORISTA' as const
    },
    {
      id: 'cli-003',
      nombre: 'Restaurante El Sabor Peruano',
      ruc: '20777888999',
      telefono: '01-7778889',
      email: 'chef@elsaborperuano.com',
      direccion: 'Calle Los Olivos 321, Miraflores',
      contacto: 'Carmen Quispe Huamán',
      tipoCliente: 'MINORISTA' as const
    },
    {
      id: 'cli-004',
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
      id: 'prod-001',
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
      id: 'prod-002',
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
      id: 'prod-003',
      nombre: 'Mango Kent',
      sku: 'MAN-KEN-001',
      descripcion: 'Mango kent dulce de exportación',
      categoriaId: categorias[1].id,
      unidadMedidaId: unidades[0].id, // kg
      precio: 6.80,
      stock: 0,
      stockMinimo: 40,
      perecedero: true,
      diasVencimiento: 10
    },
    {
      id: 'prod-004',
      nombre: 'Piña Golden',
      sku: 'PIN-GOL-001',
      descripcion: 'Piña golden sweet de Chanchamayo',
      categoriaId: categorias[1].id,
      unidadMedidaId: unidades[1].id, // unidad
      precio: 8.50,
      stock: 0,
      stockMinimo: 25,
      perecedero: true,
      diasVencimiento: 12
    },
    // VERDURAS DE HOJA
    {
      id: 'prod-005',
      nombre: 'Lechuga Americana',
      sku: 'LEC-AME-001',
      descripcion: 'Lechuga americana hidropónica',
      categoriaId: categorias[2].id,
      unidadMedidaId: unidades[0].id, // kg
      precio: 2.50,
      stock: 0,
      stockMinimo: 40,
      perecedero: true,
      diasVencimiento: 7
    },
    {
      id: 'prod-006',
      nombre: 'Espinaca Baby',
      sku: 'ESP-BAB-001',
      descripcion: 'Espinaca baby orgánico',
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
      id: 'prod-007',
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
      id: 'prod-008',
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
      id: 'prod-009',
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
      id: 'prod-010',
      nombre: 'Camote Amarillo',
      sku: 'CAM-AMA-001',
      descripcion: 'Camote amarillo dulce de Cañete',
      categoriaId: categorias[4].id,
      unidadMedidaId: unidades[0].id, // kg
      precio: 3.80,
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
      id: 'pc-001',
      numero: 'PC-2025-001',
      proveedorId: proveedores[0].id, // Mercado Central
      fecha: fechaPedido1,
      fechaEntrega: new Date('2025-09-03'),
      observaciones: 'Pedido semanal de frutas cítricas',
      numeroGuia: 'GR-001-2025',
      usuarioId: admin.id,
      items: {
        create: [
          {
            id: 'pci-001',
            productoId: productos[0].id, // Naranja Valencia
            cantidad: 150,
            precio: 3.20,
            subtotal: 480.00
          },
          {
            id: 'pci-002',
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
      id: 'pc-002',
      numero: 'PC-2025-002',
      proveedorId: proveedores[1].id, // Agrícola San José
      fecha: fechaPedido2,
      fechaEntrega: new Date('2025-09-04'),
      observaciones: 'Frutas tropicales premium',
      numeroGuia: 'GR-002-2025',
      usuarioId: admin.id,
      items: {
        create: [
          {
            id: 'pci-003',
            productoId: productos[2].id, // Mango Kent
            cantidad: 60,
            precio: 6.50,
            subtotal: 390.00
          },
          {
            id: 'pci-004',
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
      id: 'pc-003',
      numero: 'PC-2025-003',
      proveedorId: proveedores[2].id, // Valle Verde
      fecha: fechaPedido3,
      fechaEntrega: new Date('2025-09-06'),
      observaciones: 'Verduras frescas orgánicas',
      numeroGuia: 'GR-003-2025',
      usuarioId: admin.id,
      items: {
        create: [
          {
            id: 'pci-005',
            productoId: productos[4].id, // Lechuga Americana
            cantidad: 100,
            precio: 2.20,
            subtotal: 220.00
          },
          {
            id: 'pci-006',
            productoId: productos[5].id, // Espinaca Baby
            cantidad: 25,
            precio: 11.50,
            subtotal: 287.50
          },
          {
            id: 'pci-007',
            productoId: productos[6].id, // Tomate Italiano
            cantidad: 70,
            precio: 4.50,
            subtotal: 315.00
          },
          {
            id: 'pci-008',
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

  // 9. CUENTAS POR PAGAR (SALTADO - MODELO NO IMPLEMENTADO)
  console.log('💳 Saltando cuentas por pagar (modelo no implementado en el esquema actual)...');

  // 10. CREAR PEDIDOS DE VENTA (CON STOCK ACTUAL)
  console.log('🛒 Creando pedidos de venta...');

  // Venta 1: A supermercado mayorista
  const fechaVenta1 = new Date('2025-09-07');
  const pedidoVenta1 = await prisma.pedidoVenta.upsert({
    where: { numero: 'PV-2025-001' },
    update: {},
    create: {
      id: 'pv-001',
      numero: 'PV-2025-001',
      clienteId: clientes[0].id, // Plaza Vea
      fecha: fechaVenta1,
      estado: 'COMPLETADO',
      observaciones: 'Pedido semanal supermercado',
      numeroGuia: 'GV-001-2025',
      usuarioId: admin.id,
      items: {
        create: [
          {
            id: 'pvi-001',
            productoId: productos[0].id, // Naranja Valencia
            cantidad: 80,
            precio: 3.50,
            subtotal: 280.00
          },
          {
            id: 'pvi-002',
            productoId: productos[2].id, // Mango Kent
            cantidad: 30,
            precio: 6.80,
            subtotal: 204.00
          },
          {
            id: 'pvi-003',
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
      id: 'pv-002',
      numero: 'PV-2025-002',
      clienteId: clientes[2].id, // Restaurante El Sabor
      fecha: fechaVenta2,
      estado: 'COMPLETADO',
      observaciones: 'Pedido restaurante - productos frescos',
      numeroGuia: 'GV-002-2025',
      usuarioId: admin.id,
      items: {
        create: [
          {
            id: 'pvi-004',
            productoId: productos[1].id, // Limón Sutil
            cantidad: 15,
            precio: 4.20,
            subtotal: 63.00
          },
          {
            id: 'pvi-005',
            productoId: productos[5].id, // Espinaca Baby
            cantidad: 8,
            precio: 12.00,
            subtotal: 96.00
          },
          {
            id: 'pvi-006',
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

  // 12. CUENTAS POR COBRAR (SALTADO - MODELO NO IMPLEMENTADO)
  console.log('💰 Saltando cuentas por cobrar (modelo no implementado en el esquema actual)...');

  // 13. PAGOS (SALTADO - MODELOS NO IMPLEMENTADOS)
  console.log('💸 Saltando registros de pagos (modelos no implementados en el esquema actual)...');

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
  console.log('⚠️  Cuentas por pagar: Saltadas (modelo no implementado)');
  console.log('⚠️  Cuentas por cobrar: Saltadas (modelo no implementado)');
  console.log('⚠️  Pagos: Saltados (modelos no implementados)');
  console.log('\n🔄 FLUJO DE NEGOCIO BÁSICO IMPLEMENTADO:');
  console.log('   📦 Compras → 📈 Inventario → 🛒 Ventas');
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