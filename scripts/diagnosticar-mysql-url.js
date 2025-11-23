const mysql = require('mysql2/promise');
require('dotenv').config();

async function main(){
  const dbUrl = process.env.DATABASE_URL;
  if(!dbUrl){
    console.error('No DATABASE_URL found in env');
    process.exit(1);
  }

  try{
    const parsed = new URL(dbUrl);
    const user = parsed.username;
    const password = parsed.password;
    const host = parsed.hostname;
    const port = parsed.port || 3306;

    console.log('Connecting to MySQL server using credentials from DATABASE_URL...');
    const conn = await mysql.createConnection({ host, user, password, port });

    const [dbRows] = await conn.query('SHOW DATABASES');
    const dbNames = dbRows.map(r => Object.values(r)[0]);
    console.log('\nFound databases:', dbNames.join(', '));

    for(const db of dbNames){
      console.log('\n=== DB:', db, '===');
      // check existence of proveedor and cliente tables
      const [[provExists]] = await conn.query(
        `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'proveedor'`,
        [db]
      );
      const [[cliExists]] = await conn.query(
        `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'cliente'`,
        [db]
      );

      console.log('proveedor table present:', provExists.cnt > 0);
      if(provExists.cnt > 0){
        try{
          const [r] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${db}\`.proveedor`);
          console.log('proveedor rows:', r[0].cnt);
        }catch(e){
          console.log('error reading proveedor count:', e.message);
        }
      }

      console.log('cliente table present:', cliExists.cnt > 0);
      if(cliExists.cnt > 0){
        try{
          const [r] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${db}\`.cliente`);
          console.log('cliente rows:', r[0].cnt);
        }catch(e){
          console.log('error reading cliente count:', e.message);
        }
      }
    }

    await conn.end();
    process.exit(0);
  }catch(err){
    console.error('Error during diagnostic:', err.message);
    process.exit(1);
  }
}

if(require.main === module) main();
module.exports = { main };
