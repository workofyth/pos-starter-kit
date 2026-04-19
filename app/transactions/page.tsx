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
  Package,
  Receipt,
  List
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TransactionDetail {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  productName: string;
  productSku: string;
}

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
  paidAmount: number;
  changeAmount: number;
}

export default function TransactionsPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cashierBranchId, setCashierBranchId] = useState<string | null>(null);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [branchList, setBranchList] = useState<any[]>([]);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTransactionDetails, setSelectedTransactionDetails] = useState<TransactionDetail[]>([]);
  const [selectedTransactionInfo, setSelectedTransactionInfo] = useState<Transaction | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  // Products Tab State
  const [activeMainTab, setActiveMainTab] = useState("transactions");
  const [transactionProducts, setTransactionProducts] = useState<any[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);

  useEffect(() => {
    if (activeMainTab === 'products' && session?.user) {
      const fetchTransactionProducts = async () => {
        setIsProductsLoading(true);
        try {
          const url = cashierBranchId && cashierBranchId !== ''
            ? `/api/transactions/products?userId=${session.user.id}&branchId=${cashierBranchId}`
            : `/api/transactions/products?userId=${session.user.id}`;
          const response = await fetch(url);
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setTransactionProducts(result.data);
            }
          }
        } catch (error) {
          console.error("Error fetching transaction products:", error);
        } finally {
          setIsProductsLoading(false);
        }
      };
      fetchTransactionProducts();
    }
  }, [activeMainTab, cashierBranchId, session]);

  const handleViewTransaction = async (transaction: Transaction) => {
    setSelectedTransactionInfo(transaction);
    setIsDialogOpen(true);
    setIsDetailsLoading(true);
    try {
      const response = await fetch(`/api/transactions/${transaction.id}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setSelectedTransactionDetails(result.data.details || []);
        } else {
          setSelectedTransactionDetails([]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch details:', e);
    } finally {
      setIsDetailsLoading(false);
    }
  };

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
              setIsMainAdmin(userBranchResult.data[0].isMainAdmin || userRole === 'admin');
              setCashierBranchId(branchId);
            } else {
              setCashierBranchId(null);
            }
          }
        } catch (error) {
          console.error("Error fetching cashier branch:", error);
        }
      }
    };

    const fetchBranches = async () => {
      try {
        const response = await fetch('/api/branches');
        if (response.ok) {
          const result = await response.json();
          if (result.success) setBranchList(result.data);
        }
      } catch (err) {
        console.error("Error fetching branches:", err);
      }
    };

    fetchCashierBranch();
    fetchBranches();
  }, [session]);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchTransactions = async () => {
    if (!session?.user) return;
    setIsLoading(true);
    try {
      // For admin users, fetch all transactions; for others, fetch by branch
      let url = `/api/transactions?userId=${session.user.id}`;
      
      if (!isMainAdmin && cashierBranchId) {
        url += `&branchId=${cashierBranchId}`;
      } else if (isMainAdmin && selectedBranchFilter) {
        url += `&branchId=${selectedBranchFilter}`;
      }

      const response = await fetch(url);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          const transformedTransactions = result.data.map((t: any) => ({
            id: t.id,
            transactionNumber: t.transactionNumber,
            date: t.createdAt, // Store raw date for filtering
            customerName: t.memberName || "Walk-in Customer",
            items: t.detailsCount || 0,
            subtotal: parseFloat(t.subtotal) || 0,
            discount: parseFloat(t.discountAmount) || 0,
            tax: parseFloat(t.taxAmount) || 0,
            total: parseFloat(t.total) || 0,
            paymentMethod: t.paymentMethod,
            status: t.status,
            cashierName: t.cashierName || "Unknown",
            paidAmount: parseFloat(t.paidAmount) || 0,
            changeAmount: parseFloat(t.changeAmount) || 0
          }));
          setTransactions(transformedTransactions);
        } else {
          setTransactions([]);
        }
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch transactions for the cashier's branch or all transactions for admin
  useEffect(() => {
    fetchTransactions();
  }, [cashierBranchId, session, isMainAdmin, selectedBranchFilter, refreshTrigger]);

  // Set up real-time connection using Server-Sent Events (SSE) for live updates
  useEffect(() => {
    if (!session?.user?.id || !cashierBranchId) return;

    let eventSource: EventSource | null = null;
    
    const setupStream = () => {
      const sseUrl = `/api/notifications/stream/client?branchId=${cashierBranchId}`;
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification') {
            const notifType = data.notification.type;
            if (notifType === 'transaction_created' || notifType === 'inventory_update') {
              console.log('Real-time update triggered by:', notifType);
              setRefreshTrigger(prev => prev + 1);
            }
          }
        } catch (e) {
          // Parsing error
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          // Attempt to reconnect after 5s
          setTimeout(setupStream, 5000);
        }
      };
    };

    setupStream();

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [session?.user?.id, cashierBranchId]);

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.customerName && transaction.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      transaction.cashierName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !dateRange || transaction.date.includes(dateRange);
    
    return matchesSearch && matchesDate;
  });

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

      <Tabs defaultValue="transactions" value={activeMainTab} onValueChange={setActiveMainTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="transactions">
            <Receipt className="h-4 w-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="products">
            <List className="h-4 w-4 mr-2" />
            Products Sold
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-6">
          {/* Filters */}
          <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search transaction, customer, or cashier..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input 
              type="date"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full md:w-44"
            />
          </div>
          {isMainAdmin && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="p-2 border rounded-md text-sm"
              >
                <option value="">All Branches</option>
                {branchList.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <Button variant="outline" className="ml-auto">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
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
                You don&apos;t have access to any branch transactions.
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
                  <TableHead>Paid</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.transactionNumber}</TableCell>
                        <TableCell>{new Date(transaction.date).toLocaleString()}</TableCell>
                    <TableCell>{transaction.customerName}</TableCell>
                    <TableCell>{transaction.cashierName}</TableCell>
                    <TableCell>{transaction.items}</TableCell>
                    <TableCell>Rp {transaction.subtotal.toLocaleString()}</TableCell>
                    <TableCell>- Rp {transaction.discount.toLocaleString()}</TableCell>
                    <TableCell>Rp {transaction.tax.toLocaleString()}</TableCell>
                    <TableCell className="font-bold">Rp {transaction.total.toLocaleString()}</TableCell>
                    <TableCell>Rp {transaction.paidAmount.toLocaleString()}</TableCell>
                    <TableCell className={transaction.changeAmount > 0 ? "text-green-600 font-medium" : ""}>
                      Rp {transaction.changeAmount.toLocaleString()}
                    </TableCell>
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
                        onClick={() => handleViewTransaction(transaction)}
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
      </TabsContent>

      <TabsContent value="products">
        <Card>
          <CardHeader>
            <CardTitle>Products in Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {isProductsLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="h-8 w-8 animate-spin rounded-full border border-t-transparent border-blue-600"></div>
              </div>
            ) : transactionProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium">No products found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  There are no sold products recorded for the selected branches.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Transaction #</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionProducts.map((tp) => (
                    <TableRow key={tp.id}>
                      <TableCell>{new Date(tp.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{tp.transactionNumber}</TableCell>
                      <TableCell>{tp.productName}</TableCell>
                      <TableCell className="text-gray-500">{tp.productSku || '-'}</TableCell>
                      <TableCell className="text-right">Rp {parseFloat(tp.unitPrice).toLocaleString()}</TableCell>
                      <TableCell className="text-center">{tp.quantity}</TableCell>
                      <TableCell className="text-right font-medium">Rp {parseFloat(tp.totalPrice).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex flex-col gap-1">
              <span className="flex items-center gap-2">
                <Receipt className="h-5 w-5"/> Transaction Details
              </span>
              {selectedTransactionInfo && (
                <span className="text-sm font-normal text-gray-500">
                  {selectedTransactionInfo.transactionNumber} - {selectedTransactionInfo.date}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {isDetailsLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="h-8 w-8 animate-spin rounded-full border border-t-transparent border-blue-600"></div>
              </div>
            ) : selectedTransactionDetails.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="mx-auto h-10 w-10 text-gray-300 mb-2"/>
                No product details found for this transaction.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTransactionDetails.map((detail) => (
                      <TableRow key={detail.id}>
                        <TableCell className="font-medium">{detail.productName || 'Unknown Product'}</TableCell>
                        <TableCell className="text-gray-500">{detail.productSku || '-'}</TableCell>
                        <TableCell className="text-right">Rp {parseFloat(detail.unitPrice).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{detail.quantity}</TableCell>
                        <TableCell className="text-right font-medium">Rp {parseFloat(detail.totalPrice).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {selectedTransactionInfo && !isDetailsLoading && (
              <div className="mt-6 flex flex-col gap-2 items-end text-sm">
                <div className="flex gap-4 min-w-48 justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>Rp {selectedTransactionInfo.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex gap-4 min-w-48 justify-between text-gray-600">
                  <span>Discount:</span>
                  <span>- Rp {selectedTransactionInfo.discount.toLocaleString()}</span>
                </div>
                <div className="flex gap-4 min-w-48 justify-between text-gray-600">
                  <span>Tax:</span>
                  <span>Rp {selectedTransactionInfo.tax.toLocaleString()}</span>
                </div>
                <div className="flex gap-4 min-w-48 justify-between font-bold text-base border-t pt-2 mt-2">
                  <span>Total:</span>
                  <span>Rp {selectedTransactionInfo.total.toLocaleString()}</span>
                </div>
                <div className="flex gap-4 min-w-48 justify-between text-gray-600 mt-1">
                  <span>Paid Amount:</span>
                  <span>Rp {selectedTransactionInfo.paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex gap-4 min-w-48 justify-between text-green-600 font-medium">
                  <span>Change:</span>
                  <span>Rp {selectedTransactionInfo.changeAmount.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}