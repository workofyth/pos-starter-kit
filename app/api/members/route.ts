import { NextRequest } from 'next/server';
import { db } from '@/db';
import { members } from '@/db/schema/pos';
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
      .from(members)
      .limit(limit)
      .offset(offset);
    
    // Apply search filter
    if (search) {
      query = query.where(
        ilike(members.name, `%${search}%`) 
      ) as typeof query;
    }
    
    // Apply sorting
    if (sortBy === 'name') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(members.name)) as typeof query
        : query.orderBy(desc(members.name)) as typeof query;
    } else if (sortBy === 'points') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(members.points)) as typeof query
        : query.orderBy(desc(members.points)) as typeof query;
    } else if (sortBy === 'createdAt') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(members.createdAt)) as typeof query
        : query.orderBy(desc(members.createdAt)) as typeof query;
    } else {
      query = query.orderBy(desc(members.createdAt)) as typeof query;
    }
    
    const membersList = await query;
    
    // Get total count for pagination
    let countQuery: any = db
      .select({ count: count() })
      .from(members);
    
    if (search) {
      countQuery = countQuery.where(ilike(members.name, `%${search}%`));
    }
    
    const totalCountResult = await countQuery;
    const totalCount = typeof totalCountResult[0].count === 'number' 
      ? totalCountResult[0].count 
      : parseInt(totalCountResult[0].count as string);
    const totalPages = Math.ceil(totalCount / limit);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: membersList,
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
    console.error('Error fetching members:', error);
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
      phone,
      email,
      address,
      points = 0
    } = body;
    
    // Validate required fields
    if (!name || !phone) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Name and phone are required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check for duplicate email if provided
    if (email) {
      const existingMember = await db
        .select()
        .from(members)
        .where(eq(members.email, email));
      
      if (existingMember.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Member with this email already exists' 
          }),
          { 
            status: 409, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    // Check for duplicate phone
    const existingMemberByPhone = await db
      .select()
      .from(members)
      .where(eq(members.phone, phone));
    
    if (existingMemberByPhone.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Member with this phone number already exists' 
        }),
        { 
          status: 409, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Generate unique ID
    const memberId = `mem_${nanoid(10)}`;
    
    // Insert the member
    const [newMember] = await db
      .insert(members)
      .values({
        id: memberId,
        name,
        phone,
        email: email || null,
        address: address || null,
        points
      })
      .returning();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Member created successfully',
        data: newMember
      }),
      { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error creating member:', error);
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