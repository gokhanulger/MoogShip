import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Search as SearchIcon, 
  ArrowUpDown, 
  FileDown,
  CheckCircle, 
  XCircle, 
  AlertCircle,
  User as UserIcon,
  Mail,
  MailCheck,
  RefreshCw
} from "lucide-react";
import { formatDate } from "@/lib/shipment-utils";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel, formatUserForExport } from "@/lib/export-utils";

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  balance: number;
  minimumBalance: number | null; // User-specific minimum balance limit in cents, null means use system default
  priceMultiplier: number;
  createdAt: string;
  isApproved: boolean;
  rejectionReason?: string | null;
  approvedBy?: number | null;
  approvedAt?: string | null;
  companyName?: string | null;
  companyType?: string | null;
  taxIdNumber?: string | null;
  address?: string | null;
  monthlyShipmentCapacity?: number | null;
  canAccessCarrierLabels?: boolean;
  isEmailVerified?: boolean;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: string | null;
}

interface UserTableProps {
  users: User[];
  isLoading: boolean;
  showPagination?: boolean;
  showApprovalActions?: boolean;
  onApprove?: (user: User) => void;
  onReject?: (user: User) => void;
  onEdit?: (userId: number) => void;
  onResetPassword?: (userId: number) => void;
  onResendVerification?: (userId: number) => void; // Added for email verification
  actions?: (user: User) => React.ReactNode;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}

