"use client";

import { useState, useEffect } from 'react';
import { Bell, Package, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/auth-client";

interface RealTimeNotification {
  id: string;
  type: 'stock_split_request' | 'stock_split_approved' | 'stock_split_rejected' | 'stock_split_resent';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

let audioInstance: HTMLAudioElement | null = null;
let audioUnlocked = false;

if (typeof window !== 'undefined') {
  audioInstance = new Audio('/sounds/notification.mp3');
  audioInstance.preload = 'auto';

  const unlockAudio = () => {
    if (audioUnlocked || !audioInstance) return;
    
    // Set volume to 0 to prevent hearing it during unlock
    audioInstance.volume = 0;
    
    const playPromise = audioInstance.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        if (audioInstance) {
          audioInstance.pause();
          audioInstance.currentTime = 0;
          audioInstance.volume = 1; // Restore volume for future notifications
        }
        audioUnlocked = true;
        
        // Remove event listeners after successful unlock
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      }).catch((e) => {
        // Autoplay policy still preventing it, keep waiting for interactions
      });
    }
  };

  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('touchstart', unlockAudio, { once: true });
  document.addEventListener('keydown', unlockAudio, { once: true });
}

const playNotificationSound = () => {
  if (!audioInstance) return;
  
  if (!audioUnlocked && typeof document !== 'undefined') {
    // If not unlocked yet, we can try to play it anyway (might work if user interacted recently)
    // but the error will be caught cleanly.
  }
  
  audioInstance.currentTime = 0;
  audioInstance.volume = 1;
  const playPromise = audioInstance.play();
  if (playPromise !== undefined) {
    playPromise.catch(error => console.warn('Browser blocked notification sound autoplay:', error));
  }
};

