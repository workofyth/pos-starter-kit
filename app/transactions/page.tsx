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
import { 
  Search, 
  Calendar,
  Download,
  Eye,
  CreditCard,
  Package
} from "lucide-react";
import { useSession } from "@/lib/auth-client";

interface Transaction {
  id: string;
  transactionNumber: string;
  date: string;
  customerName?: string;  // Customer name from member if available
  items: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: "cash" | "card" | "transfer";
  status: "completed" | "pending" | "cancelled" | "refunded";
  cashierName: string;   // Name of the cashier who processed the transaction
}

export default function TransactionsPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cashierBranchId, setCashierBranchId] = useState<string | null>(null);

  // Fetch cashier's branch ID and role on component mount
  useEffect(() => {
    const fetchCashierBranch = async () => {
      if (session?.user) {
        try {
          const userBranchResponse = await fetch(`/api/user-branches?userId=${session.user.id}`);
          if (userBranchResponse.ok) {
            const userBranchResult = await userBranchResponse.json();
            if (userBranchResult.success && userBranchResult.data.length > 0) {
              const userRole = userBranchResult.data[0].role;
              const branchId = userBranchResult.data[0].branchId;
              
              // For admin users, we'll set to undefined to indicate they can see all branches
              // but still have access to their default branch if needed
              if (userRole === 'admin') {
                setCashierBranchId(branchId); // Admin will see all transactions regardless
              } else {
                setCashierBranchId(branchId);
              }
            } else {
              // If no branch assignment found, set to null to show empty state
              setCashierBranchId(null);
            }
          } else {
            console.error("Failed to fetch user branches:", userBranchResponse.status);
          }
        } catch (error) {
          console.error("Error fetching cashier branch:", error);
        }
      }
    };

    fetchCashierBranch();
  }, [session]);

  // Fetch transactions for the cashier's branch or all transactions for admin
  useEffect(() => {
    if (session?.user) {
      const fetchTransactions = async () => {
        setIsLoading(true);
        try {
          // Fetch user's role to determine if they can see all transactions
          const userBranchResponse = await fetch(`/api/user-branches?userId=${session.user.id}`);
          let isAdmin = false;
          
          if (userBranchResponse.ok) {
            const userBranchResult = await userBranchResponse.json();
            if (userBranchResult.success && userBranchResult.data.length > 0) {
              const userRole = userBranchResult.data[0].role;
              isAdmin = userRole === 'admin';
            }
          }
          
          // For admin users, fetch all transactions; for others, fetch by branch
          var url = ``;
          if (!isAdmin){
            console.log(cashierBranchId)
            url = `/api/transactions?userId=${session.user.id}${!isAdmin && cashierBranchId ? `&branchId=${cashierBranchId}` : ''}`;
          } else{
            url = '/api/transactions';
          }
          const response = await fetch(url);
          
          if (response.ok) {
            const result = await response.json();
            
            if (result.success) {
              // Transform the API response to match our interface
              const transformedTransactions = result.data.map((t: any) => ({
                id: t.id,
                transactionNumber: t.transactionNumber,
                date: new Date(t.createdAt).toLocaleString(),
                customerName: t.memberName || "Walk-in Customer", // Use the field from API
                items: t.detailsCount || 0, // Use the field from API
                subtotal: parseFloat(t.subtotal) || 0,
                discount: parseFloat(t.discountAmount) || 0,
                tax: parseFloat(t.taxAmount) || 0,
                total: parseFloat(t.total) || 0,
                paymentMethod: t.paymentMethod,
                status: t.status,
                cashierName: t.cashierName || "Unknown" // Use the field from API
              }));
              setTransactions(transformedTransactions);
            } else {
              console.error("API Error:", result);
              setTransactions([]); // Set to empty array on error
            }
          } else {
            console.error("HTTP Error:", response.status, response.statusText);
            setTransactions([]); // Set to empty array on error
          }
        } catch (error) {
          console.error("Error fetching transactions:", error);
          setTransactions([]); // Set to empty array on error
        } finally {
          setIsLoading(false);
        }
      };

      fetchTransactions();
    } else if (cashierBranchId === null) {
      // If branchId is null (user has no branch assignment), set empty array
      setTransactions([]);
    }
  }, [cashierBranchId, session]);

  const filteredTransactions = transactions.filter(transaction => 
    transaction.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (transaction.customerName && transaction.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    transaction.cashierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.id.includes(searchTerm)
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "pending": return "secondary";
      case "cancelled": return "destructive";
      case "refunded": return "outline";
      default: return "default";
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "cash": return "💵";
      case "card": return "💳";
      case "transfer": return "🏦";
      default: return "💰";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-gray-500">View and manage sales transactions</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <div className="relative">
              <Calendar className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
              <Input
                type="date"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <div>
              <Button variant="outline" className="w-full">
                <Package className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {cashierBranchId === null ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium">No branch assigned</h3>
              <p className="mt-1 text-sm text-gray-500">
                You don't have access to any branch transactions.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="h-8 w-8 animate-spin rounded-full border border-t-transparent border-blue-600"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium">No transactions</h3>
              <p className="mt-1 text-sm text-gray-500">
                {cashierBranchId !== null && session?.user 
                  ? 'No transactions found for your branch.' 
                  : 'No transactions found.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.transactionNumber}</TableCell>
                    <TableCell>{transaction.date}</TableCell>
                    <TableCell>{transaction.customerName}</TableCell>
                    <TableCell>{transaction.cashierName}</TableCell>
                    <TableCell>{transaction.items}</TableCell>
                    <TableCell>Rp {transaction.subtotal.toLocaleString()}</TableCell>
                    <TableCell>- Rp {transaction.discount.toLocaleString()}</TableCell>
                    <TableCell>Rp {transaction.tax.toLocaleString()}</TableCell>
                    <TableCell className="font-bold">Rp {transaction.total.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className="mr-1">{getPaymentMethodIcon(transaction.paymentMethod)}</span>
                      {transaction.paymentMethod}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.location.href = `/transactions/${transaction.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}