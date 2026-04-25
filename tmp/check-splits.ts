import { db } from '@/db';
import { inventoryTransactions } from '@/db/schema/pos';
import { eq } from 'drizzle-orm';

async function checkSplitRecords() {
    const list = await db.select().from(inventoryTransactions).where(eq(inventoryTransactions.type, 'split')).limit(10);
    console.log('Split Records:', JSON.stringify(list, null, 2));
    process.exit(0);
}

checkSplitRecords();
