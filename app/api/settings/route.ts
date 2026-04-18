import { NextRequest } from 'next/server';
import { db } from '@/db';
import { appSettings } from '@/db/schema/pos';
import { eq } from 'drizzle-orm';

// GET - Get all settings or specific one
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (key) {
      const setting = await db.select().from(appSettings).where(eq(appSettings.key, key));
      return new Response(JSON.stringify({ success: true, data: setting[0] || null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const settings = await db.select().from(appSettings);
    return new Response(JSON.stringify({ success: true, data: settings }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST - Save/Update setting
export async function POST(request: NextRequest) {
  try {
    const { key, value, description } = await request.json();
    
    if (!key) {
      return new Response(JSON.stringify({ success: false, message: 'Key is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if exists
    const existing = await db.select().from(appSettings).where(eq(appSettings.key, key));
    
    if (existing.length > 0) {
      await db.update(appSettings)
        .set({ value, description, updatedAt: new Date() })
        .where(eq(appSettings.key, key));
    } else {
      await db.insert(appSettings).values({
        key,
        value,
        description,
        updatedAt: new Date()
      });
    }
    
    return new Response(JSON.stringify({ success: true, message: 'Setting saved successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
