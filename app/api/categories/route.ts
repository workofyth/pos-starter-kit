import { NextRequest } from 'next/server';
import { db } from '@/db';
import { categories } from '@/db/schema/pos';
import { eq, and, ilike, desc, asc, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Search parameters
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Build query
    let query = db
      .select()
      .from(categories)
      .limit(limit)
      .offset(offset);
    
    // Apply search filter
    if (search) {
      query = query.where(
        ilike(categories.name, `%${search}%`)
      ) as typeof query;
    }
    
    // Apply sorting
    if (sortBy === 'name') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(categories.name)) as typeof query
        : query.orderBy(desc(categories.name)) as typeof query;
    } else if (sortBy === 'code') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(categories.code)) as typeof query
        : query.orderBy(desc(categories.code)) as typeof query;
    } else if (sortBy === 'createdAt') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(categories.createdAt)) as typeof query 
        : query.orderBy(desc(categories.createdAt)) as typeof query;
    } else {
      query = query.orderBy(desc(categories.createdAt)) as typeof query;
    }
    
    const categoriesList = await query;
    
    // Get total count for pagination
    let countQuery = db
      .select({ count: count() })
      .from(categories);
    
    if (search) {
       countQuery.where(ilike(categories.name, `%${search}%`));
    }
    
    const totalCountResult = await countQuery;
    const totalCount = typeof totalCountResult[0].count === 'number' 
      ? totalCountResult[0].count 
      : parseInt(totalCountResult[0].count as string);
    const totalPages = Math.ceil(totalCount / limit);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: categoriesList,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching categories:', error);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      name,
      description,
      code,
      parentId
    } = body;
    
    // Validate required fields
    if (!name || !code) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Name and code are required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check for duplicate code
    const existingCategory = await db
      .select()
      .from(categories)
      .where(eq(categories.code, code));
    
    if (existingCategory.length > 0) {
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
    
    // Generate unique ID
    const categoryId = `cat_${nanoid(10)}`;
    
    // Insert the category
    const [newCategory] = await db
      .insert(categories)
      .values({
        id: categoryId,
        name,
        description: description || null,
        code,
        parentId: parentId || null
      })
      .returning() as { id: string; name: string; description: string | null; code: string; parentId: string | null }[];
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Category created successfully',
        data: newCategory
      }),
      { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error creating category:', error);
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