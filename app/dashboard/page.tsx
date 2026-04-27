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
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!session?.user) {
        setLoading(false);
        return;
      }
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
            setRecentTransactions(resJson.data.recentTransactions || []);
            setTopProducts(resJson.data.topProducts || []);
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
        {[
          { label: "Total Revenue", val: formatCurrency(stats.totalRevenue), color: "blue", icon: DollarSign, desc: "Total earnings from sales" },
          { label: "Net Profit (Est.)", val: formatCurrency(stats.netProfit), color: "green", icon: TrendingUp, desc: "Estimated gross profit" },
          { label: "Transactions", val: stats.transactionsCount.toLocaleString(), color: "purple", icon: ShoppingCart, desc: "Completed sales orders" },
          { label: "Inventory Val.", val: formatCurrency(stats.inventoryValue), color: "orange", icon: Package, desc: "Estimated stock value" }
        ].map((s, i) => (
          <Card key={i} className="overflow-hidden border-none shadow-md bg-white dark:bg-gray-900 group hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-${s.color}-100 dark:bg-${s.color}-900/30 text-${s.color}-600 dark:text-${s.color}-400 group-hover:scale-110 transition-transform`}>
                  <s.icon className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{s.val}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-3 w-3 opacity-50" />
                <span>{s.desc}</span>
              </div>
            </CardContent>
          </Card>
        ))}
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

      {/* Bottom Grid: Recent Transactions & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 border-none shadow-md bg-white dark:bg-gray-900">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" className="text-blue-600">View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Activity className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  No recent activity found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Customer</th>
                        <th className="pb-3 font-semibold">Date</th>
                        <th className="pb-3 font-semibold text-right">Amount</th>
                        <th className="pb-3 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {recentTransactions.map((t, i) => (
                        <tr key={i} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-4 font-medium">{t.customerName}</td>
                          <td className="py-4 text-sm text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</td>
                          <td className="py-4 text-right font-bold text-green-600">{formatCurrency(t.total)}</td>
                          <td className="py-4 text-right">
                             <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold">PAID</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="border-none shadow-md bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {topProducts.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No data available</div>
              ) : (
                topProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-blue-600">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sold} units sold</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCurrency(p.revenue)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}