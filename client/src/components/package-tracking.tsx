import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, PackageSearch, AlertTriangle, CheckCircle, Truck, Clock, RefreshCw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

// Validation schema for the tracking form
const trackingFormSchema = z.object({
  trackingNumber: z.string().min(1, "Please enter a tracking number"),
});

type TrackingFormValues = z.infer<typeof trackingFormSchema>;

// Status badge colors
const statusColors = {
  DELIVERED: 'bg-green-100 text-green-800',
  IN_TRANSIT: 'bg-blue-100 text-blue-800',
  OUT_FOR_DELIVERY: 'bg-yellow-100 text-yellow-800',
  EXCEPTION: 'bg-red-100 text-red-800',
  ERROR: 'bg-red-100 text-red-800',
  NOT_FOUND: 'bg-gray-100 text-gray-800',
  UNKNOWN: 'bg-gray-100 text-gray-800',
};

export function PackageTracking() {
  const [isLoading, setIsLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [searchedTrackingNumber, setSearchedTrackingNumber] = useState<string>('');
  const { toast } = useToast();

  // Initialize form
  const form = useForm<TrackingFormValues>({
    resolver: zodResolver(trackingFormSchema),
    defaultValues: {
      trackingNumber: '',
    },
  });

  // Handle form submission
  const onSubmit = async (values: TrackingFormValues) => {
    setIsLoading(true);
    setTrackingResult(null);
    setSearchedTrackingNumber(values.trackingNumber);

    try {
      // Call the tracking API
      const response = await fetch(`/api/track/${encodeURIComponent(values.trackingNumber)}`);
      const data = await response.json();

      // Set the tracking result
      setTrackingResult(data);

      if (data.error) {
        toast({
          title: 'Tracking Information',
          description: data.errorDescription || 'Could not retrieve tracking information for this number.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error tracking package:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect to tracking service. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card className="shadow-md">
        <CardHeader className="pb-0">
          <CardTitle className="text-xl flex items-center text-primary">
            <MapPin className="mr-2 h-5 w-5" />
            Track Your Package
          </CardTitle>
          <CardDescription>
            Enter your tracking number to get the current status of your shipment
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-3">
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="trackingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Enter tracking number"
                          {...field}
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={isLoading} className="h-10">
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Tracking...
                  </>
                ) : (
                  <>
                    <PackageSearch className="mr-2 h-4 w-4" />
                    Track
                  </>
                )}
              </Button>
            </form>
          </Form>

          {isLoading && (
            <div className="mt-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}

          {trackingResult && !isLoading && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Tracking #{searchedTrackingNumber}</h3>
                  <p className="text-sm text-muted-foreground">
                    Carrier: {trackingResult.carrier || 'UPS'}
                  </p>
                </div>
                <Badge className={
                  statusColors[trackingResult.status as keyof typeof statusColors] || 
                  statusColors.UNKNOWN
                }>
                  {trackingResult.statusDescription || trackingResult.status || 'Unknown'}
                </Badge>
              </div>

              {trackingResult.error ? (
                <div className="p-4 bg-red-50 rounded-md flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">
                      {trackingResult.error === 'NOT_FOUND' 
                        ? 'Tracking information not found' 
                        : 'Error retrieving tracking information'}
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      {trackingResult.errorDescription || 
                        'The carrier could not find information for this tracking number. It may be too new, or the number may be incorrect.'}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {trackingResult.statusTime && (
                      <div className="flex items-start space-x-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Last Update</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(trackingResult.statusTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {trackingResult.location && (
                      <div className="flex items-start space-x-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Current Location</p>
                          <p className="text-sm text-muted-foreground">{trackingResult.location}</p>
                        </div>
                      </div>
                    )}
                    
                    {trackingResult.serviceName && (
                      <div className="flex items-start space-x-3">
                        <Truck className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Service</p>
                          <p className="text-sm text-muted-foreground">{trackingResult.serviceName}</p>
                        </div>
                      </div>
                    )}
                    
                    {trackingResult.estimatedDelivery && (
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Estimated Delivery</p>
                          <p className="text-sm text-muted-foreground">{trackingResult.estimatedDelivery}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {trackingResult.events && trackingResult.events.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <h4 className="font-semibold mb-2">Tracking History</h4>
                        <div className="space-y-3">
                          {trackingResult.events.slice(0, 5).map((event: any, index: number) => (
                            <div key={index} className="border rounded-md p-2">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{event.status}</span>
                                <span className="text-muted-foreground">
                                  {new Date(event.timestamp).toLocaleString()}
                                </span>
                              </div>
                              {event.location && (
                                <p className="text-xs text-muted-foreground mt-1">{event.location}</p>
                              )}
                            </div>
                          ))}
                          {trackingResult.events.length > 5 && (
                            <p className="text-xs text-center text-muted-foreground">
                              + {trackingResult.events.length - 5} more events
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-xs text-center text-muted-foreground">
            Need help with your shipment? <a href="#contact" className="text-primary hover:underline">Contact our support team</a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}