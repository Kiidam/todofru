const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verificarProductos() {
  try {
    console.log('Verificando productos en la base de datos...\n');
    
    // Obtener todos los productos
    const productos = await prisma.producto.findMany({
      include: {
        categoria: { select: { nombre: true } },
        unidadMedida: { select: { nombre: true, simbolo: true } },
        marca: { select: { nombre: true } }
      }
    });
    
    console.log(`📦 Total de productos encontrados: ${productos.length}\n`);
    
    if (productos.length > 0) {
      console.log('Primeros 5 productos:');
      productos.slice(0, 5).forEach((producto, index) => {
        console.log(`${index + 1}. ${producto.nombre} (SKU: ${producto.sku || 'N/A'})`);
        console.log(`   Stock: ${producto.stock} | Precio: S/ ${producto.precio}`);
        console.log(`   Categoría: ${producto.categoria?.nombre || 'N/A'}`);
        console.log(`   Unidad: ${producto.unidadMedida?.simbolo || 'N/A'}`);
        console.log('');
      });
      
      if (productos.length > 5) {
        console.log(`... y ${productos.length - 5} productos más.\n`);
      }
    } else {
      console.log('❌ No se encontraron productos en la base de datos.');
    }
    
    // Verificar también categorías
    const categorias = await prisma.categoria.findMany();
    console.log(`📁 Categorías disponibles: ${categorias.length}`);
    
    // Verificar unidades de medida
    const unidades = await prisma.unidadMedida.findMany();
    console.log(`📏 Unidades de medida disponibles: ${unidades.length}`);
    
  } catch (error) {
    console.error('❌ Error al verificar productos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarProductos();