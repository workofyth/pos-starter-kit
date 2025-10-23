import { NextRequest } from 'next/server';
import { db } from '@/db';
import { notifications, branches } from '@/db/schema/pos';
import { eq, and, desc, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { broadcastToBranch } from '@/lib/notification-sse';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const branchId = searchParams.get('branchId') || '';
    const userId = searchParams.get('userId') || '';
    const isRead = searchParams.get('isRead');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Build query
    let query = db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        branchId: notifications.branchId,
        title: notifications.title,
        message: notifications.message,
        type: notifications.type,
        data: notifications.data,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        updatedAt: notifications.updatedAt,
        branchName: branches.name,
      })
      .from(notifications)
      .leftJoin(branches, eq(notifications.branchId, branches.id))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Apply filters
    let whereConditions = [];
    
    if (branchId) {
      whereConditions.push(eq(notifications.branchId, branchId));
    }
    
    if (userId) {
      whereConditions.push(eq(notifications.userId, userId));
    }
    
    if (isRead !== null && isRead !== undefined) {
      whereConditions.push(eq(notifications.isRead, isRead === 'true'));
    }
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as typeof query;
    }
    
    const notificationList = await query;
    
    // Get total count for pagination
    let countQuery: any = db
      .select({ count: count() })
      .from(notifications);
    
    let countWhereConditions = [];
    
    if (branchId) {
      countWhereConditions.push(eq(notifications.branchId, branchId));
    }
    
    if (userId) {
      countWhereConditions.push(eq(notifications.userId, userId));
    }
    
    if (isRead !== null && isRead !== undefined) {
      countWhereConditions.push(eq(notifications.isRead, isRead === 'true'));
    }
    
    if (countWhereConditions.length > 0) {
      countQuery = countQuery.where(and(...countWhereConditions));
    }
    
    const totalCountResult = await countQuery;
    const totalCount = typeof totalCountResult[0].count === 'number' 
      ? totalCountResult[0].count 
      : parseInt(totalCountResult[0].count as string);
    const totalPages = Math.ceil(totalCount / limit);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: notificationList,
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
    console.error('Error fetching notifications:', error);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      userId,
      branchId,
      title,
      message,
      type,
      data
    } = body;
    
    // Validate required fields
    if (!branchId || !title || !message || !type) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Branch ID, title, message, and type are required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Generate unique ID
    const notificationId = `notif_${nanoid(10)}`;
    
    // Insert the notification
    const [newNotification] = await db
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
      .returning();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification created successfully',
        data: newNotification
      }),
      { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error creating notification:', error);
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

// PUT route to update notification (mark as read)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      id,
      isRead
    } = body;
    
    // Validate required fields
    if (!id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Update the notification
    const [updatedNotification] = await db
      .update(notifications)
      .set({
        isRead: isRead !== undefined ? isRead : notifications.isRead,
        updatedAt: new Date()
      })
      .where(eq(notifications.id, id))
      .returning();
    
    if (!updatedNotification) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Notification not found' 
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
        message: 'Notification updated successfully',
        data: updatedNotification
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error updating notification:', error);
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

// DELETE route to remove notification
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    await db
      .delete(notifications)
      .where(eq(notifications.id, id));
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification deleted successfully'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error deleting notification:', error);
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