export function RealTimeNotificationBanner() {
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const { data: session, isPending } = useSession();
  
  // Determine user role and branch from userBranches table
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userBranchDataLoaded, setUserBranchDataLoaded] = useState(false);
  
  // Fetch user role and branch from userBranches table
  useEffect(() => {
    if (session?.user?.id && !isPending) {
      const fetchUserBranchData = async () => {
        try {
          // In a real implementation, you would call an API endpoint to get user branch data
          // For now, we'll simulate it with fetch
          const response = await fetch(`/api/user-branches/${session.user.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              // Assuming the response contains the user's branch information
              setUserRole(data.data.role || null);
              setUserBranchId(data.data.branchId || null);
            }
          }
        } catch (error) {
          console.error('Error fetching user branch data:', error);
        } finally {
          setUserBranchDataLoaded(true);
        }
      };
      
      fetchUserBranchData();
    } else if (isPending) {
      // Reset when session is still pending
      setUserBranchDataLoaded(false);
    } else {
      // Set as loaded with null values when no session
      setUserRole(null);
      setUserBranchId(null);
      setUserBranchDataLoaded(true);
    }
  }, [session, isPending]);
  
  // Fetch unread notifications from database on mount
  useEffect(() => {
    if (!session?.user?.id || isPending || !userBranchDataLoaded) return;

    const fetchUnreadNotifications = async () => {
      try {
        const url = `/api/notifications?branchId=${userBranchId || ''}&userId=${session.user.id}&isRead=false&limit=5`;
        const response = await fetch(url);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.length > 0) {
            const formattedNotifs = result.data.map((n: any) => ({
              ...n,
              timestamp: new Date(n.createdAt),
              read: n.isRead
            }));
            setNotifications(formattedNotifs);
            setIsVisible(true);
          }
        }
      } catch (error) {
        console.error('Error fetching unread notifications:', error);
      }
    };

    fetchUnreadNotifications();
  }, [session, isPending, userBranchDataLoaded, userBranchId]);

  // Set up real-time notifications using Server Sent Events (SSE)
  useEffect(() => {
    if (!session?.user?.id || isPending || !userBranchDataLoaded) return;

    let eventSource: EventSource | null = null;

    const connectToSSE = () => {
      if (typeof EventSource !== 'undefined') {
        const sseUrl = userBranchId 
          ? `/api/notifications/sse?branchId=${userBranchId}`
          : '/api/notifications/sse';
          
        eventSource = new EventSource(sseUrl);
        
        eventSource.onmessage = (event) => {
          try {
            const notificationData = JSON.parse(event.data);
            if (notificationData.type === 'stock_split_request' || 
                notificationData.type === 'stock_split_approved' || 
                notificationData.type === 'stock_split_rejected' || 
                notificationData.type === 'stock_split_resent') {
              
              const processedNotification = {
                ...notificationData,
                id: notificationData.id || `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                timestamp: notificationData.timestamp ? new Date(notificationData.timestamp) : new Date()
              };
              
              setNotifications(prev => {
                const updatedNotifications = [processedNotification, ...prev.slice(0, 4)];
                playNotificationSound();
                setIsVisible(true);
                
                setTimeout(() => {
                  setNotifications(currentNotifs => {
                    const activeCount = currentNotifs.filter(n => 
                      ['stock_split_request', 'stock_split_approved', 'stock_split_rejected', 'stock_split_resent'].includes(n.type)
                    ).length;
                    if (activeCount <= 1) setIsVisible(false);
                    return currentNotifs;
                  });
                }, 5000);
                
                return updatedNotifications;
              });
            }
          } catch (error) {
            console.error('Error parsing notification:', error);
          }
        };

        eventSource.onerror = (error) => {
          // Only log if connection was actually established then lost, 
          // or if it's a persistent failure
          if (eventSource?.readyState === EventSource.CLOSED) {
            console.warn('SSE connection was closed, will reconnect automatically...');
          } else if (eventSource?.readyState === EventSource.CONNECTING) {
            // This is normal during reconnection
          } else {
            console.error('SSE connection error:', error);
          }
        };
      }
    };

    connectToSSE();

    // Cleanup function
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [session, isPending, userBranchDataLoaded, userBranchId]);
  
  // Simulation removed to ensure only real notifications are shown
  useEffect(() => {
    // This effect is now empty as we are using true real-time SSE via Redis Pub/Sub
  }, [isPending, userBranchDataLoaded]);

  const handleMarkAsRead = async (id: string) => {
    try {
      // Mark as read in local state first for immediate UI response
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      // Update in database
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, isRead: true }),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: RealTimeNotification['type']) => {
    switch (type) {
      case 'stock_split_request':
        return <Package className="h-5 w-5 text-blue-500" />;
      case 'stock_split_approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'stock_split_rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'stock_split_resent':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: RealTimeNotification['type']) => {
    switch (type) {
      case 'stock_split_request':
        return 'bg-blue-50 border-blue-200';
      case 'stock_split_approved':
        return 'bg-green-50 border-green-200';
      case 'stock_split_rejected':
        return 'bg-red-50 border-red-200';
      case 'stock_split_resent':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Filter notifications to only show split stock events as per requirements
  // Show request, approved, rejected, and resent notifications
  const splitStockNotifications = notifications.filter(notification => 
    [
      'stock_split_request',
      'stock_split_approved', 
      'stock_split_rejected',
      'stock_split_resent'
    ].includes(notification.type)
  );

  // In a real implementation, we would filter based on user's role and branch
  // For now, we show all split stock notifications to all users as per the simulation
  // The actual filtering would happen on the backend when sending notifications via SSE
  if (!isVisible || splitStockNotifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      {splitStockNotifications.map((notification) => (
        <div 
          key={notification.id}
          className={`mb-2 p-4 border rounded-lg shadow-lg transform transition-all duration-300 ease-in-out ${getNotificationColor(notification.type)} ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="ml-3 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">{notification.title}</h4>
                <Badge variant="secondary" className="text-xs">
                  {notification.data?.branch}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {notification.message}
              </p>
              {notification.data && (
                <p className="mt-1 text-xs text-gray-500">
                  {notification.data.quantity} units of {notification.data.productId}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-6 w-6 p-0 ml-2"
              onClick={() => handleMarkAsRead(notification.id)}
            >
              ×
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}