import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { withAuth } from "@/lib/with-auth";
import Layout from "@/components/layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Loader2, 
  Search, 
  RefreshCw,
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  Clock,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Ban,
  Check,
  ExternalLink,
  MapPin
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Shipment {
  id: number;
  trackingNumber?: string;
  carrierTrackingNumber?: string;
  manualTrackingNumber?: string;
  manualCarrierName?: string;
  manualTrackingLink?: string;
  status: string;
  receiverName: string;
  receiverCountry: string;
  serviceLevel?: string;
  totalPrice: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
  trackingInfo?: any;
  trackingClosed?: boolean;
  trackingCloseReason?: string;
  carrier?: string;
  senderName?: string;
  // Legacy fields for compatibility
  toName?: string;
  toCity?: string;
  toCountry?: string;
}

function AdminTrackingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [shipmentToClose, setShipmentToClose] = useState<number | null>(null);
  const [selectedShipments, setSelectedShipments] = useState<Set<number>>(new Set());
  const [showBulkCloseDialog, setShowBulkCloseDialog] = useState(false);
  const [bulkCloseReason, setBulkCloseReason] = useState("");
  const [activePage, setActivePage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);
  const [deliveredPage, setDeliveredPage] = useState(1);
  const itemsPerPage = 50;
  const { toast } = useToast();
  
  // Fetch tracking scheduler status
  const { data: schedulerStatus } = useQuery({
    queryKey: ["/api/admin/tracking-scheduler/status"],
  });

  // Fetch shipments data (fast tracking endpoint without packages)
  const { data: shipmentsData, isLoading: shipmentsLoading, refetch: refetchShipments } = useQuery({
    queryKey: ["/api/shipments/tracking"],
    refetchInterval: schedulerStatus && typeof schedulerStatus === 'object' && 'isRunning' in schedulerStatus && (schedulerStatus as any).isRunning ? 30000 : false, // Auto-refresh every 30s when scheduler is running
  });

  // Auto-refresh when tracking scheduler is running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (schedulerStatus && typeof schedulerStatus === 'object' && 'isRunning' in schedulerStatus && (schedulerStatus as any).isRunning) {
      // Refresh every 30 seconds when scheduler is running
      interval = setInterval(() => {
        refetchShipments();
        setLastRefresh(new Date());
      }, 30000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [schedulerStatus, refetchShipments]);

  // Process shipments data
  const allShipments = Array.isArray(shipmentsData) ? shipmentsData : [];

  // Function to open tracking (no reason needed)
  const openTracking = async (shipmentId: number) => {
    try {
      await fetch(`/api/admin/shipments/${shipmentId}/tracking-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingClosed: false })
      });
      
      toast({
        title: "Tracking Opened",
        description: `Shipment ${shipmentId} tracking has been opened. This shipment will be included in automatic tracking updates.`,
        variant: "default",
      });
      
      refetchShipments();
    } catch (error) {
      console.error("Error opening tracking:", error);
      toast({
        title: "Error",
        description: "Failed to open tracking. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to close tracking with reason
  const closeTrackingWithReason = async () => {
    if (!shipmentToClose || !closeReason.trim()) {
      return;
    }

    try {
      await fetch(`/api/admin/shipments/${shipmentToClose}/tracking-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          trackingClosed: true,
          trackingCloseReason: closeReason.trim()
        })
      });
      
      toast({
        title: "Tracking Closed",
        description: `Shipment ${shipmentToClose} tracking has been closed. This shipment will no longer be included in automatic tracking updates.`,
        variant: "default",
      });
      
      setShowCloseDialog(false);
      setCloseReason("");
      setShipmentToClose(null);
      refetchShipments();
    } catch (error) {
      console.error("Error closing tracking:", error);
      toast({
        title: "Error",
        description: "Failed to close tracking. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to toggle tracking status for a shipment
  const toggleTrackingStatus = (shipmentId: number, currentlyClosed: boolean) => {
    if (currentlyClosed) {
      // Opening tracking - no reason needed
      openTracking(shipmentId);
    } else {
      // Closing tracking - show dialog for reason
      setShipmentToClose(shipmentId);
      setShowCloseDialog(true);
    }
  };

  // Bulk selection functions
  const toggleShipmentSelection = (shipmentId: number) => {
    const newSelected = new Set(selectedShipments);
    if (newSelected.has(shipmentId)) {
      newSelected.delete(shipmentId);
    } else {
      newSelected.add(shipmentId);
    }
    setSelectedShipments(newSelected);
  };

  const selectAllShipments = (shipments: Shipment[]) => {
    const allIds = new Set(shipments.map(s => s.id));
    setSelectedShipments(allIds);
  };

  const clearSelection = () => {
    setSelectedShipments(new Set());
  };

  // Bulk actions
  const bulkOpenTracking = async () => {
    if (selectedShipments.size === 0) return;

    try {
      const promises = Array.from(selectedShipments).map(shipmentId =>
        fetch(`/api/admin/shipments/${shipmentId}/tracking-status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackingClosed: false })
        })
      );

      await Promise.all(promises);

      toast({
        title: "Bulk Action Completed",
        description: `${selectedShipments.size} shipments tracking opened successfully.`,
        variant: "default",
      });

      clearSelection();
      refetchShipments();
    } catch (error) {
      console.error("Error bulk opening tracking:", error);
      toast({
        title: "Error",
        description: "Failed to open tracking for some shipments. Please try again.",
        variant: "destructive",
      });
    }
  };

  const bulkCloseTracking = () => {
    if (selectedShipments.size === 0) return;
    setShowBulkCloseDialog(true);
  };

  const executeBulkCloseTracking = async () => {
    if (!bulkCloseReason.trim() || selectedShipments.size === 0) return;

    try {
      const promises = Array.from(selectedShipments).map(shipmentId =>
        fetch(`/api/admin/shipments/${shipmentId}/tracking-status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            trackingClosed: true,
            trackingCloseReason: bulkCloseReason.trim()
          })
        })
      );

      await Promise.all(promises);

      toast({
        title: "Bulk Action Completed",
        description: `${selectedShipments.size} shipments tracking closed successfully.`,
        variant: "default",
      });

      setShowBulkCloseDialog(false);
      setBulkCloseReason("");
      clearSelection();
      refetchShipments();
    } catch (error) {
      console.error("Error bulk closing tracking:", error);
      toast({
        title: "Error",
        description: "Failed to close tracking for some shipments. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Get scheduler status info
  const isSchedulerRunning = schedulerStatus && typeof schedulerStatus === 'object' && 'isRunning' in schedulerStatus && (schedulerStatus as any).isRunning;
  const schedulerStatusText = isSchedulerRunning ? "Running" : "Stopped";
  
  // Filter shipments with tracking numbers  
  const shipmentsWithTracking = allShipments.filter((shipment: Shipment) => {
    const status = shipment.status?.toLowerCase();
    const hasTracking = shipment.trackingNumber || shipment.carrierTrackingNumber || shipment.manualTrackingNumber;
    
    // Show shipments with tracking numbers (exclude clearly finished/cancelled/rejected states)
    const excludedStatuses = ['pending', 'cancelled', 'rejected', 'completed'];
    
    return hasTracking && status && !excludedStatuses.includes(status);
  });

  // Active shipments (only in_transit status, not closed by admin)
  const activeShipments = shipmentsWithTracking.filter((shipment: Shipment) => {
    const status = shipment.status?.trim().toLowerCase();
    return !shipment.trackingClosed && status === 'in_transit';
  });
  
  // Delivered shipments (status is delivered and not closed)
  const deliveredShipments = shipmentsWithTracking.filter((shipment: Shipment) => {
    const status = shipment.status?.trim().toLowerCase();
    return status === 'delivered' && !shipment.trackingClosed;
  });
  
  // Closed shipments (closed by admin)
  const closedShipments = shipmentsWithTracking.filter((shipment: Shipment) => shipment.trackingClosed);


  // Apply search filter to active shipments
  const allFilteredActiveShipments = activeShipments.filter((shipment: Shipment) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      shipment.id?.toString().includes(searchLower) ||
      shipment.trackingNumber?.toLowerCase().includes(searchLower) ||
      shipment.carrierTrackingNumber?.toLowerCase().includes(searchLower) ||
      shipment.manualTrackingNumber?.toLowerCase().includes(searchLower) ||
      shipment.manualCarrierName?.toLowerCase().includes(searchLower) ||
      shipment.toName?.toLowerCase().includes(searchLower) ||
      shipment.senderName?.toLowerCase().includes(searchLower) ||
      shipment.receiverName?.toLowerCase().includes(searchLower) ||
      shipment.toCity?.toLowerCase().includes(searchLower) ||
      shipment.toCountry?.toLowerCase().includes(searchLower) ||
      shipment.receiverCountry?.toLowerCase().includes(searchLower) ||
      shipment.carrier?.toLowerCase().includes(searchLower)
    );
  });

  // Apply search filter to delivered shipments
  const allFilteredDeliveredShipments = deliveredShipments.filter((shipment: Shipment) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      shipment.id?.toString().includes(searchLower) ||
      shipment.trackingNumber?.toLowerCase().includes(searchLower) ||
      shipment.carrierTrackingNumber?.toLowerCase().includes(searchLower) ||
      shipment.manualTrackingNumber?.toLowerCase().includes(searchLower) ||
      shipment.manualCarrierName?.toLowerCase().includes(searchLower) ||
      shipment.toName?.toLowerCase().includes(searchLower) ||
      shipment.senderName?.toLowerCase().includes(searchLower) ||
      shipment.receiverName?.toLowerCase().includes(searchLower) ||
      shipment.toCity?.toLowerCase().includes(searchLower) ||
      shipment.toCountry?.toLowerCase().includes(searchLower) ||
      shipment.receiverCountry?.toLowerCase().includes(searchLower) ||
      shipment.carrier?.toLowerCase().includes(searchLower)
    );
  });

  // Apply search filter to closed shipments
  const allFilteredClosedShipments = closedShipments.filter((shipment: Shipment) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      shipment.id?.toString().includes(searchLower) ||
      shipment.trackingNumber?.toLowerCase().includes(searchLower) ||
      shipment.carrierTrackingNumber?.toLowerCase().includes(searchLower) ||
      shipment.manualTrackingNumber?.toLowerCase().includes(searchLower) ||
      shipment.manualCarrierName?.toLowerCase().includes(searchLower) ||
      shipment.toName?.toLowerCase().includes(searchLower) ||
      shipment.senderName?.toLowerCase().includes(searchLower) ||
      shipment.receiverName?.toLowerCase().includes(searchLower) ||
      shipment.toCity?.toLowerCase().includes(searchLower) ||
      shipment.toCountry?.toLowerCase().includes(searchLower) ||
      shipment.receiverCountry?.toLowerCase().includes(searchLower) ||
      shipment.carrier?.toLowerCase().includes(searchLower) ||
      shipment.trackingCloseReason?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination for active shipments
  const activeTotalPages = Math.ceil(allFilteredActiveShipments.length / itemsPerPage);
  const activeStartIndex = (activePage - 1) * itemsPerPage;
  const filteredActiveShipments = allFilteredActiveShipments.slice(activeStartIndex, activeStartIndex + itemsPerPage);

  // Pagination for delivered shipments
  const deliveredTotalPages = Math.ceil(allFilteredDeliveredShipments.length / itemsPerPage);
  const deliveredStartIndex = (deliveredPage - 1) * itemsPerPage;
  const filteredDeliveredShipments = allFilteredDeliveredShipments.slice(deliveredStartIndex, deliveredStartIndex + itemsPerPage);

  // Pagination for closed shipments
  const closedTotalPages = Math.ceil(allFilteredClosedShipments.length / itemsPerPage);
  const closedStartIndex = (closedPage - 1) * itemsPerPage;
  const filteredClosedShipments = allFilteredClosedShipments.slice(closedStartIndex, closedStartIndex + itemsPerPage);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-indigo-100 text-indigo-800';
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'out_for_delivery': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'exception': return 'bg-red-100 text-red-800';
      case 'ready_for_pickup': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCarrierColor = (carrier: string) => {
    switch (carrier?.toLowerCase()) {
      case 'ups': return 'bg-amber-100 text-amber-800';
      case 'fedex': return 'bg-purple-100 text-purple-800';
      case 'dhl': return 'bg-red-100 text-red-800';
      case 'aramex': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTrackingUrl = (carrier: string, trackingNumber: string): string => {
    const cleanTrackingNumber = trackingNumber?.trim();
    if (!cleanTrackingNumber) return '';

    switch (carrier?.toLowerCase()) {
      case 'ups':
        return `https://www.ups.com/track?loc=en_US&tracknum=${cleanTrackingNumber}`;
      case 'fedex':
        return `https://www.fedex.com/fedextrack/?trknbr=${cleanTrackingNumber}`;
      case 'dhl':
        return `https://www.dhl.com/en/express/tracking.html?AWB=${cleanTrackingNumber}`;
      case 'aramex':
        return `https://www.aramex.com/us/en/track/shipments?ShipmentNumber=${cleanTrackingNumber}`;
      case 'usps':
        return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${cleanTrackingNumber}`;
      default:
        return '';
    }
  };

  const getDeliveryIssueInfo = (shipment: Shipment) => {
    if (!shipment.trackingInfo) return null;
    
    try {
      const trackingInfo = typeof shipment.trackingInfo === 'string' 
        ? JSON.parse(shipment.trackingInfo) 
        : shipment.trackingInfo;
      
      // Handle both old format (object) and new format (array)
      let latestEvent;
      if (Array.isArray(trackingInfo)) {
        latestEvent = trackingInfo[0]; // First event is latest
      } else {
        latestEvent = trackingInfo;
      }
      
      if (!latestEvent) return null;
      
      const status = latestEvent.status || shipment.status;
      const description = latestEvent.status || latestEvent.statusDescription || '';
      
      // Calculate days in transit
      const createdDate = new Date(shipment.createdAt);
      const today = new Date();
      const daysInTransit = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Detect delivery issues
      const hasDeliveryIssue = 
        daysInTransit > 10 || // More than 10 days in transit
        description.toLowerCase().includes('notice left') ||
        description.toLowerCase().includes('delivery attempted') ||
        description.toLowerCase().includes('no secure location') ||
        description.toLowerCase().includes('exception') ||
        description.toLowerCase().includes('delay') ||
        status.toLowerCase().includes('exception') ||
        status === 'ERROR' || // API errors
        description.toLowerCase().includes('error');
      
      if (hasDeliveryIssue) {
        let issueType = 'Delivery Issue';
        if (daysInTransit > 15) issueType = 'Delivery Delay';
        if (description.toLowerCase().includes('notice left')) issueType = 'Delivery Attempted';
        if (description.toLowerCase().includes('exception') || status.toLowerCase().includes('exception')) issueType = 'Exception';
        if (status === 'ERROR' || description.toLowerCase().includes('error')) issueType = 'Tracking Error';
        
        return {
          hasIssue: true,
          issueType,
          daysInTransit,
          description,
          status
        };
      }
      
      return null;
    } catch (e) {
      return null;
    }
  };

  const getTrackingDescription = (shipment: Shipment) => {
    if (!shipment.trackingInfo) return 'No tracking data available';
    
    try {
      const trackingInfo = typeof shipment.trackingInfo === 'string' 
        ? JSON.parse(shipment.trackingInfo) 
        : shipment.trackingInfo;
      
      // Handle both old format (object) and new format (array)
      if (Array.isArray(trackingInfo) && trackingInfo.length > 0) {
        return trackingInfo[0].status || 'No description available';
      } else if (trackingInfo.statusDescription) {
        return trackingInfo.statusDescription;
      }
      
      return 'No description available';
    } catch (e) {
      return 'Error parsing tracking data';
    }
  };

  const getLatestTrackingEvent = (shipment: Shipment) => {
    if (!shipment.trackingInfo) return null;
    
    try {
      const trackingInfo = typeof shipment.trackingInfo === 'string' 
        ? JSON.parse(shipment.trackingInfo) 
        : shipment.trackingInfo;
      
      // Handle both old format (object) and new format (array)
      if (Array.isArray(trackingInfo) && trackingInfo.length > 0) {
        return trackingInfo[0]; // First event is the latest
      } else if (trackingInfo.events && trackingInfo.events.length > 0) {
        return trackingInfo.events[0]; // Old format
      } else if (trackingInfo.status) {
        return trackingInfo; // Single event object
      }
      
      return null;
    } catch (e) {
      return null;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Tracking Management</h1>
          <p className="text-muted-foreground mt-1">
            Monitor in-transit shipment tracking status with clickable tracking links
          </p>
        </div>
        <div className="flex items-center gap-2">
          {schedulerStatus && typeof schedulerStatus === 'object' && 'isRunning' in schedulerStatus ? (
            <Badge variant={(schedulerStatus as any).isRunning ? "default" : "secondary"}>
              Scheduler: {(schedulerStatus as any).isRunning ? "Running" : "Stopped"}
            </Badge>
          ) : null}
          <Button onClick={() => {
            refetchShipments();
            setLastRefresh(new Date());
          }} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      {schedulerStatus && typeof schedulerStatus === 'object' && 'isRunning' in schedulerStatus && (schedulerStatus as any).isRunning && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-blue-700 font-medium">Auto-refreshing every 30 seconds while scheduler is running</span>
            </div>
            <span className="text-xs text-blue-600">Last updated: {lastRefresh.toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by tracking number, customer name, or destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="tracking" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Active Tracking ({allFilteredActiveShipments.length})
          </TabsTrigger>
          <TabsTrigger value="delivered" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Delivered ({allFilteredDeliveredShipments.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            Closed Tracking ({allFilteredClosedShipments.length})
          </TabsTrigger>
          <TabsTrigger value="process" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Process Control
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracking">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipment Tracking Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search and Bulk Actions */}
              <div className="mb-6 space-y-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by tracking number, customer name, or shipment ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Bulk Actions */}
                {selectedShipments.size > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedShipments.size} shipment(s) selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        onClick={bulkOpenTracking}
                        size="sm"
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Open Tracking
                      </Button>
                      <Button
                        onClick={bulkCloseTracking}
                        size="sm"
                        variant="outline"
                        className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Close Tracking
                      </Button>
                      <Button
                        onClick={clearSelection}
                        size="sm"
                        variant="outline"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Shipments Table */}
              {shipmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading shipments...
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead className="bg-white">
                            <Checkbox
                              checked={selectedShipments.size === filteredActiveShipments.length && filteredActiveShipments.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  selectAllShipments(filteredActiveShipments);
                                } else {
                                  clearSelection();
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead className="bg-white">Shipment ID</TableHead>
                          <TableHead className="bg-white">Tracking Numbers</TableHead>
                          <TableHead className="bg-white">Customer</TableHead>
                          <TableHead className="bg-white">Destination</TableHead>
                          <TableHead className="bg-white">Status & Issues</TableHead>
                          <TableHead className="bg-white">Carrier</TableHead>
                          <TableHead className="bg-white">Last Update & Description</TableHead>
                          <TableHead className="bg-white">Tracking Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {filteredActiveShipments.length > 0 ? (
                        filteredActiveShipments.map((shipment: Shipment) => (
                          <TableRow key={shipment.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedShipments.has(shipment.id)}
                                onCheckedChange={() => toggleShipmentSelection(shipment.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div>
                                <div>#{shipment.id}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(shipment.createdAt)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {shipment.trackingNumber && (
                                  <div className="text-sm font-mono bg-blue-50 px-2 py-1 rounded">
                                    {getTrackingUrl(shipment.carrier || '', shipment.trackingNumber) ? (
                                      <a 
                                        href={getTrackingUrl(shipment.carrier || '', shipment.trackingNumber)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                      >
                                        {shipment.trackingNumber}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    ) : (
                                      <span>{shipment.trackingNumber}</span>
                                    )}
                                  </div>
                                )}
                                {shipment.carrierTrackingNumber && (
                                  <div className="text-xs font-mono text-muted-foreground bg-gray-50 px-2 py-1 rounded">
                                    {getTrackingUrl(shipment.carrier || '', shipment.carrierTrackingNumber) ? (
                                      <a 
                                        href={getTrackingUrl(shipment.carrier || '', shipment.carrierTrackingNumber)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                      >
                                        {shipment.carrierTrackingNumber}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    ) : (
                                      <span>{shipment.carrierTrackingNumber}</span>
                                    )}
                                  </div>
                                )}
                                {shipment.manualTrackingNumber && (
                                  <div className="text-xs font-mono text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                                    <div className="flex items-center gap-1 mb-1">
                                      <span className="text-xs text-green-600 font-semibold">Manual:</span>
                                      {shipment.manualCarrierName && (
                                        <span className="text-xs text-green-600">({shipment.manualCarrierName})</span>
                                      )}
                                    </div>
                                    {shipment.manualTrackingLink ? (
                                      <a 
                                        href={shipment.manualTrackingLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-green-700 hover:text-green-900 hover:underline flex items-center gap-1 font-medium"
                                      >
                                        {shipment.manualTrackingNumber}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    ) : (
                                      <span className="font-medium">{shipment.manualTrackingNumber}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{shipment.receiverName || shipment.toName}</div>
                                {shipment.senderName && (
                                  <div className="text-sm text-muted-foreground">
                                    Sender: {shipment.senderName}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div>{shipment.toCity || 'Unknown'}</div>
                                <div className="text-sm text-muted-foreground">{shipment.receiverCountry || shipment.toCountry}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                <Badge className={getStatusColor(shipment.status)}>
                                  {shipment.status}
                                </Badge>
                                {(() => {
                                  const issueInfo = getDeliveryIssueInfo(shipment);
                                  return issueInfo ? (
                                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                                      <div className="flex items-center gap-2 mb-1">
                                        <AlertCircle className="h-4 w-4 text-red-600" />
                                        <span className="text-sm font-semibold text-red-800">
                                          {issueInfo.issueType}
                                        </span>
                                      </div>
                                      <div className="text-xs text-red-700 space-y-1">
                                        <div>
                                          Package has been in transit for {issueInfo.daysInTransit} days
                                        </div>
                                        {issueInfo.description && (
                                          <div className="font-medium">
                                            Current status: {issueInfo.description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : null;
                                })()}
                                {(() => {
                                  const latestEvent = getLatestTrackingEvent(shipment);
                                  return latestEvent?.status && !getDeliveryIssueInfo(shipment) ? (
                                    <div className="text-xs text-muted-foreground p-1 bg-gray-50 rounded">
                                      {latestEvent.status}
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                            </TableCell>
                            <TableCell>
                              {shipment.carrier && (
                                <Badge variant="outline" className={getCarrierColor(shipment.carrier)}>
                                  {shipment.carrier.toUpperCase()}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {shipment.trackingInfo ? (
                                <div className="text-sm space-y-2">
                                  <div className="font-medium">{formatDate(shipment.updatedAt)}</div>
                                  
                                  {/* Detailed tracking description */}
                                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="text-xs font-medium text-blue-800 mb-1">
                                      📋 Current Status Description:
                                    </div>
                                    <div className="text-xs text-blue-700">
                                      {getTrackingDescription(shipment)}
                                    </div>
                                  </div>

                                  {/* Location information */}
                                  {(() => {
                                    const latestEvent = getLatestTrackingEvent(shipment);
                                    return latestEvent?.location ? (
                                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        Location: {latestEvent.location}
                                      </div>
                                    ) : null;
                                  })()}

                                  {/* Additional tracking details */}
                                  {(() => {
                                    const latestEvent = getLatestTrackingEvent(shipment);
                                    return latestEvent?.status ? (
                                      <div className="text-xs text-muted-foreground">
                                        Latest Event: {latestEvent.status}
                                      </div>
                                    ) : null;
                                  })()}
                                </div>
                              ) : shipment.updatedAt ? (
                                <div className="text-sm">
                                  <div className="font-medium">{formatDate(shipment.updatedAt)}</div>
                                  <div className="text-xs text-muted-foreground">System update</div>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  <div>No updates available</div>
                                  <div className="text-xs">Check tracking for latest status</div>
                                </div>
                              )}
                            </TableCell>
                            
                            {/* Tracking Actions */}
                            <TableCell>
                              <div className="flex flex-col gap-2">
                                {shipment.trackingClosed ? (
                                  <div className="space-y-2">
                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                      <Ban className="h-3 w-3 mr-1" />
                                      Tracking Closed
                                    </Badge>
                                    {shipment.trackingCloseReason && (
                                      <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded border max-w-48">
                                        <div className="font-medium mb-1">Reason:</div>
                                        <div className="break-words">{shipment.trackingCloseReason}</div>
                                      </div>
                                    )}
                                    <Button
                                      onClick={() => toggleTrackingStatus(shipment.id, true)}
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-xs text-green-700 border-green-200 hover:bg-green-50"
                                    >
                                      <Play className="h-3 w-3 mr-1" />
                                      Reopen Tracking
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Tracking Active
                                    </Badge>
                                    <Button
                                      onClick={() => toggleTrackingStatus(shipment.id, false)}
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-xs text-red-700 border-red-200 hover:bg-red-50"
                                    >
                                      <Pause className="h-3 w-3 mr-1" />
                                      Close Tracking
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <Package className="h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                {searchTerm ? "No active shipments found matching your search." : "No active shipments currently being tracked."}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <Package className="h-8 w-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-muted-foreground">Active Tracking</p>
                        <p className="text-2xl font-bold">{activeShipments.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <Truck className="h-8 w-8 text-orange-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-muted-foreground">In Transit</p>
                        <p className="text-2xl font-bold">
                          {shipmentsWithTracking.filter((s: Shipment) => s.status === 'in_transit').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <Ban className="h-8 w-8 text-red-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-muted-foreground">Closed Tracking</p>
                        <p className="text-2xl font-bold">
                          {closedShipments.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-muted-foreground">Delivered</p>
                        <p className="text-2xl font-bold">
                          {shipmentsWithTracking.filter((s: Shipment) => s.status === 'delivered').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <AlertCircle className="h-8 w-8 text-red-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-muted-foreground">Exceptions</p>
                        <p className="text-2xl font-bold">
                          {allShipments.filter((s: Shipment) => s.status === 'exception').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivered">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Delivered Shipments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shipmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading delivered shipments...</span>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead className="bg-white">Shipment ID</TableHead>
                          <TableHead className="bg-white">Tracking Numbers</TableHead>
                          <TableHead className="bg-white">Customer</TableHead>
                          <TableHead className="bg-white">Destination</TableHead>
                          <TableHead className="bg-white">Status</TableHead>
                          <TableHead className="bg-white">Carrier</TableHead>
                          <TableHead className="bg-white">Delivery Date</TableHead>
                          <TableHead className="bg-white">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDeliveredShipments.length > 0 ? (
                          filteredDeliveredShipments.map((shipment: Shipment) => (
                            <TableRow key={shipment.id}>
                              <TableCell className="font-medium">
                                <div>
                                  <div>#{shipment.id}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(shipment.createdAt)}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {shipment.trackingNumber && (
                                    <div className="text-sm font-mono bg-blue-50 px-2 py-1 rounded">
                                      {getTrackingUrl(shipment.carrier || '', shipment.trackingNumber) ? (
                                        <a 
                                          href={getTrackingUrl(shipment.carrier || '', shipment.trackingNumber)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                        >
                                          {shipment.trackingNumber}
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      ) : (
                                        <span>{shipment.trackingNumber}</span>
                                      )}
                                    </div>
                                  )}
                                  {shipment.carrierTrackingNumber && (
                                    <div className="text-xs font-mono text-muted-foreground bg-gray-50 px-2 py-1 rounded">
                                      {getTrackingUrl(shipment.carrier || '', shipment.carrierTrackingNumber) ? (
                                        <a 
                                          href={getTrackingUrl(shipment.carrier || '', shipment.carrierTrackingNumber)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                        >
                                          {shipment.carrierTrackingNumber}
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      ) : (
                                        <span>{shipment.carrierTrackingNumber}</span>
                                      )}
                                    </div>
                                  )}
                                  {shipment.manualTrackingNumber && (
                                    <div className="text-xs font-mono text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                                      <div className="flex items-center gap-1 mb-1">
                                        <span className="text-xs text-green-600 font-semibold">Manual:</span>
                                        {shipment.manualCarrierName && (
                                          <span className="text-xs text-green-600">({shipment.manualCarrierName})</span>
                                        )}
                                      </div>
                                      {shipment.manualTrackingLink ? (
                                        <a 
                                          href={shipment.manualTrackingLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-green-700 hover:text-green-900 hover:underline flex items-center gap-1 font-medium"
                                        >
                                          {shipment.manualTrackingNumber}
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      ) : (
                                        <span className="font-medium">{shipment.manualTrackingNumber}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{shipment.receiverName || shipment.toName}</div>
                                  {shipment.senderName && (
                                    <div className="text-sm text-muted-foreground">
                                      Sender: {shipment.senderName}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div>{shipment.toCity || 'Unknown'}</div>
                                  <div className="text-sm text-muted-foreground">{shipment.receiverCountry || shipment.toCountry}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-green-100 text-green-800">
                                  Delivered
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {shipment.carrier && (
                                  <Badge variant="outline" className={getCarrierColor(shipment.carrier)}>
                                    {shipment.carrier.toUpperCase()}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{formatDate(shipment.updatedAt)}</div>
                                  <div className="text-xs text-green-600">✓ Successfully delivered</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  onClick={() => {
                                    setShipmentToClose(shipment.id);
                                    setShowCloseDialog(true);
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-red-700 border-red-200 hover:bg-red-50"
                                >
                                  <Pause className="h-3 w-3 mr-1" />
                                  Close Tracking
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              <div className="flex flex-col items-center gap-2">
                                <CheckCircle className="h-8 w-8 text-muted-foreground" />
                                <p className="text-muted-foreground">
                                  {searchTerm ? "No delivered shipments found matching your search." : "No shipments have been delivered yet."}
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              
              {/* Pagination for Delivered Shipments */}
              {!shipmentsLoading && allFilteredDeliveredShipments.length > itemsPerPage && (
                <div className="flex items-center justify-between mt-4 px-4 py-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {deliveredStartIndex + 1} to {Math.min(deliveredStartIndex + itemsPerPage, allFilteredDeliveredShipments.length)} of {allFilteredDeliveredShipments.length} delivered shipments
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeliveredPage(prev => Math.max(prev - 1, 1))}
                      disabled={deliveredPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {deliveredPage} of {deliveredTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeliveredPage(prev => Math.min(prev + 1, deliveredTotalPages))}
                      disabled={deliveredPage === deliveredTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closed">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Closed Tracking Shipments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shipmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading closed shipments...</span>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead className="bg-white">Shipment ID</TableHead>
                          <TableHead className="bg-white">Tracking Numbers</TableHead>
                          <TableHead className="bg-white">Customer</TableHead>
                          <TableHead className="bg-white">Destination</TableHead>
                          <TableHead className="bg-white">Status</TableHead>
                          <TableHead className="bg-white">Carrier</TableHead>
                          <TableHead className="bg-white">Close Reason</TableHead>
                          <TableHead className="bg-white">Tracking Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {filteredClosedShipments.length > 0 ? (
                        filteredClosedShipments.map((shipment: Shipment) => (
                          <TableRow key={shipment.id}>
                            <TableCell className="font-medium">
                              <div>
                                <div>#{shipment.id}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(shipment.createdAt)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {shipment.trackingNumber && (
                                  <div className="text-sm font-mono bg-blue-50 px-2 py-1 rounded">
                                    {getTrackingUrl(shipment.carrier || '', shipment.trackingNumber) ? (
                                      <a 
                                        href={getTrackingUrl(shipment.carrier || '', shipment.trackingNumber)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                      >
                                        {shipment.trackingNumber}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    ) : (
                                      <span>{shipment.trackingNumber}</span>
                                    )}
                                  </div>
                                )}
                                {shipment.carrierTrackingNumber && (
                                  <div className="text-sm font-mono bg-orange-50 px-2 py-1 rounded">
                                    {getTrackingUrl(shipment.carrier || '', shipment.carrierTrackingNumber) ? (
                                      <a 
                                        href={getTrackingUrl(shipment.carrier || '', shipment.carrierTrackingNumber)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-orange-600 hover:text-orange-800 hover:underline flex items-center gap-1"
                                      >
                                        {shipment.carrierTrackingNumber}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    ) : (
                                      <span>{shipment.carrierTrackingNumber}</span>
                                    )}
                                  </div>
                                )}
                                {shipment.manualTrackingNumber && (
                                  <div className="text-xs font-mono text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                                    <div className="flex items-center gap-1 mb-1">
                                      <span className="text-xs text-green-600 font-semibold">Manual:</span>
                                      {shipment.manualCarrierName && (
                                        <span className="text-xs text-green-600">({shipment.manualCarrierName})</span>
                                      )}
                                    </div>
                                    {shipment.manualTrackingLink ? (
                                      <a 
                                        href={shipment.manualTrackingLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-green-700 hover:text-green-900 hover:underline flex items-center gap-1 font-medium"
                                      >
                                        {shipment.manualTrackingNumber}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    ) : (
                                      <span className="font-medium">{shipment.manualTrackingNumber}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{shipment.senderName || shipment.toName}</div>
                                <div className="text-sm text-muted-foreground">ID: {shipment.userId}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{shipment.toCity}</div>
                                <div className="text-sm text-muted-foreground">{shipment.toCountry}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(shipment.status)}>
                                {shipment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {shipment.carrier && (
                                <Badge className={getCarrierColor(shipment.carrier)}>
                                  {shipment.carrier}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {shipment.trackingCloseReason ? (
                                <div className="text-sm bg-gray-50 p-2 rounded border max-w-48">
                                  <div className="break-words">{shipment.trackingCloseReason}</div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">No reason provided</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                onClick={() => toggleTrackingStatus(shipment.id, true)}
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs text-green-700 border-green-200 hover:bg-green-50"
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Reopen Tracking
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <Ban className="h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                {searchTerm ? "No closed shipments found matching your search." : "No shipments have been closed yet."}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </div>
              )}
              
              {/* Pagination for Closed Shipments */}
              {!shipmentsLoading && allFilteredClosedShipments.length > itemsPerPage && (
                <div className="flex items-center justify-between mt-4 px-4 py-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {closedStartIndex + 1} to {Math.min(closedStartIndex + itemsPerPage, allFilteredClosedShipments.length)} of {allFilteredClosedShipments.length} closed shipments
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setClosedPage(prev => Math.max(prev - 1, 1))}
                      disabled={closedPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {closedPage} of {closedTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setClosedPage(prev => Math.min(prev + 1, closedTotalPages))}
                      disabled={closedPage === closedTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="process">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notification Control */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ban className="h-5 w-5" />
                  Notification Control
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">Auto-Stop for Delivered</p>
                        <p className="text-sm text-green-600">Notifications automatically stop for delivered shipments</p>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      Active
                    </Badge>
                  </div>
                  
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                      <p className="font-medium text-blue-800">Notification Rules</p>
                    </div>
                    <ul className="text-sm text-blue-700 space-y-1 ml-8">
                      <li>• No notifications sent for status: "delivered"</li>
                      <li>• No notifications sent for status: "completed"</li>
                      <li>• No notifications sent for status: "done"</li>
                      <li>• Manual override available for exceptional cases</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Process Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Process Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Active Tracking</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {shipmentsWithTracking.filter((s: Shipment) => 
                          !['delivered', 'completed', 'done'].includes(s.status.toLowerCase())
                        ).length}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Notification Blocked</p>
                      <p className="text-2xl font-bold text-green-600">
                        {shipmentsWithTracking.filter((s: Shipment) => 
                          ['delivered', 'completed', 'done'].includes(s.status.toLowerCase())
                        ).length}
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Status Distribution</h4>
                    <div className="space-y-2">
                      {['pending', 'processing', 'in_transit', 'out_for_delivery', 'delivered', 'exception'].map(status => {
                        const count = shipmentsWithTracking.filter((s: Shipment) => s.status === status).length;
                        const isBlocked = ['delivered', 'completed', 'done'].includes(status);
                        return count > 0 ? (
                          <div key={status} className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(status)}>
                                {status}
                              </Badge>
                              {isBlocked && <Ban className="h-4 w-4 text-red-500" />}
                            </div>
                            <span className="font-medium">{count}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scheduler Control */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Tracking Scheduler Control
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    {schedulerStatus && typeof schedulerStatus === 'object' && 'isRunning' in schedulerStatus ? (
                      <>
                        {(schedulerStatus as any).isRunning ? (
                          <Play className="h-6 w-6 text-green-600" />
                        ) : (
                          <Pause className="h-6 w-6 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">
                            Scheduler Status: {(schedulerStatus as any).isRunning ? 'Running' : 'Stopped'}
                          </p>
                          {(schedulerStatus as any).nextSync && (
                            <p className="text-sm text-muted-foreground">
                              Next sync: {new Date((schedulerStatus as any).nextSync).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <Clock className="h-6 w-6 text-gray-600" />
                        <div>
                          <p className="font-medium">Scheduler Status: Unknown</p>
                          <p className="text-sm text-muted-foreground">Loading status...</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="text-sm text-blue-700">
                    <p>Automatic tracking updates run 3 times daily</p>
                    <p>(6 AM, 12 PM, 7 PM Turkey time)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Notification Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Notification Features Coming Soon</h3>
                <p className="text-muted-foreground">
                  Advanced notification management features will be available in the next update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      {/* Bulk Close Tracking Dialog */}
      <Dialog open={showBulkCloseDialog} onOpenChange={setShowBulkCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Close Tracking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for closing tracking for {selectedShipments.size} selected shipments:
            </p>
            <Textarea
              placeholder="Enter reason for closing tracking (e.g., packages delivered, customer request, issue resolved, etc.)"
              value={bulkCloseReason}
              onChange={(e) => setBulkCloseReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowBulkCloseDialog(false);
                setBulkCloseReason("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={executeBulkCloseTracking}
              disabled={!bulkCloseReason.trim()}
            >
              Close {selectedShipments.size} Shipments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Tracking Reason Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Tracking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for closing tracking for shipment #{shipmentToClose}:
            </p>
            <Textarea
              placeholder="Enter reason for closing tracking (e.g., package delivered, customer request, issue resolved, etc.)"
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCloseDialog(false);
                setCloseReason("");
                setShipmentToClose(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={closeTrackingWithReason}
              disabled={!closeReason.trim()}
            >
              Close Tracking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

export default withAuth(AdminTrackingPage, true);