import fs from 'fs';
import path from 'path';
import { query, getPool } from '../config/db';

async function seedDb() {
  console.log('Seeding MiniLedger database with sample data...');
  try {
    const seedPath = path.resolve(__dirname, '../../sql/seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf-8');

    await query(seedSql);
    console.log('Sample seed data successfully loaded!');
  } catch (error) {
    console.error('Failed to seed database:', error);
    process.exit(1);
  } finally {
    await getPool().end();
  }
}

seedDb();
