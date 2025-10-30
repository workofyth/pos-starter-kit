import { NextRequest } from 'next/server';
import { db } from '@/db';
import { inventory, products, branches, inventoryTransactions, userBranches } from '@/db/schema/pos';
import { eq, and, count, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getRedis } from '@/lib/redis';
import { sendNotificationsToBranchRoles } from '@/lib/notification-helpers';

// GET - Get specific inventory item details
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
          message: 'Inventory ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const inventoryItem = await db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        branchId: inventory.branchId,
        quantity: inventory.quantity,
        minStock: inventory.minStock,
        lastUpdated: inventory.lastUpdated,
        createdAt: inventory.createdAt,
        updatedAt: inventory.updatedAt,
        productName: products.name,
        productSku: products.sku,
        productBarcode: products.barcode,
        productDescription: products.description,
        productImageUrl: products.imageUrl,
        branchName: branches.name,
        branchAddress: branches.address,
        branchPhone: branches.phone,
        branchEmail: branches.email
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(branches, eq(inventory.branchId, branches.id))
      .where(eq(inventory.id, id))
      .limit(1);
    
    if (inventoryItem.length === 0) {
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
    
    // Get recent transactions for this inventory item
    const recentTransactions = await db
      .select({
        id: inventoryTransactions.id,
        type: inventoryTransactions.type,
        quantity: inventoryTransactions.quantity,
        notes: inventoryTransactions.notes,
        createdAt: inventoryTransactions.createdAt,
        createdBy: inventoryTransactions.createdBy
      })
      .from(inventoryTransactions)
      .where(
        and(
          eq(inventoryTransactions.productId, inventoryItem[0].productId),
          eq(inventoryTransactions.branchId, inventoryItem[0].branchId)
        )
      )
      .orderBy(inventoryTransactions.createdAt)
      .limit(10);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...inventoryItem[0],
          recentTransactions
        }
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching inventory item:', error);
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

