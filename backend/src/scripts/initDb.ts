import fs from 'fs';
import path from 'path';
import { query, getPool } from '../config/db';

async function initDb() {
  console.log('Initializing MiniLedger database schema...');
  try {
    const schemaPath = path.resolve(__dirname, '../../sql/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    await query(schemaSql);
    console.log('Database schema successfully initialized!');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    process.exit(1);
  } finally {
    await getPool().end();
  }
}

initDb();
