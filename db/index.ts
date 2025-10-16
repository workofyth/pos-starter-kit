import 'dotenv/config';

// Create the database connection separately to avoid schema issues during module evaluation
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
});

// Export the connection
export const db = drizzle(pool, {
  logger: process.env.NODE_ENV !== "production",
});

// Export schemas separately to avoid module evaluation issues
export * from './schema/auth';
export * from './schema/pos';