import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout';
import { ProtectedRoute } from '@/lib/protected-route';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Package, Truck, MapPin, Calendar, ExternalLink, RefreshCw, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Shipment {
  id: number;
  trackingNumber: string;
  carrierTrackingNumber?: string;
  senderName: string;
  senderCity: string;
  senderCountry: string;
  receiverName: string;
  receiverCity: string;
  receiverCountry: string;
  status: string;
  createdAt: string;
  description?: string;
  pieceCount?: number;
  customsValue?: number;
  currency?: string;
}

interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
  status: string;
  statusDescription: string;
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
  events: Array<{
    timestamp: string;
    status: string;
    location: string;
  }>;
}

function InTransitContent() {
  const { t } = useTranslation();
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);

  // Fetch shipments with IN_TRANSIT status
  const { data: shipments, isLoading, refetch } = useQuery({
    queryKey: ['/api/shipments/my'],
    queryFn: async () => {
      const response = await fetch('/api/shipments/my');
      if (!response.ok) throw new Error('Failed to fetch shipments');
      const allShipments = await response.json();
      // Filter only shipments that are in transit
      return allShipments.filter((shipment: Shipment) => 
        shipment.status === 'IN_TRANSIT' || shipment.carrierTrackingNumber
      );
    },
  });

  // Fetch tracking info for selected shipment
  const { data: trackingInfo, isLoading: isLoadingTracking, refetch: refetchTracking } = useQuery({
    queryKey: ['/api/shipments/track', selectedShipment?.id],
    queryFn: async () => {
      if (!selectedShipment?.id) return null;
      const response = await fetch(`/api/shipments/track/${selectedShipment.id}`);
      if (!response.ok) throw new Error('Failed to fetch tracking info');
      return response.json();
    },
    enabled: !!selectedShipment?.id && trackingDialogOpen,
  });

  const handleViewTracking = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setTrackingDialogOpen(true);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'in_transit':
      case 'departed from facility':
      case 'arrived at facility':
        return 'bg-blue-100 text-blue-800';
      case 'out_for_delivery':
      case 'out for delivery':
        return 'bg-orange-100 text-orange-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'exception':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLatestTrackingStatus = (shipment: Shipment) => {
    // This would ideally fetch real-time status, but for now return the shipment status
    return shipment.status === 'IN_TRANSIT' ? t('shipments.status.inTransit') : shipment.status;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              {t('inTransit.title', 'In Transit Shipments')}
            </h1>
            <p className="text-muted-foreground">
              {t('inTransit.description', 'Track your shipments currently in transit')}
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh')}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('inTransit.totalShipments', 'Total In Transit')}
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{shipments?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('inTransit.withTracking', 'With Tracking')}
              </CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {shipments?.filter((s: Shipment) => s.carrierTrackingNumber || s.manualTrackingNumber).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('inTransit.avgTransitTime', 'Avg Transit Time')}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {t('inTransit.days', '5-7 days')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shipments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t('inTransit.shipmentsList', 'In Transit Shipments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!shipments || shipments.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {t('inTransit.noShipments', 'No shipments currently in transit')}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('shipments.trackingNumber')}</TableHead>
                    <TableHead>{t('shipments.recipient')}</TableHead>
                    <TableHead>{t('shipments.destination')}</TableHead>
                    <TableHead>{t('shipments.status')}</TableHead>
                    <TableHead>{t('shipments.shipDate')}</TableHead>
                    <TableHead>{t('shipments.value')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment: Shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-mono text-sm">
                        <div className="space-y-1">
                          <div className="font-medium">{shipment.trackingNumber}</div>
                          {shipment.carrierTrackingNumber && (
                            <div className="text-xs text-muted-foreground">
                              UPS: {shipment.carrierTrackingNumber}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{shipment.receiverName}</div>
                          <div className="text-sm text-muted-foreground">
                            {shipment.description || 'Package contents'}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{shipment.receiverCity}</div>
                          <div className="text-sm text-muted-foreground">{shipment.receiverCountry}</div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={getStatusBadgeColor(getLatestTrackingStatus(shipment))}>
                          {getLatestTrackingStatus(shipment)}
                        </Badge>
                      </TableCell>
                      
                      <TableCell className="text-sm">
                        {formatDate(shipment.createdAt)}
                      </TableCell>
                      
                      <TableCell>
                        {shipment.customsValue && (
                          <span className="text-sm">
                            ${(shipment.customsValue / 100).toFixed(2)} {shipment.currency || 'USD'}
                          </span>
                        )}
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {shipment.carrierTrackingNumber && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewTracking(shipment)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {t('common.track')}
                            </Button>
                          )}
                          
                          {shipment.carrierTrackingNumber && (
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                            >
                              <a
                                href={`https://www.ups.com/track?trackingNumber=${shipment.carrierTrackingNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Tracking Dialog */}
        <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                {t('shipments.trackingDetails')}
              </DialogTitle>
            </DialogHeader>
            
            {isLoadingTracking ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : trackingInfo ? (
              <div className="space-y-4">
                {/* Current Status */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <h3 className="font-semibold">{t('shipments.currentStatus')}</h3>
                    <p className="text-sm text-muted-foreground">{trackingInfo.currentLocation}</p>
                  </div>
                  <Badge className={getStatusBadgeColor(trackingInfo.status)}>
                    {trackingInfo.status}
                  </Badge>
                </div>

                {/* Tracking Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('shipments.trackingNumber')}:</span>
                      <a 
                        href={`https://www.ups.com/track?trackingNumber=${trackingInfo.trackingNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {trackingInfo.trackingNumber}
                      </a>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('shipments.carrier')}:</span>
                      <span className="font-medium">{trackingInfo.carrier}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {trackingInfo.estimatedDelivery && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('shipments.estimatedDelivery')}:</span>
                        <span>{
                          (() => {
                            try {
                              const delivery = trackingInfo.estimatedDelivery;
                              if (delivery.includes(' ')) {
                                // UPS format: "20250528 120000"
                                const datePart = delivery.split(' ')[0];
                                const year = datePart.substring(0, 4);
                                const month = datePart.substring(4, 6);
                                const day = datePart.substring(6, 8);
                                const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                return formatDate(localDate.toISOString());
                              } else {
                                return formatDate(delivery);
                              }
                            } catch (e) {
                              return trackingInfo.estimatedDelivery;
                            }
                          })()
                        }</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tracking History */}
                <div>
                  <h3 className="font-semibold mb-3">{t('shipments.trackingHistory')}</h3>
                  <div className="max-h-64 overflow-y-auto space-y-4">
                    {trackingInfo.events && trackingInfo.events.length > 0 ? (
                      trackingInfo.events.map((event: any, index: number) => (
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
                          {t('shipments.noTrackingEvents', 'No tracking events available yet')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {t('shipments.noTrackingInfo', 'No tracking information available')}
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function InTransit() {
  return (
    <ProtectedRoute path="/in-transit" component={InTransitContent} />
  );
}

export default InTransit;