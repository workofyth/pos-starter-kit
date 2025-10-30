import { NextRequest } from 'next/server';
import { db } from '@/db';
import { userBranches, branches } from '@/db/schema/pos';
import { eq, and } from 'drizzle-orm';

// GET - Get user's branch data (role, branchId, etc.)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: userId } = params;
    
    if (!userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Get user's branch assignments
    const userBranchData = await db
      .select({
        id: userBranches.id,
        userId: userBranches.userId,
        branchId: userBranches.branchId,
        role: userBranches.role,
        isMainAdmin: userBranches.isMainAdmin,
        createdAt: userBranches.createdAt,
        branchName: branches.name,
        branchType: branches.type,
        branchAddress: branches.address,
        branchPhone: branches.phone,
        branchEmail: branches.email
      })
      .from(userBranches)
      .leftJoin(branches, eq(userBranches.branchId, branches.id))
      .where(eq(userBranches.userId, userId));
    
    if (userBranchData.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User branch data not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // If user has multiple branches, we'll return the default one or the first one
    const defaultBranch = userBranchData.find(ubd => ubd.id) || userBranchData[0];
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          id: defaultBranch.id,
          userId: defaultBranch.userId,
          branchId: defaultBranch.branchId,
          role: defaultBranch.role,
          isMainAdmin: defaultBranch.isMainAdmin,
          createdAt: defaultBranch.createdAt,
          branchName: defaultBranch.branchName,
          branchType: defaultBranch.branchType,
          branchAddress: defaultBranch.branchAddress,
          branchPhone: defaultBranch.branchPhone,
          branchEmail: defaultBranch.branchEmail
        }
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching user branch data:', error);
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