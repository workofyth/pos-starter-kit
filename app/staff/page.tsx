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
  User,
  Building,
  Mail,
  Phone,
  Calendar
} from "lucide-react";

interface Staff {
  id: string;
  name: string;
  email: string;
  image: string | null;
  branchId: string;
  role: "admin" | "manager" | "cashier" | "staff";
  phone:string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Branch {
  id: string;
  name: string;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    phone: "",
    role: "staff" as "admin" | "manager" | "cashier" | "staff",
    branchId: "",
    image: ""
  });

  // Load staff and branches from API on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load staff
        const staffResponse = await fetch('/api/employees');
        if (staffResponse.ok) {
          const staffResult = await staffResponse.json();
          if (staffResult.success) {
            setStaff(staffResult.data);
          }
        }

        // Load branches
        const branchesResponse = await fetch('/api/branches');
        if (branchesResponse.ok) {
          const branchesResult = await branchesResponse.json();
          if (branchesResult.success) {
            setBranches(branchesResult.data);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredStaff = staff.filter(member => 
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone?.includes(searchTerm) ||
    (branches.find(b => b.id === member.branchId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleVariant = (role: string | null) => {
    if (!role) return "outline";
    
    switch (role) {
      case "admin": return "destructive";
      case "manager": return "default";
      case "cashier": return "secondary";
      case "staff": return "outline";
      default: return "outline";
    }
  };

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return 'No Branch Assigned';
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : 'Unknown Branch';
  };

  const createStaff = async () => {
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newStaff.name,
          email: newStaff.email,
          role: newStaff.role,
          branchId: newStaff.branchId,
          image: newStaff.image
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStaff([...staff, result.data]);
        setNewStaff({
          name: "",
          email: "",
          phone: "",
          role: "staff",
          branchId: "",
          image: ""
        });
        setIsAddDialogOpen(false);
        alert('Staff created successfully!');
      } else {
        alert('Error creating staff: ' + result.message);
      }
    } catch (error) {
      console.error('Error creating staff:', error);
      alert('Error creating staff: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  const updateStaff = async () => {
    if (!editingStaff) return;

    try {
      const response = await fetch(`/api/employees/${editingStaff.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newStaff.name,
          email: newStaff.email,
          role: newStaff.role,
          branchId: newStaff.branchId,
          image: newStaff.image,
          isActive: editingStaff.isActive
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStaff(staff.map(s => 
          s.id === editingStaff.id ? result.data : s
        ));
        setEditingStaff(null);
        setNewStaff({
          name: "",
          email: "",
          phone: "",
          role: "staff",
          branchId: "",
          image: ""
        });
        setIsEditDialogOpen(false);
        alert('Staff updated successfully!');
      } else {
        alert('Error updating staff: ' + result.message);
      }
    } catch (error) {
      console.error('Error updating staff:', error);
      alert('Error updating staff: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  const deleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStaff(staff.filter(staff => staff.id !== id));
        alert('Staff deleted successfully!');
      } else {
        alert('Error deleting staff: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Error deleting staff: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  const startEditStaff = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setNewStaff({
      name: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone || "",
      role: staffMember.role,
      branchId: staffMember.branchId,
      image: staffMember.image || ""
    });
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading staff...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-gray-500">Manage employee access and roles</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Staff</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <Input 
                      placeholder="Enter staff name" 
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Role</label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({...newStaff, role: e.target.value as "admin" | "manager" | "cashier" | "staff"})}
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="cashier">Cashier</option>
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input 
                    type="email" 
                    placeholder="Enter email address" 
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input 
                    placeholder="Enter phone number" 
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Branch</label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={newStaff.branchId}
                    onChange={(e) => setNewStaff({...newStaff, branchId: e.target.value})}
                  >
                    <option value="">Select a branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button onClick={createStaff}>Add Staff</Button>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Staff</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <Input 
                      placeholder="Enter staff name" 
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Role</label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({...newStaff, role: e.target.value as "admin" | "manager" | "cashier" | "staff"})}
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="cashier">Cashier</option>
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input 
                    type="email" 
                    placeholder="Enter email address" 
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input 
                    placeholder="Enter phone number" 
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Branch</label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={newStaff.branchId}
                    onChange={(e) => setNewStaff({...newStaff, branchId: e.target.value})}
                  >
                    <option value="">Select a branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button onClick={updateStaff}>Update Staff</Button>
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
                placeholder="Search staff by name, email, or branch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline">
              <User className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Staff</p>
                <p className="text-2xl font-bold">{staff.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full">
                <User className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Staff</p>
                <p className="text-2xl font-bold">{staff.filter(s => s.isActive !== false).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-full">
                <Building className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Branches</p>
                <p className="text-2xl font-bold">
                  {[...new Set(staff.map(s => s.branchId))].length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-full">
                <User className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cashiers</p>
                <p className="text-2xl font-bold">{staff.filter(s => s.role === "cashier").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Staff</th>
                  <th className="text-left py-3 px-4">Contact</th>
                  <th className="text-left py-3 px-4">Role</th>
                  <th className="text-left py-3 px-4">Branch</th>
                  <th className="text-left py-3 px-4">Join Date</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member) => (
                  <tr key={member.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{member.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-500">{member.email}</div>
                      <div>{member.phone || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={member.role ? getRoleVariant(member.role) : "outline"}>
                        {member.role || 'No Role Assigned'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">{getBranchName(member.branchId)}</td>
                    <td className="py-3 px-4">{new Date(member.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <Badge variant={member.isActive !== false ? "default" : "secondary"}>
                        {member.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => startEditStaff(member)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteStaff(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}