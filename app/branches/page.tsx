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
  const [branches, setBranches] = useState<Branch[]>([
    {
      id: "1",
      name: "Main Branch",
      address: "Jl. Jend. Sudirman No.1, Jakarta",
      phone: "021-1234-5678",
      email: "main@example.com",
      type: "main",
      createdAt: "2023-01-15"
    },
    {
      id: "2",
      name: "Branch A",
      address: "Jl. Thamrin No.10, Jakarta",
      phone: "021-8765-4321",
      email: "brancha@example.com",
      type: "sub",
      createdAt: "2023-02-20"
    },
    {
      id: "3",
      name: "Branch B",
      address: "Jl. Gatot Subroto No.5, Jakarta",
      phone: "021-1122-3344",
      email: "branchb@example.com",
      type: "sub",
      createdAt: "2023-03-10"
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredBranches = branches.filter(branch => 
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Branches</h1>
          <p className="text-gray-500">Manage multi-branch locations</p>
        </div>
        
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
                  <Input placeholder="Enter branch name" />
                </div>
                <div>
                  <label className="text-sm font-medium">Branch Type</label>
                  <select className="w-full p-2 border rounded-md">
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
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input placeholder="Enter phone number" />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" placeholder="Enter email" />
                </div>
              </div>
            </div>
            <Button>Add Branch</Button>
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
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
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