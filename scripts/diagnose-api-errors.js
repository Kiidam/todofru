const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn', 'info'],
});

async function diagnoseApiErrors() {
  console.log('🔍 Diagnosticando errores de API...\n');

  try {
    // 1. Verificar conexión a la base de datos
    console.log('1. Verificando conexión a la base de datos...');
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos exitosa\n');

    // 2. Verificar estructura de tablas
    console.log('2. Verificando estructura de tablas...');
    
    // Verificar tabla PedidoVenta
    const pedidosVenta = await prisma.pedidoVenta.findMany({
      take: 1,
      include: {
        cliente: true,
        usuario: true,
        items: {
          include: {
            producto: true
          }
        }
      }
    });
    console.log('✅ Tabla PedidoVenta accesible');

    // Verificar tabla PedidoCompra
    const pedidosCompra = await prisma.pedidoCompra.findMany({
      take: 1,
      include: {
        proveedor: true,
        usuario: true,
        items: {
          include: {
            producto: true
          }
        }
      }
    });
    console.log('✅ Tabla PedidoCompra accesible\n');

    // 3. Verificar datos de ejemplo
    console.log('3. Verificando datos de ejemplo...');
    
    const clienteCount = await prisma.cliente.count();
    const proveedorCount = await prisma.proveedor.count();
    const userCount = await prisma.user.count();
    const productoCount = await prisma.producto.count();

    console.log(`- Clientes: ${clienteCount}`);
    console.log(`- Proveedores: ${proveedorCount}`);
    console.log(`- Usuarios: ${userCount}`);
    console.log(`- Productos: ${productoCount}\n`);

    // 4. Simular consulta de API de ventas
    console.log('4. Simulando consulta de API de ventas...');
    try {
      const ventasQuery = await prisma.pedidoVenta.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              ruc: true
            }
          },
          usuario: {
            select: {
              id: true,
              name: true
            }
          },
          items: {
            include: {
              producto: {
                select: {
                  id: true,
                  nombre: true,
                  precio: true
                }
              }
            }
          }
        }
      });
      console.log(`✅ Consulta de ventas exitosa: ${ventasQuery.length} registros`);
    } catch (error) {
      console.log('❌ Error en consulta de ventas:', error.message);
      console.log('Detalles del error:', error);
    }

    // 5. Simular consulta de API de compras
    console.log('\n5. Simulando consulta de API de compras...');
    try {
      const comprasQuery = await prisma.pedidoCompra.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          proveedor: {
            select: {
              id: true,
              nombre: true,
              ruc: true
            }
          },
          usuario: {
            select: {
              id: true,
              name: true
            }
          },
          items: {
            include: {
              producto: {
                select: {
                  id: true,
                  nombre: true,
                  precio: true
                }
              }
            }
          }
        }
      });
      console.log(`✅ Consulta de compras exitosa: ${comprasQuery.length} registros`);
    } catch (error) {
      console.log('❌ Error en consulta de compras:', error.message);
      console.log('Detalles del error:', error);
    }

    // 6. Verificar relaciones específicas
    console.log('\n6. Verificando relaciones específicas...');
    
    // Verificar si hay pedidos sin usuario
    const pedidosSinUsuario = await prisma.pedidoVenta.findMany({
      where: {
        usuarioId: null
      }
    });
    
    if (pedidosSinUsuario.length > 0) {
      console.log(`⚠️  Encontrados ${pedidosSinUsuario.length} pedidos de venta sin usuario`);
    } else {
      console.log('✅ Todos los pedidos de venta tienen usuario asignado');
    }

    // Verificar si hay compras sin usuario
    const comprasSinUsuario = await prisma.pedidoCompra.findMany({
      where: {
        usuarioId: null
      }
    });
    
    if (comprasSinUsuario.length > 0) {
      console.log(`⚠️  Encontrados ${comprasSinUsuario.length} pedidos de compra sin usuario`);
    } else {
      console.log('✅ Todos los pedidos de compra tienen usuario asignado');
    }

  } catch (error) {
    console.log('❌ Error general:', error.message);
    console.log('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseApiErrors().catch(console.error);