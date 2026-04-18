import { NextRequest } from 'next/server';
import { db } from '@/db';
import { inventory, products, branches, inventoryTransactions, userBranches } from '@/db/schema/pos';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { sendNotificationsToBranchRoles } from '@/lib/notification-helpers';

// POST - Create approval request for splitting inventory from one branch to another
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      productId, // Single split fallback
      quantity,  // Single split fallback
      items,     // Multiple split: Array of { productId, quantity }
      sourceBranchId,
      targetBranchId,
      notes = '',
      userId 
    } = body;
    
    // Validate required fields
    if (!sourceBranchId || !targetBranchId || !userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Source Branch ID, Target Branch ID, and User ID are required' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if source and target branches are different
    if (sourceBranchId === targetBranchId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Source and target branches must be different' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare items list
    let splitItems = [];
    if (items && Array.isArray(items) && items.length > 0) {
      splitItems = items;
    } else if (productId && quantity) {
      splitItems = [{ productId, quantity }];
    } else {
      return new Response(
        JSON.stringify({ success: false, message: 'Products and quantities are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
        JSON.stringify({ success: false, message: 'User not found or not assigned to any branch' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const userRole = userBranchResponse[0].role;
    const userBranchId = userBranchResponse[0].branchId;
    const isMainAdmin = userBranchResponse[0].isMainAdmin || false;
    
    if (!isMainAdmin) {
      // Basic role validation: admin, manager, staff can initiate split
      if (userRole !== 'staff' && userRole !== 'admin' && userRole !== 'manager') {
        return new Response(
          JSON.stringify({ success: false, message: 'Unauthorized to initiate inventory split requests' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // Must be from own branch
      if (userBranchId !== sourceBranchId) {
        return new Response(
          JSON.stringify({ success: false, message: 'Users can only initiate inventory splits from their assigned branch' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const results = [];
    
    // Process each item
    for (const item of splitItems) {
      const { productId: pId, quantity: qty } = item;
      
      // Check if source inventory exists and has enough stock
      const [sourceInv] = await db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, pId),
            eq(inventory.branchId, sourceBranchId)
          )
        )
        .limit(1);
      
      if (!sourceInv || sourceInv.quantity < qty) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Insufficient stock for product ${pId}. Available: ${sourceInv?.quantity || 0}` 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Create approval request
      const [approvalRequest] = await db.insert(inventoryTransactions).values({
        id: `itx_${nanoid(10)}`,
        productId: pId,
        branchId: sourceBranchId,
        referenceId: targetBranchId,
        type: 'split',
        quantity: qty,
        notes: notes || `Request to split ${qty} units to branch ${targetBranchId}`,
        status: 'pending',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      results.push(approvalRequest);

      // Notification Logic
      const [sourceBranch] = await db.select({ type: branches.type, name: branches.name }).from(branches).where(eq(branches.id, sourceBranchId)).limit(1);
      const [targetBranch] = await db.select({ type: branches.type, name: branches.name }).from(branches).where(eq(branches.id, targetBranchId)).limit(1);
      const [product] = await db.select({ name: products.name }).from(products).where(eq(products.id, pId)).limit(1);

      if (sourceBranch && targetBranch) {
        try {
          await sendNotificationsToBranchRoles(
            targetBranchId,
            ['admin', 'manager', 'staff'],
            {
              title: 'New Stock Split Request',
              message: `A request to transfer ${qty} units of ${product?.name} from ${sourceBranch.name} to ${targetBranch.name} is awaiting approval.`,
              type: 'stock_split_request',
              data: {
                transactionId: approvalRequest.id,
                sourceBranchId,
                targetBranchId,
                productId: pId,
                quantity: qty
              }
            }
          );
        } catch (err) {
          console.error('Notification failed for split:', err);
        }
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${results.length} split request(s) created successfully`,
        data: results
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating split request:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
