import { NextRequest } from 'next/server';
import { db } from '@/db';
import { brands } from '@/db/schema/pos';
import { eq } from 'drizzle-orm';

// GET single brand
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const brand = await db
      .select()
      .from(brands)
      .where(eq(brands.id, params.id));
    
    if (brand.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Brand not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: brand[0] 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching brand:', error);
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

// PUT - Update a brand
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, code } = body;
    
    const updatedBrand = await db
      .update(brands)
      .set({
        name,
        description,
        code,
        updatedAt: new Date()
      })
      .where(eq(brands.id, params.id))
      .returning();
    
    if (updatedBrand.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Brand not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Brand updated successfully',
        data: updatedBrand[0]
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error updating brand:', error);
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

// DELETE - Remove a brand
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deletedBrand = await db
      .delete(brands)
      .where(eq(brands.id, params.id))
      .returning();
    
    if (deletedBrand.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Brand not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Brand deleted successfully' 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error deleting brand:', error);
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
