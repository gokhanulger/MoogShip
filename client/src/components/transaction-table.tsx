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
  CreditCard,
  DollarSign,
  Package,
  AlertCircle
} from "lucide-react";
import { formatDate } from "@/lib/shipment-utils";
import { TransactionType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel, formatTransactionForExport } from "@/lib/export-utils";

interface Transaction {
  id: number;
  userId: number;
  amount: number;
  type: string;
  description: string;
  relatedShipmentId?: number;
  createdAt: string;
  balanceAfter?: number;
  formattedAmount?: string;
  formattedBalance?: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  showPagination?: boolean;
  title?: string;
}

export default function TransactionTable({
  transactions,
  isLoading,
  showPagination = true,
  title = "Transactions"
}: TransactionTableProps) {
  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const { toast } = useToast();
  
  // Constants
  const ITEMS_PER_PAGE = 10;
  
  // Filter and sort transactions when dependencies change
  useEffect(() => {
    if (!transactions) {
      setFilteredTransactions([]);
      return;
    }
    
    let filtered = [...transactions];
    
    // Apply search filter if searchTerm exists
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((transaction) => {
        return (
          transaction.description.toLowerCase().includes(lowerCaseSearchTerm) ||
          transaction.type.toLowerCase().includes(lowerCaseSearchTerm) ||
          (transaction.relatedShipmentId && 
            transaction.relatedShipmentId.toString().includes(lowerCaseSearchTerm))
        );
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField as keyof Transaction];
      let bValue = b[sortField as keyof Transaction];
      
      // Date-specific handling
      if (sortField === "createdAt") {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }
      
      // Handle undefined/null values
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    
    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, sortField, sortDirection]);
  
  // Handle sort click
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  
  // Helper to get transaction type badge color
  const getTypeColor = (type: string) => {
    switch (type) {
      case TransactionType.DEPOSIT:
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case TransactionType.PURCHASE:
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case TransactionType.REFUND:
        return "bg-amber-100 text-amber-800 hover:bg-amber-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };
  
  // Helper to get transaction icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case TransactionType.DEPOSIT:
        return <CreditCard className="h-4 w-4 mr-1" />;
      case TransactionType.PURCHASE:
        return <DollarSign className="h-4 w-4 mr-1" />;
      case TransactionType.REFUND:
        return <AlertCircle className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };
  
  // Get current slice of filtered transactions for pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = showPagination 
    ? filteredTransactions.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      )
    : filteredTransactions;
    
  // Handle export to Excel
  const handleExport = () => {
    if (!transactions || transactions.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no transactions to export to Excel",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Format the transactions for export
      const formattedData = transactions.map(transaction => ({
        ...formatTransactionForExport(transaction),
        'Balance After': transaction.formattedBalance || 
                        (transaction.balanceAfter !== undefined ? 
                         `$${(transaction.balanceAfter / 100).toFixed(2)}` : 
                         'N/A')
      }));
      
      // Export to Excel
      exportToExcel(
        formattedData, 
        `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`
      );
      
      toast({
        title: "Export successful",
        description: "Transactions have been exported to Excel",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "An error occurred while exporting transactions",
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
                  <Skeleton className="h-4 w-16" />
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
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleExport}
          disabled={!transactions || transactions.length === 0}
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
              <TableHead className="w-[100px]">
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
                  onClick={() => handleSort("createdAt")}
                >
                  Date
                  <ArrowUpDown
                    className={`ml-1 h-4 w-4 ${
                      sortField === "createdAt" ? "opacity-100" : "opacity-40"
                    }`}
                  />
                </div>
              </TableHead>
              <TableHead>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort("description")}
                >
                  Description
                  <ArrowUpDown
                    className={`ml-1 h-4 w-4 ${
                      sortField === "description" ? "opacity-100" : "opacity-40"
                    }`}
                  />
                </div>
              </TableHead>
              <TableHead>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort("type")}
                >
                  Type
                  <ArrowUpDown
                    className={`ml-1 h-4 w-4 ${
                      sortField === "type" ? "opacity-100" : "opacity-40"
                    }`}
                  />
                </div>
              </TableHead>
              <TableHead>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort("amount")}
                >
                  Amount
                  <ArrowUpDown
                    className={`ml-1 h-4 w-4 ${
                      sortField === "amount" ? "opacity-100" : "opacity-40"
                    }`}
                  />
                </div>
              </TableHead>
              <TableHead>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => handleSort("balanceAfter")}
                >
                  Balance After
                  <ArrowUpDown
                    className={`ml-1 h-4 w-4 ${
                      sortField === "balanceAfter" ? "opacity-100" : "opacity-40"
                    }`}
                  />
                </div>
              </TableHead>
              <TableHead>Shipment ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                    {transaction.id}
                  </TableCell>
                  <TableCell>
                    {formatDate(transaction.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className="max-w-md truncate block">
                      {transaction.description}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getTypeColor(transaction.type)} flex w-fit items-center`}>
                      {getTypeIcon(transaction.type)}
                      {transaction.type === TransactionType.DEPOSIT
                        ? "Deposit"
                        : transaction.type === TransactionType.PURCHASE
                        ? "Purchase"
                        : transaction.type === TransactionType.REFUND
                        ? "Refund"
                        : transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell className={
                    transaction.type === TransactionType.DEPOSIT
                      ? "text-green-600 font-medium"
                      : "text-red-600 font-medium"
                  }>
                    {transaction.type === TransactionType.DEPOSIT ? "+" : "-"}
                    ${Math.abs(transaction.amount / 100).toFixed(2)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {transaction.formattedBalance || 
                     (transaction.balanceAfter !== undefined ? 
                      `$${(transaction.balanceAfter / 100).toFixed(2)}` : 
                      'N/A')}
                  </TableCell>
                  <TableCell>
                    {transaction.relatedShipmentId ? (
                      <Badge variant="outline" className="flex items-center cursor-pointer hover:bg-primary/5">
                        <Package className="h-3 w-3 mr-1" />
                        SHIP-{String(transaction.relatedShipmentId).padStart(6, '0')}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">N/A</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  {searchTerm ? (
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <SearchIcon className="h-8 w-8 mb-2 opacity-50" />
                      <p>No transactions match your search</p>
                      <Button 
                        variant="link" 
                        onClick={() => setSearchTerm("")}
                        className="mt-2"
                      >
                        Clear search
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <CreditCard className="h-8 w-8 mb-2 opacity-50" />
                      <p>No transactions found</p>
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