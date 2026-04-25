import { db } from '@/db';
import { inventoryTransactions } from '@/db/schema/pos';
import { desc } from 'drizzle-orm';

async function checkRecentTransactions() {
    const list = await db.select().from(inventoryTransactions).orderBy(desc(inventoryTransactions.createdAt)).limit(5);
    console.log('Recent Transactions:', JSON.stringify(list, null, 2));
    process.exit(0);
}

checkRecentTransactions();
