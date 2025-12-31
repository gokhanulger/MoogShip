import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter,
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Wallet, 
  CreditCard, 
  Users, 
  Trash2, 
  AlertCircle,
  Loader2,
  UserPlus,
  UserCog,
  MoreHorizontal,
  ArrowLeftIcon,
  SearchIcon,
  CheckCircle,
  XCircle,
  User,
  Package,
  ClipboardCheck,
  X as XIcon,
  Check as CheckIcon,
  Calculator,
  DollarSign,
  Info as InfoIcon,
  Key as KeyIcon
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Redirect, Link } from "wouter";
import { formatDate } from "@/lib/shipment-utils";
import UserTable from "@/components/user-table";
import { useCallback, useState, useEffect } from "react";

// Custom hook for debounced search
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  balance: number;
  priceMultiplier: number; // Price multiplier specific for this user
  createdAt: string;
  companyName?: string;
  companyType?: string;
  taxIdNumber?: string;
  address?: string;
  shipmentCapacity?: number;
  isApproved: boolean;
  rejectionReason?: string;
  approvedBy?: number;
  approvedAt?: string;
}

export default function ManageUsers() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddFundsDialogOpen, setIsAddFundsDialogOpen] = useState(false);
  const [isSetBalanceDialogOpen, setIsSetBalanceDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isPriceMultiplierDialogOpen, setIsPriceMultiplierDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [addAmount, setAddAmount] = useState<number | "">("");
  const [newBalance, setNewBalance] = useState<string | "">("");
  const [description, setDescription] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  // Edit user form state
  const [editUserData, setEditUserData] = useState({
    username: "",
    name: "",
    email: "",
    role: "",
    companyName: "",
    companyType: "",
    taxIdNumber: "",
    address: "",
    shipmentCapacity: "",
    priceMultiplier: ""
  });
  
  // New user form state
  const [newUser, setNewUser] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
    companyName: "",
  });

  // Fetch all users with server-side search
  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/users", debouncedSearchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearchTerm && debouncedSearchTerm.trim() !== '') {
        params.append('search', debouncedSearchTerm.trim());
      }
      
      const url = `/api/users${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await apiRequest("GET", url);
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      return res.json();
    },
    // Refresh user data every 5 seconds to keep balance up to date
    refetchInterval: 5000
  });
  
  // Create separate lists for approved, pending, and rejected users
  const approvedUsers = users
    ? users.filter((user: User) => user.isApproved === true)
    : [];
  
  const pendingUsers = users
    ? users.filter((user: User) => user.isApproved === false && !user.rejectionReason)
    : [];
    
  const rejectedUsers = users
    ? users.filter((user: User) => user.isApproved === false && user.rejectionReason)
    : [];
    
  // Filter users based on search term and current tab
  const [activeTab, setActiveTab] = useState<'approved' | 'pending' | 'rejected'>('approved');
  
  const filteredUsers = (() => {
    switch (activeTab) {
      case 'approved':
        return approvedUsers;
      case 'pending':
        return pendingUsers;
      case 'rejected':
        return rejectedUsers;
      default:
        return approvedUsers;
    }
  })();

  // Approve user mutation
  const approveUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      
      const res = await apiRequest("POST", `/api/users/${selectedUser.id}/approve`, {});
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to approve user");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User approved successfully",
        description: `${selectedUser?.name}'s account has been approved.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsApproveDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve user",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Reject user mutation
  const rejectUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !rejectionReason) return;
      
      const res = await apiRequest("POST", `/api/users/${selectedUser.id}/reject`, {
        rejectionReason: rejectionReason
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to reject user");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User rejected",
        description: `${selectedUser?.name}'s account has been rejected.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject user",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Add funds mutation
  const addFundsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !addAmount || typeof addAmount !== "number") return;
      
      const defaultDescription = addAmount > 0 
        ? `Admin fund addition to ${selectedUser.username}`
        : `Admin fund deduction from ${selectedUser.username}`;
      
      const res = await apiRequest("POST", "/api/balance/add", { 
        userId: selectedUser.id,
        amount: addAmount,
        description: description || defaultDescription
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add funds");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Balance adjusted successfully",
        description: `${selectedUser?.name}'s balance has been updated.`,
      });
      // Invalidate all related queries to ensure balance is updated everywhere
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      // Immediately refetch users to update balance display
      refetch();
      setIsAddFundsDialogOpen(false);
      setAddAmount("");
      setDescription("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to adjust balance",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Set balance mutation
  const setBalanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || newBalance === "") return;
      
      const res = await apiRequest("POST", "/api/balance/set", { 
        userId: selectedUser.id,
        balance: parseFloat(newBalance),
        description: description || `Admin balance adjustment for ${selectedUser.username}`
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to set balance");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Balance updated successfully",
        description: `${selectedUser?.name}'s balance has been set to ${data.formattedBalance}.`,
      });
      // Invalidate all related queries to ensure balance is updated everywhere
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      // Immediately refetch users to update balance display
      refetch();
      setIsSetBalanceDialogOpen(false);
      setNewBalance("");
      setDescription("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to set balance",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async () => {
      if (newUser.password !== newUser.confirmPassword) {
        throw new Error("Passwords do not match");
      }
      
      const userData = {
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        companyName: newUser.companyName,
        isApproved: true // Auto-approve users created by admin
      };
      
      const res = await apiRequest("POST", "/api/users/create", userData);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create user");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User created successfully",
        description: `User ${newUser.name} has been created.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddUserDialogOpen(false);
      setNewUser({
        username: "",
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "user",
        companyName: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create user",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      
      const userData = {
        username: editUserData.username,
        name: editUserData.name,
        email: editUserData.email,
        role: editUserData.role,
        companyName: editUserData.companyName || null,
        companyType: editUserData.companyType || null,
        taxIdNumber: editUserData.taxIdNumber || null,
        address: editUserData.address || null,
        shipmentCapacity: editUserData.shipmentCapacity ? parseInt(editUserData.shipmentCapacity) : null,
        priceMultiplier: editUserData.priceMultiplier ? parseFloat(editUserData.priceMultiplier) : 1
      };
      
      const res = await apiRequest("PATCH", `/api/users/${selectedUser.id}`, userData);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update user");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User updated successfully",
        description: `${selectedUser?.name}'s information has been updated.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditUserDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update user",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update price multiplier mutation (dedicated)
  const updatePriceMultiplierMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      
      const multiplier = parseFloat(editUserData.priceMultiplier);
      if (isNaN(multiplier) || multiplier <= 0) {
        throw new Error("Please enter a valid positive number for the price multiplier");
      }
      
      console.log(`Updating price multiplier for user ${selectedUser.id} to:`, multiplier);
      
      // Use a more complete user data update to ensure all required fields are sent
      const userData = {
        username: selectedUser.username,
        name: selectedUser.name,
        email: selectedUser.email,
        role: selectedUser.role,
        companyName: selectedUser.companyName || null,
        companyType: selectedUser.companyType || null,
        taxIdNumber: selectedUser.taxIdNumber || null,
        address: selectedUser.address || null,
        priceMultiplier: multiplier // Make sure this is a number, not a string
      };
      
      const res = await apiRequest("PATCH", `/api/users/${selectedUser.id}`, userData);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update price multiplier");
      }
      
      // Get the update response first
      const updateRes = await res.clone().json();
      console.log("Update response:", updateRes);
      
      // Double-check with a separate GET request to make sure we have the latest data
      const userRes = await apiRequest("GET", `/api/users/${selectedUser.id}`);
      if (!userRes.ok) {
        throw new Error("Updated price multiplier but failed to fetch updated user data");
      }
      
      const fetchedUser = await userRes.json();
      console.log("Fetched user after update:", fetchedUser);
      
      return fetchedUser; // Return the freshly fetched user data
    },
    onSuccess: async (updatedUser) => {
      // Check the multiplier value that was updated
      console.log("Successfully updated user with multiplier:", updatedUser.priceMultiplier);
      
      // Convert to number explicitly to ensure proper formatting
      const priceMultiplierValue = typeof updatedUser.priceMultiplier === 'number' 
        ? updatedUser.priceMultiplier 
        : parseFloat(String(updatedUser.priceMultiplier));
      
      toast({
        title: "Price multiplier updated",
        description: `${updatedUser.name}'s price multiplier has been updated to ${priceMultiplierValue.toFixed(2)}.`,
      });
      
      // Update the cache with the updated user data
      queryClient.setQueryData(["/api/users"], (oldData: User[] | undefined) => {
        if (!oldData) return oldData;
        
        return oldData.map(user => 
          user.id === updatedUser.id ? updatedUser : user
        );
      });
      
      setIsPriceMultiplierDialogOpen(false);
      
      // Refetch user list to ensure everything is up to date
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update price multiplier",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      
      if (!newPassword || newPassword !== confirmNewPassword) {
        throw new Error(newPassword ? "Passwords do not match" : "Password is required");
      }
      
      const res = await apiRequest("POST", `/api/users/${selectedUser.id}/reset-password`, {
        newPassword: newPassword
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to reset password");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset successfully",
        description: `${selectedUser?.name}'s password has been reset.`,
      });
      setIsResetPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmNewPassword("");
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reset password",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      
      const res = await apiRequest("DELETE", `/api/users/${selectedUser.id}`);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete user");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User deleted successfully",
        description: `${selectedUser?.name} has been removed from the system.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDeleteConfirmOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Event handlers
  const handleAddFunds = (userData: User) => {
    setSelectedUser(userData);
    setAddAmount("");
    setDescription("");
    setIsAddFundsDialogOpen(true);
  };
  
  const handleSetBalance = (userData: User) => {
    setSelectedUser(userData);
    setNewBalance(""); // Start with empty field to prevent auto-fill interference
    setDescription("");
    setIsSetBalanceDialogOpen(true);
  };
  
  const handleDeleteUser = (userData: User) => {
    setSelectedUser(userData);
    setIsDeleteConfirmOpen(true);
  };
  
  const handleApproveUser = (userData: User) => {
    setSelectedUser(userData);
    setIsApproveDialogOpen(true);
  };
  
  const handleRejectUser = (userData: User) => {
    setSelectedUser(userData);
    setRejectionReason("");
    setIsRejectDialogOpen(true);
  };
  
  const handleViewDetails = (userData: User) => {
    setSelectedUser(userData);
    setIsViewDetailsOpen(true);
  };
  
  const handleEditUser = (userData: User) => {
    setSelectedUser(userData);
    setEditUserData({
      username: userData.username,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      companyName: userData.companyName || "",
      companyType: userData.companyType || "",
      taxIdNumber: userData.taxIdNumber || "",
      address: userData.address || "",
      shipmentCapacity: userData.shipmentCapacity ? String(userData.shipmentCapacity) : "",
      priceMultiplier: userData.priceMultiplier ? String(userData.priceMultiplier) : "1.00"
    });
    setIsEditUserDialogOpen(true);
  };
  
  const handleResetPassword = (userData: User) => {
    setSelectedUser(userData);
    setNewPassword("");
    setConfirmNewPassword("");
    setIsResetPasswordDialogOpen(true);
  };
  
  const handleOpenPriceMultiplierDialog = async (userData: User) => {
    try {
      setSelectedUser(userData);
      
      // Refresh user data to make sure we have the latest price multiplier
      const res = await apiRequest("GET", `/api/users/${userData.id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch user data");
      }
      
      const refreshedList = await apiRequest("GET", "/api/users").then(r => r.json());
      
      if (refreshedList) {
        const refreshedUser = refreshedList?.find((u: User) => u.id === userData.id) || userData;
        
        setEditUserData({
          ...editUserData,
          priceMultiplier: refreshedUser.priceMultiplier 
            ? refreshedUser.priceMultiplier.toString() 
            : "1.00"
        });
      } else {
        // Fall back to existing data if refresh fails
        setEditUserData({
          ...editUserData,
          priceMultiplier: userData.priceMultiplier 
            ? userData.priceMultiplier.toString() 
            : "1.00" 
        });
      }
      
      setIsPriceMultiplierDialogOpen(true);
      
    } catch (error) {
      console.error("Error fetching updated user data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch latest user data",
        variant: "destructive",
      });
    }
  };
  
  const handleNewUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };
  
  const handleEditUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditUserData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmitAddFunds = () => {
    if (!addAmount || typeof addAmount !== "number" || addAmount === 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount (cannot be zero).",
        variant: "destructive",
      });
      return;
    }
    
    addFundsMutation.mutate();
  };
  
  const handleSubmitSetBalance = () => {
    setBalanceMutation.mutate();
  };
  
  const handleSubmitNewUser = () => {
    createUserMutation.mutate();
  };
  
  const handleSubmitResetPassword = () => {
    resetPasswordMutation.mutate();
  };
  
  // Check if user is authenticated and has admin role
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user");
      if (!res.ok) throw new Error("Failed to fetch current user");
      return await res.json();
    },
  });
  
  // Redirect to home if not admin
  if (!isUserLoading && (!currentUser || currentUser.role !== "admin")) {
    return <Redirect to="/" />;
  }

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">User Management</h1>
          </div>
          <div className="flex items-center">
            <div className="text-sm text-muted-foreground mr-4">
              {isLoading ? "Loading..." : isError ? "Error" : `${users?.length || 0} users`}
            </div>
          </div>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Manage users, approve/reject registrations, and control user balances.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-6">
              <div className="relative w-72">
                <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button onClick={() => setIsAddUserDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
            
            <Tabs
              defaultValue="approved"
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'approved' | 'pending' | 'rejected')}
              className="w-full"
            >
              <TabsList className="grid grid-cols-3 w-[400px]">
                <TabsTrigger value="approved" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Approved
                  <Badge variant="secondary" className="ml-1">{approvedUsers.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Pending
                  <Badge variant="secondary" className="ml-1">{pendingUsers.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="rejected" className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Rejected
                  <Badge variant="secondary" className="ml-1">{rejectedUsers.length}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <UserTable 
              users={filteredUsers} 
              isLoading={isLoading} 
              showPagination={true}
              showApprovalActions={activeTab === 'pending'}
              onApprove={handleApproveUser}
              onReject={handleRejectUser}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onEdit={(userId) => {
                const user = users?.find((u: User) => u.id === userId);
                if (user) handleEditUser(user);
              }}
              onResetPassword={(userId) => {
                const user = users?.find((u: User) => u.id === userId);
                if (user) handleResetPassword(user);
              }}
              actions={(user) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                      <User className="mr-2 h-4 w-4 text-blue-500" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditUser(user)}>
                      <UserCog className="mr-2 h-4 w-4 text-indigo-500" />
                      Edit User
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenPriceMultiplierDialog(user)}>
                      <DollarSign className="mr-2 h-4 w-4 text-blue-500" />
                      Edit Price Multiplier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                      <KeyIcon className="mr-2 h-4 w-4 text-orange-500" />
                      Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {!user.isApproved && (
                      <>
                        <DropdownMenuItem onClick={() => handleApproveUser(user)}>
                          <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                          Approve User
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRejectUser(user)}>
                          <XCircle className="mr-2 h-4 w-4 text-amber-500" />
                          Reject User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={() => handleAddFunds(user)}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Adjust Funds
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSetBalance(user)}>
                      <Calculator className="mr-2 h-4 w-4" />
                      Set Balance
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteUser(user)}
                      disabled={user.role === "admin" && user.id === 1} // Prevent deleting main admin
                      className={user.role === "admin" && user.id === 1 ? "text-muted-foreground" : "text-destructive"}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          </CardContent>
        </Card>
      </div>

      {/* Add Funds Dialog */}
      <Dialog open={isAddFundsDialogOpen} onOpenChange={setIsAddFundsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adjust User Funds</DialogTitle>
            <DialogDescription>
              Add or deduct funds from {selectedUser?.name}'s account balance. Use positive values to add funds, negative values to deduct.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                User
              </Label>
              <div className="col-span-3">
                <Input id="name" value={selectedUser?.name || ""} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currentBalance" className="text-right">
                Current Balance
              </Label>
              <div className="col-span-3">
                <Input 
                  id="currentBalance" 
                  value={`$${((selectedUser?.balance || 0) / 100).toFixed(2)}`} 
                  readOnly 
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <div className="col-span-3">
                <Input
                  id="amount"
                  placeholder="50.00 or -50.00"
                  type="number"
                  step="0.01"
                  value={addAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAddAmount(value === "" ? "" : parseFloat(value));
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter positive value to add, negative value to deduct
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <div className="col-span-3">
                <Input
                  id="description"
                  placeholder="Reason for adjusting funds"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              onClick={handleSubmitAddFunds}
              disabled={addFundsMutation.isPending}
            >
              {addFundsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Adjust Funds
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Balance Dialog */}
      <Dialog open={isSetBalanceDialogOpen} onOpenChange={setIsSetBalanceDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set User Balance</DialogTitle>
            <DialogDescription>
              Directly set {selectedUser?.name}'s account balance to a specific amount.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="userName" className="text-right">
                User
              </Label>
              <div className="col-span-3">
                <Input id="userName" value={selectedUser?.name || ""} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currentBalanceView" className="text-right">
                Current Balance
              </Label>
              <div className="col-span-3">
                <Input 
                  id="currentBalanceView" 
                  value={`$${((selectedUser?.balance || 0) / 100).toFixed(2)}`} 
                  readOnly 
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newBalance" className="text-right">
                New Balance
              </Label>
              <div className="col-span-3">
                <Input
                  id="newBalance"
                  placeholder="-500.00"
                  type="number"
                  step="0.01"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="balanceDescription" className="text-right">
                Description
              </Label>
              <div className="col-span-3">
                <Input
                  id="balanceDescription"
                  placeholder="Reason for adjusting balance"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              onClick={handleSubmitSetBalance}
              disabled={setBalanceMutation.isPending}
            >
              {setBalanceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Set Balance
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system. Users created by admin are automatically approved.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username*
              </Label>
              <div className="col-span-3">
                <Input
                  id="username"
                  name="username"
                  placeholder="Username for login"
                  value={newUser.username}
                  onChange={handleNewUserInputChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Full Name*
              </Label>
              <div className="col-span-3">
                <Input
                  id="name"
                  name="name"
                  placeholder="User's full name"
                  value={newUser.name}
                  onChange={handleNewUserInputChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email*
              </Label>
              <div className="col-span-3">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUser.email}
                  onChange={handleNewUserInputChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password*
              </Label>
              <div className="col-span-3">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={handleNewUserInputChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirmPassword" className="text-right">
                Confirm Password*
              </Label>
              <div className="col-span-3">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newUser.confirmPassword}
                  onChange={handleNewUserInputChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <div className="col-span-3">
                <select 
                  id="role"
                  name="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="companyName" className="text-right">
                Company Name
              </Label>
              <div className="col-span-3">
                <Input
                  id="companyName"
                  name="companyName"
                  placeholder="Company name (optional)"
                  value={newUser.companyName}
                  onChange={handleNewUserInputChange}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              onClick={handleSubmitNewUser}
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve User Dialog */}
      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve <strong>{selectedUser?.name}</strong>'s account? This will allow them to log in and use the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approveUserMutation.mutate()}
              className="bg-green-600 text-white hover:bg-green-700"
              disabled={approveUserMutation.isPending}
            >
              {approveUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve User
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject User Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject User Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting <strong>{selectedUser?.name}</strong>'s application.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rejectionReason" className="text-right">
                Reason*
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="rejectionReason"
                  placeholder="Provide a detailed explanation for the rejection"
                  value={rejectionReason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectionReason(e.target.value)}
                  className="min-h-[100px]"
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              type="submit" 
              onClick={() => rejectUserMutation.mutate()}
              disabled={rejectUserMutation.isPending || !rejectionReason}
            >
              {rejectUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user <strong>{selectedUser?.name}</strong> and remove all their data from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete User
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{selectedUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newPassword" className="text-right">
                New Password*
              </Label>
              <div className="col-span-3">
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirmNewPassword" className="text-right">
                Confirm Password*
              </Label>
              <div className="col-span-3">
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              onClick={handleSubmitResetPassword}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <KeyIcon className="mr-2 h-4 w-4" />
                  Reset Password
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Price Multiplier Dialog */}
      <Dialog open={isPriceMultiplierDialogOpen} onOpenChange={setIsPriceMultiplierDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Price Multiplier</DialogTitle>
            <DialogDescription>
              Set the price multiplier for <strong>{selectedUser?.name}</strong>. This multiplier affects how much this user is charged for shipments compared to the base Shipentegra price.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="userNameDisplay" className="text-right">
                User
              </Label>
              <div className="col-span-3">
                <Input id="userNameDisplay" value={selectedUser?.name || ""} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priceMultiplier" className="text-right">
                Price Multiplier
              </Label>
              <div className="col-span-3">
                <Input
                  id="priceMultiplier"
                  placeholder="1.00"
                  type="number"
                  min="0.01"
                  step="0.01"
                  name="priceMultiplier"
                  value={editUserData.priceMultiplier}
                  onChange={handleEditUserInputChange}
                />
              </div>
            </div>
            <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
              <InfoIcon className="inline-block h-4 w-4 mr-2" />
              Example: A multiplier of 1.45 means the user will be charged 145% of the base Shipentegra price.
              The default value is 1.45 (45% markup).
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              onClick={() => updatePriceMultiplierMutation.mutate()}
              disabled={updatePriceMultiplierMutation.isPending}
            >
              {updatePriceMultiplierMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Update Multiplier
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Detailed information about {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                  {selectedUser?.name?.charAt(0) || "U"}
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold">{selectedUser?.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
                </div>
              </div>
              <Badge variant={selectedUser?.role === 'admin' ? 'destructive' : 'default'}>
                {selectedUser?.role}
              </Badge>
            </div>
            
            <Separator className="my-4" />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Username</h4>
                <p className="text-sm">{selectedUser?.username}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Balance</h4>
                <p className="text-sm">${((selectedUser?.balance || 0) / 100).toFixed(2)}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Price Multiplier</h4>
                <p className="text-sm">{selectedUser?.priceMultiplier?.toFixed(2) || "1.00"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Created At</h4>
                <p className="text-sm">{selectedUser?.createdAt && formatDate(selectedUser.createdAt)}</p>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <h4 className="text-sm font-medium mb-2">Company Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Company Name</h4>
                <p className="text-sm">{selectedUser?.companyName || "-"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Company Type</h4>
                <p className="text-sm">{selectedUser?.companyType || "-"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Tax ID</h4>
                <p className="text-sm">{selectedUser?.taxIdNumber || "-"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Shipment Capacity</h4>
                <p className="text-sm">{selectedUser?.shipmentCapacity || "-"}</p>
              </div>
            </div>
            
            {selectedUser?.address && (
              <>
                <Separator className="my-4" />
                <div>
                  <h4 className="text-sm font-medium mb-1">Address</h4>
                  <p className="text-sm whitespace-pre-line">{selectedUser.address}</p>
                </div>
              </>
            )}
            
            {selectedUser?.isApproved === false && (
              <>
                <Separator className="my-4" />
                <div>
                  <h4 className="text-sm font-medium mb-1">Approval Status</h4>
                  <Badge variant={selectedUser.rejectionReason ? "destructive" : "warning"}>
                    {selectedUser.rejectionReason ? "Rejected" : "Pending Approval"}
                  </Badge>
                </div>
                
                {selectedUser.rejectionReason && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium mb-1">Rejection Reason</h4>
                    <p className="text-sm text-destructive">{selectedUser.rejectionReason}</p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter className="flex justify-between items-center">
            <div>
              {!selectedUser?.isApproved && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => {
                      setIsViewDetailsOpen(false);
                      handleApproveUser(selectedUser);
                    }}
                  >
                    <CheckIcon className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setIsViewDetailsOpen(false);
                      handleRejectUser(selectedUser);
                    }}
                  >
                    <XIcon className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
            <Button
              onClick={() => {
                setIsViewDetailsOpen(false);
                handleEditUser(selectedUser!);
              }}
            >
              <UserCog className="h-4 w-4 mr-2" />
              Edit User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update information for {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-username" className="text-right">
                Username*
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit-username"
                  name="username"
                  value={editUserData.username}
                  onChange={handleEditUserInputChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Full Name*
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit-name"
                  name="name"
                  value={editUserData.name}
                  onChange={handleEditUserInputChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">
                Email*
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  value={editUserData.email}
                  onChange={handleEditUserInputChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">
                Role
              </Label>
              <div className="col-span-3">
                <select
                  id="edit-role"
                  name="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editUserData.role}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, role: e.target.value }))}
                  disabled={selectedUser?.id === 1 && selectedUser.role === 'admin'} // Prevent changing role for main admin
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-companyName" className="text-right">
                Company Name
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit-companyName"
                  name="companyName"
                  value={editUserData.companyName}
                  onChange={handleEditUserInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-companyType" className="text-right">
                Company Type
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit-companyType"
                  name="companyType"
                  value={editUserData.companyType}
                  onChange={handleEditUserInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-taxIdNumber" className="text-right">
                Tax ID
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit-taxIdNumber"
                  name="taxIdNumber"
                  value={editUserData.taxIdNumber}
                  onChange={handleEditUserInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-shipmentCapacity" className="text-right">
                Shipment Capacity
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit-shipmentCapacity"
                  name="shipmentCapacity"
                  type="number"
                  value={editUserData.shipmentCapacity}
                  onChange={handleEditUserInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-priceMultiplier" className="text-right">
                Price Multiplier
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit-priceMultiplier"
                  name="priceMultiplier"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editUserData.priceMultiplier}
                  onChange={handleEditUserInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-address" className="text-right">
                Address
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="edit-address"
                  name="address"
                  value={editUserData.address}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                    setEditUserData(prev => ({ ...prev, address: e.target.value }))
                  }
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditUserDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={() => updateUserMutation.mutate()}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <UserCog className="mr-2 h-4 w-4" />
                  Update User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}