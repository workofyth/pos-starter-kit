import { NextRequest } from 'next/server';
import { db } from '@/db';
import { categories } from '@/db/schema/pos';
import { eq, and, ilike, desc, asc, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireOnboarded, requireActiveAccess, subscriptionGuardResponse } from '@/lib/subscription-guard';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireOnboarded();
    if (!guard.ok) return subscriptionGuardResponse(guard);
    const storeId = guard.storeId;

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
    const whereConditions = [eq(categories.storeId, storeId)];
    if (search) {
      whereConditions.push(ilike(categories.name, `%${search}%`));
    }

    let query = db
      .select()
      .from(categories)
      .where(and(...whereConditions))
      .limit(limit)
      .offset(offset);
    
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
    const totalCountResult = await db
      .select({ count: count() })
      .from(categories)
      .where(and(...whereConditions));
    
    const totalCount = typeof totalCountResult[0].count === 'number' 
      ? totalCountResult[0].count 
      : parseInt(totalCountResult[0].count as string);
    const totalPages = Math.ceil(totalCount / limit);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: categoriesList,
        pagination: {
          page, limit, totalCount, totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching categories:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireActiveAccess();
    if (!guard.ok) return subscriptionGuardResponse(guard);
    const storeId = guard.storeId;

    const body = await request.json();
    const { name, description, code, parentId, point } = body;

    if (!name || !code) {
      return new Response(JSON.stringify({ success: false, message: 'Name and code are required' }), { status: 400 });
    }

    // Check for duplicate code within the same store
    const existingCategory = await db
      .select()
      .from(categories)
      .where(and(eq(categories.code, code), eq(categories.storeId, storeId)));

    if (existingCategory.length > 0) {
      return new Response(JSON.stringify({ success: false, message: 'Category with this code already exists in your store' }), { status: 409 });
    }

    // Validate parent category belongs to the store
    if (parentId) {
      const parentCategory = await db.select({ id: categories.id }).from(categories)
        .where(and(eq(categories.id, parentId), eq(categories.storeId, storeId)));
      if (parentCategory.length === 0) {
        return new Response(JSON.stringify({ success: false, message: 'Parent category does not exist' }), { status: 400 });
      }
    }

    const categoryId = `cat_${nanoid(10)}`;
    const [newCategory] = await db.insert(categories).values({
        id: categoryId,
        storeId,
        name,
        description: description || null,
        code,
        parentId: parentId || null,
        point: point ? parseFloat(point.toString()).toFixed(2) : "0.00"
      }).returning() as any[];
    
    return new Response(
      JSON.stringify({ success: true, message: 'Category created successfully', data: newCategory }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating category:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}