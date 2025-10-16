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
  Users,
  Award,
  Calendar
} from "lucide-react";

interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  points: number;
  joinDate: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([
    {
      id: "1",
      name: "John Doe",
      phone: "081234567890",
      email: "john@example.com",
      points: 150,
      joinDate: "2023-01-15"
    },
    {
      id: "2",
      name: "Jane Smith",
      phone: "082345678901",
      email: "jane@example.com",
      points: 300,
      joinDate: "2023-02-20"
    },
    {
      id: "3",
      name: "Bob Johnson",
      phone: "083456789012",
      email: "bob@example.com",
      points: 75,
      joinDate: "2023-03-10"
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone.includes(searchTerm) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-gray-500">Manage customer loyalty and points</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <Input placeholder="Enter member name" />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input placeholder="Enter phone number" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" placeholder="Enter email address" />
              </div>
              <div>
                <label className="text-sm font-medium">Initial Points</label>
                <Input type="number" placeholder="Enter initial points" />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea 
                  className="w-full p-2 border rounded-md" 
                  placeholder="Enter member notes"
                  rows={2}
                />
              </div>
            </div>
            <Button>Add Member</Button>
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
                placeholder="Search members by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-2xl font-bold">{members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Members</p>
                <p className="text-2xl font-bold">{members.filter(m => m.points > 0).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-full">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Points</p>
                <p className="text-2xl font-bold">
                  {Math.round(members.reduce((sum, m) => sum + m.points, 0) / members.length) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Member List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Member</th>
                  <th className="text-left py-3 px-4">Contact</th>
                  <th className="text-left py-3 px-4">Points</th>
                  <th className="text-left py-3 px-4">Join Date</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{member.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{member.phone}</div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Award className="h-3 w-3" />
                        {member.points} pts
                      </Badge>
                    </td>
                    <td className="py-3 px-4">{member.joinDate}</td>
                    <td className="py-3 px-4">
                      <Badge variant={member.points > 100 ? "default" : "outline"}>
                        {member.points > 100 ? "VIP" : "Regular"}
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