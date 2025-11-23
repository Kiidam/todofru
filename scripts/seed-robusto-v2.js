/**
 * SCRIPT DE SEED ROBUSTO V2
 * Soluciona problemas de clave primaria compuesta y genera datos de prueba completos
 * con manejo de errores, validaciones y logging detallado
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Configuración del seed
const CONFIG = {
  DELAY_BETWEEN_MOVEMENTS: 100, // ms entre movimientos para evitar conflictos de timestamp
  BATCH_SIZE: 10, // tamaño de lote para operaciones masivas
  RETRY_ATTEMPTS: 3, // intentos de reintento en caso de error
  VERBOSE_LOGGING: true // logging detallado
};

// Utilidades de logging
const logger = {
  info: (message, data = null) => {
    console.log(`ℹ️  ${new Date().toISOString()} - ${message}`);
    if (data && CONFIG.VERBOSE_LOGGING) {
      console.log('   📊 Datos:', JSON.stringify(data, null, 2));
    }
  },
  success: (message, count = null) => {
    console.log(`✅ ${new Date().toISOString()} - ${message}${count ? ` (${count})` : ''}`);
  },
  warning: (message, data = null) => {
    console.log(`⚠️  ${new Date().toISOString()} - ${message}`);
    if (data) console.log('   📋 Detalles:', data);
  },
  error: (message, error = null) => {
    console.log(`❌ ${new Date().toISOString()} - ${message}`);
    if (error) {
      console.log('   🔍 Error:', error.message);
      if (CONFIG.VERBOSE_LOGGING && error.stack) {
        console.log('   📚 Stack:', error.stack);
      }
    }
  },
  step: (step, total, description) => {
    console.log(`\n🔄 PASO ${step}/${total}: ${description}`);
    console.log('=' .repeat(60));
  }
};

// Función para delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función para retry con backoff exponencial
async function retryOperation(operation, description, maxAttempts = CONFIG.RETRY_ATTEMPTS) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts) {
        logger.error(`Falló ${description} después de ${maxAttempts} intentos`, error);
        throw error;
      }
      
      const delayMs = Math.pow(2, attempt) * 1000; // backoff exponencial
      logger.warning(`Intento ${attempt}/${maxAttempts} falló para ${description}, reintentando en ${delayMs}ms`);
      await delay(delayMs);
    }
  }
}

// Función para limpiar base de datos
async function limpiarBaseDatos() {
  logger.step(1, 8, 'LIMPIANDO BASE DE DATOS');
  
  try {
    // Orden específico para respetar foreign keys
    const tablasALimpiar = [
      'auditoria',
      'movimientoinventario',
      'pedidoventaitem',
      'pedidoventa',
      'pedidocompraitem',
      'pedidocompra',
      'productoproveedor',
      'producto',
      'categoria',
      'unidadmedida',
      'cliente',
      'proveedor',
      'user'
    ];

    for (const tabla of tablasALimpiar) {
      try {
        const result = await prisma.$executeRawUnsafe(`DELETE FROM ${tabla}`);
        logger.info(`Limpiada tabla ${tabla}`, { registrosEliminados: result });
      } catch (error) {
        // Ignorar errores de tablas que no existen o están vacías
        if (!error.message.includes("doesn't exist") && !error.message.includes('Unknown table')) {
          logger.warning(`Error limpiando tabla ${tabla}`, error.message);
        }
      }
    }

    // Resetear auto_increment
    for (const tabla of tablasALimpiar) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE ${tabla} AUTO_INCREMENT = 1`);
      } catch (error) {
        // Ignorar errores para tablas sin auto_increment
      }
    }

    logger.success('Base de datos limpiada correctamente');
  } catch (error) {
    logger.error('Error durante la limpieza de base de datos', error);
    throw error;
  }
}

// Función para crear usuarios
async function crearUsuarios() {
  logger.step(2, 8, 'CREANDO USUARIOS');

  const usuarios = [
    {
      id: uuidv4(),
      email: 'admin@todofru.com',
      password: await bcrypt.hash('admin123', 10),
      name: 'Administrador Principal',
      role: 'ADMIN'
    },
    {
      id: uuidv4(),
      email: 'vendedor@todofru.com',
      password: await bcrypt.hash('vendedor123', 10),
      name: 'Juan Pérez',
      role: 'USER'
    },
    {
      id: uuidv4(),
      email: 'almacen@todofru.com',
      password: await bcrypt.hash('almacen123', 10),
      name: 'María García',
      role: 'USER'
    }
  ];

  const usuariosCreados = [];
  for (const userData of usuarios) {
    try {
      const usuario = await retryOperation(
        () => prisma.user.upsert({
          where: { email: userData.email },
          update: userData,
          create: userData
        }),
        `creación de usuario ${userData.email}`
      );
      usuariosCreados.push(usuario);
      logger.success(`Usuario creado: ${usuario.name} (${usuario.email})`);
    } catch (error) {
      logger.error(`Error creando usuario ${userData.email}`, error);
      throw error;
    }
  }

  logger.success('Usuarios creados', usuariosCreados.length);
  return usuariosCreados;
}

// Función para crear categorías
async function crearCategorias() {
  logger.step(3, 8, 'CREANDO CATEGORÍAS');

  const categorias = [
    { id: uuidv4(), nombre: 'Frutas Frescas', descripcion: 'Frutas frescas de temporada' },
    { id: uuidv4(), nombre: 'Verduras', descripcion: 'Verduras y hortalizas frescas' },
    { id: uuidv4(), nombre: 'Frutas Secas', descripcion: 'Frutos secos y deshidratados' },
    { id: uuidv4(), nombre: 'Cítricos', descripcion: 'Naranjas, limones, mandarinas' },
    { id: uuidv4(), nombre: 'Frutas Tropicales', descripcion: 'Piña, mango, papaya' },
    { id: uuidv4(), nombre: 'Verduras de Hoja', descripcion: 'Lechuga, espinaca, acelga' },
    { id: uuidv4(), nombre: 'Tubérculos', descripcion: 'Papa, camote, yuca' },
    { id: uuidv4(), nombre: 'Legumbres', descripcion: 'Frijoles, lentejas, garbanzos' }
  ];

  const categoriasCreadas = [];
  for (const catData of categorias) {
    try {
      const categoria = await retryOperation(
        () => prisma.categoria.upsert({
          where: { nombre: catData.nombre },
          update: catData,
          create: catData
        }),
        `creación de categoría ${catData.nombre}`
      );
      categoriasCreadas.push(categoria);
      logger.success(`Categoría creada: ${categoria.nombre}`);
    } catch (error) {
      logger.error(`Error creando categoría ${catData.nombre}`, error);
      throw error;
    }
  }

  logger.success('Categorías creadas', categoriasCreadas.length);
  return categoriasCreadas;
}

// Función para crear unidades de medida
async function crearUnidadesMedida() {
  logger.step(4, 8, 'CREANDO UNIDADES DE MEDIDA');

  const unidades = [
    { id: uuidv4(), nombre: 'Kilogramo', simbolo: 'kg' },
    { id: uuidv4(), nombre: 'Gramo', simbolo: 'g' },
    { id: uuidv4(), nombre: 'Libra', simbolo: 'lb' },
    { id: uuidv4(), nombre: 'Unidad', simbolo: 'und' },
    { id: uuidv4(), nombre: 'Docena', simbolo: 'doc' },
    { id: uuidv4(), nombre: 'Caja', simbolo: 'caja' },
    { id: uuidv4(), nombre: 'Saco', simbolo: 'saco' },
    { id: uuidv4(), nombre: 'Litro', simbolo: 'L' }
  ];

  const unidadesCreadas = [];
  for (const unidadData of unidades) {
    try {
      const unidad = await retryOperation(
        () => prisma.unidadMedida.upsert({
          where: { nombre: unidadData.nombre },
          update: unidadData,
          create: unidadData
        }),
        `creación de unidad ${unidadData.nombre}`
      );
      unidadesCreadas.push(unidad);
      logger.success(`Unidad creada: ${unidad.nombre} (${unidad.abreviacion})`);
    } catch (error) {
      logger.error(`Error creando unidad ${unidadData.nombre}`, error);
      throw error;
    }
  }

  logger.success('Unidades de medida creadas', unidadesCreadas.length);
  return unidadesCreadas;
}

// Función para crear proveedores
async function crearProveedores() {
  logger.step(5, 8, 'CREANDO PROVEEDORES');

  const proveedores = [
    {
      id: uuidv4(),
      tipoEntidad: 'PERSONA_JURIDICA',
      nombre: 'Frutas del Valle S.A.C.',
      numeroIdentificacion: '20123456789',
      direccion: 'Av. Los Frutales 123, Lima',
      telefono: '01-2345678',
      email: 'ventas@frutasdelvalle.com',
      contacto: 'Carlos Mendoza',
      razonSocial: 'Frutas del Valle S.A.C.',
      representanteLegal: 'Carlos Mendoza'
    },
    {
      id: uuidv4(),
      tipoEntidad: 'PERSONA_JURIDICA',
      nombre: 'Verduras Frescas EIRL',
      numeroIdentificacion: '20987654321',
      direccion: 'Jr. Las Verduras 456, Lima',
      telefono: '01-8765432',
      email: 'pedidos@verdurasfrescas.com',
      contacto: 'Ana Torres',
      razonSocial: 'Verduras Frescas EIRL',
      representanteLegal: 'Ana Torres'
    },
    {
      id: uuidv4(),
      tipoEntidad: 'PERSONA_JURIDICA',
      nombre: 'Distribuidora Tropical',
      numeroIdentificacion: '20456789123',
      direccion: 'Av. Tropical 789, Lima',
      telefono: '01-4567891',
      email: 'info@tropical.com',
      contacto: 'Luis Ramírez',
      razonSocial: 'Distribuidora Tropical S.A.C.',
      representanteLegal: 'Luis Ramírez'
    }
  ];

  const proveedoresCreados = [];
  for (const provData of proveedores) {
    try {
      const proveedor = await retryOperation(
        () => prisma.proveedor.upsert({
          where: { numeroIdentificacion: provData.numeroIdentificacion },
          update: provData,
          create: provData
        }),
        `creación de proveedor ${provData.nombre}`
      );
      proveedoresCreados.push(proveedor);
      logger.success(`Proveedor creado: ${proveedor.nombre} (${proveedor.ruc})`);
    } catch (error) {
      logger.error(`Error creando proveedor ${provData.nombre}`, error);
      throw error;
    }
  }

  logger.success('Proveedores creados', proveedoresCreados.length);
  return proveedoresCreados;
}

// Función para crear clientes
async function crearClientes() {
  logger.step(6, 8, 'CREANDO CLIENTES');

  const clientes = [
    {
      id: uuidv4(),
      nombre: 'Restaurant El Buen Sabor',
      ruc: '20111222333',
      tipoEntidad: 'PERSONA_JURIDICA',
      numeroIdentificacion: '20111222333',
      tipoCliente: 'MAYORISTA',
      direccion: 'Av. Gastronómica 123, Lima',
      telefono: '01-1112223',
      email: 'compras@buensabor.com',
      razonSocial: 'Restaurant El Buen Sabor S.A.C.',
      contacto: 'María González'
    },
    {
      id: uuidv4(),
      nombre: 'Supermercado Fresh Market',
      ruc: '20444555666',
      tipoEntidad: 'PERSONA_JURIDICA',
      numeroIdentificacion: '20444555666',
      tipoCliente: 'MAYORISTA',
      direccion: 'Av. Comercial 456, Lima',
      telefono: '01-4445556',
      email: 'proveedores@freshmarket.com',
      razonSocial: 'Supermercado Fresh Market S.A.',
      contacto: 'Carlos Ruiz'
    },
    {
      id: uuidv4(),
      nombre: 'María González',
      tipoEntidad: 'PERSONA_NATURAL',
      numeroIdentificacion: '12345678',
      tipoCliente: 'MINORISTA',
      direccion: 'Jr. Los Olivos 789, Lima',
      telefono: '987654321',
      email: 'maria.gonzalez@email.com',
      nombres: 'María Elena',
      apellidos: 'González López',
      contacto: 'María González'
    }
  ];

  const clientesCreados = [];
  for (const clienteData of clientes) {
    try {
      const cliente = await retryOperation(
        () => prisma.cliente.upsert({
          where: { numeroIdentificacion: clienteData.numeroIdentificacion },
          update: clienteData,
          create: clienteData
        }),
        `creación de cliente ${clienteData.nombre}`
      );
      clientesCreados.push(cliente);
      logger.success(`Cliente creado: ${cliente.nombre} (${cliente.numeroIdentificacion})`);
    } catch (error) {
      logger.error(`Error creando cliente ${clienteData.nombre}`, error);
      throw error;
    }
  }

  logger.success('Clientes creados', clientesCreados.length);
  return clientesCreados;
}

// Función para crear productos
async function crearProductos(categorias, unidades, proveedores) {
  logger.step(7, 8, 'CREANDO PRODUCTOS');

  const productos = [
    {
      id: uuidv4(),
      sku: 'MANZ-RED-001',
      nombre: 'Manzana Red Delicious',
      descripcion: 'Manzanas rojas frescas de primera calidad',
      categoriaId: categorias.find(c => c.nombre === 'Frutas Frescas').id,
      unidadMedidaId: unidades.find(u => u.nombre === 'Kilogramo').id,
      precio: 8.50,
      stock: 100,
      stockMinimo: 20,
      perecedero: true,
      diasVencimiento: 15
    },
    {
      id: uuidv4(),
      sku: 'NAR-VAL-001',
      nombre: 'Naranja Valencia',
      descripcion: 'Naranjas dulces para jugo',
      categoriaId: categorias.find(c => c.nombre === 'Cítricos').id,
      unidadMedidaId: unidades.find(u => u.nombre === 'Kilogramo').id,
      precio: 6.00,
      stock: 150,
      stockMinimo: 30,
      perecedero: true,
      diasVencimiento: 20
    },
    {
      id: uuidv4(),
      sku: 'LEC-AME-001',
      nombre: 'Lechuga Americana',
      descripcion: 'Lechuga fresca hidropónica',
      categoriaId: categorias.find(c => c.nombre === 'Verduras de Hoja').id,
      unidadMedidaId: unidades.find(u => u.nombre === 'Unidad').id,
      precio: 3.50,
      stock: 80,
      stockMinimo: 15,
      perecedero: true,
      diasVencimiento: 5
    },
    {
      id: uuidv4(),
      sku: 'PAP-BLA-001',
      nombre: 'Papa Blanca',
      descripcion: 'Papa blanca para consumo directo',
      categoriaId: categorias.find(c => c.nombre === 'Tubérculos').id,
      unidadMedidaId: unidades.find(u => u.nombre === 'Kilogramo').id,
      precio: 4.20,
      stock: 200,
      stockMinimo: 50,
      perecedero: false
    },
    {
      id: uuidv4(),
      sku: 'PIN-GOL-001',
      nombre: 'Piña Golden',
      descripcion: 'Piña dulce tropical',
      categoriaId: categorias.find(c => c.nombre === 'Frutas Tropicales').id,
      unidadMedidaId: unidades.find(u => u.nombre === 'Unidad').id,
      precio: 12.00,
      stock: 60,
      stockMinimo: 10,
      perecedero: true,
      diasVencimiento: 10
    }
  ];

  const productosCreados = [];
  for (const prodData of productos) {
    try {
      const producto = await retryOperation(
        () => prisma.producto.upsert({
          where: { sku: prodData.sku },
          update: prodData,
          create: prodData
        }),
        `creación de producto ${prodData.nombre}`
      );
      productosCreados.push(producto);
      logger.success(`Producto creado: ${producto.nombre} - Stock: ${producto.stock}`);

      // Crear relación con proveedores
      const proveedor = proveedores[Math.floor(Math.random() * proveedores.length)];
      await retryOperation(
        () => prisma.productoProveedor.upsert({
          where: {
            productoId_proveedorId: {
              productoId: producto.id,
              proveedorId: proveedor.id
            }
          },
          update: {},
          create: {
            id: uuidv4(),
            productoId: producto.id,
            proveedorId: proveedor.id,
            precioCompra: prodData.precio * 0.7, // 30% de margen
            tiempoEntrega: Math.floor(Math.random() * 7) + 1
          }
        }),
        `creación de relación producto-proveedor ${producto.nombre}-${proveedor.nombre}`
      );

    } catch (error) {
      logger.error(`Error creando producto ${prodData.nombre}`, error);
      throw error;
    }
  }

  logger.success('Productos creados', productosCreados.length);
  return productosCreados;
}

// Función para crear movimientos de inventario (CON SOLUCIÓN AL PROBLEMA DE TIMESTAMP)
async function crearMovimientosInventario(productos, usuarios) {
  logger.step(8, 8, 'CREANDO MOVIMIENTOS DE INVENTARIO');

  const movimientos = [];
  const movimientosData = [];
  
  // Preparar datos de movimientos iniciales de entrada para cada producto
  for (let i = 0; i < productos.length; i++) {
    const producto = productos[i];
    const usuario = usuarios[Math.floor(Math.random() * usuarios.length)];
    
    // SOLUCIÓN: Crear timestamp único para cada movimiento con mayor separación
    const timestamp = new Date(Date.now() + (i * 1000)); // 1 segundo de diferencia entre cada uno
    
    const movimientoData = {
      productoId: producto.id,
      usuarioId: usuario.id,
      tipo: 'ENTRADA',
      cantidad: producto.stock,
      cantidadAnterior: 0,
      cantidadNueva: producto.stock,
      precio: producto.precio,
      motivo: 'Stock inicial del producto',
      createdAt: timestamp
    };

    movimientosData.push(movimientoData);
  }

  try {
    // Usar createMany para crear todos los movimientos de una vez
    const resultado = await retryOperation(
      () => prisma.movimientoInventario.createMany({
        data: movimientosData,
        skipDuplicates: true
      }),
      'creación de movimientos de inventario iniciales'
    );

    logger.success(`${resultado.count} movimientos de entrada creados exitosamente`);
    movimientos.push(...movimientosData);

  } catch (error) {
    logger.error('Error creando movimientos de entrada', error);
    // Intentar crear uno por uno como fallback
    for (const movimientoData of movimientosData) {
      try {
        const movimiento = await prisma.movimientoInventario.create({
          data: movimientoData
        });
        movimientos.push(movimiento);
        logger.success(`Movimiento individual creado: ${movimientoData.productoId}`);
      } catch (individualError) {
        logger.error(`Error creando movimiento individual para ${movimientoData.productoId}`, individualError);
      }
    }
  }

  // Crear algunos movimientos adicionales de salida
  const movimientosSalidaData = [];
  
  for (let i = 0; i < Math.min(productos.length, 3); i++) {
    const producto = productos[i];
    const usuario = usuarios[Math.floor(Math.random() * usuarios.length)];
    
    // Timestamp único con mayor separación (después de los movimientos de entrada)
    const timestamp = new Date(Date.now() + ((productos.length + i) * 1000));
    
    const cantidadSalida = Math.floor(producto.stock * 0.1); // 10% del stock
    
    const movimientoData = {
      productoId: producto.id,
      usuarioId: usuario.id,
      tipo: 'SALIDA',
      cantidad: cantidadSalida,
      cantidadAnterior: producto.stock,
      cantidadNueva: producto.stock - cantidadSalida,
      precio: producto.precio,
      motivo: 'Venta de prueba',
      createdAt: timestamp
    };

    movimientosSalidaData.push(movimientoData);
  }

  try {
    // Usar createMany para crear todos los movimientos de salida de una vez
    const resultadoSalida = await retryOperation(
      () => prisma.movimientoInventario.createMany({
        data: movimientosSalidaData,
        skipDuplicates: true
      }),
      'creación de movimientos de inventario de salida'
    );

    logger.success(`${resultadoSalida.count} movimientos de salida creados exitosamente`);
    movimientos.push(...movimientosSalidaData);

  } catch (error) {
    logger.error('Error creando movimientos de salida', error);
    // Intentar crear uno por uno como fallback
    for (const movimientoData of movimientosSalidaData) {
      try {
        const movimiento = await prisma.movimientoInventario.create({
          data: movimientoData
        });
        movimientos.push(movimiento);
        logger.success(`Movimiento de salida individual creado: ${movimientoData.productoId}`);
      } catch (individualError) {
        logger.error(`Error creando movimiento de salida individual para ${movimientoData.productoId}`, individualError);
      }
    }
  }

  logger.success('Movimientos de inventario creados', movimientos.length);
  return movimientos;
}

// Función principal de seed
async function seedRobusto() {
  const startTime = Date.now();
  logger.info('🚀 INICIANDO SEED ROBUSTO V2');
  logger.info('Configuración:', CONFIG);

  try {
    // Ejecutar pasos del seed
    await limpiarBaseDatos();
    const usuarios = await crearUsuarios();
    const categorias = await crearCategorias();
    const unidades = await crearUnidadesMedida();
    const proveedores = await crearProveedores();
    const clientes = await crearClientes();
    const productos = await crearProductos(categorias, unidades, proveedores);
    const movimientos = await crearMovimientosInventario(productos, usuarios);

    // Resumen final
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log('\n🎉 SEED COMPLETADO EXITOSAMENTE');
    console.log('=' .repeat(60));
    logger.success(`Usuarios creados: ${usuarios.length}`);
    logger.success(`Categorías creadas: ${categorias.length}`);
    logger.success(`Unidades de medida creadas: ${unidades.length}`);
    logger.success(`Proveedores creados: ${proveedores.length}`);
    logger.success(`Clientes creados: ${clientes.length}`);
    logger.success(`Productos creados: ${productos.length}`);
    logger.success(`Movimientos de inventario creados: ${movimientos.length}`);
    logger.success(`Tiempo total: ${duration.toFixed(2)} segundos`);

    return {
      usuarios: usuarios.length,
      categorias: categorias.length,
      unidades: unidades.length,
      proveedores: proveedores.length,
      clientes: clientes.length,
      productos: productos.length,
      movimientos: movimientos.length,
      duracion: duration
    };

  } catch (error) {
    logger.error('Error durante el seed', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar seed si es llamado directamente
if (require.main === module) {
  seedRobusto()
    .then((resultado) => {
      console.log('\n✅ Seed completado exitosamente:', resultado);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en el seed:', error);
      process.exit(1);
    });
}

module.exports = { seedRobusto };