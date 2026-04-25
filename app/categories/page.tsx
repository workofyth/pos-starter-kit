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
  Loader2
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { UserRole } from "@/lib/role-based-access";

interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  point: number;
  createdAt: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: "",
    code: "",
    description: "",
    point: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: session } = useSession();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userBranchType, setUserBranchType] = useState<string | null>(null);
  const [isMainAdmin, setIsMainAdmin] = useState<boolean>(false);
  const [isUserLoading, setIsUserLoading] = useState(true);

  // Get user's role and branch information
  useEffect(() => {
    const fetchUserBranchInfo = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(`/api/user-branches?userId=${session.user.id}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data.length > 0) {
              const uBranch = result.data[0];
              setUserRole(uBranch.role || 'staff');
              setUserBranchId(uBranch.branchId || null);
              setIsMainAdmin(uBranch.isMainAdmin === true);
              setUserBranchType(uBranch.branch?.type || null);
            }
          }
        } catch (error) {
          console.error('Error fetching user branch info:', error);
        } finally {
          setIsUserLoading(false);
        }
      } else {
        setIsUserLoading(false);
      }
    };

    fetchUserBranchInfo();
  }, [session]);

  const isSubBranchUser = !isMainAdmin && userBranchType !== 'main' && userBranchId;

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
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const createCategory = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setCategories([...categories, result.data]);
        setNewCategory({
          name: "",
          code: "",
          description: "",
          point: 0
        });
        setIsAddDialogOpen(false);
      } else {
        alert('Error creating category: ' + result.message);
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Error creating category: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCategory = async () => {
    if (!editingCategory) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategory.name,
          code: newCategory.code,
          description: newCategory.description,
          point: newCategory.point
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setCategories(categories.map(category => 
          category.id === editingCategory.id ? result.data : category
        ));
        setEditingCategory(null);
        setNewCategory({
          name: "",
          code: "",
          description: "",
          point: 0
        });
        setIsEditDialogOpen(false);
      } else {
        alert('Error updating category: ' + result.message);
      }
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Error updating category: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setCategories(categories.filter(category => category.id !== id));
        alert('Category deleted successfully!');
      } else {
        alert('Error deleting category: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  const startEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      code: category.code,
      description: category.description || "",
      point: category.point || 0
    });
    setIsEditDialogOpen(true);
  };

  if (loading || isUserLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-gray-500">Manage product categories and codes</p>
        </div>
        <div className="flex gap-2">
          {!isSubBranchUser && (
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            if (open) {
              setNewCategory({ name: "", code: "", description: "", point: 0 });
            }
            setIsAddDialogOpen(open);
          }}>
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
                  <label className="text-sm font-medium">Point per Purchase</label>
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="Enter point value" 
                    value={newCategory.point}
                    onChange={(e) => setNewCategory({...newCategory, point: parseFloat(e.target.value) || 0})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Points awarded for each product in this category</p>
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
              <Button onClick={createCategory} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Category"
                )}
              </Button>
            </DialogContent>
          </Dialog>
          )}

          {!isSubBranchUser && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Category</DialogTitle>
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
                  <label className="text-sm font-medium">Point per Purchase</label>
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="Enter point value" 
                    value={newCategory.point}
                    onChange={(e) => setNewCategory({...newCategory, point: parseFloat(e.target.value) || 0})}
                  />
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
              <Button onClick={updateCategory} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Category"
                )}
              </Button>
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
                <TableHead>Point</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Products</TableHead>
                {!isSubBranchUser && <TableHead>Actions</TableHead>}
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
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                      {category.point || 0} Pts
                    </Badge>
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
                  {!isSubBranchUser && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => startEditCategory(category)}
                      >
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
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}