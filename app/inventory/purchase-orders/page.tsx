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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/lib/auth-client";
import { 
  Plus, 
  Search, 
  Package, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShoppingCart,
  Trash2,
  FileText,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Supplier { id: string; name: string; }
interface Branch { id: string; name: string; }
interface Product { id: string; name: string; sku: string; }

interface POItem {
  id: string;
  productId: string;
  productName?: string;
  productSku?: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: string;
  totalPrice: string;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  branchName: string;
  status: string;
  total: string;
  createdAt: string;
  expectedDeliveryDate?: string;
  receivedDate?: string;
  items?: POItem[];
}

export default function PurchaseOrdersPage() {
  const { data: session } = useSession();
  
  // Data lists
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);

  // New PO Form states
  const [newPO, setNewPO] = useState({
    supplierId: "",
    branchId: "",
    notes: "",
    expectedDeliveryDate: "",
    items: [] as any[]
  });
  
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    phone: "",
    email: "",
    address: ""
  });

  const [receivingItems, setReceivingItems] = useState<Record<string, number>>({});
  
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isReceiveLoading, setIsReceiveLoading] = useState(false);
  const [isSupplierLoading, setIsSupplierLoading] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchData();
    fetchSuppliers();
    fetchBranches();
    fetchProducts();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/purchase-orders");
      const result = await resp.json();
      if (result.success) setPurchaseOrders(result.data);
    } catch (error) {
      console.error("Error fetching POs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const resp = await fetch("/api/suppliers");
      const result = await resp.json();
      if (result.success) setSuppliers(result.data);
    } catch (err) {}
  };

  const fetchBranches = async () => {
    try {
      const resp = await fetch("/api/branches?type=utama");
      const result = await resp.json();
      if (result.success && result.data.length > 0) {
        setBranches(result.data);
        // Auto-select the main branch
        setNewPO(prev => ({ ...prev, branchId: result.data[0].id }));
      }
    } catch (err) {}
  };

  const fetchProducts = async () => {
    try {
      const resp = await fetch("/api/products");
      const result = await resp.json();
      if (result.success) setProducts(result.data);
    } catch (err) {}
  };

  const handleAddPO = async () => {
    if (!newPO.supplierId || !newPO.branchId || newPO.items.length === 0) {
      toast.error("Please fill all required fields and add at least one item");
      return;
    }

    const subtotal = newPO.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const total = subtotal; // Simpler for now (can add tax/discount later)

    setIsSubmitLoading(true);
    try {
      const resp = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newPO, subtotal, total })
      });
      const result = await resp.json();
      if (result.success) {
        toast.success("Purchase Order created successfully");
        setIsAddDialogOpen(false);
        fetchData();
        setNewPO({ supplierId: "", branchId: "", notes: "", expectedDeliveryDate: "", items: [] });
      }
    } catch (err) {
      toast.error("Failed to create PO");
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.name || !newSupplier.phone) {
      toast.error("Name and Phone are required");
      return;
    }
    setIsSupplierLoading(true);
    try {
      const resp = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSupplier)
      });
      const result = await resp.json();
      if (result.success) {
        toast.success("Supplier added successfully");
        fetchSuppliers();
        setIsSupplierDialogOpen(false);
      }
    } catch (err) {
      toast.error("Failed to add supplier");
    } finally {
      setIsSupplierLoading(false);
    }
  };

  const viewPODetails = async (po: PurchaseOrder) => {
    try {
      const resp = await fetch(`/api/purchase-orders/${po.id}`);
      const result = await resp.json();
      if (result.success) {
        setSelectedPO(result.data);
        // Pre-fill receiving items with the remaining quantity to be received
        const initialReceiving: Record<string, number> = {};
        result.data.items.forEach((d: any) => {
          initialReceiving[d.productId] = d.quantity - (d.receivedQuantity || 0);
        });
        setReceivingItems(initialReceiving);
        setIsDetailsDialogOpen(true);
      }
    } catch (err) {}
  };

  const openReceiveModal = async (po: PurchaseOrder) => {
    try {
      const resp = await fetch(`/api/purchase-orders/${po.id}`);
      const result = await resp.json();
      if (result.success) {
        setSelectedPO(result.data);
        const initials: Record<string, number> = {};
        result.data.items.forEach((item: any) => {
          initials[item.productId] = item.quantity; // Default receive full amount
        });
        setReceivingItems(initials);
        setIsReceiveDialogOpen(true);
      }
    } catch (err) {}
  };

  const handleReceivePO = async () => {
    if (!selectedPO || !session?.user?.id) return;

    const items = selectedPO.items?.map(item => ({
      productId: item.productId,
      receivedQuantity: receivingItems[item.productId] || 0
    }));

    setIsReceiveLoading(true);
    try {
      const resp = await fetch(`/api/purchase-orders/${selectedPO.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receivedItems: items, userId: session.user.id })
      });
      const result = await resp.json();
      if (result.success) {
        toast.success("Inventory updated successfully");
        setIsReceiveDialogOpen(false);
        fetchData();
      }
    } catch (err) {
      toast.error("Error updating inventory");
    } finally {
      setIsReceiveLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">Received</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">Pending</Badge>;
    }
  };

  const addItemToNewPO = () => {
    setNewPO({
      ...newPO,
      items: [...newPO.items, { productId: "", quantity: 1, unitPrice: 0 }]
    });
  };

  const updateNewPOItem = (index: number, field: string, value: any) => {
    const updated = [...newPO.items];
    updated[index] = { ...updated[index], [field]: value };
    setNewPO({ ...newPO, items: updated });
  };

  const removeItemFromNewPO = (index: number) => {
    setNewPO({ ...newPO, items: newPO.items.filter((_, i) => i !== index) });
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Purchase Orders
          </h1>
          <p className="text-muted-foreground">Manage inventory restocking and suppliers</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsSupplierDialogOpen(true)}>
             Add Supplier
          </Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Purchase Order
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {purchaseOrders.filter(p => p.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {purchaseOrders.filter(p => p.status === 'received').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Valuation (PO)</CardTitle>
            <Package className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {purchaseOrders.reduce((sum, p) => sum + parseFloat(p.total), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-md border-white/5 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>PO History</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search order number..."
                className="pl-8 bg-background/50 border-white/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead>Order #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Loading orders...</TableCell></TableRow>
              ) : purchaseOrders.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No purchase orders found</TableCell></TableRow>
              ) : purchaseOrders.filter(p => p.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())).map((po) => (
                <TableRow key={po.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                  <TableCell className="font-mono text-sm">{po.orderNumber}</TableCell>
                  <TableCell>{po.supplierName}</TableCell>
                  <TableCell>{po.branchName}</TableCell>
                  <TableCell className="font-semibold">Rp {parseFloat(po.total).toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(po.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(po.createdAt), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" className="hover:bg-primary/20 hover:text-primary" onClick={() => viewPODetails(po)}>
                       <Eye className="w-4 h-4" />
                    </Button>
                    {po.status === 'pending' && (
                      <Button variant="ghost" size="icon" className="hover:bg-emerald-500/20 hover:text-emerald-400" onClick={() => openReceiveModal(po)}>
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add PO Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-lg border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Plus className="w-6 h-6 text-primary" /> Create Purchase Order
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier</label>
              <Select value={newPO.supplierId} onValueChange={(v) => setNewPO({...newPO, supplierId: v})}>
                <SelectTrigger className="bg-background/50 border-white/10"><SelectValue placeholder="Select Supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination Branch (Main Only)</label>
              <Select value={newPO.branchId} onValueChange={(v) => setNewPO({...newPO, branchId: v})} disabled={branches.length === 1}>
                <SelectTrigger className="bg-background/50 border-white/10">
                   <SelectValue placeholder="Select Main Branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">Expected Delivery Date</label>
              <Input 
                type="date" 
                className="bg-background/50 border-white/10"
                value={newPO.expectedDeliveryDate}
                onChange={(e) => setNewPO({...newPO, expectedDeliveryDate: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="w-5 h-5" /> Items
              </h3>
              <Button variant="outline" size="sm" onClick={addItemToNewPO}>
                <Plus className="w-4 h-4 mr-1" /> Add Product
              </Button>
            </div>
            
            <div className="border rounded-lg overflow-hidden border-white/10 bg-black/20">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/10">
                    <TableHead className="w-[40%]">Product</TableHead>
                    <TableHead className="w-[20%]">Quantity</TableHead>
                    <TableHead className="w-[20%]">Unit Price (Rp)</TableHead>
                    <TableHead className="w-[15%]">Total</TableHead>
                    <TableHead className="w-[5%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newPO.items.map((item, idx) => (
                    <TableRow key={idx} className="border-white/5 hover:bg-white/5">
                      <TableCell>
                        <Select value={item.productId} onValueChange={(v) => updateNewPOItem(idx, 'productId', v)}>
                          <SelectTrigger className="bg-transparent border-none focus:ring-0">
                            <SelectValue placeholder="Product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          min="1"
                          className="bg-transparent border-white/10 h-8" 
                          value={item.quantity}
                          onChange={(e) => updateNewPOItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="bg-transparent border-white/10 h-8 font-mono" 
                          value={item.unitPrice}
                          onChange={(e) => updateNewPOItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="font-semibold text-xs">
                        {(item.quantity * item.unitPrice).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItemFromNewPO(idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">Total Summary</p>
                <p className="text-2xl font-bold text-primary">
                  Rp {newPO.items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitLoading}>Cancel</Button>
            <Button onClick={handleAddPO} disabled={isSubmitLoading}>
              {isSubmitLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Purchase Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl bg-background/95 backdrop-blur-lg border-white/10 shadow-2xl">
          <DialogHeader>
             <div className="flex items-center justify-between">
                <DialogTitle className="text-2xl font-mono">{selectedPO?.orderNumber}</DialogTitle>
                {selectedPO && getStatusBadge(selectedPO.status)}
             </div>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-8 py-6 opacity-90">
            <div className="space-y-4">
               <div><p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Supplier</p><p className="text-lg">{selectedPO?.supplierName}</p></div>
               <div><p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Destination</p><p className="text-lg">{selectedPO?.branchName}</p></div>
            </div>
            <div className="space-y-4">
               <div><p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Created Date</p><p className="text-lg">{selectedPO && format(new Date(selectedPO.createdAt), "dd MMM yyyy HH:mm")}</p></div>
               <div><p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Expected Delivery</p><p className="text-lg">{selectedPO?.expectedDeliveryDate ? format(new Date(selectedPO.expectedDeliveryDate), "dd MMM yyyy") : '-'}</p></div>
            </div>
          </div>

          <div className="border rounded-xl border-white/10 bg-black/20 overflow-hidden">
             <Table>
                <TableHeader className="bg-white/5">
                   <TableRow className="hover:bg-transparent border-white/5">
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Ordered</TableHead>
                      <TableHead className="text-center">Received</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {selectedPO?.items?.map(item => (
                      <TableRow key={item.id} className="border-white/5 hover:bg-white/5 transition-colors">
                         <TableCell>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{item.productSku}</p>
                         </TableCell>
                         <TableCell className="text-center font-semibold">{item.quantity}</TableCell>
                         <TableCell className="text-center">
                            <Badge variant={item.receivedQuantity >= item.quantity ? "outline" : "secondary"}>
                               {item.receivedQuantity}
                            </Badge>
                         </TableCell>
                         <TableCell className="text-right font-mono">Rp {parseFloat(item.unitPrice).toLocaleString()}</TableCell>
                      </TableRow>
                   ))}
                </TableBody>
             </Table>
          </div>

          <div className="flex justify-between items-center mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
             <p className="font-semibold text-lg">Grand Total</p>
             <p className="font-bold text-2xl text-primary">Rp {selectedPO && parseFloat(selectedPO.total).toLocaleString()}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receive PO Dialog */}
      <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
        <DialogContent className="max-w-3xl bg-background/95 backdrop-blur-lg border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" /> Receive Stock for {selectedPO?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
             <p className="text-sm text-muted-foreground">Verify quantities received to update inventory automatically.</p>
             <div className="border rounded-xl border-white/10 bg-black/20">
                <Table>
                   <TableHeader className="bg-white/5">
                      <TableRow className="border-white/5">
                         <TableHead>Product Name</TableHead>
                         <TableHead className="text-center">Ordered Qty</TableHead>
                         <TableHead className="text-center w-32">Actual Received</TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                      {selectedPO?.items?.map(item => (
                         <TableRow key={item.id} className="border-white/5">
                            <TableCell>{item.productName}</TableCell>
                            <TableCell className="text-center font-bold text-lg">{item.quantity}</TableCell>
                            <TableCell>
                               <Input 
                                 type="number" 
                                 className="text-center h-10 text-emerald-400 font-bold bg-emerald-500/10 border-emerald-500/20"
                                 value={receivingItems[item.productId] || 0}
                                 onChange={(e) => setReceivingItems({...receivingItems, [item.productId]: parseInt(e.target.value) || 0})}
                               />
                            </TableCell>
                         </TableRow>
                      ))}
                   </TableBody>
                </Table>
             </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsReceiveDialogOpen(false)} disabled={isReceiveLoading}>Cancel</Button>
             <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={handleReceivePO} disabled={isReceiveLoading}>
                {isReceiveLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : "Confirm & Update Inventory"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       {/* Add Supplier Dialog */}
       <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
        <DialogContent className="bg-background/95 border-white/10">
          <DialogHeader><DialogTitle>Add New Supplier</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><label className="text-sm font-medium">Supplier Name</label><Input placeholder="Internal Name" value={newSupplier.name} onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Phone Number</label><Input placeholder="+62..." value={newSupplier.phone} onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Email</label><Input placeholder="Optional" value={newSupplier.email} onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Address</label><Input placeholder="Optional" value={newSupplier.address} onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})} /></div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsSupplierDialogOpen(false)} disabled={isSupplierLoading}>Cancel</Button>
             <Button onClick={handleAddSupplier} disabled={isSupplierLoading}>
                {isSupplierLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Supplier"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
