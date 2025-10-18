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
  Package,
  Download
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  categoryId: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  profitMargin: number; // Profit margin percentage
  image?: string; // Optional image URL
  imageUrl?: string; // Path to stored image
}

interface Category {
  id: string;
  name: string;
  code: string;
}

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([
    { id: "1", name: "Freebase", code: "FB" },
    { id: "2", name: "SaltNic", code: "SL" },
    { id: "3", name: "Accessories", code: "AC" },
    { id: "4", name: "Battery", code: "BT" },
    { id: "5", name: "Coil", code: "CL" },
    { id: "6", name: "Pod System", code: "PS" },
  ]);
  
  const [products, setProducts] = useState<Product[]>([
    {
      id: "1",
      name: "Product A",
      sku: "FB00001",
      barcode: "1234567890123",
      category: "Freebase",
      categoryId: "1",
      purchasePrice: 45000,
      sellingPrice: 50000,
      stock: 10,
      minStock: 5,
      profitMargin: 11.11, // (50000-45000)/45000 * 100
      image: "../../assets/images/placeholder-product.png"
    },
    {
      id: "2",
      name: "Product B",
      sku: "SL00001",
      barcode: "1234567890124",
      category: "SaltNic",
      categoryId: "2",
      purchasePrice: 70000,
      sellingPrice: 75000,
      stock: 5,
      minStock: 3,
      profitMargin: 7.14, // (75000-70000)/70000 * 100
      image: "../../assets/images/placeholder-product.png"
    },
    {
      id: "3",
      name: "Product C",
      sku: "AC00001",
      barcode: "1234567890125",
      category: "Accessories",
      categoryId: "3",
      purchasePrice: 20000,
      sellingPrice: 25000,
      stock: 20,
      minStock: 10,
      profitMargin: 25.00, // (25000-20000)/20000 * 100
      image: "../../assets/images/placeholder-product.png"
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    barcode: "",
    category: "",
    categoryId: "",
    unit: "pcs",
    purchasePrice: 0,
    sellingPrice: 0,
    profitMargin: 0,
    description: "",
    image: "",
    imageUrl: "",
    id: Date.now().toString() // Temporary ID for image upload
  });

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm)
  );

  const deleteProduct = (id: string) => {
    setProducts(products.filter(product => product.id !== id));
  };
  
  const generateUniqueBarcode = (): string => {
    let newBarcode: string;
    let isUnique = false;
    while (!isUnique) {
      newBarcode = "1" + Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
      isUnique = !products.some(p => p.barcode === newBarcode);
    }
    return newBarcode;
  };
  
  const generateSKU = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return "";
    
    // Find the highest existing SKU number for this category
    const categoryProducts = products.filter(p => p.categoryId === categoryId);
    let nextNumber = 1;
    
    if (categoryProducts.length > 0) {
      const categorySKUs = categoryProducts
        .map(p => parseInt(p.sku.replace(category.code, "")))
        .filter(num => !isNaN(num));
      
      if (categorySKUs.length > 0) {
        const maxNum = Math.max(...categorySKUs);
        nextNumber = maxNum + 1;
      }
    }
    
    // Format the number with leading zeros (5 digits)
    const formattedNumber = nextNumber.toString().padStart(5, '0');
    return `${category.code}${formattedNumber}`;
  };
  
  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
      const newSKU = generateSKU(categoryId);
      setNewProduct({
        ...newProduct,
        categoryId: categoryId,
        category: category.name,
        sku: newSKU
      });
    }
  };
  
  const handleProfitMarginChange = (value: string) => {
    const margin = parseFloat(value) || 0;
    const purchasePrice = newProduct.purchasePrice || 0;
    const sellingPrice = purchasePrice * (1 + margin/100);
    
    setNewProduct({
      ...newProduct,
      profitMargin: margin,
      sellingPrice: sellingPrice
    });
  };
  
  const handlePurchasePriceChange = (value: string) => {
    const purchasePrice = parseFloat(value) || 0;
    const profitMargin = newProduct.profitMargin || 0;
    const sellingPrice = purchasePrice * (1 + profitMargin/100);
    
    setNewProduct({
      ...newProduct,
      purchasePrice: purchasePrice,
      sellingPrice: sellingPrice
    });
  };
  
  const handleAddProduct = () => {
    const productToAdd: Product = {
      id: Date.now().toString(), // In a real app, this would be a proper ID
      name: newProduct.name,
      sku: newProduct.sku,
      barcode: newProduct.barcode || generateUniqueBarcode(),
      category: newProduct.category,
      categoryId: newProduct.categoryId,
      purchasePrice: newProduct.purchasePrice,
      sellingPrice: newProduct.sellingPrice,
      stock: 0, // New products start with 0 stock
      minStock: 5, // Default minimum stock
      profitMargin: newProduct.profitMargin,
      image: newProduct.image,
      imageUrl: newProduct.imageUrl
    };
    
    setProducts([...products, productToAdd]);
    setNewProduct({
      name: "",
      sku: "",
      barcode: "",
      category: "",
      categoryId: "",
      unit: "pcs",
      purchasePrice: 0,
      sellingPrice: 0,
      profitMargin: 0,
      description: "",
      image: "",
      imageUrl: "",
      id: Date.now().toString()
    });
    setIsAddDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-gray-500">Manage your products and inventory</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              setNewProduct({
                name: "",
                sku: "",
                barcode: "",
                category: "",
                categoryId: "",
                unit: "pcs",
                purchasePrice: 0,
                sellingPrice: 0,
                profitMargin: 0,
                description: "",
                image: ""
              });
            }
          }}>
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
                  <Input 
                    placeholder="Enter product name" 
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">SKU</label>
                    <Input 
                      placeholder="Enter SKU" 
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                      readOnly // SKU is auto-generated based on category
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Barcode</label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Enter barcode" 
                        value={newProduct.barcode}
                        onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => {
                          const uniqueBarcode = generateUniqueBarcode();
                          setNewProduct({...newProduct, barcode: uniqueBarcode});
                        }}
                      >
                        Generate
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={newProduct.categoryId}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                    >
                      <option value="">Select a category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name} ({category.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Unit</label>
                    <Input 
                      placeholder="Enter unit (e.g., pcs, kg)" 
                      value={newProduct.unit}
                      onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Purchase Price</label>
                    <Input 
                      type="number" 
                      placeholder="Enter purchase price" 
                      value={newProduct.purchasePrice || ""}
                      onChange={(e) => handlePurchasePriceChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Profit Margin (%)</label>
                    <Input 
                      type="number" 
                      placeholder="Enter profit margin %" 
                      step="0.01"
                      value={newProduct.profitMargin || ""}
                      onChange={(e) => handleProfitMarginChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Selling Price</label>
                    <Input 
                      type="number" 
                      placeholder="Enter selling price" 
                      value={newProduct.sellingPrice || ""}
                      onChange={(e) => setNewProduct({...newProduct, sellingPrice: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea 
                    className="w-full p-2 border rounded-md" 
                    placeholder="Enter product description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Product Image</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                          <span>Upload a file</span>
                          <input 
                            type="file" 
                            className="sr-only" 
                            accept="image/*"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                
                                // Create a FormData object to send the file
                                const formData = new FormData();
                                formData.append('image', file);
                                formData.append('productId', newProduct.id || '');
                                
                                try {
                                  const response = await fetch('/api/products/upload-image', {
                                    method: 'POST',
                                    body: formData
                                  });
                                  
                                  const result = await response.json();
                                  
                                  if (response.ok) {
                                    // Update the product with the image URL
                                    setNewProduct({
                                      ...newProduct, 
                                      image: result.imageUrl,
                                      imageUrl: result.imageUrl
                                    });
                                    alert('Image uploaded successfully!');
                                  } else {
                                    alert('Error uploading image: ' + result.message);
                                  }
                                } catch (error) {
                                  console.error('Error uploading image:', error);
                                  alert('Error uploading image: ' + error.message);
                                }
                              }
                            }}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <Button onClick={handleAddProduct}>Add Product</Button>
            </DialogContent>
          </Dialog>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Import Products</DialogTitle>
                <p className="text-sm text-gray-500">
                  Upload an Excel file to add multiple products at once
                </p>
              </DialogHeader>
              <div className="py-4">
                <div className="mb-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // Download the template
                      window.open('/api/products/template', '_blank');
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Download the template to see required fields and format
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <label className="text-sm font-medium">Excel File</label>
                    <Input 
                      id="excel-upload" 
                      type="file" 
                      accept=".xlsx, .xls"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          
                          // Submit the file to the API
                          const formData = new FormData();
                          formData.append('excel', file);
                          
                          fetch('/api/products/bulk-upload', {
                            method: 'POST',
                            body: formData
                          })
                          .then(response => response.json())
                          .then(data => {
                            if (data.message) {
                              alert(data.message);
                              // Optionally, refresh the product list
                              // window.location.reload(); // Or implement a state update
                            } else {
                              alert('Error: ' + data.message);
                            }
                          })
                          .catch(error => {
                            console.error('Error uploading file:', error);
                            alert('Error uploading file: ' + error.message);
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
                <TableHead>Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Purchase Price</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Profit Margin</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-10 h-10 object-cover rounded-md"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '../../assets/images/placeholder-product.png';
                        }}
                      />
                    ) : (
                      <div className="bg-gray-200 border-2 border-dashed rounded-md w-10 h-10" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell>{product.barcode}</TableCell>
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
                      {product.profitMargin.toFixed(2)}%
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