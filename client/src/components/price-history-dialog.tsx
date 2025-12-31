import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, TrendingUp, Clipboard, Percent } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PriceHistory } from "@shared/schema";

interface PriceHistoryDialogProps {
  shipmentId: number;
  trigger?: React.ReactNode;
}

export function PriceHistoryDialog({ shipmentId, trigger }: PriceHistoryDialogProps) {
  const [open, setOpen] = useState(false);

  // Fetch price history records when the dialog is opened
  const {
    data: priceHistory,
    isLoading,
    error,
  } = useQuery({
    queryKey: [`/api/price-history/${shipmentId}`],
    enabled: open,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/price-history/${shipmentId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch price history");
      }
      return response.json();
    },
  });

  // Format cents to dollars for display
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Calculate percentage change between two prices
  const calculatePercentChange = (oldPrice: number, newPrice: number) => {
    if (oldPrice === 0) return "N/A";
    const change = ((newPrice - oldPrice) / oldPrice) * 100;
    return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Clock className="mr-2 h-4 w-4" />
            Price History
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Price Change History</DialogTitle>
          <DialogDescription>
            View all recorded price changes for this shipment
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2">Loading price history...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <p>Error loading price history. Please try again later.</p>
            <p className="text-sm text-gray-500 mt-2">{(error as Error).message}</p>
          </div>
        ) : priceHistory && priceHistory.length > 0 ? (
          <div className="space-y-6 mt-4 max-h-[60vh] overflow-y-auto pr-2">
            {priceHistory.map((record: PriceHistory, index: number) => (
              <div
                key={record.id}
                className="border rounded-lg p-4 space-y-3 bg-white shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900 flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-blue-500" />
                      {format(new Date(record.createdAt || new Date()), "MMM d, yyyy h:mm a")}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {record.isAutoRecalculation
                        ? "Automatic recalculation"
                        : "Manual adjustment"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className={`rounded-full px-2 py-1 text-xs font-medium inline-flex items-center ${
                        record.newTotalPrice > record.previousTotalPrice
                          ? "bg-red-100 text-red-800"
                          : record.newTotalPrice < record.previousTotalPrice
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {calculatePercentChange(
                        record.previousTotalPrice,
                        record.newTotalPrice
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-gray-500">Base Price</p>
                    <div className="flex items-baseline">
                      <p className="font-medium line-through mr-2">
                        {formatPrice(record.previousBasePrice)}
                      </p>
                      <p
                        className={`font-semibold ${
                          record.newBasePrice > record.previousBasePrice
                            ? "text-red-600"
                            : record.newBasePrice < record.previousBasePrice
                            ? "text-green-600"
                            : ""
                        }`}
                      >
                        {formatPrice(record.newBasePrice)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-500">Fuel Charge</p>
                    <div className="flex items-baseline">
                      <p className="font-medium line-through mr-2">
                        {formatPrice(record.previousFuelCharge)}
                      </p>
                      <p
                        className={`font-semibold ${
                          record.newFuelCharge > record.previousFuelCharge
                            ? "text-red-600"
                            : record.newFuelCharge < record.previousFuelCharge
                            ? "text-green-600"
                            : ""
                        }`}
                      >
                        {formatPrice(record.newFuelCharge)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-500">Total Price</p>
                    <div className="flex items-baseline">
                      <p className="font-medium line-through mr-2">
                        {formatPrice(record.previousTotalPrice)}
                      </p>
                      <p
                        className={`font-semibold ${
                          record.newTotalPrice > record.previousTotalPrice
                            ? "text-red-600"
                            : record.newTotalPrice < record.previousTotalPrice
                            ? "text-green-600"
                            : ""
                        }`}
                      >
                        {formatPrice(record.newTotalPrice)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Change reason and fields that triggered the change */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-start">
                    <Clipboard className="h-4 w-4 text-gray-400 mt-0.5 mr-2" />
                    <div className="text-sm text-gray-600">
                      <p>Reason: {record.changeReason || "Not specified"}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {record.dimensionsChanged && (
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                            Dimensions
                          </span>
                        )}
                        {record.weightChanged && (
                          <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs">
                            Weight
                          </span>
                        )}
                        {record.addressChanged && (
                          <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-xs">
                            Address
                          </span>
                        )}
                        {record.serviceLevelChanged && (
                          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs">
                            Service Level
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No price changes have been recorded for this shipment.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}