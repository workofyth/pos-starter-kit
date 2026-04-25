import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function checkColumns() {
    const res = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'inventory_transactions'`);
    console.log('Columns:', JSON.stringify(res, null, 2));
    process.exit(0);
}

checkColumns();
