const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMovimiento() {
  try {
    // Obtener un producto existente
    const producto = await prisma.producto.findFirst();
    console.log('Producto encontrado:', producto.id, producto.nombre);
    
    // Obtener un usuario existente
    const usuario = await prisma.user.findFirst();
    console.log('Usuario encontrado:', usuario.id, usuario.name);
    
    // Intentar crear un movimiento de inventario
    const movimiento = await prisma.movimientoInventario.create({
      data: {
        productoId: producto.id,
        tipo: 'ENTRADA',
        cantidad: 10,
        cantidadAnterior: 0,
        cantidadNueva: 10,
        precio: 5.50,
        motivo: 'Prueba de movimiento',
        usuarioId: usuario.id
      }
    });
    
    console.log('Movimiento creado exitosamente:', movimiento);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Detalles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMovimiento();