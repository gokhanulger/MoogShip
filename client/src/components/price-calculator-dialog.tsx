import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calculator, Package, Loader2 } from "lucide-react";
import { ServiceLevel, ServiceLevelDetails } from "@shared/schema";
import { COUNTRIES } from "@/lib/countries";
import { Link, useLocation } from "wouter";
import Cookies from "js-cookie";

interface Country {
  name: string;
  code: string;
}

interface PriceCalculatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PriceCalculatorDialog({ open, onOpenChange }: PriceCalculatorDialogProps) {
  const { toast } = useToast();
  const [isCalculating, setIsCalculating] = useState(false);
  const [priceResult, setPriceResult] = useState<any>(null);
  const [location, navigate] = useLocation();
  
  // Form state
  const [packageDetails, setPackageDetails] = useState({
    length: "",
    width: "",
    height: "",
    weight: "",
    pieceCount: "1", // Default to 1 piece
    serviceLevel: ServiceLevel.STANDARD,
    receiverCountry: "",
    packageContents: "",
    customsValue: "", // Value for duty calculations
    productName: "", // Product name for duty calculations
    productDescription: "", // Product description for duty calculations  
    hsCode: "", // HS code for duty calculations
    useBillableWeight: false, // Toggle for direct billable weight input
    billableWeightInput: "" // Direct billable weight input field
  });
  
