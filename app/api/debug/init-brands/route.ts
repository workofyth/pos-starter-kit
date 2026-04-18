import { NextRequest } from 'next/server';
import { db } from '@/db';
import { brands } from '@/db/schema/pos';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    // 1. Create brands table if it doesn't exist (Drizzle push might fail on Windows)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS brands (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        code TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Initialize default brands
    const defaultBrands = [
      { id: `brd_${nanoid(10)}`, name: 'EJM', code: 'EJM', description: 'Export Juice Malaysia' },
      { id: `brd_${nanoid(10)}`, name: 'Hero 57', code: 'H57', description: 'Hero 57 E-Liquid' }
    ];

    for (const brand of defaultBrands) {
      // Check if code exists to avoid duplicates
      const exists = await db.execute(sql`SELECT 1 FROM brands WHERE code = ${brand.code}`);
      if (!exists.rows.length) {
        await db.execute(sql`
          INSERT INTO brands (id, name, code, description, created_at, updated_at)
          VALUES (${brand.id}, ${brand.name}, ${brand.code}, ${brand.description}, NOW(), NOW());
        `);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Brands table created and initialized' 
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