export default function UserTable({
  users,
  isLoading,
  showPagination = true,
  showApprovalActions = false,
  onApprove,
  onReject,
  onEdit,
  onResetPassword,
  onResendVerification,
  actions,
  searchTerm = "",
  onSearchChange
}: UserTableProps) {
  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [sortedUsers, setSortedUsers] = useState<User[]>([]);
  const { toast } = useToast();
  
  // Constants
  const ITEMS_PER_PAGE = 10;
  
  // Sort users when dependencies change (search is handled server-side)
  useEffect(() => {
    if (!users) {
      setSortedUsers([]);
      return;
    }
    
    let sorted = [...users];
    
    // Apply sorting
    sorted.sort((a, b) => {
      let aValue = a[sortField as keyof User];
      let bValue = b[sortField as keyof User];
      
      // Date-specific handling
      if (sortField === "createdAt") {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }
      
      // Numeric handling for price multiplier and balance
      if (sortField === "priceMultiplier" || sortField === "balance") {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }
      
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    
    setSortedUsers(sorted);
  }, [users, sortField, sortDirection]);
  
  // Handle sort click
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  
  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      case "user":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };
  
  // Get approval status color
  const getApprovalStatusColor = (user: User) => {
    if (user.isApproved) {
      return "bg-green-100 text-green-800 hover:bg-green-200";
    } else if (user.rejectionReason) {
      return "bg-red-100 text-red-800 hover:bg-red-200";
    } else {
      return "bg-amber-100 text-amber-800 hover:bg-amber-200";
    }
  };
  
  // Get approval status text
  const getApprovalStatusText = (user: User) => {
    if (user.isApproved) {
      return "Approved";
    } else if (user.rejectionReason) {
      return "Rejected";
    } else {
      return "Pending";
    }
  };
  
  // Get approval status icon
  const getApprovalStatusIcon = (user: User) => {
    if (user.isApproved) {
      return <CheckCircle className="h-4 w-4 mr-1" />;
    } else if (user.rejectionReason) {
      return <XCircle className="h-4 w-4 mr-1" />;
    } else {
      return <AlertCircle className="h-4 w-4 mr-1" />;
    }
  };
  
  // Get verification status color
  const getVerificationStatusColor = (user: User) => {
    // Admin accounts bypass email verification
    if (user.role.toLowerCase() === "admin") {
      return "bg-purple-100 text-purple-800 hover:bg-purple-200";
    }
    if (user.isEmailVerified) {
      return "bg-green-100 text-green-800 hover:bg-green-200";
    } else {
      return "bg-amber-100 text-amber-800 hover:bg-amber-200";
    }
  };
  
  // Get verification status text
  const getVerificationStatusText = (user: User) => {
    // Admin accounts bypass email verification
    if (user.role.toLowerCase() === "admin") {
      return "Admin (Bypassed)";
    }
    return user.isEmailVerified ? "Verified" : "Pending";
  };
  
  // Get verification status icon
  const getVerificationStatusIcon = (user: User) => {
    // Admin accounts bypass email verification
    if (user.role.toLowerCase() === "admin") {
      return <UserIcon className="h-4 w-4 mr-1" />;
    }
    return user.isEmailVerified ? 
      <MailCheck className="h-4 w-4 mr-1" /> : 
      <Mail className="h-4 w-4 mr-1" />;
  };
  
  // Get current slice of sorted users for pagination
  const totalPages = Math.ceil(sortedUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = showPagination 
    ? sortedUsers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      )
    : sortedUsers;
    
  // Handle export to Excel
  const handleExport = () => {
    if (!users || users.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no users to export to Excel",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Format the users for export
      const formattedData = users.map(formatUserForExport);
      
      // Export to Excel
      exportToExcel(
        formattedData, 
        `users-${new Date().toISOString().split('T')[0]}`,
        "Users"
      );
      
      toast({
        title: "Export successful",
        description: "Users have been exported to Excel",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "An error occurred while exporting users",
        variant: "destructive",
      });
    }
  };
  
  // Loading skeletons
  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">
                  <Skeleton className="h-4 w-12" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array(5).fill(0).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-6 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      {/* Header with search and export */}
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-64">
          <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleExport}
          disabled={!users || users.length === 0}
          className="flex items-center gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800"
        >
          <FileDown className="h-7 w-7" />
        </Button>
      </div>
      
      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort("id")}
                >
                  ID
                  <ArrowUpDown
                    className={`ml-1 h-4 w-4 ${
                      sortField === "id" ? "opacity-100" : "opacity-40"
                    }`}
                  />
                </div>
              </TableHead>
              <TableHead>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort("name")}
                >
                  Name
                  <ArrowUpDown
                    className={`ml-1 h-4 w-4 ${
                      sortField === "name" ? "opacity-100" : "opacity-40"
                    }`}
                  />
                </div>
              </TableHead>
              <TableHead>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort("username")}
                >
                  Username
                  <ArrowUpDown
                    className={`ml-1 h-4 w-4 ${
                      sortField === "username" ? "opacity-100" : "opacity-40"
                    }`}
                  />
                </div>
              </TableHead>
              <TableHead>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort("email")}
                >
                  Email
                  <ArrowUpDown
                    className={`ml-1 h-4 w-4 ${
                      sortField === "email" ? "opacity-100" : "opacity-40"
                    }`}
                  />
                </div>
              </TableHead>
              <TableHead>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort("phone")}
                >
                  Phone
                  <ArrowUpDown
                    className={`ml-1 h-4 w-4 ${
                      sortField === "phone" ? "opacity-100" : "opacity-40"
                    }`}
                  />
                </div>
              </TableHead>
              <TableHead>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort("balance")}
                >
                  Balance
                  <ArrowUpDown
                    className={`ml-1 h-4 w-4 ${
                      sortField === "balance" ? "opacity-100" : "opacity-40"
                    }`}
                  />
                </div>
              </TableHead>
              <TableHead>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort("priceMultiplier")}
                >
                  Price Multiplier
                  <ArrowUpDown
                    className={`ml-1 h-4 w-4 ${
                      sortField === "priceMultiplier" ? "opacity-100" : "opacity-40"
                    }`}
                  />
                </div>
              </TableHead>
              <TableHead>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort("role")}
                >
                  Role
                  <ArrowUpDown
                    className={`ml-1 h-4 w-4 ${
                      sortField === "role" ? "opacity-100" : "opacity-40"
                    }`}
                  />
                </div>
              </TableHead>
              <TableHead>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort("isApproved")}
                >
                  Approval Status
                  <ArrowUpDown
                    className={`ml-1 h-4 w-4 ${
                      sortField === "isApproved" ? "opacity-100" : "opacity-40"
                    }`}
                  />
                </div>
              </TableHead>
              <TableHead>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort("isEmailVerified")}
                >
                  Email Verification
                  <ArrowUpDown
                    className={`ml-1 h-4 w-4 ${
                      sortField === "isEmailVerified" ? "opacity-100" : "opacity-40"
                    }`}
                  />
                </div>
              </TableHead>
              <TableHead className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.id}
                  </TableCell>
                  <TableCell>
                    {user.name}
                  </TableCell>
                  <TableCell>
                    {user.username}
                  </TableCell>
                  <TableCell>
                    <span className="max-w-[200px] truncate block">
                      {user.email}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.phone ? user.phone : "-"}
                  </TableCell>
                  <TableCell>
                    ${(user.balance / 100).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {user.priceMultiplier?.toFixed(2) || "1.00"}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getRoleBadgeColor(user.role)} flex w-fit items-center`}>
                      <UserIcon className="h-3 w-3 mr-1" />
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getApprovalStatusColor(user)} flex w-fit items-center`}>
                      {getApprovalStatusIcon(user)}
                      {getApprovalStatusText(user)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getVerificationStatusColor(user)} flex w-fit items-center`}>
                      {getVerificationStatusIcon(user)}
                      {getVerificationStatusText(user)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {showApprovalActions && !user.isApproved && !user.rejectionReason && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 px-2 text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => onApprove && onApprove(user)}
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span className="sr-only">Approve</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => onReject && onReject(user)}
                          >
                            <XCircle className="h-4 w-4" />
                            <span className="sr-only">Reject</span>
                          </Button>
                        </>
                      )}
                      
                      {/* Resend verification email button for regular users who haven't verified yet */}
                      {onResendVerification && 
                       user.role.toLowerCase() !== "admin" && 
                       !user.isEmailVerified && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => onResendVerification(user.id)}
                          title="Resend verification email"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span className="sr-only">Resend Verification</span>
                        </Button>
                      )}
                      
                      {actions && actions(user)}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={11} className="h-32 text-center">
                  {searchTerm ? (
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <SearchIcon className="h-8 w-8 mb-2 opacity-50" />
                      <p>No users match your search</p>
                      <Button 
                        variant="link" 
                        onClick={() => onSearchChange?.("")}
                        className="mt-2"
                      >
                        Clear search
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <UserIcon className="h-8 w-8 mb-2 opacity-50" />
                      <p>No users found</p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {/* First page */}
              {currentPage > 2 && (
                <PaginationItem>
                  <PaginationLink
                    onClick={() => setCurrentPage(1)}
                    className="cursor-pointer"
                  >
                    1
                  </PaginationLink>
                </PaginationItem>
              )}
              
              {/* Ellipsis if needed */}
              {currentPage > 3 && (
                <PaginationItem>
                  <span className="px-4">...</span>
                </PaginationItem>
              )}
              
              {/* Previous page if not on first */}
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationLink
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="cursor-pointer"
                  >
                    {currentPage - 1}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              {/* Current page */}
              <PaginationItem>
                <PaginationLink
                  isActive
                  className="cursor-pointer"
                >
                  {currentPage}
                </PaginationLink>
              </PaginationItem>
              
              {/* Next page if not on last */}
              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationLink
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="cursor-pointer"
                  >
                    {currentPage + 1}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              {/* Ellipsis if needed */}
              {currentPage < totalPages - 2 && (
                <PaginationItem>
                  <span className="px-4">...</span>
                </PaginationItem>
              )}
              
              {/* Last page if not already showing */}
              {currentPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationLink
                    onClick={() => setCurrentPage(totalPages)}
                    className="cursor-pointer"
                  >
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}