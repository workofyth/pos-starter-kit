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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  Package
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([
    {
      id: "1",
      name: "Product A",
      sku: "SKU-001",
      barcode: "1234567890123",
      category: "Electronics",
      purchasePrice: 45000,
      sellingPrice: 50000,
      stock: 10,
      minStock: 5
    },
    {
      id: "2",
      name: "Product B",
      sku: "SKU-002",
      barcode: "1234567890124",
      category: "Clothing",
      purchasePrice: 70000,
      sellingPrice: 75000,
      stock: 5,
      minStock: 3
    },
    {
      id: "3",
      name: "Product C",
      sku: "SKU-003",
      barcode: "1234567890125",
      category: "Food",
      purchasePrice: 20000,
      sellingPrice: 25000,
      stock: 20,
      minStock: 10
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm)
  );

  const deleteProduct = (id: string) => {
    setProducts(products.filter(product => product.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-gray-500">Manage your products and inventory</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="text-sm font-medium">Product Name</label>
                <Input placeholder="Enter product name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">SKU</label>
                  <Input placeholder="Enter SKU" />
                </div>
                <div>
                  <label className="text-sm font-medium">Barcode</label>
                  <Input placeholder="Enter barcode" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input placeholder="Enter category" />
                </div>
                <div>
                  <label className="text-sm font-medium">Unit</label>
                  <Input placeholder="Enter unit (e.g., pcs, kg)" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Purchase Price</label>
                  <Input type="number" placeholder="Enter purchase price" />
                </div>
                <div>
                  <label className="text-sm font-medium">Selling Price</label>
                  <Input type="number" placeholder="Enter selling price" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea 
                  className="w-full p-2 border rounded-md" 
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>
            </div>
            <Button>Add Product</Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search products by name, SKU, or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline">
              <Package className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Purchase Price</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <div>
                      <div>{product.sku}</div>
                      <div className="text-sm text-gray-500">{product.barcode}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{product.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div>{product.stock}</div>
                      {product.stock <= product.minStock && (
                        <Badge variant="destructive" className="mt-1">Low Stock</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>Rp {product.purchasePrice.toLocaleString()}</TableCell>
                  <TableCell>Rp {product.sellingPrice.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      Rp {(product.sellingPrice - product.purchasePrice).toLocaleString()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deleteProduct(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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