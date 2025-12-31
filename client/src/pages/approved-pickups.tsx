import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PickupStatus } from "@shared/schema";
import { Truck, CheckCircle, AlertTriangle, CalendarCheck, Printer, Search, Info, X } from "lucide-react";
import Sidebar from "@/components/sidebar";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ApprovedPickupsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedPickupId, setSelectedPickupId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const itemsPerPage = 10;

  // Fetch approved pickup requests
  const {
    data: approvedPickups = [],
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ["/api/pickup-requests/approved"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pickup-requests/approved");
      return res.json();
    },
  });

  // Fetch pickup details when a pickup is selected
  const {
    data: pickupDetails,
    isLoading: isLoadingDetails,
    error: detailsError,
  } = useQuery({
    queryKey: ["/api/pickup-requests", selectedPickupId, "details"],
    queryFn: async () => {
      if (!selectedPickupId) return null;
      const res = await apiRequest("GET", `/api/pickup-requests/${selectedPickupId}/details`);
      return res.json();
    },
    enabled: !!selectedPickupId,
  });

  // Mark pickup as completed
  const completePickupMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      const res = await apiRequest("PUT", `/api/pickup-requests/${id}/status`, {
        status: PickupStatus.COMPLETED,
        notes,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Pickup marked as completed",
        description: "The pickup request has been marked as completed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pickup-requests/approved"] });
      setDetailsOpen(false);
    },
    onError: (err) => {
      toast({
        title: "Failed to update pickup status",
        description: `Error: ${err.message}`,
        variant: "destructive",
      });
    },
  });

  // Print pickup manifest
  const handlePrintManifest = (pickupId: number) => {
    window.open(`/api/pickup-requests/${pickupId}/manifest`, "_blank");
  };

  // Handle viewing pickup details
  const handleViewDetails = (pickupId: number) => {
    setSelectedPickupId(pickupId);
    setDetailsOpen(true);
  };
  
  // Handle completing pickup
  const handleCompletePickup = (notes?: string) => {
    if (selectedPickupId) {
      completePickupMutation.mutate({ id: selectedPickupId, notes });
    }
  };

  // Filter pickups by search term
  const filteredPickups = approvedPickups.filter((pickup: any) => {
    const searchLower = search.toLowerCase();
    return (
      pickup.id.toString().includes(searchLower) ||
      (pickup.pickupNotes && pickup.pickupNotes.toLowerCase().includes(searchLower)) ||
      pickup.user?.name?.toLowerCase().includes(searchLower) ||
      pickup.user?.companyName?.toLowerCase().includes(searchLower) ||
      (pickup.pickupAddress && pickup.pickupAddress.toLowerCase().includes(searchLower))
    );
  });

  // Pagination
  const pageCount = Math.ceil(filteredPickups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPickups = filteredPickups.slice(startIndex, endIndex);

  const renderPagination = () => {
    if (pageCount <= 1) return null;
    
    return (
      <Pagination className="mt-4 border rounded p-1 flex justify-center">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
              isActive={currentPage > 1}
            />
          </PaginationItem>
          
          {Array.from({ length: pageCount }).map((_, i) => (
            <PaginationItem key={i}>
              <PaginationLink
                onClick={() => setCurrentPage(i + 1)}
                isActive={currentPage === i + 1}
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, pageCount))} 
              isActive={currentPage < pageCount}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  // Format date for display
  const formatPickupDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };
  
  // Status badge colors
  const getStatusBadge = (status: PickupStatus) => {
    switch (status) {
      case PickupStatus.PENDING:
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case PickupStatus.SCHEDULED:
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case PickupStatus.COMPLETED:
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Completed</Badge>;
      case PickupStatus.CANCELLED:
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden pt-16 md:pt-0 md:pl-64">
        <div className="container mx-auto py-6 flex-1 overflow-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Approved Pickups</h1>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pickups..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 max-w-[250px]"
                />
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">
                <div className="flex items-center">
                  <CalendarCheck className="mr-2 h-5 w-5" />
                  Approved Pickup Requests
                </div>
              </CardTitle>
              <CardDescription>
                Manage approved pickup requests and print manifests for courier pickup.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="overflow-auto max-h-[calc(100vh-260px)]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead className="w-12">ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Requested On</TableHead>
                        <TableHead>Packages</TableHead>
                        <TableHead>Pickup Address</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-24">
                            Loading approved pickups...
                          </TableCell>
                        </TableRow>
                      ) : filteredPickups.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-24">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                              <Truck className="h-12 w-12 mb-2 opacity-30" />
                              <p>No approved pickup requests found</p>
                              {search && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="mt-2"
                                  onClick={() => setSearch("")}
                                >
                                  Clear search
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentPickups.map((pickup: any) => (
                          <TableRow key={pickup.id}>
                            <TableCell className="font-medium">{pickup.id}</TableCell>
                            <TableCell>
                              {pickup.user?.companyName || pickup.user?.name || "Unknown"}
                            </TableCell>
                            <TableCell>{formatPickupDate(pickup.requestDate)}</TableCell>
                            <TableCell>{pickup.shipmentCount || "N/A"}</TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help">
                                      {pickup.pickupAddress || "No address provided"}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[300px]">
                                    <p>{pickup.pickupAddress || "No address provided"}</p>
                                    {pickup.pickupCity && (
                                      <p>{pickup.pickupCity}{pickup.pickupPostalCode && `, ${pickup.pickupPostalCode}`}</p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell>{getStatusBadge(pickup.pickupStatus)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePrintManifest(pickup.id)}
                                  className="h-8 px-2 text-blue-700 border-blue-200 hover:bg-blue-50"
                                >
                                  <Printer className="h-4 w-4" />
                                  <span className="sr-only sm:not-sr-only sm:ml-2">Print</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(pickup.id)}
                                  className="h-8 px-2"
                                >
                                  <Info className="h-4 w-4" />
                                  <span className="sr-only sm:not-sr-only sm:ml-2">Details</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              {renderPagination()}
            </CardContent>
          </Card>

          {/* Pickup Details Dialog */}
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Truck className="mr-2 h-5 w-5" /> 
                  Pickup Request Details
                  {pickupDetails?.pickupRequest && (
                    <Badge className="ml-2" variant="outline">
                      ID: {pickupDetails.pickupRequest.id}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  View details for this approved pickup request and mark as completed when done.
                </DialogDescription>
              </DialogHeader>
              
              {isLoadingDetails ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : detailsError ? (
                <div className="flex flex-col items-center justify-center h-40 text-red-500">
                  <AlertTriangle className="h-8 w-8 mb-2" />
                  <p>Error loading pickup details</p>
                </div>
              ) : pickupDetails ? (
                <ScrollArea className="flex-1 pr-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Customer Information</h4>
                      <div className="bg-muted/50 p-3 rounded-md">
                        <p className="font-medium">{pickupDetails.user?.name}</p>
                        {pickupDetails.user?.companyName && (
                          <p className="text-sm text-muted-foreground">{pickupDetails.user.companyName}</p>
                        )}
                        <p className="text-sm mt-1">{pickupDetails.user?.email}</p>
                        <p className="text-sm">{pickupDetails.user?.phone || "No phone provided"}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Pickup Location</h4>
                      <div className="bg-muted/50 p-3 rounded-md">
                        <p>{pickupDetails.pickupRequest?.pickupAddress || "No address provided"}</p>
                        {pickupDetails.pickupRequest?.pickupCity && (
                          <p>
                            {pickupDetails.pickupRequest.pickupCity}
                            {pickupDetails.pickupRequest?.pickupPostalCode && `, ${pickupDetails.pickupRequest.pickupPostalCode}`}
                          </p>
                        )}
                        {pickupDetails.pickupRequest?.pickupNotes && (
                          <div className="mt-2 text-sm">
                            <p className="font-medium">Notes:</p>
                            <p className="text-muted-foreground">{pickupDetails.pickupRequest.pickupNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <h4 className="text-sm font-medium mb-2">Shipments ({pickupDetails.shipments?.length || 0})</h4>
                  <div className="border rounded-md overflow-hidden mb-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">ID</TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Weight</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pickupDetails.shipments?.length > 0 ? (
                          pickupDetails.shipments.map((shipment: any) => (
                            <TableRow key={shipment.id}>
                              <TableCell>{shipment.id}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{shipment.receiverName}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                                    {shipment.receiverAddress || "No address"}, {shipment.receiverCity || ""}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>{shipment.serviceType || "Standard"}</TableCell>
                              <TableCell>
                                {shipment.weight ? `${shipment.weight} kg` : "N/A"}
                                {shipment.pieceCount > 1 && ` (${shipment.pieceCount} pcs)`}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    shipment.status === "pending"
                                      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                      : shipment.status === "approved"
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                  }
                                >
                                  {shipment.status === "pending"
                                    ? "Pending"
                                    : shipment.status === "approved"
                                    ? "Approved"
                                    : "Rejected"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4">
                              No shipments associated with this pickup
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="mb-4">
                    <Label htmlFor="completion-notes" className="text-sm font-medium">
                      Completion Notes (Optional)
                    </Label>
                    <Textarea
                      id="completion-notes"
                      placeholder="Add any notes about the pickup completion (optional)"
                      className="mt-1"
                    />
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  No pickup details available
                </div>
              )}
              
              <DialogFooter className="flex items-center justify-between sm:justify-between mt-2">
                <Button
                  variant="outline"
                  onClick={() => setDetailsOpen(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePrintManifest(selectedPickupId!)}
                    disabled={!selectedPickupId || isLoadingDetails}
                    className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Manifest
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      const notesEl = document.getElementById('completion-notes') as HTMLTextAreaElement;
                      handleCompletePickup(notesEl?.value);
                    }}
                    disabled={!selectedPickupId || isLoadingDetails || completePickupMutation.isPending}
                    className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Completed
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}