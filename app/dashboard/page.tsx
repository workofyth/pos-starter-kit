"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  Package,
  CreditCard,
  BarChart3,
  Activity
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useSession } from "@/lib/auth-client";
import { useEffect, useState } from "react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function DashboardPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  
  // Real data state
  const [salesData, setSalesData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    netProfit: 0,
    transactionsCount: 0,
    inventoryValue: 0,
    customersCount: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!session?.user) return;
      setLoading(true);
      try {
        // Resolve user branch context
        let branchIdToUse = '';
        const userBranchResponse = await fetch(`/api/user-branches?userId=${session.user.id}`);
        if (userBranchResponse.ok) {
          const userBranchResult = await userBranchResponse.json();
          if (userBranchResult.success && userBranchResult.data.length > 0) {
            const userRole = userBranchResult.data[0].role;
            if (userRole !== 'admin') {
              branchIdToUse = userBranchResult.data[0].branchId;
            }
          }
        }

        const url = branchIdToUse 
          ? `/api/reporting?branchId=${branchIdToUse}`
          : `/api/reporting`;

        const response = await fetch(url);
        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success) {
            setStats(resJson.data.stats);
            setSalesData(resJson.data.salesData);
            setPieData(resJson.data.categoryData);
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [session]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent border-blue-600"></div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button>Generate Report</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Total earnings from sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <ShoppingCart className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.transactionsCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Completed sales orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customersCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total registered members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Val.</CardTitle>
            <Package className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.inventoryValue)}</div>
            <p className="text-xs text-muted-foreground">Estimated stock value</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="sales" fill="#4f46e5" name="Sales" />
                <Bar dataKey="profit" fill="#10b981" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Product Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">Transaction #{item}</p>
                  <p className="text-sm text-gray-500">Customer Name</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Rp 250,000</p>
                  <p className="text-sm text-gray-500">Today, 10:30 AM</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}