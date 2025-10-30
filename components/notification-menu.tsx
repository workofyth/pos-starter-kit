"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  X
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/auth-client";
import { UserRole } from "@/lib/role-based-access";

interface Notification {
  id: string;
  userId: string | null;
  branchId: string;
  title: string;
  message: string;
  type: string;
  data: any;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  branchName: string | null;
}

export function NotificationMenu() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isMainAdmin, setIsMainAdmin] = useState<boolean>(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch user's branch information
  useEffect(() => {
    const fetchUserBranchInfo = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(`/api/user-branches?userId=${session.user.id}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data.length > 0) {
              setUserRole(result.data[0].role || 'staff');
              setUserBranchId(result.data[0].branchId || null);
              setIsMainAdmin(result.data[0].isMainAdmin || false);
            }
          }
        } catch (error) {
          console.error('Error fetching user branch info:', error);
        }
      }
    };

    fetchUserBranchInfo();
  }, [session]);

  // Fetch notifications and set up real-time connection
  useEffect(() => {
    if (!userBranchId && !isMainAdmin) {
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      try {
        // Fetch both user-specific and branch-specific notifications from database
        let userNotifications: Notification[] = [];
        let branchNotifications: Notification[] = [];
        
        // Fetch user-specific notifications
        if (session?.user?.id) {
          const userUrl = `/api/notifications?userId=${session.user.id}&limit=10`;
          const userResponse = await fetch(userUrl);
          if (userResponse.ok) {
            const userResult = await userResponse.json();
            if (userResult.success) {
              userNotifications = userResult.data;
            }
          }
        }
        
        // Fetch branch-specific notifications
        if (userBranchId) {
          const branchUrl = `/api/notifications?branchId=${userBranchId}&limit=10`;
          const branchResponse = await fetch(branchUrl);
          if (branchResponse.ok) {
            const branchResult = await branchResponse.json();
            if (branchResult.success) {
              branchNotifications = branchResult.data;
            }
          }
        }
        
        // For main admins, also fetch main branch notifications
        let mainBranchNotifications: Notification[] = [];
        if (isMainAdmin) {
          const mainBranchResponse = await fetch('/api/branches?type=main');
          if (mainBranchResponse.ok) {
            const mainBranchResult = await mainBranchResponse.json();
            if (mainBranchResult.success && mainBranchResult.data && mainBranchResult.data.length > 0) {
              const mainBranchId = mainBranchResult.data[0].id;
              const mainBranchUrl = `/api/notifications?branchId=${mainBranchId}&limit=10`;
              const mainBranchResponse2 = await fetch(mainBranchUrl);
              if (mainBranchResponse2.ok) {
                const mainBranchResult2 = await mainBranchResponse2.json();
                if (mainBranchResult2.success) {
                  mainBranchNotifications = mainBranchResult2.data;
                }
              }
            }
          }
        }
        
        // Combine all database notifications, removing duplicates by ID
        const allDbNotifications = [
          ...userNotifications,
          ...branchNotifications,
          ...mainBranchNotifications
        ].filter((notification, index, self) => 
          index === self.findIndex(n => n.id === notification.id)
        );
        
        // Sort by creation date (newest first)
        allDbNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        // Take only the most recent 10 from database
        const dbRecentNotifications = allDbNotifications.slice(0, 10);
        
        setNotifications(dbRecentNotifications);
        setUnreadCount(dbRecentNotifications.filter((n: Notification) => !n.isRead).length);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    
    // Set up real-time connection using Server-Sent Events (SSE) for live updates
    if ((!isMainAdmin && userBranchId && session?.user?.id) || (isMainAdmin && session?.user?.id)) {
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 5;
      let reconnectTimeout: NodeJS.Timeout | null = null;
      
      const setupNotificationStream = async () => {
        // Determine the branch ID to subscribe to
        let targetBranchId = userBranchId;
        
        // If it's a main admin, connect to the main branch notifications
        if (isMainAdmin) {
          // For main admins, we get the main branch ID
          try {
            const response = await fetch('/api/branches?type=main');
            if (response.ok) {
              const result = await response.json();
              if (result.success && result.data && result.data.length > 0) {
                targetBranchId = result.data[0].id;
              } else {
                console.error('Could not find main branch for main admin');
                return;
              }
            } else {
              console.error('Failed to fetch main branch for main admin');
              return;
            }
          } catch (error) {
            console.error('Error fetching main branch for main admin:', error);
            return;
          }
        }
        
        if (!targetBranchId) {
          console.error('No target branch ID found for notification stream');
          return;
        }
        
        // Connect to the SSE notification stream for the target branch
        const sseUrl = `/api/notifications/stream/client?branchId=${targetBranchId}`;
        const eventSource = new EventSource(sseUrl);
        
        eventSource.onopen = () => {
          console.log('Connected to SSE notification stream');
          reconnectAttempts = 0; // Reset attempts on successful connection
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'notification') {
              // Add new notification to the list
              const newNotification = data.notification;
              
              // Ensure newNotification has all required fields
              const completeNotification = {
                id: newNotification.id,
                userId: newNotification.userId || null,
                branchId: newNotification.branchId,
                title: newNotification.title,
                message: newNotification.message,
                type: newNotification.type,
                data: newNotification.data || null,
                isRead: newNotification.isRead || false,
                createdAt: newNotification.createdAt || new Date().toISOString(),
                updatedAt: newNotification.updatedAt || new Date().toISOString(),
                branchName: newNotification.branchName || null
              };
              
              setNotifications(prev => {
                // Check if notification already exists to prevent duplicates
                const exists = prev.some(n => n.id === completeNotification.id);
                
                // If it doesn't exist, add it to the beginning of the list
                if (!exists) {
                  // Create new list with the new notification at the beginning
                  const updatedList = [completeNotification, ...prev];
                  
                  // Remove duplicates (in case the notification was added from DB after SSE)
                  const uniqueUpdatedList = updatedList.filter((notification, index, self) => 
                    index === self.findIndex(n => n.id === notification.id)
                  );
                  
                  // Limit to 10 most recent notifications
                  const finalList = uniqueUpdatedList.slice(0, 10);
                  
                  // Update unread count
                  setUnreadCount(finalList.filter(n => !n.isRead).length);
                  return finalList;
                }
                
                // If it already exists, just return the current list
                return prev;
              });
            }
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE error:', error);
          
          // Attempt to reconnect with exponential backoff
          if (reconnectAttempts < maxReconnectAttempts && eventSource.readyState !== eventSource.CLOSED) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Cap at 30s
            
            if (reconnectTimeout) {
              clearTimeout(reconnectTimeout);
            }
            
            reconnectTimeout = setTimeout(() => {
              console.log(`Attempting to reconnect to SSE (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
              eventSource.close();
              setupNotificationStream();
            }, delay);
          }
        };

        eventSourceRef.current = eventSource;
      };

      setupNotificationStream();
      
      // Set up periodic refresh of database notifications (every 30 seconds to reduce load while maintaining consistency)
      const refreshInterval = setInterval(() => {
        fetchNotifications().catch(err => console.error('Error refreshing notifications:', err));
      }, 30000); // 30 seconds - balanced frequency for consistency

      // Return cleanup function
      return () => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        clearInterval(refreshInterval);
      };
    }

    // Clean up
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [userBranchId, isMainAdmin, session?.user?.id]);

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'stock_split':
        return <Package className="h-5 w-5 text-blue-500" />;
      case 'stock_split_request':
        return <Package className="h-5 w-5 text-blue-500" />;
      case 'stock_split_approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'stock_split_rejected':
        return <X className="h-5 w-5 text-red-500" />;
      case 'stock_split_resent':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'inventory_update':
        return <Package className="h-5 w-5 text-green-500" />;
      case 'approval_request':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'approval_approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'approval_rejected':
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          isRead: true
        })
      });

      if (response.ok) {
        setNotifications(notifications.map(notif => 
          notif.id === id ? { ...notif, isRead: true } : notif
        ));
        setUnreadCount(prev => prev - 1);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(notif => !notif.isRead);
      
      for (const notification of unreadNotifications) {
        await markAsRead(notification.id);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications? This cannot be undone.')) {
      return;
    }
    
    try {
      // Delete all notifications for the user
      let deleteUrl = '/api/notifications';
      if (session?.user?.id) {
        deleteUrl += `?userId=${session.user.id}`;
      } else if (userBranchId) {
        deleteUrl += `?branchId=${userBranchId}`;
      }
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Update local state
        setNotifications([]);
        setUnreadCount(0);
      } else {
        console.error('Failed to clear notifications:', await response.text());
      }
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  // Format date to relative time
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs"
              >
                Mark all read
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllNotifications}
                className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications
                .filter(notification => notification.id) // Ensure notification has an ID
                .filter((notification, index, self) => 
                  index === self.findIndex(n => n.id === notification.id) // Ensure unique IDs
                )
                .map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 ${!notification.isRead ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
                  >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatTimeAgo(notification.createdAt)} 
                        {notification.branchName && ` • ${notification.branchName}`}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button 
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="p-2 border-t text-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => window.location.href = '/notifications'} // Link to full notifications page
            >
              View all notifications
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}