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

interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  createdAt: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([
    {
      id: "1",
      name: "Freebase",
      code: "FB",
      description: "Freebase nicotine products",
      createdAt: "2023-01-15"
    },
    {
      id: "2",
      name: "SaltNic",
      code: "SL",
      description: "Salt nicotine products",
      createdAt: "2023-01-15"
    },
    {
      id: "3",
      name: "Accessories",
      code: "AC",
      description: "Vape accessories",
      createdAt: "2023-01-15"
    },
    {
      id: "4",
      name: "Battery",
      code: "BT",
      description: "Vape batteries",
      createdAt: "2023-01-15"
    },
    {
      id: "5",
      name: "Coil",
      code: "CL",
      description: "Vape coils and atomizers",
      createdAt: "2023-01-15"
    },
    {
      id: "6",
      name: "Pod System",
      code: "PS",
      description: "Pod system devices",
      createdAt: "2023-01-15"
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    code: "",
    description: ""
  });

  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const deleteCategory = (id: string) => {
    // Check if category has associated products before deletion
    // For now, just delete the category
    setCategories(categories.filter(category => category.id !== id));
  };

  const handleAddCategory = () => {
    const newCat: Category = {
      id: Date.now().toString(),
      name: newCategory.name,
      code: newCategory.code.toUpperCase(), // Ensure code is uppercase
      description: newCategory.description,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setCategories([...categories, newCat]);
    setNewCategory({
      name: "",
      code: "",
      description: ""
    });
    setIsAddDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-gray-500">Manage product categories and codes</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="text-sm font-medium">Category Name</label>
                <Input 
                  placeholder="Enter category name" 
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category Code</label>
                <Input 
                  placeholder="Enter 2-3 letter code (e.g., FB, SL)" 
                  value={newCategory.code}
                  onChange={(e) => setNewCategory({...newCategory, code: e.target.value.toUpperCase()})}
                  maxLength={3}
                />
                <p className="text-xs text-gray-500 mt-1">Used for auto-generating SKUs</p>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea 
                  className="w-full p-2 border rounded-md" 
                  placeholder="Enter category description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                  rows={2}
                />
              </div>
            </div>
            <Button onClick={handleAddCategory}>Add Category</Button>
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
                placeholder="Search categories by name or code..."
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

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Category List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{category.code}</Badge>
                  </TableCell>
                  <TableCell>
                    {category.description || <span className="text-gray-400">No description</span>}
                  </TableCell>
                  <TableCell>{category.createdAt}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {Math.floor(Math.random() * 20)} products
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
                        onClick={() => deleteCategory(category.id)}
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