// PUT - Update inventory item (stock level, min stock, etc.) or handle split request approval/rejection
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
          message: 'Inventory ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if this is a split request approval/rejection or inventory update
    if (body.action !== undefined) {
      // This is a split request approval/rejection
      return await handleSplitRequestApproval(id, body);
    } else {
      // This is an inventory item update
      return await handleInventoryUpdate(id, body);
    }
  } catch (error) {
    console.error('Error processing PUT request:', error);
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

// Separate function to handle inventory updates
async function handleInventoryUpdate(id: string, body: any) {
  const {
    quantity,
    minStock,
    notes = ''
  } = body;
  
  // Check if inventory item exists
  const existingInventory = await db
    .select()
    .from(inventory)
    .where(eq(inventory.id, id))
    .limit(1);

  if (existingInventory.length === 0) {
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
  
  // Get product and branch information for notifications
  const [product] = await db
    .select({ name: products.name })
    .from(products)
    .where(eq(products.id, existingInventory[0].productId))
    .limit(1);
  
  const [branch] = await db
    .select({ name: branches.name })
    .from(branches)
    .where(eq(branches.id, existingInventory[0].branchId))
    .limit(1);
  
  // Update the inventory item
  const [updatedInventory] = await db
    .update(inventory)
    .set({
      quantity: quantity !== undefined ? quantity : existingInventory[0].quantity,
      minStock: minStock !== undefined ? minStock : existingInventory[0].minStock,
      lastUpdated: new Date(),
      updatedAt: new Date()
    })
    .where(eq(inventory.id, id))
    .returning();
  
  // Publish real-time update for inventory adjustment using Redis Lists
  try {
    const updateData = {
      type: 'inventory_updated',
      inventoryId: id,
      productId: existingInventory[0].productId,
      branchId: existingInventory[0].branchId,
      oldQuantity: existingInventory[0].quantity,
      newQuantity: quantity,
      productName: product?.name || 'Unknown Product',
      branchName: branch?.name || 'Unknown Branch'
    };
    
    // Publish to branch-specific and general inventory channels using in-memory Lists
    const branchChannel = `notifications:${existingInventory[0].branchId}`;
    const generalChannel = 'notifications:inventory';
    
    const redisClient = await getRedis();
    if (redisClient) {
      await redisClient.lpush(branchChannel, JSON.stringify(updateData));
      await redisClient.lpush(generalChannel, JSON.stringify(updateData));
      
      // Trim lists to keep only last 100 notifications
      await redisClient.ltrim(branchChannel, 0, 99);
      await redisClient.ltrim(generalChannel, 0, 99);
    }
  } catch (publishError) {
    console.warn('Failed to publish inventory update to Redis Lists:', publishError);
  }
  
  // If quantity was changed, create inventory transaction
  if (quantity !== undefined && quantity !== existingInventory[0].quantity) {
    const quantityDifference = quantity - existingInventory[0].quantity;
    const transactionType = quantityDifference > 0 ? 'in' : 'out';
    
    await db.insert(inventoryTransactions).values({
      id: `itx_${nanoid(10)}`,
      productId: existingInventory[0].productId,
      branchId: existingInventory[0].branchId,
      type: transactionType,
      quantity: Math.abs(quantityDifference),
      notes: notes || `Stock level adjusted from ${existingInventory[0].quantity} to ${quantity}`,
      createdAt: new Date(),
      createdBy: null // Would be set to actual user ID in production
    });
  }
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Inventory item updated successfully',
      data: updatedInventory
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Separate function to handle split request approval/rejection
async function handleSplitRequestApproval(id: string, body: any) {
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
  const inventoryTransaction = await db
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
        eq(inventoryTransactions.id, id),
        eq(inventoryTransactions.type, 'split'),
        eq(inventoryTransactions.status, 'pending')
      )
    )
    .limit(1);

  if (inventoryTransaction.length === 0) {
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
  const userBranchResponse = await db
    .select({
      role: userBranches.role,
      branchId: userBranches.branchId,
      isMainAdmin: userBranches.isMainAdmin
    })
    .from(userBranches)
    .where(eq(userBranches.userId, approvedBy));

  if (userBranchResponse.length === 0) {
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

  const userRole = userBranchResponse[0].role;
  const userBranchId = userBranchResponse[0].branchId;
  const isMainAdmin = userBranchResponse[0].isMainAdmin || false;

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
    if (userBranchId !== inventoryTransaction[0].referenceId) {
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
    const sourceInventory = await db
      .select({ quantity: inventory.quantity })
      .from(inventory)
      .where(
        and(
          eq(inventory.productId, inventoryTransaction[0].productId),
          eq(inventory.branchId, inventoryTransaction[0].branchId)
        )
      )
      .limit(1);
    
    if (sourceInventory.length === 0 || sourceInventory[0].quantity < inventoryTransaction[0].quantity) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Insufficient stock in source branch. Available: ${sourceInventory.length > 0 ? sourceInventory[0].quantity : 0}, Requested: ${inventoryTransaction[0].quantity}` 
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
        quantity: sourceInventory[0].quantity - inventoryTransaction[0].quantity,
        lastUpdated: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(inventory.productId, inventoryTransaction[0].productId),
          eq(inventory.branchId, inventoryTransaction[0].branchId)
        )
      );
    
    // 2. Add inventory to target branch
    const [targetInventory] = await db
      .select({ id: inventory.id, quantity: inventory.quantity })
      .from(inventory)
      .where(
        and(
          eq(inventory.productId, inventoryTransaction[0].productId),
          eq(inventory.branchId, inventoryTransaction[0].referenceId!)
        )
      )
      .limit(1);
    
    if (targetInventory) {
      // If inventory exists at target branch, update it
      await db
        .update(inventory)
        .set({
          quantity: targetInventory.quantity + inventoryTransaction[0].quantity,
          lastUpdated: new Date(),
          updatedAt: new Date()
        })
        .where(eq(inventory.id, targetInventory.id));
    } else {
      // If inventory doesn't exist at target branch, create it
      await db.insert(inventory).values({
        id: `inv_${nanoid(10)}`,
        productId: inventoryTransaction[0].productId,
        branchId: inventoryTransaction[0].referenceId!,
        quantity: inventoryTransaction[0].quantity,
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
        notes: notes || `Approved by user ${approvedBy}: ${inventoryTransaction[0].notes}`,
        updatedAt: new Date()
      })
      .where(eq(inventoryTransactions.id, id))
      .returning();
    
    // 4. Get product information for notification
    const [product] = await db
      .select({ name: products.name })
      .from(products)
      .where(eq(products.id, inventoryTransaction[0].productId));
    
    // 5. Get branch information for notification
    const [sourceBranch] = await db
      .select({ name: branches.name })
      .from(branches)
      .where(eq(branches.id, inventoryTransaction[0].branchId));
    
    const [targetBranch] = await db
      .select({ name: branches.name })
      .from(branches)
      .where(eq(branches.id, inventoryTransaction[0].referenceId!));
    
    // 6. Send notification about approval
    try {
      await sendNotificationsToBranchRoles(
        inventoryTransaction[0].branchId, // Send to source branch
        ['admin', 'staff', 'manager'], // Send to relevant roles at source branch
        {
          title: 'Stock Transfer Approved',
          message: `${product?.name || 'Product'} split request approved. ${inventoryTransaction[0].quantity} units transferred from ${sourceBranch?.name || 'source branch'} to ${targetBranch?.name || 'target branch'}.`,
          type: 'stock_split_approved',
          data: {
            productId: inventoryTransaction[0].productId,
            sourceBranchId: inventoryTransaction[0].branchId,
            targetBranchId: inventoryTransaction[0].referenceId,
            quantity: inventoryTransaction[0].quantity,
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
        inventoryTransaction[0].referenceId!, // Send to target branch
        ['admin', 'staff', 'manager'], // Send to relevant roles at target branch
        {
          title: 'Stock Transfer Received',
          message: `${product?.name || 'Product'} split request approved. ${inventoryTransaction[0].quantity} units received from ${sourceBranch?.name || 'source branch'}.`,
          type: 'stock_split_approved',
          data: {
            productId: inventoryTransaction[0].productId,
            sourceBranchId: inventoryTransaction[0].branchId,
            targetBranchId: inventoryTransaction[0].referenceId!,
            quantity: inventoryTransaction[0].quantity,
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
        notes: notes || `Rejected by user ${approvedBy}: ${inventoryTransaction[0].notes}`,
        updatedAt: new Date()
      })
      .where(eq(inventoryTransactions.id, id))
      .returning();
    
    // Get product information for notification
    const [product] = await db
      .select({ name: products.name })
      .from(products)
      .where(eq(products.id, inventoryTransaction[0].productId));
    
    // Get branch information for notification
    const [sourceBranch] = await db
      .select({ name: branches.name })
      .from(branches)
      .where(eq(branches.id, inventoryTransaction[0].branchId));
    
    // Send notification about rejection
    try {
      await sendNotificationsToBranchRoles(
        inventoryTransaction[0].branchId, // Send to source branch
        ['admin', 'staff', 'manager'], // Send to relevant roles at source branch
        {
          title: 'Stock Transfer Rejected',
          message: `${product?.name || 'Product'} split request rejected. ${inventoryTransaction[0].quantity} units transfer from ${sourceBranch?.name || 'source branch'} was not approved.`,
          type: 'stock_split_rejected',
          data: {
            productId: inventoryTransaction[0].productId,
            sourceBranchId: inventoryTransaction[0].branchId,
            targetBranchId: inventoryTransaction[0].referenceId,
            quantity: inventoryTransaction[0].quantity,
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
}

// DELETE - Delete inventory item (usually not recommended, better to set quantity to 0)
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
          message: 'Inventory ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if inventory item exists
    const existingInventory = await db
      .select()
      .from(inventory)
      .where(eq(inventory.id, id))
      .limit(1);
    
    if (existingInventory.length === 0) {
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
    
    // Delete the inventory item
    await db
      .delete(inventory)
      .where(eq(inventory.id, id));
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Inventory item deleted successfully'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error deleting inventory item:', error);
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

// POST - Split inventory from one branch to another (specific inventory item)
export async function POST(
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
    const inventoryItem = await db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        branchId: inventory.branchId,
        quantity: inventory.quantity
      })
      .from(inventory)
      .where(eq(inventory.id, id))
      .limit(1);
    
    if (inventoryItem.length === 0) {
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
    if (inventoryItem[0].branchId !== sourceBranchId) {
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
    if (inventoryItem[0].quantity < quantity) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Insufficient stock. Available: ${inventoryItem[0].quantity}, Requested: ${quantity}` 
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
      productId: inventoryItem[0].productId,
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
      .where(eq(products.id, inventoryItem[0].productId));
    
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
              productId: inventoryItem[0].productId,
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
          productId: inventoryItem[0].productId,
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
    )
  }
}
