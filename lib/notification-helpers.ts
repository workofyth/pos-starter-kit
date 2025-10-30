import { db } from '@/db';
import { notifications, userBranches, branches } from '@/db/schema/pos';
import { eq, and, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { broadcastToBranch } from '@/lib/notification-sse';

/**
 * Send notifications to specific user roles within a branch using SSE and database storage
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
    userId?: string | null;
  }
) {
  try {
    // Create the notification in the database
    await createNotification(branchId, notificationData);
  } catch (error) {
    console.error('Error sending notifications to branch roles:', error);
    // Don't throw the error - notification failure shouldn't break the main operation
  }
}

/**
 * Send notification to main branch users (Admin and Staff) using SSE and database storage
 * @param notificationData - The notification data to send
 */
export async function sendMainBranchNotification(
  notificationData: {
    title: string;
    message: string;
    type: string;
    data?: any;
  }
) {
  try {
    // Find main branch ID
    const [mainBranch] = await db
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.type, 'main'))
      .limit(1);

    if (mainBranch) {
      // Create the notification in the database for the main branch
      await createNotification(mainBranch.id, notificationData);
    }
  } catch (error) {
    console.error('Error sending notification to main branch:', error);
    // Don't throw the error - notification failure shouldn't break the main operation
  }
}

/**
 * Create a notification in the database and broadcast it via SSE
 * @param branchId - The branch ID to send notifications to
 * @param notificationData - The notification data to send
 * @param userId - Optional user ID to target specific user
 */
export async function createNotification(
  branchId: string,
  notificationData: {
    title: string;
    message: string;
    type: string;
    data?: any;
    userId?: string | null;
  }
) {
  try {
    const { title, message, type, data, userId } = notificationData;
    
    // Validate required fields
    if (!branchId || !title || !message || !type) {
      console.error('Missing required fields for notification:', { branchId, title, message, type });
      return null;
    }
    
    // Generate unique ID
    const notificationId = `notif_${nanoid(10)}`;
    
    // Insert the notification into the database
    const result = await db
      .insert(notifications)
      .values({
        id: notificationId,
        userId: userId || null, // Explicitly set to null if not provided
        branchId,
        title,
        message,
        type,
        data: data || null,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning()
      .catch(error => {
        console.error('Error inserting notification into database:', error);
        return null;
      });

    // If insertion was successful, broadcast via SSE
    if (result && result.length > 0) {
      const newNotification = result[0];
      try {
        // Broadcast the notification via SSE (only include the required fields)
        await broadcastToBranch(branchId, {
          title: newNotification.title,
          message: newNotification.message,
          type: newNotification.type,
          data: newNotification.data
        });
      } catch (sseError) {
        console.error('Error broadcasting notification via SSE:', sseError);
        // Don't fail the operation if SSE fails, just continue
      }
      return newNotification;
    }
    
    return null;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Create a notification in the database for a specific user and broadcast it via SSE
 * @param userId - The user ID to send notification to
 * @param branchId - The branch ID to send notifications to
 * @param notificationData - The notification data to send
 */
export async function createNotificationForUser(
  userId: string,
  branchId: string,
  notificationData: {
    title: string;
    message: string;
    type: string;
    data?: any;
  }
) {
  try {
    const { title, message, type, data } = notificationData;
    
    // Validate required fields
    if (!userId || !branchId || !title || !message || !type) {
      console.error('Missing required fields for user notification:', { userId, branchId, title, message, type });
      return null;
    }
    
    // Generate unique ID
    const notificationId = `notif_${nanoid(10)}`;
    
    // Insert the notification into the database
    const result = await db
      .insert(notifications)
      .values({
        id: notificationId,
        userId,
        branchId,
        title,
        message,
        type,
        data: data || null,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning()
      .catch(error => {
        console.error('Error inserting user notification into database:', error);
        return null;
      });

    // If insertion was successful, broadcast via SSE
    if (result && result.length > 0) {
      const newNotification = result[0];
       try {
        // Broadcast the notification via SSE (only include the required fields)
        await broadcastToBranch(branchId, {
          title: newNotification.title,
          message: newNotification.message,
          type: newNotification.type,
          data: newNotification.data
        });
      } catch (sseError) {
        console.error('Error broadcasting notification via SSE:', sseError);
        // Don't fail the operation if SSE fails, just continue
      }
      return newNotification;
    }
    
    return null;
  } catch (error) {
    console.error('Error creating user notification:', error);
    return null;
  }
}