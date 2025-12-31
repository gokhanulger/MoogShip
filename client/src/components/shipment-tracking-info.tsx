import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { MapPin, AlertTriangle, Calendar, Package, Truck, Clock, RefreshCw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ShipmentTrackingInfoProps {
  shipmentId: number;
  trackingInfo?: any;
  carrierTrackingNumber?: string;
  status: string;
  isAdmin: boolean;
}

export function ShipmentTrackingInfo({
  shipmentId,
  trackingInfo,
  carrierTrackingNumber,
  status,
  isAdmin
}: ShipmentTrackingInfoProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation for updating tracking info
  const updateTrackingInfoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'POST', 
        `/api/shipments/${shipmentId}/track`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update tracking info');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Tracking Updated',
        description: 'Shipment tracking information has been refreshed.',
      });
      
      // Invalidate queries to reload data
      queryClient.invalidateQueries({
        queryKey: ['/api/shipments', shipmentId]
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update tracking information',
        variant: 'destructive'
      });
    }
  });

  // Function to get badge color based on status
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'IN_TRANSIT':
        return 'bg-blue-100 text-blue-800';
      case 'OUT_FOR_DELIVERY':
        return 'bg-yellow-100 text-yellow-800';
      case 'EXCEPTION':
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      case 'NOT_FOUND':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handler for manually refreshing tracking info
  const handleUpdateTracking = () => {
    updateTrackingInfoMutation.mutate();
  };

  // If no tracking info and no carrier tracking number, show a message
  if (!trackingInfo && !carrierTrackingNumber) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="mr-2 h-5 w-5" />
            Tracking Information
          </CardTitle>
          <CardDescription>
            No carrier tracking information available for this shipment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500 mb-4" />
              <p className="text-muted-foreground mb-2">
                {status === 'approved' 
                  ? 'This shipment has been approved but doesn\'t have carrier tracking yet.'
                  : 'This shipment has not been processed by a carrier yet.'}
              </p>
              <p className="text-sm text-muted-foreground">
                Tracking information will appear here once the shipment has been processed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If we have carrier tracking but no tracking info, show a prompt to fetch tracking
  if (carrierTrackingNumber && !trackingInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="mr-2 h-5 w-5" />
            Tracking Information
          </CardTitle>
          <CardDescription>
            Carrier tracking number: {carrierTrackingNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-6">
            <Package className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to Track</h3>
            <p className="text-center text-muted-foreground mb-4">
              This shipment has a carrier tracking number but hasn't been tracked yet.
            </p>
            <Button 
              onClick={handleUpdateTracking}
              disabled={updateTrackingInfoMutation.isPending}
            >
              {updateTrackingInfoMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Get Tracking Info
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Parse tracking info if it's a string (from JSON stored in database)
  let parsedTrackingInfo = trackingInfo;
  if (typeof trackingInfo === 'string') {
    try {
      parsedTrackingInfo = JSON.parse(trackingInfo);
    } catch (error) {
      console.error('Failed to parse tracking info:', error);
    }
  }

  // Extract relevant information
  const {
    status: trackingStatus = 'UNKNOWN',
    statusDescription = 'No status available',
    statusTime,
    location,
    estimatedDelivery,
    serviceName,
    packageWeight,
    events = [],
    error
  } = parsedTrackingInfo || {};

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              Tracking Information
            </CardTitle>
            <CardDescription>
              Carrier: {parsedTrackingInfo?.carrier || 'Unknown'} • 
              Number: {carrierTrackingNumber || 'N/A'}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(trackingStatus)}>
            {statusDescription}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-start">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Tracking Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {statusTime && (
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Status Date</p>
                <p className="text-muted-foreground">
                  {new Date(statusTime).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Current Location</p>
                <p className="text-muted-foreground">{location}</p>
              </div>
            </div>
          )}

          {serviceName && (
            <div className="flex items-start gap-3">
              <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Service Type</p>
                <p className="text-muted-foreground">{serviceName}</p>
              </div>
            </div>
          )}

          {packageWeight && (
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Package Weight</p>
                <p className="text-muted-foreground">{packageWeight}</p>
              </div>
            </div>
          )}

          {estimatedDelivery && (
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Estimated Delivery</p>
                <p className="text-muted-foreground">{estimatedDelivery}</p>
              </div>
            </div>
          )}
        </div>

        {events?.length > 0 && (
          <>
            <Separator className="my-4" />
            <div>
              <h4 className="font-bold mb-3">Tracking History</h4>
              <div className="space-y-4">
                {events.slice(0, 10).map((event: any, index: number) => (
                  <div key={index} className="rounded-md border p-3">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{event.status}</span>
                      <span className="text-muted-foreground text-sm">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {event.location && <p className="text-sm text-muted-foreground">{event.location}</p>}
                  </div>
                ))}
                {events.length > 10 && (
                  <p className="text-sm text-center text-muted-foreground mt-2">
                    {events.length - 10} more events not shown
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpdateTracking}
            disabled={updateTrackingInfoMutation.isPending}
          >
            {updateTrackingInfoMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Tracking
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}