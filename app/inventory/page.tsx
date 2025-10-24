"use client";

import { useState, useEffect } from "react";
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
import { useSession } from "@/lib/auth-client"; // Import useSession hook

interface InventoryItem {
  id: string;
  productId: string;
  branchId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  branch: string;
  lastUpdated: string;
}

export default function InventoryPage() {
  const { data: session } = useSession(); // Add session hook
  const [userBranchId, setUserBranchId] = useState<string | null>(null); // Store user's branch ID
  
  // State for inventory data and UI
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);
  
  // State for search and filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [searchSKU, setSearchSKU] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  
  // State for pagination
  const [inventoryPage, setInventoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // State for summary data
  const [summary, setSummary] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    overstockCount: 0
  });
  
  // State for dialogs and editing
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [splittingItem, setSplittingItem] = useState<any | null>(null);
  
  // State for data lists
  const [branchList, setBranchList] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null); // Added state for user role
  const [isMainAdmin, setIsMainAdmin] = useState<boolean>(false); // Added state for main admin status
  
  // Get user's branch ID, role, and main admin status
  useEffect(() => {
    const fetchUserBranch = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(`/api/user-branches?userId=${session.user.id}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data.length > 0) {
              setUserBranchId(result.data[0].branchId);
              setUserRole(result.data[0].role); // Store user's role
              setIsMainAdmin(result.data[0].isMainAdmin || false); // Store main admin status
            }
          }
        } catch (error) {
          console.error('Error fetching user branch:', error);
        }
      }
    };
    
    fetchUserBranch();
  }, [session]);

  // Generate unique barcode
  const generateUniqueBarcode = () => {
    return Math.floor(Math.random() * 10000000000000).toString().padStart(13, '0');
  };

  // Get stock status for badge display
  const getStockStatus = (current: number, min: number) => {
    if (current <= 0) return { status: "out", variant: "destructive" };
    if (current <= min) return { status: "low", variant: "default" };
    if (current > min && current < min * 2) return { status: "moderate", variant: "secondary" };
    return { status: "good", variant: "outline" };
  };



  // Load data on component mount and when dependencies change
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Determine branch filter - main admins can access all branches, other users only their assigned branch
        const branchFilter = (!isMainAdmin && userBranchId) ? userBranchId : selectedBranch || '';
        
        // Load inventory items with branch filtering for staff users
        // Main admins can access all branches, other users only their assigned branch
        const effectiveBranchId = (!isMainAdmin && userBranchId) ? userBranchId : selectedBranch || '';
        const inventoryResponse = await fetch(`/api/inventory?page=${inventoryPage}&limit=10&search=${searchTerm}&sku=${searchSKU}&category=${searchCategory}&branchId=${effectiveBranchId}&lowStock=${showLowStock}&outOfStock=${showOutOfStock}`);
        if (inventoryResponse.ok) {
          const inventoryResult = await inventoryResponse.json();
          if (inventoryResult.success) {
            // Transform API response to match the InventoryItem interface
            const formattedInventory = inventoryResult.data.map((item: any) => ({
              id: item.id,
              productId: item.productId,
              branchId: item.branchId,
              productName: item.productName,
              sku: item.productSku || '',  // Map productSku to sku
              currentStock: item.quantity || 0,  // Map quantity to currentStock
              minStock: item.minStock || 5,
              maxStock: item.maxStock || 100,
              branch: item.branchName || 'Main Branch',
              lastUpdated: item.lastUpdated || new Date().toISOString(),
              productBarcode: item.productBarcode,
              productDescription: item.productDescription,
              productImage: item.productImage,
              productImageUrl: item.productImageUrl,
              productCategoryId: item.productCategoryId,
              productCategoryName: item.productCategoryName,
              productCategoryCode: item.productCategoryCode,
              branchAddress: item.branchAddress,
              branchPhone: item.branchPhone,
              branchEmail: item.branchEmail
            }));
            // Deduplicate inventory items by ID to prevent duplicate keys
            const uniqueInventory = formattedInventory.filter((item, index, self) =>
              index === self.findIndex(i => i.id === item.id)
            );
            setInventory(uniqueInventory);
            setTotalPages(inventoryResult.pagination.totalPages || 1);
          }
        }
        
        // Load branches for filter dropdown  
        // For admin/manager: show all branches
        // For staff: show all branches (needed for inventory splitting between different branches)
        const branchesResponse = await fetch('/api/branches');
        if (branchesResponse.ok) {
          const branchesResult = await branchesResponse.json();
          if (branchesResult.success) {
            // Deduplicate branches by ID to prevent duplicate keys
            const uniqueBranches = branchesResult.data.filter((branch, index, self) =>
              index === self.findIndex(b => b.id === branch.id)
            );
            
            setBranchList(uniqueBranches);
          }
        }
        
        // Load inventory summary with branch filtering
        // Main admins can access all branches, other users only their assigned branch
        const summaryBranchId = (!isMainAdmin && userBranchId) ? userBranchId : selectedBranch || '';
        const summaryResponse = await fetch(`/api/inventory/summary?branchId=${summaryBranchId}&sku=${searchSKU}&category=${searchCategory}`);
        if (summaryResponse.ok) {
          const summaryResult = await summaryResponse.json();
          if (summaryResult.success) {
            setSummary(summaryResult.data.summary);
          }
        }
        
        // Load products for selection in dialogs with branch filtering
        const productsResponse = await fetch('/api/products');
        if (productsResponse.ok) {
          const productsResult = await productsResponse.json();
          if (productsResult.success) {
            // Deduplicate products by ID to prevent duplicate keys
            const uniqueProducts = productsResult.data.filter((product, index, self) =>
              index === self.findIndex(p => p.id === product.id)
            );
            setProducts(uniqueProducts);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [inventoryPage, searchTerm, searchSKU, searchCategory, selectedBranch, showLowStock, showOutOfStock, userBranchId]);

  // Handle stock adjustment (increase/decrease)
  const handleStockAdjustment = async (id: string, adjustment: number) => {
    try {
      const item = inventory.find(i => i.id === id);
      if (!item) return;
      
      const newStock = item.currentStock + adjustment;
      if (newStock < 0) {
        alert('Cannot reduce stock below zero');
        return;
      }
      
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: newStock,
          notes: `Stock adjustment: ${adjustment > 0 ? '+' : ''}${adjustment}`
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Update local state
        setInventory(inventory.map(i => 
          i.id === id ? { ...i, currentStock: newStock, lastUpdated: new Date().toISOString() } : i
        ));
        alert('Stock adjusted successfully!');
      } else {
        alert('Error adjusting stock: ' + result.message);
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('Error adjusting stock: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  // Handle adding new inventory item
  const handleAddInventory = async () => {
    try {
      // Get form values using more specific selectors
      const productSelect = document.querySelector('select[name="productId"]') as HTMLSelectElement;
      const currentStockInput = document.querySelector('input[name="currentStock"]') as HTMLInputElement;
      const adjustmentInput = document.querySelector('input[name="adjustment"]') as HTMLInputElement;
      const notesTextarea = document.querySelector('textarea[name="notes"]') as HTMLTextAreaElement;
      
      const productId = productSelect?.value;
      const currentStock = parseInt(currentStockInput?.value || '0');
      const adjustment = parseInt(adjustmentInput?.value || '0');
      const notes = notesTextarea?.value || '';

      if (!productId) {
        alert('Please select a product');
        return;
      }
      
      // Get the selected product details
      const selectedProduct = products.find(p => p.id === productId);
      if (!selectedProduct) {
        alert('Selected product not found');
        return;
      }
      
      // Calculate new stock level
      const newStock = currentStock + adjustment;
      if (newStock < 0) {
        alert('Cannot reduce stock below zero');
        return;
      }
      
      // Create new inventory entry
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          branchId: (!isMainAdmin && userBranchId) ? userBranchId : selectedBranch || 'brn_XNUWRgFLof', // Use user's branch ID if they're not main admin, then selected branch, then fallback
          quantity: newStock,
          minStock: 5, // Default minimum stock
          maxStock: 100, // Default maximum stock
          notes: notes || 'Initial stock adjustment'
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Add to local state
        const newItem: InventoryItem = {
          id: result.data.id,
          productId: result.data.productId,
          branchId: result.data.branchId,
          productName: selectedProduct.name,
          sku: selectedProduct.sku,
          currentStock: newStock,
          minStock: result.data.minStock,
          maxStock: result.data.maxStock,
          branch: result.data.branchName || 'Main Branch',
          lastUpdated: new Date().toISOString()
        };
        
        setInventory([newItem, ...inventory]);
        setIsAddDialogOpen(false);
      alert('Inventory item added successfully!');
      } else {
        alert('Error adding inventory item: ' + result.message);
      }
    } catch (error) {
      console.error('Error adding inventory item:', error);
      alert('Error adding inventory item: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  // Handle editing inventory item
  const handleEditInventory = async () => {
    if (!editingItem) return;
    
    try {
      // Get notes from textarea
      const notesTextarea = document.querySelector('textarea[name="editNotes"]') as HTMLTextAreaElement;
      const notes = notesTextarea?.value || 'Manual inventory update';
      
      const response = await fetch(`/api/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: editingItem.currentStock,
          minStock: editingItem.minStock,
          maxStock: editingItem.maxStock,
          notes: notes
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Update local state
        setInventory(inventory.map(i => 
          i.id === editingItem.id ? { ...editingItem } : i
        ));
        setIsEditDialogOpen(false);
        setEditingItem(null);
        alert('Inventory updated successfully!');
      } else {
        alert('Error updating inventory: ' + result.message);
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      alert('Error updating inventory: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  // Handle deleting inventory item
  const handleDeleteInventory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Remove from local state
        setInventory(inventory.filter(i => i.id !== id));
        alert('Inventory item deleted successfully!');
      } else {
        alert('Error deleting inventory item: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      alert('Error deleting inventory item: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  // Handle canceling stock adjustment
  const handleCancelStockAdjustment = () => {
    setEditingStockId(null);
    setNewStockValue(0);
  };

  // Handle saving stock adjustment
  const handleSaveStock = async (id: string, newStock: number) => {
    try {
      const item = inventory.find(i => i.id === id);
      if (!item) {
        alert('Inventory item not found');
        return;
      }

      // Calculate the difference
      const quantityDifference = newStock - item.currentStock;
      const type = quantityDifference > 0 ? 'in' : quantityDifference < 0 ? 'out' : 'adjustment';

      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: item.productId,
          branchId: item.branchId,
          quantity: Math.abs(quantityDifference),
          type,
          notes: `Inline stock adjustment from ${item.currentStock} to ${newStock}`
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update local state
        setInventory(inventory.map(i => 
          i.id === id ? { ...i, currentStock: newStock, lastUpdated: new Date().toISOString() } : i
        ));
        
        // Exit edit mode
        setEditingStockId(null);
        setNewStockValue(0);
        
        alert('Stock adjusted successfully!');
      } else {
        alert('Error adjusting stock: ' + result.message);
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('Error adjusting stock: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  // Handle splitting inventory between branches
  const handleSplitInventory = async () => {
    if (!splittingItem || !session?.user?.id) return;
    
    try {
      // Get form values
      const targetBranchSelect = document.querySelector('select[name="targetBranch"]') as HTMLSelectElement;
      const quantityInput = document.querySelector('input[name="splitQuantity"]') as HTMLInputElement;
      const notesTextarea = document.querySelector('textarea[name="splitNotes"]') as HTMLTextAreaElement;
      
      const targetBranchId = targetBranchSelect?.value;
      const quantity = parseInt(quantityInput?.value || '0');
      const notes = notesTextarea?.value || '';
      
      if (!targetBranchId) {
        alert('Please select a target branch');
        return;
      }
      
      if (quantity <= 0 || quantity > splittingItem.currentStock) {
        alert(`Please enter a valid quantity (1-${splittingItem.currentStock})`);
        return;
      }
      
      const response = await fetch('/api/inventory/split', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: splittingItem.productId,
          sourceBranchId: splittingItem.branchId,
          targetBranchId,
          quantity,
          notes,
          userId: session.user.id // Pass the userId to track who initiated the request
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Refresh the inventory data
        setInventoryPage(1); // Reset to first page to refresh
        setIsSplitDialogOpen(false);
        setSplittingItem(null);
        alert('Inventory split request submitted successfully!');
      } else {
        alert('Error submitting split request: ' + result.message);
      }
    } catch (error) {
      console.error('Error splitting inventory:', error);
      alert('Error submitting split request: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading inventory data...</p>
      </div>
    );
  }

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
                <select className="w-full p-2 border rounded-md" name="productId">
                  <option value="">Select a product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {product.sku}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Current Stock</label>
                  <Input type="number" placeholder="Current stock" name="currentStock" />
                </div>
                <div>
                  <label className="text-sm font-medium">Adjustment</label>
                  <Input type="number" placeholder="Adjustment amount" name="adjustment" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea 
                  className="w-full p-2 border rounded-md" 
                  placeholder="Enter adjustment notes"
                  name="notes"
                  rows={2}
                />
              </div>
            </div>
            <Button onClick={handleAddInventory}>Adjust Stock</Button>
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
                <p className="text-2xl font-bold">{summary.totalProducts}</p>
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
                <p className="text-2xl font-bold">{summary.lowStockCount}</p>
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
                <p className="text-2xl font-bold">{summary.outOfStockCount}</p>
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
                <p className="text-sm font-medium text-gray-600">Overstocked</p>
                <p className="text-2xl font-bold">{summary.overstockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by product name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input
                placeholder="Filter by SKU..."
                value={searchSKU}
                onChange={(e) => setSearchSKU(e.target.value)}
              />
              <Input
                placeholder="Filter by category..."
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
              />
              <select
                className="p-2 border rounded-md"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                <option value="">All Branches</option>
                {branchList.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowLowStock(!showLowStock)}
                className={showLowStock ? "bg-yellow-100 border-yellow-300" : ""}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Low Stock
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowOutOfStock(!showOutOfStock)}
                className={showOutOfStock ? "bg-red-100 border-red-300" : ""}
              >
                <TrendingDown className="h-4 w-4 mr-2" />
                Out of Stock
              </Button>
            </div>
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
              {inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="h-12 w-12 text-gray-300 mb-2" />
                      <p className="text-gray-500">No inventory items found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {searchTerm || selectedBranch ? 'Try adjusting your search or filter criteria' : 'Add products to get started'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => {
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
                        {editingStockId === item.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={newStockValue}
                              onChange={(e) => setNewStockValue(parseInt(e.target.value) || 0)}
                              className="w-20"
                              min="0"
                            />
                            <Button 
                              size="sm" 
                              onClick={() => handleSaveStock(item.id, newStockValue)}
                            >
                              Save
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={handleCancelStockAdjustment}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <span className={stockStatus.status === "out" ? "text-red-600 font-bold" : ""}>
                            {item.currentStock}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{item.minStock}</TableCell>
                      <TableCell>
                        <Badge variant={stockStatus.variant as "default" | "outline" | "destructive" | "secondary"}>
                          {stockStatus.status === "out"
                            ? "Out of Stock"
                            : stockStatus.status === "low"
                            ? "Low Stock"
                            : stockStatus.status === "moderate"
                            ? "Moderate"
                            : "Good"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(item.lastUpdated).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingItem(item);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSplittingItem(item);
                              setIsSplitDialogOpen(true);
                            }}
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteInventory(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              Showing page {inventoryPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setInventoryPage(prev => Math.max(prev - 1, 1))}
                disabled={inventoryPage === 1}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setInventoryPage(prev => Math.min(prev + 1, totalPages))}
                disabled={inventoryPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Inventory Dialog */}
      {isEditDialogOpen && editingItem && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Inventory Item</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="text-sm font-medium">Product</label>
                <Input 
                  value={`${editingItem.productName} (${editingItem.sku})`} 
                  readOnly 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Branch</label>
                <Input 
                  value={editingItem.branch} 
                  readOnly 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Current Stock</label>
                  <Input 
                    type="number" 
                    value={editingItem.currentStock}
                    onChange={(e) => setEditingItem({...editingItem, currentStock: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Min Stock</label>
                  <Input 
                    type="number" 
                    value={editingItem.minStock}
                    onChange={(e) => setEditingItem({...editingItem, minStock: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Max Stock</label>
                  <Input 
                    type="number" 
                    value={editingItem.maxStock}
                    onChange={(e) => setEditingItem({...editingItem, maxStock: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Last Updated</label>
                  <Input 
                    value={new Date(editingItem.lastUpdated).toLocaleDateString()}
                    readOnly
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea 
                  name="editNotes"
                  className="w-full p-2 border rounded-md" 
                  placeholder="Enter adjustment notes"
                  rows={3}
                  defaultValue={editingItem.notes || ''}
                />
              </div>
            </div>
            <Button onClick={handleEditInventory}>Update Inventory</Button>
          </DialogContent>
        </Dialog>
      )}

      {/* Split Inventory Dialog */}
      {isSplitDialogOpen && splittingItem && (
        <Dialog open={isSplitDialogOpen} onOpenChange={setIsSplitDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Split Inventory</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="text-sm font-medium">Product</label>
                <Input 
                  value={`${splittingItem.productName} (${splittingItem.sku})`} 
                  readOnly 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Source Branch</label>
                <Input 
                  value={splittingItem.branch} 
                  readOnly 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Current Stock</label>
                <Input 
                  value={splittingItem.currentStock} 
                  readOnly 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Target Branch</label>
                <select 
                  name="targetBranch"
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select target branch</option>
                  {branchList.filter(b => b.id !== splittingItem.branchId).map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Quantity to Transfer</label>
                <Input 
                  name="splitQuantity"
                  type="number" 
                  placeholder="Enter quantity to transfer"
                  min="1"
                  max={splittingItem.currentStock}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea 
                  name="splitNotes"
                  className="w-full p-2 border rounded-md" 
                  placeholder="Enter transfer notes"
                  rows={3}
                />
              </div>
            </div>
            <Button onClick={handleSplitInventory}>Split Inventory</Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}