"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { useRealTimeUpdates } from "@/hooks/use-real-time-updates";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RefreshButton } from "@/components/refresh-button";
import { 
  Package,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useSession } from "@/lib/auth-client"; // Import useSession hook
import { StockMovementIndicator } from "@/components/stock-movement-indicator";

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
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [splittingItem, setSplittingItem] = useState<any | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustmentData, setAdjustmentData] = useState({
    quantity: 0,
    type: 'adjustment' as 'in' | 'out' | 'adjustment',
    notes: ''
  });
  
  // State for data lists
  const [branchList, setBranchList] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null); // Added state for user role
  const [isMainAdmin, setIsMainAdmin] = useState<boolean>(false); // Added state for main admin status
  
  // State for stock movement tracking
  const [stockMovements, setStockMovements] = useState<Record<string, {initialValue: number, currentValue: number}>>({});
  
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
        
        // Load inventory items with proper branch filtering
        // Only include branchId parameter when it's actually needed (not empty)
        let inventoryUrl = `/api/inventory?page=${inventoryPage}&limit=10&search=${searchTerm}&sku=${searchSKU}&category=${searchCategory}`;
        if (branchFilter) {
          inventoryUrl += `&branchId=${branchFilter}`;
        }
        if (showLowStock) {
          inventoryUrl += `&lowStock=true`;
        }
        if (showOutOfStock) {
          inventoryUrl += `&outOfStock=true`;
        }
        
        const inventoryResponse = await fetch(inventoryUrl);
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
            const uniqueInventory = formattedInventory.filter((item : any, index : any, self : any) =>
              index === self.findIndex((i: { id: any; }) => i.id === item.id)
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
            const uniqueBranches = branchesResult.data.filter((branch : any, index : any, self : any) =>
              index === self.findIndex((b: { id: any; }) => b.id === branch.id)
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
            const uniqueProducts = productsResult.data.filter((product : any, index : any, self : any) =>
              index === self.findIndex((p: { id: any; }) => p.id === product.id)
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
  }, [inventoryPage, searchTerm, searchSKU, searchCategory, selectedBranch, showLowStock, showOutOfStock, userBranchId, isMainAdmin]);

  // Define the real-time update handler before using it in the hook
  const handleRealTimeUpdate = useCallback((data: any) => {
    if (data.type === 'inventory_updated' || data.type === 'stock_split_completed' || data.type === 'stock_adjustment') {
      // Reload inventory to reflect the latest changes
      const loadDataInternal = async () => {
        setLoading(true);
        try {
          // Determine branch filter - main admins can access all branches, other users only their assigned branch
          const branchFilter = (!isMainAdmin && userBranchId) ? userBranchId : selectedBranch || '';
          
          // Load inventory items with proper branch filtering
          // Only include branchId parameter when it's actually needed (not empty)
          let inventoryUrl = `/api/inventory?page=${inventoryPage}&limit=10&search=${searchTerm}&sku=${searchSKU}&category=${searchCategory}`;
          if (branchFilter) {
            inventoryUrl += `&branchId=${branchFilter}`;
          }
          if (showLowStock) {
            inventoryUrl += `&lowStock=true`;
          }
          if (showOutOfStock) {
            inventoryUrl += `&outOfStock=true`;
          }
          
          const inventoryResponse = await fetch(inventoryUrl);
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
              const uniqueInventory = formattedInventory.filter((item : any, index : any, self : any) =>
                index === self.findIndex((i: { id: any; }) => i.id === item.id)
              );
              setInventory(uniqueInventory);
              setTotalPages(inventoryResult.pagination.totalPages || 1);
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
        } catch (error) {
          console.error('Error reloading inventory data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadDataInternal();
    }
  }, [inventoryPage, searchTerm, searchSKU, searchCategory, selectedBranch, showLowStock, showOutOfStock, userBranchId, isMainAdmin]);

  // Subscribe to real-time updates using HTTP polling
  useRealTimeUpdates('inventory', handleRealTimeUpdate);

  // Handle stock adjustment (increase/decrease)
  const handleStockAdjustment = async (id: string, adjustment: number) => {
    try {
      const item = inventory.find(i => i.id === id);
      if (!item) return;
      
      const newStock = item.currentStock + adjustment;
      if (newStock < 0) {
        alert('Stock cannot be negative');
        return;
      }
      
      const response = await fetch(`/api/inventory/${id}/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: adjustment,
          reason: adjustment > 0 ? 'Restock' : 'Adjustment'
        }),
      });
      
      if (response.ok) {
        // Update local state
        setInventory(prev => 
          prev.map(i => 
            i.id === id ? { ...i, currentStock: i.currentStock + adjustment } : i
          )
        );
        // Recalculate summary
        setSummary(prev => ({
          ...prev,
          lowStockCount: prev.lowStockCount + (newStock < item.minStock ? 1 : 0),
          outOfStockCount: prev.outOfStockCount + (newStock === 0 ? 1 : 0)
        }));
      } else {
        alert('Failed to adjust stock');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('Error adjusting stock');
    }
  };

  // Handle adding new inventory item
  const handleAddInventory = async (product: any, branchId: string, quantity: number) => {
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          branchId: branchId,
          quantity: quantity,
          minStock: product.minStock || 5,
          maxStock: product.maxStock || 100
        }),
      });
      
      if (response.ok) {
        // Refresh the inventory data
        const loadData = async () => {
          setLoading(true);
          try {
            // Determine branch filter - main admins can access all branches, other users only their assigned branch
            const branchFilter = (!isMainAdmin && userBranchId) ? userBranchId : selectedBranch || '';
            
            // Load inventory items with proper branch filtering
            // Only include branchId parameter when it's actually needed (not empty)
            let inventoryUrl = `/api/inventory?page=${inventoryPage}&limit=10&search=${searchTerm}&sku=${searchSKU}&category=${searchCategory}`;
            if (branchFilter) {
              inventoryUrl += `&branchId=${branchFilter}`;
            }
            if (showLowStock) {
              inventoryUrl += `&lowStock=true`;
            }
            if (showOutOfStock) {
              inventoryUrl += `&outOfStock=true`;
            }
            
            const inventoryResponse = await fetch(inventoryUrl);
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
                const uniqueInventory = formattedInventory.filter((item : any, index : any, self : any) =>
                  index === self.findIndex((i: { id: any; }) => i.id === item.id)
                );
                setInventory(uniqueInventory);
                setTotalPages(inventoryResult.pagination.totalPages || 1);
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
          } catch (error) {
            console.error('Error reloading inventory data:', error);
          } finally {
            setLoading(false);
          }
        };
        
        loadData();
        setIsAddDialogOpen(false);
      } else {
        // Check if response is JSON or HTML
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Unknown error';
        
        if (contentType && contentType.includes('application/json')) {
          const errorResult = await response.json();
          errorMessage = errorResult.message || 'Failed to add inventory';
        } else {
          // If not JSON, it might be an HTML error page
          const errorText = await response.text();
          console.error('Non-JSON response:', errorText);
          errorMessage = 'Server error occurred';
        }
        
        alert(`Failed to add inventory: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error adding inventory:', error);
      alert('Error adding inventory');
    }
  };

  // Handle editing inventory
  const handleEditInventory = async (id: string, newQuantity: number) => {
    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: newQuantity
        }),
      });
      
      if (response.ok) {
        setInventory(prev => 
          prev.map(item => 
            item.id === id ? { ...item, currentStock: newQuantity } : item
          )
        );
        setEditingStockId(null);
        setNewStockValue(0);
      } else {
        alert('Failed to update inventory');
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      alert('Error updating inventory');
    }
  };

  // Handle split stock
  const handleSplitStock = async (id: string, targetBranchId: string, quantity: number) => {
    try {
      const response = await fetch(`/api/inventory/${id}/split`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceBranchId: selectedBranch || userBranchId || '',
          targetBranchId,
          quantity,
          userId: session?.user?.id || '' // Include user ID for role-based validation
        }),
      });
      
      if (response.ok) {
        // Refresh the inventory data
        const loadData = async () => {
          setLoading(true);
          try {
            // Determine branch filter - main admins can access all branches, other users only their assigned branch
            const branchFilter = (!isMainAdmin && userBranchId) ? userBranchId : selectedBranch || '';
            
            // Load inventory items with proper branch filtering
            // Only include branchId parameter when it's actually needed (not empty)
            let inventoryUrl = `/api/inventory?page=${inventoryPage}&limit=10&search=${searchTerm}&sku=${searchSKU}&category=${searchCategory}`;
            if (branchFilter) {
              inventoryUrl += `&branchId=${branchFilter}`;
            }
            if (showLowStock) {
              inventoryUrl += `&lowStock=true`;
            }
            if (showOutOfStock) {
              inventoryUrl += `&outOfStock=true`;
            }
            
            const inventoryResponse = await fetch(inventoryUrl);
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
                const uniqueInventory = formattedInventory.filter((item : any, index : any, self : any) =>
                  index === self.findIndex((i: { id: any; }) => i.id === item.id)
                );
                setInventory(uniqueInventory);
                setTotalPages(inventoryResult.pagination.totalPages || 1);
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
          } catch (error) {
            console.error('Error reloading inventory data:', error);
          } finally {
            setLoading(false);
          }
        };
        
        loadData();
        setIsSplitDialogOpen(false);
        setSplittingItem(null);
      } else {
        // Check if response is JSON or HTML
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Unknown error';
        
        if (contentType && contentType.includes('application/json')) {
          const errorResult = await response.json();
          errorMessage = errorResult.message || 'Failed to split stock';
        } else {
          // If not JSON, it might be an HTML error page
          const errorText = await response.text();
          console.error('Non-JSON response:', errorText);
          errorMessage = 'Server error occurred';
        }
        
        alert(`Failed to split stock: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error splitting stock:', error);
      alert('Error splitting stock: ' + (error as Error).message);
    }
  };

  // Handle stock adjustment
  const handleAdjustStock = async () => {
    if (!adjustingItem) return;
    
    try {
      // Prepare the stock adjustment data
      const adjustmentDataToSend = {
        productId: adjustingItem.productId,
        branchId: adjustingItem.branchId,
        quantity: adjustmentData.quantity,
        type: adjustmentData.type,
        notes: adjustmentData.notes || 'Stock adjustment from inventory page'
      };
      
      // Call the inventory API to adjust stock
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adjustmentDataToSend),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Update the inventory in the local state with new stock level
        setInventory(inventory.map(item => 
          item.id === adjustingItem.id ? { 
            ...item, 
            currentStock: result.data.quantity,
            lastUpdated: result.data.lastUpdated
          } : item
        ));
        
        // Close the dialog and reset state
        setIsAdjustDialogOpen(false);
        setAdjustingItem(null);
        setAdjustmentData({
          quantity: 0,
          type: 'adjustment',
          notes: ''
        });
        
        alert('Stock adjusted successfully!');
      } else {
        alert('Error adjusting stock: ' + result.message);
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('Error adjusting stock: ' + (error as Error).message);
    }
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (inventoryPage > 1) {
      setInventoryPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (inventoryPage < totalPages) {
      setInventoryPage(prev => prev + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl font-semibold">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <p className="text-gray-600">Manage your product stock across all branches</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.lowStockCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.outOfStockCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overstock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.overstockCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder="Search by SKU..."
                value={searchSKU}
                onChange={(e) => setSearchSKU(e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder="Search by Category..."
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
              />
            </div>
            <div>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="">All Branches</option>
                {branchList.map((branch: any) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showLowStock"
                checked={showLowStock}
                onChange={(e) => setShowLowStock(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="showLowStock">Low Stock Only</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showOutOfStock"
                checked={showOutOfStock}
                onChange={(e) => setShowOutOfStock(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="showOutOfStock">Out of Stock Only</label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex justify-between mb-4">
        <div className="flex space-x-2">
          <RefreshButton onRefresh={async () => {
            const loadData = async () => {
              setLoading(true);
              try {
                // Determine branch filter - main admins can access all branches, other users only their assigned branch
                const branchFilter = (!isMainAdmin && userBranchId) ? userBranchId : selectedBranch || '';
                
                // Load inventory items with proper branch filtering
                // Only include branchId parameter when it's actually needed (not empty)
                let inventoryUrl = `/api/inventory?page=${inventoryPage}&limit=10&search=${searchTerm}&sku=${searchSKU}&category=${searchCategory}`;
                if (branchFilter) {
                  inventoryUrl += `&branchId=${branchFilter}`;
                }
                if (showLowStock) {
                  inventoryUrl += `&lowStock=true`;
                }
                if (showOutOfStock) {
                  inventoryUrl += `&outOfStock=true`;
                }
                
                const inventoryResponse = await fetch(inventoryUrl);
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
                    const uniqueInventory = formattedInventory.filter((item : any, index : any, self : any) =>
                      index === self.findIndex((i: { id: any; }) => i.id === item.id)
                    );
                    setInventory(uniqueInventory);
                    setTotalPages(inventoryResult.pagination.totalPages || 1);
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
              } catch (error) {
                console.error('Error reloading inventory data:', error);
              } finally {
                setLoading(false);
              }
            };
            
            await loadData();
          }} />
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            Add New Item
          </Button>
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => {
                  const stockStatus = getStockStatus(item.currentStock, item.minStock);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.branch}</TableCell>
                      <TableCell>
                        {editingStockId === item.id ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              value={newStockValue}
                              onChange={(e) => setNewStockValue(Number(e.target.value))}
                              className="w-24"
                            />
                            <Button
                              onClick={() => handleEditInventory(item.id, newStockValue)}
                              size="sm"
                            >
                              Save
                            </Button>
                            <Button
                              onClick={() => {
                                setEditingStockId(null);
                                setNewStockValue(0);
                              }}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <span className="mr-2">{item.currentStock}</span>
                            <StockMovementIndicator 
                              productId={item.productId}
                              branchId={item.branchId}
                              initialValue={stockMovements[item.id]?.initialValue || item.currentStock} 
                              currentValue={item.currentStock} 
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{item.minStock}</TableCell>
                      <TableCell>
                        <Badge variant={stockStatus.variant as any}>
                          {stockStatus.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingStockId(item.id);
                              setNewStockValue(item.currentStock);
                            }}
                          >
                            <Package className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSplittingItem(item);
                              setIsSplitDialogOpen(true);
                            }}
                          >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Split
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAdjustingItem(item);
                              setAdjustmentData({
                                quantity: 0,
                                type: 'adjustment',
                                notes: ''
                              });
                              setIsAdjustDialogOpen(true);
                            }}
                          >
                            <Package className="h-4 w-4 mr-2" />
                            Adjust
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <div>
          Page {inventoryPage} of {totalPages}
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={handlePreviousPage}
            disabled={inventoryPage === 1}
          >
            Previous
          </Button>
          <Button
            onClick={handleNextPage}
            disabled={inventoryPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Add Inventory Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Inventory Item</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              // Handle form submission here
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product</label>
                  <select className="w-full p-2 border border-gray-300 rounded">
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Branch</label>
                  <select className="w-full p-2 border border-gray-300 rounded">
                    {branchList.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <Input type="number" name="quantity" />
                </div>
                <Button type="submit">Add Item</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Split Stock Dialog */}
      {splittingItem && (
        <Dialog open={isSplitDialogOpen} onOpenChange={setIsSplitDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Split Stock: {splittingItem.productName}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Product</label>
                  <Input 
                    value={splittingItem.productName} 
                    readOnly 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">SKU</label>
                  <Input 
                    value={splittingItem.sku} 
                    readOnly 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Current Branch</label>
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
              </div>
              
              <div>
                <label className="text-sm font-medium">Target Branch</label>
                <select 
                  name="targetBranch" 
                  className="w-full p-2 border rounded-md"
                  defaultValue=""
                >
                  <option value="">Select target branch...</option>
                  {branchList
                    .filter((branch: any) => branch.id !== splittingItem.branchId)
                    .map((branch: any) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Quantity to Split</label>
                <Input 
                  type="number"
                  name="quantity"
                  min="1" 
                  max={splittingItem.currentStock} 
                  placeholder={`Enter quantity (max: ${splittingItem.currentStock})`}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Notes (Optional)</label>
                <textarea 
                  name="notes"
                  className="w-full p-2 border rounded-md" 
                  placeholder="Add any notes about this split..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsSplitDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const targetBranch = (document.querySelector('select[name="targetBranch"]') as HTMLSelectElement).value;
                  const quantity = Number((document.querySelector('input[name="quantity"]') as HTMLInputElement).value);
                  const notes = (document.querySelector('textarea[name="notes"]') as HTMLTextAreaElement)?.value || '';
                  
                  if (!targetBranch) {
                    alert('Please select a target branch');
                    return;
                  }
                  
                  if (!quantity || quantity <= 0 || quantity > splittingItem.currentStock) {
                    alert(`Please enter a valid quantity between 1 and ${splittingItem.currentStock}`);
                    return;
                  }
                  
                  handleSplitStock(splittingItem.id, targetBranch, quantity);
                  setIsSplitDialogOpen(false);
                }}
              >
                Split Stock
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Adjust Stock Dialog */}
      {adjustingItem && (
        <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Stock: {adjustingItem.productName}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Product</label>
                  <Input 
                    value={adjustingItem.productName} 
                    readOnly 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">SKU</label>
                  <Input 
                    value={adjustingItem.sku} 
                    readOnly 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Current Stock</label>
                  <Input 
                    value={adjustingItem.currentStock} 
                    readOnly 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Adjustment Type</label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={adjustmentData.type}
                    onChange={(e) => setAdjustmentData({
                      ...adjustmentData, 
                      type: e.target.value as 'in' | 'out' | 'adjustment'
                    })}
                  >
                    <option value="in">Stock In</option>
                    <option value="out">Stock Out</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Quantity</label>
                  <Input 
                    type="number"
                    value={adjustmentData.quantity}
                    onChange={(e) => setAdjustmentData({
                      ...adjustmentData, 
                      quantity: parseInt(e.target.value) || 0
                    })}
                    min="0"
                    placeholder="Enter quantity"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea 
                  className="w-full p-2 border rounded-md" 
                  placeholder="Enter adjustment notes"
                  value={adjustmentData.notes}
                  onChange={(e) => setAdjustmentData({
                    ...adjustmentData, 
                    notes: e.target.value
                  })}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAdjustDialogOpen(false);
                  setAdjustingItem(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAdjustStock}
              >
                Adjust Stock
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}