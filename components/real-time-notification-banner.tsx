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

  // Set up real-time notifications using Server Sent Events (SSE)
  useEffect(() => {
    if (!session?.user?.id || isPending || !userBranchDataLoaded) return;

    let eventSource: EventSource | null = null;

    const connectToSSE = () => {
      // Check if EventSource is available in the environment
      if (typeof EventSource !== 'undefined') {
        // In a real implementation, you would connect to a specific user's notification channel
        // For now, we'll connect to a general notification stream
        eventSource = new EventSource('/api/notifications/sse');
        
        eventSource.onmessage = (event) => {
          try {
            const notificationData = JSON.parse(event.data);
            
            // Only process specific notification types
            if ([
              'stock_split_request',
              'stock_split_approved', 
              'stock_split_rejected',
              'stock_split_resent'
            ].includes(notificationData.type)) {
              // Ensure timestamp is a Date object (convert from string if needed)
              const processedNotification = {
                ...notificationData,
                timestamp: notificationData.timestamp instanceof Date 
                  ? notificationData.timestamp 
                  : new Date(notificationData.timestamp)
              };
              
              // Add the new notification to the list
              setNotifications(prev => {
                const updatedNotifications = [processedNotification, ...prev.slice(0, 4)]; // Keep only last 5
                
                // Show the banner for new notifications
                setIsVisible(true);
                
                // Auto-hide after 5 seconds
                setTimeout(() => {
                  // Hide the banner only if no other relevant notifications exist
                  const activeNotifications = updatedNotifications.filter(n => 
                    ['stock_split_request', 'stock_split_approved', 'stock_split_rejected', 'stock_split_resent'].includes(n.type)
                  );
                  if (activeNotifications.length <= 1) {
                    setIsVisible(false);
                  }
                }, 5000);
                
                return updatedNotifications;
              });
            }
          } catch (error) {
            console.error('Error parsing notification:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          eventSource?.close();
          
          // Retry connection after a delay
          setTimeout(connectToSSE, 5000);
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
  }, [session, isPending, userBranchDataLoaded]);
  
  // Simulate receiving real-time notifications for split stock events only
  useEffect(() => {
    // In a real implementation, this would connect to your SSE or WebSocket
    // For now, we'll just simulate periodic notifications for split stock events only
    
    if (isPending || !userBranchDataLoaded) return; // Don't process notifications until session and user branch data are loaded
    
    // In a real implementation, we would use SSE or WebSocket to receive notifications
    // For now, we'll set up an event listener or simulate receiving notifications
    
    // Simulate receiving notifications via a global event or SSE
    // This is just to demonstrate how the banner would work in a real scenario
    const interval = setInterval(() => {
      // Randomly generate demo notifications for split stock events only
      // Reduce the frequency further to make it less intrusive
      if (Math.random() > 0.95) { // 5% chance of a new notification (much less frequent)
        const notificationTypes: RealTimeNotification['type'][] = [
          'stock_split_request',    // Split stock request
          'stock_split_approved',   // Approve split stock
          'stock_split_rejected',   // Reject split stock
          'stock_split_resent'      // Resend split stock
        ];
        
        const randomType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
        const messages = {
          'stock_split_request': 'New stock transfer request received',
          'stock_split_approved': 'Stock transfer approved',
          'stock_split_rejected': 'Stock transfer rejected',
          'stock_split_resent': 'Stock transfer resent for approval'
        };
        
        const titles = {
          'stock_split_request': 'New Stock Request',
          'stock_split_approved': 'Transfer Approved', 
          'stock_split_rejected': 'Transfer Rejected',
          'stock_split_resent': 'Transfer Resent'
        };
        
        // Generate a unique ID using timestamp and random number
        const uniqueId = `notif_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        
        // In a real implementation, the data would come from the SSE/notifications API
        // and would be targeted specifically to the user based on their role and branch
        const newNotification: RealTimeNotification = {
          id: uniqueId,
          type: randomType,
          title: titles[randomType],
          message: messages[randomType],
          timestamp: new Date(),
          read: false,
          data: {
            productId: `prod_${Math.random().toString(36).substr(2, 9)}`,
            quantity: Math.floor(Math.random() * 100) + 1,
            branch: ['Main Branch', 'Sub Branch A', 'Sub Branch B'][Math.floor(Math.random() * 3)],
            // For demonstration purposes, simulate branch data
            sourceBranch: 'Sub Branch A',
            targetBranch: 'Main Branch'
          }
        };
        
        // Add the notification to the list but don't immediately show the banner
        setNotifications(prev => {
          const updatedNotifications = [newNotification, ...prev.slice(0, 4)]; // Keep only last 5
          
          // Only show the banner for new notifications
          setIsVisible(true);
          
          // Auto-hide after 5 seconds
          setTimeout(() => {
            // Hide the banner only if no other relevant notifications exist
            const activeNotifications = updatedNotifications.filter(n => 
              ['stock_split_request', 'stock_split_approved', 'stock_split_rejected', 'stock_split_resent'].includes(n.type)
            );
            if (activeNotifications.length <= 1) {
              setIsVisible(false);
            }
          }, 5000);
          
          return updatedNotifications;
        });
      }
    }, 30000); // Check every 30 seconds (much less frequent)
    
    return () => clearInterval(interval);
  }, [isPending, userBranchDataLoaded]);

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
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
            >
              ×
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}