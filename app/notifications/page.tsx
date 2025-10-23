"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Bell,
  MailOpen,
  Mail
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { UserRole } from "@/lib/role-based-access";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

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

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isMainAdmin, setIsMainAdmin] = useState<boolean>(false);

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

  // Fetch notifications
  useEffect(() => {
    if (!userBranchId && !isMainAdmin) return;

    const fetchNotifications = async () => {
      try {
        let url = '/api/notifications?limit=50'; // Get more notifications for the full page
        if (!isMainAdmin && userBranchId) {
          // For non-main admin users, only get notifications for their branch
          const params = new URLSearchParams();
          params.append('branchId', userBranchId);
          params.append('limit', '50');
          url = `/api/notifications?${params}`;
        }

        const response = await fetch(url);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setNotifications(result.data);
          }
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
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
  const markAsRead = async (id: string, isRead: boolean) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          isRead
        })
      });

      if (response.ok) {
        setNotifications(notifications.map(notif => 
          notif.id === id ? { ...notif, isRead } : notif
        ));
      }
    } catch (error) {
      console.error('Error updating notification:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter(notif => !notif.isRead)
        .map(notif => notif.id);
      
      for (const id of unreadIds) {
        await markAsRead(id, true);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Format date to readable format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Group notifications by date
  const groupNotificationsByDate = (notifications: Notification[]) => {
    const groups: { [key: string]: Notification[] } = {};
    
    notifications.forEach(notification => {
      const date = new Date(notification.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(notification);
    });
    
    return groups;
  };

  const groupedNotifications = groupNotificationsByDate(notifications);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold">Notifications</h1>
                <p className="text-gray-500">All your notifications in one place</p>
              </div>
              {notifications.some(n => !n.isRead) && (
                <Button onClick={markAllAsRead} variant="outline">
                  <MailOpen className="h-4 w-4 mr-2" />
                  Mark all as read
                </Button>
              )}
            </div>

            {Object.keys(groupedNotifications).length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No notifications</h3>
                  <p className="text-gray-500">You don't have any notifications yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedNotifications).map(([date, notifications]) => (
                  <div key={date}>
                    <h2 className="text-lg font-semibold mb-4 pl-4 border-l-4 border-blue-500">
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h2>
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <Card 
                          key={notification.id} 
                          className={`border-l-4 ${notification.isRead ? 'border-l-gray-300' : 'border-l-blue-500'} ${!notification.isRead ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h3 className={`font-medium ${!notification.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {notification.title}
                                  </h3>
                                  {!notification.isRead && (
                                    <Badge variant="secondary" className="ml-2">New</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                  {notification.message}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                  <span>{formatDate(notification.createdAt)}</span>
                                  {notification.branchName && (
                                    <span>• {notification.branchName}</span>
                                  )}
                                  {notification.type && (
                                    <span>• {notification.type.replace('_', ' ').toUpperCase()}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id, !notification.isRead)}
                                >
                                  {notification.isRead ? (
                                    <Mail className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <MailOpen className="h-4 w-4 text-blue-500" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}