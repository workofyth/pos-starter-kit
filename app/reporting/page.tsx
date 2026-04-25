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
  Users,
  Printer,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import * as XLSX from "xlsx";

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

  // Omset Detail state
  const [omzetData, setOmzetData] = useState<any[]>([]);
  const [totalOmzet, setTotalOmzet] = useState(0);
  const [totalQty, setTotalQty] = useState(0);
  const [totalPurchase, setTotalPurchase] = useState(0);
  const [omzetLoading, setOmzetLoading] = useState(false);

  // Inventory state
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [inventoryStats, setInventoryStats] = useState<any>(null);
  const [invLoading, setInvLoading] = useState(false);

  // Mutation state
  const [mutationData, setMutationData] = useState<any[]>([]);
  const [mutLoading, setMutLoading] = useState(false);

  const [currentBranchId, setCurrentBranchId] = useState("");



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
            setCurrentBranchId(userBranchResult.data[0].branchId);
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
            setSalesData(resJson.data.salesData || []);
            setCategoryData(resJson.data.categoryData || []);
            setTopProducts(resJson.data.topProducts || []);
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

  const fetchOmzetData = async () => {
    if (!session?.user) return;
    setOmzetLoading(true);
    try {
      const url = new URL('/api/reporting/omzet', window.location.origin);
      if (currentBranchId) url.searchParams.append('branchId', currentBranchId);
      url.searchParams.append('filter', dateRange);

      const response = await fetch(url.toString());
      if (response.ok) {
        const resJson = await response.json();
        if (resJson.success) {
          setOmzetData(resJson.data.omzetData);
          setTotalOmzet(resJson.data.totalOmzet);

          // Calculate additional totals
          const qty = resJson.data.omzetData.reduce((sum: number, item: any) => sum + item.qty, 0);
          const purchase = resJson.data.omzetData.reduce((sum: number, item: any) => sum + (item.qty * item.purchasePrice), 0);
          setTotalQty(qty);
          setTotalPurchase(purchase);
        }

      }
    } catch (err) {
      console.error('Failed to fetch omzet data', err);
    } finally {
      setOmzetLoading(false);
    }
  };

  const fetchInventoryData = async () => {
    if (!session?.user) return;
    setInvLoading(true);
    try {
      const url = new URL('/api/reporting/inventory', window.location.origin);
      if (currentBranchId) url.searchParams.append('branchId', currentBranchId);

      const response = await fetch(url.toString());
      if (response.ok) {
        const resJson = await response.json();
        if (resJson.success) {
          setInventoryData(resJson.data.inventoryData);
          setInventoryStats(resJson.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch inventory data', err);
    } finally {
      setInvLoading(false);
    }
  };

  const fetchMutationData = async () => {
    if (!session?.user) return;
    setMutLoading(true);
    try {
      const url = new URL('/api/reporting/mutation', window.location.origin);
      if (currentBranchId) url.searchParams.append('branchId', currentBranchId);
      url.searchParams.append('filter', dateRange);

      const response = await fetch(url.toString());
      if (response.ok) {
        const resJson = await response.json();
        if (resJson.success) {
          setMutationData(resJson.data.mutationData);
        }
      }
    } catch (err) {
      console.error('Failed to fetch mutation data', err);
    } finally {
      setMutLoading(false);
    }
  };

  useEffect(() => {
    if (reportType === "sales") {
      fetchOmzetData();
    } else if (reportType === "inventory") {
      fetchInventoryData();
    } else if (reportType === "mutation") {
      fetchMutationData();
    }
  }, [reportType, dateRange, currentBranchId]);

  const exportToExcel = () => {
    if (reportType === "sales") {
      const excelData = [
        ...omzetData.map(item => ({
          'Product Name': item.productName,
          'Brand Name': item.brandName,
          'Category': item.categoryName,
          'Qty (PCS)': item.qty,
          'Customer Price': item.customerPrice,
          'Purchase Price': item.purchasePrice,
          'Grand Total Sales': item.grandTotalSales
        })),
        {
          'Product Name': 'GRAND TOTAL',
          'Brand Name': '',
          'Category': '',
          'Qty (PCS)': totalQty,
          'Customer Price': '',
          'Purchase Price': totalPurchase,
          'Grand Total Sales': totalOmzet
        },
        {
          'Product Name': 'TOTAL GROSS PROFIT',
          'Brand Name': '',
          'Category': '',
          'Qty (PCS)': '',
          'Customer Price': '',
          'Purchase Price': '',
          'Grand Total Sales': totalOmzet - totalPurchase
        }
      ];
      const ws = XLSX.utils.json_to_sheet(excelData);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Omset Report");
      XLSX.writeFile(wb, `Omset_Report_${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (reportType === "inventory") {
      const excelData = [
        ...inventoryData.map(item => ({
          'Product Name': item.productName,
          'SKU': item.sku,
          'Category': item.categoryName,
          'Current Stock': item.quantity,
          'Min Stock': item.minStock,
          'Purchase Price': item.purchasePrice,
          'Total Value': (item.quantity * Number(item.purchasePrice || 0))
        })),
        {
          'Product Name': 'TOTAL INVENTORY',
          'SKU': '',
          'Category': '',
          'Current Stock': inventoryStats?.totalQuantity,
          'Min Stock': '',
          'Purchase Price': 'TOTAL VALUE',
          'Total Value': inventoryStats?.totalValue
        }
      ];
      const ws = XLSX.utils.json_to_sheet(excelData);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory Report");
      XLSX.writeFile(wb, `Inventory_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (reportType === "mutation") {
      const excelData = [
        ...mutationData.map(item => ({
          'Product Name': item.productName,
          'Qty (PCS)': item.quantity,
          'Store / Customer': item.partnerName,
          'Movement Type': item.type.toUpperCase(),
          'Ref. Number': item.referenceId,
          'Posting Date': new Date(item.createdAt).toLocaleString(),
          'Stock Before': item.stockBefore,
          'Stock After': item.stockAfter
        }))
      ];
      const ws = XLSX.utils.json_to_sheet(excelData);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Mutation Report");
      XLSX.writeFile(wb, `Mutation_Report_${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };


  const printReport = () => {
    window.print();
  };


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
        <div className="print:hidden">
          <h1 className="text-2xl font-bold">Reporting</h1>
          <p className="text-gray-500">View business analytics and reports</p>
        </div>


        <div className="flex gap-2 print:hidden">
          <select
            className="border rounded-md px-3 py-2 bg-white"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>

          <Button variant="outline" onClick={exportToExcel} disabled={
            (reportType === 'sales' && omzetData.length === 0) || 
            (reportType === 'inventory' && inventoryData.length === 0) ||
            (reportType === 'mutation' && mutationData.length === 0)
          }>
            <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
            Excel
          </Button>

          <Button variant="outline" onClick={printReport} disabled={reportType === 'sales' && omzetData.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Print / PDF
          </Button>
        </div>
      </div>

      <div className="hidden print:block mb-8">
        <h1 className="text-3xl font-bold">
          {reportType === 'sales' ? 'Omset Report' : 'Business Report'} ({dateRange.toUpperCase()})
        </h1>
        <p>Generated on: {new Date().toLocaleString()}</p>
      </div>

      {/* Stats Cards - Only on Overview or Dashboard */}




      {/* Report Tabs */}
      <div className="flex gap-4 border-b print:hidden">
        <Button
          variant={reportType === "sales" ? "default" : "secondary"}
          onClick={() => setReportType("sales")}
          className="rounded-none border-b-2 border-transparent data-[variant=default]:border-blue-600"
        >
          Omset Detail
        </Button>
        <Button
          variant={reportType === "overview" ? "default" : "secondary"}
          onClick={() => setReportType("overview")}
          className="rounded-none border-b-2 border-transparent data-[variant=default]:border-blue-600"
        >
          Analytics Overview
        </Button>
        <Button
          variant={reportType === "inventory" ? "default" : "secondary"}
          onClick={() => setReportType("inventory")}
          className="rounded-none border-b-2 border-transparent data-[variant=default]:border-blue-600"
        >
          Inventory Info
        </Button>
        <Button
          variant={reportType === "mutation" ? "default" : "secondary"}
          onClick={() => setReportType("mutation")}
          className="rounded-none border-b-2 border-transparent data-[variant=default]:border-blue-600"
        >
          Mutation Report
        </Button>
      </div>

      {reportType === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
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
      )}

      {reportType === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
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
      )}

      {reportType === "overview" && (
        <Card className="print:hidden">
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
      )}
      {(reportType === "sales" || typeof window !== 'undefined') && (
        <Card className={reportType === "sales" ? "block" : "hidden print:block"}>
          <CardHeader className="print:hidden">
            <div className="flex justify-between items-center">
              <CardTitle>Omset Detail Report ({dateRange})</CardTitle>
              <Badge variant="outline" className="text-lg">
                Total Omset: Rp {totalOmzet.toLocaleString()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {omzetLoading ? (
              <div className="py-10 text-center">Loading omzet details...</div>
            ) : omzetData.length === 0 ? (
              <div className="py-10 text-center text-gray-500">No sales data found for this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 dark:bg-gray-800">
                      <th className="text-left py-3 px-2 font-semibold">Product Name</th>
                      <th className="text-left py-3 px-2 font-semibold">Brand</th>
                      <th className="text-left py-3 px-2 font-semibold">Category</th>
                      <th className="text-right py-3 px-2 font-semibold">Qty (PCS)</th>
                      <th className="text-right py-3 px-2 font-semibold">Cust. Price</th>
                      <th className="text-right py-3 px-2 font-semibold">Purch. Price</th>
                      <th className="text-right py-3 px-2 font-semibold">Total Omset</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-b-2 border-gray-300 dark:border-gray-600">
                      <td colSpan={3} className="py-3 px-2 text-right">GRAND TOTAL</td>
                      <td className="text-right py-3 px-2 text-blue-600">{totalQty.toLocaleString()} PCS</td>
                      <td className="text-right py-3 px-2"></td>
                      <td className="text-right py-3 px-2 text-red-600">Rp {totalPurchase.toLocaleString()}</td>
                      <td className="text-right py-3 px-2 text-green-600">Rp {totalOmzet.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-blue-50 dark:bg-blue-900/20 font-bold border-b-2 border-blue-100">
                      <td colSpan={6} className="py-4 px-2 text-right text-lg">TOTAL GROSS PROFIT</td>
                      <td className="text-right py-4 px-2 text-lg text-blue-700 dark:text-blue-400">
                        Rp {(totalOmzet - totalPurchase).toLocaleString()}
                      </td>
                    </tr>
                    {omzetData.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                        <td className="py-3 px-2">{item.productName}</td>
                        <td className="py-3 px-2">{item.brandName}</td>
                        <td className="py-3 px-2">{item.categoryName}</td>
                        <td className="text-right py-3 px-2">{item.qty}</td>
                        <td className="text-right py-3 px-2">Rp {item.customerPrice.toLocaleString()}</td>
                        <td className="text-right py-3 px-2">Rp {item.purchasePrice.toLocaleString()}</td>
                        <td className="text-right py-3 px-2 font-medium">Rp {item.grandTotalSales.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>


                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {reportType === "inventory" && (
        <div className="space-y-6">
          {/* Inventory Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-600">Total Unique Items</p>
                <p className="text-2xl font-bold">{inventoryStats?.totalItems || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-600">Total Stock (PCS)</p>
                <p className="text-2xl font-bold">{inventoryStats?.totalQuantity?.toLocaleString() || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-red-600">{inventoryStats?.lowStockCount || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-600">Total Inventory Value</p>
                <p className="text-2xl font-bold text-blue-600">Rp {inventoryStats?.totalValue?.toLocaleString() || 0}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Inventory Status Detail</CardTitle>
            </CardHeader>
            <CardContent>
              {invLoading ? (
                <div className="py-10 text-center">Loading inventory details...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50 dark:bg-gray-800">
                        <th className="text-left py-3 px-2 font-semibold">SKU</th>
                        <th className="text-left py-3 px-2 font-semibold">Product Name</th>
                        <th className="text-left py-3 px-2 font-semibold">Category</th>
                        <th className="text-right py-3 px-2 font-semibold">Current Stock</th>
                        <th className="text-right py-3 px-2 font-semibold">Min. Stock</th>
                        <th className="text-right py-3 px-2 font-semibold">Status</th>
                        <th className="text-right py-3 px-2 font-semibold">Unit Cost</th>
                        <th className="text-right py-3 px-2 font-semibold">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-blue-50 dark:bg-blue-900/20 font-bold border-b-2 border-blue-100">
                        <td colSpan={3} className="py-3 px-2 text-right">TOTAL INVENTORY</td>
                        <td className="text-right py-3 px-2 text-blue-700 dark:text-blue-400">{inventoryStats?.totalQuantity?.toLocaleString()} PCS</td>
                        <td colSpan={3} className="py-3 px-2 text-right">TOTAL VALUE</td>
                        <td className="text-right py-3 px-2 text-blue-700 dark:text-blue-400">Rp {inventoryStats?.totalValue?.toLocaleString()}</td>
                      </tr>
                      {inventoryData.map((item, idx) => {
                        const isLow = (item.quantity || 0) <= (item.minStock || 0);
                        const val = (item.quantity || 0) * Number(item.purchasePrice || 0);
                        return (
                          <tr key={idx} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                            <td className="py-3 px-2 font-mono text-xs">{item.sku}</td>
                            <td className="py-3 px-2">{item.productName}</td>
                            <td className="py-3 px-2">{item.categoryName}</td>
                            <td className="text-right py-3 px-2 font-medium">{item.quantity}</td>
                            <td className="text-right py-3 px-2">{item.minStock}</td>
                            <td className="text-right py-3 px-2">
                              {isLow ? (
                                <Badge variant="destructive">LOW STOCK</Badge>
                              ) : (
                                <Badge variant="outline" className="text-green-600 border-green-600">OK</Badge>
                              )}
                            </td>
                            <td className="text-right py-3 px-2">Rp {Number(item.purchasePrice).toLocaleString()}</td>
                            <td className="text-right py-3 px-2 font-semibold">Rp {val.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>

                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}


      {(reportType === "mutation" || typeof window !== 'undefined') && (
        <Card className={reportType === "mutation" ? "block" : "hidden print:block"}>
          <CardHeader className="print:hidden">
            <CardTitle>Mutation Report ({dateRange})</CardTitle>
          </CardHeader>
          <CardContent>
            {mutLoading ? (
              <div className="py-10 text-center">Loading mutation details...</div>
            ) : mutationData.length === 0 ? (
              <div className="py-10 text-center text-gray-500">No mutation data found for this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 dark:bg-gray-800">
                      <th className="text-left py-3 px-2 font-semibold">Product Name</th>
                      <th className="text-right py-3 px-2 font-semibold">Qty (PCS)</th>
                      <th className="text-left py-3 px-2 font-semibold">Store / Customer</th>
                      <th className="text-left py-3 px-2 font-semibold">Movement Type</th>
                      <th className="text-left py-3 px-2 font-semibold">Ref. Number</th>
                      <th className="text-left py-3 px-2 font-semibold">Posting Date</th>
                      <th className="text-right py-3 px-2 font-semibold">Stock Before</th>
                      <th className="text-right py-3 px-2 font-semibold">Stock After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mutationData.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                        <td className="py-3 px-2 font-medium">{item.productName}</td>
                        <td className="text-right py-3 px-2">
                          <Badge variant={item.type === 'in' || item.type === 'receive' ? 'outline' : 'secondary'} className={item.type === 'in' || item.type === 'receive' ? 'text-green-600' : ''}>
                            {item.type === 'in' || item.type === 'receive' ? '+' : '-'}{Math.abs(item.quantity)}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">{item.partnerName}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className="capitalize">{item.type}</Badge>
                        </td>
                        <td className="py-3 px-2 font-mono text-xs">{item.referenceId}</td>
                        <td className="py-3 px-2 text-gray-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-2">{item.stockBefore}</td>
                        <td className="text-right py-3 px-2 font-semibold">{item.stockAfter}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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