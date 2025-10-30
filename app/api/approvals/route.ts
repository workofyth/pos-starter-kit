import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  inventory,
  inventoryTransactions,
  userBranches,
  branches,
  products,
  user as userTable,
  notifications
} from '@/db/schema/pos';
import { eq, and, desc, sql, isNull, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import { broadcastToBranch, broadcastToAll } from '@/lib/notification-sse';
import { getRedis } from '@/lib/redis';
import { sendNotificationsToBranchRoles, sendMainBranchNotification } from '@/lib/notification-helpers';

// POST - Create a new approval request
export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      productId,
      sourceBranchId,
      targetBranchId,
      quantity,
      type = 'split',
      notes
    } = await request.json();

    if (!userId || !productId || !sourceBranchId || !targetBranchId || !quantity) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User ID, Product ID, Source Branch ID, Target Branch ID, and Quantity are required' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check user branch assignment
    const userBranchResponse = await db
      .select({
        role: userBranches.role,
        branchId: userBranches.branchId
      })
      .from(userBranches)
      .where(and(
        eq(userBranches.userId, userId),
        eq(userBranches.branchId, sourceBranchId)
      ));

    if (userBranchResponse.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'User not authorized to create approval request for this branch' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userRole = userBranchResponse[0].role;
    const userBranchId = userBranchResponse[0].branchId;

    if (userRole !== 'admin' && userRole !== 'manager' && userRole !== 'staff') {
      return new Response(
        JSON.stringify({ success: false, message: 'Only admin, manager, and staff can create approval requests' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const transactionId = `trans_${nanoid()}`;

    const [newTransaction] = await db
      .insert(inventoryTransactions)
      .values({
        id: transactionId,
        productId,
        branchId: sourceBranchId,
        referenceId: targetBranchId,
        quantity,
        type,
        notes: notes || '',
        status: 'pending',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Fetch product & branch info for notifications (use optional chaining)
    const [productInfo] = await db
      .select({ name: products.name })
      .from(products)
      .where(eq(products.id, productId));

    const [sourceBranchInfo] = await db
      .select({ name: branches.name, type: branches.type })
      .from(branches)
      .where(eq(branches.id, sourceBranchId))
      .limit(1);

    const [targetBranchInfo] = await db
      .select({ name: branches.name, type: branches.type })
      .from(branches)
      .where(eq(branches.id, targetBranchId))
      .limit(1);

    const productName = productInfo?.name || 'Unknown Product';
    const sourceBranchName = sourceBranchInfo?.name || 'Unknown Branch';
    const targetBranchName = targetBranchInfo?.name || 'Unknown Branch';
    const sourceBranchType = sourceBranchInfo?.type || 'sub';
    const targetBranchType = targetBranchInfo?.type || 'sub';

    // Notification rules
    if (sourceBranchType === 'sub' && targetBranchType === 'main') {
      const [mainBranch] = await db
        .select()
        .from(branches)
        .where(eq(branches.type, 'main'))
        .limit(1);

      if (mainBranch) {
        await sendMainBranchNotification({
          title: 'New Stock Split Request from Sub-Branch',
          message: `${userRole} from ${sourceBranchName} requested to transfer ${quantity} units of ${productName} to main branch`,
          type: 'stock_split_request',
          data: {
            productId,
            sourceBranchId,
            targetBranchId,
            quantity,
            approvalTransactionId: newTransaction.id,
            productName,
            sourceBranchName,
            targetBranchName,
            requestedBy: userId,
            createdAt: newTransaction.createdAt
          }
        });
      }
    } else if (sourceBranchType === 'main' && targetBranchType === 'sub') {
      await sendNotificationsToBranchRoles(
        targetBranchId,
        ['admin', 'staff', 'manager'],
        {
          title: 'New Stock Split Request from Main Branch',
          message: `Main branch requested to transfer ${quantity} units of ${productName} to ${targetBranchName}`,
          type: 'stock_split_request',
          data: {
            productId,
            sourceBranchId,
            targetBranchId,
            quantity,
            approvalTransactionId: newTransaction.id,
            productName,
            sourceBranchName,
            targetBranchName,
            requestedBy: userId,
            createdAt: newTransaction.createdAt
          }
        }
      );
    } else if (sourceBranchType === 'sub' && targetBranchType === 'sub') {
      await sendNotificationsToBranchRoles(
        targetBranchId,
        ['admin', 'staff', 'manager'],
        {
          title: 'New Stock Split Request',
          message: `${userRole} from ${sourceBranchName} requested to transfer ${quantity} units of ${productName} to ${targetBranchName}`,
          type: 'stock_split_request',
          data: {
            productId,
            sourceBranchId,
            targetBranchId,
            quantity,
            approvalTransactionId: newTransaction.id,
            productName,
            sourceBranchName,
            targetBranchName,
            requestedBy: userId,
            createdAt: newTransaction.createdAt
          }
        }
      );
    }

    // Publish real-time update
    try {
      const redisClient = await getRedis();
      if (redisClient) {
        const updateData = {
          type: 'stock_split_requested',
          productId,
          sourceBranchId,
          targetBranchId,
          quantity,
          productName,
          sourceBranchName,
          targetBranchName,
          requestedBy: userId
        };
        await redisClient.publish('notifications:approvals', JSON.stringify(updateData));
      }
    } catch (publishError) {
      console.warn('Failed to publish new request update:', publishError);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Approval request created successfully', data: newTransaction }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating approval request:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// GET - Fetch pending approval requests for a user's branch
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get('userId') || '';
    const branchId = searchParams.get('branchId') || '';
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, message: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userBranchResponse = await db
      .select({
        role: userBranches.role,
        branchId: userBranches.branchId
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

    if (userRole !== 'admin' && userRole !== 'manager' && userRole !== 'staff' && userRole !== 'cashier') {
      return new Response(
        JSON.stringify({ success: false, message: 'User does not have permission to view approval requests' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build base query
    let query: any = db
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
        createdBy: userTable.name
      })
      .from(inventoryTransactions)
      .leftJoin(products, eq(inventoryTransactions.productId, products.id))
      .leftJoin(branches, eq(inventoryTransactions.branchId, branches.id))
      .leftJoin(userTable, eq(inventoryTransactions.createdBy, userTable.id))
      .where(and(
        eq(inventoryTransactions.type, 'split'),
        eq(inventoryTransactions.status, status)
      ))
      .orderBy(desc(inventoryTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    // Filter by branch (for sub-branch users)
    if ((userRole === 'manager' || userRole === 'staff' || userRole === 'cashier') && userBranchId) {
      const [userBranchInfo] = await db
        .select({ type: branches.type, isMainAdmin: userBranches.isMainAdmin })
        .from(userBranches)
        .leftJoin(branches, eq(userBranches.branchId, branches.id))
        .where(eq(userBranches.userId, userId))
        .limit(1);

      const userBranchType = userBranchInfo?.type || 'sub';
      const isMainAdmin = userBranchInfo?.isMainAdmin || false;

      if (userBranchType === 'main' || isMainAdmin) {
        // main sees all
      } else {
        query = query.where(
          and(
            eq(inventoryTransactions.type, 'split'),
            eq(inventoryTransactions.status, status),
            or(
              eq(inventoryTransactions.branchId, userBranchId),
              eq(inventoryTransactions.referenceId, userBranchId)
            )
          )
        );
      }
    }

    const approvalRequests = await query;

    // total count
    let countQuery: any = db
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(inventoryTransactions)
      .where(and(
        eq(inventoryTransactions.type, 'split'),
        eq(inventoryTransactions.status, status)
      ));

    if ((userRole === 'manager' || userRole === 'staff' || userRole === 'cashier') && userBranchId) {
      const [userBranchInfo] = await db
        .select({ type: branches.type, isMainAdmin: userBranches.isMainAdmin })
        .from(userBranches)
        .leftJoin(branches, eq(userBranches.branchId, branches.id))
        .where(eq(userBranches.userId, userId))
        .limit(1);

      const userBranchType = userBranchInfo?.type || 'sub';
      const isMainAdmin = userBranchInfo?.isMainAdmin || false;

      if (userBranchType === 'main' || isMainAdmin) {
        // main sees all
      } else {
        countQuery = countQuery.where(
          and(
            eq(inventoryTransactions.type, 'split'),
            eq(inventoryTransactions.status, status),
            or(
              eq(inventoryTransactions.branchId, userBranchId),
              eq(inventoryTransactions.referenceId, userBranchId)
            )
          )
        );
      }
    }

    const totalCountResult = await countQuery;
    const totalCount = Number(totalCountResult[0]?.count || 0);
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
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching approval requests:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
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
      action, // 'approve' | 'reject' | 'resend'
      notes
    } = await request.json();

    if (!id || !userId || !action) {
      return new Response(
        JSON.stringify({ success: false, message: 'Request ID, User ID, and Action are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userBranchResponse = await db
      .select({
        role: userBranches.role,
        branchId: userBranches.branchId
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

    if (userRole !== 'admin' && userRole !== 'manager') {
      return new Response(
        JSON.stringify({ success: false, message: 'Only admin and manager users can approve requests' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // fetch approval request with source branch type included
    const result = await db
      .select({
        id: inventoryTransactions.id,
        productId: inventoryTransactions.productId,
        branchId: inventoryTransactions.branchId,
        referenceId: inventoryTransactions.referenceId,
        quantity: inventoryTransactions.quantity,
        type: inventoryTransactions.type,
        notes: inventoryTransactions.notes,
        status: inventoryTransactions.status,
        createdAt: inventoryTransactions.createdAt,
        updatedAt: inventoryTransactions.updatedAt,
        createdBy: inventoryTransactions.createdBy,
        approvedBy: inventoryTransactions.approvedBy,
        productName: products.name,
        sourceBranchName: branches.name,
        sourceBranchType: branches.type
      })
      .from(inventoryTransactions)
      .leftJoin(products, eq(inventoryTransactions.productId, products.id))
      .leftJoin(branches, eq(inventoryTransactions.branchId, branches.id))
      .where(eq(inventoryTransactions.id, id));

    const approvalReq = result[0] as any;

    if (approvalReq && approvalReq.referenceId) {
      const targetBranchResult = await db
        .select({
          name: branches.name,
          type: branches.type
        })
        .from(branches)
        .where(eq(branches.id, approvalReq.referenceId))
        .limit(1);

      if (targetBranchResult.length > 0) {
        approvalReq.targetBranchName = targetBranchResult[0].name;
        approvalReq.targetBranchType = targetBranchResult[0].type;
      }
    }

    if (!approvalReq) {
      return new Response(
        JSON.stringify({ success: false, message: 'Approval request not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (userRole === 'manager' && userBranchId !== approvalReq.branchId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Managers can only approve requests for their assigned branch' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // determine new status and publish preliminary updates if needed
    let newStatus = approvalReq.status;
    if (action === 'approve') {
      newStatus = 'approved';
    } else if (action === 'reject') {
      newStatus = 'rejected';
      try {
        const redisClient = await getRedis();
        if (redisClient) {
          const updateData = {
            type: 'stock_split_rejected',
            productId: approvalReq.productId,
            sourceBranchId: approvalReq.branchId,
            targetBranchId: approvalReq.referenceId,
            quantity: approvalReq.quantity,
            productName: approvalReq.productName || 'Unknown Product',
            sourceBranchName: approvalReq.sourceBranchName || 'Unknown Branch',
            targetBranchName: approvalReq.targetBranchName || 'Unknown Branch',
            reason: notes || approvalReq.notes || 'No reason provided'
          };
          await redisClient.publish('notifications:approvals', JSON.stringify(updateData));
        }
      } catch (publishError) {
        console.warn('Failed to publish rejection update:', publishError);
      }
    } else if (action === 'resend') {
      newStatus = 'pending';
      try {
        const redisClient = await getRedis();
        if (redisClient) {
          const updateData = {
            type: 'stock_split_resent',
            productId: approvalReq.productId,
            sourceBranchId: approvalReq.branchId,
            targetBranchId: approvalReq.referenceId,
            quantity: approvalReq.quantity,
            productName: approvalReq.productName || 'Unknown Product',
            sourceBranchName: approvalReq.sourceBranchName || 'Unknown Branch',
            targetBranchName: approvalReq.targetBranchName || 'Unknown Branch'
          };
          await redisClient.publish('notifications:approvals', JSON.stringify(updateData));
        }
      } catch (publishError) {
        console.warn('Failed to publish resend update:', publishError);
      }
    }

    const [updatedRequest] = await db
      .update(inventoryTransactions)
      .set({
        status: newStatus,
        approvedBy: action === 'resend' ? null : userId,
        notes: notes || approvalReq.notes,
        updatedAt: new Date()
      })
      .where(eq(inventoryTransactions.id, id))
      .returning();

    // If approved, process inventory movement
    if (action === 'approve') {
      const [sourceInventory] = await db
        .select()
        .from(inventory)
        .where(and(
          eq(inventory.productId, approvalReq.productId),
          eq(inventory.branchId, approvalReq.branchId)
        ));

      if (!sourceInventory) {
        await db.insert(inventory).values({
          id: `inv_${uuidv4()}`,
          productId: approvalReq.productId,
          branchId: approvalReq.branchId,
          quantity: 0,
          minStock: 5,
          lastUpdated: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else if (sourceInventory.quantity < approvalReq.quantity) {
        return new Response(
          JSON.stringify({ success: false, message: 'Insufficient stock in source branch' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        await db.update(inventory)
          .set({
            quantity: sourceInventory.quantity - approvalReq.quantity,
            lastUpdated: new Date(),
            updatedAt: new Date()
          })
          .where(and(
            eq(inventory.productId, approvalReq.productId),
            eq(inventory.branchId, approvalReq.branchId)
          ));
      }

      const conditions = [
        eq(inventory.productId, approvalReq.productId),
        approvalReq.referenceId ? eq(inventory.branchId, approvalReq.referenceId) : undefined
      ].filter(Boolean);

      const [targetInventory] = await db
        .select()
        .from(inventory)
        .where(and(...(conditions as any)));

      if (!targetInventory) {
        await db.insert(inventory).values({
          id: `inv_${uuidv4()}`,
          productId: approvalReq.productId,
          branchId: approvalReq.referenceId!,
          quantity: approvalReq.quantity,
          minStock: 5,
          lastUpdated: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else {
        await db.update(inventory)
          .set({
            quantity: targetInventory.quantity + approvalReq.quantity,
            lastUpdated: new Date(),
            updatedAt: new Date()
          })
          .where(and(
            eq(inventory.productId, approvalReq.productId),
            approvalReq.referenceId ? eq(inventory.branchId, approvalReq.referenceId) : isNull(inventory.branchId)
          ));
      }

      // publish inventory movement updates
      try {
        const redisClient = await getRedis();
        if (redisClient) {
          const updateData = {
            type: 'stock_split_completed',
            productId: approvalReq.productId,
            sourceBranchId: approvalReq.branchId,
            targetBranchId: approvalReq.referenceId,
            quantity: approvalReq.quantity,
            productName: approvalReq.productName || 'Unknown Product',
            sourceBranchName: approvalReq.sourceBranchName || 'Unknown Branch',
            targetBranchName: approvalReq.targetBranchName || 'Unknown Branch'
          };

          await redisClient.publish(`notifications:${approvalReq.branchId}`, JSON.stringify(updateData));
          if (approvalReq.referenceId) {
            await redisClient.publish(`notifications:${approvalReq.referenceId}`, JSON.stringify(updateData));
          }
          await redisClient.publish('notifications:inventory', JSON.stringify(updateData));
          await redisClient.publish('notifications:approvals', JSON.stringify(updateData));
        }
      } catch (publishError) {
        console.warn('Failed to publish inventory update:', publishError);
      }
    }

    // Create notifications based on action
    try {
      const productName = approvalReq.productName || 'Unknown Product';
      const sourceBranchName = approvalReq.sourceBranchName || 'Unknown Branch';
      const sourceBranchType = approvalReq.sourceBranchType || 'sub';
      const targetBranchName = approvalReq.targetBranchName || 'Unknown Branch';
      const targetBranchType = approvalReq.targetBranchType || 'sub';

      const [approverInfo] = await db
        .select({ name: userTable.name })
        .from(userTable)
        .where(eq(userTable.id, userId));
      const approverName = approverInfo?.name || 'Unknown User';

      if (action === 'reject') {
        const [mainBranch] = await db
          .select()
          .from(branches)
          .where(eq(branches.type, 'main'))
          .limit(1);

        if (mainBranch) {
          await sendMainBranchNotification({
            title: 'Stock Split Request Rejected',
            message: `Request to transfer ${approvalReq.quantity} units of ${productName} from ${sourceBranchName} to ${targetBranchName} has been rejected by ${approverName}. Reason: ${notes || approvalReq.notes || 'No reason provided'}`,
            type: 'stock_split_rejected',
            data: {
              productId: approvalReq.productId,
              sourceBranchId: approvalReq.branchId,
              targetBranchId: approvalReq.referenceId,
              quantity: approvalReq.quantity,
              approvalTransactionId: approvalReq.id,
              productName,
              sourceBranchName,
              targetBranchName,
              approverName,
              reason: notes || approvalReq.notes || 'No reason provided',
              createdAt: approvalReq.createdAt
            }
          });
        }
      } else if (action === 'resend') {
        const targetBranchId = approvalReq.referenceId!;
        await sendNotificationsToBranchRoles(
          targetBranchId,
          ['admin', 'staff', 'manager'],
          {
            title: 'Stock Split Request Resent',
            message: `Request to transfer ${approvalReq.quantity} units of ${productName} from ${sourceBranchName} to ${targetBranchName} has been resent by main branch and requires your attention.`,
            type: 'stock_split_resent',
            data: {
              productId: approvalReq.productId,
              sourceBranchId: approvalReq.branchId,
              targetBranchId: approvalReq.referenceId,
              quantity: approvalReq.quantity,
              approvalTransactionId: approvalReq.id,
              productName,
              sourceBranchName,
              targetBranchName,
              resentBy: approverName,
              createdAt: approvalReq.createdAt
            }
          }
        );
      } else if (action === 'approve') {
        // approved notifications
        if (targetBranchType === 'main') {
          const [mainBranch] = await db
            .select()
            .from(branches)
            .where(eq(branches.type, 'main'))
            .limit(1);

          if (mainBranch) {
            await sendMainBranchNotification({
              title: 'Stock Split to Main Branch',
              message: `Main branch received ${approvalReq.quantity} units of ${productName} from ${sourceBranchName}`,
              type: 'stock_split',
              data: {
                productId: approvalReq.productId,
                sourceBranchId: approvalReq.branchId,
                quantity: approvalReq.quantity,
                approvalTransactionId: approvalReq.id,
                productName,
                sourceBranchName,
                targetBranchName
              }
            });
          }
        } else if (sourceBranchType === 'main' && targetBranchType === 'sub') {
          await sendNotificationsToBranchRoles(
            approvalReq.referenceId!,
            ['admin', 'staff', 'manager'],
            {
              title: 'Stock Split Received',
              message: `Received ${approvalReq.quantity} units of ${productName} from main branch ${sourceBranchName}`,
              type: 'stock_split',
              data: {
                productId: approvalReq.productId,
                sourceBranchId: approvalReq.branchId,
                quantity: approvalReq.quantity,
                approvalTransactionId: approvalReq.id,
                productName,
                sourceBranchName,
                targetBranchName
              }
            }
          );
        } else {
          await sendNotificationsToBranchRoles(
            approvalReq.referenceId!,
            ['admin', 'staff', 'manager'],
            {
              title: 'Stock Split Completed',
              message: `Received ${approvalReq.quantity} units of ${productName} from ${sourceBranchName}`,
              type: 'stock_split',
              data: {
                productId: approvalReq.productId,
                sourceBranchId: approvalReq.branchId,
                quantity: approvalReq.quantity,
                approvalTransactionId: approvalReq.id,
                productName,
                sourceBranchName,
                targetBranchName
              }
            }
          );
        }

        // If approver is from sub-branch, also notify main branch
        const [approverBranchInfo] = await db
          .select({ type: branches.type })
          .from(branches)
          .where(eq(branches.id, userBranchId));
        const approverBranchType = approverBranchInfo?.type || 'sub';

        if (approverBranchType === 'sub') {
          try {
            const [mainBranch] = await db
              .select()
              .from(branches)
              .where(eq(branches.type, 'main'))
              .limit(1);

            if (mainBranch) {
              await sendMainBranchNotification({
                title: 'Stock Split Completed',
                message: `Received ${approvalReq.quantity} units of ${productName} from ${sourceBranchName}`,
                type: 'stock_split',
                data: {
                  productId: approvalReq.productId,
                  sourceBranchId: approvalReq.branchId,
                  quantity: approvalReq.quantity,
                  approvalTransactionId: approvalReq.id,
                  productName,
                  sourceBranchName,
                  targetBranchName
                }
              });
            }
          } catch (notificationError) {
            console.error('Error creating notification for sub-branch approval:', notificationError);
          }
        }
      }
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    return new Response(
      JSON.stringify({ success: true, message: `Request ${action}d successfully`, data: updatedRequest }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating approval request:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
