// Store active connections by branch - using in-memory storage for production
import { getRedis } from '@/lib/redis';

// Define a type for connection writers that can handle both WritableStreamDefaultWriter and ReadableStreamDefaultController
export interface ConnectionWriter {
  write?: (chunk: Uint8Array) => Promise<void>;
  enqueue?: (chunk: Uint8Array) => void;
  close?: () => void;
  [key: string]: any; // Allow other properties
}

// Local fallback for development environments
const connections: Map<string, Set<ConnectionWriter>> = new Map();

// Define notification type
interface NotificationData {
  title: string;
  message: string;
  type: string;
  data?: any;
}

// Function to broadcast notification to a specific branch
export async function broadcastToBranch(branchId: string, notification: NotificationData) {
  // Broadcast all notification types (not just split stock events) to ensure comprehensive real-time updates
  // This allows all types of notifications to be sent in real-time
  
  // Always try to push to in-memory storage for real-time delivery (server-side only)
  if (typeof window === 'undefined') {
    try {
      const redis = await getRedis();
      if (redis) {
        const key = `notifications:${branchId}`;
        await redis.lpush(key, JSON.stringify({ type: 'notification', notification }));
        
        // Trim list to keep only last 100 notifications
        await redis.ltrim(key, 0, 99);
      }
    } catch (error) {
      // Log in-memory storage error but continue with local connections
      console.warn('In-memory broadcast failed, using local connections:', error);
    }
  }
  
  // Also broadcast to local connections if available
  const branchConnections = connections.get(branchId);
  if (!branchConnections) return;

  const encoder = new TextEncoder();
  const data = `data: ${JSON.stringify({ type: 'notification', notification })}\\n\\n`;

  const connectionsToDelete: ConnectionWriter[] = [];
  
  branchConnections.forEach((writer: ConnectionWriter) => {
    try {
      if (writer.write) {
        // For standard WritableStreamDefaultWriter
        writer.write(encoder.encode(data));
      } else if (writer.enqueue) {
        // For ReadableStreamDefaultController used in Next.js API routes
        writer.enqueue(encoder.encode(data));
      }
    } catch (error) {
      // Mark this connection for removal
      connectionsToDelete.push(writer);
      console.error('Error broadcasting to connection:', error);
    }
  });
  
  // Remove broken connections after iteration
  connectionsToDelete.forEach((writer: ConnectionWriter) => {
    branchConnections.delete(writer);
    if (branchConnections.size === 0) {
      connections.delete(branchId);
    }
  });
}

// Function to broadcast to all connections (for testing)
export async function broadcastToAll(notification: NotificationData) {
  // Try to push to all in-memory storage entries (server-side only)
  if (typeof window === 'undefined') {
    try {
      const redis = await getRedis();
      if (redis) {
        const key = `notifications:all`;
        await redis.lpush(key, JSON.stringify({ type: 'notification', notification }));
        
        // Trim list to keep only last 100 notifications
        await redis.ltrim(key, 0, 99);
      }
    } catch (error) {
      // Log in-memory storage error but continue with local connections
      console.warn('In-memory broadcast failed, using local connections:', error);
    }
  }
  
  const encoder = new TextEncoder();
  const data = `data: ${JSON.stringify({ type: 'notification', notification })}\\n\\n`;

  connections.forEach((branchConnections, mapBranchId) => {
    const connectionsToDelete: ConnectionWriter[] = [];
    branchConnections.forEach((writer: ConnectionWriter) => {
      try {
        if (writer.write) {
          // For standard WritableStreamDefaultWriter
          writer.write(encoder.encode(data));
        } else if (writer.enqueue) {
          // For ReadableStreamDefaultController used in Next.js API routes
          writer.enqueue(encoder.encode(data));
        }
      } catch (error) {
        // Mark this connection for removal
        connectionsToDelete.push(writer);
        console.error('Error broadcasting to connection in broadcastToAll:', error);
      }
    });
    
    // Remove broken connections after iteration
    connectionsToDelete.forEach((writer: ConnectionWriter) => {
      branchConnections.delete(writer);
    });
    
    if (branchConnections.size === 0) {
      connections.delete(mapBranchId);
    }
  });
}

// Function to add a connection to the local store (fallback)
export function addConnection(branchId: string, writer: ConnectionWriter) {
  if (!connections.has(branchId)) {
    connections.set(branchId, new Set());
  }
  const branchConnections = connections.get(branchId)!;
  branchConnections.add(writer);
  
  // Return cleanup function
  return () => {
    branchConnections.delete(writer);
    if (branchConnections.size === 0) {
      connections.delete(branchId);
    }
  };
}

// Function to poll for new notifications in a branch (for real-time updates)
export async function pollForNotifications(branchId: string, callback: (notification: any) => void) {
  // Only poll in-memory storage on server-side
  if (typeof window === 'undefined') {
    try {
      const redis = await getRedis();
      if (redis) {
        const key = `notifications:${branchId}`;
        
        // Get latest notification from in-memory storage (non-blocking operation)
        const result = await redis.lrange(key, 0, 0); // Get only the latest notification
        
        if (result && result.length > 0) {
          try {
            // Check if result is already a parsed object or needs parsing
            const data = typeof result[0] === 'string' ? JSON.parse(result[0]) : result[0];
            if (data.type === 'notification') {
              callback(data.notification);
            }
          } catch (error) {
            console.error('Error parsing in-memory notification:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error polling for notifications:', error);
    }
  }
}