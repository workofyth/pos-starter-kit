import { db } from '@/db';
import { inventoryTransactions } from '@/db/schema/pos';
import { desc } from 'drizzle-orm';

async function checkRecent10() {
    const list = await db.select().from(inventoryTransactions).orderBy(desc(inventoryTransactions.createdAt)).limit(10);
    console.log('Recent 10 Transactions:', JSON.stringify(list, null, 2));
    process.exit(0);
}

checkRecent10();
