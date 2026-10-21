import { beforeAll, afterAll } from '@jest/globals';
import crypto from 'crypto';
import { newDb } from 'pg-mem';
import { setPool } from '../src/config/db';

let db: any;
let pool: any;

export const setupTestDb = async () => {
  db = newDb();

  // Register uuid generator with impure: true so it executes on every insert
  db.public.registerFunction({
    name: 'gen_random_uuid',
    impure: true,
    implementation: () => crypto.randomUUID(),
  });

  // Register to_char function for date formatting
  db.public.registerFunction({
    name: 'to_char',
    implementation: (d: any, format: string) => {
      if (!d) return null;
      const date = new Date(d);
      return date.toISOString().split('T')[0];
    },
  });

  const schema = `
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone_number VARCHAR(20) UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE otp_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone_number VARCHAR(20) NOT NULL,
      otp_code VARCHAR(6) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INT DEFAULT 0,
      max_attempts INT DEFAULT 3,
      is_used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE loans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      friend_name VARCHAR(100) NOT NULL,
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
      due_date DATE NOT NULL,
      is_repaid BOOLEAN DEFAULT FALSE,
      repaid_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  db.public.none(schema);
  const pgAdapter = db.adapters.createPg();
  pool = new pgAdapter.Pool();

  setPool(pool);
  return { db, pool };
};

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  if (pool && pool.end) {
    await pool.end();
  }
});
