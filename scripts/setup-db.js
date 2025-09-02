const { execSync } = require('child_process');

console.log('🔄 Configurando la base de datos...');

try {
  // Generar el cliente de Prisma
  console.log('📦 Generando cliente de Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Ejecutar migraciones
  console.log('🚀 Ejecutando migraciones...');
  execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });

  // Ejecutar seed
  console.log('🌱 Sembrando datos iniciales...');
  execSync('npm run db:seed', { stdio: 'inherit' });

  console.log('✅ Base de datos configurada correctamente!');
} catch (error) {
  console.error('❌ Error al configurar la base de datos:', error);
  process.exit(1);
}