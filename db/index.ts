import 'dotenv/config';

// Import schemas (this may cause evaluation issues, so we handle them appropriately)
import { user, session, account, verification } from './schema/auth';
import { 
  branches, 
  userBranches, 
  categories, 
  products, 
  productPrices, 
  members, 
  suppliers, 
  inventory, 
  inventoryTransactions, 
  discounts, 
  transactions, 
  transactionDetails, 
  purchaseOrders, 
  purchaseOrderDetails 
} from './schema/pos';

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

// Export the database instance with schema
export const db = drizzle(pool, { 
  schema: {
    // Auth schema
    user,
    session,
    account,
    verification,
    // POS schema
    branches,
    userBranches,
    categories,
    products,
    productPrices,
    members,
    suppliers,
    inventory,
    inventoryTransactions,
    discounts,
    transactions,
    transactionDetails,
    purchaseOrders,
    purchaseOrderDetails,
  },
  logger: process.env.NODE_ENV !== "production",
});

// Also export schemas separately
export * from './schema/auth';
export * from './schema/pos';