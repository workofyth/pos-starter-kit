import { NextRequest } from 'next/server';
import { db } from '@/db';
import { notifications } from '@/db/schema/pos';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { broadcastToBranch } from '@/lib/notification-sse';

// GET - Returns information about the notification streaming endpoint
export async function GET(request: NextRequest) {
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Notification streaming endpoint - Use POST to send notifications' 
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// POST - Send notification to specific branch via SSE
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
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
    
    // Broadcast notification via SSE
    await broadcastToBranch(branchId, {
      title,
      message,
      type,
      data: data || {}
    });
    
    // Generate unique ID for response
    const notificationId = `notif_${nanoid(10)}`;
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully via SSE',
        data: {
          id: notificationId,
          branchId,
          title,
          message,
          type,
          data: data || {},
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error sending notification via SSE:', error);
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