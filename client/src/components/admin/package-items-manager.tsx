import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertTriangle, 
  Edit, 
  FileText, 
  Info, 
  PackageOpen, 
  Weight 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ItemEditDialog } from "./item-edit-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PackageItemsManagerProps {
  shipmentId: number;
  labelError?: string | null;
}

export function PackageItemsManager({ shipmentId, labelError }: PackageItemsManagerProps) {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: items, isLoading, isError } = useQuery({
    queryKey: ['/api/shipments', shipmentId, 'items'],
    queryFn: async () => {
      const response = await fetch(`/api/shipments/${shipmentId}/items`);
      if (!response.ok) {
        throw new Error("Failed to fetch package items");
      }
      return response.json();
    }
  });

  const handleEditItem = (item: any) => {
    setSelectedItem(item);
    setIsEditDialogOpen(true);
  };

  const handleItemUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/shipments', shipmentId, 'items'] });
  };

  // Parse the label error to look for item-related issues
  const findItemErrors = (error: string) => {
    if (!error) return {};
    
    const itemErrors: Record<string, boolean> = {};
    
    // Common item-related error patterns
    const patterns = [
      { regex: /product name/i, key: 'name' },
      { regex: /ürün adı/i, key: 'name' },
      { regex: /hs code/i, key: 'hsCode' },
      { regex: /gtip/i, key: 'hsCode' }, // Map GTIP errors to hsCode field
      { regex: /weight/i, key: 'weight' },
      { regex: /country of origin/i, key: 'countryOfOrigin' },
    ];
    
    patterns.forEach(pattern => {
      if (pattern.regex.test(error)) {
        itemErrors[pattern.key] = true;
      }
    });
    
    return itemErrors;
  };

  const itemErrors = labelError ? findItemErrors(labelError) : {};
  const hasItemErrors = Object.keys(itemErrors).length > 0;

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageOpen className="h-5 w-5" />
            <span>Package Items</span>
          </CardTitle>
          <CardDescription>Loading package items...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Error Loading Items</span>
          </CardTitle>
          <CardDescription>Failed to load package items</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageOpen className="h-5 w-5" />
          <span>Package Items</span>
          {hasItemErrors && (
            <Badge variant="destructive" className="ml-2">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Item Errors Detected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {items && items.length === 0 
            ? "No package items found" 
            : hasItemErrors 
              ? "Errors detected with one or more items. Edit items to resolve carrier API errors." 
              : "View and edit package items"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasItemErrors && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            <div className="flex gap-2 items-start">
              <Info className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Carrier API Error Details:</p>
                <p>{labelError}</p>
              </div>
            </div>
          </div>
        )}
        
        {items && items.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Name</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => {
                // Check if this item has any detected errors
                const hasError = Object.entries(itemErrors).some(([key]) => 
                  key === 'name' && (!item.name || item.name.trim() === '') ||
                  key === 'hsCode' && (!item.hsCode || item.hsCode.trim() === '') ||
                  key === 'weight' && (!item.weight || parseFloat(item.weight) <= 0) ||
                  key === 'countryOfOrigin' && (!item.countryOfOrigin || item.countryOfOrigin.trim() === '')
                );
                
                return (
                  <TableRow key={item.id} className={hasError ? "bg-red-50" : undefined}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        {hasError && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                        {item.name || <span className="text-gray-400 italic">No name</span>}
                      </div>
                      {item.description && (
                        <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Qty:</span>
                          <span>{item.quantity || 1}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Weight className="h-3 w-3 text-gray-500" />
                          <span>{item.weight || 0} kg</span>
                        </div>
                        
                        {item.hsCode && (
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-gray-500" />
                            <span>HS: {item.hsCode}</span>
                          </div>
                        )}
                        
                        {item.countryOfOrigin && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Origin:</span>
                            <span>{item.countryOfOrigin}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditItem(item)}
                              className={hasError ? "text-red-600 hover:text-red-700 hover:bg-red-100" : undefined}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit Item</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit Item Details</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No package items found for this shipment
          </div>
        )}
      </CardContent>
      
      {selectedItem && (
        <ItemEditDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          item={selectedItem}
          shipmentId={shipmentId}
          onItemUpdated={handleItemUpdated}
        />
      )}
    </Card>
  );
}