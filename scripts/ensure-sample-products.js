// Safe seeding script: ensures UnidadMedida, Categoria and several Producto rows exist
// Run with: node -r dotenv/config scripts/ensure-sample-products.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function ensure() {
  try {
    console.log('Starting seed: ensure unidades, categorias y productos ejemplo');

    // Ensure unidad (try by id then by nombre)
    const unidadDefaultId = 'unidad-default';
    let unidad = await prisma.unidadMedida.findUnique({ where: { id: unidadDefaultId } });
    if (!unidad) unidad = await prisma.unidadMedida.findFirst({ where: { nombre: 'Unidad' } });
    if (!unidad) {
      try {
        unidad = await prisma.unidadMedida.create({ data: { id: unidadDefaultId, nombre: 'Unidad', simbolo: 'u' } });
        console.log('Unidad creada:', unidad.id);
      } catch (e) {
        if (e.code === 'P2002') {
          unidad = await prisma.unidadMedida.findFirst({ where: { nombre: 'Unidad' } });
          console.log('Unidad ya existente encontrada por nombre:', unidad?.id);
        } else throw e;
      }
    } else {
      console.log('Unidad existente:', unidad.id);
    }

    // Ensure categoria
    const categoriaDefaultId = 'categoria-frutas';
    let categoria = await prisma.categoria.findUnique({ where: { id: categoriaDefaultId } });
    if (!categoria) categoria = await prisma.categoria.findFirst({ where: { nombre: 'Frutas' } });
    if (!categoria) {
      try {
        categoria = await prisma.categoria.create({ data: { id: categoriaDefaultId, nombre: 'Frutas', descripcion: 'Productos frescos - frutas' } });
        console.log('Categoria creada:', categoria.id);
      } catch (e) {
        if (e.code === 'P2002') {
          categoria = await prisma.categoria.findFirst({ where: { nombre: 'Frutas' } });
          console.log('Categoria ya existente encontrada por nombre:', categoria?.id);
        } else throw e;
      }
    } else {
      console.log('Categoria existente:', categoria.id);
    }

    // Ensure products: create examples if product count is low
    const productosCount = await prisma.producto.count();
    console.log('Productos existentes en tabla:', productosCount);
    if (productosCount < 5) {
      console.log('Creando productos de ejemplo...');
      const ejemplos = [
        { nombre: 'Manzana Roja', sku: 'MANZ-R', precio: 2.5 },
        { nombre: 'Banana', sku: 'BAN-1', precio: 1.2 },
        { nombre: 'Naranja', sku: 'NAR-1', precio: 1.5 },
        { nombre: 'Piña', sku: 'PINA-1', precio: 4.0 },
        { nombre: 'Mango', sku: 'MANGO-1', precio: 3.2 },
      ];

      for (const p of ejemplos) {
        const exists = await prisma.producto.findFirst({ where: { OR: [{ nombre: p.nombre }, { sku: p.sku }] } });
        if (!exists) {
          const creado = await prisma.producto.create({ data: { ...p, activo: true, stock: 0, stockMinimo: 0, categoriaId: categoria.id, unidadMedidaId: unidad.id } });
          console.log('Producto creado:', creado.id, creado.nombre);
        } else {
          console.log('Producto ya existe, omitiendo:', exists.nombre);
        }
      }
    } else {
      console.log('Suficientes productos existentes, no se crearán nuevos.');
    }

    console.log('Seed finalizado con éxito.');
  } catch (err) {
    console.error('Error en seed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

ensure().catch((e) => { console.error('Seed fallo:', e); process.exit(1); });
