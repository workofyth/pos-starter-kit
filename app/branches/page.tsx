"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  Building,
  MapPin,
  Phone,
  Mail
} from "lucide-react";

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  type: "main" | "sub";
  createdAt: string;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [newBranch, setNewBranch] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    type: "sub" as "main" | "sub"
  });

  // Load branches from API on component mount
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch('/api/branches');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setBranches(result.data);
          }
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, []);

  const filteredBranches = branches.filter(branch => 
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.phone.includes(searchTerm)
  );

  const createBranch = async () => {
    try {
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBranch),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setBranches([...branches, result.data]);
        setNewBranch({
          name: "",
          address: "",
          phone: "",
          email: "",
          type: "sub"
        });
        setIsAddDialogOpen(false);
        alert('Branch created successfully!');
      } else {
        alert('Error creating branch: ' + result.message);
      }
    } catch (error) {
      console.error('Error creating branch:', error);
      alert('Error creating branch: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  const updateBranch = async () => {
    if (!editingBranch) return;

    try {
      const response = await fetch(`/api/branches/${editingBranch.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newBranch.name,
          address: newBranch.address,
          phone: newBranch.phone,
          email: newBranch.email,
          type: newBranch.type
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setBranches(branches.map(branch => 
          branch.id === editingBranch.id ? result.data : branch
        ));
        setEditingBranch(null);
        setNewBranch({
          name: "",
          address: "",
          phone: "",
          email: "",
          type: "sub"
        });
        setIsEditDialogOpen(false);
        alert('Branch updated successfully!');
      } else {
        alert('Error updating branch: ' + result.message);
      }
    } catch (error) {
      console.error('Error updating branch:', error);
      alert('Error updating branch: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  const deleteBranch = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) {
      return;
    }

    try {
      const response = await fetch(`/api/branches/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setBranches(branches.filter(branch => branch.id !== id));
        alert('Branch deleted successfully!');
      } else {
        alert('Error deleting branch: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting branch:', error);
      alert('Error deleting branch: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  const startEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setNewBranch({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      type: branch.type
    });
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading branches...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Branches</h1>
          <p className="text-gray-500">Manage multi-branch locations</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Branch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Branch</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Branch Name</label>
                    <Input 
                      placeholder="Enter branch name" 
                      value={newBranch.name}
                      onChange={(e) => setNewBranch({...newBranch, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Branch Type</label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={newBranch.type}
                      onChange={(e) => setNewBranch({...newBranch, type: e.target.value as "main" | "sub"})}
                    >
                      <option value="main">Main Branch</option>
                      <option value="sub">Sub Branch</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <textarea 
                    className="w-full p-2 border rounded-md" 
                    placeholder="Enter branch address"
                    value={newBranch.address}
                    onChange={(e) => setNewBranch({...newBranch, address: e.target.value})}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input 
                      placeholder="Enter phone number" 
                      value={newBranch.phone}
                      onChange={(e) => setNewBranch({...newBranch, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input 
                      type="email" 
                      placeholder="Enter email" 
                      value={newBranch.email}
                      onChange={(e) => setNewBranch({...newBranch, email: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <Button onClick={createBranch}>Add Branch</Button>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Branch</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Branch Name</label>
                    <Input 
                      placeholder="Enter branch name" 
                      value={newBranch.name}
                      onChange={(e) => setNewBranch({...newBranch, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Branch Type</label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={newBranch.type}
                      onChange={(e) => setNewBranch({...newBranch, type: e.target.value as "main" | "sub"})}
                    >
                      <option value="main">Main Branch</option>
                      <option value="sub">Sub Branch</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <textarea 
                    className="w-full p-2 border rounded-md" 
                    placeholder="Enter branch address"
                    value={newBranch.address}
                    onChange={(e) => setNewBranch({...newBranch, address: e.target.value})}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input 
                      placeholder="Enter phone number" 
                      value={newBranch.phone}
                      onChange={(e) => setNewBranch({...newBranch, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input 
                      type="email" 
                      placeholder="Enter email" 
                      value={newBranch.email}
                      onChange={(e) => setNewBranch({...newBranch, email: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <Button onClick={updateBranch}>Update Branch</Button>
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
                placeholder="Search branches by name or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline">
              <Building className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBranches.map((branch) => (
          <Card key={branch.id} className="overflow-hidden">
            <CardHeader className="bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    {branch.name}
                  </CardTitle>
                  <Badge variant={branch.type === "main" ? "default" : "outline"} className="mt-2">
                    {branch.type === "main" ? "Main Branch" : "Sub Branch"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => startEditBranch(branch)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteBranch(branch.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
                  <p className="text-sm">{branch.address}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <p className="text-sm">{branch.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <p className="text-sm">{branch.email}</p>
                </div>
                <div className="pt-2 text-xs text-gray-500">
                  Created: {branch.createdAt}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}