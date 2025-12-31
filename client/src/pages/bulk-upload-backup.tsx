import React, { useState } from "react";
import { useLocation } from "wouter";
import { 
  ArrowLeftIcon, 
  Loader2Icon, 
  FileUpIcon, 
  EditIcon,
  CheckCircleIcon,
  XCircleIcon
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ServiceLevel } from "@shared/schema";
import { withAuth } from "@/lib/with-auth";
import EtsyImportGuide from "@/components/etsy-import-guide";

interface BulkUploadProps {
  user: any;
}

function BulkUploadContent({ user }: BulkUploadProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileValidated, setFileValidated] = useState(false);
  const [shipmentPreview, setShipmentPreview] = useState<any[]>([]);
  const [isEtsyUpload, setIsEtsyUpload] = useState(false);
  const [editingShipment, setEditingShipment] = useState<any | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [dimensionsConfirmed, setDimensionsConfirmed] = useState(false);
  const [recalculatingPrices, setRecalculatingPrices] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    shipments?: any[];
    errors?: { row: number; errors: string[] }[];
    errorCount?: number;
    totalRows?: number;
  } | null>(null);
  
  const bulkUploadMutation = useMutation({
    mutationFn: async (fileData: FormData) => {
      setUploading(true);
      
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress >= 90) {
            clearInterval(interval);
            return 90;
          }
          return newProgress;
        });
      }, 100);
      
      try {
        // Create a custom implementation for file upload since FormData
        // requires special handling (can't use the standard apiRequest)
        const response = await fetch("/api/shipments/bulk", {
          method: "POST",
          credentials: 'include',
          body: fileData
        });
        
        clearInterval(interval);
        setUploadProgress(100);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to upload shipments");
        }
        
        return response.json();
      } catch (error) {
        clearInterval(interval);
        setUploadProgress(0);
        throw error;
      } finally {
        setUploading(false);
      }
    },
    onSuccess: (data) => {
      // Invalidate shipments query to refetch
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/my"] });
      
      setUploadResult({
        success: true,
        message: data.message,
        shipments: data.shipments
      });
      
      toast({
        title: "Bulk upload successful",
        description: data.message
      });
    },
    onError: (error: Error) => {
      setUploadResult({
        success: false,
        message: error.message
      });
      
      toast({
        title: "Bulk upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Add a new mutation for validating the file
  const validateFileMutation = useMutation({
    mutationFn: async (fileData: FormData) => {
      try {
        const response = await fetch("/api/shipments/validate-bulk", {
          method: "POST",
          credentials: 'include',
          body: fileData
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
          // If we have validation errors, capture them properly
          if (responseData.errors) {
            throw {
              message: responseData.message || "Validation failed",
              errors: responseData.errors,
              errorCount: responseData.errorCount,
              totalRows: responseData.totalRows
            };
          }
          throw new Error(responseData.message || "Failed to validate shipments");
        }
        
        return responseData;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (data) => {
      setFileValidated(true);
      setShipmentPreview(data.shipments || []);
      
      // Check if this is an Etsy upload based on the file type returned from backend
      setIsEtsyUpload(data.fileType === 'etsy-csv');
      
      // If it's an Etsy upload, dimensions need confirmation before proceeding
      if (data.fileType === 'etsy-csv') {
        setDimensionsConfirmed(false);
        toast({
          title: "Etsy Orders Imported",
          description: `${data.shipments.length} orders imported. Please verify package dimensions before proceeding.`,
        });
      } else {
        setDimensionsConfirmed(true);
        toast({
          title: "File Validation Successful",
          description: `${data.shipments.length} shipments ready to process`,
        });
      }
      
      // Reset any previous validation errors
      setUploadResult(null);
    },
    onError: (error: any) => {
      setFileValidated(false);
      
      // Check if we have structured validation errors
      if (error.errors && Array.isArray(error.errors)) {
        // Set detailed validation error result
        setUploadResult({
          success: false,
          message: error.message || "Validation failed",
          errors: error.errors,
          errorCount: error.errorCount,
          totalRows: error.totalRows
        });
        
        toast({
          title: "Validation Failed",
          description: `Found ${error.errorCount} rows with errors out of ${error.totalRows} total rows.`,
          variant: "destructive"
        });
      } else {
        // Standard error handling
        setUploadResult({
          success: false,
          message: error.message || "An unknown error occurred"
        });
        
        toast({
          title: "Validation Failed",
          description: error.message || "Failed to validate the file",
          variant: "destructive"
        });
      }
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      // Reset states
      setUploadResult(null);
      setUploadProgress(0);
      setFileValidated(false);
      setShipmentPreview([]);
    }
  };

  const handleValidateFile = () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file to upload",
        variant: "destructive"
      });
      return;
    }
    
    // Check file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel (.xlsx) or CSV (.csv) file",
        variant: "destructive"
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    validateFileMutation.mutate(formData);
  };

  const handleUpload = () => {
    if (!file || !fileValidated) {
      toast({
        title: "Validation Required",
        description: "Please validate the file before proceeding",
        variant: "destructive"
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    // If we have calculated prices, add them to the form data
    if (isEtsyUpload && shipmentPreview.length > 0) {
      // Filter out any shipments that should be skipped and include pricing details
      const selectedShipmentsWithPricing = shipmentPreview
        .filter(shipment => !shipment.skipImport)
        .map(shipment => ({
          ...shipment,
          // Ensure pricing fields are included
          basePrice: shipment.basePrice || 0,
          fuelCharge: shipment.fuelCharge || 0,
          taxes: shipment.taxes || 0,
          totalPrice: shipment.totalPrice || 0,
          carrierName: shipment.carrierName || "Standard Service",
          estimatedDeliveryDays: shipment.estimatedDeliveryDays || 7,
        }));
      
      // Add the shipments data as a JSON string
      formData.append('shipments', JSON.stringify(selectedShipmentsWithPricing));
      formData.append('createLabels', 'true'); // Request label creation
    }
    
    bulkUploadMutation.mutate(formData);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      // Reset any previous upload state
      setUploadResult(null);
      setUploadProgress(0);
    }
  };
  
  // Handle editing a shipment's dimensions
  const handleEditDimensions = (shipment: any, index: number) => {
    setEditingShipment({ ...shipment });
    setEditingIndex(index);
    setEditOpen(true);
  };
  
  // Handle saving edited dimensions
  const handleSaveDimensions = () => {
    if (!editingShipment || editingIndex === null) return;
    
    // Always just update the single edited shipment
    const updatedShipments = [...shipmentPreview];
    updatedShipments[editingIndex] = editingShipment;
    setShipmentPreview(updatedShipments);
    
    // Show appropriate toast message
    toast({
      title: "Dimensions Updated",
      description: isEtsyUpload 
        ? `Updated dimensions for order #${editingShipment.orderNumber || (editingIndex + 1)}` 
        : "Updated dimensions successfully",
    });
    
    setEditOpen(false);
    // Set the flag for this shipment that dimensions have been edited
    setDimensionsConfirmed(true);
  };
  
  // Handle recalculating prices after dimension changes
  const recalculatePrices = async () => {
    setRecalculatingPrices(true);
    
    try {
      // Make an API request to calculate prices for all shipments
      const response = await apiRequest("POST", "/api/calculate-bulk-prices", {
        shipments: shipmentPreview
      });
      
      if (!response.ok) {
        throw new Error("Failed to recalculate prices");
      }
      
      const data = await response.json();
      setShipmentPreview(data.shipments);
      setDimensionsConfirmed(true);
      
      toast({
        title: "Prices Updated",
        description: `Successfully updated pricing for ${data.shipments.length} shipments`,
      });
    } catch (error: any) {
      toast({
        title: "Price Calculation Failed",
        description: error.message || "Failed to update prices",
        variant: "destructive"
      });
    } finally {
      setRecalculatingPrices(false);
    }
  };

  return (
    <>
      <Layout>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="flex items-center mb-6">
              <Button 
                variant="ghost" 
                size="sm" 
                className="mr-2"
                onClick={() => navigate("/shipment-list")}
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back
              </Button>
              <h1 className="text-2xl font-semibold text-gray-900">Bulk Upload Shipments</h1>
            </div>
            
            {/* Etsy Import Guide Component */}
            <EtsyImportGuide />
            
            {/* File Upload Section */}
            <div className="mt-6 bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Upload your shipment data</h2>
              
              {/* Upload File UI */}
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary cursor-pointer transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <FileUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Supports Excel (.xlsx) and CSV (.csv) files
                  </p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  className="sr-only"
                  accept=".xlsx,.csv"
                  onChange={handleFileChange}
                />
              </div>
              
              {/* File Selected Display */}
              {file && (
                <div className="mt-4 bg-blue-50 p-3 rounded flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-blue-100 rounded-full p-2 mr-3">
                      <FileUpIcon className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">{file.name}</p>
                      <p className="text-xs text-blue-700">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={handleValidateFile} 
                      disabled={validateFileMutation.isPending}
                      variant="outline"
                      size="sm"
                    >
                      {validateFileMutation.isPending && (
                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Validate
                    </Button>
                    <Button 
                      onClick={() => setFile(null)} 
                      variant="ghost" 
                      size="sm"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Validation Progress */}
              {validateFileMutation.isPending && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Validating file...</p>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-pulse rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
              )}
              
              {/* Upload Button */}
              {fileValidated && (
                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={handleUpload}
                    disabled={bulkUploadMutation.isPending || !dimensionsConfirmed}
                  >
                    {bulkUploadMutation.isPending && (
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {bulkUploadMutation.isPending ? 'Uploading...' : 'Upload Shipments'}
                  </Button>
                </div>
              )}
              
              {/* Shipment Preview */}
              {shipmentPreview.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Shipment Preview</h3>
                    {isEtsyUpload && (
                      <Button 
                        onClick={recalculatePrices}
                        disabled={recalculatingPrices}
                        variant="outline"
                        size="sm"
                      >
                        {recalculatingPrices && (
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Recalculate Prices
                      </Button>
                    )}
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {isEtsyUpload && (
                          <TableHead className="w-[50px]">Import</TableHead>
                        )}
                        <TableHead>Recipient</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Dimensions (cm)</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        {isEtsyUpload && (
                          <TableHead className="w-[70px]">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shipmentPreview.map((shipment, index) => (
                        <TableRow key={index}>
                          {isEtsyUpload && (
                            <TableCell>
                              <Checkbox 
                                checked={!shipment.skipImport} 
                                onCheckedChange={(checked) => {
                                  const newShipments = [...shipmentPreview];
                                  newShipments[index] = {
                                    ...shipment,
                                    skipImport: !checked
                                  };
                                  setShipmentPreview(newShipments);
                                }}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="text-sm">
                              {shipment.recipientName}
                              {shipment.orderNumber && (
                                <Badge variant="outline" className="ml-2">
                                  #{shipment.orderNumber}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{shipment.recipientCity}</div>
                            <div className="text-xs text-gray-500">{shipment.recipientCountry}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {shipment.length} × {shipment.width} × {shipment.height}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{shipment.weight} kg</div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={shipment.serviceLevel || ServiceLevel.STANDARD}
                              onValueChange={(value) => {
                                const updatedShipments = [...shipmentPreview];
                                updatedShipments[index] = {
                                  ...shipment,
                                  serviceLevel: value
                                };
                                setShipmentPreview(updatedShipments);
                              }}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Service" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={ServiceLevel.STANDARD}>Standard</SelectItem>
                                <SelectItem value={ServiceLevel.EXPRESS}>Express</SelectItem>
                                <SelectItem value={ServiceLevel.PRIORITY}>Priority</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            {shipment.totalPrice ? (
                              <div>
                                <div className="text-sm font-medium">${shipment.totalPrice.toFixed(2)}</div>
                                {isEtsyUpload && (
                                  <div className="text-xs text-gray-500">
                                    Base: ${shipment.basePrice?.toFixed(2) || '0.00'}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">Calculating...</div>
                            )}
                          </TableCell>
                          {isEtsyUpload && (
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEditDimensions(shipment, index)}
                              >
                                <EditIcon className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {/* Validation Errors */}
              {uploadResult && !uploadResult.success && uploadResult.errors && (
                <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                    <h3 className="text-sm font-medium text-red-800">
                      {uploadResult.message}
                    </h3>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {uploadResult.errors.map((error, index) => (
                      <div key={index} className="mb-2 last:mb-0 p-2 bg-white rounded border border-red-200">
                        <p className="text-sm font-medium text-red-700">Row {error.row}</p>
                        <ul className="mt-1 list-disc list-inside text-xs text-red-600">
                          {error.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Upload Success */}
              {uploadResult && uploadResult.success && (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                    <div>
                      <h3 className="text-sm font-medium text-green-800">
                        {uploadResult.message}
                      </h3>
                      <p className="text-xs text-green-700 mt-1">
                        {uploadResult.shipments?.length || 0} shipments were created successfully.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button 
                      size="sm" 
                      onClick={() => navigate("/shipment-list")}
                    >
                      View My Shipments
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Edit Dimensions Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Package Dimensions</DialogTitle>
            </DialogHeader>
            
            {editingShipment && (
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Length (cm)</label>
                  <Input 
                    type="number" 
                    min="1"
                    value={editingShipment.length || ""}
                    onChange={(e) => setEditingShipment({
                      ...editingShipment,
                      length: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Width (cm)</label>
                  <Input 
                    type="number" 
                    min="1"
                    value={editingShipment.width || ""}
                    onChange={(e) => setEditingShipment({
                      ...editingShipment,
                      width: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Height (cm)</label>
                  <Input 
                    type="number" 
                    min="1"
                    value={editingShipment.height || ""}
                    onChange={(e) => setEditingShipment({
                      ...editingShipment,
                      height: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Weight (kg)</label>
                  <Input 
                    type="number" 
                    min="0.1"
                    step="0.1"
                    value={editingShipment.weight || ""}
                    onChange={(e) => setEditingShipment({
                      ...editingShipment,
                      weight: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveDimensions}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}

export default withAuth(BulkUploadContent);