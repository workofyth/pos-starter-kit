import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
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
  exchangePoints,
  user
} from '@/db/schema/pos';
import { isNull, eq, or } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    console.log('Starting data cleanup...');

    // 1. Ensure JZo2l9swAB4yMyTixb_1D exists in storeSettings
    const targetStoreId = 'JZo2l9swAB4yMyTixb_1D';
    const existingStore = await db.select().from(storeSettings).where(eq(storeSettings.id, targetStoreId)).limit(1);
    
    if (existingStore.length === 0) {
      // Check if it exists as STORE-001 first, and rename it
      const oldStore = await db.select().from(storeSettings).where(eq(storeSettings.id, 'STORE-001')).limit(1);
      if (oldStore.length > 0) {
        console.log('Renaming STORE-001 to JZo2l9swAB4yMyTixb_1D...');
        await db.update(storeSettings).set({ id: targetStoreId }).where(eq(storeSettings.id, 'STORE-001'));
      } else {
        console.log('Creating default store JZo2l9swAB4yMyTixb_1D...');
        const firstUser = await db.select().from(user).limit(1);
        if (firstUser.length === 0) {
          return NextResponse.json({ success: false, message: 'No users found in database.' }, { status: 400 });
        }
        await db.insert(storeSettings).values({
          id: targetStoreId,
          name: 'Default Store',
          address: 'Default Address',
          whatsapp: '0000000000',
          storeType: 'MINIMARKET',
          ownerId: firstUser[0].id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
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

    const results: any = {};

    for (const item of tablesToUpdate) {
      console.log(`Updating ${item.name}...`);
      // @ts-ignore
      const updated = await db.update(item.table)
        .set({ storeId: targetStoreId })
        .where(or(isNull(item.table.storeId), eq(item.table.storeId, 'STORE-001')))
        .returning();
      results[item.name] = updated.length;
    }

    // Update users as well
    console.log('Updating users...');
    const updatedUsers = await db.update(user)
      .set({ storeId: targetStoreId })
      .where(or(isNull(user.storeId), eq(user.storeId, 'STORE-001')))
      .returning();
    results['users'] = updatedUsers.length;

    return NextResponse.json({ success: true, message: 'Cleanup completed', results });
  } catch (error) {
    console.error('Cleanup failed:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
