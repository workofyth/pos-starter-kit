"use client";

import { useState, useEffect, useCallback } from "react";
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
import { useRealTimeUpdates } from "@/hooks/use-real-time-updates";import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RefreshButton } from "@/components/refresh-button";
import { 
  Search, 
  Package,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Building,
  Building2,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useSession } from "@/lib/auth-client";

interface ApprovalRequest {
  id: string;
  productId: string;
  sourceBranchId: string;
  targetBranchId: string;
  quantity: number;
  type: string;
  notes: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  productName: string;
  productSku: string;
  sourceBranchName: string;
  targetBranchName: string;
  createdBy: string;
}

export default function ApprovalsPage() {
  const { data: session } = useSession();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [approvalsPage, setApprovalsPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userBranchType, setUserBranchType] = useState<string | null>(null);
  const [isMainAdmin, setIsMainAdmin] = useState<boolean>(false);
  // Default to 'pending' status to only show pending approval requests by default
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  
  // State for stock movement tracking
  const [stockMovements, setStockMovements] = useState<Record<string, {initialValue: number, currentValue: number}>>({});

  // Load user's branch information
  useEffect(() => {
    const fetchUserBranchInfo = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(`/api/user-branches?userId=${session.user.id}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data.length > 0) {
              setUserBranchId(result.data[0].branchId || null);
              setUserBranchType(result.data[0].branch?.type || null);
              setIsMainAdmin(result.data[0].isMainAdmin || false);
            }
          }
        } catch (error) {
          console.error("Error fetching user branch info:", error);
        }
      }
    };

    fetchUserBranchInfo();
  }, [session]);

  // Load approvals based on active tab and user context
  // For sub-branches, this will automatically filter to show only relevant requests (incoming/outgoing)
  useEffect(() => {
    const loadApprovals = async () => {
      if (!session?.user?.id) return;
      
      setLoading(true);
      try {
        // The API automatically filters requests based on user role and branch assignment
        // Sub-branches will only see requests relevant to their branch (incoming or outgoing)
        // Main admins see all requests across all branches
        const response = await fetch(`/api/approvals?userId=${session.user.id}&page=${approvalsPage}&limit=10&status=${activeTab}&search=${searchTerm}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setApprovals(result.data);
            setTotalPages(result.pagination.totalPages || 1);
          }
        }
      } catch (error) {
        console.error(`Error loading ${activeTab} approvals:`, error);
      } finally {
        setLoading(false);
      }
    };

    loadApprovals();
  }, [session, approvalsPage, searchTerm, activeTab]);

  // Real-time updates for approvals
  // Define the real-time update handler before using it in the hook
  const handleRealTimeUpdate = useCallback((data: any) => {
    if (data.type === 'approval_updated' || data.type === 'stock_split_approved' || data.type === 'stock_split_rejected') {
      // Reload approvals to reflect the latest changes
      const loadApprovals = async () => {
        if (!session?.user?.id) return;
        
        try {
          const response = await fetch(`/api/approvals?userId=${session.user.id}&page=${approvalsPage}&limit=10&status=${activeTab}&search=${searchTerm}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setApprovals(result.data);
              setTotalPages(result.pagination.totalPages || 1);
            }
          }
        } catch (error) {
          console.error('Error reloading approvals:', error);
        }
      };

      loadApprovals();
    }
  }, [session, approvalsPage, activeTab, searchTerm]);

  // Subscribe to real-time updates using HTTP polling
  useRealTimeUpdates('approvals', handleRealTimeUpdate);

  // Handle approval action

  // Handle approval action
  const handleApprovalAction = async (id: string, action: 'approve' | 'reject', reason?: string) => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch(`/api/approvals?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          action,
          notes: reason || `Request ${action}d by ${session.user.name || 'user'}`
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Update local state
        setApprovals(approvals.map(req => 
          req.id === id ? { ...req, status: action === 'approve' ? 'approved' : 'rejected' } : req
        ));
        if (action === 'approve') {
          alert(`Request approved successfully!`);
        }
        // For rejection, the rejection dialog will handle the alert
      } else {
        alert(`Error ${action}ing request: ${result.message}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      alert(`Error ${action}ing request: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  };

  // Handle reject with reason
  const handleRejectWithReason = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    await handleApprovalAction(selectedRequest.id, 'reject', rejectionReason);
    setIsRejectDialogOpen(false);
    setRejectionReason('');
    alert(`Request rejected with reason: ${rejectionReason}`);
  };

  // Handle resending a rejected request
  const handleResendRequest = async (request: ApprovalRequest) => {
    if (!session?.user?.id) return;
    
    try {
      // First, we need to update the status back to pending to make it resubmittable
      const response = await fetch(`/api/approvals?id=${request.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          action: 'resend', // Our custom action for resending
          notes: `Request resent by ${session.user.name || 'user'}`
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Update local state to reflect the change
        setApprovals(approvals.map(req => 
          req.id === request.id ? { ...req, status: 'pending' } : req
        ));
        alert(`Request resent successfully! It's now pending approval again.`);
        // Refresh the data to show the updated status
        const refreshResponse = await fetch(`/api/approvals?userId=${session.user.id}&page=${approvalsPage}&limit=10&status=${activeTab}&search=${searchTerm}`);
        if (refreshResponse.ok) {
          const refreshResult = await refreshResponse.json();
          if (refreshResult.success) {
            setApprovals(refreshResult.data);
            setTotalPages(refreshResult.pagination.totalPages || 1);
          }
        }
      } else {
        alert(`Error resending request: ${result.message}`);
      }
    } catch (error) {
      console.error('Error resending request:', error);
      alert(`Error resending request: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  };

  // Open reject dialog
  const openRejectDialog = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setIsRejectDialogOpen(true);
  };

  // Open detail view
  const openDetailView = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setIsDetailViewOpen(true);
  };

  // Filter approvals based on search term
  const filteredApprovals = approvals.filter(request => 
    request.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.productSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.sourceBranchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.targetBranchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.notes.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading approval requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Approval Requests</h1>
          <p className="text-gray-500">Manage inventory split requests</p>
          {userBranchType === 'main' || isMainAdmin ? (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              <Building className="inline h-4 w-4 mr-1" />
              Viewing all split requests across all branches
            </p>
          ) : userBranchType === 'sub' && userBranchId ? (
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              <Building2 className="inline h-4 w-4 mr-1" />
              Viewing split requests for your branch only
            </p>
          ) : null}
        </div>
      </div>

      {/* Tabs for different statuses */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-md w-fit">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending
          </div>
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'approved'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setActiveTab('approved')}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Approved
          </div>
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'rejected'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setActiveTab('rejected')}
        >
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Rejected
          </div>
        </button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search approval requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <RefreshButton 
              onRefresh={async () => {
                // Create a simplified reload function
                const reloadApprovals = async () => {
                  setLoading(true);
                  try {
                    const response = await fetch(`/api/approvals?userId=${session?.user?.id}&page=${approvalsPage}&limit=10&status=${activeTab}&search=${searchTerm}`);
                    if (response.ok) {
                      const result = await response.json();
                      if (result.success) {
                        setApprovals(result.data);
                        setTotalPages(result.pagination.totalPages || 1);
                      }
                    }
                  } catch (error) {
                    console.error('Error reloading approvals:', error);
                  } finally {
                    setLoading(false);
                  }
                };

                await reloadApprovals();
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Approval Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'pending' && 'Pending Stock Transfer Requests'}
            {activeTab === 'approved' && 'Approved Stock Transfers'}
            {activeTab === 'rejected' && 'Rejected Stock Transfers'}
          </CardTitle>
          {activeTab === 'pending' && (
            <p className="text-sm text-gray-500">
              {userBranchType === 'sub' 
                ? 'Showing only pending stock transfer requests for your branch' 
                : 'Showing all pending stock transfer requests'}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApprovals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="h-12 w-12 text-gray-300 mb-2" />
                      <p className="text-gray-500">No approval requests found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {searchTerm ? 'Try adjusting your search criteria' : `No ${activeTab} requests`}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredApprovals.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.productName}</TableCell>
                    <TableCell>{request.productSku}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {userBranchType === 'sub' && userBranchId ? (
                          request.sourceBranchId === userBranchId ? (
                            <>
                              <TrendingUp className="h-4 w-4 text-blue-500" />
                              <span className="text-xs">Outgoing</span>
                            </>
                          ) : request.targetBranchId === userBranchId ? (
                            <>
                              <TrendingDown className="h-4 w-4 text-green-500" />
                              <span className="text-xs">Incoming</span>
                            </>
                          ) : (
                            <span className="text-xs">Other</span>
                          )
                        ) : (
                          <>
                            <span className="text-xs">{request.sourceBranchName} → {request.targetBranchName}</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{request.quantity}</TableCell>
                    <TableCell>{request.createdBy}</TableCell>
                    <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => openDetailView(request)}
                        >
                          View Details
                        </Button>
                        {request.status === 'pending' ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleApprovalAction(request.id, 'approve')}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openRejectDialog(request)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        ) : request.status === 'rejected' ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleResendRequest(request)}
                          >
                            Resend
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              Showing page {approvalsPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setApprovalsPage(prev => Math.max(prev - 1, 1))}
                disabled={approvalsPage === 1}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setApprovalsPage(prev => Math.min(prev + 1, totalPages))}
                disabled={approvalsPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail View Dialog */}
      {isDetailViewOpen && selectedRequest && (
        <Dialog open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approval Request Details</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Product</label>
                  <Input 
                    value={selectedRequest.productName} 
                    readOnly 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">SKU</label>
                  <Input 
                    value={selectedRequest.productSku} 
                    readOnly 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Direction</label>
                  <div className="p-2 border rounded-md">
                    {userBranchType === 'sub' && userBranchId ? (
                      selectedRequest.sourceBranchId === userBranchId ? (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                          <span>Outgoing to {selectedRequest.targetBranchName}</span>
                        </div>
                      ) : selectedRequest.targetBranchId === userBranchId ? (
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-green-500" />
                          <span>Incoming from {selectedRequest.sourceBranchName}</span>
                        </div>
                      ) : (
                        <span>Other branch transfer</span>
                      )
                    ) : (
                      <span>{selectedRequest.sourceBranchName} → {selectedRequest.targetBranchName}</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Quantity</label>
                  <Input 
                    value={selectedRequest.quantity} 
                    readOnly 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge 
                    variant={
                      selectedRequest.status === 'approved' ? 'default' : 
                      selectedRequest.status === 'rejected' ? 'destructive' : 
                      'secondary'
                    }
                  >
                    {selectedRequest.status}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea 
                  className="w-full p-2 border rounded-md" 
                  value={selectedRequest.notes}
                  readOnly
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Requested By</label>
                  <Input 
                    value={selectedRequest.createdBy} 
                    readOnly 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <Input 
                    value={new Date(selectedRequest.createdAt).toLocaleString()} 
                    readOnly 
                  />
                </div>
              </div>
              
              {selectedRequest.status === 'pending' && (
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="default" 
                    onClick={() => handleApprovalAction(selectedRequest.id, 'approve')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => openRejectDialog(selectedRequest)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
              {selectedRequest.status === 'rejected' && (
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => handleResendRequest(selectedRequest)}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Resend Request
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Dialog */}
      {isRejectDialogOpen && selectedRequest && (
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Request</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="text-sm font-medium">Product</label>
                <Input 
                  value={selectedRequest.productName} 
                  readOnly 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Direction</label>
                <div className="p-2 border rounded-md">
                  {selectedRequest.sourceBranchName} → {selectedRequest.targetBranchName}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Reason for Rejection</label>
                <textarea 
                  className="w-full p-2 border rounded-md" 
                  placeholder="Enter reason for rejecting this request..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsRejectDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRejectWithReason}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}