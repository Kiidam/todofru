const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando tipos y causas de merma...');

  // Tipos de merma comunes en frutas y verduras
  const tiposMerma = [
    { nombre: 'Por deterioro natural' },
    { nombre: 'Por manipulación' },
    { nombre: 'Por vencimiento' },
    { nombre: 'Por plagas' },
    { nombre: 'Por condiciones ambientales' },
  ];

  const tiposCreados = [];
  for (const tipo of tiposMerma) {
    const existente = await prisma.tipoMerma.findFirst({
      where: { nombre: tipo.nombre }
    });

    if (!existente) {
      const nuevo = await prisma.tipoMerma.create({
        data: {
          id: randomUUID(),
          nombre: tipo.nombre,
          activo: true
        }
      });
      tiposCreados.push(nuevo);
      console.log(`✅ Creado tipo: ${nuevo.nombre}`);
    } else {
      tiposCreados.push(existente);
      console.log(`⏭️  Ya existe tipo: ${existente.nombre}`);
    }
  }

  // Causas por cada tipo
  const causasPorTipo = [
    {
      tipo: 'Por deterioro natural',
      causas: [
        'Sobre maduración',
        'Deshidratación',
        'Golpes durante transporte',
        'Magulladuras'
      ]
    },
    {
      tipo: 'Por manipulación',
      causas: [
        'Daño en almacenamiento',
        'Corte o ruptura',
        'Compresión excesiva'
      ]
    },
    {
      tipo: 'Por vencimiento',
      causas: [
        'Producto caducado',
        'Pérdida de frescura',
        'Oxidación'
      ]
    },
    {
      tipo: 'Por plagas',
      causas: [
        'Insectos',
        'Hongos',
        'Bacterias',
        'Roedores'
      ]
    },
    {
      tipo: 'Por condiciones ambientales',
      causas: [
        'Temperatura inadecuada',
        'Humedad excesiva',
        'Exposición al sol',
        'Congelamiento'
      ]
    }
  ];

  for (const grupo of causasPorTipo) {
    const tipoMerma = tiposCreados.find(t => t.nombre === grupo.tipo);
    
    if (!tipoMerma) continue;

    for (const causaNombre of grupo.causas) {
      const existente = await prisma.causaMerma.findFirst({
        where: { 
          nombre: causaNombre,
          tipoMermaId: tipoMerma.id
        }
      });

      if (!existente) {
        await prisma.causaMerma.create({
          data: {
            id: randomUUID(),
            nombre: causaNombre,
            tipoMermaId: tipoMerma.id,
            activo: true
          }
        });
        console.log(`  ✅ Creada causa: ${causaNombre}`);
      } else {
        console.log(`  ⏭️  Ya existe causa: ${causaNombre}`);
      }
    }
  }

  console.log('✨ Seed de mermas completado!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
