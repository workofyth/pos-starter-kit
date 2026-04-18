import { NextRequest } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Create the app_settings table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "app_settings" (
        "key" text PRIMARY KEY NOT NULL,
        "value" text NOT NULL,
        "description" text,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Database tables initialized successfully. The app_settings table is now ready.' 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Initialization error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Failed to initialize database: ' + (error as Error).message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
