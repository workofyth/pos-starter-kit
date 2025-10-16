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
import { 
  Search, 
  Calendar,
  Download,
  Eye,
  CreditCard,
  Package
} from "lucide-react";

interface Transaction {
  id: string;
  transactionNumber: string;
  date: string;
  customer: string;
  items: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: "cash" | "card" | "transfer";
  status: "completed" | "pending" | "cancelled" | "refunded";
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "1",
      transactionNumber: "TRX-001",
      date: "2023-06-15 10:30",
      customer: "Walk-in Customer",
      items: 3,
      subtotal: 145000,
      discount: 0,
      tax: 14500,
      total: 159500,
      paymentMethod: "cash",
      status: "completed"
    },
    {
      id: "2",
      transactionNumber: "TRX-002",
      date: "2023-06-15 11:15",
      customer: "John Doe",
      items: 2,
      subtotal: 125000,
      discount: 5000,
      tax: 12000,
      total: 132000,
      paymentMethod: "card",
      status: "completed"
    },
    {
      id: "3",
      transactionNumber: "TRX-003",
      date: "2023-06-14 14:20",
      customer: "Jane Smith",
      items: 5,
      subtotal: 250000,
      discount: 0,
      tax: 25000,
      total: 275000,
      paymentMethod: "transfer",
      status: "completed"
    },
    {
      id: "4",
      transactionNumber: "TRX-004",
      date: "2023-06-14 16:45",
      customer: "Bob Johnson",
      items: 1,
      subtotal: 75000,
      discount: 0,
      tax: 7500,
      total: 82500,
      paymentMethod: "cash",
      status: "cancelled"
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("");

  const filteredTransactions = transactions.filter(transaction => 
    transaction.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
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
                  <TableCell>{transaction.customer}</TableCell>
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
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}