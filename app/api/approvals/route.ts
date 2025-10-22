import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  inventory,
  inventoryTransactions,
  userBranches,
  branches,
  products,
  user
} from '@/db/schema/pos';
import { eq, and, desc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// GET - Fetch pending approval requests for a user's branch
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const userId = searchParams.get('userId') || '';
    const branchId = searchParams.get('branchId') || '';
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
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
    
    // Check if user has admin privileges for approvals
    const userBranchResponse = await db
      .select({
        role: userBranches.role,
        branchId: userBranches.branchId
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
    
    // Get user's role and branch
    const userRole = userBranchResponse[0].role;
    const userBranchId = userBranchResponse[0].branchId;
    
    // Only admins and managers can approve requests
    if (userRole !== 'admin' && userRole !== 'manager') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Only admin and manager users can approve requests' 
        }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Build query for approval requests
    let query = db
      .select({
        id: inventoryTransactions.id,
        productId: inventoryTransactions.productId,
        sourceBranchId: inventoryTransactions.branchId,
        targetBranchId: inventoryTransactions.referenceId,
        quantity: inventoryTransactions.quantity,
        type: inventoryTransactions.type,
        notes: inventoryTransactions.notes,
        status: inventoryTransactions.status,
        createdAt: inventoryTransactions.createdAt,
        updatedAt: inventoryTransactions.updatedAt,
        approvedBy: inventoryTransactions.approvedBy,
        productName: products.name,
        productSku: products.sku,
        sourceBranchName: branches.name,
        targetBranchName: sql<string>`(SELECT ${branches.name} FROM ${branches} WHERE ${branches.id} = ${inventoryTransactions.referenceId})`.as('targetBranchName'),
        createdBy: user.name
      })
      .from(inventoryTransactions)
      .leftJoin(products, eq(inventoryTransactions.productId, products.id))
      .leftJoin(branches, eq(inventoryTransactions.branchId, branches.id))
      .leftJoin(user, eq(inventoryTransactions.createdBy, user.id))
      .where(and(
        eq(inventoryTransactions.type, 'split'),
        eq(inventoryTransactions.status, status)
      ))
      .orderBy(desc(inventoryTransactions.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Filter by branch if user is not admin (managers can only see requests for their branch)
    if (userRole === 'manager' && userBranchId) {
      query = query.where(
        and(
          eq(inventoryTransactions.type, 'split'),
          eq(inventoryTransactions.status, status),
          eq(inventoryTransactions.branchId, userBranchId)
        )
      ) as typeof query;
    }
    
    const approvalRequests = await query;
    
    // Get total count for pagination
    let countQuery = db
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(inventoryTransactions)
      .where(and(
        eq(inventoryTransactions.type, 'split'),
        eq(inventoryTransactions.status, status)
      ));
    
    // Filter by branch if user is not admin
    if (userRole === 'manager' && userBranchId) {
      countQuery = countQuery.where(
        and(
          eq(inventoryTransactions.type, 'split'),
          eq(inventoryTransactions.status, status),
          eq(inventoryTransactions.branchId, userBranchId)
        )
      ) as typeof countQuery;
    }
    
    const totalCountResult = await countQuery;
    const totalCount = totalCountResult[0].count;
    const totalPages = Math.ceil(totalCount / limit);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: approvalRequests,
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
    console.error('Error fetching approval requests:', error);
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

// PUT - Approve or reject an approval request
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    
    const {
      userId,
      action, // 'approve' or 'reject'
      notes
    } = await request.json();
    
    if (!id || !userId || !action) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Request ID, User ID, and Action are required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if user has admin privileges for approvals
    const userBranchResponse = await db
      .select({
        role: userBranches.role,
        branchId: userBranches.branchId
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
    
    // Get user's role and branch
    const userRole = userBranchResponse[0].role;
    const userBranchId = userBranchResponse[0].branchId;
    
    // Only admins and managers can approve requests
    if (userRole !== 'admin' && userRole !== 'manager') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Only admin and manager users can approve requests' 
        }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Get the approval request
    const [approvalRequest] = await db
      .select()
      .from(inventoryTransactions)
      .where(eq(inventoryTransactions.id, id));
    
    if (!approvalRequest) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Approval request not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if user has permission to approve this request (admins can approve all, managers only their branch)
    if (userRole === 'manager' && userBranchId !== approvalRequest.branchId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Managers can only approve requests for their assigned branch' 
        }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Update the approval request status
    const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : approvalRequest.status;
    
    const [updatedRequest] = await db
      .update(inventoryTransactions)
      .set({ 
        status: newStatus,
        approvedBy: userId,
        notes: notes || approvalRequest.notes,
        updatedAt: new Date()
      })
      .where(eq(inventoryTransactions.id, id))
      .returning();
    
    // If approved, process the inventory split
    if (action === 'approve') {
      // Get current inventory in source branch
      const [sourceInventory] = await db
        .select()
        .from(inventory)
        .where(and(
          eq(inventory.productId, approvalRequest.productId),
          eq(inventory.branchId, approvalRequest.branchId) // Source branch
        ));
      
      if (!sourceInventory) {
        // Create inventory record if it doesn't exist
        await db.insert(inventory).values({
          id: `inv_${uuidv4()}`,
          productId: approvalRequest.productId,
          branchId: approvalRequest.branchId,
          quantity: 0,
          minStock: 5,
          lastUpdated: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else if (sourceInventory.quantity < approvalRequest.quantity) {
        // Not enough stock in source branch
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Insufficient stock in source branch' 
          }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      } else {
        // Reduce stock in source branch
        await db.update(inventory)
          .set({ 
            quantity: sourceInventory.quantity - approvalRequest.quantity,
            lastUpdated: new Date(),
            updatedAt: new Date()
          })
          .where(and(
            eq(inventory.productId, approvalRequest.productId),
            eq(inventory.branchId, approvalRequest.branchId)
          ));
      }
      
      // Get current inventory in target branch
      const [targetInventory] = await db
        .select()
        .from(inventory)
        .where(and(
          eq(inventory.productId, approvalRequest.productId),
          eq(inventory.branchId, approvalRequest.referenceId) // Target branch (stored in referenceId)
        ));
      
      if (!targetInventory) {
        // Create inventory record if it doesn't exist
        await db.insert(inventory).values({
          id: `inv_${uuidv4()}`,
          productId: approvalRequest.productId,
          branchId: approvalRequest.referenceId, // Target branch
          quantity: approvalRequest.quantity,
          minStock: 5,
          lastUpdated: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else {
        // Increase stock in target branch
        await db.update(inventory)
          .set({ 
            quantity: targetInventory.quantity + approvalRequest.quantity,
            lastUpdated: new Date(),
            updatedAt: new Date()
          })
          .where(and(
            eq(inventory.productId, approvalRequest.productId),
            eq(inventory.branchId, approvalRequest.referenceId)
          ));
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Request ${action}d successfully`,
        data: updatedRequest
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error updating approval request:', error);
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