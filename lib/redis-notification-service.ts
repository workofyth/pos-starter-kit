// This service handles in-memory real-time notifications
import { getRedis, initializeRedis } from '@/lib/redis';
import { broadcastToBranch } from '@/lib/notification-sse';

class RedisNotificationService {
  private subscribers: Map<string, ((message: any) => void)[]> = new Map();
  private subscriberClient: any | null = null;
  
  constructor() {
    // Only initialize on server-side
    if (typeof window === 'undefined') {
      this.initializeSubscriber();
    }
  }
  
  private async initializeSubscriber() {
    try {
      // Initialize in-memory client
      await initializeRedis();
      
      // For in-memory implementation, we don't need a separate subscriber client
      // The main redis instance handles everything
      console.log('In-memory notification service initialized');
    } catch (error) {
      console.error('Error initializing in-memory notification service:', error);
    }
  }
  
  // Subscribe to notifications for a specific branch
  subscribe(branchId: string, callback: (message: any) => void) {
    // Only subscribe on server-side
    if (typeof window !== 'undefined') {
      return () => {}; // Return noop cleanup function
    }
    
    const channel = `notifications:${branchId}`;
    const key = channel;
    
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }
    
    const subscribers = this.subscribers.get(key)!;
    subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
  }
  
  // Publish notification to a specific branch
  async publish(branchId: string, notification: any) {
    // Only publish on server-side
    if (typeof window !== 'undefined') {
      return;
    }
    
    try {
      const redis = await getRedis();
      if (!redis) return;
      
      const channel = `notifications:${branchId}`;
      await redis.publish(channel, JSON.stringify({
        type: 'notification',
        notification
      }));
    } catch (error) {
      console.error('Error publishing to in-memory store:', error);
    }
  }
  
  // Notify local subscribers
  private notifySubscribers(branchId: string, message: any) {
    const channel = `notifications:${branchId}`;
    const subscribers = this.subscribers.get(channel);
    
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error('Error notifying subscriber:', error);
        }
      });
    }
  }
  
  // Cleanup function
  async cleanup() {
    // Only cleanup on server-side
    if (typeof window !== 'undefined') {
      return;
    }
    
    try {
      // For in-memory implementation, there's no specific cleanup needed
      this.subscribers.clear();
      console.log('In-memory notification service cleaned up');
    } catch (error) {
      console.error('Error cleaning up in-memory notification service:', error);
    }
  }
}

// Create singleton instance
const redisNotificationService = new RedisNotificationService();

export default redisNotificationService;