  // Calculated values
  const [volumetricWeight, setVolumetricWeight] = useState<number | null>(null);
  const [billableWeight, setBillableWeight] = useState<number | null>(null);
  
  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setPackageDetails({
        length: "",
        width: "",
        height: "",
        weight: "",
        pieceCount: "1", // Default to 1 piece
        serviceLevel: ServiceLevel.STANDARD,
        receiverCountry: "",
        packageContents: "",
        customsValue: "",
        productName: "",
        productDescription: "",
        hsCode: "",
        useBillableWeight: false,
        billableWeightInput: ""
      });
      setPriceResult(null);
      setVolumetricWeight(null);
      setBillableWeight(null);
    }
  }, [open]);
  
  const calculateVolumetricWeight = () => {
    if (packageDetails.length && packageDetails.width && packageDetails.height) {
      const length = parseFloat(packageDetails.length);
      const width = parseFloat(packageDetails.width);
      const height = parseFloat(packageDetails.height);
      
      if (!isNaN(length) && !isNaN(width) && !isNaN(height)) {
        const volumetric = (length * width * height) / 5000;
        setVolumetricWeight(parseFloat(volumetric.toFixed(2)));
        
        // Calculate billable weight
        const actualWeight = packageDetails.weight ? parseFloat(packageDetails.weight) : 0;
        const billable = Math.max(volumetric, actualWeight);
        setBillableWeight(parseFloat(billable.toFixed(2)));
        return;
      }
    }
    
    setVolumetricWeight(null);
    setBillableWeight(null);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Only allow numeric input for measurements and weights
    if (name === 'length' || name === 'width' || name === 'height' || name === 'weight' || name === 'billableWeightInput') {
      if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setPackageDetails(prev => ({ ...prev, [name]: value }));
        
        // If billable weight is being directly entered, update the billable weight state
        if (name === 'billableWeightInput' && value !== '') {
          setBillableWeight(parseFloat(parseFloat(value).toFixed(2)));
        }
      }
    } else {
      setPackageDetails(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleCountryChange = (value: string) => {
    setPackageDetails(prev => ({ ...prev, receiverCountry: value }));
  };
  
  const handleServiceLevelChange = (value: ServiceLevel) => {
    setPackageDetails(prev => ({ ...prev, serviceLevel: value }));
  };
  
  // Helper function to get delivery days based on service level
  const serviceDeliveryDays = (level: ServiceLevel) => {
    switch (level) {
      case ServiceLevel.STANDARD:
        return '5-7';
      case ServiceLevel.EXPRESS:
        return '3-4';
      case ServiceLevel.PRIORITY:
        return '1-2';
      default:
        return '5-7';
    }
  };
  
  // Update volumetric weight whenever dimensions change
  useEffect(() => {
    calculateVolumetricWeight();
  }, [packageDetails.length, packageDetails.width, packageDetails.height, packageDetails.weight]);
  
  const calculatePrice = async () => {
    // Check if we're using direct billable weight or dimensions
    const usingDirectBillableWeight = packageDetails.useBillableWeight;
    
    // Validate common inputs
    if (!packageDetails.receiverCountry) {
      toast({
        title: "Country Required",
        description: "Please select a destination country.",
        variant: "destructive"
      });
      return;
    }

    if (!packageDetails.packageContents || packageDetails.packageContents.trim() === '') {
      console.log("🚨 VALIDATION: Package contents is missing:", packageDetails.packageContents);
      toast({
        title: "Package Contents Required",
        description: "Please specify what is inside the package for accurate duty calculations.",
        variant: "destructive"
      });
      return;
    }
    
    // Check input method and validate accordingly
    if (usingDirectBillableWeight) {
      // Validate billable weight input
      const billableWeight = parseFloat(packageDetails.billableWeightInput);
      
      if (isNaN(billableWeight) || billableWeight <= 0) {
        toast({
          title: "Invalid Billable Weight",
          description: "Please enter a valid billable weight.",
          variant: "destructive"
        });
        return;
      }
      
      try {
        setIsCalculating(true);
        setPriceResult(null);
        
        // Use default dimensions (1x1x1) with the billable weight for price calculation
        console.log("🔍 FRONTEND DEBUG - About to send customs value:", packageDetails.customsValue, "parsed:", packageDetails.customsValue ? parseFloat(packageDetails.customsValue) : undefined);
        console.log("🔍 FRONTEND DEBUG - About to send package contents:", packageDetails.packageContents);
        const response = await apiRequest("POST", "/api/pricing/moogship-options", {
          // Set dimensions to create the desired billable weight
          // We'll use 1x1x1 dimensions as placeholders since the API requires them
          packageLength: 1,
          packageWidth: 1,
          packageHeight: 1,
          // Use the manually entered billable weight
          packageWeight: billableWeight,
          serviceLevel: packageDetails.serviceLevel,
          receiverCountry: packageDetails.receiverCountry,
          // Required fields for the API
          senderPostalCode: "34384",    // Default Istanbul postal code
          senderCity: "Istanbul",       // Default sender city is Istanbul, Turkey
          receiverPostalCode: "10001",  // Default receiver postal code
          receiverCity: "New York",     // Default receiver city
          // Include customs value for duty calculations
          customsValue: packageDetails.customsValue ? parseFloat(packageDetails.customsValue) : undefined,
          // Include package contents for better HS code matching
          packageContents: packageDetails.packageContents,
          // Include product information for ChatGPT duty calculations
          productName: packageDetails.productName,
          productDescription: packageDetails.productDescription,
          hsCode: packageDetails.hsCode
        });
        
        const data = await response.json();
        setPriceResult(data);
        
        toast({
          title: "Price Calculated",
          description: "Shipping price has been calculated successfully.",
        });
      } catch (error) {
        console.error("Error calculating price:", error);
        toast({
          title: "Calculation Failed",
          description: "There was an error calculating the shipping price. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsCalculating(false);
      }
    } else {
      // Validate regular dimensions and weight inputs
      const length = parseFloat(packageDetails.length);
      const width = parseFloat(packageDetails.width);
      const height = parseFloat(packageDetails.height);
      const weight = parseFloat(packageDetails.weight);
      
      if (isNaN(length) || length <= 0) {
        toast({
          title: "Invalid Length",
          description: "Please enter a valid length.",
          variant: "destructive"
        });
        return;
      }
      
      if (isNaN(width) || width <= 0) {
        toast({
          title: "Invalid Width",
          description: "Please enter a valid width.",
          variant: "destructive"
        });
        return;
      }
      
      if (isNaN(height) || height <= 0) {
        toast({
          title: "Invalid Height",
          description: "Please enter a valid height.",
          variant: "destructive"
        });
        return;
      }
      
      if (isNaN(weight) || weight <= 0) {
        toast({
          title: "Invalid Weight",
          description: "Please enter a valid weight.",
          variant: "destructive"
        });
        return;
      }
      
      try {
        setIsCalculating(true);
        setPriceResult(null);
        
        console.log("🔍 FRONTEND DEBUG - About to send customs value:", packageDetails.customsValue, "parsed:", packageDetails.customsValue ? parseFloat(packageDetails.customsValue) : undefined);
        console.log("🔍 FRONTEND DEBUG - About to send package contents:", packageDetails.packageContents);
        const response = await apiRequest("POST", "/api/pricing/moogship-options", {
          packageLength: length,
          packageWidth: width,
          packageHeight: height,
          packageWeight: weight,
          serviceLevel: packageDetails.serviceLevel,
          receiverCountry: packageDetails.receiverCountry,
          // Required fields for the API
          senderPostalCode: "34384",    // Default Istanbul postal code
          senderCity: "Istanbul",       // Default sender city is Istanbul, Turkey
          receiverPostalCode: "10001",  // Default receiver postal code
          receiverCity: "New York",     // Default receiver city
          // Include customs value for duty calculations
          customsValue: packageDetails.customsValue ? parseFloat(packageDetails.customsValue) : undefined,
          // Include package contents for better HS code matching
          packageContents: packageDetails.packageContents,
          // Include product information for ChatGPT duty calculations
          productName: packageDetails.productName,
          productDescription: packageDetails.productDescription,
          hsCode: packageDetails.hsCode
        });
        
        const data = await response.json();
        setPriceResult(data);
        
        toast({
          title: "Price Calculated",
          description: "Shipping price has been calculated successfully.",
        });
      } catch (error) {
        console.error("Error calculating price:", error);
        toast({
          title: "Calculation Failed",
          description: "There was an error calculating the shipping price. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsCalculating(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Calculator className="h-5 w-5 mr-2" />
            Quick Price Calculator
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column - Input fields */}
            <div className="space-y-4">
              <h3 className="text-md font-medium mb-2">Package Details</h3>
              
              {/* Toggle for direct billable weight */}
              <div className="flex items-center justify-between px-2 py-3 border rounded-lg bg-gray-50 mb-4">
                <Label htmlFor="useBillableWeight" className="font-medium cursor-pointer">
                  Enter billable weight directly
                </Label>
                <div className="relative inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white
                  bg-gray-200 data-[state=checked]:bg-primary"
                  data-state={packageDetails.useBillableWeight ? "checked" : "unchecked"}
                  onClick={() => {
                    setPackageDetails(prev => ({ 
                      ...prev, 
                      useBillableWeight: !prev.useBillableWeight,
                      // Reset appropriate fields based on new toggle state
                      ...(prev.useBillableWeight ? 
                        { billableWeightInput: "" } : 
                        { length: "", width: "", height: "", weight: "" })
                    }));
                    // Reset calculated values
                    if (packageDetails.useBillableWeight) {
                      setBillableWeight(null);
                    } else {
                      setVolumetricWeight(null);
                    }
                  }}
                >
                  <span
                    className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
                    data-state={packageDetails.useBillableWeight ? "checked" : "unchecked"}
                  />
                </div>
              </div>
              
              {packageDetails.useBillableWeight ? (
                // Show billable weight input if direct input is enabled
                <div>
                  <Label htmlFor="billableWeightInput">Billable Weight (kg)</Label>
                  <Input
                    id="billableWeightInput"
                    name="billableWeightInput"
                    placeholder="Enter billable weight in kg"
                    value={packageDetails.billableWeightInput}
                    onChange={handleInputChange}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the billable weight directly without calculating dimensions.
                  </p>
                </div>
              ) : (
                // Show dimension inputs if direct input is disabled
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="packageLength">Length (cm)</Label>
                      <Input
                        id="packageLength"
                        name="length"
                        placeholder="Length in cm"
                        value={packageDetails.length}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="packageWidth">Width (cm)</Label>
                      <Input
                        id="packageWidth"
                        name="width"
                        placeholder="Width in cm"
                        value={packageDetails.width}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="packageHeight">Height (cm)</Label>
                      <Input
                        id="packageHeight"
                        name="height"
                        placeholder="Height in cm"
                        value={packageDetails.height}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="packageWeight">Weight (kg)</Label>
                      <Input
                        id="packageWeight"
                        name="weight"
                        placeholder="Weight in kg"
                        value={packageDetails.weight}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div>
                <Label htmlFor="pieceCount">Number of Pieces</Label>
                <Input
                  id="pieceCount"
                  name="pieceCount"
                  placeholder="Number of identical pieces in this shipment"
                  value={packageDetails.pieceCount}
                  onChange={handleInputChange}
                  type="number"
                  min="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For multiple identical packages, enter the quantity to generate multiple labels
                </p>
              </div>
              
              <div>
                <Label htmlFor="receiverCountry">Destination Country</Label>
                <Select 
                  value={packageDetails.receiverCountry} 
                  onValueChange={handleCountryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country: Country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Service Level has been hidden as requested */}
              
              {/* Package Contents Field */}
              <div>
                <Label htmlFor="packageContents">Package Contents</Label>
                <Input
                  id="packageContents"
                  name="packageContents"
                  placeholder="What is in the package? (required for shipping)"
                  value={packageDetails.packageContents}
                  onChange={handleInputChange}
                />
              </div>
              
              {/* Customs Value Field for International Shipments */}
              {packageDetails.receiverCountry && packageDetails.receiverCountry !== 'TR' && (
                <div>
                  <Label htmlFor="customsValue">
                    Customs Value (USD)
                    <span className="text-xs text-gray-500 ml-1">(for duty calculation)</span>
                  </Label>
                  <Input
                    id="customsValue"
                    name="customsValue"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter total value of goods in USD"
                    value={packageDetails.customsValue}
                    onChange={handleInputChange}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    This value will be used to calculate accurate import duties and taxes
                  </div>
                </div>
              )}

              {/* Product Information Fields for Duty Calculations */}
              {packageDetails.receiverCountry && packageDetails.receiverCountry !== 'TR' && (
                <div className="space-y-4 border rounded-md p-4 bg-purple-50">
                  <h4 className="text-sm font-medium text-purple-800 flex items-center">
                    <Package className="h-4 w-4 mr-2" />
                    Product Information (for accurate duty calculation)
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="productName">Product Name</Label>
                      <Input
                        id="productName"
                        name="productName"
                        placeholder="e.g., Wireless Headphones"
                        value={packageDetails.productName}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="hsCode">HS Code (Optional)</Label>
                      <Input
                        id="hsCode"
                        name="hsCode"
                        placeholder="e.g., 8518.30.00"
                        value={packageDetails.hsCode}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="productDescription">Product Description (Optional)</Label>
                    <Input
                      id="productDescription"
                      name="productDescription"
                      placeholder="e.g., Bluetooth wireless over-ear headphones with noise cancellation"
                      value={packageDetails.productDescription}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="text-xs text-purple-700 bg-purple-100 p-2 rounded">
                    💡 Providing specific product details helps our AI calculate more accurate customs duties and taxes
                  </div>
                </div>
              )}
              
              {/* Weight calculations info card */}
              <div className="border rounded-md p-3 bg-gray-50">
                <h3 className="text-sm font-medium mb-2">Weight Calculation</h3>
                
                {packageDetails.useBillableWeight ? (
                  // Direct billable weight display
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 font-medium">Billable Weight:</span>
                      <span className="font-medium">
                        {packageDetails.billableWeightInput ? `${packageDetails.billableWeightInput} kg` : "-"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Using manually entered billable weight for price calculation.
                    </p>
                  </div>
                ) : (
                  // Regular weight calculation display
                  <>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-600">Actual Weight:</span>
                      <span>{packageDetails.weight ? `${packageDetails.weight} kg` : "-"}</span>
                      
                      <span className="text-gray-600">Volumetric Weight:</span>
                      <span>{volumetricWeight ? `${volumetricWeight} kg` : "-"}</span>
                      
                      <span className="text-gray-600 font-medium">Billable Weight:</span>
                      <span className="font-medium">{billableWeight ? `${billableWeight} kg` : "-"}</span>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2">
                      Billable weight is the higher of actual weight and volumetric weight (L×W×H÷5000).
                    </p>
                  </>
                )}
              </div>
              
              <Button 
                onClick={calculatePrice} 
                disabled={isCalculating}
                className="w-full"
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculate Price
                  </>
                )}
              </Button>
            </div>
            
            {/* Right column - Shipping Info and Price Result */}
            <div className="space-y-4">
              <h3 className="text-md font-medium mb-2">Shipping Information</h3>
              <div className="border rounded-md p-4 bg-primary/5">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">From:</span>
                    <span className="font-medium">Istanbul, Turkey</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">To:</span>
                    <span className="font-medium">
                      {packageDetails.receiverCountry ? 
                        COUNTRIES.find((c: Country) => c.code === packageDetails.receiverCountry)?.name : 
                        "Select a country"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium">
                      {ServiceLevelDetails[packageDetails.serviceLevel].name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Delivery:</span>
                    <span className="font-medium">
                      {serviceDeliveryDays(packageDetails.serviceLevel)} days
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Price Result Card */}
              {priceResult && (
                <div className="mt-4">
                  <div className="border rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-primary/10 p-3 border-b border-primary/10">
                      <div className="flex items-center">
                        <Package className="h-5 w-5 text-primary mr-2" />
                        <h2 className="text-lg font-semibold text-primary">Price Estimate</h2>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                          <span className="text-gray-600">Base Price:</span>
                          <span className="font-medium">${(priceResult.basePrice / 100).toFixed(2)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                          <span className="text-gray-600">Fuel Surcharge:</span>
                          <span className="font-medium">${(priceResult.fuelCharge / 100).toFixed(2)}</span>
                        </div>
                        
                        {priceResult.taxes > 0 && (
                          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                            <span className="text-gray-600">Taxes:</span>
                            <span className="font-medium">${(priceResult.taxes / 100).toFixed(2)}</span>
                          </div>
                        )}
                        
                        {/* Duties and Taxes Display */}
                        {priceResult.duties?.available && (
                          <>
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-blue-800">International Duties & Taxes</span>
                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Estimated</span>
                              </div>
                              
                              {priceResult.duties.duty > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-blue-700">Import Duty:</span>
                                  <span className="text-sm font-medium text-blue-900">{priceResult.duties.formattedDuty}</span>
                                </div>
                              )}
                              
                              {priceResult.duties.tax > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-blue-700">Import Tax:</span>
                                  <span className="text-sm font-medium text-blue-900">{priceResult.duties.formattedTax}</span>
                                </div>
                              )}
                              
                              {priceResult.duties.total > 0 && (
                                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                                  <span className="text-sm font-semibold text-blue-800">Total Duties:</span>
                                  <span className="text-sm font-bold text-blue-900">{priceResult.duties.formattedTotal}</span>
                                </div>
                              )}
                              
                              <div className="text-xs text-blue-600 mt-2">
                                {priceResult.duties.note}
                              </div>
                            </div>
                          </>
                        )}
                        
                        {priceResult.duties?.available === false && priceResult.duties?.message && (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="text-xs text-gray-600">{priceResult.duties.message}</div>
                            {priceResult.duties.fallbackNote && (
                              <div className="text-xs text-gray-500 mt-1 italic">{priceResult.duties.fallbackNote}</div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center pt-3 border-t-2 border-primary/20">
                          <span className="text-lg font-semibold text-gray-900">Shipping Total:</span>
                          <span className="text-xl font-bold text-primary">${(priceResult.totalPrice / 100).toFixed(2)}</span>
                        </div>
                        
                        {priceResult.duties?.available && priceResult.duties.total > 0 && (
                          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-amber-800">Total with Duties:</span>
                              <span className="text-lg font-bold text-amber-900">
                                ${((priceResult.totalPrice + priceResult.duties.total) / 100).toFixed(2)}
                              </span>
                            </div>
                            <div className="text-xs text-amber-700 mt-1">
                              This is the estimated total cost including shipping and import duties
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 border-t text-sm text-center text-gray-500">
                      Price includes your account's multiplier
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button 
                      size="sm"
                      disabled={!packageDetails.packageContents}
                      title={!packageDetails.packageContents ? "Package contents is required" : ""}
                      onClick={() => {
                        if (!packageDetails.packageContents) {
                          toast({
                            title: "Package Contents Required",
                            description: "Please specify what is inside the package before creating a shipment.",
                            variant: "destructive"
                          });
                          return;
                        }
                        
                        // Store the package details in localStorage instead of cookies
                        // This is more reliable across page navigations and doesn't interfere with sessions
                        if (packageDetails.useBillableWeight) {
                          // When using direct billable weight, use minimums for dimensions
                          localStorage.setItem('calculator_length', "1");
                          localStorage.setItem('calculator_width', "1");
                          localStorage.setItem('calculator_height', "1");
                          // Use the directly entered billable weight as the weight
                          localStorage.setItem('calculator_weight', packageDetails.billableWeightInput);
                          localStorage.setItem('calculator_billable_weight', packageDetails.billableWeightInput);
                          localStorage.setItem('calculator_using_billable_weight', 'true');
                        } else {
                          // Regular dimensional calculation
                          localStorage.setItem('calculator_length', packageDetails.length);
                          localStorage.setItem('calculator_width', packageDetails.width);
                          localStorage.setItem('calculator_height', packageDetails.height);
                          localStorage.setItem('calculator_weight', packageDetails.weight);
                          localStorage.setItem('calculator_using_billable_weight', 'false');
                          // If billable weight was calculated, store that as well
                          if (billableWeight) {
                            localStorage.setItem('calculator_billable_weight', billableWeight.toString());
                          }
                        }
                        
                        // Common fields
                        localStorage.setItem('calculator_piece_count', packageDetails.pieceCount);
                        localStorage.setItem('calculator_country', packageDetails.receiverCountry);
                        localStorage.setItem('calculator_service', packageDetails.serviceLevel);
                        localStorage.setItem('calculator_contents', packageDetails.packageContents);
                        localStorage.setItem('calculator_customs_value', packageDetails.customsValue);
                        
                        console.log("Storing package details in localStorage and navigating to shipment-create");
                        console.log("localStorage values:", {
                          length: localStorage.getItem('calculator_length'),
                          width: localStorage.getItem('calculator_width'),
                          height: localStorage.getItem('calculator_height'),
                          weight: localStorage.getItem('calculator_weight'),
                          billableWeight: localStorage.getItem('calculator_billable_weight'), 
                          usingBillableWeight: localStorage.getItem('calculator_using_billable_weight'),
                          pieceCount: localStorage.getItem('calculator_piece_count'),
                          country: localStorage.getItem('calculator_country'),
                          service: localStorage.getItem('calculator_service'),
                          contents: localStorage.getItem('calculator_contents')
                        });
                        
                        // Close the dialog first
                        onOpenChange(false);
                        
                        // Use standard window navigation to preserve session
                        setTimeout(() => {
                          window.location.href = '/shipment-create';
                        }, 100);
                      }}
                    >
                      Create Shipment
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}