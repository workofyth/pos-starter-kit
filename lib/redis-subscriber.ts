import { getRedis } from '@/lib/redis';
import { broadcastToBranch } from '@/lib/notification-sse';

// For the in-memory implementation, we use the same redis instance
let subscriber: any | null = null;

export async function initializeRedisSubscriber() {
  // Only initialize on server-side
  if (typeof window !== 'undefined') {
    return;
  }
  
  try {
    // For in-memory implementation, initialization is just confirming the instance is available
    subscriber = await getRedis();
    console.log('In-memory subscriber initialized successfully');
  } catch (error) {
    console.error('Error initializing in-memory subscriber:', error);
  }
}

export async function shutdownRedisSubscriber() {
  // Only shutdown on server-side
  if (typeof window !== 'undefined' || !subscriber) {
    return;
  }
  
  try {
    // For in-memory implementation, there's no specific shutdown needed
    console.log('In-memory subscriber shutdown completed');
  } catch (error) {
    console.error('Error shutting down in-memory subscriber:', error);
  }
}

// Function to poll for notifications for a specific branch
export async function pollBranchNotifications(branchId: string, callback: (message: any) => void) {
  // Only poll on server-side
  if (typeof window !== 'undefined') {
    return;
  }
  
  try {
    const redis = await getRedis();
    if (!redis) return;
    
    const key = `notifications:${branchId}`;
    
    // Poll for notifications in the branch's list
    const result = await redis.lrange(key, 0, 0); // Get latest notification
    
    if (result && result.length > 0) {
      try {
        const data = JSON.parse(result[0]);
        if (data.type === 'notification') {
          callback(data.notification);
        }
      } catch (error) {
        console.error('Error parsing in-memory message:', error);
      }
    }
  } catch (error) {
    console.error('Error polling branch notifications:', error);
  }
}

// Function to poll for pattern-based notifications
export async function pollPatternNotifications(pattern: string, callback: (channel: string, message: any) => void) {
  // Only poll on server-side
  if (typeof window !== 'undefined') {
    return;
  }
  
  try {
    const redis = await getRedis();
    if (!redis) return;
    
    // For pattern-based polling, we would need to implement a more complex mechanism
    // This is a simplified version that polls a specific key
    const result = await redis.lrange(pattern, 0, 0);
    
    if (result && result.length > 0) {
      try {
        const data = JSON.parse(result[0]);
        if (data.type === 'notification') {
          callback(pattern, data.notification);
        }
      } catch (error) {
        console.error('Error parsing in-memory message:', error);
      }
    }
  } catch (error) {
    console.error('Error polling pattern notifications:', error);
  }
}

// Export subscriber for use in other modules if needed
export { subscriber };