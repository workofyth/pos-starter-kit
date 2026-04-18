import { NextRequest } from 'next/server';
import { db } from '@/db';
import { brands } from '@/db/schema/pos';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// GET all brands
export async function GET(request: NextRequest) {
  try {
    const allBrands = await db
      .select()
      .from(brands)
      .orderBy(desc(brands.createdAt));
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: allBrands 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching brands:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

// POST - Create a new brand
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, code } = body;
    
    if (!name || !code) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Name and Code are required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const newBrandId = `brd_${nanoid(10)}`;
    const newBrand = await db.insert(brands).values({
      id: newBrandId,
      name,
      description,
      code,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Brand created successfully',
        data: newBrand[0]
      }),
      { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error creating brand:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}
