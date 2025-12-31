import { 
  Package, 
  Calendar, 
  MapPin, 
  Scale, 
  Truck, 
  Box,
  User,
  Mail,
  Phone,
  Layers
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ShipmentStatusColors } from "@shared/schema";
import { PriceChangeIndicator } from "@/components/price-change-indicator";

interface ShipmentPreviewProps {
  shipment: {
    id: number;
    trackingNumber?: string;
    senderName: string;
    senderAddress: string;
    senderCity: string;
    senderCountry: string;
    senderPhone: string;
    receiverName: string;
    receiverAddress: string;
    receiverCity: string;
    receiverCountry: string;
    receiverPhone: string;
    receiverEmail: string;
    packageWeight: number;
    packageWidth: number;
    packageHeight: number;
    packageLength: number;
    pieceCount?: number;
    serviceLevel: string;
    description: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    totalCost?: number;
    originalTotalPrice?: number; // Original price before any changes by admin
    packages?: Array<{
      id: number;
      name?: string;
      description?: string;
      notes?: string;
      weight: number;
      length: number;
      width: number;
      height: number;
    }>;
  };
}

export function ShipmentPreviewCard({ shipment }: ShipmentPreviewProps) {
  const getDimensionsText = () => {
    // If we have individual packages, use the first one's dimensions
    if (shipment.packages && shipment.packages.length > 0) {
      const firstPackage = shipment.packages[0];
      return `${firstPackage.length} × ${firstPackage.width} × ${firstPackage.height} cm`;
    }
    // Otherwise fall back to the main package dimensions
    return `${shipment.packageLength} × ${shipment.packageWidth} × ${shipment.packageHeight} cm`;
  };

  return (
    <div className="space-y-3 p-1">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold">
              {shipment.trackingNumber || 'Pending'}
            </h4>
            <p className="text-xs text-muted-foreground">
              {shipment.serviceLevel.toUpperCase()} Service
            </p>
          </div>
        </div>
        <Badge
          className={`${ShipmentStatusColors[shipment.status as keyof typeof ShipmentStatusColors]}`}
        >
          {shipment.status.charAt(0).toUpperCase() + shipment.status.slice(1)}
        </Badge>
      </div>

      <div className="space-y-3 pt-2 border-t">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="line-clamp-1">{shipment.receiverName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="line-clamp-1">{formatDate(shipment.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="line-clamp-1">{shipment.receiverCity}, {shipment.receiverCountry}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Scale className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="line-clamp-1">{shipment.packageWeight} kg</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="line-clamp-1">{shipment.receiverPhone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Box className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="line-clamp-1">{getDimensionsText()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm col-span-2">
            <Layers className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="line-clamp-1 font-medium">
              Physical Packages: {shipment.packages?.length || shipment.pieceCount || 1} {(shipment.packages?.length || shipment.pieceCount || 1) > 1 ? 'packages' : 'package'}
            </span>
          </div>
          
          {/* Display an expandable tooltip with package details if we have multiple packages */}
          {shipment.packages && shipment.packages.length > 1 && (
            <div className="text-xs flex items-center gap-1 col-span-2 text-blue-500 hover:text-blue-700 cursor-pointer mt-1">
              <span className="underline">Hover to see all packages</span>
              <div className="group relative">
                <div className="absolute bottom-full left-0 hidden group-hover:block bg-white border border-gray-200 shadow-md rounded-md p-2 w-64 z-10">
                  <p className="font-semibold mb-1">All Packages</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {shipment.packages.map((pkg, index) => (
                      <div key={pkg.id || index} className="border-t border-gray-100 pt-1">
                        <div className="flex justify-between">
                          <p className="font-medium">{pkg.name || `Package #${index + 1}`}</p>
                        </div>
                        <p>Dimensions: {pkg.length} × {pkg.width} × {pkg.height} cm</p>
                        <p>Weight: {pkg.weight} kg</p>
                        {pkg.notes && (
                          <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded mt-1">
                            <span className="font-medium">Notes:</span> {pkg.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <span>(i)</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="text-xs pt-2 border-t">
          <div className="flex justify-between mb-1">
            <span className="text-muted-foreground">From:</span>
            <span className="font-medium">{shipment.senderCity}, {shipment.senderCountry}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recipient Address:</span>
            <span className="font-medium text-right max-w-[150px] line-clamp-2">{shipment.receiverAddress}</span>
          </div>
        </div>
        
        {shipment.description && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Description:</p>
            <p className="text-xs line-clamp-2">{shipment.description}</p>
          </div>
        )}
        
        {shipment.totalCost !== undefined && (
          <div className="pt-2 border-t">
            <div className="flex justify-between">
              <span className="text-sm font-semibold">Total Cost:</span>
              <span className="text-sm font-semibold">${(shipment.totalCost / 100).toFixed(2)}</span>
            </div>
            
            {/* Enhanced Price change visualization */}
            {shipment.originalTotalPrice && 
             shipment.totalCost !== shipment.originalTotalPrice && (
              <div className="mt-2">
                <PriceChangeIndicator 
                  originalPrice={shipment.originalTotalPrice}
                  currentPrice={shipment.totalCost}
                  pulseAnimation={true}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}