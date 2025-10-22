"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { 
  Search,
  ShoppingCart,
  Trash2,
  Edit,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";

interface DraftOrder {
  id: string;
  userId: string;
  branchId: string;
  cashierId: string;
  memberId: string | null;
  cartData: any[];
  paymentMethod: string;
  discountRate: string;
  notes: string;
  total: string;
  createdAt: string;
  updatedAt: string;
  cashierName: string;
  memberName: string | null;
}

export default function DraftOrdersPage() {
  const { data: session } = useSession();
  const [draftOrders, setDraftOrders] = useState<DraftOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cashierId, setCashierId] = useState<string | null>(null);
  const [cashierBranchId, setCashierBranchId] = useState<string | null>(null);

  // Load cashier info and draft orders
  useEffect(() => {
    const fetchData = async () => {
      if (session?.user) {
        // Fetch user branch assignment
        const userBranchResponse = await fetch(`/api/user-branches?userId=${session.user.id}`);
        if (userBranchResponse.ok) {
          const userBranchResult = await userBranchResponse.json();
          if (userBranchResult.success && userBranchResult.data.length > 0) {
            setCashierBranchId(userBranchResult.data[0].branchId);
            setCashierId(session.user.id);
          }
        }
      }
    };
    
    fetchData();
  }, [session]);

  // Load draft orders
  useEffect(() => {
    if (session?.user) {
      const fetchDraftOrders = async () => {
        setIsLoading(true);
        try {
          // Fetch draft orders for the current user and their branch
          const response = await fetch(`/api/draft-orders?userId=${session.user.id}&branchId=${cashierBranchId || ''}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setDraftOrders(result.data);
            }
          } else {
            const errorResult = await response.json();
            console.error("Error fetching draft orders:", errorResult);
          }
        } catch (error) {
          console.error("Error fetching draft orders:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchDraftOrders();
    }
  }, [session, cashierBranchId]);

  const handleContinueOrder = (draftOrder: DraftOrder) => {
    // Redirect to POS page with draft order data
    // In a real app, this would populate the POS cart with the draft order items
    localStorage.setItem('draftOrderData', JSON.stringify(draftOrder));
    window.location.href = '/pos';
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft order?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/draft-orders?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setDraftOrders(draftOrders.filter(order => order.id !== id));
        alert('Draft order deleted successfully!');
      } else {
        const result = await response.json();
        alert('Error deleting draft order: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting draft order:', error);
      alert('Error deleting draft order: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  // Filter draft orders based on search term
  const filteredDraftOrders = draftOrders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.cashierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.memberName && order.memberName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    order.notes.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Draft Orders</h1>
          <p className="text-gray-500">Manage delayed orders</p>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search draft orders by ID, cashier, or member..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Draft Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Draft Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="h-8 w-8 animate-spin rounded-full border border-t-transparent border-blue-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDraftOrders.length > 0 ? (
                  filteredDraftOrders.map((draftOrder) => (
                    <TableRow key={draftOrder.id}>
                      <TableCell>#{draftOrder.id.substring(0, 8)}...</TableCell>
                      <TableCell>{draftOrder.cashierName}</TableCell>
                      <TableCell>
                        {draftOrder.memberName ? (
                          <Badge variant="secondary">{draftOrder.memberName}</Badge>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>{draftOrder.cartData.length} items</TableCell>
                      <TableCell>Rp {parseFloat(draftOrder.total).toLocaleString()}</TableCell>
                      <TableCell>
                        {new Date(draftOrder.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => handleContinueOrder(draftOrder)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Continue
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDeleteDraft(draftOrder.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No draft orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}