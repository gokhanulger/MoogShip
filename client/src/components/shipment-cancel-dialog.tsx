import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
// Import the proper api functions
import { apiRequest } from "@/lib/queryClient";

// Format shipment ID with leading zeros (e.g., 001234)
const formatShipmentId = (id: number) => {
  return id.toString().padStart(6, '0');
};

interface ShipmentCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: any | null;
}

export default function ShipmentCancelDialog({ 
  open, 
  onOpenChange, 
  shipment 
}: ShipmentCancelDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Cancel the shipment
  const cancelShipment = async () => {
    if (!shipment) return;
    
    // Only allow cancelling pending shipments
    if (shipment.status !== "pending") {
      toast({
        title: "Cannot Cancel Shipment",
        description: "Only pending shipments can be cancelled.",
        variant: "destructive"
      });
      onOpenChange(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Immediately update the UI for better user experience
      queryClient.setQueryData(["/api/shipments/my"], (oldData: any) => {
        if (!oldData) return oldData;
        
        // Update the cancelled shipment's status in the local cache
        return oldData.map((s: any) => 
          s.id === shipment.id 
            ? { ...s, status: "cancelled" } 
            : s
        );
      });
      
      // Also update the all shipments query if it's loaded (for admin views)
      queryClient.setQueryData(["/api/shipments/all"], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((s: any) => 
          s.id === shipment.id 
            ? { ...s, status: "cancelled" } 
            : s
        );
      });
      
      // Make the API call to actually cancel the shipment
      const response = await fetch(`/api/shipments/${shipment.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      
      // Check if the response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to cancel shipment");
      }
      
      // Show success toast
      toast({
        title: "Shipment Cancelled",
        description: "Shipment has been cancelled successfully",
      });
      
      // Refresh all shipment data to ensure it's up to date
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
      
      // Close the dialog
      onOpenChange(false);
    } catch (error) {
      console.error("Error cancelling shipment:", error);
      
      // Show error toast
      toast({
        title: "Cancellation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
      
      // Revert the optimistic update
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
    } finally {
      setIsLoading(false);
    }
  };

  if (!shipment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Shipment</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this shipment? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="bg-red-50 p-3 rounded-md border border-red-100">
            <p className="font-medium">Shipment #{formatShipmentId(shipment.id)}</p>
            <p className="text-sm text-gray-600">
              Status: <span className="font-medium">{shipment.status}</span>
            </p>
            {shipment.totalPrice && (
              <p className="text-sm text-gray-600">
                Total Price: <span className="font-medium">${(shipment.totalPrice / 100).toFixed(2)}</span>
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            No, Keep It
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={cancelShipment}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Yes, Cancel Shipment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}