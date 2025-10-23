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
import { useSession } from "@/lib/auth-client";
import { UserRole, hasResourceAccess } from "@/lib/role-based-access";

interface Staff {
  id: string;
  name: string;
  email: string;
  image: string | null;
  branchId: string;
  role: "admin" | "manager" | "cashier" | "staff";
  phone:string;
  isActive: boolean;
  isMainAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
  branch?: {
    id: string;
    name: string;
    type: string;
  };
}

interface Branch {
  id: string;
  name: string;
  type: string;
}

export default function StaffPage() {
  const { data: session, isPending } = useSession();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userBranchType, setUserBranchType] = useState<string | null>(null);
  const [isMainAdmin, setIsMainAdmin] = useState<boolean>(false);
  
  const [staff, setStaff] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [branchTypeFilter, setBranchTypeFilter] = useState<string>(""); // Add branch type filter state
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

  // Fetch user's role and branch information
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
              // Store branch type if available
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

  // Load staff and branches from API on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (branchTypeFilter) {
          params.append('branchType', branchTypeFilter);
        }
        
        // Main Admin (super admin) can see all branches
        // Admin at Main Branch can see all branches 
        // Sub branch admins and other roles can only see their own branch
        if (userRole && !isMainAdmin && userBranchType !== 'main') {
          // If user is not main admin and not on main branch, only show their branch
          params.append('branchId', userBranchId!);
        }
        // If user is on main branch (regardless of role) or is main admin, 
        // they can see all branches (no branch filter needed)
        
        // Load staff with branch type filter
        const staffQuery = params.toString() ? `/api/employees?${params}` : '/api/employees';
        const staffResponse = await fetch(staffQuery);
        if (staffResponse.ok) {
          const staffResult = await staffResponse.json();
          if (staffResult.success) {
            setStaff(staffResult.data);
          }
        }

        // Load branches - but limit to user's branch for non-admins
        let branchesQuery = '/api/branches';
        if (userRole && userRole !== 'admin' && !isMainAdmin && userBranchId) {
          const branchParams = new URLSearchParams();
          branchParams.append('branchId', userBranchId);
          branchesQuery = `/api/branches?${branchParams}`;
        }
        
        const branchesResponse = await fetch(branchesQuery);
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

    // Only fetch data if session is not pending and user role is determined
    if (!isPending && userRole !== undefined) {
      fetchData();
    }
  }, [branchTypeFilter, userRole, userBranchId, isMainAdmin, isPending]); // Add dependencies

  const filteredStaff = staff.filter(member => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone?.includes(searchTerm) ||
      (branches.find(b => b.id === member.branchId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBranchType = !branchTypeFilter || 
      // Handle isMainAdmin case (considered as main admin)
      (branchTypeFilter === 'main' && member.isMainAdmin) ||
      // Handle staff assigned to branch with matching type
      (member.branch && member.branch.type === branchTypeFilter);
    
    return matchesSearch && matchesBranchType;
  });

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
    return branch ? `${branch.name} (${branch.type === 'main' ? 'Main' : 'Sub'})` : 'Unknown Branch';
  };

  const createStaff = async () => {
    // Check if user is allowed to create staff in selected branch
    // Main Admin or Admin at Main Branch can create staff for any branch
    if (userRole && !isMainAdmin && userBranchType !== 'main') {
      if (newStaff.branchId !== userBranchId) {
        alert('You can only create staff for your own branch');
        return;
      }
    }
    
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

    // Check if user is allowed to update staff in this branch
    // Main Admin or Admin at Main Branch can update staff for any branch
    if (userRole && !isMainAdmin && userBranchType !== 'main') {
      if (editingStaff.branchId !== userBranchId) {
        alert('You can only update staff from your own branch');
        return;
      }
      // Also ensure they don't try to change the branch to another one
      if (newStaff.branchId !== userBranchId) {
        alert('You can only update staff within your own branch');
        return;
      }
    }

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
    // Find staff member to check their branch
    const staffToDelete = staff.find(s => s.id === id);
    
    // Check if user is allowed to delete this staff member
    // Main Admin or Admin at Main Branch can delete staff from any branch
    if (userRole && !isMainAdmin && userBranchType !== 'main') {
      if (!staffToDelete || staffToDelete.branchId !== userBranchId) {
        alert('You can only delete staff from your own branch');
        return;
      }
    }

    if (!confirm('Are you sure you want to delete this staff member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStaff(staff.filter(s => s.id !== id));
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

  if (loading || isPending) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading staff...</p>
      </div>
    );
  }

  // If user is not admin/main admin, show limited view notice
  const isLimitedAccess = userRole && userRole !== 'admin' && !isMainAdmin && userBranchId;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-gray-500">Manage employee access and roles</p>
          {isLimitedAccess && (
            <p className="text-sm text-blue-600 mt-1">
              Showing staff for your branch only
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
             <Button
              disabled={!!(userRole && !isMainAdmin && userBranchType !== 'main' && !userBranchId)}
            >
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
                    // Disable for non-admin users
                    disabled={!!(userRole && !isMainAdmin && userBranchType !== 'main' && !userBranchId)}
                  >
                    {userRole && userRole !== 'admin' && !isMainAdmin && userBranchId ? (
                      // If user is not admin/main admin, only show their branch
                      branches
                        .filter(branch => branch.id === userBranchId)
                        .map(branch => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))
                    ) : (
                      // For admin/main admin, show all branches
                      <>
                        <option value="">Select a branch</option>
                        {branches.map(branch => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {userRole && !isMainAdmin && userBranchType !== 'main' && userBranchId && (
                    <p className="text-xs text-gray-500 mt-1">You can only select your own branch</p>
                  )}
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
                    // Disable for non-admin users
                    disabled={!!(userRole && !isMainAdmin && userBranchType !== 'main' && !userBranchId)}
                  >
                    {userRole && userRole !== 'admin' && !isMainAdmin && userBranchId ? (
                      // If user is not admin/main admin, only show their branch
                      branches
                        .filter(branch => branch.id === userBranchId)
                        .map(branch => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))
                    ) : (
                      // For admin/main admin, show all branches
                      <>
                        <option value="">Select a branch</option>
                        {branches.map(branch => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {userRole && !isMainAdmin && userBranchType !== 'main' && userBranchId && (
                    <p className="text-xs text-gray-500 mt-1">You can only select your own branch</p>
                  )}
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
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search staff by name, email, or branch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            {/* Branch Type Filter - disabled for non-main admin users with specific branch access */}
            <select 
              className="border rounded-md p-2"
              value={branchTypeFilter}
              onChange={(e) => setBranchTypeFilter(e.target.value)}
              disabled={!!(userRole && !isMainAdmin && userBranchType !== 'main' && !userBranchId)}
            >
              <option value="">All Branch Types</option>
              <option value="main">Main Branch</option>
              <option value="sub">Sub Branch</option>
            </select>
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
                <p className="text-2xl font-bold">{filteredStaff.length}</p>
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
                <p className="text-2xl font-bold">{filteredStaff.filter(s => s.isActive !== false).length}</p>
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
                <p className="text-sm font-medium text-gray-600">Main Branch</p>
                <p className="text-2xl font-bold">
                  {filteredStaff.filter(s => s.isMainAdmin || (s.branch && s.branch.type === 'main')).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-full">
                <Building className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sub Branch</p>
                <p className="text-2xl font-bold">
                  {filteredStaff.filter(s => s.branch && s.branch.type === 'sub').length}
                </p>
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
                    <td className="py-3 px-4">
                      {member.isMainAdmin 
                        ? 'Main Admin' 
                        : member.branch 
                          ? `${member.branch.name} (${member.branch.type === 'main' ? 'Main' : 'Sub'})` 
                          : getBranchName(member.branchId)}
                    </td>
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
                          disabled={!!(userRole && !isMainAdmin && userBranchType !== 'main' && member.branchId !== userBranchId)}
                          className={userRole && !isMainAdmin && userBranchType !== 'main' && member.branchId !== userBranchId ? "opacity-50 cursor-not-allowed" : ""}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteStaff(member.id)}
                          disabled={!!(userRole && !isMainAdmin && userBranchType !== 'main' && member.branchId !== userBranchId)}
                          className={userRole && !isMainAdmin && userBranchType !== 'main' && member.branchId !== userBranchId ? "opacity-50 cursor-not-allowed" : ""}
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