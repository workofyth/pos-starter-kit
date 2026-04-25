import { db } from '@/db';
import { inventoryTransactions } from '@/db/schema/pos';
import { desc } from 'drizzle-orm';

async function checkLatest() {
    const [latest] = await db.select().from(inventoryTransactions).orderBy(desc(inventoryTransactions.createdAt)).limit(1);
    console.log('Latest Transaction:', JSON.stringify(latest, null, 2));
    process.exit(0);
}

checkLatest();
