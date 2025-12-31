import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
// Temporarily remove useAuth import to fix error
import Layout from "@/components/layout";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter,
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
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
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  PlusCircle, 
  Wallet, 
  CreditCard, 
  Users, 
  Trash2, 
  AlertCircle,
  Loader2,
  UserPlus,
  UserCog,
  MoreHorizontal
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

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  balance: number;
  createdAt: string;
  companyName?: string;
  isApproved: boolean;
}

export default function UserManagementPage() {
  const { toast } = useToast();
  // Temporarily remove auth dependency
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddFundsDialogOpen, setIsAddFundsDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [addAmount, setAddAmount] = useState<number | "">("");
  const [description, setDescription] = useState("");
  
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

  // Fetch all users
  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      return res.json();
    }
  });

  // Remove this check for now - we'll handle admin access via routes

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
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
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

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      
      const res = await apiRequest("DELETE", `/api/users/${selectedUser.id}`, {});
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete user");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User deleted successfully",
        description: `User ${selectedUser?.name} has been deleted.`,
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

  const handleAddFunds = (userData: User) => {
    setSelectedUser(userData);
    setIsAddFundsDialogOpen(true);
  };

  const handleDeleteUser = (userData: User) => {
    setSelectedUser(userData);
    setIsDeleteConfirmOpen(true);
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
  
  const handleNewUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitNewUser = () => {
    if (!newUser.username || !newUser.name || !newUser.email || !newUser.password) {
      toast({
        title: "Missing required fields",
        description: "Please fill out all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    if (newUser.password !== newUser.confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }
    
    createUserMutation.mutate();
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">User Management</h1>
          <div className="flex items-center space-x-4">
            <Button onClick={() => setIsAddUserDialogOpen(true)} variant="default">
              <UserPlus className="mr-2 h-4 w-4" />
              Add New User
            </Button>
            <div className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              <span className="text-muted-foreground">
                {isLoading ? "Loading..." : isError ? "Error" : `${users?.length || 0} users`}
              </span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Manage users, account balances, and perform administrative actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-24 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading users...</span>
              </div>
            ) : isError ? (
              <div className="h-24 flex items-center justify-center text-destructive">
                <AlertCircle className="h-6 w-6 mr-2" />
                <span>Error loading users. Please try again.</span>
              </div>
            ) : !users?.length ? (
              <div className="h-24 flex items-center justify-center text-muted-foreground">
                <UserCog className="h-8 w-8 mb-2" />
                <span className="ml-2">No users found</span>
              </div>
            ) : (
              <Table>
                <TableCaption>A list of all users in the system.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.id}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.companyName || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "outline"}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.isApproved ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">
                            Approved
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                          <span>${(user.balance / 100).toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
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
                            <DropdownMenuItem onClick={() => handleAddFunds(user)}>
                              <CreditCard className="mr-2 h-4 w-4" />
                              Adjust Funds
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Funds Dialog */}
      <Dialog open={isAddFundsDialogOpen} onOpenChange={setIsAddFundsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
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

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
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
                  placeholder="Create a password"
                  value={newUser.password}
                  onChange={handleNewUserInputChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirmPassword" className="text-right">
                Confirm*
              </Label>
              <div className="col-span-3">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
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
                Company
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
              variant="outline" 
              onClick={() => setIsAddUserDialogOpen(false)}
            >
              Cancel
            </Button>
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

      {/* Delete User Confirmation */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the account
              for {selectedUser?.name} ({selectedUser?.email}) and remove all their data.
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
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}