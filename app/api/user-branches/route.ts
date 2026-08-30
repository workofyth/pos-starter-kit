import { NextRequest } from 'next/server';
import { db } from '@/db';
import { inventory, products, branches, inventoryTransactions, userBranches, user } from '@/db/schema/pos';
import { eq, and, ilike, desc, asc, count, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireOnboarded, requireActiveAccess, subscriptionGuardResponse } from '@/lib/subscription-guard';

// GET - Get user branches assignments
export async function GET(request: NextRequest) {
  try {
    const guard = await requireOnboarded();
    if (!guard.ok) return subscriptionGuardResponse(guard);

    const { searchParams } = new URL(request.url);

    // Query parameters
    const userId = searchParams.get('userId') || '';
    const branchId = searchParams.get('branchId') || '';
    const role = searchParams.get('role') || '';
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Cache Key (scoped by store so results never leak across tenants)
    const cacheKey = `user-branches:${guard.storeId}:${userId}:${branchId}:${role}:${isActive}:${page}`;
    const { default: redis } = await import('@/lib/redis');
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return new Response(JSON.stringify(cached), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {}

    // Build query
    let query = db
      .select({
        id: userBranches.id,
        userId: userBranches.userId,
        branchId: userBranches.branchId,
        role: userBranches.role,
        isMainAdmin: userBranches.isMainAdmin,
        isActive: userBranches.isActive,
        createdAt: userBranches.createdAt,
        updatedAt: userBranches.updatedAt,
        // Include branch information
        branch: {
          id: branches.id,
          name: branches.name,
          address: branches.address,
          phone: branches.phone,
          email: branches.email,
          type: branches.type,
          createdAt: branches.createdAt,
          updatedAt: branches.updatedAt,
        }
      })
      .from(userBranches)
      .leftJoin(branches, eq(userBranches.branchId, branches.id))
      .limit(limit)
      .offset(offset);
    
    // Apply filters
    const whereConditions = [eq(branches.storeId, guard.storeId)];

    if (userId) {
      whereConditions.push(eq(userBranches.userId, userId));
    }
    
    if (branchId) {
      whereConditions.push(eq(userBranches.branchId, branchId));
    }
    
    if (role === "admin" || role === "manager" || role === "cashier" || role === "staff") {
      whereConditions.push(eq(userBranches.role, role)) ;
    }
    
    if (isActive !== null && isActive !== undefined) {
      whereConditions.push(eq(userBranches.isActive, isActive === 'true'));
    }
    
    if (whereConditions.length > 0) {
      // Filter out any undefined conditions
      const validConditions = whereConditions.filter(condition => condition !== undefined);
      if (validConditions.length > 0) {
        query = query.where(and(...validConditions)) as typeof query;
      }
    }
    
    // Apply sorting
    query = query.orderBy(desc(userBranches.createdAt)) as typeof query;
    
    const userBranchesList = await query;
    
    // Get total count for pagination
    let countQuery = db
      .select({ count: count() })
      .from(userBranches)
      .leftJoin(branches, eq(userBranches.branchId, branches.id));

    const countWhereConditions = [eq(branches.storeId, guard.storeId)];

    if (userId) {
      countWhereConditions.push(eq(userBranches.userId, userId));
    }
    
    if (branchId) {
      countWhereConditions.push(eq(userBranches.branchId, branchId));
    }
    
    if (role === "admin" || role === "manager" || role === "cashier" || role === "staff") {
      countWhereConditions.push(eq(userBranches.role, role)) ;
    }
    
    if (isActive !== null && isActive !== undefined) {
      countWhereConditions.push(eq(userBranches.isActive, isActive === 'true'));
    }
    
    if (countWhereConditions.length > 0) {
      // Filter out any undefined conditions
      const validCountConditions = countWhereConditions.filter(condition => condition !== undefined);
      if (validCountConditions.length > 0) {
        countQuery = countQuery.where(and(...validCountConditions)) as typeof countQuery;
      }
    }
    
    const totalCountResult = await countQuery;
    const totalCount = typeof totalCountResult[0].count === 'number' 
      ? totalCountResult[0].count 
      : parseInt(totalCountResult[0].count as string);
    const totalPages = Math.ceil(totalCount / limit);
    
    const result = {
      success: true,
      data: userBranchesList,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };

    try {
      const { default: redis } = await import('@/lib/redis');
      await redis.setex(cacheKey, 300, result);
    } catch (e) {}

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching user branches:', error);
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

// POST - Create user branch assignment
export async function POST(request: NextRequest) {
  try {
    const guard = await requireActiveAccess();
    if (!guard.ok) return subscriptionGuardResponse(guard);

    const body = await request.json();

    const {
      userId,
      branchId,
      role,
      isActive = true
    } = body;

    // Validate required fields
    if (!userId || !branchId || !role) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'User ID, Branch ID, and Role are required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // The branch being assigned to must belong to the caller's own store.
    const [targetBranch] = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.id, branchId), eq(branches.storeId, guard.storeId)))
      .limit(1);

    if (!targetBranch) {
      return new Response(
        JSON.stringify({ success: false, message: 'Branch not found in your store' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has a branch assignment
    const existingUserBranch = await db
      .select()
      .from(userBranches)
      .where(
        and(
          eq(userBranches.userId, userId),
          eq(userBranches.branchId, branchId)
        )
      );
    
    if (existingUserBranch.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User already has an assignment for this branch' 
        }),
        { 
          status: 409, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Generate unique ID
    const userBranchId = `ubr_${nanoid(10)}`;
    
    // Insert the user branch assignment
    const [newUserBranch] = await db
      .insert(userBranches)
      .values({
        id: userBranchId,
        userId,
        branchId,
        role,
        isMainAdmin: false, // By default, new assignments are not main admin
        isActive,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User branch assignment created successfully',
        data: newUserBranch
      }),
      { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error creating user branch assignment:', error);
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