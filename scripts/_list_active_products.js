const { PrismaClient } = require('@prisma/client');
(async function(){
  const prisma = new PrismaClient();
  try {
    const prods = await prisma.producto.findMany({ where: { activo: true }, select: { id: true, nombre: true, sku: true, precio: true, stock: true, categoriaId: true, unidadMedidaId: true } });
    console.log('Active products count:', prods.length);
    console.log(JSON.stringify(prods, null, 2));
  } catch (e) {
    console.error('Error listing products:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
