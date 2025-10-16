"use client";

import { useState } from "react";
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
  phone: string;
  role: "admin" | "manager" | "cashier" | "staff";
  branch: string;
  joinDate: string;
  status: "active" | "inactive";
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([
    {
      id: "1",
      name: "Ahmad Wijaya",
      email: "ahmad@company.com",
      phone: "081234567890",
      role: "admin",
      branch: "Main Branch",
      joinDate: "2023-01-15",
      status: "active"
    },
    {
      id: "2",
      name: "Siti Nurhaliza",
      email: "siti@company.com",
      phone: "082345678901",
      role: "manager",
      branch: "Main Branch",
      joinDate: "2023-02-20",
      status: "active"
    },
    {
      id: "3",
      name: "Budi Santoso",
      email: "budi@company.com",
      phone: "083456789012",
      role: "cashier",
      branch: "Branch A",
      joinDate: "2023-03-10",
      status: "active"
    },
    {
      id: "4",
      name: "Dewi Anggraini",
      email: "dewi@company.com",
      phone: "084567890123",
      role: "cashier",
      branch: "Branch B",
      joinDate: "2023-04-05",
      status: "active"
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredStaff = staff.filter(member => 
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone.includes(searchTerm) ||
    member.branch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "manager": return "default";
      case "cashier": return "secondary";
      case "staff": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-gray-500">Manage employee access and roles</p>
        </div>
        
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
                  <Input placeholder="Enter staff name" />
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <select className="w-full p-2 border rounded-md">
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="cashier">Cashier</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" placeholder="Enter email address" />
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input placeholder="Enter phone number" />
              </div>
              <div>
                <label className="text-sm font-medium">Branch</label>
                <select className="w-full p-2 border rounded-md">
                  <option value="Main Branch">Main Branch</option>
                  <option value="Branch A">Branch A</option>
                  <option value="Branch B">Branch B</option>
                </select>
              </div>
            </div>
            <Button>Add Staff</Button>
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
                <p className="text-2xl font-bold">{staff.filter(s => s.status === "active").length}</p>
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
                  {[...new Set(staff.map(s => s.branch))].length}
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
                      <div>{member.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getRoleVariant(member.role)}>
                        {member.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">{member.branch}</td>
                    <td className="py-3 px-4">{member.joinDate}</td>
                    <td className="py-3 px-4">
                      <Badge variant={member.status === "active" ? "default" : "secondary"}>
                        {member.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
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