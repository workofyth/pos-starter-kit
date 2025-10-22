import { NextRequest } from 'next/server';
import { db } from '@/db';
import { userBranches } from '@/db/schema/pos';
import { eq } from 'drizzle-orm';
import { useSession } from '@/lib/auth-client';

// PUT - Set a user as main admin or remove main admin status
export async function PUT(request: NextRequest) {
  try {
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

    // Update the user's main admin status using userId and branchId combination
    const [updatedUserBranch] = await db
      .update(userBranches)
      .set({ 
        isMainAdmin: Boolean(isMainAdmin),
        updatedAt: new Date()
      })
      .where(
        eq(userBranches.userId, userId) // Match by user ID
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