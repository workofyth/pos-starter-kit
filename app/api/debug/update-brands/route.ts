import { NextRequest } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // 1. Add the column via raw SQL if it doesn't exist
    // Using a safe approach to add column if it doesn't exist
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'brand') THEN
          ALTER TABLE products ADD COLUMN brand TEXT DEFAULT 'EJM';
        END IF;
      END $$;
    `);

    // 2. Update initial brands as requested
    await db.execute(sql`
      UPDATE products 
      SET brand = 'Hero 57' 
      WHERE name ILIKE '%Strawberry Cheesecake 3Mg%' 
         OR name ILIKE '%Melon Splash%' 
         OR name ILIKE '%Mango Tango 3mg%';
    `);

    // 3. Set others to EJM (though default is EJM, just to be sure)
    await db.execute(sql`
      UPDATE products 
      SET brand = 'EJM' 
      WHERE brand IS NULL OR brand = '';
    `);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Schema updated and brands initialized successfully' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Migration failed',
      error: (error as Error).message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
