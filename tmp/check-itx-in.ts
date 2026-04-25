import { db } from '@/db';
import { inventoryTransactions } from '@/db/schema/pos';
import { eq } from 'drizzle-orm';

async function checkITXIn() {
    const list = await db.select().from(inventoryTransactions).where(eq(inventoryTransactions.type, 'in')).limit(10);
    console.log('PO Inventory Transactions:', JSON.stringify(list, null, 2));
    process.exit(0);
}

checkITXIn();
