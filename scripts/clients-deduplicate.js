// Script para analizar y corregir duplicados de CLIENTES con respaldo y prevención
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function nowTag() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function normalizeStr(s) {
  return (s || '').toLowerCase().trim();
}

async function backupClientes() {
  const ts = nowTag();
  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `CLIENTES_BACKUP_${ts}.json`);

  const clientes = await prisma.cliente.findMany({
    include: {
      _count: { select: { pedidos: true } }
    }
  });
  const pedidosVenta = await prisma.pedidoVenta.findMany({
    include: { cliente: true, items: true }
  });

  const data = {
    timestamp: new Date().toISOString(),
    counts: {
      clientes: clientes.length,
      pedidosVenta: pedidosVenta.length,
    },
    clientes,
    pedidosVenta,
  };
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
  console.log(`\n📦 Backup creado: ${backupPath}`);
  return backupPath;
}

function scoreCliente(c) {
  // Puntuación para elegir el cliente activo
  let score = 0;
  if (c.activo) score += 10;
  score += (c._count?.pedidos || 0) * 5;
  if (c.updatedAt) score += Math.floor(new Date(c.updatedAt).getTime() / 10000000); // peso por recencia
  // Preferir registros más completos
  if (c.razonSocial) score += 2;
  if (c.nombres || c.apellidos) score += 1;
  if (c.telefono) score += 1;
  if (c.email) score += 1;
  if (c.direccion) score += 1;
  return score;
}

async function analyzeAndFixDuplicates() {
  console.log('🔍 Analizando duplicados de CLIENTES...');

  const clientes = await prisma.cliente.findMany({
    include: {
      _count: { select: { pedidos: true } }
    }
  });

  const byDoc = new Map(); // clave: numeroIdentificacion/ruc
  const byEmail = new Map();
  const byNombre = new Map();

  for (const c of clientes) {
    const doc = c.numeroIdentificacion || c.ruc || null;
    const email = normalizeStr(c.email);
    const nombre = normalizeStr(c.nombre);

    if (doc) {
      const key = `DOC:${doc}`;
      if (!byDoc.has(key)) byDoc.set(key, []);
      byDoc.get(key).push(c);
    }
    if (email) {
      const key = `EMAIL:${email}`;
      if (!byEmail.has(key)) byEmail.set(key, []);
      byEmail.get(key).push(c);
    }
    if (nombre) {
      const key = `NOMBRE:${nombre}`;
      if (!byNombre.has(key)) byNombre.set(key, []);
      byNombre.get(key).push(c);
    }
  }

  const dupGroups = [];
  for (const [key, list] of [...byDoc.entries(), ...byEmail.entries(), ...byNombre.entries()]) {
    if (list.length > 1) dupGroups.push({ key, clientes: list });
  }

  if (dupGroups.length === 0) {
    console.log('✅ No se encontraron duplicados.');
    return { fixed: 0, groups: [] };
  }

  console.log(`❌ Se encontraron ${dupGroups.length} grupos potenciales de duplicados.`);

  let fixedCount = 0;
  const report = [];

  for (const group of dupGroups) {
    // Evitar procesar dos veces el mismo par; agrupar por IDs únicos
    const uniqueIds = new Set(group.clientes.map(c => c.id));
    if (uniqueIds.size <= 1) continue;

    // Elegir el activo por score
    const sorted = [...group.clientes].sort((a,b) => scoreCliente(b) - scoreCliente(a));
    const keep = sorted[0];
    const toRemove = sorted.slice(1);

    // Verificar que los a eliminar no tengan pedidos; si tienen, migrar referencias
    const migrated = [];
    const deactivated = [];

    await prisma.$transaction(async (tx) => {
      for (const c of toRemove) {
        const pedidos = await tx.pedidoVenta.findMany({ where: { clienteId: c.id } });
        if (pedidos.length > 0) {
          // Migrar pedidos al cliente activo
          await tx.pedidoVenta.updateMany({
            where: { clienteId: c.id },
            data: { clienteId: keep.id }
          });
          migrated.push({ from: c.id, to: keep.id, pedidosMigrados: pedidos.length });
        }
        // Soft delete: marcar inactivo y nota en nombre para trazabilidad
        await tx.cliente.update({
          where: { id: c.id },
          data: {
            activo: false,
            nombre: `${c.nombre} [DUPLICADO - fusionado en ${keep.id}]`,
            updatedAt: new Date()
          }
        });
        deactivated.push(c.id);
      }

      // Corrección de datos del cliente activo: alinear RUC y numeroIdentificacion si aplica
      if (keep.numeroIdentificacion && (!keep.ruc || keep.ruc !== keep.numeroIdentificacion)) {
        await tx.cliente.update({
          where: { id: keep.id },
          data: {
            ruc: keep.numeroIdentificacion,
            updatedAt: new Date()
          }
        });
      }
    });

    fixedCount += toRemove.length;
    report.push({ key: group.key, keep: keep.id, removed: toRemove.map(c => c.id), migrated, deactivated });
    console.log(`   🔧 Grupo ${group.key}: mantener ${keep.id}, desactivar ${toRemove.map(c=>c.id).join(', ')}`);
  }

  // Guardar reporte
  const ts = nowTag();
  const outPath = path.join(__dirname, `../REPORTE-DUPLICADOS-CLIENTES-${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ timestamp: new Date().toISOString(), fixedCount, report }, null, 2));
  console.log(`\n📄 Reporte de deduplicación guardado en: ${outPath}`);

  return { fixed: fixedCount, groups: dupGroups.map(g => ({ key: g.key, ids: g.clientes.map(c=>c.id) })) };
}

async function main() {
  console.log('🛡️  PROCESO SEGURO DE DEDUPLICACIÓN DE CLIENTES');
  console.log('===============================================');
  try {
    const backupPath = await backupClientes();
    const result = await analyzeAndFixDuplicates();
    console.log(`\n✅ Duplicados corregidos: ${result.fixed}`);
    console.log('ℹ️  Backup y reporte generados para auditoría.');
  } catch (error) {
    console.error('❌ Error en deduplicación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();