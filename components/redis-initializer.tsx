"use client";

// This component initializes in-memory subscriber when the application starts
import { useEffect } from 'react';
import { initializeRedisSubscriber, shutdownRedisSubscriber } from '@/lib/redis-subscriber';
import { broadcastToBranch } from '@/lib/notification-sse';

export function RedisInitializer() {
  useEffect(() => {
    // Initialize in-memory subscriber when component mounts
    const initRedis = async () => {
      await initializeRedisSubscriber();
    };
    
    initRedis().catch(console.error);
    
    // Cleanup function when component unmounts
    return () => {
      shutdownRedisSubscriber().catch(console.error);
    };
  }, []);
  
  return null; // This component doesn't render anything
}