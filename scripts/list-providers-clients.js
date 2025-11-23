// prints first 100 rows of proveedor and cliente with key fields for inspection
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    console.log('Connected to DB:', process.env.DATABASE_URL ? 'yes' : 'no');
    const proveedores = await p.proveedor.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nombre: true,
        numeroIdentificacion: true,
        tipoEntidad: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        lastModifiedBy: true,
        version: true,
        telefono: true,
        email: true,
        direccion: true,
      },
    });
    console.log('\nPROVEEDORES COUNT:', proveedores.length);
    console.log(JSON.stringify(proveedores, null, 2));

    const clientes = await p.cliente.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nombre: true,
        numeroIdentificacion: true,
        tipoEntidad: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        mensajePersonalizado: true,
        telefono: true,
        email: true,
        direccion: true,
      },
    });
    console.log('\nCLIENTES COUNT:', clientes.length);
    console.log(JSON.stringify(clientes, null, 2));
  } catch (err) {
    console.error('Error reading tables:', err);
    process.exitCode = 2;
  } finally {
    await p.$disconnect();
  }
})();
