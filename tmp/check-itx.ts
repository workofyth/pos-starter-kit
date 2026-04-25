import { db } from '@/db';
import { inventoryTransactions } from '@/db/schema/pos';

async function checkITX() {
    const list = await db.select().from(inventoryTransactions).limit(10);
    console.log('Recent Inventory Transactions:', JSON.stringify(list, null, 2));
    process.exit(0);
}

checkITX();
