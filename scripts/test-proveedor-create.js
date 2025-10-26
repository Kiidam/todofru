// Quick test to validate proveedor creation via Prisma with fallback
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const data = {
    id: require('crypto').randomUUID(),
    nombre: 'Carlo Test Script',
    ruc: '74216474',
    telefono: '+51998347280',
    email: 'kiidam@hotmail.com',
    direccion: 'conj san martin de porres d-18',
    contacto: 'Juan Pérez Gómez'
  };

  // Clean previous
  await prisma.proveedor.deleteMany({ where: { ruc: data.ruc } });

  try {
    const created = await prisma.proveedor.create({ data });
    console.log('Created with full fields:', created);
  } catch (err) {
    const msg = String(err?.message || '').toLowerCase();
    const code = err && err.code;
    const missingColumn = String(err && err.meta && err.meta.column || '').toLowerCase();
    if (
      msg.includes('unknown arg') ||
      msg.includes('unknown column') ||
      (code === 'P2022' && (missingColumn.includes('direccion') || missingColumn.includes('contacto')))
    ) {
      // Raw SQL fallback
      const insertObj = { ...data };
      delete insertObj.direccion;
      delete insertObj.contacto;
      const cols = ['id', 'nombre', 'ruc', 'telefono', 'email', 'direccion'].filter((k) => insertObj[k] !== undefined);
      if (insertObj.activo === undefined) insertObj.activo = true;
      cols.push('activo');
      const placeholders = cols.map(() => '?').join(',');
      const values = cols.map((k) => insertObj[k]);
      await prisma.$executeRawUnsafe(`INSERT INTO proveedor (${cols.join(',')}) VALUES (${placeholders})`, ...values);
      const rows = await prisma.$queryRawUnsafe('SELECT id, nombre, ruc, telefono, email, direccion, activo, createdAt, updatedAt FROM proveedor WHERE id = ?', insertObj.id);
      console.log('Created via raw SQL (fallback):', rows[0]);
    } else {
      throw err;
    }
  }

  const list = await prisma.$queryRawUnsafe('SELECT id, nombre, ruc FROM proveedor ORDER BY createdAt DESC LIMIT 3');
  console.log('Last 3 proveedores:', list.map(p => ({ id: p.id, nombre: p.nombre, ruc: p.ruc })));
}

main().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});