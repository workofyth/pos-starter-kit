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

// Mock data for reports
const salesData = [
  { name: "Jan", sales: 4000000, profit: 800000 },
  { name: "Feb", sales: 3000000, profit: 600000 },
  { name: "Mar", sales: 2000000, profit: 400000 },
  { name: "Apr", sales: 2780000, profit: 556000 },
  { name: "May", sales: 1890000, profit: 378000 },
  { name: "Jun", sales: 2390000, profit: 478000 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const categoryData = [
  { name: 'Electronics', value: 4000000 },
  { name: 'Clothing', value: 3000000 },
  { name: 'Food', value: 2000000 },
  { name: 'Books', value: 1000000 },
];

const topProducts = [
  { name: "Product A", sold: 120, revenue: 6000000 },
  { name: "Product B", sold: 95, revenue: 7125000 },
  { name: "Product C", sold: 80, revenue: 2000000 },
  { name: "Product D", sold: 72, revenue: 1800000 },
];

export default function ReportingPage() {
  const [dateRange, setDateRange] = useState("monthly");
  const [reportType, setReportType] = useState("sales");

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
                <p className="text-2xl font-bold">Rp 21.5M</p>
                <p className="text-xs text-green-500">+12.5% from last month</p>
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
                <p className="text-sm font-medium text-gray-600">Net Profit</p>
                <p className="text-2xl font-bold">Rp 4.3M</p>
                <p className="text-xs text-green-500">+8.3% from last month</p>
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
                <p className="text-2xl font-bold">1,248</p>
                <p className="text-xs text-green-500">+5.2% from last month</p>
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
                <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                <p className="text-2xl font-bold">Rp 15.7M</p>
                <p className="text-xs text-gray-500">+2.1% from last month</p>
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
                <YAxis tickFormatter={(value) => `Rp ${(value / 1000000).toFixed(0)}M`} />
                <Tooltip 
                  formatter={(value) => [`Rp ${(Number(value) / 1000000).toFixed(2)}M`, '']}
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
                <Tooltip formatter={(value) => `Rp ${(Number(value) / 1000000).toFixed(2)}M`} />
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
                    <td className="py-3 px-4">Rp {(product.revenue / 1000).toFixed(0)}K</td>
                    <td className="py-3 px-4">Rp {((product.revenue / product.sold) / 1000).toFixed(0)}K</td>
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