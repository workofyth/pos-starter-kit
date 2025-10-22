import { NextRequest } from 'next/server';
import { db } from '@/db';
import { userBranches, branches, user } from '@/db/schema/pos';
import { eq, and, ilike, desc, asc, count, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// GET - Get specific user branch assignment
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
          message: 'User branch assignment ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const userBranchAssignment = await db
      .select({
        id: userBranches.id,
        userId: userBranches.userId,
        branchId: userBranches.branchId,
        role: userBranches.role,
        isActive: userBranches.isActive,
        createdAt: userBranches.createdAt,
        updatedAt: userBranches.updatedAt,
        userName: user.name,
        userEmail: user.email,
        branchName: branches.name,
        branchAddress: branches.address
      })
      .from(userBranches)
      .leftJoin(user, eq(userBranches.userId, user.id))
      .leftJoin(branches, eq(userBranches.branchId, branches.id))
      .where(eq(userBranches.id, id))
      .limit(1);
    
    if (userBranchAssignment.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User branch assignment not found' 
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
        data: userBranchAssignment[0]
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching user branch assignment:', error);
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

// PUT - Update user branch assignment
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
          message: 'User branch assignment ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const {
      userId,
      branchId,
      role,
      isActive
    } = body;
    
    // Check if user branch assignment exists
    const existingUserBranch = await db
      .select()
      .from(userBranches)
      .where(eq(userBranches.id, id))
      .limit(1);
    
    if (existingUserBranch.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User branch assignment not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check for conflicts (user already assigned to this branch)
    if (userId && branchId) {
      const conflictCheck = await db
        .select()
        .from(userBranches)
        .where(
          and(
            eq(userBranches.userId, userId),
            eq(userBranches.branchId, branchId),
            sql`${userBranches.id} != ${id}` // Exclude current assignment
          )
        );
      
      if (conflictCheck.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'User already assigned to this branch' 
          }),
          { 
            status: 409, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    // Update the user branch assignment
    const [updatedUserBranch] = await db
      .update(userBranches)
      .set({
        userId: userId !== undefined ? userId : existingUserBranch[0].userId,
        branchId: branchId !== undefined ? branchId : existingUserBranch[0].branchId,
        role: role !== undefined ? role : existingUserBranch[0].role,
        isActive: isActive !== undefined ? isActive : existingUserBranch[0].isActive,
        updatedAt: new Date()
      })
      .where(eq(userBranches.id, id))
      .returning();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User branch assignment updated successfully',
        data: updatedUserBranch
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error updating user branch assignment:', error);
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

// DELETE - Delete user branch assignment
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
          message: 'User branch assignment ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if user branch assignment exists
    const existingUserBranch = await db
      .select()
      .from(userBranches)
      .where(eq(userBranches.id, id))
      .limit(1);
    
    if (existingUserBranch.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User branch assignment not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Delete the user branch assignment
    await db
      .delete(userBranches)
      .where(eq(userBranches.id, id));
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User branch assignment deleted successfully'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error deleting user branch assignment:', error);
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