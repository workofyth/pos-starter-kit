"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  Package,
  TrendingDown,
  TrendingUp,
  AlertTriangle
} from "lucide-react";

interface InventoryItem {
  id: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  branch: string;
  lastUpdated: string;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([
    {
      id: "1",
      productName: "Product A",
      sku: "SKU-001",
      currentStock: 10,
      minStock: 5,
      maxStock: 50,
      branch: "Main Branch",
      lastUpdated: "2023-06-15"
    },
    {
      id: "2",
      productName: "Product B",
      sku: "SKU-002",
      currentStock: 3,
      minStock: 5,
      maxStock: 30,
      branch: "Main Branch",
      lastUpdated: "2023-06-14"
    },
    {
      id: "3",
      productName: "Product C",
      sku: "SKU-003",
      currentStock: 20,
      minStock: 10,
      maxStock: 100,
      branch: "Main Branch",
      lastUpdated: "2023-06-15"
    },
    {
      id: "4",
      productName: "Product D",
      sku: "SKU-004",
      currentStock: 0,
      minStock: 5,
      maxStock: 50,
      branch: "Sub Branch 1",
      lastUpdated: "2023-06-10"
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredInventory = inventory.filter(item => 
    item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.branch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (current: number, min: number) => {
    if (current <= 0) return { status: "out", variant: "destructive" };
    if (current <= min) return { status: "low", variant: "default" };
    if (current > min && current < min * 2) return { status: "moderate", variant: "secondary" };
    return { status: "good", variant: "outline" };
  };

  const handleStockAdjustment = (id: string, newStock: number) => {
    setInventory(
      inventory.map(item => 
        item.id === id ? { ...item, currentStock: newStock, lastUpdated: new Date().toISOString().split('T')[0] } : item
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-gray-500">Manage stock levels across branches</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adjust Stock
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Stock</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="text-sm font-medium">Product</label>
                <select className="w-full p-2 border rounded-md">
                  <option value="">Select a product</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.productName} - {item.sku}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Current Stock</label>
                  <Input type="number" placeholder="Current stock" />
                </div>
                <div>
                  <label className="text-sm font-medium">Adjustment</label>
                  <Input type="number" placeholder="Adjustment amount" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea 
                  className="w-full p-2 border rounded-md" 
                  placeholder="Enter adjustment notes"
                  rows={2}
                />
              </div>
            </div>
            <Button>Adjust Stock</Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold">{inventory.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-full">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold">{inventory.filter(item => item.currentStock <= item.minStock).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-red-100 p-3 rounded-full">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold">{inventory.filter(item => item.currentStock <= 0).length}</p>
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
                <p className="text-sm font-medium text-gray-600">Well Stocked</p>
                <p className="text-2xl font-bold">
                  {inventory.filter(item => item.currentStock > item.minStock).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by product, SKU, or branch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline">
              <Package className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Min Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => {
                const stockStatus = getStockStatus(item.currentStock, item.minStock);
                return (
                  <TableRow 
                    key={item.id} 
                    className={stockStatus.status === "out" ? "bg-red-50" : 
                              stockStatus.status === "low" ? "bg-yellow-50" : ""}
                  >
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>{item.branch}</TableCell>
                    <TableCell>
                      <span className={stockStatus.status === "out" ? "text-red-600 font-bold" : ""}>
                        {item.currentStock}
                      </span>
                    </TableCell>
                    <TableCell>{item.minStock}</TableCell>
                    <TableCell>
                      <Badge variant={stockStatus.variant}>
                        {stockStatus.status === "out" ? "Out of Stock" : 
                         stockStatus.status === "low" ? "Low Stock" : 
                         stockStatus.status === "moderate" ? "Moderate" : "Good"}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.lastUpdated}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleStockAdjustment(item.id, item.currentStock + 10)}
                        >
                          <TrendingUp className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}