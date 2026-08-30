import { NextRequest } from 'next/server';
import { db } from '@/db';
import { userBranches, branches } from '@/db/schema/pos';
import { eq, and } from 'drizzle-orm';
import { requireMainAdmin, guardResponse } from '@/lib/admin-guard';

// PUT - Set a user as main admin or remove main admin status
export async function PUT(request: NextRequest) {
  try {
    const guard = await requireMainAdmin();
    if (!guard.ok) return guardResponse(guard);
    if (!guard.storeId) {
      return new Response(
        JSON.stringify({ success: false, message: 'No store associated with your account' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();

    const {
      userId,        // User ID to set/unset as main admin
      branchId,      // Branch ID of the user's assignment
      isMainAdmin    // Boolean indicating whether to set as main admin
    } = body;

    if (!userId || !branchId || isMainAdmin === undefined) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'User ID, Branch ID, and isMainAdmin status are required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // The branch being modified must belong to the caller's own store.
    const [branch] = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.id, branchId), eq(branches.storeId, guard.storeId)))
      .limit(1);

    if (!branch) {
      return new Response(
        JSON.stringify({ success: false, message: 'Branch not found in your store' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update the user's main admin status for this specific branch assignment
    const [updatedUserBranch] = await db
      .update(userBranches)
      .set({
        isMainAdmin: Boolean(isMainAdmin),
        updatedAt: new Date()
      })
      .where(
        and(eq(userBranches.userId, userId), eq(userBranches.branchId, branchId))
      )
      .returning();

    if (!updatedUserBranch) {
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
        message: `User main admin status ${isMainAdmin ? 'set' : 'removed'} successfully`,
        data: updatedUserBranch
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error updating main admin status:', error);
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