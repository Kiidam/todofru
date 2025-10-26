const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRaw`SHOW TABLES;`;
  console.log(rows);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});