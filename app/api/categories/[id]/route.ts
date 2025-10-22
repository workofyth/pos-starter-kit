import { NextRequest } from 'next/server';
import { db } from '@/db';
import { categories } from '@/db/schema/pos';
import { eq, and } from 'drizzle-orm';

// GET a single category by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Category ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    
    if (category.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Category not found' 
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
        data: category[0]
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching category:', error);
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

// PUT - Update a category by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    if (!id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Category ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if category exists
    const existingCategory = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    
    if (existingCategory.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Category not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const {
      name,
      description,
      code,
      parentId
    } = body;
    
    // Check for duplicate code if provided and different from current
    if (code && code !== existingCategory[0].code) {
      const existingCategoryByCode = await db
        .select()
        .from(categories)
        .where(eq(categories.code, code));
      
      if (existingCategoryByCode.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Category with this code already exists' 
          }),
          { 
            status: 409, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    // Validate parent category exists if provided
    if (parentId) {
      const parentCategory = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, parentId));
      
      if (parentCategory.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Parent category does not exist' 
          }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    // Update the category
    const [updatedCategory] = await db
      .update(categories)
      .set({
        name: name !== undefined ? name : existingCategory[0].name,
        description: description !== undefined ? description : existingCategory[0].description,
        code: code !== undefined ? code : existingCategory[0].code,
        parentId: parentId !== undefined ? parentId : existingCategory[0].parentId,
        updatedAt: new Date()
      })
      .where(eq(categories.id, id))
      .returning();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Category updated successfully',
        data: updatedCategory
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error updating category:', error);
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

// DELETE a category by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Category ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if category exists
    const existingCategory = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    
    if (existingCategory.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Category not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if category has children (subcategories)
    const childCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.parentId, id));
    
    if (childCategories.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Cannot delete category with child categories' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Delete the category
    await db
      .delete(categories)
      .where(eq(categories.id, id));
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Category deleted successfully'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error deleting category:', error);
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