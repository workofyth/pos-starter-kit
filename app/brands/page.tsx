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
  Tag,
  Loader2
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { UserRole } from "@/lib/role-based-access";

interface Brand {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [newBrand, setNewBrand] = useState({
    name: "",
    code: "",
    description: ""
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

  // Load brands from API on component mount
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch('/api/brands');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setBrands(result.data);
          }
        }
      } catch (error) {
        console.error('Error fetching brands:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, []);

  const filteredBrands = brands.filter(brand => 
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (brand.description && brand.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const createBrand = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBrand),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setBrands([...brands, result.data]);
        setNewBrand({
          name: "",
          code: "",
          description: ""
        });
        setIsAddDialogOpen(false);
      } else {
        alert('Error creating brand: ' + result.message);
      }
    } catch (error) {
      console.error('Error creating brand:', error);
      alert('Error creating brand: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateBrand = async () => {
    if (!editingBrand) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/brands/${editingBrand.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newBrand.name,
          code: newBrand.code,
          description: newBrand.description
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setBrands(brands.map(brand => 
          brand.id === editingBrand.id ? result.data : brand
        ));
        setEditingBrand(null);
        setNewBrand({
          name: "",
          code: "",
          description: ""
        });
        setIsEditDialogOpen(false);
      } else {
        alert('Error updating brand: ' + result.message);
      }
    } catch (error) {
      console.error('Error updating brand:', error);
      alert('Error updating brand: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteBrand = async (id: string) => {
    if (!confirm('Are you sure you want to delete this brand?')) {
      return;
    }

    try {
      const response = await fetch(`/api/brands/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setBrands(brands.filter(brand => brand.id !== id));
        alert('Brand deleted successfully!');
      } else {
        alert('Error deleting brand: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting brand:', error);
      alert('Error deleting brand: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  const startEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    setNewBrand({
      name: brand.name,
      code: brand.code,
      description: brand.description || ""
    });
    setIsEditDialogOpen(true);
  };

  if (loading || isUserLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading brands...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Brand Management</h1>
          <p className="text-gray-500">Manage product brands and identity</p>
        </div>
        <div className="flex gap-2">
          {!isSubBranchUser && (
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            if (open) {
              setNewBrand({ name: "", code: "", description: "" });
            }
            setIsAddDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Brand
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Brand</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <label className="text-sm font-medium">Brand Name</label>
                  <Input 
                    placeholder="Enter brand name" 
                    value={newBrand.name}
                    onChange={(e) => setNewBrand({...newBrand, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Brand Code</label>
                  <Input 
                    placeholder="Enter code (e.g., EJM, H57)" 
                    value={newBrand.code}
                    onChange={(e) => setNewBrand({...newBrand, code: e.target.value.toUpperCase()})}
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea 
                    className="w-full p-2 border rounded-md" 
                    placeholder="Enter brand description"
                    value={newBrand.description}
                    onChange={(e) => setNewBrand({...newBrand, description: e.target.value})}
                    rows={2}
                  />
                </div>
              </div>
              <Button onClick={createBrand} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Brand"
                )}
              </Button>
            </DialogContent>
          </Dialog>
          )}

          {!isSubBranchUser && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Brand</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <label className="text-sm font-medium">Brand Name</label>
                  <Input 
                    placeholder="Enter brand name" 
                    value={newBrand.name}
                    onChange={(e) => setNewBrand({...newBrand, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Brand Code</label>
                  <Input 
                    placeholder="Enter code (e.g., EJM, H57)" 
                    value={newBrand.code}
                    onChange={(e) => setNewBrand({...newBrand, code: e.target.value.toUpperCase()})}
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea 
                    className="w-full p-2 border rounded-md" 
                    placeholder="Enter brand description"
                    value={newBrand.description}
                    onChange={(e) => setNewBrand({...newBrand, description: e.target.value})}
                    rows={2}
                  />
                </div>
              </div>
              <Button onClick={updateBrand} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Brand"
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
                placeholder="Search brands by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline">
              <Tag className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Brands Table */}
      <Card>
        <CardHeader>
          <CardTitle>Brand List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created At</TableHead>
                {!isSubBranchUser && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBrands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No brands found
                  </TableCell>
                </TableRow>
              ) : (
                filteredBrands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{brand.code}</Badge>
                    </TableCell>
                    <TableCell>
                      {brand.description || <span className="text-gray-400">No description</span>}
                    </TableCell>
                    <TableCell>
                      {brand.createdAt ? new Date(brand.createdAt).toLocaleDateString() : '-'}
                    </TableCell>
                    {!isSubBranchUser && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => startEditBrand(brand)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteBrand(brand.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
