import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Truck, 
  Package, 
  Search,
  FileText,
  MapPin,
  RefreshCw,
  ArrowUpDown,
  ExternalLink,
  Info,
  Copy,
  Plane
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ShipmentPreviewCard } from "@/components/shipment-preview-card";
import { withAuth } from "@/lib/with-auth";
import { ShipmentStatusColors } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { useSecureLabels } from "@/hooks/useSecureLabels";

// Helper components for inline tracking data
function TrackingStatusCell({ shipmentId }: { shipmentId: number }) {
  const { data: trackingInfo, isLoading } = useQuery({
    queryKey: ['/api/shipments/track', shipmentId],
    queryFn: async () => {
      const response = await fetch(`/api/shipments/track/${shipmentId}`);
      if (!response.ok) return null;
      return response.json();
    },
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 240000, // Consider data stale after 4 minutes
  });

  if (isLoading) {
    return <Skeleton className="h-4 w-20" />;
  }

  if (!trackingInfo?.events?.length) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  const latestStatus = trackingInfo.events[0]?.status || trackingInfo.status;
  
  return (
    <Badge variant="outline" className="text-xs">
      {latestStatus}
    </Badge>
  );
}

function EstimatedDeliveryCell({ shipmentId }: { shipmentId: number }) {
  const { data: trackingInfo, isLoading } = useQuery({
    queryKey: ['/api/shipments/track', shipmentId],
    queryFn: async () => {
      const response = await fetch(`/api/shipments/track/${shipmentId}`);
      if (!response.ok) return null;
      return response.json();
    },
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 240000, // Consider data stale after 4 minutes
  });

  if (isLoading) {
    return <Skeleton className="h-4 w-24" />;
  }

  if (!trackingInfo?.estimatedDelivery) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  try {
    const delivery = trackingInfo.estimatedDelivery;
    let formattedDate;
    
    if (delivery.includes(' ')) {
      // UPS format: "20250528 120000"
      const datePart = delivery.split(' ')[0];
      const year = datePart.substring(0, 4);
      const month = datePart.substring(4, 6);
      const day = datePart.substring(6, 8);
      const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      formattedDate = formatDate(localDate.toISOString());
    } else {
      formattedDate = formatDate(delivery);
    }
    
    return (
      <span className="text-sm font-medium text-green-700">
        {formattedDate}
      </span>
    );
  } catch (e) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }
}

interface Shipment {
  id: number;
  userId: number;
  trackingNumber?: string;
  carrierTrackingNumber?: string;
  labelUrl?: string;
  senderName: string;
  senderAddress: string;
  senderCity: string;
  senderCountry: string;
  senderPostalCode: string;
  senderPhone: string;
  senderEmail: string;
  receiverName: string;
  receiverAddress: string;
  receiverCity: string;
  receiverCountry: string;
  receiverPostalCode: string;
  receiverPhone: string;
  receiverEmail: string;
  packageWeight: number;
  packageWidth: number;
  packageHeight: number;
  packageLength: number;
  serviceLevel: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  totalCost?: number;
}

interface TrackingInfo {
  trackingNumber?: string;
  currentStatus: string;
  status?: string;
  statusText?: string;
  lastUpdated: string;
  currentLocation: string;
  estimatedDelivery?: string;
  carrierInfo?: {
    name: string;
  };
  timeline?: {
    timestamp: string;
    status: string;
    location: string;
    description: string;
  }[];
  events: {
    timestamp: string;
    status: string;
    location: string;
    description: string;
  }[];
}

interface ApprovedShipmentsProps {
  user: any;
}

