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
  Package,
  Download
} from "lucide-react";
import { useSession } from "@/lib/auth-client"; // Import useSession hook
import { UserRole } from "@/lib/role-based-access"; // Import UserRole type

interface Product {
  branchId?: string;
  id?: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  categoryId: string;
  purchasePrice: number;
  sellingPrice: number;
  unit?: string;
  stock: number;
  minStock: number;
  profitMargin: number; // Profit margin percentage
  image?: string; // Optional image URL
  imageUrl?: string; // Path to stored image
}

interface ProductFormData {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  categoryId: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  profitMargin: number;
  description: string;
  image: string;
  imageUrl?: string;
  id?: string;
}

interface Category {
  id: string;
  name: string;
  code: string;
}

interface InventoryItem {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
  productName: string;
  productSku: string;
  productBarcode: string;
  productDescription: string;
  productImage: string | null;
  productImageUrl: string | null;
  productCategoryId: string | null;
  productCategoryName: string | null;
  productCategoryCode: string | null;
  branchName: string;
  branchAddress: string;
  branchPhone: string | null;
  branchEmail: string | null;
}

export default function ProductsPage() {
  const { data: session } = useSession(); // Add session hook
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userBranchType, setUserBranchType] = useState<string | null>(null);
  const [isMainAdmin, setIsMainAdmin] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  
  // Combined loading state
  const loading = categoriesLoading || productsLoading;
  
  // Get user's role and branch information
  useEffect(() => {
    const fetchUserBranchInfo = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(`/api/user-branches?userId=${session.user.id}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data.length > 0) {
              setUserRole(result.data[0].role || 'staff');
              setUserBranchId(result.data[0].branchId || null);
              setIsMainAdmin(result.data[0].isMainAdmin || false);
              setUserBranchType(result.data[0].branch?.type || null);
            } else {
              setUserRole('staff');
              setUserBranchId(null);
              setIsMainAdmin(false);
              setUserBranchType(null);
            }
          } else {
            setUserRole('staff');
            setUserBranchId(null);
            setIsMainAdmin(false);
            setUserBranchType(null);
          }
        } catch (error) {
          console.error('Error fetching user branch info:', error);
          setUserRole('staff');
          setUserBranchId(null);
          setIsMainAdmin(false);
          setUserBranchType(null);
        }
      } else {
        setUserRole(null);
        setUserBranchId(null);
        setIsMainAdmin(false);
        setUserBranchType(null);
      }
    };

    fetchUserBranchInfo();
  }, [session]);
  
  // Load products from API on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // For sub branch users (not main admin and not on main branch), only show products from their branch
        let url = '/api/products?page=1&limit=100'; // Adjust limit as needed
        if (userRole && !isMainAdmin && userBranchType !== 'main' && userBranchId) {
          // Add branch filter for sub branch users
          const params = new URLSearchParams();
          params.append('branchId', userBranchId);
          url = `/api/products?${params}`;
        }
        
        const response = await fetch(url);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Transform API response to match the Product interface
            const formattedProducts = result.data.map((apiProduct: any) => ({
              id: apiProduct.id,
              name: apiProduct.name,
              sku: apiProduct.sku,
              barcode: apiProduct.barcode,
              category: apiProduct.categoryName || '',
              categoryId: apiProduct.categoryId,
              purchasePrice: parseFloat(apiProduct.purchasePrice) || 0,
              sellingPrice: parseFloat(apiProduct.sellingPrice) || 0,
              stock: apiProduct.stock || 0,
              minStock: apiProduct.minStock || 5,
              profitMargin: parseFloat(apiProduct.profitMargin) || 0,
              image: apiProduct.image,
              imageUrl: apiProduct.imageUrl
            }));
            setProducts(formattedProducts);
          }
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setProductsLoading(false);
      }
    };
    
    // Only fetch products if user information is ready
    if ((userRole !== null && !isMainAdmin && userBranchType !== 'main' && userBranchId !== null) || 
        (userRole !== null && isMainAdmin) || 
        (userRole !== null && userBranchType === 'main')) {
      fetchProducts();
    }
  }, [userRole, userBranchType, isMainAdmin, userBranchId]);
  
  // Load categories from API on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setCategories(result.data);
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Set default categories in case of error
        setCategories([
          { id: "1", name: "Freebase", code: "FB" },
          { id: "2", name: "SaltNic", code: "SL" },
          { id: "3", name: "Accessories", code: "AC" },
          { id: "4", name: "Battery", code: "BT" },
          { id: "5", name: "Coil", code: "CL" },
          { id: "6", name: "Pod System", code: "PS" },
        ]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);
  
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAdjustStockDialogOpen, setIsAdjustStockDialogOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustmentData, setAdjustmentData] = useState({
    quantity: 0,
    type: 'adjustment' as 'in' | 'out' | 'adjustment',
    notes: ''
  });
  const [newProduct, setNewProduct] = useState<ProductFormData>({
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

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm)
  );

  const startEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      categoryId: product.categoryId || "",
      unit: product.unit || "pcs",
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      profitMargin: product.profitMargin,
      description: "", // description might not be in the Product interface
      image: product.image || "",
      imageUrl: product.imageUrl || "",
      id: product.id
    });
    setIsEditDialogOpen(true);
  };

  const handleEditProduct = async () => {
    if (!editingProduct) return;

    try {
      const productData = {
        name: newProduct.name,
        description: newProduct.description || "",
        sku: newProduct.sku,
        barcode: newProduct.barcode,
        categoryId: newProduct.categoryId || null,  // Send null if no category selected
        unit: newProduct.unit,
        profitMargin: newProduct.profitMargin.toString(),
        image: newProduct.image || null,  // Send null if no image
        imageUrl: newProduct.imageUrl || null,  // Send null if no image
        purchasePrice: newProduct.purchasePrice.toString(),
        sellingPrice: newProduct.sellingPrice.toString()
      };

      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update the product in the local state
        setProducts(products.map(p => 
          p.id === editingProduct.id ? {
            ...p,
            name: newProduct.name,
            sku: newProduct.sku,
            barcode: newProduct.barcode,
            category: categories.find(cat => cat.id === newProduct.categoryId)?.name || newProduct.category,
            categoryId: newProduct.categoryId,
            purchasePrice: newProduct.purchasePrice || 0,
            sellingPrice: newProduct.sellingPrice || 0,
            profitMargin: newProduct.profitMargin || 0,
            image: newProduct.image,
            imageUrl: newProduct.imageUrl
          } : p
        ));
        
        // Reset form and close dialog
        setEditingProduct(null);
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
        setIsEditDialogOpen(false);
        alert('Product updated successfully!');
      } else {
        console.error('Error updating product:', result.message);
        alert('Error updating product: ' + result.message);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error updating product: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setProducts(products.filter(product => product.id !== id));
        alert('Product deleted successfully!');
      } else {
        const result = await response.json();
        alert('Error deleting product: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };
  
  const generateUniqueBarcode = (): string => {
    let newBarcode = "";
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
  
  const handleAddProduct = async () => {
    // Validate required fields
    if (!newProduct.name.trim()) {
      alert('Product name is required');
      return;
    }
    
    if (!newProduct.sku.trim()) {
      alert('SKU is required');
      return;
    }
    
    if (!newProduct.categoryId) {
      alert('Category is required');
      return;
    }

    try {
      // Prepare the product data for API request
      const productData = {
        name: newProduct.name,
        description: newProduct.description || "",
        sku: newProduct.sku,
        barcode: newProduct.barcode || generateUniqueBarcode(),
        categoryId: newProduct.categoryId || null,  // Send null if no category selected
        unit: newProduct.unit,
        profitMargin: newProduct.profitMargin.toString(),
        image: newProduct.image || null,  // Send null if no image
        imageUrl: newProduct.imageUrl || null,  // Send null if no image
        purchasePrice: newProduct.purchasePrice.toString(),
        sellingPrice: newProduct.sellingPrice.toString(),
        stock: 0, // New products start with 0 stock
        minStock: 5 // Default minimum stock
      };
      
      console.log('Creating product with data:', productData);
      console.log(productData)
      // Send the product data to the API
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Add the newly created product to the local state
        const newProductFromAPI = result.data;
        setProducts([...products, {
          id: newProductFromAPI.id,
          name: newProductFromAPI.name,
          sku: newProductFromAPI.sku,
          barcode: newProductFromAPI.barcode,
          category: categories.find(cat => cat.id === newProductFromAPI.categoryId)?.name || '',
          categoryId: newProductFromAPI.categoryId,
          purchasePrice: parseFloat(newProductFromAPI.purchasePrice) || 0,
          sellingPrice: parseFloat(newProductFromAPI.sellingPrice) || 0,
          stock: newProductFromAPI.stock || 0,
          minStock: newProductFromAPI.minStock || 5,
          profitMargin: parseFloat(newProductFromAPI.profitMargin) || 0,
          image: newProductFromAPI.image,
          imageUrl: newProductFromAPI.imageUrl
        }]);
        
        // Reset the form
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
        alert('Product added successfully!');
      } else {
        console.error('Error creating product:', result.message);
        alert('Error creating product: ' + result.message);
      }
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Error adding product: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-gray-500">Manage your products and inventory</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Only show Add Product button for main admin or main branch users */}
          {!(userRole && !isMainAdmin && userBranchType !== 'main' && userBranchId) && (
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
                image: "",
                imageUrl: "",
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
                                
                                // Check if the product has been created in the database
                                // Check if this is for a new product (temporary ID) or existing product
                                const isNewProduct = !newProduct.id || 
                                  (typeof newProduct.id === 'string' && 
                                   (newProduct.id.length < 15 || newProduct.id.startsWith(Date.now().toString().substring(0,5)) || !newProduct.id.startsWith('prod_')));
                                
                                if (isNewProduct) {
                                  // For new products, we need to upload the image first and then create the product
                                  // Create a FormData object to send the file
                                  const formData = new FormData();
                                  formData.append('image', file);
                                  
                                  try {
                                    const response = await fetch('/api/products/upload-image', {
                                      method: 'POST',
                                      body: formData
                                    });
                                    
                                    if (response.ok) {
                                      const result = await response.json();
                                      
                                      // Update the newProduct state with the temporary image URL
                                      setNewProduct({
                                        ...newProduct, 
                                        image: result.data.imageUrl,
                                        imageUrl: result.data.imageUrl
                                      });
                                      
                                      alert('Image uploaded successfully! You can now save your product with this image.');
                                    } else {
                                      try {
                                        const result = await response.json();
                                        alert('Error uploading image: ' + result.message);
                                      } catch (jsonError) {
                                        console.error('Error parsing JSON response:', jsonError);
                                        alert('Error uploading image: Server responded with an error');
                                      }
                                    }
                                  } catch (error) {
                                    console.error('Error uploading image:', error);
                                    alert('Error uploading image: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
                                  }
                                  return;
                                }
                                
                                // For existing products, upload image and associate with product ID
                                // Create a FormData object to send the file
                                const formData = new FormData();
                                formData.append('image', file);
                                if (newProduct.id) {
                                  formData.append('productId', newProduct.id);
                                }
                                
                                try {
                                  const response = await fetch('/api/products/upload-image', {
                                    method: 'POST',
                                    body: formData
                                  });
                                  
                                  // Check if response is ok before parsing JSON
                                  if (response.ok) {
                                    const result = await response.json();
                                    
                                    // Update the product with the image URL
                                    setNewProduct({
                                      ...newProduct, 
                                      image: result.imageUrl,
                                      imageUrl: result.imageUrl
                                    });
                                    
                                    // Update the product in the main products list if it exists
                                    setProducts(products.map(p => 
                                      p.id === newProduct.id ? { ...p, image: result.imageUrl, imageUrl: result.imageUrl } : p
                                    ));
                                    
                                    alert('Image uploaded successfully!');
                                  } else {
                                    // Try to parse error response, or use generic message
                                    try {
                                      const result = await response.json();
                                      alert('Error uploading image: ' + result.message);
                                    } catch (jsonError) {
                                      console.error('Error parsing JSON response:', jsonError);
                                      alert('Error uploading image: Server responded with an error');
                                    }
                                  }
                                } catch (error) {
                                  console.error('Error uploading image:', error);
                                  alert('Error uploading image: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
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
          )}
          
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Product</DialogTitle>
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
                      readOnly // SKU is typically not editable after creation
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
                                
                                // Check if the product has a valid ID (should always be true for edit dialog)
                                if (!newProduct.id) {
                                  alert('Product ID is missing. Cannot upload image.');
                                  return;
                                }
                                
                                // Create a FormData object to send the file
                                const formData = new FormData();
                                formData.append('image', file);
                                formData.append('productId', newProduct.id);
                                
                                try {
                                  const response = await fetch('/api/products/upload-image', {
                                    method: 'POST',
                                    body: formData
                                  });
                                  
                                  // Check if response is ok before parsing JSON
                                  if (response.ok) {
                                    const result = await response.json();
                                    
                                    // Update the product with the image URL
                                    setNewProduct({
                                      ...newProduct, 
                                      image: result.imageUrl,
                                      imageUrl: result.imageUrl
                                    });
                                    
                                    // Update the product in the main products list
                                    setProducts(products.map(p => 
                                      p.id === newProduct.id ? { ...p, image: result.imageUrl, imageUrl: result.imageUrl } : p
                                    ));
                                    
                                    alert('Image uploaded successfully!');
                                  } else {
                                    // Try to parse error response, or use generic message
                                    try {
                                      const result = await response.json();
                                      alert('Error uploading image: ' + result.message);
                                    } catch (jsonError) {
                                      console.error('Error parsing JSON response:', jsonError);
                                      alert('Error uploading image: Server responded with an error');
                                    }
                                  }
                                } catch (error) {
                                  console.error('Error uploading image:', error);
                                  alert('Error uploading image: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
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
              <Button onClick={handleEditProduct}>Update Product</Button>
            </DialogContent>
          </Dialog>
          
          {/* Only show Bulk Import button for main admin or main branch users */}
          {!(userRole && !isMainAdmin && userBranchType !== 'main' && userBranchId) && (
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
                          // Add user's branchId to the form data
                          formData.append('branchId', userBranchId || 'brn_XNUWRgFLof');
                          
                          fetch('/api/products/bulk-upload', {
                            method: 'POST',
                            body: formData
                          })
                          .then(async response => {
                            // Check if response is ok before parsing JSON
                            if (response.ok) {
                              return response.json();
                            } else {
                              // Try to parse error response, or use generic message
                              try {
                                return await response.json();
                              } catch (jsonError) {
                                console.error('Error parsing JSON response:', jsonError);
                                return { message: 'Error processing file: Server responded with an error' };
                              }
                            }
                          })
                          .then(data => {
                            if (data.message) {
                              alert(data.message);
                              // Optionally, refresh the product list
                              // window.location.reload(); // Or implement a state update
                            } else {
                              alert('Error: Invalid response from server');
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
          )}
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
              {filteredProducts.map((product, index) => (
                <TableRow key={`${product.id}-${product.branchId || 'no-branch'}-${index}`}>
                  <TableCell>
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-10 h-10 object-cover rounded-md"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/assets/images/placeholder-product.png';
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
                      {/* Only show edit button for main admin or main branch users */}
                      {!(userRole && !isMainAdmin && userBranchType !== 'main' && userBranchId) && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => startEditProduct(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Only show stock adjustment button for main admin or main branch users */}
                      {!(userRole && !isMainAdmin && userBranchType !== 'main' && userBranchId) && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setAdjustingProduct(product);
                            setAdjustmentData({
                              quantity: 0,
                              type: 'adjustment',
                              notes: ''
                            });
                            setIsAdjustStockDialogOpen(true);
                          }}
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Only show delete button for main admin or main branch users */}
                      {!(userRole && !isMainAdmin && userBranchType !== 'main' && userBranchId) && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteProduct(product.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Adjust Stock Dialog */}
      <Dialog open={isAdjustStockDialogOpen} onOpenChange={setIsAdjustStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
          </DialogHeader>
          {adjustingProduct && (
            <div className="grid gap-4 py-4">
              <div>
                <label className="text-sm font-medium">Product</label>
                <Input 
                  value={`${adjustingProduct.name} (${adjustingProduct.sku})`} 
                  readOnly 
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Current Stock</label>
                  <Input 
                    value={adjustingProduct.stock || 0} 
                    readOnly 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Adjustment Type</label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={adjustmentData.type}
                    onChange={(e) => setAdjustmentData({...adjustmentData, type: e.target.value as 'in' | 'out' | 'adjustment'})}
                  >
                    <option value="in">Stock In</option>
                    <option value="out">Stock Out</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Quantity</label>
                  <Input 
                    type="number" 
                    placeholder="Enter quantity" 
                    value={adjustmentData.quantity}
                    onChange={(e) => setAdjustmentData({...adjustmentData, quantity: parseInt(e.target.value) || 0})}
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea 
                  className="w-full p-2 border rounded-md" 
                  placeholder="Enter adjustment notes"
                  value={adjustmentData.notes}
                  onChange={(e) => setAdjustmentData({...adjustmentData, notes: e.target.value})}
                  rows={3}
                />
              </div>
            </div>
          )}
          <Button 
            onClick={async () => {
              if (!adjustingProduct) return;
              
              try {
                // Prepare the stock adjustment data
                // Use the user's branch ID from session
                const stockData = {
                  productId: adjustingProduct.id,
                  branchId: userBranchId || 'brn_XNUWRgFLof', // Dynamic branch ID from user's assignment or fallback
                  quantity: adjustmentData.quantity,
                  type: adjustmentData.type,
                  notes: adjustmentData.notes || 'Stock adjustment from products page'
                };
                
                // Call the inventory API to adjust stock
                const response = await fetch('/api/inventory', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(stockData),
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                  // Update the product in the local state with new stock level
                  setProducts(products.map(p => 
                    p.id === adjustingProduct.id ? { 
                      ...p, 
                      stock: result.data.quantity,
                      lastUpdated: result.data.lastUpdated
                    } : p
                  ));
                  
                  // Close the dialog and reset state
                  setIsAdjustStockDialogOpen(false);
                  setAdjustingProduct(null);
                  setAdjustmentData({
                    quantity: 0,
                    type: 'adjustment',
                    notes: ''
                  });
                  
                  alert('Stock adjusted successfully!');
                } else {
                  alert('Error adjusting stock: ' + result.message);
                }
              } catch (error) {
                console.error('Error adjusting stock:', error);
                alert('Error adjusting stock: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
              }
            }}
          >
            Adjust Stock
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}