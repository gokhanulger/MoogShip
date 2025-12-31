import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format, addDays } from "date-fns";
import {
  Calendar as CalendarIcon,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Search,
  Download,
  RefreshCw,
  FilterX,
  User,
  Package,
  FileText,
  CalendarDays,
  MapPin,
  Info,
  Printer,
  CalendarCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PickupStatus, PickupStatusColors } from "@shared/schema";
import Sidebar from "@/components/sidebar";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ManagePickupsPage() {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [updateNotes, setUpdateNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledPickups, setScheduledPickups] = useState<Record<string, any[]>>({});
  const [activeTab, setActiveTab] = useState("pending");
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Clear selections when switching tabs
    if (value === "pending") {
      setSelectedApprovedPickups([]);
    } else {
      setSelectedPickups([]);
    }
    
    // When switching to approved tab, force a full refresh of the approved pickups data
    if (value === "approved") {
      // Clear the cache for approved pickups
      queryClient.removeQueries({ queryKey: ['/api/pickup-requests/approved'] });
      
      // Then immediately refetch
      setTimeout(() => {
        refetchApprovedPickups();
      }, 100);
      
      // Do a second refetch after a delay to ensure data is up-to-date
      setTimeout(() => {
        refetchApprovedPickups();
      }, 1000);
    }
  };
  const [selectedApprovedPickup, setSelectedApprovedPickup] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPickups, setSelectedPickups] = useState<number[]>([]);
  const [selectedApprovedPickups, setSelectedApprovedPickups] = useState<number[]>([]);
  const [searchApproved, setSearchApproved] = useState("");
  const itemsPerPage = 10;

  // Fetch pickup requests
  const {
    data: pickupRequests = [],
    isLoading: isLoadingPickups,
    isError: isPickupsError,
    refetch: refetchPickups
  } = useQuery<any[]>({
    queryKey: ['/api/pickup-requests']
  });
  
  // Fetch approved pickup requests
  const {
    data: approvedPickups = [],
    isLoading: isLoadingApprovedPickups,
    isError: isApprovedPickupsError,
    refetch: refetchApprovedPickups
  } = useQuery<any[]>({
    queryKey: ['/api/pickup-requests/approved'],
    refetchOnWindowFocus: true,
    refetchInterval: activeTab === "approved" ? 3000 : false  // Auto refresh every 3 seconds when on approved tab
  });
  
  // Fetch pickup details with shipments when a pickup is selected
  const {
    data: pickupDetails,
    isLoading: isLoadingPickupDetails,
    isError: isPickupDetailsError
  } = useQuery<{ pickupRequest: any, shipments: any[], user: any }>({
    queryKey: ['/api/pickup-requests', selectedShipment?.id, 'details'],
    queryFn: async () => {
      if (!selectedShipment?.id) return null;
      const response = await fetch(`/api/pickup-requests/${selectedShipment.id}/details`);
      if (!response.ok) {
        throw new Error('Failed to fetch pickup details');
      }
      return response.json();
    },
    enabled: !!selectedShipment?.id
  });

  // Handle updating pickup status
  const updatePickupStatusMutation = useMutation({
    mutationFn: async ({ shipmentId, status, notes, pickupDate }: { shipmentId: number, status: string, notes?: string, pickupDate?: Date }) => {
      const response = await apiRequest('PUT', `/api/shipments/${shipmentId}/pickup-status`, {
        pickupStatus: status,
        pickupNotes: notes,
        pickupDate: pickupDate ? pickupDate.toISOString() : undefined
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update pickup status");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate both pending and approved pickup queries
      queryClient.invalidateQueries({ queryKey: ['/api/pickup-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pickup-requests/approved'] });
      
      // Wait a bit and then force refetch the approved pickups
      setTimeout(() => {
        refetchApprovedPickups();
      }, 300);
      
      setSelectedShipment(null);
      setUpdateNotes("");
      setScheduledDate(undefined);
      
      toast({
        title: "Pickup status updated",
        description: "The pickup request has been updated successfully."
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update pickup status"
      });
    }
  });
  
  // Schedule pickup with date
  const handleSchedulePickup = () => {
    if (!selectedShipment || !scheduledDate) return;
    
    updatePickupStatusMutation.mutate({
      shipmentId: selectedShipment.id,
      status: PickupStatus.SCHEDULED,
      notes: updateNotes || selectedShipment.pickupNotes,
      pickupDate: scheduledDate
    });
  };

  // Filter pickup requests based on selected status and search term
  const filteredPickups = pickupRequests?.filter((pickup: any) => {
    // Exclude all scheduled/completed pickups from pending requests tab
    if (pickup.pickupStatus === PickupStatus.SCHEDULED || 
        pickup.pickupStatus === PickupStatus.COMPLETED) {
      return false;
    }
    
    const matchesStatus = selectedStatus && selectedStatus !== "all" ? pickup.pickupStatus === selectedStatus : true;
    const searchLower = search.toLowerCase();
    const matchesSearch = search
      ? pickup.receiverName?.toLowerCase().includes(searchLower) ||
        pickup.senderName?.toLowerCase().includes(searchLower) ||
        pickup.trackingNumber?.toLowerCase().includes(searchLower) ||
        pickup.id?.toString().includes(searchLower)
      : true;
    return matchesStatus && matchesSearch;
  }) || [];

  // Handle updating a pickup's status
  const handleUpdateStatus = (status: string) => {
    if (!selectedShipment) return;
    
    updatePickupStatusMutation.mutate({
      shipmentId: selectedShipment.id,
      status,
      notes: updateNotes || selectedShipment.pickupNotes
    });
  };
  
  // Handle bulk approval of selected pickups
  const bulkApprovePickupsMutation = useMutation({
    mutationFn: async (pickupIds: number[]) => {
      const response = await apiRequest('PUT', `/api/pickup-requests/bulk/approve`, {
        pickupIds,
        status: PickupStatus.SCHEDULED,
        notes: "Approved in bulk"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to approve pickups in bulk");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Save selection count for the toast message
      const approvedCount = selectedPickups.length;
      
      // Reset selections
      setSelectedPickups([]);
      
      // Force refetch both endpoints before switching tabs
      queryClient.invalidateQueries({ queryKey: ['/api/pickup-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pickup-requests/approved'] });
      
      // Clear the cache for better refresh
      queryClient.removeQueries({ queryKey: ['/api/pickup-requests/approved'] });
      
      // Add a small delay before refetching to ensure the server has updated
      setTimeout(() => {
        refetchPickups();
        refetchApprovedPickups();
        
        // Switch to the approved tab after successful approval
        // (using handleTabChange instead of setActiveTab directly will trigger the refresh logic)
        handleTabChange("approved");
        
        toast({
          title: "Bulk approval complete",
          description: `Successfully approved ${approvedCount} pickup requests.`
        });
      }, 300);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Bulk approval failed",
        description: error instanceof Error ? error.message : "Failed to approve pickups in bulk"
      });
    }
  });
  
  // Handle bulk approval
  const handleBulkApprove = () => {
    if (selectedPickups.length === 0) {
      toast({
        variant: "destructive",
        title: "No pickups selected",
        description: "Please select at least one pickup request to approve."
      });
      return;
    }
    
    bulkApprovePickupsMutation.mutate(selectedPickups);
  };
  
  // Toggle selection of a pickup
  const togglePickupSelection = (pickupId: number) => {
    setSelectedPickups(prev => 
      prev.includes(pickupId) 
        ? prev.filter(id => id !== pickupId) 
        : [...prev, pickupId]
    );
  };
  
  // Toggle all pickups in the current view
  const toggleAllPickups = () => {
    if (selectedPickups.length === filteredPickups.length) {
      setSelectedPickups([]);
    } else {
      setSelectedPickups(filteredPickups.map(pickup => pickup.id));
    }
  };
  
  // Toggle selection of an approved pickup
  const toggleApprovedPickupSelection = (pickupId: number) => {
    setSelectedApprovedPickups(prev => 
      prev.includes(pickupId) 
        ? prev.filter(id => id !== pickupId) 
        : [...prev, pickupId]
    );
  };
  
  // Toggle all approved pickups in the current view
  const toggleAllApprovedPickups = () => {
    const filteredApprovedPickups = approvedPickups.filter((pickup: any) => {
      const searchLower = searchApproved.toLowerCase();
      return searchApproved
        ? pickup.receiverName?.toLowerCase().includes(searchLower) ||
          pickup.senderName?.toLowerCase().includes(searchLower) ||
          pickup.trackingNumber?.toLowerCase().includes(searchLower) ||
          pickup.id?.toString().includes(searchLower)
        : true;
    });
    
    if (selectedApprovedPickups.length === filteredApprovedPickups.length) {
      setSelectedApprovedPickups([]);
    } else {
      setSelectedApprovedPickups(filteredApprovedPickups.map((pickup: any) => pickup.id));
    }
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    const colorClass = PickupStatusColors[status as keyof typeof PickupStatusColors] || "bg-gray-100 text-gray-800";
    return (
      <Badge className={colorClass}>
        {status === PickupStatus.PENDING && <Clock className="mr-1 h-3 w-3" />}
        {status === PickupStatus.SCHEDULED && <CalendarIcon className="mr-1 h-3 w-3" />}
        {status === PickupStatus.COMPLETED && <CheckCircle className="mr-1 h-3 w-3" />}
        {status === PickupStatus.CANCELLED && <XCircle className="mr-1 h-3 w-3" />}
        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </Badge>
    );
  };

  // Function to print pickup details
  const handlePrintPickups = async (pickupIds: number[]) => {
    if (pickupIds.length === 0) return;
    
    // Show loading toast
    toast({
      title: "Preparing print view",
      description: "Fetching detailed pickup information..."
    });
    
    // Create new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        variant: "destructive",
        title: "Print failed",
        description: "Unable to open print window. Please check your popup settings."
      });
      return;
    }
    
    try {
      // Get more detailed information by fetching each pickup details
      let detailedPickups: any[] = [];
      
      for (const pickupId of pickupIds) {
        try {
          console.log(`Fetching details for pickup ${pickupId}`);
          const response = await fetch(`/api/pickup-requests/${pickupId}/details`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Pickup data retrieved for ID ${pickupId}:`, data);
            
            // Each pickup may have multiple shipments - create entries for each shipment
            if (data.shipments && data.shipments.length > 0) {
              data.shipments.forEach((shipment: any) => {
                const detailedPickup = {
                  ...data.pickupRequest,
                  ...shipment,
                  // Ensure we have user information associated
                  user: data.user || {},
                  // Make sure to copy key information from the pickup request
                  pickupId: data.pickupRequest.id,
                  pickupDate: data.pickupRequest.pickupDate,
                  pickupStatus: data.pickupRequest.pickupStatus,
                };
                detailedPickups.push(detailedPickup);
              });
            } else {
              // No shipments associated, still create an entry for the pickup
              const detailedPickup = {
                ...data.pickupRequest,
                // Keep a reference to user data
                user: data.user || {}
              };
              detailedPickups.push(detailedPickup);
            }
          } else {
            console.error(`Failed to get pickup details for ID ${pickupId}:`, response.statusText);
            // If we can't get details, use the basic info from approvedPickups
            const basicPickup = approvedPickups.find(p => p.id === pickupId);
            if (basicPickup) detailedPickups.push(basicPickup);
          }
        } catch (error) {
          console.error(`Error fetching details for pickup ${pickupId}:`, error);
          // Fallback to basic info
          const basicPickup = approvedPickups.find(p => p.id === pickupId);
          if (basicPickup) detailedPickups.push(basicPickup);
        }
      }
      
      // If we couldn't get any detailed info, fall back to approved pickups list
      if (detailedPickups.length === 0) {
        console.warn("No detailed pickup data available, falling back to basic pickup list");
        detailedPickups = approvedPickups.filter(pickup => 
          pickupIds.includes(pickup.id)
        );
      }
      
      console.log(`Generating PDF for ${detailedPickups.length} pickup details`);
      
      // Create HTML content with the simplified tabular format requested
      let htmlContent = `
        <html>
          <head>
            <title>Pickup Details</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #0047AB; text-align: center; }
              .print-date { text-align: center; color: #666; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #000; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; }
              .company-info { text-align: center; margin-bottom: 20px; }
              .no-data { text-align: center; padding: 20px; color: #666; }
            </style>
          </head>
          <body>
            <h1>Moogship Pickup Details</h1>
            <div class="print-date">Printed on ${format(new Date(), "PPP")}</div>
            
            <table>
              <thead>
                <tr>
                  <th>Pick Up Date</th>
                  <th>Pick Up Address</th>
                  <th>From Email</th>
                  <th>From Phone</th>
                  <th>Tracking Info</th>
                  <th>Package Details</th>
                </tr>
              </thead>
              <tbody>
      `;
      
      // Add each pickup's details as a row in the table
      detailedPickups.forEach(pickup => {
        // Handle pickup date, check various possible field names
        const pickupDateValue = pickup.pickupDate || pickup.pickupScheduledDate;
        const pickupDate = pickupDateValue 
          ? format(new Date(pickupDateValue), "PPP") 
          : "Not scheduled";
        
        // Format SENDER ADDRESS from shipment fields
        // This is what the customer requested - we want sender info, not receiver
        const address = pickup.senderAddress || pickup.address || '';
        const city = pickup.senderCity || pickup.city || '';
        const postalCode = pickup.senderPostalCode || pickup.postalCode || '';
        const country = pickup.senderCountry || pickup.country || 'Turkey';
        
        // Format address as a single line with handling for missing parts
        const addressParts = [address, city, postalCode, country].filter(part => part);
        const formattedSenderAddress = addressParts.length > 0 ? addressParts.join(', ') : 'N/A';
        
        // Get pickup address (where packages will be picked up from)
        const pickupAddressParts = pickup.pickupAddress ? 
          [
            pickup.pickupAddress,
            pickup.pickupCity || 'Istanbul',
            pickup.pickupPostalCode || '',
            'Turkey'
          ].filter(Boolean) :
          [
            pickup.user?.address || 'N/A',
            pickup.user?.city || 'Istanbul',
            pickup.user?.postalCode || '',
            'Turkey'
          ].filter(Boolean);
          
        // First formattedPickupAddress definition
        const formattedPickupAddress = pickupAddressParts.length > 0 ? 
          pickupAddressParts.join(', ') : 
          'N/A';
        
        // Try to get SENDER info (not receiver info) as requested
        const senderName = pickup.senderName || (pickup.user && pickup.user.name) || 'N/A';
        const senderEmail = pickup.senderEmail || (pickup.user && pickup.user.email) || 'N/A';
        const senderPhone = pickup.senderPhone || (pickup.user && pickup.user.phoneNumber) || (pickup.user && pickup.user.phone) || 'N/A';
        
        console.log('Pickup details for PDF:', {
          id: pickup.id,
          senderName: senderName,
          senderAddress: formattedSenderAddress,
          senderEmail: senderEmail, 
          senderPhone: senderPhone,
          trackingNumber: pickup.trackingNumber || 'N/A',
          rawData: pickup
        });
        
        // Format package details - collect from various possible field locations
        // This new format ensures consistent presentation of package information
        let packageDetails = '';
        
        // Try to get description from various possible field names
        const description = pickup.description || 
                           pickup.packageDescription || 
                           pickup.packageContents || 
                           '';
        
        // Try to get weight from various possible field names, with unit conversion if needed
        const weightValue = pickup.weight || 
                           pickup.packageWeight || 
                           pickup.billableWeight || 
                           null;
        
        // Format weight with kg unit if available
        const weight = weightValue ? `${weightValue}kg` : '';
        
        // Check for dimensions in various formats
        const length = pickup.length || pickup.packageLength;
        const width = pickup.width || pickup.packageWidth;
        const height = pickup.height || pickup.packageHeight;
        
        // Format dimensions if all three are available
        let dimensions = '';
        if (length && width && height) {
          dimensions = `${length}×${width}×${height}cm`;
        }
        
        // Build package details string with available information in a consistent format
        const details = [];
        
        // Add description first if available
        if (description) {
          details.push(description);
        }
        
        // Add combined dimensions and weight if both available
        if (dimensions && weight) {
          details.push(`${dimensions}, ${weight}`);
        } else {
          // Otherwise add them separately if available
          if (dimensions) details.push(dimensions);
          if (weight) details.push(weight);
        }
        
        // Add category/product type if available
        if (pickup.packageCategory || pickup.productType) {
          details.push(`Type: ${pickup.packageCategory || pickup.productType}`);
        }
        
        // Join all details with line breaks
        packageDetails = details.join('\n');
        
        // Default text if no package details available
        if (!packageDetails) packageDetails = 'No package details available';
        
        // Get tracking info
        // Format tracking info with more details if available
        const trackingNumber = pickup.trackingNumber || 'N/A';
        const carrier = pickup.carrier || pickup.shippingCarrier || 'Moogship';
        let trackingInfo = trackingNumber;
        if (trackingNumber !== 'N/A' && carrier && carrier !== 'N/A') {
          trackingInfo = `${carrier}: ${trackingNumber}`;
        }
        
        // Format the pickup address, city and postal code
        const pickupAddress = pickup.pickupAddress || 
                             (pickup.pickupRequest && pickup.pickupRequest.pickupAddress) || 
                             'No pickup address provided';
        
        // Format a complete address with city and postal code if available
        const pickupCity = pickup.pickupCity || 
                          (pickup.pickupRequest && pickup.pickupRequest.pickupCity) || 
                          'Istanbul';
        
        const pickupPostalCode = pickup.pickupPostalCode || 
                                (pickup.pickupRequest && pickup.pickupRequest.pickupPostalCode) || 
                                '';
        
        // Combine into a single address line for the PDF, use the previously defined initialPickupAddress if needed
        const finalPickupAddress = [
          pickupAddress,
          pickupCity, 
          pickupPostalCode,
          'Turkey' // Default country
        ].filter(Boolean).join(', ');
        
        console.log('Pickup info for PDF:', {
          id: pickup.id,
          pickupAddress: finalPickupAddress,
          trackingInfo: trackingInfo,
          packageDetails: packageDetails,
          pickupDate: pickupDate
        });
        
        htmlContent += `
          <tr>
            <td>${pickupDate}</td>
            <td>${finalPickupAddress}</td>
            <td>${senderEmail}</td>
            <td>${senderPhone}</td>
            <td>${trackingInfo}</td>
            <td>${packageDetails}</td>
          </tr>
        `;
      });
      
      // Close the table and HTML document
      htmlContent += `
              </tbody>
            </table>
          </body>
        </html>
      `;
      
      // Write the HTML content to the new window
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Set a timeout to ensure the content is fully loaded before printing
      setTimeout(() => {
        printWindow.print();
      }, 500);
      
    } catch (error) {
      console.error('Error generating print view:', error);
      toast({
        variant: "destructive",
        title: "Print failed",
        description: "An error occurred while generating the print view."
      });
      if (printWindow) printWindow.close();
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden pt-16 md:pt-0 md:pl-64">
        <div className="container mx-auto py-6 flex-1 overflow-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Manage Pickup Requests</h1>
              <p className="text-muted-foreground">
                View and manage all pickup requests for shipments
              </p>
            </div>
            <Button 
              onClick={() => activeTab === "pending" ? refetchPickups() : refetchApprovedPickups()}
              variant="outline" 
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh {activeTab === "pending" ? "Pending" : "Approved"}
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> Pending Requests
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" /> Approved Pickups
              </TabsTrigger>
            </TabsList>

            {activeTab === "pending" && (
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, ID, or tracking number..."
                      className="pl-8"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value={PickupStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={PickupStatus.COMPLETED}>Completed</SelectItem>
                    <SelectItem value={PickupStatus.CANCELLED}>Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                {((selectedStatus && selectedStatus !== "all") || search) && (
                  <Button variant="ghost" onClick={() => {
                    setSelectedStatus("all");
                    setSearch("");
                  }}>
                    <FilterX className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            )}

            {activeTab === "approved" && (
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search approved pickups..."
                      className="pl-8"
                      value={searchApproved}
                      onChange={(e) => setSearchApproved(e.target.value)}
                    />
                  </div>
                </div>
                {searchApproved && (
                  <Button variant="ghost" onClick={() => setSearchApproved("")}>
                    <FilterX className="mr-2 h-4 w-4" />
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              {activeTab === "pending" ? (
                <>
                  <CardHeader>
                    <CardTitle>Pickup Requests</CardTitle>
                    <CardDescription>
                      {filteredPickups.length} pickup requests found
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingPickups ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : isPickupsError ? (
                      <div className="text-center py-8 text-red-500">
                        <p>Failed to load pickup requests</p>
                        <Button variant="outline" onClick={() => refetchPickups()} className="mt-2">
                          Try Again
                        </Button>
                      </div>
                    ) : filteredPickups.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Truck className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                        <p>No pickup requests found</p>
                        {(selectedStatus || search) && (
                          <p className="text-sm mt-2">Try adjusting your filters</p>
                        )}
                      </div>
                    ) : (
                      <div className="border rounded-md">
                        <div className="overflow-auto max-h-[calc(100vh-260px)]">
                          <div className="flex justify-between items-center p-2 bg-gray-50">
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                id="select-all" 
                                checked={selectedPickups.length === filteredPickups.length && filteredPickups.length > 0}
                                onCheckedChange={toggleAllPickups}
                              />
                              <label htmlFor="select-all" className="text-sm font-medium">
                                Select All
                              </label>
                            </div>
                            {selectedPickups.length > 0 && (
                              <Button 
                                onClick={handleBulkApprove}
                                className="text-sm gap-1"
                                size="sm"
                                disabled={bulkApprovePickupsMutation.isPending}
                              >
                                {bulkApprovePickupsMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                )}
                                Approve {selectedPickups.length} Selected
                              </Button>
                            )}
                          </div>
                          <Table>
                            <TableHeader className="sticky top-0 bg-white z-10">
                              <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredPickups.map((pickup: any) => (
                              <TableRow 
                                key={pickup.id} 
                                className={pickup.id === selectedShipment?.id ? "bg-primary/5" : selectedPickups.includes(pickup.id) ? "bg-blue-50" : ""}
                              >
                                <TableCell className="p-2">
                                  {pickup.pickupStatus === PickupStatus.PENDING && (
                                    <Checkbox 
                                      checked={selectedPickups.includes(pickup.id)}
                                      onCheckedChange={() => togglePickupSelection(pickup.id)}
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">{pickup.id}</TableCell>
                                <TableCell>
                                  <div className="font-medium">{pickup.receiverName}</div>
                                  <div className="text-sm text-muted-foreground">{pickup.receiverCountry}</div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    {pickup.pickupDate ? format(new Date(pickup.pickupDate), "PPP") : "Not set"}
                                  </div>
                                </TableCell>
                                <TableCell>{getStatusBadge(pickup.pickupStatus)}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedShipment(pickup)}
                                  >
                                    View Details
                                  </Button>
                                </TableCell>
                              </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </>
              ) : (
                <>
                  <CardHeader>
                    <CardTitle>Approved Pickups</CardTitle>
                    <CardDescription>
                      {approvedPickups.length} approved pickups found
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingApprovedPickups ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : isApprovedPickupsError ? (
                      <div className="text-center py-8 text-red-500">
                        <p>Failed to load approved pickups</p>
                        <Button variant="outline" onClick={() => refetchApprovedPickups()} className="mt-2">
                          Try Again
                        </Button>
                      </div>
                    ) : approvedPickups.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Truck className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                        <p>No approved pickups found</p>
                        {searchApproved && (
                          <p className="text-sm mt-2">Try adjusting your search</p>
                        )}
                      </div>
                    ) : (
                      <div className="border rounded-md">
                        <div className="overflow-auto max-h-[calc(100vh-260px)]">
                          <div className="flex justify-between items-center p-2 bg-gray-50">
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                id="select-all-approved" 
                                checked={selectedApprovedPickups.length === approvedPickups.length && approvedPickups.length > 0}
                                onCheckedChange={toggleAllApprovedPickups}
                              />
                              <label htmlFor="select-all-approved" className="text-sm font-medium">
                                Select All
                              </label>
                            </div>
                            {selectedApprovedPickups.length > 0 && (
                              <Button 
                                className="text-sm gap-1"
                                size="sm"
                                onClick={() => {
                                  // Show loading toast
                                  toast({
                                    title: "Preparing print view",
                                    description: "Setting up pickup labels for printing..."
                                  });
                                  
                                  // Get selected pickup details
                                  const selectedPickups = approvedPickups.filter(
                                    pickup => selectedApprovedPickups.includes(pickup.id)
                                  );
                                  
                                  // Open print window
                                  const printWindow = window.open('', '_blank');
                                  if (!printWindow) {
                                    toast({
                                      variant: "destructive",
                                      title: "Print failed",
                                      description: "Unable to open print window. Please check your popup settings."
                                    });
                                    return;
                                  }
                                  
                                  // Create document content based on the simpler tabular format requested
                                  const styles = `
                                    body { font-family: Arial, sans-serif; padding: 20px; }
                                    h1 { color: #0047AB; text-align: center; }
                                    .print-date { text-align: center; color: #666; margin-bottom: 20px; }
                                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                                    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
                                    th { background-color: #f2f2f2; font-weight: bold; }
                                  `;
                                  
                                  let content = `
                                    <html>
                                      <head>
                                        <title>Pickup Details</title>
                                        <style>${styles}</style>
                                      </head>
                                      <body>
                                        <h1>Moogship Pickup Details</h1>
                                        <div class="print-date">Printed on ${format(new Date(), "PPP")}</div>
                                        
                                        <table>
                                          <thead>
                                            <tr>
                                              <th>Pick Up Date</th>
                                              <th>Pick Up Address</th>
                                              <th>From Email</th>
                                              <th>From Phone</th>
                                              <th>Tracking Info</th>
                                              <th>Package Details</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                  `;
                                  
                                  // Add each pickup's details as a row in the table
                                  selectedPickups.forEach(pickup => {
                                    const pickupDate = pickup.pickupDate 
                                      ? format(new Date(pickup.pickupDate), "PPP") 
                                      : "Not scheduled";
                                    
                                    // Format pickup address as a single line
                                    const pickupCity = pickup.pickupCity || pickup.user?.city || 'Istanbul';
                                    const pickupPostalCode = pickup.pickupPostalCode || pickup.user?.postalCode || '';
                                    const pickupAddress = pickup.pickupAddress || pickup.user?.address || 'No pickup address';
                                    
                                    const printPickupAddress = [
                                      pickupAddress,
                                      pickupCity,
                                      pickupPostalCode,
                                      'Turkey' // Default country
                                    ].filter(Boolean).join(', ');
                                    
                                    // Format sender address as a single line
                                    const senderAddress = pickup.senderAddress || pickup.user?.address || '';
                                    const senderCity = pickup.senderCity || pickup.user?.city || '';
                                    const senderPostalCode = pickup.senderPostalCode || pickup.user?.postalCode || '';
                                    const senderCountry = pickup.senderCountry || pickup.user?.country || 'Turkey';
                                    
                                    const formattedSenderAddress = [
                                      senderAddress,
                                      senderCity,
                                      senderPostalCode,
                                      senderCountry
                                    ].filter(Boolean).join(', ');
                                    
                                    // Get sender name from various possible sources
                                    const senderName = pickup.senderName || pickup.user?.name || pickup.user?.companyName || 'N/A';
                                    
                                    // Get sender contact info
                                    const senderEmail = pickup.senderEmail || pickup.user?.email || 'N/A';
                                    const senderPhone = pickup.senderPhone || pickup.user?.phoneNumber || pickup.user?.phone || 'N/A';
                                    
                                    // Format tracking info
                                    const carrier = pickup.carrier || pickup.shippingCarrier || 'Moogship';
                                    const trackingNumber = pickup.trackingNumber || 'N/A';
                                    const trackingInfo = (trackingNumber !== 'N/A') 
                                      ? `${carrier}: ${trackingNumber}` 
                                      : 'N/A';
                                    
                                    // Format package details with improved formatting
                                    let packageDetails = '';
                                    
                                    // Try to get description from various possible field names
                                    const description = pickup.description || 
                                                       pickup.packageDescription || 
                                                       pickup.packageContents || 
                                                       '';
                                    
                                    // Try to get weight from various possible field names
                                    const weightValue = pickup.weight || 
                                                       pickup.packageWeight || 
                                                       pickup.billableWeight || 
                                                       null;
                                    
                                    // Format weight with kg unit if available
                                    const weight = weightValue ? `${weightValue}kg` : '';
                                    
                                    // Format dimensions if all three are available
                                    let dimensions = '';
                                    if (pickup.length && pickup.width && pickup.height) {
                                      dimensions = `${pickup.length}×${pickup.width}×${pickup.height}cm`;
                                    }
                                    
                                    // Build details in a consistent format
                                    const details = [];
                                    if (description) details.push(description);
                                    if (dimensions && weight) {
                                      details.push(`${dimensions}, ${weight}`);
                                    } else {
                                      if (dimensions) details.push(dimensions);
                                      if (weight) details.push(weight);
                                    }
                                    
                                    // Join with line breaks
                                    packageDetails = details.join('\n');
                                    
                                    // Default text if no package details available
                                    if (!packageDetails) packageDetails = 'No package details available';
                                    
                                    content += `
                                      <tr>
                                        <td>${pickupDate}</td>
                                        <td>${printPickupAddress}</td>
                                        <td>${senderEmail}</td>
                                        <td>${senderPhone}</td>
                                        <td>${trackingInfo}</td>
                                        <td>${packageDetails}</td>
                                      </tr>
                                    `;
                                  });
                                  
                                  // Close the table and HTML document
                                  content += `
                                          </tbody>
                                        </table>
                                      </body>
                                    </html>
                                  `;
                                  
                                  // Write to document and print
                                  printWindow.document.write(content);
                                  printWindow.document.close();
                                  
                                  // Delay printing slightly to ensure content is loaded
                                  setTimeout(() => {
                                    printWindow.print();
                                  }, 500);
                                }}
                              >
                                <Printer className="h-3.5 w-3.5 mr-1" />
                                Print {selectedApprovedPickups.length} Selected
                              </Button>
                            )}
                          </div>
                          <Table>
                            <TableHeader className="sticky top-0 bg-white z-10">
                              <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Pickup Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {approvedPickups
                                .filter((pickup: any) => {
                                  const searchLower = searchApproved.toLowerCase();
                                  return searchApproved
                                    ? pickup.receiverName?.toLowerCase().includes(searchLower) ||
                                      pickup.senderName?.toLowerCase().includes(searchLower) ||
                                      pickup.trackingNumber?.toLowerCase().includes(searchLower) ||
                                      pickup.id?.toString().includes(searchLower)
                                    : true;
                                })
                                .map((pickup: any) => (
                                <TableRow 
                                  key={pickup.id} 
                                  className={pickup.id === selectedShipment?.id ? "bg-primary/5" : selectedApprovedPickups.includes(pickup.id) ? "bg-blue-50" : ""}
                                >
                                  <TableCell className="p-2">
                                    <Checkbox 
                                      checked={selectedApprovedPickups.includes(pickup.id)}
                                      onCheckedChange={() => toggleApprovedPickupSelection(pickup.id)}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">{pickup.id}</TableCell>
                                  <TableCell>
                                    <div className="font-medium">{pickup.receiverName}</div>
                                    <div className="text-sm text-muted-foreground">{pickup.receiverCountry}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center">
                                      {pickup.pickupDate ? format(new Date(pickup.pickupDate), "PPP") : "Not set"}
                                    </div>
                                  </TableCell>
                                  <TableCell>{getStatusBadge(pickup.pickupStatus)}</TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedShipment(pickup);
                                      }}
                                    >
                                      View Details
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pickup Details</CardTitle>
                <CardDescription>
                  {selectedShipment
                    ? `Pickup for shipment #${selectedShipment.id}`
                    : "Select a pickup request to view details"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedShipment ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p>No pickup request selected</p>
                    <p className="text-sm mt-2">Click on a pickup request to view and manage it</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className={selectedShipment.pickupDate ? "p-3 bg-green-50 border border-green-100 rounded-md" : ""}>
                      <h3 className={`text-sm font-medium mb-2 flex items-center ${selectedShipment.pickupDate ? "text-green-800" : "text-muted-foreground"}`}>
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Pickup Date
                      </h3>
                      <p className={`${selectedShipment.pickupDate ? "text-green-800 font-medium" : "font-medium"}`}>
                        {selectedShipment.pickupDate
                          ? format(new Date(selectedShipment.pickupDate), "PPP") + " (" + format(new Date(selectedShipment.pickupDate), "EEEE") + ")"
                          : "Not scheduled yet"}
                      </p>
                    </div>

                    {selectedShipment.user && (
                      <>
                        <div className="p-3 bg-purple-50 border border-purple-100 rounded-md">
                          <h3 className="text-sm font-medium text-purple-800 mb-2 flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            Shipper's Information (Company Details)
                          </h3>
                          <div className="grid gap-y-1 text-purple-800">
                            {pickupDetails?.user ? (
                              <>
                                <p className="font-medium">{pickupDetails.user.name || pickupDetails.user.username}</p>
                                <p className="text-sm">{pickupDetails.user.companyName || "N/A"}</p>
                                <p className="text-sm">
                                  <span className="font-medium">Email:</span> {pickupDetails.user.email}
                                </p>
                                {pickupDetails.user.phoneNumber && (
                                  <p className="text-sm">
                                    <span className="font-medium">Phone:</span> {pickupDetails.user.phoneNumber}
                                  </p>
                                )}
                                {pickupDetails.user.phone && !pickupDetails.user.phoneNumber && (
                                  <p className="text-sm">
                                    <span className="font-medium">Phone:</span> {pickupDetails.user.phone}
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="font-medium">{selectedShipment.user.name || selectedShipment.user.username}</p>
                                <p className="text-sm">{selectedShipment.user.companyName || "N/A"}</p>
                                <p className="text-sm">
                                  <span className="font-medium">Email:</span> {selectedShipment.user.email}
                                </p>
                                {selectedShipment.user.phoneNumber && (
                                  <p className="text-sm">
                                    <span className="font-medium">Phone:</span> {selectedShipment.user.phoneNumber}
                                  </p>
                                )}
                                {selectedShipment.user.phone && !selectedShipment.user.phoneNumber && (
                                  <p className="text-sm">
                                    <span className="font-medium">Phone:</span> {selectedShipment.user.phone}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-md">
                          <h3 className="text-sm font-medium text-amber-800 mb-2 flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            Shipper's Address (Pickup From)
                          </h3>
                          <div className="grid gap-y-1 text-amber-800">
                            {pickupDetails?.user ? (
                              <>
                                <p className="font-medium">{pickupDetails.user.name || pickupDetails.user.username}</p>
                                <p className="text-sm">{pickupDetails.user.companyName || "N/A"}</p>
                                <p className="text-sm">{pickupDetails.user.address || "No address provided"}</p>
                                <p className="text-sm">
                                  {pickupDetails.user.city || "Istanbul"}
                                  {pickupDetails.user.postalCode && 
                                    `, ${pickupDetails.user.postalCode}`}
                                </p>
                                <p className="text-sm font-medium">{pickupDetails.user.country || "Turkey"}</p>
                              </>
                            ) : (
                              <>
                                <p className="font-medium">{selectedShipment.user.name || selectedShipment.user.username}</p>
                                <p className="text-sm">{selectedShipment.user.companyName || "N/A"}</p>
                                <p className="text-sm">{selectedShipment.user.address || "No address provided"}</p>
                                <p className="text-sm">
                                  {selectedShipment.user.city || "Istanbul"}
                                  {selectedShipment.user.postalCode && 
                                    `, ${selectedShipment.user.postalCode}`}
                                </p>
                                <p className="text-sm font-medium">{selectedShipment.user.country || "Turkey"}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    <div className="p-3 border border-blue-100 bg-blue-50/30 rounded-md">
                      <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        Sender Information
                      </h3>
                      {(pickupDetails?.shipments && pickupDetails.shipments.length > 0) ? (
                        <div className="grid gap-y-1 text-blue-800">
                          <div>
                            <p className="font-medium">{pickupDetails.shipments[0].senderName || "MOOG LLC"}</p>
                            <p className="text-sm">{pickupDetails.shipments[0].senderAddress || "HALIL RIFAT PASA MAH. YUZER HAVUZ SK. PERPA TIC MER B BLOK"}</p>
                            <p className="text-sm">Istanbul, Turkey</p>
                            {pickupDetails.shipments[0].senderEmail && (
                              <p className="text-sm">
                                <span className="font-medium">Email:</span> {pickupDetails.shipments[0].senderEmail}
                              </p>
                            )}
                            {pickupDetails.shipments[0].senderPhone && (
                              <p className="text-sm">
                                <span className="font-medium">Phone:</span> {pickupDetails.shipments[0].senderPhone}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-y-1 text-blue-800">
                          <div>
                            <p className="font-medium">{selectedShipment.senderName || "MOOG LLC"}</p>
                            <p className="text-sm">{selectedShipment.senderAddress || "HALIL RIFAT PASA MAH. YUZER HAVUZ SK. PERPA TIC MER B BLOK"}</p>
                            <p className="text-sm">Istanbul, Turkey</p>
                            {selectedShipment.senderEmail && (
                              <p className="text-sm">
                                <span className="font-medium">Email:</span> {selectedShipment.senderEmail}
                              </p>
                            )}
                            {selectedShipment.senderPhone && (
                              <p className="text-sm">
                                <span className="font-medium">Phone:</span> {selectedShipment.senderPhone}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Display shipments included in this pickup request */}
                    {pickupDetails?.shipments && pickupDetails.shipments.length > 0 && (
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
                        <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                          <Package className="h-4 w-4 mr-2" />
                          Shipments ({pickupDetails.shipments.length})
                        </h3>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                          {pickupDetails.shipments.map((shipment: any) => (
                            <div key={shipment.id} className="p-2 bg-white rounded border border-blue-100 text-sm">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">#{shipment.id}: {shipment.receiverName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {shipment.receiverAddress}, {shipment.receiverCity}, {shipment.receiverCountry}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {shipment.packageWeight || shipment.weight || 0}kg
                                </Badge>
                              </div>
                              {shipment.trackingNumber && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  <span className="font-medium">Tracking:</span> {shipment.trackingNumber}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(pickupDetails?.shipments && pickupDetails.shipments.length > 0) ? (
                      <div className="border p-3 rounded-md">
                        <h3 className="text-sm font-medium mb-2 flex items-center">
                          <Package className="h-4 w-4 mr-2" />
                          Total Shipment Summary
                        </h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Total Packages</p>
                            <p className="text-sm font-medium">
                              {pickupDetails.shipments.length} shipments
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground">Total Weight</p>
                            <p className="text-sm font-medium">
                              {pickupDetails.shipments.reduce((total, s) => 
                                total + (s.packageWeight || s.weight || 0), 0).toFixed(1)}kg
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground">Total Physical Packages</p>
                            <p className="text-sm font-medium">
                              {pickupDetails.shipments.reduce((total, s) => 
                                total + (s.pieceCount || 1), 0)} {pickupDetails.shipments.reduce((total, s) => total + (s.pieceCount || 1), 0) > 1 ? 'packages' : 'package'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border p-3 rounded-md bg-muted/20">
                        <h3 className="text-sm font-medium mb-2 flex items-center">
                          <Package className="h-4 w-4 mr-2" />
                          Package Details
                        </h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Weight</p>
                            <p className="text-sm font-medium">
                              {selectedShipment.packageWeight || selectedShipment.weight || 0}kg
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground">Dimensions</p>
                            <p className="text-sm font-medium">
                              {selectedShipment.packageLength || selectedShipment.length || 0}×
                              {selectedShipment.packageWidth || selectedShipment.width || 0}×
                              {selectedShipment.packageHeight || selectedShipment.height || 0}cm
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground">Physical Packages</p>
                            <p className="text-sm font-medium">{selectedShipment.pieceCount || 1} {(selectedShipment.pieceCount || 1) > 1 ? 'packages' : 'package'}</p>
                          </div>
                          
                          {(selectedShipment.billableWeight || selectedShipment.volumetricWeight) && (
                            <div>
                              <p className="text-xs text-muted-foreground">Billable Weight</p>
                              <p className="text-sm font-medium">
                                {selectedShipment.billableWeight || selectedShipment.volumetricWeight || 0}kg
                                {selectedShipment.volumetricWeight > (selectedShipment.packageWeight || selectedShipment.weight) && (
                                  <span className="ml-1 text-xs text-amber-600">(volumetric)</span>
                                )}
                              </p>
                            </div>
                          )}
                          
                          <div>
                            <p className="text-xs text-muted-foreground">Service Level</p>
                            <p className="text-sm font-medium capitalize">{selectedShipment.serviceLevel || 'standard'}</p>
                          </div>
                          
                          {selectedShipment.carrierName && (
                            <div>
                              <p className="text-xs text-muted-foreground">Carrier</p>
                              <p className="text-sm font-medium">{selectedShipment.carrierName}</p>
                            </div>
                          )}
                          
                          {selectedShipment.totalPrice && (
                            <div className="col-span-2 mt-1 pt-2 border-t">
                              <p className="text-xs text-muted-foreground">Shipping Cost</p>
                              <p className="text-sm font-medium">
                                ${(selectedShipment.totalPrice / 100).toFixed(2)} 
                                {selectedShipment.basePrice && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    (Base: ${(selectedShipment.basePrice / 100).toFixed(2)}, 
                                    Fuel: ${(selectedShipment.fuelCharge / 100).toFixed(2)})
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Notes
                      </h3>
                      <Textarea
                        placeholder="Add or update pickup notes..."
                        defaultValue={pickupDetails?.pickupRequest?.pickupNotes || selectedShipment.pickupNotes || ""}
                        onChange={(e) => setUpdateNotes(e.target.value)}
                        className="resize-none"
                        rows={3}
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                        <Truck className="h-4 w-4 mr-2" />
                        Status: {getStatusBadge(pickupDetails?.pickupRequest?.pickupStatus || selectedShipment.pickupStatus)}
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        {(pickupDetails?.pickupRequest?.pickupStatus || selectedShipment.pickupStatus) === PickupStatus.PENDING && (
                          <>
                            <div className="col-span-2 mb-4">
                              <h4 className="text-sm font-medium mb-2 flex items-center">
                                <CalendarDays className="h-4 w-4 mr-2" />
                                Schedule Pickup
                              </h4>
                              <div className="flex gap-2 items-start max-w-[260px]">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={`justify-start text-left font-normal w-full ${!scheduledDate ? "text-muted-foreground" : ""}`}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {scheduledDate ? format(scheduledDate, "PPP") : "Select date"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-3 bg-white shadow-lg rounded-md" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={scheduledDate}
                                      onSelect={setScheduledDate}
                                      initialFocus
                                      className="border-0"
                                      disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                            
                            <Button 
                              variant="outline" 
                              onClick={handleSchedulePickup}
                              disabled={updatePickupStatusMutation.isPending || !scheduledDate}
                              className={scheduledDate ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20" : ""}
                            >
                              <CalendarDays className="mr-2 h-4 w-4" />
                              Schedule Pickup
                            </Button>
                            
                            <Button 
                              variant="outline" 
                              className="border-red-200 text-red-700 hover:bg-red-50"
                              onClick={() => handleUpdateStatus(PickupStatus.CANCELLED)}
                              disabled={updatePickupStatusMutation.isPending}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel
                            </Button>
                          </>
                        )}
                        
                        {(pickupDetails?.pickupRequest?.pickupStatus || selectedShipment.pickupStatus) === PickupStatus.SCHEDULED && (
                          <>
                            <Button 
                              variant="outline" 
                              className="border-green-200 text-green-700 hover:bg-green-50"
                              onClick={() => handleUpdateStatus(PickupStatus.COMPLETED)}
                              disabled={updatePickupStatusMutation.isPending}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Complete
                            </Button>
                            <Button 
                              variant="outline" 
                              className="border-red-200 text-red-700 hover:bg-red-50"
                              onClick={() => handleUpdateStatus(PickupStatus.CANCELLED)}
                              disabled={updatePickupStatusMutation.isPending}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel
                            </Button>
                          </>
                        )}
                        
                        {((pickupDetails?.pickupRequest?.pickupStatus || selectedShipment.pickupStatus) === PickupStatus.COMPLETED || 
                          (pickupDetails?.pickupRequest?.pickupStatus || selectedShipment.pickupStatus) === PickupStatus.CANCELLED) && (
                          <Button 
                            variant="outline" 
                            className="col-span-2"
                            onClick={() => handleUpdateStatus(PickupStatus.PENDING)}
                            disabled={updatePickupStatusMutation.isPending}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reopen Request
                          </Button>
                        )}
                      </div>
                      
                      {updatePickupStatusMutation.isPending && (
                        <div className="flex justify-center mt-4">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}