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
  Gift,
  Loader2
} from "lucide-react";
import { useSession } from "@/lib/auth-client";

interface ExchangePoint {
  id: string;
  pointExchangeTotal: number;
  exchangeItem: string;
  productId: string | null;
  productName?: string;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
}

export default function ExchangePointsPage() {
  const [exchangePoints, setExchangePoints] = useState<ExchangePoint[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExchangePoint | null>(null);
  const [newItem, setNewItem] = useState({
    pointExchangeTotal: 0,
    exchangeItem: "",
    productId: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMainAdmin, setIsMainAdmin] = useState<boolean>(false);
  const [userBranchType, setUserBranchType] = useState<string | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const { data: session } = useSession();

  useEffect(() => {
    fetchExchangePoints();
    fetchProducts();
    fetchUserBranchInfo();
  }, [session]);

  const fetchUserBranchInfo = async () => {
    if (session?.user?.id) {
      try {
        const response = await fetch(`/api/user-branches?userId=${session.user.id}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.length > 0) {
            const uBranch = result.data[0];
            setUserRole(uBranch.role || 'staff');
            setUserBranchId(uBranch.branchId || null);
            setIsMainAdmin(uBranch.isMainAdmin === true);
            setUserBranchType(uBranch.branch?.type || null);
          }
        }
      } catch (error) {
        console.error('Error fetching user branch info:', error);
      }
    }
  };

  const isSubBranchUser = !isMainAdmin && userBranchType !== 'main';

  const fetchExchangePoints = async () => {
    try {
      const response = await fetch('/api/exchange-points');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setExchangePoints(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching exchange points:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?limit=100');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setProducts(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const filteredItems = exchangePoints.filter(item => 
    item.exchangeItem.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.productName && item.productName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const createItem = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/exchange-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        fetchExchangePoints();
        setNewItem({ pointExchangeTotal: 0, exchangeItem: "", productId: "" });
        setIsAddDialogOpen(false);
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error creating item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateItem = async () => {
    if (!editingItem) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/exchange-points/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        fetchExchangePoints();
        setIsEditDialogOpen(false);
        setEditingItem(null);
        setNewItem({ pointExchangeTotal: 0, exchangeItem: "", productId: "" });
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Are you sure?')) return;

    try {
      const response = await fetch(`/api/exchange-points/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setExchangePoints(exchangePoints.filter(i => i.id !== id));
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const startEdit = (item: ExchangePoint) => {
    setEditingItem(item);
    setNewItem({
      pointExchangeTotal: item.pointExchangeTotal,
      exchangeItem: item.exchangeItem,
      productId: item.productId || ""
    });
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Exchange Member Points</h1>
          <p className="text-gray-500">Configure point rewards and items</p>
        </div>
        {!isSubBranchUser && (
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            if (open) {
              setNewItem({ pointExchangeTotal: 0, exchangeItem: "", productId: "" });
              setEditingItem(null);
            }
            setIsAddDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Reward
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Exchange Reward</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <label className="text-sm font-medium">Exchange Item Name</label>
                  <Input 
                    placeholder="e.g., Free Coffee, 10% Discount Voucher" 
                    value={newItem.exchangeItem}
                    onChange={(e) => setNewItem({...newItem, exchangeItem: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Points Required</label>
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="Points to spend" 
                    value={newItem.pointExchangeTotal}
                    onChange={(e) => setNewItem({...newItem, pointExchangeTotal: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Link to Product (Optional)</label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={newItem.productId}
                    onChange={(e) => {
                      const prodId = e.target.value;
                      const prod = products.find(p => p.id === prodId);
                      setNewItem({
                        ...newItem, 
                        productId: prodId,
                        exchangeItem: prod ? prod.name : newItem.exchangeItem
                      });
                    }}
                  >
                    <option value="">Select a product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">If linked, this product will be added to cart on exchange.</p>
                </div>
              </div>
              <Button onClick={createItem} disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Reward"}
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search rewards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reward List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reward Item</TableHead>
                <TableHead>Points Cost</TableHead>
                <TableHead>Linked Product</TableHead>
                {!isSubBranchUser && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.exchangeItem}</TableCell>
                  <TableCell>
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                      {item.pointExchangeTotal} Pts
                    </Badge>
                  </TableCell>
                  <TableCell>{item.productName || "None"}</TableCell>
                  {!isSubBranchUser && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => deleteItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Exchange Reward</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium">Exchange Item Name</label>
              <Input 
                value={newItem.exchangeItem}
                onChange={(e) => setNewItem({...newItem, exchangeItem: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Points Required</label>
              <Input 
                type="number"
                step="0.01"
                value={newItem.pointExchangeTotal}
                onChange={(e) => setNewItem({...newItem, pointExchangeTotal: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          <Button onClick={updateItem} disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Reward"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
