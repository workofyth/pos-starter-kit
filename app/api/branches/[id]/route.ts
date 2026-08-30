import { NextRequest } from 'next/server';
import { db } from '@/db';
import { branches } from '@/db/schema/pos';
import { eq, and } from 'drizzle-orm';
import { requireOnboarded, requireActiveAccess, subscriptionGuardResponse } from '@/lib/subscription-guard';

// GET a single branch by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireOnboarded();
    if (!guard.ok) return subscriptionGuardResponse(guard);

    const { id } = await params;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Branch ID is required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const branch = await db
      .select()
      .from(branches)
      .where(and(eq(branches.id, id), eq(branches.storeId, guard.storeId)))
      .limit(1);
    
    if (branch.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Branch not found' 
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
        data: branch[0]
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching branch:', error);
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

// PUT - Update a branch by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireActiveAccess();
    if (!guard.ok) return subscriptionGuardResponse(guard);

    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Branch ID is required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if branch exists in this store
    const existingBranch = await db
      .select()
      .from(branches)
      .where(and(eq(branches.id, id), eq(branches.storeId, guard.storeId)));

    if (existingBranch.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Branch not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const {
      name,
      address,
      phone,
      email,
      type
    } = body;
    
    // Check for duplicate name if provided and different from current
    if (name && name !== existingBranch[0].name) {
      const existingBranchByName = await db
        .select()
        .from(branches)
        .where(and(eq(branches.name, name), eq(branches.storeId, guard.storeId)));
      
      if (existingBranchByName.length > 0) {
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
    }
    
    // Update the branch
    const [updatedBranch] = await db
      .update(branches)
      .set({
        name: name !== undefined ? name : existingBranch[0].name,
        address: address !== undefined ? address : existingBranch[0].address,
        phone: phone !== undefined ? phone : existingBranch[0].phone,
        email: email !== undefined ? email : existingBranch[0].email,
        type: type !== undefined ? type : existingBranch[0].type,
        updatedAt: new Date()
      })
      .where(and(eq(branches.id, id), eq(branches.storeId, guard.storeId)))
      .returning();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Branch updated successfully',
        data: updatedBranch
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error updating branch:', error);
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

// DELETE a branch by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireActiveAccess();
    if (!guard.ok) return subscriptionGuardResponse(guard);

    const { id } = await params;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Branch ID is required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if branch exists in this store
    const existingBranch = await db
      .select()
      .from(branches)
      .where(and(eq(branches.id, id), eq(branches.storeId, guard.storeId)));

    if (existingBranch.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Branch not found'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if branch has related records that would prevent deletion (in real app, you'd check transactions, inventory, etc.)

    // Delete the branch
    await db
      .delete(branches)
      .where(and(eq(branches.id, id), eq(branches.storeId, guard.storeId)));
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Branch deleted successfully'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error deleting branch:', error);
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