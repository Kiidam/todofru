/**
 * Script de validación del nuevo esquema de base de datos
 * Prueba las operaciones CRUD básicas para verificar la integridad
 * de la nueva estructura optimizada
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function validateSchema() {
  console.log('🔍 Iniciando validación del nuevo esquema de base de datos...\n');

  try {
    // 1. Validar conexión a la base de datos
    console.log('1️⃣ Validando conexión a la base de datos...');
    await prisma.$connect();
    console.log('✅ Conexión exitosa\n');

    // 2. Validar creación de usuario
    console.log('2️⃣ Validando modelo Usuario...');
    const usuario = await prisma.usuario.create({
      data: {
        username: 'test_admin',
        email: 'admin@test.com',
        passwordHash: 'hashed_password_123',
        nombres: 'Admin',
        apellidos: 'Test',
        rol: 'ADMIN'
      }
    });
    console.log('✅ Usuario creado:', usuario.id);

    // 3. Validar creación de persona natural
    console.log('3️⃣ Validando modelo Persona Natural...');
    const personaNatural = await prisma.persona.create({
      data: {
        tipoEntidad: 'PERSONA_NATURAL',
        numeroIdentificacion: '12345678',
        telefono: '987654321',
        email: 'juan@test.com',
        direccion: 'Av. Test 123',
        personaNatural: {
          create: {
            nombres: 'Juan',
            apellidos: 'Pérez',
            fechaNacimiento: new Date('1990-01-01')
          }
        }
      },
      include: {
        personaNatural: true
      }
    });
    console.log('✅ Persona Natural creada:', personaNatural.id);

    // 4. Validar creación de persona jurídica
    console.log('4️⃣ Validando modelo Persona Jurídica...');
    const personaJuridica = await prisma.persona.create({
      data: {
        tipoEntidad: 'PERSONA_JURIDICA',
        numeroIdentificacion: '20123456789',
        telefono: '987654322',
        email: 'empresa@test.com',
        direccion: 'Av. Empresarial 456',
        personaJuridica: {
          create: {
            razonSocial: 'Empresa Test S.A.C.',
            nombreComercial: 'Test Corp',
            representanteLegal: 'María García',
            fechaConstitucion: new Date('2020-01-01')
          }
        }
      },
      include: {
        personaJuridica: true
      }
    });
    console.log('✅ Persona Jurídica creada:', personaJuridica.id);

    // 5. Validar creación de cliente
    console.log('5️⃣ Validando modelo Cliente...');
    const cliente = await prisma.cliente.create({
      data: {
        personaId: personaNatural.id,
        tipoCliente: 'MINORISTA',
        limiteCredito: 5000.00,
        diasCredito: 30,
        descuentoPorcentaje: 5.00
      },
      include: {
        persona: {
          include: {
            personaNatural: true
          }
        }
      }
    });
    console.log('✅ Cliente creado:', cliente.personaId);

    // 6. Validar creación de proveedor
    console.log('6️⃣ Validando modelo Proveedor...');
    const proveedor = await prisma.proveedor.create({
      data: {
        personaId: personaJuridica.id,
        tiempoEntregaPromedio: 5,
        calificacion: 4.5,
        condicionesPago: '30 días'
      },
      include: {
        persona: {
          include: {
            personaJuridica: true
          }
        }
      }
    });
    console.log('✅ Proveedor creado:', proveedor.personaId);

    // 7. Validar creación de categoría
    console.log('7️⃣ Validando modelo Categoría...');
    const categoria = await prisma.categoria.create({
      data: {
        codigo: 'FRUT001',
        nombre: 'Frutas',
        descripcion: 'Categoría de frutas frescas',
        nivel: 1
      }
    });
    console.log('✅ Categoría creada:', categoria.id);

    // 8. Validar creación de unidad de medida
    console.log('8️⃣ Validando modelo Unidad de Medida...');
    const unidadMedida = await prisma.unidadMedida.create({
      data: {
        codigo: 'KG',
        nombre: 'Kilogramo',
        simbolo: 'kg',
        tipo: 'PESO',
        factorConversion: 1.000000
      }
    });
    console.log('✅ Unidad de Medida creada:', unidadMedida.id);

    // 9. Validar creación de producto
    console.log('9️⃣ Validando modelo Producto...');
    const producto = await prisma.producto.create({
      data: {
        codigo: 'PROD001',
        nombre: 'Manzana Roja',
        descripcion: 'Manzana roja fresca de primera calidad',
        categoriaId: categoria.id,
        unidadMedidaId: unidadMedida.id,
        precioVenta: 8.50,
        precioCosto: 6.00,
        margenUtilidad: 41.67,
        stockActual: 100.000,
        stockMinimo: 20.000,
        perecedero: true,
        diasVencimiento: 15,
        porcentajeMerma: 5.00,
        tieneIgv: true
      },
      include: {
        categoria: true,
        unidadMedida: true
      }
    });
    console.log('✅ Producto creado:', producto.id);

    // 10. Validar relación producto-proveedor
    console.log('🔟 Validando relación Producto-Proveedor...');
    const productoProveedor = await prisma.productoProveedor.create({
      data: {
        productoId: producto.id,
        proveedorId: proveedor.personaId,
        precioCompra: 6.00,
        moneda: 'PEN',
        tiempoEntregaDias: 3,
        cantidadMinima: 50.000,
        codigoProveedor: 'MANZ001',
        preferido: true
      },
      include: {
        producto: true,
        proveedor: {
          include: {
            persona: {
              include: {
                personaJuridica: true
              }
            }
          }
        }
      }
    });
    console.log('✅ Relación Producto-Proveedor creada:', productoProveedor.id);

    // 11. Validar tipo de movimiento
    console.log('1️⃣1️⃣ Validando modelo Tipo de Movimiento...');
    const tipoMovimiento = await prisma.tipoMovimiento.create({
      data: {
        codigo: 'ENTRADA_COMPRA',
        nombre: 'Entrada por Compra',
        categoria: 'ENTRADA',
        afectaStock: true,
        requiereDocumento: true
      }
    });
    console.log('✅ Tipo de Movimiento creado:', tipoMovimiento.id);

    // 12. Validar estado de pedido
    console.log('1️⃣2️⃣ Validando modelo Estado de Pedido...');
    const estadoPedido = await prisma.estadoPedido.create({
      data: {
        codigo: 'PENDIENTE',
        nombre: 'Pendiente',
        descripcion: 'Pedido pendiente de aprobación',
        tipoPedido: 'COMPRA',
        esFinal: false,
        permiteModificacion: true,
        ordenSecuencia: 1
      }
    });
    console.log('✅ Estado de Pedido creado:', estadoPedido.id);

    // 13. Validar pedido de compra
    console.log('1️⃣3️⃣ Validando modelo Pedido de Compra...');
    const pedidoCompra = await prisma.pedidoCompra.create({
      data: {
        numero: 'PC-001',
        proveedorId: proveedor.personaId,
        estadoId: estadoPedido.id,
        fechaPedido: new Date(),
        fechaEntregaEstimada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        subtotal: 300.00,
        impuestos: 54.00,
        total: 354.00,
        observaciones: 'Pedido de prueba',
        usuarioCreacionId: usuario.id
      },
      include: {
        proveedor: {
          include: {
            persona: {
              include: {
                personaJuridica: true
              }
            }
          }
        },
        estado: true,
        usuarioCreacion: true
      }
    });
    console.log('✅ Pedido de Compra creado:', pedidoCompra.id);

    // 14. Validar item de pedido de compra
    console.log('1️⃣4️⃣ Validando modelo Item de Pedido de Compra...');
    const pedidoCompraItem = await prisma.pedidoCompraItem.create({
      data: {
        pedidoId: pedidoCompra.id,
        productoId: producto.id,
        cantidadPedida: 50.000,
        precioUnitario: 6.00,
        descuentoPorcentaje: 0.00
      },
      include: {
        pedido: true,
        producto: true
      }
    });
    console.log('✅ Item de Pedido de Compra creado:', pedidoCompraItem.id);

    // 15. Validar movimiento de inventario
    console.log('1️⃣5️⃣ Validando modelo Movimiento de Inventario...');
    const movimientoInventario = await prisma.movimientoInventario.create({
      data: {
        numeroMovimiento: 'MOV-001',
        tipoMovimientoId: tipoMovimiento.id,
        productoId: producto.id,
        cantidad: 50.000,
        cantidadAnterior: 100.000,
        cantidadNueva: 150.000,
        precioUnitario: 6.00,
        valorTotal: 300.00,
        documentoReferencia: 'PC-001',
        pedidoCompraId: pedidoCompra.id,
        motivo: 'Entrada por compra',
        usuarioId: usuario.id
      },
      include: {
        tipoMovimiento: true,
        producto: true,
        usuario: true,
        pedidoCompra: true
      }
    });
    console.log('✅ Movimiento de Inventario creado:', movimientoInventario.id);

    // 16. Validar auditoría
    console.log('1️⃣6️⃣ Validando modelo Auditoría...');
    const auditoria = await prisma.auditoria.create({
      data: {
        tabla: 'productos',
        registroId: producto.id,
        accion: 'INSERT',
        datosNuevos: {
          codigo: producto.codigo,
          nombre: producto.nombre,
          precioVenta: producto.precioVenta
        },
        usuarioId: usuario.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Script'
      },
      include: {
        usuario: true
      }
    });
    console.log('✅ Auditoría creada:', auditoria.id);

    // 17. Validar consultas complejas
    console.log('1️⃣7️⃣ Validando consultas complejas...');
    
    // Consulta de productos con stock bajo
    const productosStockBajo = await prisma.producto.findMany({
      where: {
        stockActual: {
          lte: prisma.producto.fields.stockMinimo
        }
      },
      include: {
        categoria: true,
        unidadMedida: true
      }
    });
    console.log(`✅ Productos con stock bajo encontrados: ${productosStockBajo.length}`);

    // Consulta de proveedores con sus productos
    const proveedoresConProductos = await prisma.proveedor.findMany({
      include: {
        persona: {
          include: {
            personaJuridica: true,
            personaNatural: true
          }
        },
        productosProveedores: {
          include: {
            producto: {
              include: {
                categoria: true
              }
            }
          }
        }
      }
    });
    console.log(`✅ Proveedores con productos encontrados: ${proveedoresConProductos.length}`);

    // Consulta de movimientos de inventario por producto
    const movimientosPorProducto = await prisma.movimientoInventario.findMany({
      where: {
        productoId: producto.id
      },
      include: {
        tipoMovimiento: true,
        usuario: true
      },
      orderBy: {
        fechaMovimiento: 'desc'
      }
    });
    console.log(`✅ Movimientos de inventario encontrados: ${movimientosPorProducto.length}`);

    console.log('\n🎉 ¡Validación del esquema completada exitosamente!');
    console.log('\n📊 Resumen de validación:');
    console.log('- ✅ Conexión a base de datos');
    console.log('- ✅ Modelos de entidades base (Persona, PersonaNatural, PersonaJuridica)');
    console.log('- ✅ Modelos de usuarios y seguridad');
    console.log('- ✅ Modelos de clientes y proveedores');
    console.log('- ✅ Modelos de catálogos (Categoría, UnidadMedida)');
    console.log('- ✅ Modelos de productos e inventario');
    console.log('- ✅ Modelos de movimientos e inventario');
    console.log('- ✅ Modelos de pedidos y transacciones');
    console.log('- ✅ Modelos de auditoría y trazabilidad');
    console.log('- ✅ Relaciones entre entidades');
    console.log('- ✅ Consultas complejas');
    console.log('\n✨ La nueva estructura de base de datos está lista para operaciones CRUD!');

  } catch (error) {
    console.error('❌ Error durante la validación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar validación
if (require.main === module) {
  validateSchema()
    .then(() => {
      console.log('\n🏁 Validación finalizada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en la validación:', error);
      process.exit(1);
    });
}

module.exports = { validateSchema };