function ApprovedShipmentsContent({ user }: ApprovedShipmentsProps) {
  const { t } = useTranslation();
  const { openMoogshipLabel, openCarrierLabel, isAnyLoading: isSecureLabelsLoading } = useSecureLabels();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<keyof Shipment>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("approved");
  
  // Fetch complete user profile data with customerMultiplier
  const {
    data: userProfile,
    isLoading: isLoadingUser
  } = useQuery({
    queryKey: ['/api/user'],
    staleTime: 300000, // 5 minutes
    enabled: !!user
  });
  
  // Fetch all the user's shipments
  const {
    data: allShipments = [],
    isLoading,
    refetch
  } = useQuery<Shipment[]>({
    queryKey: ['/api/shipments/my'],
    staleTime: 60000, // 1 minute
    enabled: !!user
  });
  
  // Filter shipments based on status tab and search term
  const filteredShipments = allShipments.filter(shipment => {
    const matchesTab = 
      (currentTab === "approved" && shipment.status === "approved" && !shipment.carrierTrackingNumber) ||
      (currentTab === "pre_transit" && shipment.status === "approved" && shipment.carrierTrackingNumber) ||
      (currentTab === "in_transit" && shipment.status === "in_transit") ||
      (currentTab === "delivered" && shipment.status === "delivered");
    
    const matchesSearch = 
      shipment.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.receiverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.receiverCountry.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesTab && (searchTerm === "" || matchesSearch);
  });
  
  // Sort the filtered shipments
  const sortedShipments = [...filteredShipments].sort((a, b) => {
    const valueA = a[sortBy];
    const valueB = b[sortBy];
    
    if (valueA === valueB) return 0;
    
    // Handle string/number sorting
    const comparison = typeof valueA === 'string' 
      ? (valueA as string).localeCompare(valueB as string)
      : (valueA as number) - (valueB as number);
    
    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Fetch tracking information when a shipment is selected
  const {
    data: trackingInfo,
    isLoading: isLoadingTracking,
    refetch: refetchTracking
  } = useQuery<TrackingInfo>({
    queryKey: [`/api/shipments/track/${selectedShipment?.id}`],
    enabled: !!selectedShipment && trackingDialogOpen,
    staleTime: 60000 // 1 minute
  });

  // Toggle sort order or change sort field
  const handleSort = (field: keyof Shipment) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Open tracking dialog for a shipment
  const handleTrackShipment = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setTrackingDialogOpen(true);
  };

  // Handler to download the shipping label
  const handleDownloadLabel = (shipment: Shipment) => {
    if (shipment.labelUrl) {
      window.open(shipment.labelUrl, '_blank');
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t('approvedShipments.title')}</h1>
              <p className="text-muted-foreground mt-1">
                {t('approvedShipments.description')}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => refetch()}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                {t('approvedShipments.refresh')}
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t('approvedShipments.search')}
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Status Tabs */}
          <Tabs 
            defaultValue="approved" 
            value={currentTab}
            onValueChange={setCurrentTab}
            className="mb-6"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="approved" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                {t('approvedShipments.tabs.approved')}
              </TabsTrigger>
              <TabsTrigger value="pre_transit" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Pre-Transit
              </TabsTrigger>
              <TabsTrigger value="in_transit" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                {t('approvedShipments.tabs.inTransit')}
              </TabsTrigger>
              <TabsTrigger value="delivered" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t('approvedShipments.tabs.delivered')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Shipments Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">
                {currentTab === "approved" && t('approvedShipments.tableHeaders.approvedShipments')}
                {currentTab === "pre_transit" && "Pre-Transit Shipments"}
                {currentTab === "in_transit" && t('approvedShipments.tableHeaders.shipmentsInTransit')}
                {currentTab === "delivered" && t('approvedShipments.tableHeaders.deliveredShipments')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between py-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                      <Skeleton className="h-10 w-[100px]" />
                    </div>
                  ))}
                </div>
              ) : sortedShipments.length === 0 ? (
                <div className="py-24 text-center">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mb-3">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{t('approvedShipments.tableHeaders.noShipmentsFound')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {currentTab === "approved" && t('approvedShipments.tableHeaders.noApproved')}
                    {currentTab === "pre_transit" && "No pre-transit shipments found. Pre-transit shipments have labels created but haven't been picked up by UPS yet."}
                    {currentTab === "in_transit" && t('approvedShipments.tableHeaders.noInTransit')}
                    {currentTab === "delivered" && t('approvedShipments.tableHeaders.noDelivered')}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer"
                          onClick={() => handleSort('trackingNumber')}
                        >
                          <div className="flex items-center gap-1">
                            {t('approvedShipments.columns.tracking')}
                            {sortBy === 'trackingNumber' && (
                              <ArrowUpDown className="h-3 w-3" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer"
                          onClick={() => handleSort('receiverName')}
                        >
                          <div className="flex items-center gap-1">
                            {t('approvedShipments.columns.recipient')}
                            {sortBy === 'receiverName' && (
                              <ArrowUpDown className="h-3 w-3" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer"
                          onClick={() => handleSort('receiverCountry')}
                        >
                          <div className="flex items-center gap-1">
                            {t('approvedShipments.columns.destination')}
                            {sortBy === 'receiverCountry' && (
                              <ArrowUpDown className="h-3 w-3" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer"
                          onClick={() => handleSort('createdAt')}
                        >
                          <div className="flex items-center gap-1">
                            {t('approvedShipments.columns.date')}
                            {sortBy === 'createdAt' && (
                              <ArrowUpDown className="h-3 w-3" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead>{t('approvedShipments.columns.status')}</TableHead>
                        <TableHead>{t('approvedShipments.columns.trackingStatus')}</TableHead>
                        <TableHead>{t('approvedShipments.columns.estimatedDelivery')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedShipments.map((shipment) => (
                        <TableRow key={shipment.id}>
                          <TableCell className="font-medium">
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  {shipment.trackingNumber ? (
                                    <div className="flex flex-col">
                                      <button
                                        onClick={() => handleTrackShipment(shipment)}
                                        className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-sm cursor-pointer text-left"
                                      >
                                        {shipment.trackingNumber}
                                      </button>
                                      {(shipment as any).carrierTrackingNumber && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <div className="flex items-center gap-1">
                                            <div className="w-4 h-4 bg-amber-600 rounded-sm flex items-center justify-center">
                                              <span className="text-white text-xs font-bold" style={{fontSize: '6px'}}>UPS</span>
                                            </div>
                                            <span className="font-medium">UPS:</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="font-mono">{(shipment as any).carrierTrackingNumber}</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText((shipment as any).carrierTrackingNumber);
                                                // Could add toast notification here if needed
                                              }}
                                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                                              title={t('common.copyTrackingNumber', 'Copy tracking number')}
                                            >
                                              <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                            </button>
                                            
                                            {/* Carrier Label Button */}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openCarrierLabel(shipment.id);
                                              }}
                                              className="p-1 hover:bg-blue-50 rounded transition-colors group"
                                              title="View Carrier Label"
                                              disabled={isSecureLabelsLoading}
                                            >
                                              <div className="h-3 w-3 relative border border-blue-600 rounded-sm flex items-center justify-center group-hover:border-blue-800">
                                                <Plane className="h-2 w-2 text-blue-600 group-hover:text-blue-800" />
                                              </div>
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    t('common.pending')
                                  )}
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent side="right" align="start" className="w-80 p-0">
                                <ShipmentPreviewCard shipment={shipment} />
                              </HoverCardContent>
                            </HoverCard>
                          </TableCell>
                          <TableCell>
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  {shipment.receiverName}
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent side="right" align="start" className="w-80 p-4">
                                <div className="space-y-2">
                                  <h4 className="font-semibold">{t('approvedShipments.hoverCards.recipientDetails')}</h4>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-muted-foreground">{t('approvedShipments.hoverCards.name')}:</div>
                                    <div>{shipment.receiverName}</div>
                                    <div className="text-muted-foreground">{t('approvedShipments.hoverCards.email')}:</div>
                                    <div>{shipment.receiverEmail}</div>
                                    <div className="text-muted-foreground">{t('approvedShipments.hoverCards.phone')}:</div>
                                    <div>{shipment.receiverPhone}</div>
                                    <div className="text-muted-foreground">{t('approvedShipments.hoverCards.address')}:</div>
                                    <div>{shipment.receiverAddress}</div>
                                  </div>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          </TableCell>
                          <TableCell>
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  {shipment.receiverCity}, {shipment.receiverCountry}
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent side="right" align="start" className="w-80 p-4">
                                <div className="space-y-2">
                                  <h4 className="font-semibold">{t('approvedShipments.hoverCards.destinationDetails')}</h4>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-muted-foreground">{t('approvedShipments.hoverCards.from')}:</div>
                                    <div>{shipment.senderCity}, {shipment.senderCountry}</div>
                                    <div className="text-muted-foreground">{t('approvedShipments.hoverCards.to')}:</div>
                                    <div>{shipment.receiverCity}, {shipment.receiverCountry}</div>
                                    <div className="text-muted-foreground">{t('approvedShipments.hoverCards.postalCode')}:</div>
                                    <div>{shipment.receiverPostalCode}</div>
                                    <div className="text-muted-foreground">{t('approvedShipments.hoverCards.serviceLevel')}:</div>
                                    <div>{shipment.serviceLevel.toUpperCase()}</div>
                                  </div>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          </TableCell>
                          <TableCell>{formatDate(shipment.createdAt)}</TableCell>
                          <TableCell>
                            <Badge
                              className={`${ShipmentStatusColors[shipment.status as keyof typeof ShipmentStatusColors]}`}
                            >
                              {t(`approvedShipments.status.${shipment.status}`)}
                            </Badge>
                          </TableCell>
                          
                          {/* Latest Tracking Status */}
                          <TableCell>
                            <TrackingStatusCell shipmentId={shipment.id} />
                          </TableCell>
                          
                          {/* Estimated Delivery Date */}
                          <TableCell>
                            <EstimatedDeliveryCell shipmentId={shipment.id} />
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

      {/* Tracking Dialog */}
      <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('approvedShipments.tracking.dialogTitle')}</DialogTitle>
            <DialogDescription>
              {selectedShipment?.trackingNumber 
                ? `${t('approvedShipments.tracking.dialogDescription')} ${selectedShipment.trackingNumber}`
                : t('approvedShipments.tracking.dialogTitle')
              }
            </DialogDescription>
          </DialogHeader>

          {isLoadingTracking ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : trackingInfo ? (
            <div className="py-4">
              {/* Current Status Summary */}
              <div className="mb-6 bg-muted/50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{t('approvedShipments.tracking.currentStatus')}</h3>
                  <Badge
                    className={`${
                      ShipmentStatusColors[trackingInfo.currentStatus as keyof typeof ShipmentStatusColors] || 
                      'bg-blue-500 text-white'
                    }`}
                  >
                    {trackingInfo.timeline && trackingInfo.timeline.length > 0 
                      ? trackingInfo.timeline[0].status 
                      : trackingInfo.statusText || trackingInfo.status
                    }
                  </Badge>
                </div>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('approvedShipments.tracking.trackingNumber')}:</span>
                    <a 
                      href={`https://www.ups.com/track?trackingNumber=${selectedShipment?.carrierTrackingNumber || trackingInfo.trackingNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      {selectedShipment?.carrierTrackingNumber || trackingInfo.trackingNumber}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('approvedShipments.tracking.carrier')}:</span>
                    <span className="font-medium">{trackingInfo.carrierInfo?.name || 'UPS'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('approvedShipments.tracking.lastUpdated')}:</span>
                    <span>{trackingInfo.timeline && trackingInfo.timeline.length > 0 ? formatDate(trackingInfo.timeline[0].timestamp) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('approvedShipments.tracking.currentLocation')}:</span>
                    <span>{trackingInfo.currentLocation}</span>
                  </div>
                  {trackingInfo.estimatedDelivery && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('approvedShipments.tracking.estimatedDelivery')}:</span>
                      <span>{
                        (() => {
                          try {
                            // Handle UPS format "20250528 120000" or ISO format
                            const delivery = trackingInfo.estimatedDelivery;
                            if (delivery.includes(' ')) {
                              // UPS format: "20250528 120000"
                              const datePart = delivery.split(' ')[0];
                              const year = datePart.substring(0, 4);
                              const month = datePart.substring(4, 6);
                              const day = datePart.substring(6, 8);
                              // Create date as local date to avoid timezone issues
                              const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                              return formatDate(localDate.toISOString());
                            } else {
                              // ISO format
                              return formatDate(delivery);
                            }
                          } catch (e) {
                            console.error('Date formatting error:', e);
                            return trackingInfo.estimatedDelivery;
                          }
                        })()
                      }</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tracking History */}
              <h3 className="font-semibold mb-3">{t('approvedShipments.tracking.trackingHistory')}</h3>
              <div className="max-h-64 overflow-y-auto space-y-4">
                {trackingInfo.events && trackingInfo.events.length > 0 ? (
                  trackingInfo.events.map((event, index) => (
                    <div key={index} className="relative pl-6 pb-4 border-l-2 border-muted last:border-l-transparent">
                      <div className="absolute left-[-8px] top-0 w-4 h-4 rounded-full bg-primary" />
                      <div className="mb-1">
                        <span className="font-medium">{event.status}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatDate(event.timestamp)}
                        </span>
                      </div>
                      <div className="text-sm">
                        <p className="text-muted-foreground">{event.location}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">
                      {t('approvedShipments.tracking.noEventsYet', 'No tracking events available yet')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                {t('approvedShipments.tracking.noTrackingInfo')}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTrackingDialogOpen(false)}
            >
              {t('common.close')}
            </Button>
            <Button 
              onClick={() => refetchTracking()}
              disabled={isLoadingTracking}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingTracking ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            {selectedShipment?.labelUrl && (
              <Button
                onClick={() => handleDownloadLabel(selectedShipment)}
              >
                <FileText className="mr-2 h-4 w-4" />
                {t('approvedShipments.buttons.downloadLabel')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

export default withAuth(ApprovedShipmentsContent);