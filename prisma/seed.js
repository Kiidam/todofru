const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const tipos = [
    { id: 'merma-mecanica', nombre: 'Mecánica' },
    { id: 'merma-biologica', nombre: 'Biológica' },
    { id: 'merma-operativa', nombre: 'Operativa' },
  ]
  for (const t of tipos) {
    await prisma.tipoMerma.upsert({
      where: { id: t.id },
      update: { nombre: t.nombre, activo: true },
      create: { id: t.id, nombre: t.nombre, activo: true }
    })
  }
  const causas = [
    { id: 'golpe', nombre: 'Golpe/Manipulación', tipoMermaId: 'merma-mecanica' },
    { id: 'deshidratacion', nombre: 'Deshidratación', tipoMermaId: 'merma-biologica' },
    { id: 'maduracion', nombre: 'Maduración avanzada', tipoMermaId: 'merma-biologica' },
    { id: 'poda', nombre: 'Selección/Poda', tipoMermaId: 'merma-operativa' },
    { id: 'merma-transporte', nombre: 'Transporte', tipoMermaId: 'merma-operativa' },
  ]
  for (const c of causas) {
    await prisma.causaMerma.upsert({
      where: { id: c.id },
      update: { nombre: c.nombre, tipoMermaId: c.tipoMermaId, activo: true },
      create: { id: c.id, nombre: c.nombre, tipoMermaId: c.tipoMermaId, activo: true }
    })
  }
}

main()
  .catch(() => {})
  .finally(async () => { await prisma.$disconnect() })

