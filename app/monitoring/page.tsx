"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import {
  Users,
  Building2,
  Package,
  Tag,
  Truck,
  UserCircle,
  ShoppingCart,
  FileText,
  BellRing,
  AlertTriangle,
  Boxes,
  UserCog,
  CreditCard,
  UserPlus,
  RefreshCw,
  ShieldAlert,
  CircleDot,
} from "lucide-react";

interface Overview {
  branches: number;
  products: number;
  categories: number;
  brands: number;
  suppliers: number;
  members: number;
  transactions: number;
  transactionsToday: number;
  purchaseOrders: number;
  draftOrders: number;
  unreadNotifications: number;
  inventoryItems: number;
  lowStockItems: number;
  staff: number;
}

interface ActiveUser {
  userId: string;
  name: string;
  email: string;
  lastSeen: string;
  ipAddress: string | null;
  role: string;
  isMainAdmin: boolean;
  branchName: string;
  sessionCount: number;
}

interface ActivityItem {
  id: string;
  type: "transaction" | "inventory" | "purchase_order" | "staff";
  title: string;
  actorName: string;
  branchName: string;
  amount: number | null;
  status: string;
  createdAt: string;
}

const activityIcon: Record<ActivityItem["type"], typeof CreditCard> = {
  transaction: CreditCard,
  inventory: Boxes,
  purchase_order: ShoppingCart,
  staff: UserPlus,
};

export default function MonitoringPage() {
  const { data: session } = useSession();
  const [isMainAdmin, setIsMainAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    const checkAdmin = async () => {
      try {
        const res = await fetch(`/api/user-branches?userId=${session.user.id}`);
        if (!res.ok) return;
        const result = await res.json();
        if (!cancelled && result.success && result.data.length > 0) {
          setIsMainAdmin(result.data[0].isMainAdmin === true);
        } else if (!cancelled) {
          setIsMainAdmin(false);
        }
      } catch {
        if (!cancelled) setIsMainAdmin(false);
      }
    };
    checkAdmin();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch("/api/monitoring");
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.message || "Failed to load monitoring data");
        return;
      }
      setError(null);
      setOverview(result.data.overview);
      setActiveUsers(result.data.activeUsers);
      setActivity(result.data.activity);
      setLastUpdated(new Date());
    } catch {
      setError("Failed to load monitoring data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isMainAdmin !== true) return;
    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 30000);
    return () => clearInterval(interval);
  }, [isMainAdmin, fetchSnapshot]);

  if (isMainAdmin === null || (isMainAdmin && loading)) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent border-primary"></div>
      </div>
    );
  }

  if (isMainAdmin === false) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-3">
        <ShieldAlert className="h-12 w-12 text-muted-foreground opacity-40" />
        <h2 className="text-lg font-bold">Access restricted</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          The monitoring dashboard is only available to the main admin of your store.
        </p>
      </div>
    );
  }

  const statCards = overview
    ? [
        { label: "Branches", val: overview.branches, icon: Building2, cls: "bg-primary/10 text-primary" },
        { label: "Staff (active)", val: overview.staff, icon: UserCog, cls: "bg-chart-2/10 text-chart-2" },
        { label: "Products", val: overview.products, icon: Package, cls: "bg-chart-3/10 text-chart-3" },
        { label: "Categories", val: overview.categories, icon: Tag, cls: "bg-chart-4/10 text-chart-4" },
        { label: "Brands", val: overview.brands, icon: Tag, cls: "bg-chart-5/10 text-chart-5" },
        { label: "Suppliers", val: overview.suppliers, icon: Truck, cls: "bg-chart-1/10 text-chart-1" },
        { label: "Members", val: overview.members, icon: UserCircle, cls: "bg-primary/10 text-primary" },
        { label: "Transactions today", val: overview.transactionsToday, icon: CreditCard, cls: "bg-chart-2/10 text-chart-2" },
        { label: "Transactions (all-time)", val: overview.transactions, icon: CreditCard, cls: "bg-chart-2/10 text-chart-2" },
        { label: "Purchase orders", val: overview.purchaseOrders, icon: ShoppingCart, cls: "bg-chart-3/10 text-chart-3" },
        { label: "Draft orders", val: overview.draftOrders, icon: FileText, cls: "bg-chart-4/10 text-chart-4" },
        { label: "Unread notifications", val: overview.unreadNotifications, icon: BellRing, cls: "bg-chart-5/10 text-chart-5" },
        { label: "Inventory items", val: overview.inventoryItems, icon: Boxes, cls: "bg-chart-1/10 text-chart-1" },
        {
          label: "Low stock alerts",
          val: overview.lowStockItems,
          icon: AlertTriangle,
          cls: overview.lowStockItems > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display">Monitoring</h1>
          <p className="text-sm text-muted-foreground">
            Store-wide data, activity, and active users across all branches
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchSnapshot}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm px-4 py-3">
          {error}
        </div>
      )}

      {/* Data overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {statCards.map((s, i) => (
          <Card key={i} className="overflow-hidden border-none shadow-soft bg-card group hover:shadow-soft-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${s.cls} group-hover:scale-110 transition-transform`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-bold leading-none">{s.val.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active users */}
        <Card className="border-none shadow-soft bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active Users</CardTitle>
            <Badge variant="secondary">{activeUsers.length} online</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {activeUsers.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No users currently active
                </div>
              ) : (
                activeUsers.map((u) => (
                  <div key={u.userId} className="flex items-start gap-3">
                    <div className="relative mt-1">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center font-bold text-primary text-sm">
                        {u.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <CircleDot className="h-3 w-3 text-chart-2 absolute -bottom-0.5 -right-0.5 fill-chart-2" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate">{u.name}</p>
                        {u.isMainAdmin && (
                          <Badge variant="default" className="text-[10px]">Main Admin</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] capitalize">{u.role}</Badge>
                        <span className="text-[10px] text-muted-foreground">{u.branchName}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Last seen {formatDistanceToNow(new Date(u.lastSeen), { addSuffix: true })}
                        {u.sessionCount > 1 ? ` · ${u.sessionCount} sessions` : ""}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card className="lg:col-span-2 border-none shadow-soft bg-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
              {activity.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No recent activity found
                </div>
              ) : (
                activity.map((a) => {
                  const Icon = activityIcon[a.type];
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 py-3 border-b last:border-0 group hover:bg-muted/50 transition-colors rounded-lg px-2 -mx-2"
                    >
                      <div className="p-2 rounded-lg bg-muted text-muted-foreground shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {a.actorName} · {a.branchName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {a.amount !== null && (
                          <p className="text-sm font-bold">
                            {a.type === "inventory" ? a.amount.toLocaleString() : formatCurrency(a.amount)}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
