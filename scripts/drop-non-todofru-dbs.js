const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main(){
  const dbUrl = process.env.DATABASE_URL;
  if(!dbUrl){ console.error('No DATABASE_URL found'); process.exit(1); }
  const parsed = new URL(dbUrl);
  const user = parsed.username;
  const password = parsed.password;
  const host = parsed.hostname;
  const port = parsed.port || 3306;

  const conn = await mysql.createConnection({ host, user, password, port });
  console.log('Connected to MySQL server');

  const [dbRows] = await conn.query('SHOW DATABASES');
  const dbNames = dbRows.map(r => Object.values(r)[0]);

  const keep = new Set(['information_schema','mysql','performance_schema','sys','todofru']);
  const toDrop = dbNames.filter(d => !keep.has(d));

  if(toDrop.length === 0){
    console.log('No user databases to drop.');
    await conn.end();
    return;
  }

  // ensure backups dir
  const backupsDir = path.join(__dirname, '..', 'backups');
  if(!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

  for(const db of toDrop){
    try{
      console.log(`\n=== Backing up DB: ${db} ===`);
      const [tablesRows] = await conn.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = ?`, [db]);
      const tables = tablesRows.map(r => r.TABLE_NAME || r.table_name || Object.values(r)[0]);

      const dump = { database: db, exportedAt: new Date().toISOString(), tables: {} };

      for(const t of tables){
        console.log(` - exporting table ${t} ...`);
        try{
          const [rows] = await conn.query(`SELECT * FROM \`${db}\`.\`${t}\``);
          dump.tables[t] = rows; // may be empty array
        }catch(e){
          console.warn(`   > could not export table ${t}: ${e.message}`);
          dump.tables[t] = { error: e.message };
        }
      }

      const filename = path.join(backupsDir, `${db}_backup_${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
      fs.writeFileSync(filename, JSON.stringify(dump, null, 2), 'utf8');
      console.log(` Backup written to ${filename}`);

      // Now drop the database
      console.log(` Dropping database ${db} ...`);
      await conn.query(`DROP DATABASE \`${db}\``);
      console.log(` Database ${db} dropped.`);
    }catch(err){
      console.error(`Failed processing ${db}:`, err.message);
    }
  }

  await conn.end();
  console.log('\nDone.');
}

if(require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { main };
