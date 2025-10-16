"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Plus,
  Minus,
  Trash2,
  Calculator,
  CreditCard,
  Package,
  User
} from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  // Mock products data
  const products = [
    { id: "1", name: "Product A", price: 50000, stock: 10 },
    { id: "2", name: "Product B", price: 75000, stock: 5 },
    { id: "3", name: "Product C", price: 25000, stock: 20 },
  ];

  const members = [
    { id: "1", name: "John Doe", points: 150 },
    { id: "2", name: "Jane Smith", points: 300 },
    { id: "3", name: "Bob Johnson", points: 75 },
  ];

  const addToCart = (product: typeof products[0]) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
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
        price: product.price,
        quantity: 1,
        subtotal: product.price
      };
      setCart([...cart, newItem]);
    }
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(id);
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

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.subtotal, 0);
  };

  const taxRate = 0.1; // 10% tax
  const discountRate = selectedMember ? 0.05 : 0; // 5% discount for members
  
  const subtotal = calculateTotal();
  const discountAmount = subtotal * discountRate;
  const taxAmount = (subtotal - discountAmount) * taxRate;
  const total = subtotal - discountAmount + taxAmount;

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
              <div className="flex flex-wrap gap-2">
                {members.map(member => (
                  <Badge
                    key={member.id}
                    variant={selectedMember === member.id ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedMember(
                      selectedMember === member.id ? null : member.id
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
                  placeholder="Search products by name or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {products.map(product => (
                  <Card 
                    key={product.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-sm text-gray-500">Rp {product.price.toLocaleString()}</p>
                      <p className="text-sm">Stock: {product.stock}</p>
                    </CardContent>
                  </Card>
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
                <Calculator className="h-5 w-5" />
                Cart
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Cart is empty</p>
              ) : (
                <div className="space-y-4">
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
                      <span>Rp {subtotal.toLocaleString()}</span>
                    </div>
                    
                    {selectedMember && (
                      <div className="flex justify-between">
                        <span>Discount (5%):</span>
                        <span>- Rp {discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span>Tax (10%):</span>
                      <span>Rp {taxAmount.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total:</span>
                      <span>Rp {total.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 flex flex-col gap-2">
                    <Button className="w-full">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Process Payment
                    </Button>
                    <Button variant="outline" className="w-full">
                      Cancel Transaction
                    </Button>
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