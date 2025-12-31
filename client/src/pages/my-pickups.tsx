import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  Package, 
  FileText, 
  CalendarPlus,
  RefreshCw,
  Eye,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PickupStatus, PickupStatusColors } from "@shared/schema";
import Layout from "@/components/layout";

export default function MyPickupsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedPickup, setSelectedPickup] = useState<any>(null);
  const [isRequestPickupOpen, setIsRequestPickupOpen] = useState(false);
  const [pickupDate, setPickupDate] = useState<Date | undefined>();
  const [pickupNotes, setPickupNotes] = useState("");
  const [selectedShipments, setSelectedShipments] = useState<number[]>([]);
  
  // Fetch user's pickup requests
  const {
    data: pickupRequests = [],
    isLoading: isLoadingPickups,
    isError: isPickupsError,
    refetch: refetchPickups
  } = useQuery<any[]>({
    queryKey: ['/api/my-pickup-requests']
  });
  
  // Fetch user's shipments
  const {
    data: shipments = [],
    isLoading: isLoadingShipments
  } = useQuery<any[]>({
    queryKey: ['/api/shipments/my'],
    select: (data) => {
      // Return approved shipments and pending shipments without pickup
      return data.filter(shipment => 
        (shipment.status === 'approved' || shipment.status === 'pending') && 
        !shipment.pickupRequested
      ).map(shipment => ({
        ...shipment,
        // Mark if shipment is selectable (approved ones always are, pending ones are selectable but with warning)
        isSelectable: true,
        isPending: shipment.status === 'pending'
      }));
    }
  });
  
  // Request a batch pickup
  const requestPickupMutation = useMutation({
    mutationFn: async () => {
      if (!pickupDate || selectedShipments.length === 0) {
        throw new Error("Please select a pickup date and at least one shipment");
      }
      
      const response = await apiRequest('POST', '/api/shipments/batch-pickup', {
        shipmentIds: selectedShipments,
        pickupDate: pickupDate.toISOString(),
        pickupNotes
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to request pickup");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-pickup-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shipments/my'] });
      
      setPickupDate(undefined);
      setPickupNotes("");
      setSelectedShipments([]);
      setIsRequestPickupOpen(false);
      
      toast({
        title: t('myPickups.requestPickupButton'),
        description: t('general.successMessage')
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t('general.errorTitle'),
        description: error instanceof Error ? error.message : t('general.errorPickupRequest')
      });
    }
  });
  
  // View pickup request details
  const viewPickupDetails = async (pickupId: number) => {
    try {
      const response = await apiRequest('GET', `/api/pickup-request/${pickupId}`);
      if (!response.ok) {
        throw new Error(t('general.errorFetchPickupDetails'));
      }
      
      const data = await response.json();
      setSelectedPickup(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('general.errorTitle'),
        description: error instanceof Error ? error.message : t('general.errorFetchPickupDetails')
      });
    }
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    const colorClass = PickupStatusColors[status as keyof typeof PickupStatusColors] || "bg-gray-100 text-gray-800";
    
    // Map status to translation key
    const getStatusTranslation = (status: string) => {
      switch(status) {
        case PickupStatus.PENDING:
          return t('shipping.pending');
        case PickupStatus.SCHEDULED:
          return t('myPickups.scheduled');
        case PickupStatus.COMPLETED:
          return t('shipping.completed');
        case PickupStatus.CANCELLED:
          return t('shipping.cancelled');
        default:
          return status.charAt(0).toUpperCase() + status.slice(1);
      }
    };
    
    return (
      <Badge className={colorClass}>
        {status === PickupStatus.PENDING && <Clock className="mr-1 h-3 w-3" />}
        {status === PickupStatus.SCHEDULED && <CalendarIcon className="mr-1 h-3 w-3" />}
        {status === PickupStatus.COMPLETED && <CheckCircle className="mr-1 h-3 w-3" />}
        {status === PickupStatus.CANCELLED && <XCircle className="mr-1 h-3 w-3" />}
        {getStatusTranslation(status)}
      </Badge>
    );
  };
  
  // Toggle shipment selection for pickup request
  const toggleShipmentSelection = (shipmentId: number) => {
    setSelectedShipments(prev => 
      prev.includes(shipmentId)
        ? prev.filter(id => id !== shipmentId)
        : [...prev, shipmentId]
    );
  };
  
  return (
    <Layout>
      <div className="p-4 md:p-6 pt-6 md:pt-8">
        <div className="flex justify-between items-center mb-10 mt-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-3">{t('myPickups.title')}</h1>
            <p className="text-muted-foreground text-lg">
              {t('myPickups.subtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => refetchPickups()} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {t('myPickups.refresh')}
            </Button>
            <Dialog open={isRequestPickupOpen} onOpenChange={setIsRequestPickupOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Truck className="h-4 w-4" />
                  {t('myPickups.requestPickup')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{t('myPickups.requestShipmentPickup')}</DialogTitle>
                  <DialogDescription>
                    {t('myPickups.requestDescription')}
                  </DialogDescription>
                </DialogHeader>
              
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label className="font-medium">{t('myPickups.pickupDate')}</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !pickupDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {pickupDate ? format(pickupDate, "PPP") : t('myPickups.selectDate')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={pickupDate}
                          onSelect={setPickupDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                
                  <div className="grid gap-2">
                    <label className="font-medium">{t('myPickups.pickupNotes')}</label>
                    <Textarea
                      placeholder={t('myPickups.notesPlaceholder') || "Need pickup from a different address? Please provide the complete alternative address here. You can also add any other special instructions for pickup..."}
                      value={pickupNotes}
                      onChange={(e) => setPickupNotes(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('myPickups.alternativeAddressNote') || "If you need pickup from a different location than your saved address, please provide the complete alternative address above."}
                    </p>
                  </div>
                
                  <div className="grid gap-2">
                    <label className="font-medium">{t('myPickups.selectShipments')}</label>
                    {isLoadingShipments ? (
                      <div className="py-4 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        <p className="text-sm text-muted-foreground mt-2">{t('myPickups.loadingShipments')}</p>
                      </div>
                    ) : shipments.length === 0 ? (
                      <div className="py-4 text-center border rounded-md">
                        <Package className="h-8 w-8 mx-auto text-muted-foreground/50" />
                        <p className="text-muted-foreground mt-2">{t('myPickups.noEligibleShipments')}</p>
                        <p className="text-sm text-muted-foreground">{t('myPickups.eligibilityNote')}</p>
                      </div>
                    ) : (
                      <div className="border rounded-md max-h-[300px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">{t('myPickups.selectColumn')}</TableHead>
                              <TableHead>{t('myPickups.id')}</TableHead>
                              <TableHead>{t('myPickups.recipient')}</TableHead>
                              <TableHead>{t('myPickups.destination')}</TableHead>
                              <TableHead>{t('myPickups.service')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {shipments.map((shipment) => (
                              <TableRow key={shipment.id} className={shipment.isPending ? "bg-yellow-50" : ""}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={selectedShipments.includes(shipment.id)}
                                    onChange={() => toggleShipmentSelection(shipment.id)}
                                    className="h-4 w-4"
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {shipment.id}
                                  {shipment.isPending && (
                                    <Badge variant="outline" className="ml-2 text-amber-600 border-amber-200 bg-amber-50">
                                      {t('shipping.pending')}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>{shipment.receiverName}</TableCell>
                                <TableCell>{shipment.receiverCity}, {shipment.receiverCountry}</TableCell>
                                <TableCell className="capitalize">{shipment.serviceLevel}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedShipments.length} {t('myPickups.shipmentsSelected')}
                    </p>
                    
                    {/* Show warning about pending shipments */}
                    {shipments.some(s => s.isPending && selectedShipments.includes(s.id)) && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
                        <p className="font-medium">{t('myPickups.pendingWarning')}</p>
                        <p className="mt-1">{t('myPickups.pendingDescription')}</p>
                      </div>
                    )}
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRequestPickupOpen(false)} className="gap-2">
                  <X className="h-4 w-4" />
                  {t('myPickups.cancel')}
                </Button>
                <Button
                  onClick={() => requestPickupMutation.mutate()}
                  disabled={!pickupDate || selectedShipments.length === 0 || requestPickupMutation.isPending}
                  className="gap-2"
                >
                  {requestPickupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!requestPickupMutation.isPending && <Truck className="h-4 w-4" />}
                  {t('myPickups.requestPickupButton')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="grid gap-6">
        <Card className="shadow-sm">
          <CardHeader className="py-10 px-8">
            <CardTitle className="text-2xl mb-3">{t('myPickups.myPickupRequests')}</CardTitle>
            <CardDescription className="text-base">
              {t('myPickups.myPickupDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            {isLoadingPickups ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : isPickupsError ? (
              <div className="text-center py-8 text-red-500">
                <p>{t('myPickups.failedToLoad')}</p>
                <Button variant="outline" onClick={() => refetchPickups()} className="mt-2 gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {t('myPickups.tryAgain')}
                </Button>
              </div>
            ) : pickupRequests.length === 0 ? (
              <div className="text-center py-32 px-16 bg-muted/10 rounded-lg border-2 border-muted/20">
                <Truck className="mx-auto h-24 w-24 text-muted-foreground/30 mb-12" />
                <h3 className="text-2xl font-medium mb-6">{t('myPickups.noPickupsYet')}</h3>
                <p className="text-muted-foreground/80 mb-6 text-lg px-8 max-w-2xl mx-auto leading-relaxed">
                  {t('myPickups.noPickupsDescription')}
                </p>
                <Button 
                  className="mt-12 gap-3 px-10 py-7 text-base font-medium rounded-md" 
                  onClick={() => setIsRequestPickupOpen(true)}
                  disabled={isLoadingShipments || shipments.length === 0}
                >
                  <CalendarPlus className="h-6 w-6" />
                  {t('myPickups.newPickupRequest')}
                </Button>
              </div>
            ) : (
              <div className="border rounded-md">
                <div className="overflow-auto max-h-[calc(100vh-260px)]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead>{t('myPickups.id')}</TableHead>
                        <TableHead>{t('myPickups.requestedOn')}</TableHead>
                        <TableHead>{t('myPickups.pickupDate')}</TableHead>
                        <TableHead>{t('myPickups.status')}</TableHead>
                        <TableHead className="text-right">{t('myPickups.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pickupRequests.map((pickup: any) => (
                        <TableRow key={pickup.id}>
                          <TableCell className="font-medium">{pickup.id}</TableCell>
                          <TableCell>
                            {pickup.requestDate || pickup.request_date 
                              ? format(new Date(pickup.requestDate || pickup.request_date), "MMM d, yyyy") 
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {pickup.pickupDate || pickup.pickup_date 
                              ? format(new Date(pickup.pickupDate || pickup.pickup_date), "MMM d, yyyy") 
                              : t('myPickups.notScheduled')}
                          </TableCell>
                          <TableCell>{getStatusBadge(pickup.pickupStatus || pickup.pickup_status)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewPickupDetails(pickup.id)}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              {t('myPickups.viewDetails')}
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
        </Card>
        
        {selectedPickup && (
          <Card>
            <CardHeader>
              <CardTitle>{t('myPickups.pickupRequest')} #{selectedPickup.pickupRequest.id}</CardTitle>
              <CardDescription>
                {selectedPickup.shipments.length} {t('myPickups.shipmentsInPickup')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('myPickups.status')}</h3>
                  <div>{getStatusBadge(selectedPickup.pickupRequest.pickupStatus || selectedPickup.pickupRequest.pickup_status)}</div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('myPickups.requestedOn')}</h3>
                  <p className="font-medium">
                    {selectedPickup.pickupRequest.requestDate || selectedPickup.pickupRequest.request_date
                      ? format(new Date(selectedPickup.pickupRequest.requestDate || selectedPickup.pickupRequest.request_date), "MMMM d, yyyy")
                      : "—"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('myPickups.pickupDate')}</h3>
                  <p className="font-medium">
                    {selectedPickup.pickupRequest.pickupDate || selectedPickup.pickupRequest.pickup_date
                      ? format(new Date(selectedPickup.pickupRequest.pickupDate || selectedPickup.pickupRequest.pickup_date), "MMMM d, yyyy")
                      : t('myPickups.notScheduled')}
                  </p>
                </div>
              </div>
              
              {(selectedPickup.pickupRequest.pickupNotes || selectedPickup.pickupRequest.pickup_notes) && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('myPickups.notes')}</h3>
                  <p className="p-3 bg-muted rounded-md text-sm">
                    {selectedPickup.pickupRequest.pickupNotes || selectedPickup.pickupRequest.pickup_notes}
                  </p>
                </div>
              )}
              
              <div>
                <h3 className="text-md font-semibold mb-2">{t('myPickups.shipmentsInPickup')}</h3>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('myPickups.id')}</TableHead>
                        <TableHead>{t('myPickups.recipient')}</TableHead>
                        <TableHead>{t('myPickups.destination')}</TableHead>
                        <TableHead>{t('myPickups.package')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPickup.shipments.map((shipment: any) => (
                        <TableRow key={shipment.id}>
                          <TableCell className="font-medium">{shipment.id}</TableCell>
                          <TableCell>{shipment.receiverName}</TableCell>
                          <TableCell>
                            {shipment.receiverCity}, {shipment.receiverCountry}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">
                                {shipment.packageWeight || shipment.weight}kg
                                {shipment.pieceCount > 1 && ` (${shipment.pieceCount} ${t('myPickups.pieces')})`}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {shipment.packageLength || shipment.length || 0}×
                                {shipment.packageWidth || shipment.width || 0}×
                                {shipment.packageHeight || shipment.height || 0}cm
                              </span>
                              {shipment.billableWeight && (
                                <span className="text-xs text-muted-foreground">
                                  {t('myPickups.billable')}: {shipment.billableWeight}kg
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t px-6 py-4">
              <Button variant="outline" onClick={() => setSelectedPickup(null)} className="gap-2">
                <X className="h-4 w-4" />
                {t('myPickups.close')}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
      </div>
    </Layout>
  );
}