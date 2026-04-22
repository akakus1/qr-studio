import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1); }

const conn = await mysql.createConnection(dbUrl);
const [tables] = await conn.query("SHOW TABLES");
console.log('=== TABLES IN DATABASE ===');
for (const row of tables) {
  const tbl = Object.values(row)[0];
  const [cols] = await conn.query(`DESCRIBE ${tbl}`);
  console.log(`\n--- ${tbl} ---`);
  for (const col of cols) {
    console.log(`  ${String(col.Field).padEnd(25)} ${String(col.Type).padEnd(35)} ${col.Null === 'NO' ? 'NOT NULL' : 'NULLABLE'} ${col.Key ? '[' + col.Key + ']' : ''} ${col.Default !== null ? 'DEFAULT=' + col.Default : ''}`);
  }
}
await conn.end();
