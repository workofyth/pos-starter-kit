import { NextRequest } from 'next/server';
import { db } from '@/db';
import { inventory, products, branches, inventoryTransactions, userBranches } from '@/db/schema/pos';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { sendNotificationsToBranchRoles } from '@/lib/notification-helpers';

// POST - Split inventory from one branch to another (specific inventory item split endpoint)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: inventoryId } = params;
    const body = await request.json();
    
    if (!inventoryId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Inventory ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const {
      sourceBranchId,
      targetBranchId,
      quantity,
      notes = '',
      userId // Add userId to track who initiated the request
    } = body;
    
    // Validate required fields
    if (!sourceBranchId || !targetBranchId || !quantity || !userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Source Branch ID, Target Branch ID, Quantity, and User ID are required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if the inventory item exists
    const [inventoryItem] = await db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        branchId: inventory.branchId,
        quantity: inventory.quantity
      })
      .from(inventory)
      .where(eq(inventory.id, inventoryId));
    
    if (!inventoryItem) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Inventory item not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Verify that the inventory item matches the source branch
    if (inventoryItem.branchId !== sourceBranchId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Inventory item does not match source branch' 
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
    const [userBranch] = await db
      .select({
        role: userBranches.role,
        branchId: userBranches.branchId,
        isMainAdmin: userBranches.isMainAdmin
      })
      .from(userBranches)
      .where(eq(userBranches.userId, userId));
    
    if (!userBranch) {
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
    
    const userRole = userBranch.role;
    const userBranchId = userBranch.branchId;
    const isMainAdmin = userBranch.isMainAdmin || false;
    
    // Main admin can initiate splits from any branch
    if (isMainAdmin) {
      // Main admin can split from any source branch to any target branch
    } else {
      // Non-main admin users have more restrictions
      // Only staff and cashiers can initiate split requests (unless they're a manager)
      if (userRole !== 'staff' && userRole !== 'admin' && userRole !== 'manager') {
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
    
    // Check if there's enough stock in the inventory item
    if (inventoryItem.quantity < quantity) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Insufficient stock. Available: ${inventoryItem.quantity}, Requested: ${quantity}` 
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
      productId: inventoryItem.productId,
      branchId: sourceBranchId, // Source branch
      referenceId: targetBranchId, // Target branch (stored in referenceId)
      type: 'split', // Special type for split requests
      quantity,
      notes: notes || `Request to split ${quantity} units to branch ${targetBranchId}`,
      status: 'pending', // Pending approval
      createdBy: userId, // Track who initiated the request
      approvedBy: null, // Will be set when approved
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    // Get branch information to determine if we need to send notification
    const [sourceBranch] = await db
      .select({ type: branches.type, name: branches.name })
      .from(branches)
      .where(eq(branches.id, sourceBranchId));
    
    const [targetBranch] = await db
      .select({ type: branches.type, name: branches.name })
      .from(branches)
      .where(eq(branches.id, targetBranchId));
    
    // Get product information
    const [product] = await db
      .select({ name: products.name })
      .from(products)
      .where(eq(products.id, inventoryItem.productId));
    
    // Send notification to target branch if source is main branch and target is sub-branch (Rule 1)
    if (sourceBranch && targetBranch && sourceBranch.type === 'main' && targetBranch.type === 'sub') {
      try {
        // Use helper function to send notifications to target branch roles
        await sendNotificationsToBranchRoles(
          targetBranchId, // Target branch
          ['admin', 'staff', 'manager'], // Send to all relevant roles at sub branch
          {
            title: 'New Stock Request from Main Branch',
            message: `New request to receive ${quantity} units of ${product?.name || 'product'} from main branch ${sourceBranch.name}. Awaiting approval.`,
            type: 'stock_split_request',
            data: {
              productId: inventoryItem.productId,
              sourceBranchId,
              quantity,
              transactionId: approvalRequest.id,
              productName: product?.name || 'Unknown Product',
              sourceBranchName: sourceBranch.name,
              targetBranchName: targetBranch.name,
              status: 'pending'
            }
          }
        );
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Split request created successfully',
        data: {
          id: approvalRequest.id,
          productId: inventoryItem.productId,
          sourceBranchId,
          targetBranchId,
          quantity,
          notes: notes || `Request to split ${quantity} units to branch ${targetBranchId}`,
          status: 'pending',
          createdBy: userId,
          createdAt: approvalRequest.createdAt,
          updatedAt: approvalRequest.updatedAt
        }
      }),
      { 
        status: 201, 
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

// PUT - Handle split request approval or rejection (for specific inventory item splits)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: transactionId } = params; // This should be the transaction ID, not inventory ID
    const body = await request.json();
    
    if (!transactionId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Transaction ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const {
      action, // 'approve' or 'reject'
      approvedBy, // User ID of the person approving/rejecting
      notes = ''
    } = body;
    
    if (!action || !approvedBy) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Action (approve/reject) and approvedBy user ID are required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Action must be either "approve" or "reject"' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if the inventory transaction exists and is a split request
    const [inventoryTransaction] = await db
      .select({
        id: inventoryTransactions.id,
        productId: inventoryTransactions.productId,
        branchId: inventoryTransactions.branchId, // Source branch
        referenceId: inventoryTransactions.referenceId, // Target branch
        quantity: inventoryTransactions.quantity,
        status: inventoryTransactions.status,
        notes: inventoryTransactions.notes,
        createdBy: inventoryTransactions.createdBy
      })
      .from(inventoryTransactions)
      .where(
        and(
          eq(inventoryTransactions.id, transactionId),
          eq(inventoryTransactions.type, 'split'),
          eq(inventoryTransactions.status, 'pending')
        )
      );
    
    if (!inventoryTransaction) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Split request not found or already processed' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check user's role for approval permissions
    const [userBranch] = await db
      .select({
        role: userBranches.role,
        branchId: userBranches.branchId,
        isMainAdmin: userBranches.isMainAdmin
      })
      .from(userBranches)
      .where(eq(userBranches.userId, approvedBy));
    
    if (!userBranch) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Approving user not found or not assigned to any branch' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const userRole = userBranch.role;
    const userBranchId = userBranch.branchId;
    const isMainAdmin = userBranch.isMainAdmin || false;
    
    // Main admin can approve/reject any split request
    if (isMainAdmin) {
      // Main admin can approve/reject any request
    } else {
      // Regular users have specific permissions
      // Managers can approve/reject requests to their assigned branch
      // Staff/Admins can approve/reject requests to their assigned branch
      if (userRole !== 'admin' && userRole !== 'manager') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Only admin and manager users can approve/reject split requests' 
          }),
          { 
            status: 403, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // User must be at the target branch to approve/reject the request
      if (userBranchId !== inventoryTransaction.referenceId) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'User must be at the target branch to approve/reject this request' 
          }),
          { 
            status: 403, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    if (action === 'approve') {
      // Check if there's enough stock in the source branch at the time of approval
      const [sourceInventory] = await db
        .select({ quantity: inventory.quantity })
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, inventoryTransaction.productId),
            eq(inventory.branchId, inventoryTransaction.branchId)
          )
        );
      
      if (!sourceInventory || sourceInventory.quantity < inventoryTransaction.quantity) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Insufficient stock in source branch. Available: ${sourceInventory?.quantity || 0}, Requested: ${inventoryTransaction.quantity}` 
          }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Process the split transaction
      // 1. Reduce inventory from source branch
      await db
        .update(inventory)
        .set({
          quantity: sourceInventory.quantity - inventoryTransaction.quantity,
          lastUpdated: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(inventory.productId, inventoryTransaction.productId),
            eq(inventory.branchId, inventoryTransaction.branchId)
          )
        );
      
      // 2. Add inventory to target branch
      const [targetInventory] = await db
        .select({ id: inventory.id, quantity: inventory.quantity })
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, inventoryTransaction.productId),
            eq(inventory.branchId, inventoryTransaction.referenceId!)
          )
        );
      
      if (targetInventory) {
        // If inventory exists at target branch, update it
        await db
          .update(inventory)
          .set({
            quantity: targetInventory.quantity + inventoryTransaction.quantity,
            lastUpdated: new Date(),
            updatedAt: new Date()
          })
          .where(eq(inventory.id, targetInventory.id));
      } else {
        // If inventory doesn't exist at target branch, create it
        await db.insert(inventory).values({
          id: `inv_${nanoid(10)}`,
          productId: inventoryTransaction.productId,
          branchId: inventoryTransaction.referenceId!,
          quantity: inventoryTransaction.quantity,
          minStock: 0,
          lastUpdated: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // 3. Update the transaction record to approved
      const [updatedTransaction] = await db
        .update(inventoryTransactions)
        .set({
          status: 'approved',
          approvedBy,
          notes: notes || `Approved by user ${approvedBy}: ${inventoryTransaction.notes}`,
          updatedAt: new Date()
        })
        .where(eq(inventoryTransactions.id, transactionId))
        .returning();
      
      // 4. Get product information for notification
      const [product] = await db
        .select({ name: products.name })
        .from(products)
        .where(eq(products.id, inventoryTransaction.productId));
      
      // 5. Get branch information for notification
      const [sourceBranch] = await db
        .select({ name: branches.name })
        .from(branches)
        .where(eq(branches.id, inventoryTransaction.branchId));
      
      const [targetBranch] = await db
        .select({ name: branches.name })
        .from(branches)
        .where(eq(branches.id, inventoryTransaction.referenceId!));
      
      // 6. Send notification about approval
      try {
        await sendNotificationsToBranchRoles(
          inventoryTransaction.branchId, // Send to source branch
          ['admin', 'staff', 'manager'], // Send to relevant roles at source branch
          {
            title: 'Stock Transfer Approved',
            message: `${product?.name || 'Product'} split request approved. ${inventoryTransaction.quantity} units transferred from ${sourceBranch?.name || 'source branch'} to ${targetBranch?.name || 'target branch'}.`,
            type: 'stock_split_approved',
            data: {
              productId: inventoryTransaction.productId,
              sourceBranchId: inventoryTransaction.branchId,
              targetBranchId: inventoryTransaction.referenceId,
              quantity: inventoryTransaction.quantity,
              transactionId: updatedTransaction.id,
              productName: product?.name || 'Unknown Product',
              sourceBranchName: sourceBranch?.name || 'Unknown Branch',
              targetBranchName: targetBranch?.name || 'Unknown Branch',
              status: 'approved'
            }
          }
        );
        
        // Also send notification to target branch
        await sendNotificationsToBranchRoles(
          inventoryTransaction.referenceId!, // Send to target branch
          ['admin', 'staff', 'manager'], // Send to relevant roles at target branch
          {
            title: 'Stock Transfer Received',
            message: `${product?.name || 'Product'} split request approved. ${inventoryTransaction.quantity} units received from ${sourceBranch?.name || 'source branch'}.`,
            type: 'stock_split_approved',
            data: {
              productId: inventoryTransaction.productId,
              sourceBranchId: inventoryTransaction.branchId,
              targetBranchId: inventoryTransaction.referenceId!,
              quantity: inventoryTransaction.quantity,
              transactionId: updatedTransaction.id,
              productName: product?.name || 'Unknown Product',
              sourceBranchName: sourceBranch?.name || 'Unknown Branch',
              targetBranchName: targetBranch?.name || 'Unknown Branch',
              status: 'approved'
            }
          }
        );
      } catch (notificationError) {
        console.error('Error sending approval notification:', notificationError);
        // Don't fail the request if notification fails
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Split request approved and processed successfully',
          data: updatedTransaction
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    } else if (action === 'reject') {
      // Update the transaction record to rejected
      const [updatedTransaction] = await db
        .update(inventoryTransactions)
        .set({
          status: 'rejected',
          approvedBy,
          notes: notes || `Rejected by user ${approvedBy}: ${inventoryTransaction.notes}`,
          updatedAt: new Date()
        })
        .where(eq(inventoryTransactions.id, transactionId))
        .returning();
      
      // Get product information for notification
      const [product] = await db
        .select({ name: products.name })
        .from(products)
        .where(eq(products.id, inventoryTransaction.productId));
      
      // Get branch information for notification
      const [sourceBranch] = await db
        .select({ name: branches.name })
        .from(branches)
        .where(eq(branches.id, inventoryTransaction.branchId));
      
      // Send notification about rejection
      try {
        await sendNotificationsToBranchRoles(
          inventoryTransaction.branchId, // Send to source branch
          ['admin', 'staff', 'manager'], // Send to relevant roles at source branch
          {
            title: 'Stock Transfer Rejected',
            message: `${product?.name || 'Product'} split request rejected. ${inventoryTransaction.quantity} units transfer from ${sourceBranch?.name || 'source branch'} was not approved.`,
            type: 'stock_split_rejected',
            data: {
              productId: inventoryTransaction.productId,
              sourceBranchId: inventoryTransaction.branchId,
              targetBranchId: inventoryTransaction.referenceId,
              quantity: inventoryTransaction.quantity,
              transactionId: updatedTransaction.id,
              productName: product?.name || 'Unknown Product',
              sourceBranchName: sourceBranch?.name || 'Unknown Branch',
              targetBranchName: 'Target Branch',
              status: 'rejected'
            }
          }
        );
      } catch (notificationError) {
        console.error('Error sending rejection notification:', notificationError);
        // Don't fail the request if notification fails
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Split request rejected successfully',
          data: updatedTransaction
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Error processing split request:', error);
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