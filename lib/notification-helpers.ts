import { db } from '@/db';
import { notifications, userBranches, branches } from '@/db/schema/pos';
import { eq, and, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { broadcastToBranch } from '@/lib/notification-sse';

/**
 * Send notifications to specific user roles within a branch
 * @param branchId - The branch ID to send notifications to
 * @param roles - Array of user roles to notify (e.g., ['admin', 'manager', 'staff'])
 * @param notificationData - The notification data to send
 */
export async function sendNotificationsToBranchRoles(
  branchId: string,
  roles: string[] ,
  notificationData: {
    title: string;
    message: string;
    type: string;
    data?: any;
  }
) {
  try {
    // Get all users with the specified roles in the branch

    const usersToNotify = await db
      .select({
        userId: userBranches.userId,
        role: userBranches.role
      })
      .from(userBranches)
      .where(
        and(
          eq(userBranches.branchId, branchId),
          inArray(userBranches.role, roles as any)
        )
      );

    // Create individual notifications for each user
    const notificationsToSend = [];
    for (const user of usersToNotify) {
      const notificationId = `notif_${nanoid(10)}`;
      const [notification] = await db
        .insert(notifications)
        .values({
          id: notificationId,
          userId: user.userId,
          branchId: branchId,
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type,
          data: notificationData.data || {},
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      notificationsToSend.push(notification);
    }

    // Also create a branch-level notification
    const branchNotificationId = `notif_${nanoid(10)}`;
    const [branchNotification] = await db
      .insert(notifications)
      .values({
        id: branchNotificationId,
        userId: null, // Branch-level notification
        branchId: branchId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        data: notificationData.data || {},
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    notificationsToSend.push(branchNotification);

    // Broadcast all notifications
    for (const notification of notificationsToSend) {
      broadcastToBranch(branchId, notification);
    }

    return notificationsToSend;
  } catch (error) {
    console.error('Error sending notifications to branch roles:', error);
    throw error;
  }
}

/**
 * Send notification to main branch users (Admin and Staff)
 * @param notificationData - The notification data to send
 */
export async function sendNotificationToMainBranch(
  notificationData: {
    title: string;
    message: string;
    type: string;
    data?: any;
  }
) {
  try {
    // Get the main branch
    const [mainBranch] = await db
      .select()
      .from(branches)
      .where(eq(branches.type, 'main'))
      .limit(1);

    if (!mainBranch) {
      throw new Error('Main branch not found');
    }

    // Send notifications to main branch users (Admin and Staff)
    return await sendNotificationsToBranchRoles(
      mainBranch.id,
      ['admin', 'staff'],
      notificationData
    );
  } catch (error) {
    console.error('Error sending notification to main branch:', error);
    throw error;
  }
}