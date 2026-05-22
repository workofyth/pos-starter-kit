import { db } from './db';
import { 
  storeSettings, 
  branches, 
  categories, 
  brands, 
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
  draftOrders, 
  notifications, 
  exchangePoints 
} from './db/schema/pos';
import { isNull, eq } from 'drizzle-orm';

async function cleanup() {
  console.log('Starting data cleanup...');

  try {
    // 1. Ensure STORE-001 exists in storeSettings
    const existingStore = await db.select().from(storeSettings).where(eq(storeSettings.id, 'STORE-001')).limit(1);
    
    if (existingStore.length === 0) {
      console.log('Creating default store STORE-001...');
      // We need an ownerId. Let's find the first user.
      const { user } = await import('./db/schema/auth');
      const firstUser = await db.select().from(user).limit(1);
      
      if (firstUser.length === 0) {
        console.error('No users found in database. Please register a user first.');
        return;
      }

      await db.insert(storeSettings).values({
        id: 'STORE-001',
        name: 'Default Store',
        address: 'Default Address',
        whatsapp: '0000000000',
        storeType: 'MINIMARKET',
        ownerId: firstUser[0].id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Default store created.');
    }

    const tablesToUpdate = [
      { name: 'branches', table: branches },
      { name: 'categories', table: categories },
      { name: 'brands', table: brands },
      { name: 'products', table: products },
      { name: 'productPrices', table: productPrices },
      { name: 'members', table: members },
      { name: 'suppliers', table: suppliers },
      { name: 'inventory', table: inventory },
      { name: 'inventoryTransactions', table: inventoryTransactions },
      { name: 'discounts', table: discounts },
      { name: 'transactions', table: transactions },
      { name: 'transactionDetails', table: transactionDetails },
      { name: 'purchaseOrders', table: purchaseOrders },
      { name: 'purchaseOrderDetails', table: purchaseOrderDetails },
      { name: 'draftOrders', table: draftOrders },
      { name: 'notifications', table: notifications },
      { name: 'exchangePoints', table: exchangePoints },
    ];

    for (const item of tablesToUpdate) {
      console.log(`Updating ${item.name}...`);
      // @ts-ignore
      const result = await db.update(item.table)
        // @ts-ignore
        .set({ storeId: 'STORE-001' })
        // @ts-ignore
        .where(isNull(item.table.storeId))
        .returning();
      console.log(`Updated ${result.length} rows in ${item.name}.`);
    }

    console.log('Cleanup completed successfully.');
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

cleanup();
