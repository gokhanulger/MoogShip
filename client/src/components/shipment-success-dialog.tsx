import { useState, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogDescription, 
  DialogHeader,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, CheckCircle2, Truck, Calendar, List, FileText, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface ShipmentSuccessDialogProps {
  open: boolean;
  onClose: () => void;
  shipment: any;
}

export default function ShipmentSuccessDialog({ 
  open, 
  onClose,
  shipment 
}: ShipmentSuccessDialogProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPickupForm, setShowPickupForm] = useState(false);
  const [pickupDate, setPickupDate] = useState<Date | undefined>(undefined);
  const [pickupNotes, setPickupNotes] = useState("");
  const [isRequestingPickup, setIsRequestingPickup] = useState(false);
  const [showInvoiceUpload, setShowInvoiceUpload] = useState(false);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [selectedInvoiceFile, setSelectedInvoiceFile] = useState<File | null>(null);
  const invoiceFileInputRef = useRef<HTMLInputElement>(null);
  
  if (!shipment) return null;
  
  const handleViewShipment = () => {
    // Close dialog first to avoid UI conflicts
    onClose();
    
    // Use setTimeout to ensure the dialog is properly closed before navigation
    setTimeout(() => {
      // Navigate to my-shipments and scroll to the top
      window.scrollTo(0, 0);
      setLocation("/my-shipments");
      
      // Store the newly created shipment ID in localStorage for highlighting
      if (shipment && shipment.id) {
        localStorage.setItem('highlightShipmentId', shipment.id.toString());
      }
      
      console.log("Navigating to /my-shipments");
    }, 100);
  };
  
  const handleDownloadLabel = async () => {
    try {
      setIsDownloading(true);
      
      // Get the label URL
      let labelUrl = shipment.labelUrl;
      
      // If the label doesn't exist yet, request it from the server
      if (!labelUrl) {
        const response = await apiRequest('GET', `/api/shipments/${shipment.id}/label`);
        const data = await response.json();
        
        if (!data.labelUrl) {
          throw new Error('Could not generate shipping label');
        }
        
        labelUrl = data.labelUrl;
      }
      
      // Open the label in a new window for printing/downloading
      const baseUrl = window.location.origin;
      const fullUrl = `${baseUrl}${labelUrl}`;
      console.log('Opening label URL:', fullUrl);
      
      // Create a direct download link
      const a = document.createElement('a');
      a.href = fullUrl;
      a.download = `moogship-label-${shipment.id}.pdf`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "Label downloaded",
        description: "Your shipping label is ready to print",
      });
    } catch (error) {
      console.error('Error downloading label:', error);
      toast({
        title: "Failed to download label",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };
  
  const handleRequestPickup = async () => {
    if (!pickupDate) {
      toast({
        variant: "destructive",
        title: "Pickup date required",
        description: "Please select a date for pickup."
      });
      return;
    }
    
    try {
      setIsRequestingPickup(true);
      
      const response = await apiRequest('POST', `/api/shipments/${shipment.id}/pickup`, {
        pickupDate: pickupDate.toISOString(),
        pickupNotes
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to request pickup');
      }
      
      toast({
        title: "Pickup requested",
        description: `Pickup requested for ${format(pickupDate, 'PPP')}`,
      });
      
      // Reset the form and close it
      setShowPickupForm(false);
      setPickupDate(undefined);
      setPickupNotes("");
      
      // Refresh any queries that might need updated data
      queryClient.invalidateQueries({ queryKey: ['/api/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shipments/my'] });
      
    } catch (error) {
      console.error('Error requesting pickup:', error);
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: error instanceof Error ? error.message : "There was an error requesting pickup. Please try again.",
      });
    } finally {
      setIsRequestingPickup(false);
    }
  };

  const handleInvoiceFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please select a PDF file."
        });
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please select a PDF file smaller than 10MB."
        });
        return;
      }
      
      setSelectedInvoiceFile(file);
    }
  };

  const handleUploadInvoice = async () => {
    if (!selectedInvoiceFile) {
      toast({
        variant: "destructive",
        title: "No file selected",
        description: "Please select a PDF invoice file."
      });
      return;
    }
    
    try {
      setIsUploadingInvoice(true);
      
      const formData = new FormData();
      formData.append('invoice', selectedInvoiceFile);
      
      const response = await fetch(`/api/shipments/${shipment.id}/upload-invoice`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload invoice');
      }
      
      const result = await response.json();
      
      toast({
        title: "Invoice uploaded successfully",
        description: `${result.filename} has been attached to your shipment.`,
      });
      
      // Reset the form and close it
      setShowInvoiceUpload(false);
      setSelectedInvoiceFile(null);
      if (invoiceFileInputRef.current) {
        invoiceFileInputRef.current.value = '';
      }
      
      // Refresh any queries that might need updated data
      queryClient.invalidateQueries({ queryKey: ['/api/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shipments/my'] });
      
    } catch (error) {
      console.error('Error uploading invoice:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "There was an error uploading the invoice. Please try again.",
      });
    } finally {
      setIsUploadingInvoice(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            Shipment Created Successfully
          </DialogTitle>
          <DialogDescription>
            Your shipment has been created and is pending approval.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-lg mb-2">Shipment Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-500">From:</p>
                <p className="font-medium">{shipment.senderName}</p>
                <p>{shipment.senderAddress}</p>
                <p>{shipment.senderCity}, {shipment.senderPostalCode}</p>
                <p>Turkey</p>
              </div>
              <div>
                <p className="text-gray-500">To:</p>
                <p className="font-medium">{shipment.receiverName}</p>
                <p>{shipment.receiverAddress}</p>
                <p>{shipment.receiverCity}, {shipment.receiverPostalCode}</p>
                <p>{shipment.receiverCountry}</p>
              </div>
              <div className="col-span-2 mt-3">
                <p className="text-gray-500">Package Details:</p>
                <p>Weight: {shipment.packageWeight} kg</p>
                <p>Dimensions: {shipment.packageLength} × {shipment.packageWidth} × {shipment.packageHeight} cm</p>
                <p>Contents: {shipment.packageContents}</p>
              </div>
            </div>
          </div>
          
          <div className="border rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold text-lg mb-2">Next Steps</h3>
            <p>Your shipment is now pending approval by our team. You'll receive a notification once it's approved.</p>
            <p className="mt-2">Download your shipping label to attach to your package.</p>
            <div className="mt-3 border-t pt-3 border-blue-200">
              <h4 className="font-semibold flex items-center text-green-700">
                <Truck className="h-5 w-5 mr-2 text-green-600" />
                Pickup Service Available
              </h4>
              <p className="mt-1">Need us to pick up this package? Click the "Request Pickup" button below to schedule a convenient pickup time from your location.</p>
              <div className="mt-2 bg-green-100 p-2 rounded text-sm">
                <span className="font-medium">Pro Tip:</span> You can also request pickup for multiple shipments at once from your shipments list.
              </div>
            </div>
          </div>
        </div>
        
        {/* Pickup Request Form */}
        {showPickupForm && (
          <div className="border rounded-lg p-4 bg-green-50 mb-4">
            <h3 className="font-semibold text-lg mb-2 flex items-center">
              <Truck className="h-5 w-5 mr-2" />
              Request Pickup
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Pickup Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !pickupDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {pickupDate ? format(pickupDate, "PPP") : "Select a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={pickupDate}
                      onSelect={setPickupDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground mt-1">You can request same-day pickup</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <Textarea 
                  placeholder="Need pickup from a different address? Please provide the complete alternative address here. You can also add any other special instructions for pickup..."
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">If you need pickup from a different location than your saved address, please provide the complete alternative address above.</p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPickupForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRequestPickup} disabled={isRequestingPickup || !pickupDate}>
                  {isRequestingPickup ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <Truck className="mr-2 h-4 w-4" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Upload Form */}
        {showInvoiceUpload && (
          <div className="border rounded-lg p-4 bg-blue-50 mb-4">
            <h3 className="font-semibold text-lg mb-2 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Upload Invoice
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select PDF Invoice</label>
                <Input
                  ref={invoiceFileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleInvoiceFileSelect}
                  className="file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                />
                <p className="text-xs text-muted-foreground mt-1">Only PDF files up to 10MB are allowed</p>
              </div>
              
              {selectedInvoiceFile && (
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm font-medium">Selected file:</p>
                  <p className="text-sm text-gray-600">{selectedInvoiceFile.name}</p>
                  <p className="text-xs text-gray-500">
                    Size: {(selectedInvoiceFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowInvoiceUpload(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUploadInvoice} disabled={isUploadingInvoice || !selectedInvoiceFile}>
                  {isUploadingInvoice ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Invoice
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <DialogFooter className="flex gap-2 sm:justify-between flex-wrap">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {!showPickupForm && !showInvoiceUpload && (
              <Button 
                variant="outline" 
                className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                onClick={() => setShowPickupForm(true)}
              >
                <Truck className="mr-2 h-4 w-4" />
                Request Pickup
              </Button>
            )}
            {!showInvoiceUpload && !showPickupForm && (
              <Button 
                variant="outline" 
                className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                onClick={() => setShowInvoiceUpload(true)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Add Invoice
              </Button>
            )}
            <Button 
              variant="outline" 
              className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              onClick={handleViewShipment}
            >
              <List className="mr-2 h-4 w-4" />
              View Shipment
            </Button>
          </div>
          <Button onClick={handleDownloadLabel} disabled={isDownloading}>
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download Shipping Label
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}