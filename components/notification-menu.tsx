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
        let url = '/api/notifications?limit=10';
        if (!isMainAdmin && userBranchId) {
          // For non-main admin users, only get notifications for their branch
          const params = new URLSearchParams();
          params.append('branchId', userBranchId);
          params.append('limit', '10');
          url = `/api/notifications?${params}`;
        }

        const response = await fetch(url);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setNotifications(result.data);
            setUnreadCount(result.data.filter((n: Notification) => !n.isRead).length);
          }
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    
    // Set up real-time connection if user is not main admin (main admin might get too many notifications)
    if (!isMainAdmin && userBranchId) {
      // In a real app, this would connect to an SSE endpoint
      // For now we'll use polling to simulate real-time updates
      const interval = setInterval(() => {
        // Only fetch new notifications (notifications that were created after the last fetch)
        // For this to work properly, we'd need to track the last fetch time
        // For now, we'll just refetch periodically
        if (userBranchId) {
          const params = new URLSearchParams();
          params.append('branchId', userBranchId);
          params.append('limit', '10');
          
          fetch(`/api/notifications?${params}`)
            .then(response => {
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              return response.json();
            })
            .then(result => {
              if (result.success) {
                const newNotifications = result.data;
                const newUnreadCount = newNotifications.filter((n: Notification) => !n.isRead).length;
                
                // Only update if there are changes
                if (newNotifications.length !== notifications.length || 
                    newUnreadCount !== unreadCount) {
                  setNotifications(newNotifications);
                  setUnreadCount(newUnreadCount);
                }
              }
            })
            .catch(error => console.error('Error refetching notifications:', error));
        }
      }, 5000); // Poll every 5 seconds
      
      // TODO: In a real production app, implement proper SSE connection
      // For now, this polling approach will simulate real-time updates
      
      // Clean up
      return () => {
        clearInterval(interval);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
      };
    }

    // Clean up
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [userBranchId, isMainAdmin]);

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'stock_split':
        return <Package className="h-5 w-5 text-blue-500" />;
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
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all as read
            </Button>
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
              {notifications.map((notification) => (
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