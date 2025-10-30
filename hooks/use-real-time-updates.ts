"use client";

import { useState, useEffect, useRef } from 'react';

// Custom hook for real-time data updates using HTTP polling
export function useRealTimeUpdates(channel: string, onData: (data: any) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Create polling connection to the external notification server
    const startPolling = () => {
      // Clear any existing interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      // Set up polling interval (every 15 seconds to reduce request frequency)
      pollingIntervalRef.current = setInterval(async () => {
        try {
          // Poll for new notifications
          const response = await fetch(`/api/notifications?channel=${channel}&limit=5`);
          
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              // Process new notifications
              result.data.forEach((notification: any) => {
                onData(notification);
              });
              
              if (!isConnected) {
                setIsConnected(true);
                setError(null);
              }
            }
          } else {
            console.error('HTTP polling error:', response.status);
            if (isConnected) {
              setIsConnected(false);
              setError('Connection error');
            }
          }
        } catch (err) {
          console.error('HTTP polling connection error:', err);
          if (isConnected) {
            setIsConnected(false);
            setError('Connection error');
          }
        }
      }, 15000); // Poll every 15 seconds to reduce request frequency
      
      setIsConnected(true);
      setError(null);
    };

    startPolling();

    // Cleanup function
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsConnected(false);
    };
  }, [channel, onData, isConnected]);

  return { isConnected, error };
}