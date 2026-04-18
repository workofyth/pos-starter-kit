"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar,
  Download,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Users
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
import { useEffect } from "react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ReportingPage() {
  const { data: session } = useSession();
  const [dateRange, setDateRange] = useState("monthly");
  const [reportType, setReportType] = useState("sales");
  const [loading, setLoading] = useState(true);
  
  // Real data state
  const [salesData, setSalesData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    netProfit: 0,
    transactionsCount: 0,
    inventoryValue: 0
  });

  useEffect(() => {
    const fetchReportData = async () => {
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
            setCategoryData(resJson.data.categoryData);
            setTopProducts(resJson.data.topProducts);
          }
        }
      } catch (err) {
        console.error('Failed to load real reporting data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [session]);

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `Rp ${(val / 1000).toFixed(1)}K`;
    return `Rp ${val}`;
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reporting</h1>
          <p className="text-gray-500">View business analytics and reports</p>
        </div>
        
        <div className="flex gap-2">
          <select 
            className="border rounded-md px-3 py-2"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Net Profit (Est.)</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.netProfit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-full">
                <ShoppingCart className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Transactions</p>
                <p className="text-2xl font-bold">{stats.transactionsCount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-full">
                <Package className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Inventory Value (Est.)</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.inventoryValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                <YAxis tickFormatter={(value) => formatCurrency(value)} width={80} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), '']}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Bar dataKey="sales" fill="#4f46e5" name="Sales" />
                <Bar dataKey="profit" fill="#10b981" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Product</th>
                  <th className="text-left py-3 px-4">Quantity Sold</th>
                  <th className="text-left py-3 px-4">Revenue</th>
                  <th className="text-left py-3 px-4">Avg. Price</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{product.name}</td>
                    <td className="py-3 px-4">{product.sold}</td>
                    <td className="py-3 px-4">{formatCurrency(product.revenue)}</td>
                    <td className="py-3 px-4">{formatCurrency(product.revenue / (product.sold || 1))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <div className="flex gap-4 border-b">
        <Button
          variant={reportType === "sales" ? "default" : "ghost"}
          onClick={() => setReportType("sales")}
        >
          Sales Report
        </Button>
        <Button
          variant={reportType === "inventory" ? "default" : "ghost"}
          onClick={() => setReportType("inventory")}
        >
          Inventory Report
        </Button>
        <Button
          variant={reportType === "financial" ? "default" : "ghost"}
          onClick={() => setReportType("financial")}
        >
          Financial Report
        </Button>
      </div>

      {reportType === "sales" && (
        <Card>
          <CardHeader>
            <CardTitle>Sales Report</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Detailed sales report showing transactions, revenue, and trends.</p>
            <div className="mt-4 h-64 flex items-center justify-center bg-gray-50 rounded-md">
              <p>Sales report content would appear here</p>
            </div>
          </CardContent>
        </Card>
      )}

      {reportType === "inventory" && (
        <Card>
          <CardHeader>
            <CardTitle>Inventory Report</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Detailed inventory report showing stock levels, movement, and dead stock.</p>
            <div className="mt-4 h-64 flex items-center justify-center bg-gray-50 rounded-md">
              <p>Inventory report content would appear here</p>
            </div>
          </CardContent>
        </Card>
      )}

      {reportType === "financial" && (
        <Card>
          <CardHeader>
            <CardTitle>Financial Report</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Detailed financial report showing profit, expenses, and cash flow.</p>
            <div className="mt-4 h-64 flex items-center justify-center bg-gray-50 rounded-md">
              <p>Financial report content would appear here</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}