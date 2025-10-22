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
  address: string;
  createdAt: string; // Changed from joinDate to match API response
  updatedAt: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [newMember, setNewMember] = useState({
    name: "",
    phone: "",
    email: "",
    points: 0,
    address: ""
  });

  // Load members from API on component mount
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch('/api/members');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setMembers(result.data);
          }
        }
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone.includes(searchTerm) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createMember = async () => {
    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newMember.name,
          phone: newMember.phone,
          email: newMember.email,
          points: newMember.points,
          address: newMember.address
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMembers([...members, result.data]);
        setNewMember({
          name: "",
          phone: "",
          email: "",
          points: 0,
          address: ""
        });
        setIsAddDialogOpen(false);
        alert('Member created successfully!');
      } else {
        alert('Error creating member: ' + result.message);
      }
    } catch (error) {
      console.error('Error creating member:', error);
      alert('Error creating member: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  const updateMember = async () => {
    if (!editingMember) return;

    try {
      const response = await fetch(`/api/members/${editingMember.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newMember.name,
          phone: newMember.phone,
          email: newMember.email,
          points: newMember.points,
          address: newMember.address
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMembers(members.map(member => 
          member.id === editingMember.id ? result.data : member
        ));
        setEditingMember(null);
        setNewMember({
          name: "",
          phone: "",
          email: "",
          points: 0,
          address: ""
        });
        setIsEditDialogOpen(false);
        alert('Member updated successfully!');
      } else {
        alert('Error updating member: ' + result.message);
      }
    } catch (error) {
      console.error('Error updating member:', error);
      alert('Error updating member: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  const deleteMember = async (id: string) => {
    if (!confirm('Are you sure you want to delete this member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/members/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMembers(members.filter(member => member.id !== id));
        alert('Member deleted successfully!');
      } else {
        alert('Error deleting member: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Error deleting member: ' + (error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  };

  const startEditMember = (member: Member) => {
    setEditingMember(member);
    setNewMember({
      name: member.name,
      phone: member.phone,
      email: member.email || "",
      points: member.points,
      address: member.address || ""
    });
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading members...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-gray-500">Manage customer loyalty and points</p>
        </div>
        
        <div className="flex gap-2">
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
                    <Input 
                      placeholder="Enter member name" 
                      value={newMember.name}
                      onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input 
                      placeholder="Enter phone number" 
                      value={newMember.phone}
                      onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input 
                    type="email" 
                    placeholder="Enter email address" 
                    value={newMember.email}
                    onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Initial Points</label>
                  <Input 
                    type="number" 
                    placeholder="Enter initial points" 
                    value={newMember.points}
                    onChange={(e) => setNewMember({...newMember, points: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <textarea 
                    className="w-full p-2 border rounded-md" 
                    placeholder="Enter member address"
                    value={newMember.address}
                    onChange={(e) => setNewMember({...newMember, address: e.target.value})}
                    rows={2}
                  />
                </div>
              </div>
              <Button onClick={createMember}>Add Member</Button>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Member</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <Input 
                      placeholder="Enter member name" 
                      value={newMember.name}
                      onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input 
                      placeholder="Enter phone number" 
                      value={newMember.phone}
                      onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input 
                    type="email" 
                    placeholder="Enter email address" 
                    value={newMember.email}
                    onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Points</label>
                  <Input 
                    type="number" 
                    placeholder="Enter points" 
                    value={newMember.points}
                    onChange={(e) => setNewMember({...newMember, points: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <textarea 
                    className="w-full p-2 border rounded-md" 
                    placeholder="Enter member address"
                    value={newMember.address}
                    onChange={(e) => setNewMember({...newMember, address: e.target.value})}
                    rows={2}
                  />
                </div>
              </div>
              <Button onClick={updateMember}>Update Member</Button>
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
                    <td className="py-3 px-4">{new Date(member.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <Badge variant={member.points > 100 ? "default" : "outline"}>
                        {member.points > 100 ? "VIP" : "Regular"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => startEditMember(member)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteMember(member.id)}
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