import { NextRequest } from 'next/server';
import { db } from '@/db';
import { inventory, products, branches, inventoryTransactions, userBranches } from '@/db/schema/pos';
import { eq, and, count, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// POST - Create approval request for splitting inventory from one branch to another
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      productId,
      sourceBranchId,
      targetBranchId,
      quantity,
      notes = '',
      userId // Add userId to track who initiated the request
    } = body;
    
    // Validate required fields
    if (!productId || !sourceBranchId || !targetBranchId || !quantity || !userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Product ID, Source Branch ID, Target Branch ID, Quantity, and User ID are required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if source and target branches are different
    if (sourceBranchId === targetBranchId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Source and target branches must be different' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check user's role and branch assignment
    const userBranchResponse = await db
      .select({
        role: userBranches.role,
        branchId: userBranches.branchId,
        isMainAdmin: userBranches.isMainAdmin
      })
      .from(userBranches)
      .where(eq(userBranches.userId, userId));
    
    if (userBranchResponse.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User not found or not assigned to any branch' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const userRole = userBranchResponse[0].role;
    const userBranchId = userBranchResponse[0].branchId;
    const isMainAdmin = userBranchResponse[0].isMainAdmin || false;
    
    // Main admin can initiate splits from any branch
    if (isMainAdmin) {
      // Main admin can split from any source branch to any target branch
    } else {
      // Non-main admin users have more restrictions
      // Only staff and cashiers can initiate split requests (unless they're a manager)
      if (userRole !== 'staff' && userRole !== 'cashier' && userRole !== 'manager') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Only staff, cashier, and manager users can initiate inventory split requests' 
          }),
          { 
            status: 403, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Staff and cashier can only initiate splits from their assigned branch
      if (userRole !== 'manager' && userBranchId !== sourceBranchId) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Users can only initiate inventory splits from their assigned branch' 
          }),
          { 
            status: 403, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Manager can initiate splits from their assigned branch
      if (userRole === 'manager' && userBranchId !== sourceBranchId) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Managers can only initiate inventory splits from their assigned branch' 
          }),
          { 
            status: 403, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    // Check if source inventory exists and has enough stock
    const sourceInventory = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.productId, productId),
          eq(inventory.branchId, sourceBranchId)
        )
      )
      .limit(1);
    
    if (sourceInventory.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Source inventory not found for this product and branch' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (sourceInventory[0].quantity < quantity) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Insufficient stock in source branch. Available: ${sourceInventory[0].quantity}, Requested: ${quantity}` 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Create approval request instead of directly processing the split
    const [approvalRequest] = await db.insert(inventoryTransactions).values({
      id: `itx_${nanoid(10)}`,
      productId,
      branchId: sourceBranchId, // Source branch
      referenceId: targetBranchId, // Target branch (stored in referenceId)
      type: 'split', // Special type for split requests
      quantity,
      notes: notes || `Request to split ${quantity} units to branch ${targetBranchId}`,
      status: 'pending', // Pending approval
      createdBy: userId, // Track who initiated the request
      approvedBy: null, // Will be set when approved
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUpdated: new Date()
    } as any).returning();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Inventory split request submitted for approval',
        data: approvalRequest
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error creating split request:', error);
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