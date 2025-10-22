"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { 
  Search,
  Plus,
  Minus,
  Trash2,
  Calculator,
  CreditCard,
  Package,
  User,
  ShoppingCart
} from "lucide-react";
import { useSession } from "@/lib/auth-client"; // Import useSession hook

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  image?: string;
  imageUrl?: string;
  branchId?: string; // Add branch ID for multi-branch support
  branchName?: string; // Add branch name for display
}

interface Member {
  id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  productId: string;
  discountAmount?: number;
}

export default function POSPage() {
  const { data: session } = useSession(); // Get session data
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [membersList, setMembersList] = useState<Member[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState(0);
  const [discountRate, setDiscountRate] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [cashierId, setCashierId] = useState("1"); // In a real app, this would be dynamic
  const [cashierBranchId, setCashierBranchId] = useState<string | null>(null); // Store cashier's branch ID

  // Load products and members
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Check for draft order data in localStorage (when continuing from draft orders page)
        const draftOrderDataStr = localStorage.getItem('draftOrderData');
        if (draftOrderDataStr) {
          const draftOrder = JSON.parse(draftOrderDataStr);
          setCart(draftOrder.cartData);
          setPaymentMethod(draftOrder.paymentMethod || 'cash');
          setDiscountRate(parseFloat(draftOrder.discountRate) || 0);
          setPaidAmount(0); // Reset paid amount
          
          // Remove the draft data from localStorage after loading
          localStorage.removeItem('draftOrderData');
        }

        // Get cashier's branch ID from session
        if (session?.user) {
          // Fetch user branch assignment
          const userBranchResponse = await fetch(`/api/user-branches?userId=${session.user.id}`);
          if (userBranchResponse.ok) {
            const userBranchResult = await userBranchResponse.json();
            if (userBranchResult.success && userBranchResult.data.length > 0) {
              const userBranchId = userBranchResult.data[0].branchId;
              setCashierBranchId(userBranchId);
              setCashierId(session.user.id);
              
              // Fetch products with stock > 0 for the cashier's branch
              const productsResponse = await fetch(`/api/products?branchId=${userBranchId}`);
              if (productsResponse.ok) {
                const productsResult = await productsResponse.json();
                if (productsResult.success) {
                  setProductsList(productsResult.data);
                }
              }
            } else {
              // If no branch assignment found, load all products (or handle appropriately)
              const productsResponse = await fetch('/api/products');
              if (productsResponse.ok) {
                const productsResult = await productsResponse.json();
                if (productsResult.success) {
                  setProductsList(productsResult.data);
                }
              }
            }
          }
        } else {
          // If no session, load all products (or redirect to login)
          const productsResponse = await fetch('/api/products');
          if (productsResponse.ok) {
            const productsResult = await productsResponse.json();
            if (productsResult.success) {
              setProductsList(productsResult.data);
            }
          }
        }
        
        // Fetch members
        const membersResponse = await fetch('/api/members');
        if (membersResponse.ok) {
          const membersResult = await membersResponse.json();
          if (membersResult.success) {
            setMembersList(membersResult.data);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [session]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert("Product out of stock!");
      return;
    }
    
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        alert("Not enough stock!");
        return;
      }
      
      const updatedCart = cart.map(item => 
        item.id === product.id 
          ? { 
              ...item, 
              quantity: item.quantity + 1, 
              subtotal: (item.quantity + 1) * item.price 
            } 
          : item
      );
      setCart(updatedCart);
    } else {
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        price: product.sellingPrice,
        quantity: 1,
        subtotal: product.sellingPrice,
        productId: product.id
      };
      setCart([...cart, newItem]);
    }
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(id);
      return;
    }

    const product = productsList.find(p => p.id === id);
    if (!product) return;
    
    if (newQuantity > product.stock) {
      alert("Not enough stock!");
      return;
    }

    const updatedCart = cart.map(item => 
      item.id === id 
        ? { 
            ...item, 
            quantity: newQuantity, 
            subtotal: newQuantity * item.price 
          } 
        : item
    );
    setCart(updatedCart);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + item.subtotal, 0);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    return subtotal * (discountRate / 100);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    // Assuming 10% tax
    return (subtotal - discount) * 0.1;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const tax = calculateTax();
    return subtotal - discount + tax;
  };

  const calculateChange = () => {
    const total = calculateTotal();
    return paidAmount >= total ? paidAmount - total : 0;
  };

  const handleProcessTransaction = async () => {
    if (cart.length === 0) {
      alert("Cart is empty!");
      return;
    }
    
    if (paidAmount < calculateTotal()) {
      alert("Insufficient payment amount!");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/pos/process-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cashierId,
          memberId: selectedMember?.id || null,
          items: cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.subtotal,
            discountAmount: item.discountAmount || 0
          })),
          paymentMethod,
          subtotal: calculateSubtotal(),
          discountAmount: calculateDiscount(),
          taxAmount: calculateTax(),
          total: calculateTotal(),
          paidAmount,
          notes: "POS Transaction"
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`Transaction completed! Transaction #${result.transactionNumber}`);
        // Reset cart and form
        setCart([]);
        setPaidAmount(0);
        setDiscountRate(0);
        setSelectedMember(null);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error processing transaction:", error);
      alert("Error processing transaction");
    } finally {
      setIsLoading(false);
    }
  };

  // Save current order as draft
  const handleSaveDraft = async () => {
    if (cart.length === 0) {
      alert("Cart is empty, nothing to save as draft!");
      return;
    }

    if (!cashierId || !cashierBranchId || !session?.user.id) {
      alert("User information not loaded yet. Please wait and try again.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/draft-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,  // Current logged in user
          branchId: cashierBranchId,
          cashierId: session.user.id,  // Cashier is the same as the user
          cart: cart,
          memberId: selectedMember?.id || null,
          notes: "Draft order",
          paymentMethod: paymentMethod,
          discountRate: discountRate,
          total: calculateTotal()
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Order saved as draft successfully!');
        // Reset cart after saving
        setCart([]);
        setPaidAmount(0);
        setDiscountRate(0);
        setSelectedMember(null);
      } else {
        alert(`Error saving draft: ${result.message}`);
      }
    } catch (error) {
      console.error("Error saving draft order:", error);
      alert("Error saving draft order");
    } finally {
      setIsLoading(false);
    }
  };

  // Search for products
  const searchProducts = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      // Search by barcode first, including the branchId for proper filtering
      const searchResponse = await fetch(`/api/products/search?q=${encodeURIComponent(searchTerm)}&branchId=${cashierBranchId || ''}`);
      if (searchResponse.ok) {
        const searchResult = await searchResponse.json();
        if (searchResult.success && searchResult.data.length > 0) {
          addToCart(searchResult.data[0]);
          setSearchTerm("");
        } else {
          alert("Product not found");
        }
      } else {
        alert("Error searching products");
      }
    } catch (error) {
      console.error("Error searching products:", error);
      alert("Error searching products");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Point of Sale</h1>
        <p className="text-gray-500">Process sales transactions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left Column - Product Search and List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Member Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Member
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Search member by name or phone..."
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {membersList.slice(0, 5).map(member => (
                    <Badge
                      key={member.id}
                      variant={selectedMember?.id === member.id ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedMember(
                        selectedMember?.id === member.id ? null : member
                      )}
                    >
                      {member.name} ({member.points} pts)
                    </Badge>
                  ))}
                  {selectedMember && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedMember(null)}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Search products by name, SKU, or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchProducts()}
                />
                <Button onClick={searchProducts}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Product List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {productsList.filter(p => p.stock > 0).map((product, index) => (
                  <div 
                    key={`${product.id}-${product.branchId || 'main'}-${index}`}
                    className="cursor-pointer hover:shadow-md transition-shadow border rounded-lg p-3"
                    onClick={() => addToCart(product)}
                  >
                    <div className="flex flex-col items-center text-center">
                      {product.image || product.imageUrl ? (
                        <img 
                          src={product.image || product.imageUrl} 
                          alt={product.name} 
                          className="w-16 h-16 object-contain rounded-md mb-2"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/assets/images/placeholder-product.png';
                          }}
                        />
                      ) : (
                        <div className="bg-gray-200 border-2 border-dashed rounded-md w-16 h-16 mb-2 flex items-center justify-center">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                      <p className="text-sm text-gray-500">Rp {product.sellingPrice.toLocaleString()}</p>
                      <div className="mt-1 text-center w-full">
                        <p className="text-xs">Stock: {product.stock}</p>
                        <p className="text-xs text-gray-500">{product.sku}</p>
                        {product.stock <= 5 && (
                          <Badge variant="destructive" className="mt-1 text-xs">Low Stock</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Cart */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Cart is empty</p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-500">Rp {item.price.toLocaleString()} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="font-medium">
                        Rp {item.subtotal.toLocaleString()}
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>Rp {calculateSubtotal().toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Discount ({discountRate}%):</span>
                      <span>- Rp {calculateDiscount().toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Tax (10%):</span>
                      <span>Rp {calculateTax().toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total:</span>
                      <span>Rp {calculateTotal().toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 space-y-4">
                    <div>
                      <label className="text-sm font-medium">Payment Method</label>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {['cash', 'card', 'transfer'].map(method => (
                          <Button
                            key={method}
                            variant={paymentMethod === method ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPaymentMethod(method)}
                            className="capitalize"
                          >
                            {method}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Discount (%)</label>
                      <Input
                        type="number"
                        value={discountRate}
                        onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        placeholder="Discount %"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Paid Amount</label>
                      <Input
                        type="number"
                        value={paidAmount || ""}
                        onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                        placeholder="Amount paid"
                      />
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Change:</span>
                      <span className="font-medium">Rp {calculateChange().toLocaleString()}</span>
                    </div>
                    
                    <div className="pt-2 flex flex-col gap-2">
                      <Button 
                        className="w-full" 
                        onClick={handleProcessTransaction}
                        disabled={isLoading || cart.length === 0 || paidAmount < calculateTotal()}
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-white"></div>
                            Processing...
                          </div>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Process Payment (Rp {calculateTotal().toLocaleString()})
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={handleSaveDraft}
                        disabled={isLoading || cart.length === 0}
                      >
                        Save as Draft
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setCart([]);
                          setPaidAmount(0);
                          setDiscountRate(0);
                          setSelectedMember(null);
                        }}
                      >
                        Cancel Transaction
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}