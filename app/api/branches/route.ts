import { NextRequest } from 'next/server';
import { db } from '@/db';
import { branches } from '@/db/schema/pos';
import { eq, and, ilike, desc, asc, count, like } from 'drizzle-orm';
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
    const type = searchParams.get('type') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Build query
    let query = db
      .select()
      .from(branches)
      .limit(limit)
      .offset(offset);
    
    // Apply search filters
    let whereConditions = [];
    
    if (search) {
      whereConditions.push(ilike(branches.name, `%${search}%`));
    }
    
    const typeMap: Record<string, 'main' | 'sub'> = {
      utama: 'main',
      cabang: 'sub',
    };

    if (type && typeMap[type]) {
      whereConditions.push(eq(branches.type, typeMap[type]));
    }
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as typeof query;
    }
    
    // Apply sorting
    if (sortBy === 'name') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(branches.name)) as typeof query
        : query.orderBy(desc(branches.name)) as typeof query;
    } else if (sortBy === 'type') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(branches.type)) as typeof query 
        : query.orderBy(desc(branches.type)) as typeof query;
    } else if (sortBy === 'createdAt') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(branches.createdAt)) as typeof query 
        : query.orderBy(desc(branches.createdAt)) as typeof query;
    } else {
      query = query.orderBy(desc(branches.createdAt)) as typeof query;
    }
    
    const branchesList = await query;
    
    // Get total count for pagination
    let countQuery = db
      .select({ count: count() })
      .from(branches);
    
    let countWhereConditions = [];
    
    if (search) {
      countWhereConditions.push(ilike(branches.name, `%${search}%`));
    }
    
    if (type && typeMap[type]) {
      countWhereConditions.push(eq(branches.type, typeMap[type]));
    }
    
    if (countWhereConditions.length > 0) {
      countQuery = countQuery.where(and(...countWhereConditions)) as typeof countQuery;
    }
    
    const totalCountResult = await countQuery;
    const totalCount = typeof totalCountResult[0].count === 'number' 
      ? totalCountResult[0].count 
      : parseInt(totalCountResult[0].count as string);
    const totalPages = Math.ceil(totalCount / limit);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: branchesList,
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
    console.error('Error fetching branches:', error);
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
      address,
      phone,
      email,
      type = 'sub'
    } = body;
    
    // Validate required fields
    if (!name || !address) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Name and address are required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check for duplicate name
    const existingBranch = await db
      .select()
      .from(branches)
      .where(eq(branches.name, name));
    
    if (existingBranch.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Branch with this name already exists' 
        }),
        { 
          status: 409, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Generate unique ID
    const branchId = `brn_${nanoid(10)}`;
    
    // Insert the branch
    const [newBranch] = await db
      .insert(branches)
      .values({
        id: branchId,
        name,
        address,
        phone: phone || null,
        email: email || null,
        type
      })
      .returning();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Branch created successfully',
        data: newBranch
      }),
      { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error creating branch:', error);
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