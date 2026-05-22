import { NextRequest } from 'next/server';
import { db } from '@/db';
import { members } from '@/db/schema/pos';
import { eq, and, ilike, desc, asc, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.storeId) {
      return new Response(JSON.stringify({ success: false, message: "No store associated with user" }), { status: 400 });
    }

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
    const whereConditions = [eq(members.storeId, session.user.storeId)];
    if (search) {
      whereConditions.push(ilike(members.name, `%${search}%`));
    }

    let query = db
      .select()
      .from(members)
      .where(and(...whereConditions))
      .limit(limit)
      .offset(offset);
    
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
    
    // Get total count
    const totalCountResult = await db
      .select({ count: count() })
      .from(members)
      .where(and(...whereConditions));
    
    const totalCount = Number(totalCountResult[0].count);
    const totalPages = Math.ceil(totalCount / limit);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: membersList,
        pagination: {
          page, limit, totalCount, totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching members:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.storeId) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), { status: 401 });
    }

    const body = await request.json();
    const { name, phone, email, address, points = 0 } = body;
    
    if (!name || !phone) {
      return new Response(JSON.stringify({ success: false, message: 'Name and phone are required' }), { status: 400 });
    }
    
    // Check for duplicate email within the same store
    if (email) {
      const existingMember = await db.select().from(members)
        .where(and(eq(members.email, email), eq(members.storeId, session.user.storeId)));
      
      if (existingMember.length > 0) {
        return new Response(JSON.stringify({ success: false, message: 'Member with this email already exists in your store' }), { status: 409 });
      }
    }
    
    // Check for duplicate phone within the same store
    const existingMemberByPhone = await db.select().from(members)
      .where(and(eq(members.phone, phone), eq(members.storeId, session.user.storeId)));
    
    if (existingMemberByPhone.length > 0) {
      return new Response(JSON.stringify({ success: false, message: 'Member with this phone number already exists in your store' }), { status: 409 });
    }
    
    const memberId = `mem_${nanoid(10)}`;
    const [newMember] = await db.insert(members).values({
        id: memberId,
        storeId: session.user.storeId,
        name, phone, email: email || null, address: address || null, points
      }).returning();
    
    return new Response(
      JSON.stringify({ success: true, message: 'Member created successfully', data: newMember }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating member:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}