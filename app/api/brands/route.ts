import { NextRequest } from 'next/server';
import { db } from '@/db';
import { brands } from '@/db/schema/pos';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET all brands
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.storeId) {
      return new Response(JSON.stringify({ success: false, message: "No store associated with user" }), { status: 400 });
    }

    const allBrands = await db
      .select()
      .from(brands)
      .where(eq(brands.storeId, session.user.storeId))
      .orderBy(desc(brands.createdAt));
    
    return new Response(
      JSON.stringify({ success: true, data: allBrands }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching brands:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// POST - Create a new brand
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.storeId) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), { status: 401 });
    }

    const body = await request.json();
    const { name, description, code } = body;
    
    if (!name || !code) {
      return new Response(
        JSON.stringify({ success: false, message: 'Name and Code are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Check for duplicate code in store
    const existingBrand = await db.select().from(brands)
      .where(and(eq(brands.code, code), eq(brands.storeId, session.user.storeId)));
    
    if (existingBrand.length > 0) {
      return new Response(JSON.stringify({ success: false, message: 'Brand with this code already exists in your store' }), { status: 409 });
    }

    const newBrandId = `brd_${nanoid(10)}`;
    const [newBrand] = await db.insert(brands).values({
      id: newBrandId,
      storeId: session.user.storeId,
      name,
      description,
      code,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return new Response(
      JSON.stringify({ success: true, message: 'Brand created successfully', data: newBrand }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating brand:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
