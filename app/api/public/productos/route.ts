import { NextRequest } from 'next/server';
import { withErrorHandling, successResponse, errorResponse } from '../../../../src/lib/api-utils';
import { prisma } from '../../../../src/lib/prisma';

// Public GET /api/public/productos - minimal product list for unauthenticated UIs
export const GET = withErrorHandling(async (request: NextRequest) => {
  try {
    const products = await prisma.producto.findMany({
      where: { activo: true },
      orderBy: [{ nombre: 'asc' }],
      select: {
        id: true,
        nombre: true,
        sku: true,
        precio: true,
        stock: true,
        unidadMedida: { select: { simbolo: true } }
      },
      take: 1000
    });

    const res = successResponse({ data: products });
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error in public productos route', err);
    return errorResponse('No se pudo obtener productos', 500);
  }
});
