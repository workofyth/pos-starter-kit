import { NextRequest } from 'next/server';
import { db } from '@/db';
import { inventory, products, branches, inventoryTransactions, userBranches, user } from '@/db/schema/pos';
import { eq, and, ilike, desc, asc, count, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// GET - Get user branches assignments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const userId = searchParams.get('userId') || '';
    const branchId = searchParams.get('branchId') || '';
    const role = searchParams.get('role') || '';
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Build query
    let query = db
      .select({
        id: userBranches.id,
        userId: userBranches.userId,
        branchId: userBranches.branchId,
        role: userBranches.role,
        isActive: userBranches.isActive,
        createdAt: userBranches.createdAt,
        updatedAt: userBranches.updatedAt
      })
      .from(userBranches)
      .limit(limit)
      .offset(offset);
    
    // Apply filters
    let whereConditions = [];
    
    if (userId) {
      whereConditions.push(eq(userBranches.userId, userId));
    }
    
    if (branchId) {
      whereConditions.push(eq(userBranches.branchId, branchId));
    }
    
    if (role) {
      whereConditions.push(eq(userBranches.role, role));
    }
    
    if (isActive !== null && isActive !== undefined) {
      whereConditions.push(eq(userBranches.isActive, isActive === 'true'));
    }
    
    if (whereConditions.length > 0) {
      // Filter out any undefined conditions
      const validConditions = whereConditions.filter(condition => condition !== undefined);
      if (validConditions.length > 0) {
        query = query.where(and(...validConditions));
      }
    }
    
    // Apply sorting
    query = query.orderBy(desc(userBranches.createdAt));
    
    const userBranchesList = await query;
    
    // Get total count for pagination
    let countQuery = db
      .select({ count: count() })
      .from(userBranches);

    let countWhereConditions = [];
    
    if (userId) {
      countWhereConditions.push(eq(userBranches.userId, userId));
    }
    
    if (branchId) {
      countWhereConditions.push(eq(userBranches.branchId, branchId));
    }
    
    if (role) {
      countWhereConditions.push(eq(userBranches.role, role));
    }
    
    if (isActive !== null && isActive !== undefined) {
      countWhereConditions.push(eq(userBranches.isActive, isActive === 'true'));
    }
    
    if (countWhereConditions.length > 0) {
      // Filter out any undefined conditions
      const validCountConditions = countWhereConditions.filter(condition => condition !== undefined);
      if (validCountConditions.length > 0) {
        countQuery = countQuery.where(and(...validCountConditions));
      }
    }
    
    const totalCountResult = await countQuery;
    const totalCount = typeof totalCountResult[0].count === 'number' 
      ? totalCountResult[0].count 
      : parseInt(totalCountResult[0].count as string);
    const totalPages = Math.ceil(totalCount / limit);
    
    return new Response(
      JSON.stringify({
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
      }),
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