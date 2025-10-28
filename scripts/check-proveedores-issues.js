const mysql = require('mysql2/promise');
require('dotenv').config();

async function main(){
  const dbUrl = process.env.DATABASE_URL;
  if(!dbUrl) { console.error('No DATABASE_URL'); process.exit(1); }
  const parsed = new URL(dbUrl);
  const user = parsed.username;
  const password = parsed.password;
  const host = parsed.hostname;
  const port = parsed.port || 3306;
  const database = parsed.pathname.replace(/^\//, '');

  const conn = await mysql.createConnection({ host, user, password, port, database });

  console.log('Connected to', database);

  // 1) proveedores with non-UUID ids
  const [badIds] = await conn.query(`SELECT id, nombre, numeroIdentificacion, createdAt FROM proveedor WHERE id NOT REGEXP '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'`);
  console.log('\nProveedores con id no-UUID:', badIds.length);
  console.table(badIds.slice(0,50));

  // 2) proveedores with empty or null nombre
  const [noName] = await conn.query(`SELECT id, nombre, razonSocial, nombres, apellidos, numeroIdentificacion FROM proveedor WHERE IFNULL(TRIM(nombre),'') = ''`);
  console.log('\nProveedores con nombre vacío:', noName.length);
  console.table(noName.slice(0,50));

  // 3) proveedores inactive
  const [inactive] = await conn.query(`SELECT id, nombre, activo FROM proveedor WHERE activo = 0`);
  console.log('\nProveedores inactivos:', inactive.length);
  console.table(inactive.slice(0,50));

  // 4) duplicate ids (shouldn't happen) and duplicate numeroIdentificacion
  const [dupIds] = await conn.query(`SELECT id, COUNT(*) as cnt FROM proveedor GROUP BY id HAVING cnt > 1`);
  console.log('\nIDs duplicados:', dupIds.length);
  console.table(dupIds);

  const [dupNum] = await conn.query(`SELECT numeroIdentificacion, COUNT(*) as cnt FROM proveedor WHERE numeroIdentificacion IS NOT NULL GROUP BY numeroIdentificacion HAVING cnt > 1`);
  console.log('\nNumeroIdentificacion duplicados:', dupNum.length);
  console.table(dupNum.slice(0,50));

  await conn.end();
}

if(require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { main };
