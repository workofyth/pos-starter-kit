import { NextRequest } from 'next/server';
import { db } from '@/db';
import { branches } from '@/db/schema/pos';
import { eq, and, ilike, desc, asc, count, inArray } from 'drizzle-orm';
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
    const type = searchParams.get('type') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Build query
    const whereConditions = [eq(branches.storeId, session.user.storeId)];
    
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
    
    let query = db
      .select()
      .from(branches)
      .where(and(...whereConditions))
      .limit(limit)
      .offset(offset);
    
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
    const totalCountResult = await db
      .select({ count: count() })
      .from(branches)
      .where(and(...whereConditions));
    
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
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching branches:', error);
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
    const { name, address, phone, email, type = 'sub' } = body;
    
    if (!name || !address) {
      return new Response(JSON.stringify({ success: false, message: 'Name and address are required' }), { status: 400 });
    }

    // 1. Check Plan Limits
    const existingBranchesCountResult = await db
      .select({ count: count() })
      .from(branches)
      .where(and(
        eq(branches.storeId, session.user.storeId),
        eq(branches.type, 'sub')
      ));
    
    const subBranchCount = Number(existingBranchesCountResult[0].count);
    const plan = session.user.plan;
    const subscriptionStatus = session.user.subscriptionStatus;

    // Trial: 0 sub-branches
    if (subscriptionStatus === 'trialing' && subBranchCount >= 0 && type === 'sub') {
       return new Response(JSON.stringify({ success: false, message: 'Trial plan does not allow adding sub-branches. Please upgrade to Startup or Business.' }), { status: 403 });
    }

    // Startup: 1 sub-branch
    if (plan === 'startup' && subBranchCount >= 1 && type === 'sub') {
       return new Response(JSON.stringify({ success: false, message: 'Startup plan limit reached (max 1 sub-branch). Please upgrade to Business for more.' }), { status: 403 });
    }

    // Business: 5 sub-branches
    if (plan === 'business' && subBranchCount >= 5 && type === 'sub') {
       return new Response(JSON.stringify({ success: false, message: 'Business plan limit reached (max 5 sub-branches). Please upgrade to Enterprise for unlimited.' }), { status: 403 });
    }
    
    // Check for duplicate name within the same store
    const existingBranch = await db
      .select()
      .from(branches)
      .where(and(
        eq(branches.storeId, session.user.storeId),
        eq(branches.name, name)
      ));
    
    if (existingBranch.length > 0) {
      return new Response(JSON.stringify({ success: false, message: 'Branch with this name already exists in your store' }), { status: 409 });
    }
    
    const branchId = `brn_${nanoid(10)}`;
    
    const [newBranch] = await db
      .insert(branches)
      .values({
        id: branchId,
        storeId: session.user.storeId,
        name,
        address,
        phone: phone || null,
        email: email || null,
        type
      })
      .returning();
    
    return new Response(
      JSON.stringify({ success: true, message: 'Branch created successfully', data: newBranch }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating branch:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}