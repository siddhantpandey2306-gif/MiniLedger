import { Pool, QueryResult, QueryResultRow, types } from 'pg';
import crypto from 'crypto';
import { config } from './env';

// Configure node-postgres type parsers:
// 1. Parse PostgreSQL DATE (OID 1082) as a raw 'YYYY-MM-DD' string to avoid timezone shifting
types.setTypeParser(types.builtins.DATE, (val: string) => val);

// 2. Parse NUMERIC (OID 1700) as floating point number for clean monetary calculations
types.setTypeParser(types.builtins.NUMERIC, (val: string) => parseFloat(val));

// Configure connection pool with connection settings and resilience defaults
let pool: any = new Pool({
  connectionString: config.databaseUrl,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 3000, // Return an error after 3 seconds if connection cannot be established
});

// Handle unexpected errors on idle pool clients to prevent process crash
if (pool && typeof pool.on === 'function') {
  pool.on('error', (err: any) => {
    console.error('[POSTGRESQL POOL ERROR] Unexpected idle client error:', err);
  });
}

// Getter and setter allow switching to an in-memory/test pool during automated testing
export const getPool = () => pool;

export const setPool = (newPool: any) => {
  pool = newPool;
  if (pool && typeof pool.on === 'function') {
    pool.on('error', (err: any) => {
      console.error('[DATABASE POOL ERROR] Idle client error:', err);
    });
  }
};

/**
 * Execute a parameterized SQL query against PostgreSQL.
 * @param text Parameterized SQL statement (e.g. 'SELECT * FROM users WHERE id = $1')
 * @param params Query arguments array corresponding to placeholders ($1, $2, etc.)
 */
export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  return pool.query(text, params);
};

/**
 * Verifies live PostgreSQL connectivity by running a simple ping query.
 */
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await query('SELECT 1 AS ping');
    return true;
  } catch {
    return false;
  }
};

/**
 * Initializes database for development if a native PostgreSQL daemon is not reachable.
 */
export const ensureDatabaseConnection = async (): Promise<boolean> => {
  const isConnected = await checkDatabaseConnection();
  if (isConnected) {
    console.log('[DATABASE] Successfully connected to native PostgreSQL at ' + config.databaseUrl);
    return true;
  }

  if (config.nodeEnv !== 'production') {
    try {
      console.log('[DATABASE] Native PostgreSQL unreachable on localhost:5432.');
      console.log('[DATABASE] Initializing embedded in-memory PostgreSQL engine (pg-mem) for development...');

      // Dynamically require pg-mem
      const { newDb } = require('pg-mem');
      const memDb = newDb();

      memDb.public.registerFunction({
        name: 'gen_random_uuid',
        impure: true,
        implementation: () => crypto.randomUUID(),
      });

      memDb.public.registerFunction({
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

      memDb.public.none(schema);

      // Seed initial dev data
      const seedSql = `
        INSERT INTO users (id, phone_number) VALUES
        ('11111111-1111-1111-1111-111111111111', '+919876543210'),
        ('22222222-2222-2222-2222-222222222222', '+919123456789');

        INSERT INTO loans (id, user_id, friend_name, amount, due_date, is_repaid, notes) VALUES
        ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Rahul Sharma', 1500.00, '2026-11-20', FALSE, 'Concert ticket'),
        ('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Priya Patel', 3000.00, '2026-10-15', FALSE, 'Weekend trip fuel'),
        ('aaaa3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Amit Verma', 2000.00, '2026-09-30', TRUE, 'Dinner bill');
      `;

      memDb.public.none(seedSql);

      const pgAdapter = memDb.adapters.createPg();
      const memPool = new pgAdapter.Pool();
      setPool(memPool);

      console.log('[DATABASE] Embedded PostgreSQL engine successfully ready with seed data.');
      return true;
    } catch (memErr) {
      console.error('[DATABASE] Failed to initialize embedded development database:', memErr);
      return false;
    }
  }

  return false;
};

/**
 * Closes all active connections in the pool gracefully.
 */
export const closePool = async (): Promise<void> => {
  if (pool && typeof pool.end === 'function') {
    await pool.end();
  }
};

export default {
  query,
  getPool,
  setPool,
  checkDatabaseConnection,
  ensureDatabaseConnection,
  closePool,
};
