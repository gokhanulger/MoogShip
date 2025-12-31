import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, CheckIcon, XIcon, LoaderIcon, SearchIcon, ClipboardCheckIcon, UserIcon, Package } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { formatDate } from "@/lib/shipment-utils";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function PendingApprovals() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  
  // Check if the current user is an admin
  if (user?.role !== "admin") {
    return (
      <Layout>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="flex items-center mb-6">
              <Link href="/">
                <Button variant="ghost" size="sm" className="mr-2">
                  <ArrowLeftIcon className="h-4 w-4 mr-1" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-red-600">Access Denied</CardTitle>
                <CardDescription>
                  You don't have permission to access this page. Only administrators can approve new user registrations.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Fetch pending users
  const { data: pendingUsers, isLoading, refetch } = useQuery({
    queryKey: ["/api/users/pending"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users/pending");
      
      if (!res.ok) {
        throw new Error("Failed to fetch pending users");
      }
      
      return res.json();
    }
  });
  
  // Filter users based on search term
  const filteredUsers = pendingUsers
    ? pendingUsers.filter((user: any) => {
        return (
          searchTerm === "" ||
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.companyName && user.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      })
    : [];
  
  // Approve user mutation
  const approveMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/users/${userId}/approve`, {});
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to approve user");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ["/api/users/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      toast({
        title: "User approved",
        description: `User ${data.name} has been approved successfully.`
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to approve user",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // State for rejection reason
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [userToReject, setUserToReject] = useState<number | null>(null);
  
  // Reject user mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, rejectionReason }: { id: number; rejectionReason: string }) => {
      const res = await apiRequest("POST", `/api/users/${id}/reject`, { rejectionReason });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to reject user");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ["/api/users/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      toast({
        title: "User rejected",
        description: `User ${data.name} has been rejected.`
      });
      
      // Reset rejection reason
      setRejectionReason("");
      setUserToReject(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to reject user",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleApprove = (userId: number) => {
    approveMutation.mutate(userId);
  };
  
  const handleRejectClick = (userId: number) => {
    setUserToReject(userId);
    setRejectDialogOpen(true);
  };
  
  const handleReject = () => {
    if (!userToReject || !rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejecting this user.",
        variant: "destructive"
      });
      return;
    }
    
    rejectMutation.mutate({ 
      id: userToReject, 
      rejectionReason 
    });
    setRejectDialogOpen(false);
  };
  
  const handleViewDetails = (user: any) => {
    setSelectedUser(user);
    setViewDetailsOpen(true);
  };

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mr-2">
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900">Pending Approvals</h1>
          </div>
          
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-primary-600" />
                User Registrations Awaiting Approval
              </CardTitle>
              <CardDescription>
                Review and approve or reject pending user registration requests.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name, email, username or company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {isLoading ? (
                <div className="py-10 text-center">
                  <LoaderIcon className="mx-auto h-8 w-8 text-primary-600 animate-spin" />
                  <p className="mt-2 text-gray-500">Loading pending registrations...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto h-12 w-12 text-gray-400 rounded-full bg-gray-100 flex items-center justify-center">
                    <CheckIcon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No pending registrations</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    There are no user registrations waiting for approval at this time.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Created Date</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            #{user.id}
                          </TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.companyName || '-'}</TableCell>
                          <TableCell>{user.companyType || '-'}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewDetails(user)}
                              >
                                View
                              </Button>
                              <Button 
                                variant="default" 
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleApprove(user.id)}
                                disabled={approveMutation.isPending}
                              >
                                {approveMutation.isPending && approveMutation.variables === user.id ? (
                                  <LoaderIcon className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckIcon className="h-4 w-4" />
                                )}
                              </Button>
                              <Button 
                                variant="default" 
                                size="sm"
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleRejectClick(user.id)}
                                disabled={rejectMutation.isPending}
                              >
                                {rejectMutation.isPending && rejectMutation.variables?.id === user.id ? (
                                  <LoaderIcon className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XIcon className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Rejection Reason Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject User Registration</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this user. This information will be shared with the user.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              {rejectMutation.isPending ? (
                <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XIcon className="mr-2 h-4 w-4" />
              )}
              Reject Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* User Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-blue-500" />
              User Registration Details
            </DialogTitle>
            <DialogDescription>
              Review the complete user information before making an approval decision.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-lg border border-blue-100/80">
                <div className="flex items-center">
                  <div className="bg-blue-100 h-12 w-12 rounded-full flex items-center justify-center text-blue-600 mr-4">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-medium text-lg text-gray-900">{selectedUser.name}</h3>
                    <p className="text-sm text-gray-500">Registration ID: #{selectedUser.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-blue-600">Submitted</div>
                  <div className="text-sm text-gray-500">{formatDate(selectedUser.createdAt)}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                    <UserIcon className="h-4 w-4 mr-1 text-blue-500" />
                    Account Information
                  </h3>
                  <div className="bg-gray-50/80 p-4 rounded-md border border-gray-100">
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">Username</div>
                        <div className="col-span-2 font-medium">{selectedUser.username}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">Full Name</div>
                        <div className="col-span-2 font-medium">{selectedUser.name}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">Email</div>
                        <div className="col-span-2 font-medium text-blue-600">{selectedUser.email}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">Registered</div>
                        <div className="col-span-2 font-medium">{formatDate(selectedUser.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                    <ClipboardCheckIcon className="h-4 w-4 mr-1 text-blue-500" />
                    Company Information
                  </h3>
                  <div className="bg-gray-50/80 p-4 rounded-md border border-gray-100">
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">Company Name</div>
                        <div className="col-span-2 font-medium">{selectedUser.companyName || '-'}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">Company Type</div>
                        <div className="col-span-2">
                          {selectedUser.companyType === 'business' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Business
                            </span>
                          ) : selectedUser.companyType === 'individual' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Individual
                            </span>
                          ) : '-'}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">
                          {selectedUser.companyType === 'business' ? 'Tax ID Number' : 'TCKN'}
                        </div>
                        <div className="col-span-2 font-medium">{selectedUser.taxIdNumber || '-'}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">Address</div>
                        <div className="col-span-2">{selectedUser.address || '-'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                  <Package className="h-4 w-4 mr-1 text-blue-500" />
                  Shipping Information
                </h3>
                <div className="bg-gray-50/80 p-4 rounded-md border border-gray-100">
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-sm text-gray-500">Monthly Shipment Capacity</div>
                      <div className="col-span-2 font-medium">
                        {selectedUser.shipmentCapacity ? `${selectedUser.shipmentCapacity} shipments per month` : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setViewDetailsOpen(false)}>
              Close
            </Button>
            <div className="flex space-x-2">
              <Button 
                variant="destructive" 
                onClick={() => {
                  if (selectedUser) {
                    handleRejectClick(selectedUser.id);
                    setViewDetailsOpen(false);
                  }
                }}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? (
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XIcon className="mr-2 h-4 w-4" />
                )}
                Reject
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  if (selectedUser) {
                    handleApprove(selectedUser.id);
                    setViewDetailsOpen(false);
                  }
                }}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckIcon className="mr-2 h-4 w-4" />
                )}
                Approve
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}