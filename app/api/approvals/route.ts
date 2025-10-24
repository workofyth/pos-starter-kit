import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  inventory,
  inventoryTransactions,
  userBranches,
  branches,
  products,
  user,
  notifications
} from '@/db/schema/pos';
import { eq, and, desc, sql, isNull, or, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import { broadcastToBranch, broadcastToAll } from '@/lib/notification-sse';
import { sendNotificationsToBranchRoles, sendNotificationToMainBranch } from '@/lib/notification-helpers';

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
    
    // Only admins and managers can approve requests, but all users with branch assignments can view requests
    // Staff and cashier users can only view requests for their branch
    if (userRole !== 'admin' && userRole !== 'manager' && userRole !== 'staff' && userRole !== 'cashier') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User does not have permission to view approval requests' 
        }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Build query for approval requests
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
      .offset(offset) as typeof query;
    
    // Filter by branch based on user role and branch type
    if ((userRole === 'manager' || userRole === 'staff' || userRole === 'cashier') && userBranchId) {
      // Get user's branch type to determine filtering logic
      const [userBranchInfo] = await db
        .select({ type: branches.type, isMainAdmin: userBranches.isMainAdmin })
        .from(userBranches)
        .leftJoin(branches, eq(userBranches.branchId, branches.id))
        .where(eq(userBranches.userId, userId))
        .limit(1);
      
      const userBranchType = userBranchInfo?.type || 'sub';
      const isMainAdmin = userBranchInfo?.isMainAdmin || false;
      
      // For Main Branch Staff/Admin: Show all split requests
      if (userBranchType === 'main' || isMainAdmin) {
        // Main branch users see all split requests across all branches
        // No additional filtering needed - they see everything
      } 
      // For Sub Branch Staff: Show only requests for their branch (both incoming and outgoing)
      else {
        // Sub branch users see requests where their branch is either source or target
        query = query.where(
          and(
            eq(inventoryTransactions.type, 'split'),
            eq(inventoryTransactions.status, status),
            or(
              eq(inventoryTransactions.branchId, userBranchId), // Their branch is source
              eq(inventoryTransactions.referenceId, userBranchId) // Their branch is target
            )
          )
        ) as typeof query;
      }
    }
    
    const approvalRequests = await query;
    
    // Get total count for pagination
    let countQuery:any = db
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(inventoryTransactions)
      .where(and(
        eq(inventoryTransactions.type, 'split'),
        eq(inventoryTransactions.status, status)
      ));
    
    // Filter by branch based on user role and branch type
    if ((userRole === 'manager' || userRole === 'staff' || userRole === 'cashier') && userBranchId) {
      // Get user's branch type to determine filtering logic
      const [userBranchInfo] = await db
        .select({ type: branches.type, isMainAdmin: userBranches.isMainAdmin })
        .from(userBranches)
        .leftJoin(branches, eq(userBranches.branchId, branches.id))
        .where(eq(userBranches.userId, userId))
        .limit(1);
      
      const userBranchType = userBranchInfo?.type || 'sub';
      const isMainAdmin = userBranchInfo?.isMainAdmin || false;
      
      // For Main Branch Staff/Admin: Show all split requests
      if (userBranchType === 'main' || isMainAdmin) {
        // Main branch users see all split requests across all branches
        // No additional filtering needed - they see everything
      } 
      // For Sub Branch Staff: Show only requests for their branch (both incoming and outgoing)
      else {
        // Sub branch users see requests where their branch is either source or target
        countQuery = countQuery.where(
          and(
            eq(inventoryTransactions.type, 'split'),
            eq(inventoryTransactions.status, status),
            or(
              eq(inventoryTransactions.branchId, userBranchId), // Their branch is source
              eq(inventoryTransactions.referenceId, userBranchId) // Their branch is target
            )
          )
        ) as typeof countQuery;
      }
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
    
    // Get the approval request with additional details
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
      })
      .from(inventoryTransactions)
      .leftJoin(products, eq(inventoryTransactions.productId, products.id))
      .leftJoin(branches, eq(inventoryTransactions.branchId, branches.id))
      .where(eq(inventoryTransactions.id, id));
    
    const approvalReq = result[0] as any; // Cast to any to allow dynamic properties
    
    // If we need target branch information, get it separately
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
    if (userRole === 'manager' && userBranchId !== approvalReq.branchId) {
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
    let newStatus = approvalReq.status;
    if (action === 'approve') {
      newStatus = 'approved';
    } else if (action === 'reject') {
      newStatus = 'rejected';
    } else if (action === 'resend') {
      newStatus = 'pending'; // Reset to pending to allow resubmission
    }
    
    const [updatedRequest] = await db
      .update(inventoryTransactions)
      .set({ 
        status: newStatus,
        approvedBy: action === 'resend' ? null : userId, // Clear approvedBy when resending
        notes: notes || approvalReq.notes,
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
          eq(inventory.productId, approvalReq.productId),
          eq(inventory.branchId, approvalReq.branchId) // Source branch
        ));
      
      if (!sourceInventory) {
        // Create inventory record if it doesn't exist
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
            quantity: sourceInventory.quantity - approvalReq.quantity,
            lastUpdated: new Date(),
            updatedAt: new Date()
          })
          .where(and(
            eq(inventory.productId, approvalReq.productId),
            eq(inventory.branchId, approvalReq.branchId)
          ));
      }
      
      // Get current inventory in target branch
      const conditions = [
        eq(inventory.productId, approvalReq.productId),
        approvalReq.referenceId
          ? eq(inventory.branchId, approvalReq.referenceId)
          : undefined,
      ].filter(Boolean); // remove undefined entries

      const [targetInventory] = await db
        .select()
        .from(inventory)
        .where(and(...conditions));
      
      if (!targetInventory) {
        // Create inventory record if it doesn't exist
        await db.insert(inventory).values({
          id: `inv_${uuidv4()}`,
          productId: approvalReq.productId,
          branchId: approvalReq.referenceId!, // assert non-null
          quantity: approvalReq.quantity,
          minStock: 5,
          lastUpdated: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else {
        // Increase stock in target branch
        await db.update(inventory)
          .set({ 
            quantity: targetInventory.quantity + approvalReq.quantity,
            lastUpdated: new Date(),
            updatedAt: new Date()
          })
          .where(and(
            eq(inventory.productId, approvalReq.productId),
            approvalReq.referenceId
              ? eq(inventory.branchId, approvalReq.referenceId)
              : isNull(inventory.branchId)
          ));
      }
    }
    
    // Create notifications based on action (approve, reject, or resend)
    try {
      // Use the branch information we already fetched
      const productName = approvalReq.productName || 'Unknown Product';
      const sourceBranchName = approvalReq.sourceBranchName || 'Unknown Branch';
      const sourceBranchType = approvalReq.sourceBranchType || 'sub';
      const targetBranchName = approvalReq.targetBranchName || 'Unknown Branch';
      const targetBranchType = approvalReq.targetBranchType || 'sub';
      
      // Get the user who performed the action
      const [approverInfo] = await db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, userId));
      const approverName = approverInfo?.name || 'Unknown User';
      
      if (action === 'reject') {
        // Send notification to main branch users (admin, staff, manager) when request is rejected
        // Create individual notifications for each user to prevent duplicates
        const [mainBranch] = await db
          .select()
          .from(branches)
          .where(eq(branches.type, 'main'))
          .limit(1);

        if (mainBranch) {
          // Get all users with admin, staff, and manager roles in the main branch
          const usersToNotify = await db
            .select({ userId: userBranches.userId })
            .from(userBranches)
            .where(
              and(
                eq(userBranches.branchId, mainBranch.id),
                inArray(userBranches.role, ['admin', 'staff', 'manager'])
              )
            );

          // Create individual notifications for each user 
          for (const user of usersToNotify) {
            await db
              .insert(notifications)
              .values({
                id: `notif_${nanoid(10)}`,
                userId: user.userId, // Specific user notification
                branchId: mainBranch.id,
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
                },
                isRead: false,
                createdAt: new Date(),
                updatedAt: new Date()
              })
              .returning();
          }
          
          // Also broadcast to the main branch so the notification appears in real-time
          const notificationForBroadcast = {
            id: `notif_${nanoid(10)}`,
            userId: null, // Not targeting specific user
            branchId: mainBranch.id,
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
            },
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          broadcastToBranch(mainBranch.id, notificationForBroadcast);
        }
      } else if (action === 'resend') {
        // Send notification to target branch (sub-branch) users when request is resent (Rule 3)
        const targetBranchId = approvalReq.referenceId!;
        
        // Get all users in the target sub-branch (admin, staff, manager) to send individual notifications
        const usersToNotify = await db
          .select({ userId: userBranches.userId })
          .from(userBranches)
          .where(
            and(
              eq(userBranches.branchId, targetBranchId),
              inArray(userBranches.role, ['admin', 'staff', 'manager'])
            )
          );

        // Create individual notifications for each user to ensure they only get 1 notification (Rule 3)
        for (const user of usersToNotify) {
          await db
            .insert(notifications)
            .values({
              id: `notif_${nanoid(10)}`,
              userId: user.userId, // Specific user notification
              branchId: targetBranchId,
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
              },
              isRead: false,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();
        }
        
        // Broadcast to target branch for real-time updates
        const notificationForBroadcast = {
          id: `notif_${nanoid(10)}`,
          userId: null,
          branchId: targetBranchId,
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
          },
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        broadcastToBranch(targetBranchId, notificationForBroadcast);
      } else if (action === 'approve') {
        // Original notification logic for approved requests
        // Implementation of the requested notification logic:
        // 1. If split is approved by a branch, send notification to Admin and Staff Main Branch
        // 2. If split is requested from Staff/Admin Main Branch to sub-branch, send notification to Admin, Staff, and Manager of the sub-branch
        
        // Scenario 1: Split is approved (meaning this is being executed) and goes to main branch
        // Send notification to Admin, Staff, and Manager Main Branch (Rule 2)
        if (targetBranchType === 'main') {
          // Get the main branch
          const [mainBranch] = await db
            .select()
            .from(branches)
            .where(eq(branches.type, 'main'))
            .limit(1);

          if (mainBranch) {
            // Get all users with admin, staff, and manager roles in the main branch
            const usersToNotify = await db
              .select({ userId: userBranches.userId })
              .from(userBranches)
              .where(
                and(
                  eq(userBranches.branchId, mainBranch.id),
                  inArray(userBranches.role, ['admin', 'staff', 'manager'])
                )
              );

            // Create individual notifications for each main branch user to ensure they only get 1 notification (Rule 2)
            for (const user of usersToNotify) {
              await db
                .insert(notifications)
                .values({
                  id: `notif_${nanoid(10)}`,
                  userId: user.userId, // Specific user notification
                  branchId: mainBranch.id,
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
                  },
                  isRead: false,
                  createdAt: new Date(),
                  updatedAt: new Date()
                })
                .returning();
            }
            
            // Broadcast to main branch for real-time updates
            const notificationForBroadcast = {
              id: `notif_${nanoid(10)}`,
              userId: null,
              branchId: mainBranch.id,
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
              },
              isRead: false,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            broadcastToBranch(mainBranch.id, notificationForBroadcast);
          }
        } 
        // Scenario 2: Split is from Main Branch to Sub Branch
        // Send notification to Admin, Staff, and Manager of the sub-branch
        else if (sourceBranchType === 'main' && targetBranchType === 'sub') {
          // Get all users in the target sub-branch (admin, staff, manager) to send individual notifications
          const targetUsers = await db
            .select({ userId: userBranches.userId })
            .from(userBranches)
            .where(
              and(
                eq(userBranches.branchId, approvalReq.referenceId!),
                inArray(userBranches.role, ['admin', 'staff', 'manager'])
              )
            );

          // Create individual notifications for each target user
          for (const user of targetUsers) {
            await db
              .insert(notifications)
              .values({
                id: `notif_${nanoid(10)}`,
                userId: user.userId, // Specific user notification
                branchId: approvalReq.referenceId!,
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
                },
                isRead: false,
                createdAt: new Date(),
                updatedAt: new Date()
              })
              .returning();
          }
          
          // Also notify main branch that the split to sub-branch was completed (Rule 2)
          const [mainBranch] = await db
            .select()
            .from(branches)
            .where(eq(branches.type, 'main'))
            .limit(1);

          if (mainBranch) {
            // Get all users with admin, staff, and manager roles in the main branch
            const mainUsers = await db
              .select({ userId: userBranches.userId })
              .from(userBranches)
              .where(
                and(
                  eq(userBranches.branchId, mainBranch.id),
                  inArray(userBranches.role, ['admin', 'staff', 'manager'])
                )
              );

            // Create individual notifications for each main branch user to ensure they only get 1 notification (Rule 2)
            for (const user of mainUsers) {
              await db
                .insert(notifications)
                .values({
                  id: `notif_${nanoid(10)}`,
                  userId: user.userId, // Specific user notification
                  branchId: mainBranch.id,
                  title: 'Stock Split Completed',
                  message: `Stock split of ${approvalReq.quantity} units of ${productName} from main branch to ${targetBranchName} has been completed`,
                  type: 'stock_split_completed',
                  data: {
                    productId: approvalReq.productId,
                    sourceBranchId: approvalReq.branchId,
                    targetBranchId: approvalReq.referenceId,
                    quantity: approvalReq.quantity,
                    approvalTransactionId: approvalReq.id,
                    productName,
                    sourceBranchName,
                    targetBranchName
                  },
                  isRead: false,
                  createdAt: new Date(),
                  updatedAt: new Date()
                })
                .returning();
            }
            
            // Broadcast to main branch for real-time updates
            const notificationForBroadcast = {
              id: `notif_${nanoid(10)}`,
              userId: null,
              branchId: mainBranch.id,
              title: 'Stock Split Completed',
              message: `Stock split of ${approvalReq.quantity} units of ${productName} from main branch to ${targetBranchName} has been completed`,
              type: 'stock_split_completed',
              data: {
                productId: approvalReq.productId,
                sourceBranchId: approvalReq.branchId,
                targetBranchId: approvalReq.referenceId,
                quantity: approvalReq.quantity,
                approvalTransactionId: approvalReq.id,
                productName,
                sourceBranchName,
                targetBranchName
              },
              isRead: false,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            broadcastToBranch(mainBranch.id, notificationForBroadcast);
          }
        }
        // Default case: Regular branch-to-branch split (not main-to-sub)
        else {
          // Create notification for the target branch (the receiving end)
          const [targetNotification] = await db
            .insert(notifications)
            .values({
              id: `notif_${nanoid(10)}`,
              userId: null, // No specific user, goes to branch
              branchId: approvalReq.referenceId!, // Target branch
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
              },
              isRead: false,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();
          
          // Broadcast the notification to the target branch (the receiving end)
          broadcastToBranch(approvalReq.referenceId!, targetNotification);
        }
        
        // For Rule 2: If sub-branch admin approves/rejects any request, also notify main branch
        // Check if the approver is from a sub-branch
        const [approverBranchInfo] = await db
          .select({ type: branches.type })
          .from(branches)
          .where(eq(branches.id, userBranchId));
        const approverBranchType = approverBranchInfo?.type || 'sub';
        
        // If approver is from a sub-branch, notify main branch about the approval (Rule 2)
        if (approverBranchType === 'sub') {
          const [mainBranch] = await db
            .select()
            .from(branches)
            .where(eq(branches.type, 'main'))
            .limit(1);

          if (mainBranch) {
            // Get all users with admin, staff, and manager roles in the main branch
            const mainUsers = await db
              .select({ userId: userBranches.userId })
              .from(userBranches)
              .where(
                and(
                  eq(userBranches.branchId, mainBranch.id),
                  inArray(userBranches.role, ['admin', 'staff', 'manager'])
                )
              );

            // Get the user who performed the action
            const [approverInfo] = await db
              .select({ name: user.name })
              .from(user)
              .where(eq(user.id, userId));
            const approverName = approverInfo?.name || 'User';

            // Create individual notifications for each main branch user
            for (const user of mainUsers) {
              await db
                .insert(notifications)
                .values({
                  id: `notif_${nanoid(10)}`,
                  userId: user.userId, // Specific user notification
                  branchId: mainBranch.id,
                  title: 'Stock Split Request Approved',
                  message: `Request to transfer ${approvalReq.quantity} units of ${productName} from ${sourceBranchName} to ${targetBranchName} has been approved by ${approverName}`,
                  type: 'stock_split_approved',
                  data: {
                    productId: approvalReq.productId,
                    sourceBranchId: approvalReq.branchId,
                    targetBranchId: approvalReq.referenceId,
                    quantity: approvalReq.quantity,
                    approvalTransactionId: approvalReq.id,
                    productName,
                    sourceBranchName,
                    targetBranchName,
                    approvedBy: approverName,
                    approverUserId: userId
                  },
                  isRead: false,
                  createdAt: new Date(),
                  updatedAt: new Date()
                })
                .returning();
            }
            
            // Broadcast to main branch for real-time updates
            const notificationForBroadcast = {
              id: `notif_${nanoid(10)}`,
              userId: null,
              branchId: mainBranch.id,
              title: 'Stock Split Request Approved',
              message: `Request to transfer ${approvalReq.quantity} units of ${productName} from ${sourceBranchName} to ${targetBranchName} has been approved by ${approverName}`,
              type: 'stock_split_approved',
              data: {
                productId: approvalReq.productId,
                sourceBranchId: approvalReq.branchId,
                targetBranchId: approvalReq.referenceId,
                quantity: approvalReq.quantity,
                approvalTransactionId: approvalReq.id,
                productName,
                sourceBranchName,
                targetBranchName,
                approvedBy: approverName,
                approverUserId: userId
              },
              isRead: false,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            broadcastToBranch(mainBranch.id, notificationForBroadcast);
          }
        } 
        // Default case: Regular branch-to-branch split
        else {
          // Create notification for the target branch (the receiving end)
          const [targetNotification] = await db
            .insert(notifications)
            .values({
              id: `notif_${nanoid(10)}`,
              userId: null, // No specific user, goes to branch
              branchId: approvalReq.referenceId!, // Target branch
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
              },
              isRead: false,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();
          
          // Broadcast the notification to the target branch (the receiving end)
          broadcastToBranch(approvalReq.referenceId!, targetNotification);
        }
      }
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
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