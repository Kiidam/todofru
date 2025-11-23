require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const proveedores = await p.proveedor.findMany({ orderBy: { createdAt: 'asc' } });
    const clientes = await p.cliente.findMany({ orderBy: { createdAt: 'asc' } });

    const provPath = path.join(outDir, `proveedores_backup_${ts}.json`);
    const cliPath = path.join(outDir, `clientes_backup_${ts}.json`);

    fs.writeFileSync(provPath, JSON.stringify(proveedores, null, 2));
    fs.writeFileSync(cliPath, JSON.stringify(clientes, null, 2));

    console.log('Backups written:');
    console.log(' -', provPath, 'rows:', proveedores.length);
    console.log(' -', cliPath, 'rows:', clientes.length);
  } catch (err) {
    console.error('Backup error:', err);
    process.exitCode = 2;
  } finally {
    await p.$disconnect();
  }
})();
