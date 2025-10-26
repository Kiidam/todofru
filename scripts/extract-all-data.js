const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function extractAllData() {
  console.log('📊 EXTRAYENDO DATOS DE TODOS LOS MÓDULOS DEL SISTEMA TODAFRU');
  console.log('=' .repeat(70));

  try {
    // 1. USUARIOS
    console.log('\n👥 MÓDULO: USUARIOS');
    console.log('-'.repeat(30));
    const usuarios = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            compras: true,
            ventas: true,
            registros: true,
          }
        }
      }
    });
    
    console.log(`Total usuarios: ${usuarios.length}`);
    usuarios.forEach(user => {
      console.log(`  • ${user.name} (${user.email}) - Rol: ${user.role}`);
      console.log(`    Compras: ${user._count.compras}, Ventas: ${user._count.ventas}, Movimientos: ${user._count.registros}`);
    });

    // 2. CATEGORÍAS
    console.log('\n🏷️  MÓDULO: CATEGORÍAS');
    console.log('-'.repeat(30));
    const categorias = await prisma.categoria.findMany({
      include: {
        _count: {
          select: { productos: true }
        }
      }
    });
    
    console.log(`Total categorías: ${categorias.length}`);
    categorias.forEach(cat => {
      console.log(`  • ${cat.nombre} - Productos: ${cat._count.productos}`);
      console.log(`    Descripción: ${cat.descripcion || 'Sin descripción'}`);
      console.log(`    Estado: ${cat.activo ? 'Activo' : 'Inactivo'}`);
    });

    // 3. UNIDADES DE MEDIDA
    console.log('\n📏 MÓDULO: UNIDADES DE MEDIDA');
    console.log('-'.repeat(30));
    const unidades = await prisma.unidadMedida.findMany({
      include: {
        _count: {
          select: { productos: true }
        }
      }
    });
    
    console.log(`Total unidades: ${unidades.length}`);
    unidades.forEach(um => {
      console.log(`  • ${um.nombre} (${um.simbolo}) - Productos: ${um._count.productos}`);
      console.log(`    Estado: ${um.activo ? 'Activo' : 'Inactivo'}`);
    });

    // 4. PROVEEDORES
    console.log('\n🏭 MÓDULO: PROVEEDORES');
    console.log('-'.repeat(30));
    const proveedores = await prisma.proveedor.findMany({
      include: {
        _count: {
          select: { pedidosCompra: true }
        }
      }
    });
    
    console.log(`Total proveedores: ${proveedores.length}`);
    proveedores.forEach(prov => {
      console.log(`  • ${prov.nombre} - RUC: ${prov.ruc || 'Sin RUC'}`);
      console.log(`    Contacto: ${prov.telefono || 'Sin teléfono'} | ${prov.email || 'Sin email'}`);
      console.log(`    Dirección: ${prov.direccion || 'Sin dirección'}`);
      console.log(`    Pedidos de compra: ${prov._count.pedidosCompra}`);
      console.log(`    Estado: ${prov.activo ? 'Activo' : 'Inactivo'}`);
    });

    // 5. CLIENTES
    console.log('\n👥 MÓDULO: CLIENTES');
    console.log('-'.repeat(30));
    const clientes = await prisma.cliente.findMany({
      include: {
        _count: {
          select: { pedidos: true }
        }
      }
    });
    
    console.log(`Total clientes: ${clientes.length}`);
    clientes.forEach(cli => {
      console.log(`  • ${cli.nombre} - RUC: ${cli.ruc || 'Sin RUC'}`);
      console.log(`    Tipo: ${cli.tipoCliente} | Contacto: ${cli.contacto || 'Sin contacto'}`);
      console.log(`    Teléfono: ${cli.telefono || 'Sin teléfono'} | Email: ${cli.email || 'Sin email'}`);
      console.log(`    Dirección: ${cli.direccion || 'Sin dirección'}`);
      console.log(`    Pedidos de venta: ${cli._count.pedidos}`);
      console.log(`    Estado: ${cli.activo ? 'Activo' : 'Inactivo'}`);
    });

    // 6. PRODUCTOS
    console.log('\n📦 MÓDULO: PRODUCTOS');
    console.log('-'.repeat(30));
    const productos = await prisma.producto.findMany({
      include: {
        categoria: true,
        unidadMedida: true,
        _count: {
          select: { 
            comprasItems: true,
            ventasItems: true,
            movimientos: true
          }
        }
      }
    });
    
    console.log(`Total productos: ${productos.length}`);
    productos.forEach(prod => {
      console.log(`  • ${prod.nombre} (${prod.sku || 'Sin SKU'})`);
      console.log(`    Categoría: ${prod.categoria?.nombre || 'Sin categoría'}`);
      console.log(`    Unidad: ${prod.unidadMedida.nombre} (${prod.unidadMedida.simbolo})`);
      console.log(`    Precio: S/ ${prod.precio.toFixed(2)}`);
      console.log(`    Stock: ${prod.stock} ${prod.unidadMedida.simbolo} (Mínimo: ${prod.stockMinimo})`);
      console.log(`    Perecedero: ${prod.perecedero ? 'Sí' : 'No'}${prod.diasVencimiento ? ` (${prod.diasVencimiento} días)` : ''}`);
      console.log(`    Merma: ${prod.porcentajeMerma}% | IGV: ${prod.tieneIGV ? 'Sí' : 'No'}`);
      console.log(`    Transacciones: Compras ${prod._count.comprasItems}, Ventas ${prod._count.ventasItems}, Movimientos ${prod._count.movimientos}`);
      console.log(`    Estado: ${prod.activo ? 'Activo' : 'Inactivo'}`);
    });

    // 7. PEDIDOS DE COMPRA
    console.log('\n🛒 MÓDULO: PEDIDOS DE COMPRA');
    console.log('-'.repeat(30));
    const pedidosCompra = await prisma.pedidoCompra.findMany({
      include: {
        proveedor: true,
        usuario: true,
        items: {
          include: {
            producto: true
          }
        },
        _count: {
          select: { movimientos: true }
        }
      }
    });
    
    console.log(`Total pedidos de compra: ${pedidosCompra.length}`);
    pedidosCompra.forEach(pc => {
      console.log(`  • Pedido ${pc.numero} - ${pc.fecha.toLocaleDateString()}`);
      console.log(`    Proveedor: ${pc.proveedor.nombre}`);
      console.log(`    Usuario: ${pc.usuario.name}`);
      console.log(`    Total: S/ ${pc.total.toFixed(2)} (Subtotal: S/ ${pc.subtotal.toFixed(2)}, Impuestos: S/ ${pc.impuestos.toFixed(2)})`);
      console.log(`    Items: ${pc.items.length}, Movimientos generados: ${pc._count.movimientos}`);
      console.log(`    Fecha entrega: ${pc.fechaEntrega ? pc.fechaEntrega.toLocaleDateString() : 'No definida'}`);
      console.log(`    Guía: ${pc.numeroGuia || 'Sin guía'}`);
      if (pc.observaciones) console.log(`    Observaciones: ${pc.observaciones}`);
    });

    // 8. PEDIDOS DE VENTA
    console.log('\n🛍️  MÓDULO: PEDIDOS DE VENTA');
    console.log('-'.repeat(30));
    const pedidosVenta = await prisma.pedidoVenta.findMany({
      include: {
        cliente: true,
        usuario: true,
        items: {
          include: {
            producto: true
          }
        },
        _count: {
          select: { movimientos: true }
        }
      }
    });
    
    console.log(`Total pedidos de venta: ${pedidosVenta.length}`);
    pedidosVenta.forEach(pv => {
      console.log(`  • Pedido ${pv.numero} - ${pv.fecha.toLocaleDateString()}`);
      console.log(`    Cliente: ${pv.cliente.nombre} (${pv.cliente.tipoCliente})`);
      console.log(`    Usuario: ${pv.usuario.name}`);
      console.log(`    Estado: ${pv.estado}`);
      console.log(`    Total: S/ ${pv.total.toFixed(2)} (Subtotal: S/ ${pv.subtotal.toFixed(2)}, Impuestos: S/ ${pv.impuestos.toFixed(2)})`);
      console.log(`    Items: ${pv.items.length}, Movimientos generados: ${pv._count.movimientos}`);
      console.log(`    Guía: ${pv.numeroGuia || 'Sin guía'}`);
      if (pv.observaciones) console.log(`    Observaciones: ${pv.observaciones}`);
    });

    // 9. MOVIMIENTOS DE INVENTARIO
    console.log('\n📋 MÓDULO: MOVIMIENTOS DE INVENTARIO');
    console.log('-'.repeat(30));
    const movimientos = await prisma.movimientoInventario.findMany({
      include: {
        producto: true,
        usuario: true,
        pedidoCompra: true,
        pedidoVenta: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Solo los últimos 10 para no saturar
    });
    
    console.log(`Total movimientos de inventario: ${await prisma.movimientoInventario.count()}`);
    console.log(`Mostrando los últimos 10 movimientos:`);
    movimientos.forEach(mov => {
      console.log(`  • ${mov.tipo} - ${mov.producto.nombre}`);
      console.log(`    Cantidad: ${mov.cantidad} ${mov.producto.unidadMedida ? 'unidades' : ''}`);
      console.log(`    Stock anterior: ${mov.cantidadAnterior} → Stock nuevo: ${mov.cantidadNueva}`);
      console.log(`    Precio: ${mov.precio ? `S/ ${mov.precio.toFixed(2)}` : 'No especificado'}`);
      console.log(`    Motivo: ${mov.motivo || 'Sin motivo especificado'}`);
      console.log(`    Usuario: ${mov.usuario.name}`);
      console.log(`    Fecha: ${mov.createdAt.toLocaleString()}`);
      if (mov.pedidoCompra) console.log(`    Relacionado con compra: ${mov.pedidoCompra.numero}`);
      if (mov.pedidoVenta) console.log(`    Relacionado con venta: ${mov.pedidoVenta.numero}`);
      if (mov.numeroGuia) console.log(`    Guía: ${mov.numeroGuia}`);
    });

    // RESUMEN GENERAL
    console.log('\n📊 RESUMEN GENERAL DEL SISTEMA');
    console.log('='.repeat(50));
    console.log(`👥 Usuarios: ${usuarios.length}`);
    console.log(`🏷️  Categorías: ${categorias.length}`);
    console.log(`📏 Unidades de medida: ${unidades.length}`);
    console.log(`🏭 Proveedores: ${proveedores.length}`);
    console.log(`👥 Clientes: ${clientes.length}`);
    console.log(`📦 Productos: ${productos.length}`);
    console.log(`🛒 Pedidos de compra: ${pedidosCompra.length}`);
    console.log(`🛍️  Pedidos de venta: ${pedidosVenta.length}`);
    console.log(`📋 Movimientos de inventario: ${await prisma.movimientoInventario.count()}`);

    // ANÁLISIS DE INTEGRIDAD
    console.log('\n🔍 ANÁLISIS DE INTEGRIDAD DE DATOS');
    console.log('-'.repeat(40));
    
    // Productos sin categoría
    const prodSinCategoria = productos.filter(p => !p.categoria);
    if (prodSinCategoria.length > 0) {
      console.log(`⚠️  Productos sin categoría: ${prodSinCategoria.length}`);
      prodSinCategoria.forEach(p => console.log(`   - ${p.nombre}`));
    }

    // Productos con stock bajo
    const prodStockBajo = productos.filter(p => p.stock <= p.stockMinimo);
    if (prodStockBajo.length > 0) {
      console.log(`⚠️  Productos con stock bajo: ${prodStockBajo.length}`);
      prodStockBajo.forEach(p => console.log(`   - ${p.nombre}: ${p.stock}/${p.stockMinimo}`));
    }

    // Clientes/Proveedores sin RUC
    const provSinRuc = proveedores.filter(p => !p.ruc);
    const cliSinRuc = clientes.filter(c => !c.ruc);
    if (provSinRuc.length > 0) {
      console.log(`⚠️  Proveedores sin RUC: ${provSinRuc.length}`);
    }
    if (cliSinRuc.length > 0) {
      console.log(`⚠️  Clientes sin RUC: ${cliSinRuc.length}`);
    }

    console.log('\n✅ Extracción de datos completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la extracción:', error);
    throw error;
  }
}

extractAllData()
  .catch((e) => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });