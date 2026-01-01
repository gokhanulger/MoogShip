import React, { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftIcon,
  Loader2Icon,
  FileUpIcon,
  EditIcon,
  CheckCircleIcon,
  XCircleIcon,
  InfoIcon,
  AlertCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  RotateCcwIcon,
  CopyIcon,
  ShieldCheckIcon,
  DollarSignIcon,
  HashIcon,
  TagIcon,
  PackageIcon,
  HelpCircleIcon,
  AlertTriangleIcon,
  RefreshCw,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  validateGTIP,
  formatGTIPForDisplay,
  autoCorrectGTIP,
  getGTIPValidationColor,
  type GTIPValidationResult,
} from "@/utils/gtip-validation";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ServiceLevel } from "@shared/schema";
import { withAuth } from "@/lib/with-auth";
import EtsyImportGuide from "@/components/etsy-import-guide";
import { PackageTemplateSelector } from "@/components/package-template-selector";
import { BoxSelect } from "lucide-react";
import { isEUCountry, isHMRCCountry } from "@/lib/countries";
import { convertCountryNameToCode } from "@shared/countries";

interface BulkUploadProps {
  user: any;
}

function BulkUploadContent({ user }: BulkUploadProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [customsInputValues, setCustomsInputValues] = useState<
    Map<number, string>
  >(new Map());
  const [insuranceInputValues, setInsuranceInputValues] = useState<
    Map<number, string>
  >(new Map());
  const [validationErrorDialog, setValidationErrorDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details: string;
    solution: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    details: "",
    solution: "",
  });
  const [insuranceInputRefs] = useState<
    Map<number, React.RefObject<HTMLInputElement>>
  >(new Map());

  // Helper function to get or create input ref for a specific index
  const getInsuranceInputRef = (
    index: number,
  ): React.RefObject<HTMLInputElement> => {
    if (!insuranceInputRefs.has(index)) {
      insuranceInputRefs.set(index, React.createRef<HTMLInputElement>());
    }
    return insuranceInputRefs.get(index)!;
  };

  // Function to calculate duties for DDP shipments automatically
  const calculateDutiesForShipment = async (
    shipment: any,
    shipmentIndex: number,
  ) => {
    try {
      // Only calculate if user has explicitly selected DDP
      if (shipment.shippingTerms !== 'ddp') {
        console.log('DDP calculation skipped - shipping terms not set to DDP');
        return;
      }
      
      // Use the unified DDP calculation for all countries, not just US
      if (!shipment.gtip || !shipment.customsValue) {
        console.log('DDP calculation requires both HS code and customs value');
        return;
      }

      console.log(`Calculating DDP for shipment ${shipmentIndex + 1}`);

      const cleanedHS = shipment.gtip.toString().replace(/\./g, '');
      const customsValueInDollars = shipment.customsValue / 100; // Convert cents to dollars
      
      // Use the unified DDP calculation endpoint
      await calculateDdpForShipment(shipmentIndex, cleanedHS, customsValueInDollars);
    } catch (error) {
      console.error('Error calculating DDP:', error);
      toast({
        title: "DDP Calculation Error",
        description: "Could not calculate DDP for this shipment",
        variant: "destructive",
      });
    }
  };

  // Function to calculate insurance cost automatically (1% of value, consistent with Etsy page)
  const calculateInsuranceCostForShipment = (
    insuranceValue: number,
    shipmentIndex: number,
  ) => {
    if (insuranceValue <= 0) {
      // Clear insurance cost if value is 0 or empty
      setShipmentPreview((prev) => {
        const newShipments = [...prev];
        newShipments[shipmentIndex] = {
          ...newShipments[shipmentIndex],
          calculatedInsuranceCost: 0,
        };
        return newShipments;
      });
      return;
    }

    // Simple 1% calculation (insuranceValue is already in cents)
    const insuranceCost = Math.round(insuranceValue * 0.01);
    
    setShipmentPreview((prev) => {
      const newShipments = [...prev];
      newShipments[shipmentIndex] = {
        ...newShipments[shipmentIndex],
        calculatedInsuranceCost: insuranceCost,
      };
      return newShipments;
    });
  };
  const [taxIdValues, setTaxIdValues] = useState<Map<number, string>>(
    new Map(),
  );
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [packageColumnWidth, setPackageColumnWidth] = useState(() => {
    const saved = localStorage.getItem("bulk-upload-package-column-width");
    
    const getResponsiveDefault = () => {
      const width = window.innerWidth;
      if (width < 640) return 300; // Mobile: smaller column
      if (width < 768) return 400; // Tablet: medium column
      if (width < 1024) return 600; // Small desktop: larger column
      return 800; // Large desktop: full width but not excessive
    };
    
    const getMaxWidthForViewport = () => {
      const width = window.innerWidth;
      if (width < 640) return 320; // Mobile: max 320px
      if (width < 768) return 450; // Tablet: max 450px
      if (width < 1024) return 650; // Small desktop: max 650px
      return 1200; // Large desktop: max 1200px (was 2000px)
    };
    
    // Clamp saved value to viewport-appropriate maximum
    if (saved) {
      const savedValue = parseInt(saved, 10);
      const maxForViewport = getMaxWidthForViewport();
      return Math.min(savedValue, maxForViewport);
    }
    
    return getResponsiveDefault();
  });
  const [isResizing, setIsResizing] = useState(false);

  // Add window resize listener to update column width responsively
  React.useEffect(() => {
    const handleResize = () => {
      const getMaxWidthForViewport = () => {
        const width = window.innerWidth;
        if (width < 640) return 320; // Mobile: max 320px
        if (width < 768) return 450; // Tablet: max 450px
        if (width < 1024) return 650; // Small desktop: max 650px
        return 1200; // Large desktop: max 1200px
      };
      
      const maxForViewport = getMaxWidthForViewport();
      
      // Always enforce maximum width for current viewport
      setPackageColumnWidth(prev => {
        if (prev > maxForViewport) {
          // Update localStorage with clamped value
          localStorage.setItem("bulk-upload-package-column-width", maxForViewport.toString());
          return maxForViewport;
        }
        return prev;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle column resize functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = packageColumnWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      
      // Use responsive constraints based on viewport
      const getConstraintsForViewport = () => {
        const width = window.innerWidth;
        if (width < 640) return { min: 250, max: 320 }; // Mobile
        if (width < 768) return { min: 300, max: 450 }; // Tablet
        if (width < 1024) return { min: 400, max: 650 }; // Small desktop
        return { min: 400, max: 1200 }; // Large desktop
      };
      
      const { min, max } = getConstraintsForViewport();
      const newWidth = Math.max(min, Math.min(max, startWidth + deltaX));
      setPackageColumnWidth(newWidth);
      localStorage.setItem(
        "bulk-upload-package-column-width",
        newWidth.toString(),
      );
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileValidated, setFileValidated] = useState(false);
  const [shipmentPreview, setShipmentPreview] = useState<any[]>([]);
  const [isEtsyUpload, setIsEtsyUpload] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<
    Map<number, { name: string; dimensions: string }>
  >(new Map());
  const [editingShipment, setEditingShipment] = useState<any | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDimensions, setBulkDimensions] = useState({
    length: 15,
    width: 10,
    height: 1,
    weight: 0.5,
  });
  const [dimensionsConfirmed, setDimensionsConfirmed] = useState(false);
  const [recalculatingPrices, setRecalculatingPrices] = useState(false);
  // Removed renderKey state - was causing infinite re-renders

  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    shipments?: any[];
    errors?: { row: number; errors: string[] }[];
    errorCount?: number;
    totalRows?: number;
  } | null>(null);
  const [isPrintingLabels, setIsPrintingLabels] = useState(false);

  // GTIP validation state for each shipment
  const [gtipValidations, setGtipValidations] = useState<
    Map<number, GTIPValidationResult>
  >(new Map());

  // Selection state for shipments
  const [selectedShipments, setSelectedShipments] = useState<Set<number>>(
    new Set(),
  );

  // User-created package templates stored in localStorage
  const [userTemplates, setUserTemplates] = useState<any[]>([]);

  // Database-stored package templates
  const [dbTemplates, setDbTemplates] = useState<any[]>([]);

  // DDP calculation states
  const [ddpCalculations, setDdpCalculations] = useState<Map<number, any>>(new Map());
  const [calculatingDdp, setCalculatingDdp] = useState(false);
  const [ddpModalOpen, setDdpModalOpen] = useState(false);
  const [totalDdpAmount, setTotalDdpAmount] = useState(0);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [canAffordDdp, setCanAffordDdp] = useState(true);
  const [ddpProcessing, setDdpProcessing] = useState(false);

  // Load user templates from localStorage on component mount
  React.useEffect(() => {
    const savedTemplates = localStorage.getItem("moogship-package-templates");
    if (savedTemplates) {
      try {
        setUserTemplates(JSON.parse(savedTemplates));
      } catch (error) {
        console.warn("Failed to parse saved package templates from localStorage:", error);
      }
    }
  }, []);

  // Fetch database-stored package templates
  const { data: packageTemplatesData } = useQuery({
    queryKey: ["/api/package-templates"],
    enabled: true,
  });

  React.useEffect(() => {
    if (packageTemplatesData && Array.isArray(packageTemplatesData)) {
      setDbTemplates(packageTemplatesData);
    } else if (packageTemplatesData) {
      setDbTemplates([]);
    }
  }, [packageTemplatesData]);

  // Save template to localStorage
  const savePackageTemplate = (name: string, dimensions: any) => {
    const newTemplate = {
      id: Date.now().toString(),
      name,
      dimensions,
      createdAt: new Date().toISOString(),
    };

    const updatedTemplates = [...userTemplates, newTemplate];
    setUserTemplates(updatedTemplates);
    localStorage.setItem(
      "moogship-package-templates",
      JSON.stringify(updatedTemplates),
    );

    toast({
      title: "Template Saved",
      description: `Package template "${name}" has been saved for future use.`,
    });
  };

  // Default package templates for quick selection
  const defaultTemplates = [
    { name: "Small Package", dimensions: { length: 10, width: 8, height: 3 } },
    {
      name: "Medium Package",
      dimensions: { length: 20, width: 15, height: 5 },
    },
    {
      name: "Large Package",
      dimensions: { length: 30, width: 25, height: 10 },
    },
    { name: "Jewelry Box", dimensions: { length: 8, width: 6, height: 2 } },
    { name: "Clothing Item", dimensions: { length: 25, width: 20, height: 3 } },
    { name: "Electronics", dimensions: { length: 15, width: 12, height: 8 } },
    { name: "Book/Document", dimensions: { length: 23, width: 15, height: 2 } },
  ];

  // Combine all template sources
  const packageTemplates = [
    ...defaultTemplates,
    ...dbTemplates.map((template) => ({
      name: template.name,
      dimensions: {
        length: template.length,
        width: template.width,
        height: template.height,
      },
    })),
    ...userTemplates,
  ];

  // Pure GTIP validation function that doesn't update state
  const validateGTIPForShipment = (value: string) => {
    console.log('🔍 HS Code Validation Debug:', { value });
    const validation = validateGTIP(value);
    console.log('🔍 GTIP Validation Result:', validation);
    return validation;
  };

  // Handle GTIP validation and state updates for a specific shipment
  const handleGTIPValidation = (index: number, value: string) => {
    const validation = validateGTIPForShipment(value);
    
    // Update validation state
    setGtipValidations((prev) => {
      const newMap = new Map(prev);
      newMap.set(index, validation);
      return newMap;
    });
    
    return validation;
  };

  // Handle US DDP logic separately to avoid cascading state updates
  const handleUSDDPLogic = async (index: number, validation: any, shipment: any) => {
    if (!validation.isValid || !validation.cleaned || !shipment) return;
    
    const isUSDestination = shipment.receiverCountry === 'United States' || 
                            shipment.receiverCountry === 'US' ||
                            shipment.receiverCountry === 'USA';
    
    console.log('🇺🇸 US Destination Check:', {
      country: shipment.receiverCountry,
      isUSDestination,
      hasCustomsValue: !!shipment.customsValue,
      customsValue: shipment.customsValue,
      shippingTerms: shipment.shippingTerms
    });
    
    // Only calculate DDP if user has explicitly selected DDP and has customs value
    if (isUSDestination && shipment.shippingTerms === 'ddp' && shipment.customsValue) {
      console.log('🧮 Triggering DDP calculation from HS code change for US DDP shipment', index);
      // Use setTimeout to avoid cascading state updates
      setTimeout(() => {
        calculateDdpForShipment(index, validation.cleaned, shipment.customsValue / 100);
      }, 0);
    }
  };

  // Calculate DDP for a specific shipment
  const calculateDdpForShipment = async (index: number, hsCode: string, customsValue: number) => {
    try {
      const response = await apiRequest('POST', '/api/calculate-bulk-ddp', {
        shipments: [{
          index,
          gtip: hsCode,
          customsValue: customsValue
        }],
        userId: user.id
      });
      const data = await response.json();

      if (data.success && data.calculations && data.calculations.length > 0) {
        const calculation = data.calculations[0];
        setDdpCalculations(prev => {
          const newMap = new Map(prev);
          newMap.set(index, calculation);
          return newMap;
        });
      }
    } catch (error) {
      console.error('Error calculating DDP for shipment:', error);
    }
  };

  // Calculate DDP for all shipments with valid GTIP codes
  const calculateBulkDdp = async () => {
    if (!shipmentPreview || shipmentPreview.length === 0) {
      toast({
        title: "No Shipments",
        description: "No shipments available for DDP calculation",
        variant: "destructive"
      });
      return;
    }

    setCalculatingDdp(true);
    try {
      const shipmentsWithGtip = shipmentPreview
        .map((shipment, index) => ({ ...shipment, index }))
        .filter(shipment => shipment.gtip && shipment.customsValue);

      if (shipmentsWithGtip.length === 0) {
        toast({
          title: "No Valid HS Codes",
          description: "Please enter HS codes and customs values for shipments to calculate DDP",
          variant: "destructive"
        });
        setCalculatingDdp(false);
        return;
      }

      const response = await apiRequest('POST', '/api/calculate-bulk-ddp', {
        shipments: shipmentsWithGtip,
        userId: user.id
      });
      const data = await response.json();

      if (data.success) {
        // Store individual calculations
        const calculationsMap = new Map();
        data.calculations.forEach((calc: any) => {
          calculationsMap.set(calc.shipmentIndex, calc);
        });
        setDdpCalculations(calculationsMap);
        
        // Store totals and balance info
        setTotalDdpAmount(data.totalDdpAmount || 0);
        setUserBalance(data.userBalance || 0);
        setCanAffordDdp(data.canAfford || false);
        
        // Show confirmation modal
        setDdpModalOpen(true);
        
        toast({
          title: "DDP Calculated",
          description: `Total DDP: ${data.totalDdpAmountFormatted} for ${data.calculations.filter((c: any) => c.available).length} shipments`
        });
      } else {
        throw new Error(data.message || 'Failed to calculate DDP');
      }
    } catch (error) {
      console.error('Error calculating bulk DDP:', error);
      toast({
        title: "DDP Calculation Failed",
        description: "Failed to calculate DDP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCalculatingDdp(false);
    }
  };

  // Process DDP deduction from user balance
  const processDdpDeduction = async () => {
    if (!canAffordDdp) {
      toast({
        title: "Insufficient Balance",
        description: "Your balance is insufficient to cover the DDP amount",
        variant: "destructive"
      });
      return;
    }

    setDdpProcessing(true);
    try {
      const shipmentsWithDdp = Array.from(ddpCalculations.entries())
        .filter(([_, calc]) => calc.available)
        .map(([index, calc]) => ({
          index,
          hsCode: calc.hsCode,
          ddpAmount: calc.totalWithProcessingFee,
          customsValue: calc.customsValue
        }));

      const response = await apiRequest('POST', '/api/deduct-ddp-balance', {
        userId: user.id,
        ddpAmount: totalDdpAmount,
        shipmentDetails: shipmentsWithDdp
      });
      const data = await response.json();

      if (data.success) {
        // Update local balance state
        setUserBalance(data.newBalance);
        
        // Close modal
        setDdpModalOpen(false);
        
        toast({
          title: "DDP Processed",
          description: `${data.ddpAmountDeductedFormatted} deducted from your balance. New balance: ${data.newBalanceFormatted}`,
        });

        // Refresh balance in the header
        queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      } else {
        throw new Error(data.message || 'Failed to process DDP deduction');
      }
    } catch (error) {
      console.error('Error processing DDP deduction:', error);
      toast({
        title: "DDP Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process DDP deduction. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDdpProcessing(false);
    }
  };

  // Handle package template selection
  const handlePackageTemplateSelect = (index: number, template: any) => {
    const newShipments = [...shipmentPreview];

    if (template.dimensions === "save") {
      // Save current dimensions as template
      const currentShipment = newShipments[index];
      const templateName = prompt(
        `Save current dimensions (${currentShipment.length || 15}×${currentShipment.width || 10}×${currentShipment.height || 1}) as template:`,
        `Custom Template ${userTemplates.length + 1}`,
      );

      if (templateName) {
        savePackageTemplate(templateName, {
          length: currentShipment.length || 15,
          width: currentShipment.width || 10,
          height: currentShipment.height || 1,
        });
      }
    } else if (
      template.dimensions ||
      (template.length && template.width && template.height)
    ) {
      // Handle both structures: default/localStorage templates (dimensions) and database templates (direct properties)
      const dimensions = template.dimensions || template;

      newShipments[index] = {
        ...newShipments[index],
        length: dimensions.length,
        width: dimensions.width,
        height: dimensions.height,
        // Clear pricing options to trigger recalculation
        pricingOptions: null,
        selectedServiceOption: null,
      };
      setShipmentPreview(newShipments);

      // Template applied successfully

      // Auto-recalculate pricing after template selection - removed setTimeout to prevent loops
      if (!recalculatingPrices) {
        recalculatePricesForShipments([newShipments[index]]);
      }
    } else {
      // Custom option - open edit dialog
      handleEditDimensions(newShipments[index], index);
    }
  };

  // Add bulk create shipments mutation
  const bulkCreateMutation = useMutation({
    mutationFn: async (shipmentsData: any[]) => {
      const response = await fetch("/api/shipments/bulk-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ shipments: shipmentsData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create shipments");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate shipments query to refetch
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/my"] });

      setUploadResult({
        success: true,
        message: data.message,
        shipments: data.shipments,
      });

      // Get current language from i18n
      const currentLang = (t as any).i18n?.language || "tr";

      // Direct translation mapping for success messages
      const successTitles = {
        en: "Shipments Created Successfully",
        tr: "Gönderiler Başarıyla Oluşturuldu",
        de: "Sendungen Erfolgreich Erstellt",
      };

      const successDescriptions = {
        en: `Successfully created ${data.shipments?.length || 0} shipments`,
        tr: `${data.shipments?.length || 0} gönderi başarıyla oluşturuldu`,
        de: `${data.shipments?.length || 0} Sendungen erfolgreich erstellt`,
      };

      const lang = currentLang.startsWith("en")
        ? "en"
        : currentLang.startsWith("de")
          ? "de"
          : "tr";

      toast({
        title: successTitles[lang],
        description: successDescriptions[lang],
      });
    },
    onError: (error: Error) => {
      // Get current language from i18n
      const currentLang = (t as any).i18n?.language || "tr";

      // Direct translation mapping for error messages
      const errorTitles = {
        en: "Shipment Creation Failed",
        tr: "Gönderi Oluşturma Başarısız",
        de: "Sendungserstellung Fehlgeschlagen",
      };

      const lang = currentLang.startsWith("en")
        ? "en"
        : currentLang.startsWith("de")
          ? "de"
          : "tr";

      toast({
        title: errorTitles[lang],
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async (fileData: FormData) => {
      setUploading(true);

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
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
          credentials: "include",
          body: fileData,
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
        shipments: data.shipments,
      });

      toast({
        title: t("bulkUpload.success.title"),
        description: data.message,
      });
    },
    onError: (error: Error) => {
      setUploadResult({
        success: false,
        message: error.message,
      });

      toast({
        title: t("bulkUpload.errors.validationError"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add a new mutation for validating the file
  const validateFileMutation = useMutation({
    mutationFn: async (fileData: FormData) => {
      try {
        const response = await fetch("/api/shipments/validate-bulk", {
          method: "POST",
          credentials: "include",
          body: fileData,
        });

        const responseData = await response.json();

        if (!response.ok) {
          // If we have validation errors, capture them properly
          if (responseData.errors) {
            throw {
              message: responseData.message || "Validation failed",
              errors: responseData.errors,
              errorCount: responseData.errorCount,
              totalRows: responseData.totalRows,
            };
          }
          throw new Error(
            responseData.message || "Failed to validate shipments",
          );
        }

        return responseData;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (data) => {
      // Initialize insurance values from customs values for each shipment
      const shipmentsWithInsurance = (data.shipments || []).map((shipment: any) => ({
        ...shipment,
        // Auto-populate insurance value from customs value if not already set
        insuranceValue: shipment.insuranceValue || shipment.customsValue || 0,
      }));

      setFileValidated(true);
      setShipmentPreview(shipmentsWithInsurance);

      // Clear customs and insurance input values for new file
      setCustomsInputValues(new Map());
      setInsuranceInputValues(new Map());
      setSelectedTemplates(new Map());

      // Check if this is an Etsy upload based on the file type returned from backend
      const isEtsy = data.fileType === "etsy-csv";
      setIsEtsyUpload(isEtsy);

      // For all uploads, auto-confirm dimensions so the upload button is enabled
      setDimensionsConfirmed(true);

      // Always calculate prices with all service options for dropdown selection
      if (data.shipments && data.shipments.length > 0) {
        // Automatically calculate pricing options for all shipments after state update
        // Remove setTimeout to prevent infinite loops - calculate prices directly
        if (data.shipments && data.shipments.length > 0) {
          recalculatePricesForShipments(data.shipments);
        }
      } else {
      }

      // Show appropriate message based on upload type
      if (isEtsy) {
        toast({
          title: "Etsy Orders Imported",
          description: `${data.shipments.length} orders imported. Dimensions set to defaults and prices calculated automatically.`,
        });
      } else {
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
          totalRows: error.totalRows,
        });

        toast({
          title: "Validation Failed",
          description: `Found ${error.errorCount} rows with errors out of ${error.totalRows} total rows.`,
          variant: "destructive",
        });
      } else {
        // Standard error handling
        setUploadResult({
          success: false,
          message: error.message || "An unknown error occurred",
        });

        toast({
          title: "Validation Failed",
          description: error.message || "Failed to validate the file",
          variant: "destructive",
        });
      }
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      // Reset states
      setUploadResult(null);
      setUploadProgress(0);
      setFileValidated(false);
      setShipmentPreview([]);
      // Reset for new file upload
    }
  };

  const handleValidateFile = () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file to upload",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".csv")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel (.xlsx) or CSV (.csv) file",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    validateFileMutation.mutate(formData);
  };

  const handleUpload = () => {
    if (!file || !fileValidated) {
      toast({
        title: "Validation Required",
        description: "Please validate the file before proceeding",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    // For all uploads (Etsy or generic), include shipment data if we have a preview
    if (shipmentPreview.length > 0) {
      // For Etsy uploads, filter out skipped shipments
      const selectedShipments = isEtsyUpload
        ? shipmentPreview.filter((shipment) => !shipment.skipImport)
        : shipmentPreview;

      // Include pricing details for all shipments
      const shipmentsWithPricing = selectedShipments.map((shipment) => ({
        ...shipment,
        // Ensure pricing fields are included with defaults if not present
        basePrice: shipment.basePrice || 0,
        fuelCharge: shipment.fuelCharge || 0,
        taxes: shipment.taxes || 0,
        totalPrice: shipment.totalPrice || 0,
        carrierName: shipment.carrierName || "Standard Service",
        estimatedDeliveryDays: shipment.estimatedDeliveryDays || 7,
      }));

      // Add the shipments data as a JSON string
      formData.append("shipments", JSON.stringify(shipmentsWithPricing));
      formData.append("createLabels", "true"); // Request label creation
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
    // Use default dimensions (15x10x1 cm, 0.5 kg) if not set
    const editableShipment = {
      ...shipment,
      length: shipment.length || 15,
      width: shipment.width || 10,
      height: shipment.height || 1,
      weight: shipment.weight || 0.5,
    };
    setEditingShipment(editableShipment);
    setEditingIndex(index);
    setEditOpen(true);
  };

  // Handle saving edited dimensions
  const handleSaveDimensions = async () => {
    if (!editingShipment || editingIndex === null) return;

    // Calculate volumetric weight (length * width * height / 5000)
    const volumetricWeight =
      ((editingShipment.length || 15) *
        (editingShipment.width || 10) *
        (editingShipment.height || 1)) /
      5000;

    // Calculate billable weight (the maximum of actual and volumetric)
    const billableWeight = Math.max(
      editingShipment.weight || 0.5,
      volumetricWeight,
    );

    // Update the shipment with calculated values
    const updatedShipment = {
      ...editingShipment,
      // Store volume weight and billable weight for reference
      volumetricWeight: parseFloat(volumetricWeight.toFixed(2)),
      billableWeight: parseFloat(billableWeight.toFixed(2)),
      // Reset pricing data so it gets recalculated
      basePrice: undefined,
      fuelCharge: undefined,
      totalPrice: undefined,
      // Clear pricing options and selection since dimensions changed
      pricingOptions: [],
      selectedServiceOption: null,
      // Add flag to indicate this shipment needs pricing
      needsPricing: true,
    };

    // Update the shipment in the preview array
    const updatedShipments = [...shipmentPreview];
    updatedShipments[editingIndex] = updatedShipment;
    setShipmentPreview(updatedShipments);

    // Show appropriate toast message
    toast({
      title: "Dimensions Updated",
      description: `Updated dimensions for order #${editingShipment.orderNumber || editingIndex + 1}. Recalculating prices...`,
    });

    setEditOpen(false);
    // Set the flag to indicate this shipment has been edited
    setDimensionsConfirmed(true);

    // Automatically recalculate prices after saving dimensions
    await recalculatePricesAfterDimensionEdit(editingIndex, updatedShipment);
  };

  // Recalculate prices for individual shipment after dimension changes
  const recalculatePricesAfterDimensionEdit = async (
    editingIndex: number,
    updatedShipment: any,
  ) => {
    // Set loading state for this specific shipment
    const loadingShipments = [...shipmentPreview];
    loadingShipments[editingIndex] = {
      ...loadingShipments[editingIndex],
      ...updatedShipment,
      pricingOptions: [],
      selectedServiceOption: null,
      isRecalculating: true,
      pricingError: null,
    };
    setShipmentPreview(loadingShipments);

    try {
      // Prepare shipment data for API with proper field mapping
      const apiShipment = {
        ...updatedShipment,
        packageLength: updatedShipment.length || 15,
        packageWidth: updatedShipment.width || 10,
        packageHeight: updatedShipment.height || 1,
        packageWeight: updatedShipment.billableWeight || 0.5,
      };

      const response = await fetch("/api/pricing/moogship-options", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          packageLength: apiShipment.packageLength,
          packageWidth: apiShipment.packageWidth,
          packageHeight: apiShipment.packageHeight,
          packageWeight: apiShipment.packageWeight,
          receiverCountry: apiShipment.receiverCountry || 'US',
          hsCode: apiShipment.gtip || apiShipment.hsCode,
          customsValue: apiShipment.customsValue,
          productName: apiShipment.contents || 'General merchandise',
          productDescription: apiShipment.description || '',
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to recalculate price");
      }

      const data = await response.json();

      if (data.success && data.options && data.options.length > 0) {
        // Update the shipment with the new pricing options in the preview array
        const finalShipments = [...shipmentPreview];
        
        // Map MoogShip options to pricing options format
        const pricingOptions = data.options?.map((option: any) => ({
          id: option.id,
          serviceName: option.displayName || option.name,
          serviceType: option.serviceType,
          totalPrice: option.totalPrice,
          totalPriceWithoutInsurance: option.totalPrice,
          estimatedDays: option.estimatedDays,
          carrier: option.carrier || 'MoogShip',
        })) || [];

        finalShipments[editingIndex] = {
          ...finalShipments[editingIndex],
          // First apply the new pricing data
          pricingOptions: pricingOptions,
          selectedServiceOption: pricingOptions[0] || null,
          duties: data.duties,
          // Then preserve the updated dimension data
          length: updatedShipment.length,
          width: updatedShipment.width,
          height: updatedShipment.height,
          weight: updatedShipment.weight,
          volumetricWeight: updatedShipment.volumetricWeight,
          billableWeight: updatedShipment.billableWeight,
          // Clear loading and error states
          isRecalculating: false,
          pricingError: null,
        };

        setShipmentPreview(finalShipments);

        // Show pricing options count in toast
        const optionsCount = pricingOptions.length;
        toast({
          title: "Pricing Updated",
          description: `New pricing calculated with ${optionsCount} service options available`,
        });
      } else {
        throw new Error("No pricing data returned");
      }
    } catch (error) {
      // Ensure the shipment is updated with the dimension changes even if pricing fails
      const finalShipments = [...shipmentPreview];
      finalShipments[editingIndex] = {
        ...finalShipments[editingIndex],
        ...updatedShipment,
        // Keep empty pricing options if API fails but mark as needing manual recalculation
        pricingOptions: [],
        selectedServiceOption: null,
        isRecalculating: false,
        pricingError: "Pricing failed - use Recalculate button",
      };
      setShipmentPreview(finalShipments);

      toast({
        title: "Price Update Failed",
        description:
          "Dimensions updated but pricing failed. Use 'Recalculate Prices' button to retry.",
        variant: "destructive",
      });
    }
  };

  // Toggle row expansion
  const toggleRowExpansion = (index: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(index)) {
      newExpandedRows.delete(index);
    } else {
      newExpandedRows.add(index);
    }
    setExpandedRows(newExpandedRows);
  };

  // Selection helper functions
  const toggleShipmentSelection = (index: number) => {
    const newSelected = new Set(selectedShipments);
    const newShipments = [...shipmentPreview];

    if (newSelected.has(index)) {
      newSelected.delete(index);
      // Mark as skip import when unselected
      newShipments[index] = {
        ...newShipments[index],
        skipImport: true,
      };
    } else {
      newSelected.add(index);
      // Include in import when selected
      newShipments[index] = {
        ...newShipments[index],
        skipImport: false,
      };
    }

    setSelectedShipments(newSelected);
    setShipmentPreview(newShipments);
  };

  const toggleSelectAll = () => {
    const newShipments = shipmentPreview.map((shipment) => ({
      ...shipment,
      skipImport: selectedShipments.size === shipmentPreview.length,
    }));

    if (selectedShipments.size === shipmentPreview.length) {
      setSelectedShipments(new Set());
    } else {
      setSelectedShipments(new Set(shipmentPreview.map((_, index) => index)));
    }

    setShipmentPreview(newShipments);
  };

  const selectedCount = shipmentPreview.filter((s) => !s.skipImport).length;
  const isAllSelected =
    selectedCount === shipmentPreview.length && shipmentPreview.length > 0;
  const isIndeterminate =
    selectedCount > 0 && selectedCount < shipmentPreview.length;

  // Handle recalculating prices after dimension changes
  // Function to calculate prices for shipments directly (used for automatic calculation)
  const recalculatePricesForShipments = async (shipments: any[]) => {
    if (!shipments || shipments.length === 0) {
      return;
    }

    await performPriceCalculation(shipments, false); // false = no toast for "no shipments" error
  };

  const recalculatePrices = async () => {
    // Early exit if no shipments are loaded
    if (!shipmentPreview || shipmentPreview.length === 0) {
      toast({
        title: "No Shipments",
        description:
          "Please upload and validate a file first before calculating prices.",
        variant: "destructive",
      });
      return;
    }

    await performPriceCalculation(shipmentPreview, true); // true = show toast for errors
  };

  const performPriceCalculation = async (
    shipments: any[],
    showErrorToasts: boolean = true,
  ) => {
    // Prevent re-entry to avoid cascading calculations
    if (recalculatingPrices) {
      return;
    }
    setRecalculatingPrices(true);
    
    try {
      // Check if all shipments have dimensions before calling the API
      const invalidShipments = shipments.filter((shipment) => {
        const length = shipment.length || shipment.packageLength;
        const width = shipment.width || shipment.packageWidth;
        const height = shipment.height || shipment.packageHeight;
        const weight = shipment.weight || shipment.packageWeight;
        return !length || !width || !height || !weight;
      });

      if (invalidShipments.length > 0) {
        if (showErrorToasts) {
          throw new Error(
            "Some shipments are missing dimensions. Please click the Edit button " +
              "to set dimensions for all shipments before calculating prices.",
          );
        } else {
          setRecalculatingPrices(false);
          return;
        }
      }

      // Pre-process shipments to map fields for API and calculate volumetric weight
      const shipmentsWithWeights = shipments.map((shipment, index) => {
        const length = shipment.length || shipment.packageLength || 15;
        const width = shipment.width || shipment.packageWidth || 10;
        const height = shipment.height || shipment.packageHeight || 1;
        const weight = shipment.weight || shipment.packageWeight || 0.5;

        // Calculate volumetric weight (length * width * height / 5000)
        const volumetricWeight = (length * width * height) / 5000;

        // Calculate billable weight (the maximum of actual weight and volumetric weight)
        const billableWeight = Math.max(weight, volumetricWeight);

        return {
          ...shipment,
          // Map to API expected field names
          packageLength: length,
          packageWidth: width,
          packageHeight: height,
          packageWeight: billableWeight,
          // Keep original fields for frontend display - ensure both naming conventions
          length,
          width,
          height,
          weight,
          volumetricWeight: parseFloat(volumetricWeight.toFixed(2)),
          billableWeight: parseFloat(billableWeight.toFixed(2)),
        };
      });

      // Process each shipment individually using moogship-options endpoint
      const pricingPromises = shipmentsWithWeights.map(async (shipment) => {
        const response = await fetch("/api/pricing/moogship-options", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            packageLength: shipment.packageLength,
            packageWidth: shipment.packageWidth,
            packageHeight: shipment.packageHeight,
            packageWeight: shipment.packageWeight,
            receiverCountry: shipment.receiverCountry || 'US',
            hsCode: shipment.gtip || shipment.hsCode,
            customsValue: shipment.customsValue,
            productName: shipment.contents || 'General merchandise',
            productDescription: shipment.description || '',
          }),
        });
        
        if (!response.ok) {
          return { success: false, error: 'Failed to calculate price' };
        }
        
        const data = await response.json();
        return data;
      });
      
      const responses = await Promise.all(pricingPromises);
      
      // Format the responses to match the expected structure
      const formattedShipments = responses.map((response, index) => {
        if (!response.success) {
          return {
            ...shipmentsWithWeights[index],
            pricingError: response.error,
          };
        }
        
        // Map MoogShip options to pricing options format
        const pricingOptions = response.options?.map((option: any) => ({
          id: option.id,
          serviceName: option.displayName || option.name,
          serviceType: option.serviceType,
          totalPrice: option.totalPrice,
          totalPriceWithoutInsurance: option.totalPrice,
          estimatedDays: option.estimatedDays,
          carrier: option.carrier || 'MoogShip',
        })) || [];
        
        return {
          ...shipmentsWithWeights[index],
          pricingOptions: pricingOptions,
          selectedServiceOption: pricingOptions[0] || null,
          duties: response.duties,
        };
      });
      
      const response = { ok: true };
      const data = { shipments: formattedShipments };

      if (!response.ok) {
        const errorData = await response.json();

        if (errorData.errors) {
          throw new Error(
            errorData.errors.map((err: any) => err.message).join(", ") ||
              "Please provide valid package dimensions and weight for all shipments",
          );
        }
        throw new Error("Failed to recalculate prices");
      }

      // Debug: Check each shipment's pricing options
      if (data.shipments) {
        data.shipments.forEach((shipment: any, index: number) => {});
      }

      // Update the preview with the new pricing information including pricing options
      // The API returns success: true even when some shipments fail, so we check for shipments array
      if (data.shipments && Array.isArray(data.shipments)) {
        // Remove the renderKey update to prevent infinite re-render loops

        // If we're recalculating only some shipments, merge with existing preview
        if (shipments.length < shipmentPreview.length) {
          // Create a map of updated shipments by their index or identifier
          const updatedShipments = [...shipmentPreview];

          // Update the specific shipments that were recalculated
          shipments.forEach((originalShipment, calcIndex) => {
            const previewIndex = shipmentPreview.findIndex(
              (s) =>
                s.receiverName === originalShipment.receiverName &&
                s.orderReference === originalShipment.orderReference,
            );

            if (previewIndex !== -1 && data.shipments[calcIndex]) {
              // CRITICAL FIX: Use the original shipment that was sent to API (contains template dimensions)
              // instead of potentially stale shipmentPreview state
              const currentShipment = originalShipment; // This contains the template-updated dimensions
              const newShipment = data.shipments[calcIndex];

              // Merge current frontend state with new pricing data
              // CRITICAL FIX: Keep dimensions from current frontend state (currentShipment) which has template updates
              // Ignore dimensions from API response (newShipment) which contains the sent dimensions, not current state
              updatedShipments[previewIndex] = {
                ...currentShipment,
                // Update ONLY pricing data from API response
                pricingOptions: newShipment?.pricingOptions || [],
                selectedServiceOption:
                  newShipment?.selectedServiceOption || null,
                pricingError: newShipment?.pricingError,
                // PRESERVE dimensions from current frontend state (these are the template-updated values)
                packageLength: currentShipment?.packageLength,
                packageWidth: currentShipment?.packageWidth,
                packageHeight: currentShipment?.packageHeight,
                packageWeight: currentShipment?.packageWeight,
                length: currentShipment?.length,
                width: currentShipment?.width,
                height: currentShipment?.height,
                weight: currentShipment?.weight,
              };
            }
          });

          setShipmentPreview(updatedShipments);
        } else {
          // Full recalculation - merge pricing data while preserving current frontend shipment data
          const mergedShipments = data.shipments.map(
            (updatedShipment: any, index: number) => {
              // CRITICAL FIX: Use the shipments that were actually sent to the API (which contain template dimensions)
              // instead of potentially stale shipmentPreview state
              const currentShipment =
                shipments[index] || shipmentPreview[index];

              // Calculate insurance cost using backend calculated value (from API response)
              let calculatedInsuranceCost = 0;
              if (
                currentShipment?.hasInsurance &&
                currentShipment?.insuranceValue > 0
              ) {
                // Use backend calculated insurance cost from the pricing API response
                calculatedInsuranceCost =
                  updatedShipment?.selectedServiceOption?.insuranceCost || 0;
              }

              return {
                ...currentShipment, // Preserve CURRENT frontend state including template-updated dimensions
                // Override with NEW pricing data ONLY - completely ignore dimensions from API response
                pricingOptions: updatedShipment?.pricingOptions || [],
                selectedServiceOption:
                  updatedShipment?.selectedServiceOption || null,
                pricingError: updatedShipment?.pricingError,
                calculatedInsuranceCost: calculatedInsuranceCost, // Store calculated insurance cost
                // COMPLETELY PRESERVE all dimensions from current frontend state
                // These contain the user's template selections and manual edits
                packageLength: currentShipment?.packageLength,
                packageWidth: currentShipment?.packageWidth,
                packageHeight: currentShipment?.packageHeight,
                packageWeight: currentShipment?.packageWeight,
                length: currentShipment?.length,
                width: currentShipment?.width,
                height: currentShipment?.height,
                weight: currentShipment?.weight,
                billableWeight: currentShipment?.billableWeight,
                volumetricWeight: currentShipment?.volumetricWeight,
                // Preserve all other frontend state
                selectedTemplate: currentShipment?.selectedTemplate,
                customsValue: currentShipment?.customsValue,
                hasInsurance: currentShipment?.hasInsurance,
                insuranceValue: currentShipment?.insuranceValue,
                gtip: currentShipment?.gtip,
                contents: currentShipment?.contents,
                // Don't let API response override any dimension-related fields
              };
            },
          );

          setShipmentPreview(mergedShipments);
        }

        setDimensionsConfirmed(true);

        const successCount =
          data.summary?.successful ||
          data.shipments.filter((s: any) => !s.pricingError).length;
        const failCount =
          data.summary?.failed ||
          data.shipments.filter((s: any) => s.pricingError).length;

        if (successCount > 0) {
          if (showErrorToasts) {
            // Pass translation key with interpolated values
            const title = t("bulkUpload.pricing.success.title");
            const description =
              failCount > 0
                ? t("bulkUpload.pricing.success.descriptionWithFailures", {
                    successCount,
                    failCount,
                  })
                : t("bulkUpload.pricing.success.description", {
                    count: successCount,
                  });

            toast({
              title,
              description,
            });
          }
        } else if (showErrorToasts) {
          const title = t("bulkUpload.pricing.failed.title");
          const description = t("bulkUpload.pricing.failed.description", {
            count: data.shipments.length,
          });

          toast({
            title,
            description,
            variant: "destructive",
          });
        }
      } else {
        if (showErrorToasts) {
          throw new Error(
            data.message || "Invalid response format - no shipments returned",
          );
        } else {
          setRecalculatingPrices(false);
          return;
        }
      }
    } catch (error: any) {
      if (showErrorToasts) {
        toast({
          title: t(
            "bulkUpload.pricing.failed.title",
            "Price Calculation Failed",
          ),
          description:
            error.message ||
            t(
              "bulkUpload.pricing.failed.genericError",
              "Failed to update prices. Please check package dimensions.",
            ),
          variant: "destructive",
        });
      } else {
      }
    } finally {
      setRecalculatingPrices(false);
    }
  };

  // Helper functions for Create Shipments button
  const getValidShipmentsCount = () => {
    return shipmentPreview.filter((shipment) => {
      // For Etsy uploads, only count non-skipped shipments with selected service
      if (isEtsyUpload) {
        return !shipment.skipImport && shipment.selectedServiceOption;
      }
      // For regular uploads, count shipments with selected service
      return shipment.selectedServiceOption;
    }).length;
  };

  const hasValidShipmentsForCreation = () => {
    return getValidShipmentsCount() > 0;
  };

  const handlePrintAllLabels = async () => {
    if (!uploadResult?.shipments || uploadResult.shipments.length === 0) {
      toast({
        title: "No Labels to Print",
        description: "No shipments available for printing.",
        variant: "destructive",
      });
      return;
    }

    setIsPrintingLabels(true);

    try {
      // Extract shipment IDs from the bulk upload result
      const shipmentIds = uploadResult.shipments
        .map((shipment) => shipment.id)
        .filter(Boolean);

      if (shipmentIds.length === 0) {
        throw new Error("No valid shipment IDs found");
      }

      // Call the batch labels API to get combined PDF
      const response = await fetch(
        `/api/shipments/batch-labels?ids=${shipmentIds.join(",")}`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to generate combined labels: ${response.statusText}`,
        );
      }

      // Get the PDF blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bulk-labels-${uploadResult.shipments.length}-shipments.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Labels Downloaded",
        description: `Combined PDF with ${uploadResult.shipments.length} labels downloaded successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Print Failed",
        description: error.message || "Failed to generate combined labels",
        variant: "destructive",
      });
    } finally {
      setIsPrintingLabels(false);
    }
  };

  const handleCreateShipments = () => {
    // Filter shipments that are ready for creation
    const validShipments = shipmentPreview.filter((shipment) => {
      if (isEtsyUpload) {
        return !shipment.skipImport && shipment.selectedServiceOption;
      }
      return shipment.selectedServiceOption;
    });

    if (validShipments.length === 0) {
      toast({
        title: t("bulkUpload.createShipments.error.noValidShipments"),
        description: t("bulkUpload.createShipments.error.selectServices"),
        variant: "destructive",
      });
      return;
    }

    // Validate insurance requirements for each shipment
    const invalidInsurance: Array<{ row: number; value: number }> = [];

    validShipments.forEach((shipment, index) => {
      if (shipment.hasInsurance) {
        const insuranceValue = shipment.insuranceValue || 0;
        if (insuranceValue <= 0) {
          const originalIndex = shipmentPreview.findIndex(
            (s) => s === shipment,
          );
          invalidInsurance.push({
            row: originalIndex + 1,
            value: insuranceValue,
          });
        }
      }
    });

    // Show error if any insurance amounts are invalid
    if (invalidInsurance.length > 0) {
      const errorMessage =
        invalidInsurance.length === 1
          ? `Row ${invalidInsurance[0].row}: ${t("bulkUpload.insurance.validation.amountRequired")}`
          : `${invalidInsurance.length} shipments have invalid insurance amounts`;

      const detailedErrors = invalidInsurance
        .map(
          (item) =>
            `Row ${item.row}: ${t("bulkUpload.insurance.validation.amountRequired")} (current: $${(item.value / 100).toFixed(2)})`,
        )
        .join("\n");

      toast({
        title: "Invalid Insurance Amounts",
        description: `${errorMessage}\n\n${detailedErrors}`,
        variant: "destructive",
      });
      return;
    }

    // ALL-OR-NOTHING VALIDATION: Check ALL selected shipments for missing tax IDs
    // This prevents creating ANY shipments if ANY are missing required tax IDs
    console.log(
      "🛡️ [ALL-OR-NOTHING] Starting comprehensive tax ID validation for all selected shipments...",
    );
    const missingTaxIds: Array<{
      row: number;
      country: string;
      countryCode: string;
      type: string;
    }> = [];

    // Check ALL shipments in preview that are not skipped (skipImport = false)
    shipmentPreview.forEach((shipment, index) => {
      // Skip shipments that user has deselected
      if (shipment.skipImport) {
        console.log(
          `🛡️ [ALL-OR-NOTHING] Skipping row ${index + 1} - user deselected`,
        );
        return;
      }

      const countryName = shipment.receiverCountry;
      const countryCode = convertCountryNameToCode(countryName);
      const isEUDestination = isEUCountry(countryCode);
      const isHMRCDestination = isHMRCCountry(countryCode);
      const requiresTaxId = isEUDestination || isHMRCDestination;

      console.log(
        `🛡️ [ALL-OR-NOTHING] Row ${index + 1}: Country="${countryName}" -> code="${countryCode}", EU=${isEUDestination}, HMRC=${isHMRCDestination}, RequiresTaxId=${requiresTaxId}`,
      );

      if (requiresTaxId) {
        const taxIdValue =
          taxIdValues.get(index) ||
          shipment.iossNumber ||
          shipment.hmrcNumber ||
          "";
        const cleanTaxId = taxIdValue?.trim?.() || "";

        console.log(
          `🛡️ [ALL-OR-NOTHING] Row ${index + 1}: TaxId="${cleanTaxId}" (${cleanTaxId.length > 0 ? "VALID" : "MISSING"})`,
        );

        if (
          !cleanTaxId ||
          cleanTaxId === "null" ||
          cleanTaxId === "undefined"
        ) {
          const taxIdType = isHMRCDestination
            ? countryCode === "GB"
              ? "HMRC Numarası (İngiltere)"
              : "HMRC Numarası (İsveç)"
            : "IOSS Numarası (AB)";

          missingTaxIds.push({
            row: index + 1,
            country: countryName,
            countryCode: countryCode,
            type: taxIdType,
          });

          console.log(
            `❌ [ALL-OR-NOTHING] Row ${index + 1}: MISSING ${taxIdType} for ${countryCode}`,
          );
        }
      }
    });

    // CRITICAL: If ANY selected shipments are missing required tax IDs, don't create ANY shipments
    if (missingTaxIds.length > 0) {
      console.log(
        `🚫 [ALL-OR-NOTHING] BLOCKING bulk creation - ${missingTaxIds.length} shipments missing required tax IDs`,
      );

      const errorMessage =
        missingTaxIds.length === 1
          ? `Hiçbir gönderi oluşturulamaz: Satır ${missingTaxIds[0].row} için ${missingTaxIds[0].countryCode} hedefine ${missingTaxIds[0].type} gereklidir`
          : `Hiçbir gönderi oluşturulamaz: ${missingTaxIds.length} gönderide gerekli vergi kimlik numaraları eksik`;

      const detailedErrors = missingTaxIds
        .map(
          (item) =>
            `• Satır ${item.row}: ${item.countryCode} (${item.country}) için ${item.type} gereklidir`,
        )
        .join("\n");

      const solutionText =
        "Devam etmek için:\n• Eksik satırlar için gerekli vergi kimlik numaralarını girin\n• Vergi kimlik numarası sağlayamadığınız gönderilerin seçimini kaldırın";

      // Show dialog instead of toast for better visibility and user experience
      setValidationErrorDialog({
        isOpen: true,
        title: "Vergi Kimlik Doğrulaması Gerekli",
        message: errorMessage,
        details: detailedErrors,
        solution: solutionText,
      });
      return;
    }

    console.log(
      "✅ [ALL-OR-NOTHING] All selected shipments have required tax IDs - proceeding with creation",
    );

    // Prepare shipment data for creation
    console.log("🚀 [BULK CREATE] Preparing bulk shipment data...");
    console.log(
      "🚀 [BULK CREATE] Valid shipments count:",
      validShipments.length,
    );

    const shipmentsData = validShipments.map((shipment, index) => {
      const selectedOption = shipment.selectedServiceOption;

      // Find the original index in shipmentPreview for this valid shipment
      const originalIndex = shipmentPreview.findIndex((s) => s === shipment);
      const taxIdValue =
        taxIdValues.get(originalIndex) ||
        shipment.iossNumber ||
        shipment.hmrcNumber ||
        "";
      const countryName = shipment.receiverCountry;
      const countryCode = convertCountryNameToCode(countryName);
      const isEUDestination = isEUCountry(countryCode);
      const isHMRCDestination = isHMRCCountry(countryCode);

      return {
        // Receiver information
        receiverName:
          shipment.receiverName || shipment.etsyData?.fullName || "",
        receiverAddress:
          shipment.receiverAddress || shipment.etsyData?.street1 || "",
        receiverAddress2:
          shipment.receiverAddress2 || shipment.etsyData?.street2 || "",
        receiverCity:
          shipment.receiverCity || shipment.etsyData?.shipCity || "",
        receiverState:
          shipment.receiverState || shipment.etsyData?.shipState || "",
        receiverCountry:
          shipment.receiverCountry || shipment.etsyData?.shipCountry || "",
        receiverPostalCode:
          shipment.receiverPostalCode || shipment.etsyData?.shipZipcode || "",
        receiverPhone: shipment.receiverPhone || "(Not provided)",
        receiverEmail: shipment.receiverEmail || "(Not provided)",

        // Package information
        packageWeight: shipment.billableWeight || shipment.weight || 0.5,
        packageLength: shipment.length || 15,
        packageWidth: shipment.width || 10,
        packageHeight: shipment.height || 1,
        packageContents: shipment.contents || shipment.etsyData?.title || "",
        packageValue: selectedOption?.totalPrice || 10,

        // Customs information - Include GTIP and customs value from bulk upload preview
        currency: shipment.currency || "USD",
        insurance: shipment.hasInsurance || Number(shipment.insuranceValue) > 0,
        hasInsurance:
          shipment.hasInsurance || Number(shipment.insuranceValue) > 0,
        insuranceValue: shipment.insuranceValue || 0,
        shippingTerms: shipment.shippingTerms || 'dap', // DAP, DDP, or DDU
        iossNumber: (() => {
          // Find the original index in shipmentPreview for this valid shipment
          const originalIndex = shipmentPreview.findIndex(
            (s) => s === shipment,
          );
          const taxIdValue =
            taxIdValues.get(originalIndex) || shipment.iossNumber || "";
          const countryName = shipment.receiverCountry;
          const countryCode = convertCountryNameToCode(countryName);
          const isEUDestination = isEUCountry(countryCode);

          if (isEUDestination && !isHMRCCountry(countryCode)) {
            const cleanValue = taxIdValue?.trim?.() || "";
            return cleanValue &&
              cleanValue !== "null" &&
              cleanValue !== "undefined"
              ? cleanValue
              : null;
          }
          return null;
        })(),
        hmrcNumber: (() => {
          // Find the original index in shipmentPreview for this valid shipment
          const originalIndex = shipmentPreview.findIndex(
            (s) => s === shipment,
          );
          const taxIdValue =
            taxIdValues.get(originalIndex) || shipment.hmrcNumber || "";
          const countryName = shipment.receiverCountry;
          const countryCode = convertCountryNameToCode(countryName);
          const isHMRCDestination = isHMRCCountry(countryCode);

          if (isHMRCDestination) {
            const cleanValue = taxIdValue?.trim?.() || "";
            return cleanValue &&
              cleanValue !== "null" &&
              cleanValue !== "undefined"
              ? cleanValue
              : null;
          }
          return null;
        })(),
        gtip: formatGTIPForDisplay(shipment.gtip || "9999999999"), // Use gtip from preview table, fallback to default
        customsValue: shipment.customsValue || 5000, // Use customsValue from preview table (in cents), default 5000 = $50
        customsItemCount: shipment.customsItemCount || 1, // Default to 1 item

        // Service and pricing information - keep the selectedServiceOption structure
        selectedServiceOption: {
          serviceName:
            selectedOption?.serviceName || selectedOption?.providerServiceCode,
          displayName: selectedOption?.displayName || "MoogShip",
          serviceCode:
            selectedOption?.serviceName || selectedOption?.providerServiceCode,
          serviceLevel: selectedOption?.serviceType || "STANDARD",
          totalPrice: selectedOption?.totalPrice || 0,
          basePrice:
            selectedOption?.cargoPrice || selectedOption?.basePrice || 0,
          fuelCharge:
            selectedOption?.fuelCost || selectedOption?.fuelCharge || 0,
          taxes: selectedOption?.taxes || 0,
          originalTotalPrice:
            selectedOption?.originalTotalPrice ||
            selectedOption?.totalPrice ||
            0,
          carrierName: selectedOption?.displayName || "MoogShip",
          // Determine shipping provider based on service name/code
          shippingProvider: (() => {
            const serviceName =
              selectedOption?.serviceName ||
              selectedOption?.providerServiceCode ||
              "";
            const displayName = selectedOption?.displayName || "";
            const serviceCode = selectedOption?.serviceCode || "";

            // AFS services: check for afs- prefix, EcoAFS specifically, or GLS in names
            if (
              serviceName.toLowerCase().includes("afs-") ||
              serviceName.toLowerCase() === "ecoafs" ||
              serviceCode.toLowerCase() === "ecoafs" ||
              displayName.toLowerCase().includes("gls eco")
            ) {
              return "afs";
            }
            if (
              serviceName.toLowerCase().includes("aramex") ||
              displayName.toLowerCase().includes("aramex") ||
              serviceCode.toLowerCase().includes("aramex")
            ) {
              return "aramex";
            }

            // Default provider for other services
            return "moogship";
          })(),
          estimatedDeliveryDays: selectedOption?.estimatedDeliveryDays || 7,
        },

        // Order reference
        orderReference:
          shipment.orderNumber || shipment.etsyData?.orderID || "",
        description:
          shipment.description ||
          `Order #${shipment.orderNumber || shipment.etsyData?.orderID || "Bulk Import"}`,

        // Additional metadata
        isEtsyOrder: isEtsyUpload,
        orderDate: shipment.orderDate || shipment.etsyData?.saleDate || "",
        sku: shipment.sku || shipment.etsyData?.sku || "",
      };
    });

    // Debug: Log final shipment data being sent to API

    shipmentsData.forEach((shipmentData, index) => {});

    // Call the bulk create mutation
    bulkCreateMutation.mutate(shipmentsData);
  };

  return (
    <div>
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
                {String(t("bulkUpload.backButton"))}
              </Button>
              <h1 className="text-2xl font-semibold text-gray-900">
                {String(t("bulkUpload.title"))}
              </h1>
            </div>

            {/* Etsy Import Guide Component */}
            <EtsyImportGuide />

            {/* User Package Templates Display */}
            {userTemplates.length > 0 && (
              <div className="mt-6 bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  📦 Your Saved Package Templates
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {userTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-900">
                          ⭐ {template.name}
                        </span>
                      </div>
                      <div className="text-xs text-blue-700">
                        <div>
                          Dimensions: {template.dimensions.length} ×{" "}
                          {template.dimensions.width} ×{" "}
                          {template.dimensions.height} cm
                        </div>
                        <div className="mt-1 text-blue-600">
                          Created:{" "}
                          {new Date(template.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-gray-600">
                  💡 Use the 📦 dropdown in the dimensions column during bulk
                  upload to apply these templates
                </div>
              </div>
            )}

            {/* File Upload Section */}
            <div className="mt-6 bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                {String(t("bulkUpload.fileUpload.title"))}
              </h2>

              {/* Upload File UI */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary cursor-pointer transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <FileUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    {String(t("bulkUpload.fileUpload.dragAndDrop"))}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {String(t("bulkUpload.fileUpload.supportedFormats"))}
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
                      <p className="text-sm font-medium text-blue-900">
                        {file.name}
                      </p>
                      <p className="text-xs text-blue-700">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
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
                      {String(t("bulkUpload.fileUpload.validate"))}
                    </Button>
                    <Button
                      onClick={() => setFile(null)}
                      variant="ghost"
                      size="sm"
                    >
                      {String(t("bulkUpload.fileUpload.clear"))}
                    </Button>
                  </div>
                </div>
              )}

              {/* Validation Progress */}
              {validateFileMutation.isPending && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {String(t("bulkUpload.validation.inProgress"))}
                  </p>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary animate-pulse rounded-full"
                      style={{ width: "100%" }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Shipment Preview */}
              {shipmentPreview.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {String(t("bulkUpload.preview.title"))}
                    </h3>
                    {isEtsyUpload && (
                      <Button
                        onClick={() => {
                          recalculatePrices();
                        }}
                        disabled={recalculatingPrices}
                        variant="outline"
                        size="sm"
                      >
                        {recalculatingPrices && (
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {String(t("bulkUpload.preview.recalculatePrices"))}
                      </Button>
                    )}
                  </div>

                  {/* Bulk Shipment Summary */}
                  <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6 shadow-md">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-800 flex items-center">
                        <PackageIcon className="h-5 w-5 mr-2 text-blue-600" />
                        {t("bulkUpload.summary.bulkShipmentSummary")}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
                          {shipmentPreview.length}{" "}
                          {t("bulkUpload.summary.shipmentsCount")}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Total Shipments */}
                      <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-white/50 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                              {t("bulkUpload.summary.totalShipments")}
                            </p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                              {shipmentPreview.length}
                            </p>
                          </div>
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <PackageIcon className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                      </div>

                      {/* Total Weight */}
                      <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-white/50 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                              {t("bulkUpload.summary.totalWeight")}
                            </p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                              {shipmentPreview
                                .reduce(
                                  (sum, shipment) =>
                                    sum +
                                    (shipment.weight ||
                                      shipment.packageWeight ||
                                      0),
                                  0,
                                )
                                .toFixed(1)}{" "}
                              kg
                            </p>
                          </div>
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-green-600 font-semibold text-sm">
                              KG
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Total Customs Value */}
                      <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-white/50 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                              {t("bulkUpload.summary.totalCustomsValue")}
                            </p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                              $
                              {shipmentPreview
                                .reduce(
                                  (sum, shipment) =>
                                    sum + (shipment.customsValue || 0) / 100,
                                  0,
                                )
                                .toFixed(2)}
                            </p>
                          </div>
                          <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                            <DollarSignIcon className="h-5 w-5 text-yellow-600" />
                          </div>
                        </div>
                      </div>

                      {/* Estimated Total Shipping */}
                      <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-white/50 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                              {t("bulkUpload.summary.estShippingCost")}
                            </p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                              $
                              {shipmentPreview
                                .reduce((sum, shipment) => {
                                  const totalPrice =
                                    shipment.totalPriceWithoutInsurance ||
                                    shipment.totalPrice ||
                                    0;
                                  return sum + totalPrice / 100;
                                }, 0)
                                .toFixed(2)}
                            </p>
                          </div>
                          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-purple-600 font-semibold text-xs">
                              $$$
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Countries Summary */}
                    <div className="mt-4 pt-4 border-t border-blue-200/50">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                        {t("bulkUpload.summary.destinationCountries")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(
                          new Set(
                            shipmentPreview
                              .map((s) => s.receiverCountry)
                              .filter(Boolean),
                          ),
                        ).map((country) => (
                          <span
                            key={country}
                            className="text-xs bg-white/60 border border-blue-200/50 px-2 py-1 rounded-md text-gray-700 font-medium"
                          >
                            {country}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bulk Operations Toolbar */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-lg font-bold text-gray-900">
                            {t("bulkUpload.operations.title")}
                          </h4>
                          <div className="h-6 w-px bg-gray-300"></div>
                          <span className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                            {t("bulkUpload.operations.selectedCount", {
                              count: selectedCount,
                              total: shipmentPreview.length,
                            })}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            // Recalculate prices directly for user-triggered action
                            recalculatePricesForShipments(shipmentPreview);
                          }}
                          disabled={recalculatingPrices}
                          className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 font-medium shadow-md transition-all duration-200"
                        >
                          {recalculatingPrices ? (
                            <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <RotateCcwIcon className="h-4 w-4 mr-2" />
                          )}
                          {t("bulkUpload.operations.recalcAllPrices")}
                        </Button>
                      </div>
                    </div>

                    {/* Operations Grid */}
                    <div className="p-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
                        {/* Ultra compact single row */}
                        {/* DDP Operations */}
                        <div className="bg-purple-50 rounded p-2 border border-purple-200">
                          <div className="flex items-center mb-1">
                            <DollarSignIcon className="h-3 w-3 text-purple-600 mr-1" />
                            <span className="text-xs font-medium text-gray-900">
                              DDP Calculation
                            </span>
                          </div>
                        </div>
                        {/* Insurance Operations */}
                        <div className="bg-green-50 rounded p-2 border border-green-200">
                          <div className="flex items-center mb-1">
                            <ShieldCheckIcon className="h-3 w-3 text-green-600 mr-1" />
                            <span className="text-xs font-medium text-gray-900">
                              {t("bulkUpload.operations.insurance.title")}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <Button
                              size="sm"
                              onClick={() => {
                                const selectedShipments =
                                  shipmentPreview.filter(
                                    (shipment) => !shipment.skipImport,
                                  );

                                // Create new insurance input values map populated with order values
                                const newInsuranceInputValues = new Map();

                                const newShipments = shipmentPreview.map(
                                  (shipment, index) => {
                                    if (shipment.skipImport) {
                                      return shipment;
                                    }

                                    // Use customsValue (order value) as insurance value
                                    const orderValueInCents =
                                      shipment.customsValue || 0;
                                    const orderValueInDollars = (
                                      orderValueInCents / 100
                                    ).toFixed(2);

                                    // Populate the insurance input field with order value
                                    newInsuranceInputValues.set(
                                      index,
                                      orderValueInDollars,
                                    );

                                    return {
                                      ...shipment,
                                      hasInsurance: true,
                                      insuranceValue: orderValueInCents,
                                    };
                                  },
                                );

                                setShipmentPreview(newShipments);
                                setInsuranceInputValues(
                                  newInsuranceInputValues,
                                );

                                // Calculate insurance costs for all enabled shipments
                                newShipments.forEach((shipment, index) => {
                                  if (
                                    !shipment.skipImport &&
                                    shipment.hasInsurance
                                  ) {
                                    const orderValueInCents =
                                      shipment.customsValue || 0;
                                    calculateInsuranceCostForShipment(
                                      orderValueInCents,
                                      index,
                                    );
                                  }
                                });

                                toast({
                                  title: t(
                                    "bulkUpload.operations.insurance.applied",
                                  ),
                                  description: t(
                                    "bulkUpload.operations.insurance.enabledFor",
                                    { count: selectedShipments.length },
                                  ),
                                });
                              }}
                              className="w-full h-5 text-xs bg-green-600 hover:bg-green-700 text-white"
                            >
                              {t("bulkUpload.operations.insurance.enable")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const selectedShipments =
                                  shipmentPreview.filter(
                                    (shipment) => !shipment.skipImport,
                                  );
                                const newShipments = shipmentPreview.map(
                                  (shipment) =>
                                    shipment.skipImport
                                      ? shipment
                                      : {
                                          ...shipment,
                                          hasInsurance: false,
                                          insuranceValue: 0,
                                        },
                                );
                                setShipmentPreview(newShipments);
                                setInsuranceInputValues(new Map());
                                toast({
                                  title: t(
                                    "bulkUpload.operations.insurance.cleared",
                                  ),
                                  description: t(
                                    "bulkUpload.operations.insurance.removedFrom",
                                    { count: selectedShipments.length },
                                  ),
                                });
                              }}
                              className="w-full h-5 text-xs"
                            >
                              {t("bulkUpload.operations.insurance.clear")}
                            </Button>
                          </div>
                        </div>

                        {/* Customs Value Operations */}
                        <div className="bg-blue-50 rounded p-2 border border-blue-200">
                          <div className="flex items-center mb-1">
                            <DollarSignIcon className="h-3 w-3 text-blue-600 mr-1" />
                            <span className="text-xs font-medium text-gray-900">
                              {t("bulkUpload.operations.customs.title")}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <Input
                              type="text"
                              placeholder={t(
                                "bulkUpload.operations.customs.placeholder",
                              )}
                              className="text-xs h-5 bg-white"
                              id="bulk-customs-value"
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                const input = document.getElementById(
                                  "bulk-customs-value",
                                ) as HTMLInputElement;
                                const value =
                                  parseFloat(input.value.replace("$", "")) || 0;
                                if (value > 0) {
                                  const selectedShipments =
                                    shipmentPreview.filter(
                                      (shipment) => !shipment.skipImport,
                                    );
                                  const newShipments = shipmentPreview.map(
                                    (shipment) =>
                                      shipment.skipImport
                                        ? shipment
                                        : {
                                            ...shipment,
                                            customsValue: Math.round(
                                              value * 100,
                                            ),
                                          },
                                  );
                                  setShipmentPreview(newShipments);
                                  setCustomsInputValues(new Map());
                                  toast({
                                    title: t(
                                      "bulkUpload.operations.customs.applied",
                                    ),
                                    description: t(
                                      "bulkUpload.operations.customs.setTo",
                                      {
                                        count: selectedShipments.length,
                                        value: value.toFixed(2),
                                      },
                                    ),
                                  });
                                  input.value = "";
                                }
                              }}
                              className="w-full h-5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              {t("bulkUpload.operations.customs.apply")}
                            </Button>
                          </div>
                        </div>

                        {/* GTIP Operations */}
                        <div className="bg-purple-50 rounded p-2 border border-purple-200">
                          <div className="flex items-center mb-1">
                            <HashIcon className="h-3 w-3 text-purple-600 mr-1" />
                            <span className="text-xs font-medium text-gray-900">
                              {t("bulkUpload.operations.gtip.title")}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <Input
                              type="text"
                              placeholder={t(
                                "bulkUpload.operations.gtip.placeholder",
                              )}
                              className="text-xs h-5 bg-white"
                              id="bulk-gtip-code"
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                const input = document.getElementById(
                                  "bulk-gtip-code",
                                ) as HTMLInputElement;
                                const gtipValue = input.value.trim();
                                if (gtipValue) {
                                  const selectedShipments =
                                    shipmentPreview.filter(
                                      (shipment) => !shipment.skipImport,
                                    );
                                  const newShipments = shipmentPreview.map(
                                    (shipment) =>
                                      shipment.skipImport
                                        ? shipment
                                        : {
                                            ...shipment,
                                            gtip: gtipValue,
                                          },
                                  );
                                  setShipmentPreview(newShipments);
                                  setGtipValidations(new Map());
                                  toast({
                                    title: t(
                                      "bulkUpload.operations.gtip.applied",
                                    ),
                                    description: t(
                                      "bulkUpload.operations.gtip.setTo",
                                      {
                                        count: selectedShipments.length,
                                        value: gtipValue,
                                      },
                                    ),
                                  });
                                  input.value = "";
                                }
                              }}
                              className="w-full h-5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              {t("bulkUpload.operations.gtip.apply")}
                            </Button>
                          </div>
                        </div>

                        {/* Product Description Operations */}
                        <div className="bg-orange-50 rounded p-2 border border-orange-200">
                          <div className="flex items-center mb-1">
                            <TagIcon className="h-3 w-3 text-orange-600 mr-1" />
                            <span className="text-xs font-medium text-gray-900">
                              {t("bulkUpload.operations.product.title")}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <Input
                              type="text"
                              placeholder={t(
                                "bulkUpload.operations.product.placeholder",
                              )}
                              className="text-xs h-5 bg-white"
                              id="bulk-product-description"
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                const input = document.getElementById(
                                  "bulk-product-description",
                                ) as HTMLInputElement;
                                const description = input.value.trim();
                                if (description) {
                                  const selectedShipments =
                                    shipmentPreview.filter(
                                      (shipment) => !shipment.skipImport,
                                    );
                                  const newShipments = shipmentPreview.map(
                                    (shipment) =>
                                      shipment.skipImport
                                        ? shipment
                                        : {
                                            ...shipment,
                                            contents: description,
                                          },
                                  );
                                  setShipmentPreview(newShipments);
                                  toast({
                                    title: t(
                                      "bulkUpload.operations.product.applied",
                                    ),
                                    description: t(
                                      "bulkUpload.operations.product.setTo",
                                      {
                                        count: selectedShipments.length,
                                        description,
                                      },
                                    ),
                                  });
                                  input.value = "";
                                }
                              }}
                              className="w-full h-5 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                            >
                              {t("bulkUpload.operations.product.apply")}
                            </Button>
                          </div>
                        </div>

                        {/* Package Operations - Enhanced with dropdown and edit */}
                        <div className="bg-indigo-50 rounded p-2 border border-indigo-200">
                          <div className="flex items-center mb-1">
                            <PackageIcon className="h-3 w-3 text-indigo-600 mr-1" />
                            <span className="text-xs font-medium text-gray-900">
                              {t("bulkUpload.operations.package.title")}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex gap-1">
                              <div className="flex-1 min-w-0">
                                <div
                                  className={
                                    selectedCount === 0
                                      ? "opacity-50 pointer-events-none"
                                      : ""
                                  }
                                >
                                  <PackageTemplateSelector
                                    key={`bulk-toolbar-template-${selectedCount}-${Date.now()}`}
                                    userId={user?.id || 0}
                                    onTemplateSelect={(template) => {
                                      if (selectedCount === 0) return;

                                      const newShipments = shipmentPreview.map(
                                        (shipment, index) => {
                                          if (!shipment.skipImport) {
                                            return {
                                              ...shipment,
                                              packageLength: template.length,
                                              packageWidth: template.width,
                                              packageHeight: template.height,
                                              packageWeight: template.weight,
                                              length: template.length,
                                              width: template.width,
                                              height: template.height,
                                              weight: template.weight,
                                              selectedTemplate: template.name,
                                              pricingOptions: [],
                                              selectedServiceOption: null,
                                            };
                                          }
                                          return shipment;
                                        },
                                      );
                                      setShipmentPreview(newShipments);

                                      toast({
                                        title: t(
                                          "bulkUpload.operations.package.templateApplied",
                                        ),
                                        description: t(
                                          "bulkUpload.operations.package.appliedTemplate",
                                          {
                                            count: selectedCount,
                                            templateName: template.name,
                                          },
                                        ),
                                      });

                                      // Direct recalculation without setTimeout to prevent loops
                                      const selectedShipmentsArray =
                                        newShipments.filter(
                                          (shipment) => !shipment.skipImport,
                                        );
                                      if (!recalculatingPrices && selectedShipmentsArray.length > 0) {
                                        recalculatePricesForShipments(
                                          selectedShipmentsArray,
                                        );
                                      }
                                    }}
                                    showSaveCurrentDimensions={false}
                                    currentDimensions={{
                                      length: 15,
                                      width: 10,
                                      height: 1,
                                      weight: 0.5,
                                    }}
                                  />
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setBulkEditOpen(true)}
                                className="h-5 px-2 text-xs"
                                disabled={selectedCount === 0}
                              >
                                <EditIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-x border-b border-gray-200 rounded-b-lg overflow-hidden shadow-sm">
                    <div
                      className="overflow-auto max-h-[70vh] md:max-h-[75vh] lg:max-h-[80vh]"
                    >
                      <Table className="table-fixed w-full">
                        <colgroup>
                          <col className="w-12" />  {/* Checkbox */}
                          <col className="w-32 md:w-36 lg:w-40" />  {/* Receiver */}
                          <col className="w-40 md:w-44 lg:w-48" />  {/* Shipment Details */}
                          <col className="w-24 md:w-28 lg:w-32" />  {/* Customs Value */}
                          <col className="w-28 md:w-32 lg:w-36" />  {/* Package Details */}
                          <col className="w-40 md:w-44 lg:w-48" />  {/* Price & Insurance */}
                          <col className="w-32 md:w-36 lg:w-40" />  {/* DDP */}
                        </colgroup>
                        <TableHeader className="sticky top-0 z-20 bg-gray-50 border-b-2 border-gray-300 shadow-sm">
                          <TableRow className="hover:bg-transparent border-none">
                            {/* Selection checkbox column */}
                            <TableHead className="w-12 min-w-[48px] sticky top-0 bg-gray-50 z-30 border-b border-gray-300 shadow-sm">
                              <div className="flex items-center justify-center">
                                <Checkbox
                                  checked={isAllSelected}
                                  onCheckedChange={toggleSelectAll}
                                  className={`h-4 w-4 ${isIndeterminate ? "data-[state=indeterminate]:bg-primary" : ""}`}
                                />
                              </div>
                            </TableHead>

                            <TableHead className="w-32 min-w-[120px] md:w-36 lg:w-40 sticky top-0 bg-gray-50 z-30 border-b border-gray-300 shadow-sm">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-xs font-medium text-gray-900 p-1 cursor-help">
                                      {t("bulkUpload.table.headers.receiver")}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {t("bulkUpload.table.tooltips.receiver")}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="w-40 min-w-[160px] md:w-44 lg:w-48 sticky top-0 bg-gray-50 z-30 border-b border-gray-300 shadow-sm">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-xs font-medium text-gray-900 p-1 cursor-help">
                                      {t(
                                        "bulkUpload.table.headers.shipmentDetails",
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {t(
                                        "bulkUpload.table.tooltips.shipmentDetails",
                                      )}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="w-24 min-w-[90px] md:w-28 lg:w-32 sticky top-0 bg-gray-50 z-30 border-b border-gray-300 shadow-sm">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-xs font-medium text-gray-900 p-1 cursor-help">
                                      {t(
                                        "bulkUpload.table.headers.customsValue",
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {t(
                                        "bulkUpload.table.tooltips.customsValue",
                                      )}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="w-28 min-w-[110px] md:w-32 lg:w-36 sticky top-0 bg-gray-50 z-30 border-b border-gray-300 shadow-sm">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-xs font-medium text-gray-900 p-1 cursor-help">
                                      {t(
                                        "bulkUpload.table.headers.packageDetails",
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {t(
                                        "bulkUpload.table.tooltips.packageDetails",
                                      )}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="w-40 min-w-[160px] md:w-44 lg:w-48 text-right sticky top-0 bg-gray-50 z-30 border-b border-gray-300 shadow-sm">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-xs font-medium text-gray-900 p-1 cursor-help">
                                      {t(
                                        "bulkUpload.table.headers.priceInsurance",
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {t(
                                        "bulkUpload.table.tooltips.priceInsurance",
                                      )}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="w-32 min-w-[120px] md:w-36 lg:w-40 text-center sticky top-0 bg-gray-50 z-30 border-b border-gray-300 shadow-sm">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-xs font-medium text-gray-900 p-1 cursor-help flex items-center justify-center">
                                      <DollarSignIcon className="h-3 w-3 mr-1" />
                                      DDP
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      Delivered Duty Paid - Customs duties and taxes calculated automatically when HS code is entered
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {shipmentPreview.map((shipment, index) => [
                              <TableRow key={`shipment-${index}`} className="border-b hover:bg-blue-50 transition-colors duration-150 group min-h-[48px]">
                                {/* Selection checkbox and expand icon */}
                                <TableCell
                                  className="py-2 px-3"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center justify-center space-x-2">
                                    <Checkbox
                                      checked={!shipment.skipImport}
                                      onCheckedChange={() =>
                                        toggleShipmentSelection(index)
                                      }
                                      className="h-4 w-4"
                                    />
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleRowExpansion(index);
                                            }}
                                            className="h-7 w-7 p-0 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300"
                                          >
                                            {expandedRows.has(index) ? (
                                              <ChevronDownIcon className="h-4 w-4" />
                                            ) : (
                                              <ChevronRightIcon className="h-4 w-4" />
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>
                                            {expandedRows.has(index)
                                              ? "Collapse pricing & shipping terms"
                                              : "Expand for pricing options & DAP/DDP selection"}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </TableCell>

                                {/* Receiver Column */}
                                <TableCell className="py-2 px-3 border-r border-gray-200">
                                  <div className="space-y-0.5">
                                    {/* Order Number with Copy and Etsy Link */}
                                    {shipment.orderNumber && (
                                      <div className="flex items-center space-x-1">
                                        {isEtsyUpload ? (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <a
                                                  href={`https://www.etsy.com/your/orders/sold/completed?ref=seller-platform-mcnav&completed_date=all&order_id=${shipment.etsyData?.orderID || shipment.orderNumber}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                >
                                                  #
                                                  {shipment.etsyData?.orderID ||
                                                    shipment.orderNumber}
                                                </a>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>
                                                  Click to view order on Etsy
                                                </p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        ) : (
                                          <span className="text-xs text-gray-500">
                                            #{shipment.orderNumber}
                                          </span>
                                        )}
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const orderNum = isEtsyUpload
                                                    ? shipment.etsyData
                                                        ?.orderID ||
                                                      shipment.orderNumber
                                                    : shipment.orderNumber;
                                                  navigator.clipboard.writeText(
                                                    orderNum || "",
                                                  );
                                                  toast({
                                                    description:
                                                      "Order number copied to clipboard",
                                                  });
                                                }}
                                                className="h-4 w-4 p-0 hover:bg-gray-100"
                                              >
                                                <CopyIcon className="h-3 w-3 text-gray-400" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Copy order number</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                    )}

                                    {/* Receiver Name */}
                                    <div className="text-sm font-medium text-gray-900">
                                      {isEtsyUpload
                                        ? shipment.etsyData?.fullName ||
                                          shipment.receiverName ||
                                          "-"
                                        : shipment.receiverName}
                                    </div>

                                    {/* City, State, Country with Flag */}
                                    <div className="flex items-center space-x-1">
                                      <div className="text-xs text-gray-600">
                                        {isEtsyUpload
                                          ? `${shipment.etsyData?.shipCity || shipment.receiverCity || "-"}, ${shipment.etsyData?.shipState || shipment.receiverState || ""} ${shipment.etsyData?.shipCountry || shipment.receiverCountry || "-"}`
                                          : `${shipment.receiverCity}, ${shipment.receiverState || ""} ${shipment.receiverCountry}`}
                                      </div>
                                      <div className="text-lg">
                                        {(() => {
                                          const country = isEtsyUpload
                                            ? shipment.etsyData?.shipCountry ||
                                              shipment.receiverCountry
                                            : shipment.receiverCountry;
                                          const countryCode =
                                            convertCountryNameToCode(country);
                                          if (!countryCode) return "🌍";

                                          // Convert country code to flag emoji
                                          const flag = countryCode
                                            .toUpperCase()
                                            .replace(/./g, (char) =>
                                              String.fromCodePoint(
                                                127397 + char.charCodeAt(0),
                                              ),
                                            );
                                          return flag;
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>

                                {/* Shipment Details Column */}
                                <TableCell className="py-2 px-3 border-r border-gray-200">
                                  <div className="space-y-1">
                                    <div>
                                      <div className="text-xs text-gray-500 mb-0.5">
                                        {t(
                                          "bulkUpload.table.labels.productDescription",
                                        )}
                                      </div>
                                      <Input
                                        type="text"
                                        value={
                                          shipment.contents ||
                                          shipment.etsyData?.title ||
                                          ""
                                        }
                                        onChange={(e) => {
                                          const newShipments = [
                                            ...shipmentPreview,
                                          ];
                                          newShipments[index] = {
                                            ...shipment,
                                            contents: e.target.value,
                                          };
                                          setShipmentPreview(newShipments);
                                        }}
                                        className="text-xs h-7 border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 transition-all"
                                        placeholder="Enter product..."
                                      />
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500 mb-0.5">
                                        {t("bulkUpload.table.labels.gtipCode")}
                                      </div>
                                      {(() => {
                                        const currentValidation =
                                          gtipValidations.get(index);
                                        const hasValidation =
                                          currentValidation !== undefined;
                                        const isValid =
                                          currentValidation?.isValid || false;
                                        const baseClasses =
                                          "text-xs h-7 transition-colors border-gray-200 focus:ring-1 focus:ring-blue-200";
                                        const validationClasses = hasValidation
                                          ? isValid
                                            ? "border-green-300 focus:border-green-400 focus:ring-green-200"
                                            : "border-red-300 focus:border-red-400 focus:ring-red-200"
                                          : "focus:border-blue-400";

                                        return (
                                          <div className="flex items-center space-x-1">
                                            <Input
                                              type="text"
                                              inputMode="numeric"
                                              value={(() => {
                                                const rawValue = shipment.gtip || "";
                                                // Format as ####.##.##.##
                                                const digitsOnly = rawValue.replace(/\D/g, '');
                                                if (digitsOnly.length === 0) return "";
                                                if (digitsOnly.length <= 4) return digitsOnly;
                                                if (digitsOnly.length <= 6) return `${digitsOnly.slice(0, 4)}.${digitsOnly.slice(4)}`;
                                                if (digitsOnly.length <= 8) return `${digitsOnly.slice(0, 4)}.${digitsOnly.slice(4, 6)}.${digitsOnly.slice(6)}`;
                                                return `${digitsOnly.slice(0, 4)}.${digitsOnly.slice(4, 6)}.${digitsOnly.slice(6, 8)}.${digitsOnly.slice(8, 10)}`;
                                              })()}
                                              onChange={(e) => {
                                                const value = e.target.value;
                                                // Remove all non-digits
                                                const digitsOnly = value.replace(/\D/g, '');
                                                // Limit to 10 digits maximum
                                                const limitedDigits = digitsOnly.slice(0, 10);
                                                
                                                const validation = handleGTIPValidation(index, limitedDigits);

                                                const newShipments = [...shipmentPreview];
                                                newShipments[index] = {
                                                  ...shipment,
                                                  gtip: validation.cleaned,
                                                };
                                                setShipmentPreview(newShipments);

                                                // Handle US DDP logic separately to avoid cascading updates
                                                if (validation.isValid && validation.cleaned) {
                                                  handleUSDDPLogic(index, validation, shipment);
                                                }
                                              }}
                                              className={`${baseClasses} ${validationClasses} flex-1`}
                                              placeholder="1234.56.78.90"
                                            />
                                            {hasValidation && (
                                              <div className="flex-shrink-0">
                                                {isValid ? (
                                                  <CheckIcon className="h-3 w-3 text-green-500" />
                                                ) : (
                                                  <AlertCircleIcon className="h-3 w-3 text-red-500" />
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </TableCell>

                                {/* Customs Value Column */}
                                <TableCell className="py-2 px-3 border-r border-gray-200">
                                  <div className="space-y-1">
                                    {/* Customs Value Input */}
                                    <div>
                                      <div className="text-xs text-gray-500 mb-0.5">
                                        {t(
                                          "bulkUpload.table.labels.customsValue",
                                        )}
                                      </div>
                                      {(() => {
                                        const displayValue =
                                          customsInputValues.get(index) ||
                                          (shipment.customsValue
                                            ? (
                                                shipment.customsValue / 100
                                              ).toFixed(2)
                                            : "");

                                        return (
                                          <Input
                                            type="text"
                                            pattern="^\d*\.?\d{0,2}$"
                                            value={displayValue}
                                            onChange={(e) => {
                                              const value = e.target.value;
                                              if (
                                                value === "" ||
                                                /^\d*\.?\d{0,2}$/.test(value)
                                              ) {
                                                const newCustomsInputValues =
                                                  new Map(customsInputValues);
                                                newCustomsInputValues.set(
                                                  index,
                                                  value,
                                                );
                                                setCustomsInputValues(
                                                  newCustomsInputValues,
                                                );
                                              }
                                            }}
                                            onBlur={async () => {
                                              const currentValue =
                                                customsInputValues.get(index) ||
                                                "";
                                              if (currentValue) {
                                                const centsValue = Math.round(
                                                  parseFloat(currentValue) *
                                                    100,
                                                );
                                                
                                                // If insurance is enabled, recalculate insurance based on new customs value
                                                let updatedShipment = {
                                                  ...shipment,
                                                  customsValue: centsValue,
                                                };
                                                
                                                if (shipment.insuranceRequired) {
                                                  try {
                                                    // Fetch insurance cost based on new customs value
                                                    const insuranceResponse = await fetch(`/api/insurance/calculate?insuranceValue=${centsValue}`);
                                                    if (insuranceResponse.ok) {
                                                      const insuranceData = await insuranceResponse.json();
                                                      const insuranceCost = insuranceData.cost || 0;
                                                      
                                                      // Update shipment with new insurance value
                                                      updatedShipment = {
                                                        ...updatedShipment,
                                                        insuranceValue: centsValue,
                                                        insuranceCost: insuranceCost,
                                                      };
                                                      
                                                      // Also update the pricing options if they exist
                                                      if (shipment.pricingOptions && shipment.pricingOptions.length > 0) {
                                                        updatedShipment.pricingOptions = shipment.pricingOptions.map((opt: any) => ({
                                                          ...opt,
                                                          // Recalculate total price with new insurance
                                                          price: (opt.basePrice || opt.shippingPrice || opt.price - (opt.insuranceAmount || 0)) + insuranceCost,
                                                          insuranceAmount: insuranceCost,
                                                          hasInsurance: true,
                                                        }));
                                                        
                                                        // Update selected service if one exists
                                                        if (shipment.selectedService) {
                                                          const updatedSelected = updatedShipment.pricingOptions.find((opt: any) => 
                                                            opt.id === shipment.selectedService.id || opt.displayName === shipment.selectedService.displayName
                                                          );
                                                          if (updatedSelected) {
                                                            updatedShipment.selectedService = updatedSelected;
                                                          }
                                                        }
                                                      }
                                                      
                                                      console.log('[BulkUpload] Insurance recalculated for customs value change:', {
                                                        index,
                                                        customsValue: centsValue,
                                                        insuranceCost: insuranceCost
                                                      });
                                                    } else {
                                                      // Fallback to 1% calculation if API fails
                                                      const fallbackInsurance = Math.max(Math.round(centsValue * 0.01), 100);
                                                      updatedShipment = {
                                                        ...updatedShipment,
                                                        insuranceValue: centsValue,
                                                        insuranceCost: fallbackInsurance,
                                                      };
                                                    }
                                                  } catch (error) {
                                                    console.error('[BulkUpload] Insurance calculation error:', error);
                                                    // Fallback to 1% calculation
                                                    const fallbackInsurance = Math.max(Math.round(centsValue * 0.01), 100);
                                                    updatedShipment = {
                                                      ...updatedShipment,
                                                      insuranceValue: centsValue,
                                                      insuranceCost: fallbackInsurance,
                                                    };
                                                  }
                                                }
                                                
                                                const newShipments = [
                                                  ...shipmentPreview,
                                                ];
                                                newShipments[index] = updatedShipment;
                                                setShipmentPreview(
                                                  newShipments,
                                                );
                                              }
                                            }}
                                            className="text-xs h-7 border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 transition-all"
                                            placeholder="50.00"
                                          />
                                        );
                                      })()}
                                    </div>

                                    {/* Tax ID Input */}
                                    <div>
                                      <div className="text-xs text-gray-500 mb-0.5">
                                        {t("bulkUpload.table.labels.taxId")}
                                      </div>
                                      {(() => {
                                        const countryCode =
                                          convertCountryNameToCode(
                                            shipment.receiverCountry,
                                          );
                                        const isEUDestination =
                                          isEUCountry(countryCode);
                                        const isHMRCDestination =
                                          isHMRCCountry(countryCode);
                                        const requiresTaxId =
                                          isEUDestination || isHMRCDestination;

                                        if (!requiresTaxId) {
                                          return (
                                            <div className="flex items-center justify-center h-7 bg-gray-50 rounded text-xs text-gray-400 border border-gray-100">
                                              N/A
                                            </div>
                                          );
                                        }

                                        const placeholder = isHMRCDestination
                                          ? countryCode === "GB"
                                            ? "HMRC"
                                            : "HMRC"
                                          : "IOSS";

                                        const currentValue =
                                          taxIdValues.get(index) ||
                                          shipment.iossNumber ||
                                          "";
                                        const hasValue =
                                          currentValue.trim().length > 0;

                                        return (
                                          <div className="relative">
                                            <Input
                                              type="text"
                                              placeholder={placeholder}
                                              value={currentValue}
                                              onChange={(e) => {
                                                const newTaxIdValues = new Map(
                                                  taxIdValues,
                                                );
                                                newTaxIdValues.set(
                                                  index,
                                                  e.target.value,
                                                );
                                                setTaxIdValues(newTaxIdValues);

                                                const newShipments = [
                                                  ...shipmentPreview,
                                                ];
                                                newShipments[index] = {
                                                  ...shipment,
                                                  iossNumber: e.target.value,
                                                };
                                                setShipmentPreview(
                                                  newShipments,
                                                );
                                              }}
                                              className={`h-7 text-xs pr-7 transition-all ${
                                                requiresTaxId && !hasValue
                                                  ? "border-orange-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                                                  : hasValue
                                                    ? "border-green-300 focus:border-green-500 focus:ring-1 focus:ring-green-200"
                                                    : "border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                                              }`}
                                            />
                                            {requiresTaxId && (
                                              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                                {hasValue ? (
                                                  <CheckIcon className="h-3 w-3 text-green-500" />
                                                ) : (
                                                  <AlertCircleIcon className="h-3 w-3 text-orange-500" />
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </TableCell>


                                {/* Package Details Column */}
                                <TableCell className="py-2 px-3 border-r border-gray-200">
                                  <div className="space-y-1">
                                    {/* Current Dimensions Display with Edit Icon */}
                                    <div className="flex items-center space-x-2">
                                      <div className="text-xs text-gray-600 flex-1">
                                        {/* Show selected template name if available */}
                                        {shipment.selectedTemplate && (
                                          <div className="font-medium text-blue-600 mb-1">
                                            📦 {shipment.selectedTemplate}
                                          </div>
                                        )}
                                        <div className="font-medium">
                                          {shipment.packageLength ||
                                            shipment.length ||
                                            15}
                                          ×
                                          {shipment.packageWidth ||
                                            shipment.width ||
                                            10}
                                          ×
                                          {shipment.packageHeight ||
                                            shipment.height ||
                                            1}
                                          cm
                                        </div>
                                        <div className="text-gray-500">
                                          {shipment.packageWeight ||
                                            shipment.weight ||
                                            0.5}
                                          kg
                                        </div>
                                      </div>

                                      {/* Edit Icon */}
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleEditDimensions(
                                                  shipment,
                                                  index,
                                                )
                                              }
                                              className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                                            >
                                              <EditIcon className="h-3 w-3" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Edit package dimensions</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>

                                    {/* Package Template Selector */}
                                    <div className="relative">
                                      <PackageTemplateSelector
                                        key={`individual-template-${index}-${shipment.orderId || shipment.receiverName}-${shipment.packageLength}-${shipment.packageWidth}-${shipment.packageHeight}`}
                                        userId={user?.id || 0}
                                        selectedTemplateName={
                                          selectedTemplates.get(index)?.name
                                        }
                                        onTemplateSelect={(template) => {
                                          // Create a completely new array to avoid mutation issues
                                          setShipmentPreview(
                                            (currentShipments) => {
                                              const newShipments =
                                                currentShipments.map(
                                                  (ship, i) => {
                                                    if (i === index) {
                                                      return {
                                                        ...ship,
                                                        packageLength:
                                                          template.length,
                                                        packageWidth:
                                                          template.width,
                                                        packageHeight:
                                                          template.height,
                                                        packageWeight:
                                                          template.weight,
                                                        length: template.length,
                                                        width: template.width,
                                                        height: template.height,
                                                        weight: template.weight,
                                                        selectedTemplate:
                                                          template.name,
                                                        // Keep existing pricing options - user can manually recalculate if needed
                                                      };
                                                    }
                                                    return ship;
                                                  },
                                                );
                                              return newShipments;
                                            },
                                          );

                                          // Track template selection
                                          setSelectedTemplates((prev) => {
                                            const newMap = new Map(prev);
                                            newMap.set(index, {
                                              name: template.name,
                                              dimensions: `${template.length}×${template.width}×${template.height}cm, ${template.weight}kg`,
                                            });
                                            return newMap;
                                          });

                                          toast({
                                            title: "Template Applied",
                                            description: `Applied "${template.name}" template to shipment ${index + 1}`,
                                          });

                                          // Recalculate pricing for this specific shipment - removed setTimeout to prevent loops
                                          if (!recalculatingPrices) {
                                            const currentShipment = shipmentPreview[index];
                                            if (currentShipment) {
                                              recalculatePricesForShipments([currentShipment]);
                                            }
                                          }
                                        }}
                                        showSaveCurrentDimensions={false}
                                        currentDimensions={{
                                          length:
                                            shipment.packageLength ||
                                            shipment.length ||
                                            15,
                                          width:
                                            shipment.packageWidth ||
                                            shipment.width ||
                                            10,
                                          height:
                                            shipment.packageHeight ||
                                            shipment.height ||
                                            5,
                                          weight:
                                            shipment.packageWeight ||
                                            shipment.weight ||
                                            0.5,
                                        }}
                                      />
                                    </div>
                                  </div>
                                </TableCell>

                                {/* Price and Insurance Column */}
                                <TableCell
                                  className="py-0.5 px-2 border-r border-gray-200"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="space-y-1">
                                    {/* Price Dropdown */}
                                    {shipment.pricingOptions &&
                                    shipment.pricingOptions.length > 0 ? (
                                      <div
                                        key={`pricing-${index}-${shipment.pricingOptions.length}`}
                                      >
                                        <Select
                                          key={`select-${index}-${shipment.pricingOptions?.length || 0}`}
                                          value={
                                            shipment.selectedServiceOption
                                              ?.id || ""
                                          }
                                          onValueChange={(value) => {
                                            const selectedOption =
                                              shipment.pricingOptions.find(
                                                (opt: any) => opt.id === value,
                                              );
                                            if (selectedOption) {
                                              setShipmentPreview((prev) => {
                                                const updated = [...prev];
                                                updated[index] = {
                                                  ...prev[index],
                                                  selectedServiceOption:
                                                    selectedOption,
                                                };
                                                return updated;
                                              });
                                            }
                                          }}
                                        >
                                          <SelectTrigger className="h-10 text-xs w-full border-gray-200 hover:border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 shadow-sm hover:shadow bg-white [&>svg]:ml-auto">
                                            <SelectValue>
                                              {shipment.selectedServiceOption ? (
                                                <div className="flex items-center justify-between w-full px-1">
                                                  <div className="flex flex-col items-start">
                                                    <span className="font-bold text-sm text-gray-900">
                                                      $
                                                      {(
                                                        (shipment
                                                          .selectedServiceOption
                                                          .totalPriceWithoutInsurance ||
                                                          shipment
                                                            .selectedServiceOption
                                                            .totalPrice ||
                                                          0) / 100
                                                      ).toFixed(2)}
                                                    </span>
                                                    <span
                                                      className={`text-xs font-medium leading-none ${
                                                        shipment
                                                          .selectedServiceOption
                                                          .serviceType === "ECO"
                                                          ? "text-green-600"
                                                          : shipment
                                                                .selectedServiceOption
                                                                .serviceType ===
                                                              "EXPRESS"
                                                            ? "text-orange-600"
                                                            : "text-blue-600"
                                                      }`}
                                                    >
                                                      {(
                                                        shipment
                                                          .selectedServiceOption
                                                          .displayName ||
                                                        shipment
                                                          .selectedServiceOption
                                                          .serviceName
                                                      )?.replace(
                                                        "MoogShip ",
                                                        "",
                                                      )}
                                                    </span>
                                                  </div>
                                                  <Badge
                                                    variant="outline"
                                                    className={`text-xs px-2 py-0.5 font-medium ${
                                                      shipment
                                                        .selectedServiceOption
                                                        .serviceType === "ECO"
                                                        ? "bg-green-50 text-green-700 border-green-200"
                                                        : shipment
                                                              .selectedServiceOption
                                                              .serviceType ===
                                                            "EXPRESS"
                                                          ? "bg-orange-50 text-orange-700 border-orange-200"
                                                          : "bg-blue-50 text-blue-700 border-blue-200"
                                                    }`}
                                                  >
                                                    {
                                                      shipment
                                                        .selectedServiceOption
                                                        .serviceType
                                                    }
                                                  </Badge>
                                                </div>
                                              ) : (
                                                <div className="flex items-center justify-center text-gray-400">
                                                  <span className="text-xs">
                                                    Select shipping service
                                                  </span>
                                                </div>
                                              )}
                                            </SelectValue>
                                          </SelectTrigger>
                                          <SelectContent className="w-80 max-h-60">
                                            {shipment.pricingOptions.map(
                                              (option: any) => (
                                                <SelectItem
                                                  key={option.id}
                                                  value={option.id}
                                                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                                >
                                                  <div className="flex items-center justify-between w-full gap-4">
                                                    <div className="flex flex-col items-start">
                                                      <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-lg font-bold text-gray-900">
                                                          $
                                                          {(
                                                            (option.totalPriceWithoutInsurance ||
                                                              option.totalPrice ||
                                                              0) / 100
                                                          ).toFixed(2)}
                                                        </span>
                                                      </div>
                                                      <span className="text-sm text-gray-600 font-medium leading-tight">
                                                        {(
                                                          option.displayName ||
                                                          option.serviceName
                                                        )?.replace(
                                                          "MoogShip ",
                                                          "",
                                                        )}
                                                      </span>
                                                      {option.deliveryDays && (
                                                        <span className="text-xs text-gray-500 mt-0.5">
                                                          {option.deliveryDays}{" "}
                                                          business days
                                                        </span>
                                                      )}
                                                    </div>
                                                    <Badge
                                                      variant="outline"
                                                      className={`text-xs px-2 py-0.5 font-medium ${
                                                        option.serviceType ===
                                                        "ECO"
                                                          ? "bg-green-50 text-green-700 border-green-200"
                                                          : option.serviceType ===
                                                              "EXPRESS"
                                                            ? "bg-orange-50 text-orange-700 border-orange-200"
                                                            : "bg-blue-50 text-blue-700 border-blue-200"
                                                      }`}
                                                    >
                                                      {option.serviceType}
                                                    </Badge>
                                                  </div>
                                                </SelectItem>
                                              ),
                                            )}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    ) : shipment.isRecalculating ||
                                      recalculatingPrices ? (
                                      <div className="text-xs text-gray-500 flex items-center justify-center bg-gray-50 rounded h-8 border border-gray-200">
                                        <Loader2Icon className="mr-1.5 h-3 w-3 animate-spin text-blue-500" />
                                        Calculating
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-400 text-center bg-gray-50 rounded h-8 border border-gray-100 flex items-center justify-center">
                                        -
                                      </div>
                                    )}
                                    
                                    {/* Re-calculate Button */}
                                    {(shipment.pricingOptions && shipment.pricingOptions.length > 0) && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await recalculatePricesAfterDimensionEdit(index, shipment);
                                        }}
                                        disabled={shipment.isRecalculating || recalculatingPrices}
                                        className="h-6 text-xs px-2 mt-1 w-full"
                                      >
                                        {shipment.isRecalculating || recalculatingPrices ? (
                                          <Loader2Icon className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <>
                                            <RefreshCw className="h-3 w-3 mr-1" />
                                            Re-calculate
                                          </>
                                        )}
                                      </Button>
                                    )}

                                    {/* Insurance Selection */}
                                    <div className="mt-2 space-y-1">
                                      {/* Checkbox and Input on same line */}
                                      <div className="flex items-center space-x-2">
                                        <div className="flex items-center space-x-1">
                                          <input
                                            type="checkbox"
                                            id={`insurance-${index}`}
                                            checked={shipment.hasInsurance}
                                            onChange={(e) => {
                                              const isChecked =
                                                e.target.checked;

                                              // Update state functionally to prevent conflicts
                                              setShipmentPreview((prev) => {
                                                const newShipments = [...prev];
                                                const currentShipment =
                                                  newShipments[index];
                                                const insuranceValue =
                                                  !isChecked
                                                    ? 0
                                                    : currentShipment.insuranceValue ||
                                                      currentShipment.customsValue ||
                                                      0;

                                                newShipments[index] = {
                                                  ...currentShipment,
                                                  hasInsurance: isChecked,
                                                  insuranceValue:
                                                    insuranceValue,
                                                  calculatedInsuranceCost:
                                                    isChecked
                                                      ? currentShipment.calculatedInsuranceCost ||
                                                        0
                                                      : 0,
                                                };

                                                // Update input values state with auto-populated amount
                                                if (
                                                  isChecked &&
                                                  insuranceValue > 0
                                                ) {
                                                  const newInsuranceInputValues =
                                                    new Map(
                                                      insuranceInputValues,
                                                    );
                                                  newInsuranceInputValues.set(
                                                    index,
                                                    (
                                                      insuranceValue / 100
                                                    ).toFixed(2),
                                                  );
                                                  setInsuranceInputValues(
                                                    newInsuranceInputValues,
                                                  );
                                                } else if (!isChecked) {
                                                  // Clear input value when unchecked
                                                  const newInsuranceInputValues =
                                                    new Map(
                                                      insuranceInputValues,
                                                    );
                                                  newInsuranceInputValues.delete(
                                                    index,
                                                  );
                                                  setInsuranceInputValues(
                                                    newInsuranceInputValues,
                                                  );
                                                }

                                                // Calculate insurance cost after state update if checked - removed setTimeout to prevent loops
                                                if (
                                                  isChecked &&
                                                  insuranceValue > 0
                                                ) {
                                                  calculateInsuranceCostForShipment(
                                                    insuranceValue,
                                                    index,
                                                  );
                                                  // Focus and select the insurance input field
                                                  const inputRef =
                                                    getInsuranceInputRef(
                                                      index,
                                                    );
                                                  if (inputRef.current) {
                                                    inputRef.current.focus();
                                                    inputRef.current.select();
                                                  }
                                                }

                                                return newShipments;
                                              });
                                            }}
                                            className="h-3 w-3 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                                          />
                                          <label
                                            htmlFor={`insurance-${index}`}
                                            className="text-xs text-gray-600 cursor-pointer"
                                          >
                                            {t(
                                              "bulkUpload.table.labels.insure",
                                            )}
                                          </label>
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <HelpCircleIcon className="w-3 h-3 text-blue-500 cursor-help hover:text-blue-700 transition-colors" />
                                              </TooltipTrigger>
                                              <TooltipContent className="max-w-xs">
                                                <div className="space-y-2">
                                                  <p className="text-sm font-medium">
                                                    {t(
                                                      "bulkUpload.insurance.description",
                                                    )}
                                                  </p>
                                                  <p className="text-sm">
                                                    {t(
                                                      "bulkUpload.insurance.calculationInfo",
                                                    )}
                                                  </p>
                                                  <p className="text-xs text-gray-600">
                                                    {t(
                                                      "bulkUpload.insurance.tooltip",
                                                    )}
                                                  </p>
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </div>
                                        {shipment.hasInsurance && (
                                          <div className="relative flex-1">
                                            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                                              $
                                            </span>
                                            <Input
                                              ref={getInsuranceInputRef(index)}
                                              type="text"
                                              value={
                                                insuranceInputValues.get(
                                                  index,
                                                ) ??
                                                (
                                                  (shipment.insuranceValue ||
                                                    shipment.customsValue ||
                                                    0) / 100
                                                ).toFixed(2)
                                              }
                                              onChange={(e) => {
                                                const inputValue =
                                                  e.target.value;
                                                if (
                                                  inputValue === "" ||
                                                  /^\d*\.?\d{0,2}$/.test(
                                                    inputValue,
                                                  )
                                                ) {
                                                  const newInsuranceInputValues =
                                                    new Map(
                                                      insuranceInputValues,
                                                    );
                                                  newInsuranceInputValues.set(
                                                    index,
                                                    inputValue,
                                                  );
                                                  setInsuranceInputValues(
                                                    newInsuranceInputValues,
                                                  );

                                                  const insuranceValueInCents =
                                                    inputValue === ""
                                                      ? 0
                                                      : Math.round(
                                                          (parseFloat(
                                                            inputValue,
                                                          ) || 0) * 100,
                                                        );
                                                  const newShipments = [
                                                    ...shipmentPreview,
                                                  ];
                                                  newShipments[index] = {
                                                    ...shipment,
                                                    insuranceValue:
                                                      insuranceValueInCents,
                                                  };
                                                  setShipmentPreview(
                                                    newShipments,
                                                  );

                                                  // Automatically calculate insurance cost
                                                  calculateInsuranceCostForShipment(
                                                    insuranceValueInCents,
                                                    index,
                                                  );
                                                }
                                              }}
                                              className={`text-xs h-7 pl-6 border-gray-200 focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-all ${
                                                shipment.hasInsurance &&
                                                (!shipment.insuranceValue ||
                                                  shipment.insuranceValue <= 0)
                                                  ? "border-red-300 bg-red-50"
                                                  : ""
                                              }`}
                                              placeholder="Amount"
                                            />
                                            {shipment.hasInsurance &&
                                              (!shipment.insuranceValue ||
                                                shipment.insuranceValue <=
                                                  0) && (
                                                <div className="text-xs text-red-500 mt-1">
                                                  {t(
                                                    "bulkUpload.insurance.validation.amountRequired",
                                                  )}
                                                </div>
                                              )}
                                          </div>
                                        )}
                                      </div>
                                      {/* Insurance cost display when insurance is enabled */}
                                      {shipment.hasInsurance &&
                                        shipment.calculatedInsuranceCost >
                                          0 && (
                                          <div className="mt-2 space-y-0.5">
                                            <div className="text-xs text-green-600 font-medium">
                                              Insurance cost: $
                                              {(
                                                shipment.calculatedInsuranceCost /
                                                100
                                              ).toFixed(2)}
                                            </div>
                                            <div className="text-xs text-blue-600 font-medium">
                                              Total (Shipping + Insurance): $
                                              {(
                                                ((shipment.selectedServiceOption
                                                  ?.totalPriceWithoutInsurance ||
                                                  shipment.selectedServiceOption
                                                    ?.totalPrice ||
                                                  0) +
                                                  (shipment.calculatedInsuranceCost ||
                                                    0)) /
                                                100
                                              ).toFixed(2)}
                                            </div>
                                          </div>
                                        )}
                                    </div>

                                    {/* Shipping Terms Selection */}
                                    <div className="mt-2 space-y-1">
                                      <div className="text-xs text-gray-500 mb-0.5">
                                        Shipping Terms
                                      </div>
                                      {(() => {
                                        const countryCode = convertCountryNameToCode(shipment.receiverCountry);
                                        const isUSDestination = countryCode === 'US';
                                        
                                        if (!isUSDestination) {
                                          return null;
                                        }
                                        
                                        // Check if selected service is Shipentegra - if so, force DDU
                                        const isShipentegra = shipment.selectedServiceOption?.serviceName?.includes('shipentegra');
                                        
                                        if (isShipentegra) {
                                          // Display DDU badge for Shipentegra services (state should be set when service is selected)
                                          return (
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                                              <div className="text-xs text-amber-800 font-medium mb-1">
                                                Selected Service - DDU Only
                                              </div>
                                              <div className="flex justify-center">
                                                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1.5 rounded-md text-xs font-semibold">
                                                  DDU
                                                </div>
                                              </div>
                                              <div className="text-xs text-amber-700 mt-1">
                                                US shipments via this service use DDU terms only
                                              </div>
                                            </div>
                                          );
                                        }
                                        
                                        return (
                                          <div className="relative flex bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg p-1 shadow-inner border border-gray-300">
                                            {/* DAP Option */}
                                            <div 
                                              className={`flex items-center justify-center px-4 py-1.5 rounded-md cursor-pointer transition-all duration-200 text-xs font-semibold min-w-0 flex-1 ${
                                                (shipment.shippingTerms || 'dap') === 'dap' 
                                                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg transform scale-105 ring-2 ring-green-300 ring-opacity-50' 
                                                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:shadow-sm'
                                              }`}
                                              onClick={async () => {
                                                const newShipments = [...shipmentPreview];
                                                newShipments[index] = {
                                                  ...shipment,
                                                  shippingTerms: 'dap',
                                                };
                                                setShipmentPreview(newShipments);
                                              }}
                                            >
                                              DAP
                                            </div>
                                            
                                            {/* DDP Option */}
                                            <div 
                                              className={`flex items-center justify-center px-4 py-1.5 rounded-md cursor-pointer transition-all duration-200 text-xs font-semibold min-w-0 flex-1 ${
                                                shipment.shippingTerms === 'ddp' 
                                                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg transform scale-105 ring-2 ring-purple-300 ring-opacity-50' 
                                                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:shadow-sm'
                                              }`}
                                              onClick={async () => {
                                                const newShipments = [...shipmentPreview];
                                                newShipments[index] = {
                                                  ...shipment,
                                                  shippingTerms: 'ddp',
                                                };
                                                setShipmentPreview(newShipments);
                                                
                                                // Automatically calculate duties for DDP
                                                await calculateDutiesForShipment(newShipments[index], index);
                                              }}
                                            >
                                              DDP
                                            </div>
                                          </div>
                                        );
                                      })()}
                                      {shipment.shippingTerms === 'ddp' && (
                                        <div className="mt-2 space-y-1">
                                          {shipment.calculatedDuties ? (
                                            <div className="bg-blue-50 border border-blue-200 rounded-md p-2 space-y-0.5">
                                              <div className="text-xs font-semibold text-blue-800 mb-1">
                                                DDP Duty Breakdown:
                                              </div>
                                              {shipment.dutyCalculationDetails?.baseDutyAmount > 0 && (
                                                <div className="text-xs text-gray-700 flex justify-between">
                                                  <span>Base Duties:</span>
                                                  <span className="font-medium">{shipment.dutyCalculationDetails?.formattedBaseDuty || '$0.00'}</span>
                                                </div>
                                              )}
                                              {shipment.dutyCalculationDetails?.trumpTariffAmount > 0 && (
                                                <div className="text-xs text-red-700 flex justify-between">
                                                  <span>Trump Tariffs:</span>
                                                  <span className="font-medium">{shipment.dutyCalculationDetails?.formattedTrumpTariff || '$0.00'}</span>
                                                </div>
                                              )}
                                              <div className="text-xs text-purple-700 flex justify-between">
                                                <span>DDP Processing Fee:</span>
                                                <span className="font-medium">$4.50</span>
                                              </div>
                                              <div className="text-xs text-blue-800 flex justify-between border-t border-blue-300 pt-1 mt-1 font-semibold">
                                                <span>Total DDP Cost:</span>
                                                <span>{shipment.dutyCalculationDetails?.formattedTotalWithDDPFee || '$0.00'}</span>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-xs text-blue-600 font-medium">
                                              Calculating duties...
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>

                                {/* DDP Column */}
                                <TableCell
                                  className="py-0.5 px-2 border-r border-gray-200"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="space-y-1">
                                    {(() => {
                                      const ddpCalculation = ddpCalculations.get(index);
                                      const hasValidGtip = shipment.gtip && gtipValidations.get(index)?.isValid;
                                      const hasCustomsValue = shipment.customsValue;
                                      
                                      if (!hasValidGtip || !hasCustomsValue) {
                                        return (
                                          <div className="flex items-center justify-center h-12 text-xs text-gray-400">
                                            <div className="text-center">
                                              <DollarSignIcon className="h-4 w-4 mx-auto mb-1 text-gray-300" />
                                              <div>Enter HS code</div>
                                              <div>& customs value</div>
                                            </div>
                                          </div>
                                        );
                                      }

                                      if (ddpCalculation && ddpCalculation.available) {
                                        return (
                                          <div className="bg-green-50 border border-green-200 rounded-md p-2 space-y-1">
                                            <div className="text-xs font-semibold text-green-800 flex items-center">
                                              <DollarSignIcon className="h-3 w-3 mr-1" />
                                              DDP Available
                                            </div>
                                            <div className="text-sm font-bold text-green-900">
                                              {ddpCalculation.formattedTotal}
                                            </div>
                                            <div className="text-xs text-gray-600 space-y-0.5">
                                              <div className="flex justify-between">
                                                <span>Duty ({ddpCalculation.dutyPercentage}%):</span>
                                                <span>${ddpCalculation.baseDuty.toFixed(2)}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Processing fee:</span>
                                                <span>${ddpCalculation.ddpProcessingFee.toFixed(2)}</span>
                                              </div>
                                            </div>
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <div className="text-xs text-blue-600 cursor-help flex items-center">
                                                    <InfoIcon className="h-3 w-3 mr-1" />
                                                    HS: {ddpCalculation.hsCode}
                                                  </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>Customs value: ${ddpCalculation.customsValue.toFixed(2)}</p>
                                                  <p>Duty rate: {ddpCalculation.dutyPercentage}%</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          </div>
                                        );
                                      } else if (ddpCalculation && !ddpCalculation.available) {
                                        return (
                                          <div className="bg-red-50 border border-red-200 rounded-md p-2">
                                            <div className="text-xs font-semibold text-red-800 flex items-center">
                                              <AlertCircleIcon className="h-3 w-3 mr-1" />
                                              DDP Unavailable
                                            </div>
                                            <div className="text-xs text-red-600 mt-1">
                                              {ddpCalculation.message || 'No duty rate found'}
                                            </div>
                                          </div>
                                        );
                                      } else {
                                        return (
                                          <div className="flex items-center justify-center h-12">
                                            <div className="text-xs text-gray-500 text-center">
                                              <Loader2Icon className="h-4 w-4 animate-spin mx-auto mb-1" />
                                              <div>Calculating...</div>
                                            </div>
                                          </div>
                                        );
                                      }
                                    })()}
                                  </div>
                                </TableCell>
                              </TableRow>,
                              expandedRows.has(index) && (
                                <TableRow key={`shipment-expanded-${index}`} className="bg-gray-50">
                                  <TableCell colSpan={7} className="p-0">
                                    <div className="p-6 space-y-6">
                                      {/* Address Details Section */}
                                      {isEtsyUpload && (
                                        <div>
                                          <h4 className="text-sm font-semibold text-gray-900 mb-3">
                                            Address Details
                                          </h4>
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                              <span className="text-gray-500">
                                                Sale Date:
                                              </span>
                                              <div>
                                                {shipment.etsyData?.saleDate ||
                                                  "-"}
                                              </div>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">
                                                Street 1:
                                              </span>
                                              <div>
                                                {shipment.etsyData?.street1 ||
                                                  shipment.receiverAddress ||
                                                  "-"}
                                              </div>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">
                                                Street 2:
                                              </span>
                                              <div>
                                                {shipment.etsyData?.street2 ||
                                                  shipment.receiverAddress2 ||
                                                  "-"}
                                              </div>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">
                                                State:
                                              </span>
                                              <div>
                                                {shipment.etsyData?.shipState ||
                                                  shipment.receiverState ||
                                                  "-"}
                                              </div>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">
                                                Zipcode:
                                              </span>
                                              <div>
                                                {shipment.etsyData
                                                  ?.shipZipcode ||
                                                  shipment.receiverPostalCode ||
                                                  "-"}
                                              </div>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">
                                                Currency:
                                              </span>
                                              <div>
                                                {shipment.etsyData?.currency ||
                                                  "-"}
                                              </div>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">
                                                Order Value:
                                              </span>
                                              <div>
                                                {shipment.etsyData
                                                  ?.orderValue || "-"}
                                              </div>
                                            </div>
                                            <div>
                                              <span className="text-gray-500">
                                                SKU:
                                              </span>
                                              <div>
                                                {shipment.etsyData?.sku || "-"}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Product & Customs Section */}
                                      <div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                                          Product & Customs
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                          <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                              {t(
                                                "bulkUpload.table.labels.productDescription",
                                              )}
                                            </label>
                                            <Input
                                              type="text"
                                              value={
                                                shipment.contents ||
                                                shipment.etsyData?.title ||
                                                ""
                                              }
                                              onChange={(e) => {
                                                const newShipments = [
                                                  ...shipmentPreview,
                                                ];
                                                newShipments[index] = {
                                                  ...shipment,
                                                  contents: e.target.value,
                                                };
                                                setShipmentPreview(
                                                  newShipments,
                                                );
                                              }}
                                              className="text-sm h-8"
                                              placeholder="Product description"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                              {t(
                                                "bulkUpload.table.labels.gtipCode",
                                              )}
                                            </label>
                                            {(() => {
                                              const currentValidation =
                                                gtipValidations.get(index);
                                              const hasValidation =
                                                currentValidation !== undefined;
                                              const isValid =
                                                currentValidation?.isValid ||
                                                false;
                                              const validationColor =
                                                hasValidation
                                                  ? getGTIPValidationColor(
                                                      currentValidation,
                                                    )
                                                  : "text-gray-600 border-gray-300";

                                              return (
                                                <div className="relative">
                                                  <div className="flex items-center space-x-1">
                                                    <Input
                                                      type="text"
                                                      inputMode="decimal"
                                                      value={
                                                        shipment.gtip || ""
                                                      }
                                                      onChange={(e) => {
                                                        const value = e.target.value;
                                                        const validation = handleGTIPValidation(index, value);

                                                        const newShipments = [...shipmentPreview];
                                                        newShipments[index] = {
                                                          ...shipment,
                                                          gtip: validation.cleaned,
                                                        };
                                                        setShipmentPreview(newShipments);

                                                        // Handle US DDP logic separately to avoid cascading updates
                                                        if (validation.isValid && validation.cleaned) {
                                                          handleUSDDPLogic(index, validation, shipment);
                                                        }
                                                      }}
                                                      className={`text-sm h-8 transition-colors ${validationColor}`}
                                                      placeholder="e.g. 1234.56.78"
                                                    />
                                                    {hasValidation && (
                                                      <div className="flex-shrink-0">
                                                        {isValid ? (
                                                          <CheckIcon className="h-4 w-4 text-green-500" />
                                                        ) : (
                                                          <AlertCircleIcon className="h-4 w-4 text-red-500" />
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })()}
                                          </div>
                                          <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                              {t(
                                                "bulkUpload.table.labels.customsValue",
                                              )}
                                            </label>
                                            <Input
                                              type="text"
                                              value={
                                                customsInputValues.get(index) ??
                                                (shipment.customsValue
                                                  ? (
                                                      shipment.customsValue /
                                                      100
                                                    ).toFixed(2)
                                                  : "")
                                              }
                                              onChange={(e) => {
                                                const inputValue =
                                                  e.target.value;
                                                if (
                                                  inputValue === "" ||
                                                  /^\d*\.?\d{0,2}$/.test(
                                                    inputValue,
                                                  )
                                                ) {
                                                  const newCustomsInputValues =
                                                    new Map(customsInputValues);
                                                  newCustomsInputValues.set(
                                                    index,
                                                    inputValue,
                                                  );
                                                  setCustomsInputValues(
                                                    newCustomsInputValues,
                                                  );

                                                  const newCustomsValue = inputValue === ""
                                                    ? 0
                                                    : Math.round(
                                                        (parseFloat(
                                                          inputValue,
                                                        ) || 0) * 100,
                                                      );

                                                  // Check if US destination
                                                  const isUSDestination = shipment.receiverCountry === 'United States' || 
                                                                          shipment.receiverCountry === 'US' ||
                                                                          shipment.receiverCountry === 'USA';
                                                  
                                                  const newShipments = [
                                                    ...shipmentPreview,
                                                  ];
                                                  
                                                  newShipments[index] = {
                                                    ...shipment,
                                                    customsValue: newCustomsValue,
                                                  };
                                                  setShipmentPreview(
                                                    newShipments,
                                                  );

                                                  // Only calculate DDP if user has explicitly selected DDP
                                                  const shouldCalculateDDP = isUSDestination && 
                                                    shipment.shippingTerms === 'ddp' && 
                                                    shipment.gtip && 
                                                    newCustomsValue > 0;
                                                  
                                                  console.log('DDP Auto-calc check:', {
                                                    isUSDestination,
                                                    hasGtip: !!shipment.gtip,
                                                    customsValue: newCustomsValue,
                                                    country: shipment.receiverCountry,
                                                    shippingTerms: shipment.shippingTerms,
                                                    willTrigger: shouldCalculateDDP
                                                  });
                                                  
                                                  if (shouldCalculateDDP) {
                                                    const cleanedHS = shipment.gtip.toString().replace(/\./g, '');
                                                    console.log('Triggering DDP calculation for US DDP shipment', index);
                                                    // Use setTimeout to prevent cascading state updates
                                                    setTimeout(() => {
                                                      calculateDdpForShipment(index, cleanedHS, newCustomsValue / 100);
                                                    }, 0);
                                                  }
                                                }
                                              }}
                                              className="text-sm h-8"
                                              placeholder="0.00"
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Currency, Insurance & Tax ID Section */}
                                      <div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                                          Additional Details
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                          <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                              {t(
                                                "bulkUpload.table.labels.currency",
                                              )}
                                            </label>
                                            <Select
                                              value={shipment.currency || "USD"}
                                              onValueChange={(value) => {
                                                const newShipments = [
                                                  ...shipmentPreview,
                                                ];
                                                newShipments[index] = {
                                                  ...shipment,
                                                  currency: value,
                                                };
                                                setShipmentPreview(
                                                  newShipments,
                                                );
                                              }}
                                            >
                                              <SelectTrigger className="h-8">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="USD">
                                                  USD
                                                </SelectItem>
                                                <SelectItem value="EUR">
                                                  EUR
                                                </SelectItem>
                                                <SelectItem value="GBP">
                                                  GBP
                                                </SelectItem>
                                                <SelectItem value="TRY">
                                                  TRY
                                                </SelectItem>
                                                <SelectItem value="CAD">
                                                  CAD
                                                </SelectItem>
                                                <SelectItem value="AUD">
                                                  AUD
                                                </SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                              {t(
                                                "bulkUpload.table.labels.insurance",
                                              )}
                                            </label>
                                            <div className="space-y-2">
                                              {/* Checkbox and Input on same line */}
                                              <div className="flex items-center space-x-2">
                                                <div className="flex items-center space-x-1">
                                                  <input
                                                    type="checkbox"
                                                    id={`expandable-insurance-${index}`}
                                                    checked={
                                                      shipment.hasInsurance
                                                    }
                                                    onChange={(e) => {
                                                      const isChecked =
                                                        e.target.checked;

                                                      // Update state functionally to prevent conflicts
                                                      setShipmentPreview(
                                                        (prev) => {
                                                          const newShipments = [
                                                            ...prev,
                                                          ];
                                                          const currentShipment =
                                                            newShipments[index];
                                                          const insuranceValue =
                                                            !isChecked
                                                              ? 0
                                                              : currentShipment.insuranceValue ||
                                                                currentShipment.customsValue ||
                                                                0;

                                                          newShipments[index] =
                                                            {
                                                              ...currentShipment,
                                                              hasInsurance:
                                                                isChecked,
                                                              insuranceValue:
                                                                insuranceValue,
                                                              calculatedInsuranceCost:
                                                                isChecked
                                                                  ? currentShipment.calculatedInsuranceCost ||
                                                                    0
                                                                  : 0,
                                                            };

                                                          // Update input values state with auto-populated amount
                                                          if (
                                                            isChecked &&
                                                            insuranceValue > 0
                                                          ) {
                                                            const newInsuranceInputValues =
                                                              new Map(
                                                                insuranceInputValues,
                                                              );
                                                            newInsuranceInputValues.set(
                                                              index,
                                                              (
                                                                insuranceValue /
                                                                100
                                                              ).toFixed(2),
                                                            );
                                                            setInsuranceInputValues(
                                                              newInsuranceInputValues,
                                                            );
                                                          } else if (
                                                            !isChecked
                                                          ) {
                                                            // Clear input value when unchecked
                                                            const newInsuranceInputValues =
                                                              new Map(
                                                                insuranceInputValues,
                                                              );
                                                            newInsuranceInputValues.delete(
                                                              index,
                                                            );
                                                            setInsuranceInputValues(
                                                              newInsuranceInputValues,
                                                            );
                                                          }

                                                          // Calculate insurance cost after state update if checked - removed setTimeout to prevent loops
                                                          if (
                                                            isChecked &&
                                                            insuranceValue > 0
                                                          ) {
                                                            calculateInsuranceCostForShipment(
                                                              insuranceValue,
                                                              index,
                                                            );
                                                            // Focus and select the insurance input field
                                                            const inputRef =
                                                              getInsuranceInputRef(
                                                                index,
                                                              );
                                                            if (
                                                              inputRef.current
                                                            ) {
                                                              inputRef.current.focus();
                                                              inputRef.current.select();
                                                            }
                                                          }

                                                          return newShipments;
                                                        },
                                                      );
                                                    }}
                                                    className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                                                  />
                                                  <label
                                                    htmlFor={`expandable-insurance-${index}`}
                                                    className="text-sm text-gray-600 cursor-pointer"
                                                  >
                                                    {t(
                                                      "bulkUpload.table.labels.insure",
                                                    )}
                                                  </label>
                                                  <TooltipProvider>
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <HelpCircleIcon className="w-3 h-3 text-blue-500 cursor-help hover:text-blue-700 transition-colors" />
                                                      </TooltipTrigger>
                                                      <TooltipContent className="max-w-xs">
                                                        <div className="space-y-2">
                                                          <p className="text-sm font-medium">
                                                            {t(
                                                              "bulkUpload.insurance.description",
                                                            )}
                                                          </p>
                                                          <p className="text-sm">
                                                            {t(
                                                              "bulkUpload.insurance.calculationInfo",
                                                            )}
                                                          </p>
                                                          <p className="text-xs text-gray-600">
                                                            {t(
                                                              "bulkUpload.insurance.tooltip",
                                                            )}
                                                          </p>
                                                        </div>
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>
                                                </div>
                                                {shipment.hasInsurance && (
                                                  <div className="relative flex-1">
                                                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                                                      $
                                                    </span>
                                                    <Input
                                                      ref={getInsuranceInputRef(
                                                        index,
                                                      )}
                                                      type="text"
                                                      value={
                                                        insuranceInputValues.get(
                                                          index,
                                                        ) ??
                                                        (
                                                          (shipment.insuranceValue ||
                                                            shipment.customsValue ||
                                                            0) / 100
                                                        ).toFixed(2)
                                                      }
                                                      onChange={(e) => {
                                                        const inputValue =
                                                          e.target.value;
                                                        if (
                                                          inputValue === "" ||
                                                          /^\d*\.?\d{0,2}$/.test(
                                                            inputValue,
                                                          )
                                                        ) {
                                                          const newInsuranceInputValues =
                                                            new Map(
                                                              insuranceInputValues,
                                                            );
                                                          newInsuranceInputValues.set(
                                                            index,
                                                            inputValue,
                                                          );
                                                          setInsuranceInputValues(
                                                            newInsuranceInputValues,
                                                          );

                                                          const insuranceValueInCents =
                                                            inputValue === ""
                                                              ? 0
                                                              : Math.round(
                                                                  (parseFloat(
                                                                    inputValue,
                                                                  ) || 0) * 100,
                                                                );
                                                          const newShipments = [
                                                            ...shipmentPreview,
                                                          ];
                                                          newShipments[index] =
                                                            {
                                                              ...shipment,
                                                              insuranceValue:
                                                                insuranceValueInCents,
                                                            };
                                                          setShipmentPreview(
                                                            newShipments,
                                                          );

                                                          // Automatically calculate insurance cost
                                                          calculateInsuranceCostForShipment(
                                                            insuranceValueInCents,
                                                            index,
                                                          );
                                                        }
                                                      }}
                                                      className={`text-sm h-8 pl-6 border-gray-200 focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-all ${
                                                        shipment.hasInsurance &&
                                                        (!shipment.insuranceValue ||
                                                          shipment.insuranceValue <=
                                                            0)
                                                          ? "border-red-300 bg-red-50"
                                                          : ""
                                                      }`}
                                                      placeholder="Amount"
                                                    />
                                                  </div>
                                                )}
                                                {shipment.hasInsurance &&
                                                  (!shipment.insuranceValue ||
                                                    shipment.insuranceValue <=
                                                      0) && (
                                                    <div className="text-xs text-red-500 mt-1">
                                                      {t(
                                                        "bulkUpload.insurance.validation.amountRequired",
                                                      )}
                                                    </div>
                                                  )}
                                              </div>
                                              {/* Insurance cost display underneath */}
                                              {shipment.hasInsurance &&
                                                shipment.calculatedInsuranceCost >
                                                  0 && (
                                                  <div className="text-xs space-y-0.5">
                                                    <div className="text-green-600 font-medium">
                                                      Insurance cost: $
                                                      {(
                                                        shipment.calculatedInsuranceCost /
                                                        100
                                                      ).toFixed(2)}
                                                    </div>
                                                    <div className="text-blue-600 font-medium">
                                                      Total (Shipping +
                                                      Insurance): $
                                                      {(
                                                        ((shipment
                                                          .selectedServiceOption
                                                          ?.totalPriceWithoutInsurance ||
                                                          shipment
                                                            .selectedServiceOption
                                                            ?.totalPrice ||
                                                          0) +
                                                          (shipment.calculatedInsuranceCost ||
                                                            0)) /
                                                        100
                                                      ).toFixed(2)}
                                                    </div>
                                                  </div>
                                                )}
                                            </div>
                                          </div>
                                          
                                          {/* Shipping Terms Selection */}
                                          <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                              Shipping Terms
                                            </label>
                                            {(() => {
                                              const countryCode = convertCountryNameToCode(shipment.receiverCountry);
                                              const isUSDestination = countryCode === 'US';
                                              const isShipentegra = shipment.selectedServiceOption?.serviceName?.includes('shipentegra');
                                              
                                              if (!isUSDestination) {
                                                return (
                                                  <div className="flex items-center justify-center h-8 bg-gray-50 rounded text-xs text-gray-400 border border-gray-100">
                                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs px-2 py-1">
                                                      DAP Only
                                                    </Badge>
                                                    <span className="ml-1 text-xs text-gray-500">(DDP US only)</span>
                                                  </div>
                                                );
                                              }
                                              
                                              // Force DDU for Shipentegra services to US
                                              if (isShipentegra) {
                                                // Display DDU badge for Shipentegra services
                                                return (
                                                  <div className="bg-amber-50 border border-amber-200 rounded h-8 flex items-center justify-center">
                                                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs px-2 py-1">
                                                      DDU Only
                                                    </Badge>
                                                  </div>
                                                );
                                              }
                                              
                                              return (
                                                <Select
                                                  value={shipment.shippingTerms || 'dap'}
                                                  onValueChange={async (value) => {
                                                    const newShipments = [...shipmentPreview];
                                                    newShipments[index] = {
                                                      ...shipment,
                                                      shippingTerms: value as 'dap' | 'ddp' | 'ddu',
                                                    };
                                                    setShipmentPreview(newShipments);
                                                    
                                                    // Automatically calculate duties for DDP
                                                    if (value === 'ddp') {
                                                      await calculateDutiesForShipment(newShipments[index], index);
                                                    }
                                                  }}
                                                >
                                                  <SelectTrigger className="h-8 border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 text-xs">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="dap">
                                                      <div className="flex items-center space-x-2">
                                                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs px-2 py-1">
                                                          DAP
                                                        </Badge>
                                                        <span className="text-xs">Customer pays duties</span>
                                                      </div>
                                                    </SelectItem>
                                                    <SelectItem value="ddp">
                                                      <div className="flex items-center space-x-2">
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-1">
                                                          DDP
                                                        </Badge>
                                                        <span className="text-xs">Duties included</span>
                                                      </div>
                                                    </SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              );
                                            })()}
                                            {shipment.shippingTerms === 'ddp' && (
                                              <div className="text-xs text-blue-600 font-medium mt-1">
                                                {shipment.calculatedDuties ? 
                                                  `DDP Duties: ${shipment.dutyCalculationDetails?.formattedTotalWithDDPFee || '$0.00'}` :
                                                  'Calculating duties...'
                                                }
                                              </div>
                                            )}
                                          </div>
                                          
                                          <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                              {t(
                                                "bulkUpload.table.labels.taxId",
                                              )}
                                            </label>
                                            {(() => {
                                              const countryCode =
                                                convertCountryNameToCode(
                                                  shipment.receiverCountry,
                                                );
                                              const isEUDestination =
                                                isEUCountry(countryCode);
                                              const isHMRCDestination =
                                                isHMRCCountry(countryCode);
                                              const requiresTaxId =
                                                isEUDestination ||
                                                isHMRCDestination;

                                              if (!requiresTaxId) {
                                                return (
                                                  <div className="text-xs text-gray-400 py-2">
                                                    {t(
                                                      "bulkUpload.table.labels.notRequired",
                                                    )}
                                                  </div>
                                                );
                                              }

                                              const placeholder =
                                                isHMRCDestination
                                                  ? countryCode === "GB"
                                                    ? "HMRC Number (UK)"
                                                    : "HMRC Number (SE)"
                                                  : "IOSS Number (EU)";

                                              const currentValue =
                                                taxIdValues.get(index) ||
                                                shipment.iossNumber ||
                                                "";

                                              return (
                                                <Input
                                                  type="text"
                                                  placeholder={placeholder}
                                                  value={currentValue}
                                                  onChange={(e) => {
                                                    const newTaxIdValues =
                                                      new Map(taxIdValues);
                                                    newTaxIdValues.set(
                                                      index,
                                                      e.target.value,
                                                    );
                                                    setTaxIdValues(
                                                      newTaxIdValues,
                                                    );

                                                    const newShipments = [
                                                      ...shipmentPreview,
                                                    ];
                                                    newShipments[index] = {
                                                      ...shipment,
                                                      iossNumber:
                                                        e.target.value,
                                                    };
                                                    setShipmentPreview(
                                                      newShipments,
                                                    );
                                                  }}
                                                  className={`h-8 text-sm ${
                                                    requiresTaxId &&
                                                    !currentValue.trim()
                                                      ? "border-red-300 focus:border-red-500"
                                                      : "border-gray-300"
                                                  }`}
                                                />
                                              );
                                            })()}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Package Details Section */}
                                      <div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                                          Package Details
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                          <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                              Length (cm)
                                            </label>
                                            <div className="text-sm font-medium">
                                              {shipment.length || 15}
                                            </div>
                                          </div>
                                          <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                              Width (cm)
                                            </label>
                                            <div className="text-sm font-medium">
                                              {shipment.width || 10}
                                            </div>
                                          </div>
                                          <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                              Height (cm)
                                            </label>
                                            <div className="text-sm font-medium">
                                              {shipment.height || 1}
                                            </div>
                                          </div>
                                          <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                              Weight (kg)
                                            </label>
                                            <div className="text-sm font-medium">
                                              {shipment.weight || 0.5}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="mt-4 flex space-x-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              handleEditDimensions(
                                                shipment,
                                                index,
                                              )
                                            }
                                          >
                                            <EditIcon className="h-3 w-3 mr-1" />
                                            Edit Dimensions
                                          </Button>
                                          {shipment.pricingOptions && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() =>
                                                recalculatePricesForShipments([
                                                  shipment,
                                                ])
                                              }
                                              disabled={
                                                shipment.isRecalculating
                                              }
                                            >
                                              <RotateCcwIcon className="h-3 w-3 mr-1" />
                                              Recalculate Price
                                            </Button>
                                          )}
                                        </div>
                                      </div>

                                      {/* Service Selection Section */}
                                      <div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                                          Service Selection
                                        </h4>
                                        {shipment.pricingOptions &&
                                        shipment.pricingOptions.length > 0 ? (
                                          <div className="space-y-3">
                                            <Select
                                              value={
                                                shipment.selectedServiceOption
                                                  ? JSON.stringify(
                                                      shipment.selectedServiceOption,
                                                    )
                                                  : ""
                                              }
                                              onValueChange={(value) => {
                                                const selectedOption =
                                                  JSON.parse(value);
                                                const newShipments = [
                                                  ...shipmentPreview,
                                                ];
                                                newShipments[index] = {
                                                  ...shipment,
                                                  selectedServiceOption:
                                                    selectedOption,
                                                  totalPrice:
                                                    selectedOption.totalPrice,
                                                  selectedService:
                                                    selectedOption.providerServiceCode ||
                                                    selectedOption.serviceCode ||
                                                    selectedOption.displayName,
                                                };
                                                setShipmentPreview(
                                                  newShipments,
                                                );
                                              }}
                                            >
                                              <SelectTrigger className="h-10">
                                                <SelectValue placeholder="Select shipping service">
                                                  {shipment.selectedServiceOption && (
                                                    <div className="flex flex-col w-full">
                                                      <div className="flex items-center justify-between w-full">
                                                        <span className="font-medium text-sm">
                                                          {
                                                            shipment
                                                              .selectedServiceOption
                                                              .displayName
                                                          }
                                                        </span>
                                                        <span className="font-bold text-sm">
                                                          $
                                                          {(
                                                            (shipment
                                                              .selectedServiceOption
                                                              .totalPriceWithoutInsurance ||
                                                              shipment
                                                                .selectedServiceOption
                                                                .totalPrice) /
                                                            100
                                                          ).toFixed(2)}
                                                        </span>
                                                      </div>
                                                      {shipment.hasInsurance &&
                                                        shipment.insuranceValue >
                                                          0 && (
                                                          <div className="flex items-center justify-between w-full text-xs text-green-600 mt-1">
                                                            <span>
                                                              + Insurance
                                                            </span>
                                                            <span>
                                                              $
                                                              {(
                                                                ((shipment.insuranceValue ||
                                                                  0) /
                                                                  100) *
                                                                0.025
                                                              ).toFixed(2)}
                                                            </span>
                                                          </div>
                                                        )}
                                                    </div>
                                                  )}
                                                </SelectValue>
                                              </SelectTrigger>
                                              <SelectContent>
                                                {shipment.pricingOptions.map(
                                                  (
                                                    option: any,
                                                    optionIndex: number,
                                                  ) => (
                                                    <SelectItem
                                                      key={optionIndex}
                                                      value={JSON.stringify(
                                                        option,
                                                      )}
                                                    >
                                                      <div className="flex flex-col w-full">
                                                        <div className="flex items-center justify-between w-full">
                                                          <span>
                                                            {option.displayName}
                                                          </span>
                                                          <span className="font-semibold ml-4">
                                                            $
                                                            {(
                                                              (option.totalPriceWithoutInsurance ||
                                                                option.totalPrice) /
                                                              100
                                                            ).toFixed(2)}
                                                          </span>
                                                        </div>
                                                        {shipment.hasInsurance &&
                                                          shipment.insuranceValue >
                                                            0 && (
                                                            <div className="flex items-center justify-between w-full text-xs text-green-600 mt-1">
                                                              <span className="ml-2">
                                                                Cargo: $
                                                                {(
                                                                  (option.totalPriceWithoutInsurance ||
                                                                    option.totalPrice) /
                                                                  100
                                                                ).toFixed(2)}
                                                              </span>
                                                              <span>
                                                                Insurance: $
                                                                {(
                                                                  ((shipment.insuranceValue ||
                                                                    0) /
                                                                    100) *
                                                                  0.025
                                                                ).toFixed(2)}
                                                              </span>
                                                            </div>
                                                          )}
                                                      </div>
                                                    </SelectItem>
                                                  ),
                                                )}
                                              </SelectContent>
                                            </Select>

                                          </div>
                                        ) : shipment.isRecalculating ||
                                          recalculatingPrices ? (
                                          <div className="text-sm text-gray-500 flex items-center">
                                            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                            Calculating pricing options...
                                          </div>
                                        ) : (
                                          <div className="text-sm text-gray-500">
                                            No pricing options available. Click
                                            "Recalculate Price" to load options.
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            ].filter(Boolean))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}

              {/* Create Shipments Button */}
              {shipmentPreview.length > 0 && fileValidated && !uploadResult && (
                <div className="flex justify-center pt-6">
                  <Button
                    onClick={handleCreateShipments}
                    disabled={
                      bulkCreateMutation.isPending ||
                      !hasValidShipmentsForCreation()
                    }
                    className="min-w-[200px]"
                  >
                    {bulkCreateMutation.isPending ? (
                      <>
                        <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                        {String(t("bulkUpload.creatingShipments"))}
                      </>
                    ) : (
                      `${String(t("bulkUpload.createShipments"))} (${getValidShipmentsCount()}/${getValidShipmentsCount()})`
                    )}
                  </Button>
                </div>
              )}

              {/* Upload Results */}
              {uploadResult && (
                <div className="space-y-4">
                  {uploadResult.success &&
                    Array.isArray(uploadResult.success) &&
                    uploadResult.success.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 className="text-green-800 font-medium mb-2">
                          {String(t("bulkUpload.successfulUploads"))}
                        </h3>
                        <ul className="space-y-1">
                          {Array.isArray(uploadResult.success) &&
                            uploadResult.success.map(
                              (success: any, index: number) => (
                                <li
                                  key={index}
                                  className="text-green-700 text-sm"
                                >
                                  ✓ {String(t("bulkUpload.shipmentCreated"))}:{" "}
                                  {success.number ||
                                    `${String(t("common.shipment"))} ${index + 1}`}
                                </li>
                              ),
                            )}
                        </ul>
                      </div>
                    )}

                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h3 className="text-red-800 font-medium mb-2">
                        {String(t("bulkUpload.errors"))}
                      </h3>
                      <ul className="space-y-1">
                        {uploadResult.errors.map(
                          (error: any, index: number) => (
                            <li key={index} className="text-red-700 text-sm">
                              ✗ {String(t("common.error"))}:{" "}
                              {error.message || `Error ${index + 1}`}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={handlePrintAllLabels}
                      disabled={isPrintingLabels}
                      variant="outline"
                    >
                      {isPrintingLabels && (
                        <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      {String(t("bulkUpload.printAllLabels"))}
                    </Button>

                    <Button
                      onClick={() => {
                        navigate("/shipment-list");
                      }}
                    >
                      {String(t("bulkUpload.viewShipments"))}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Edit Dimensions Dialog */}
        <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
          <DialogContent className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PackageIcon className="h-5 w-5 text-indigo-600" />
                Bulk Edit Package Dimensions
              </DialogTitle>
              <DialogDescription>
                Apply custom dimensions to {selectedCount} selected shipments.
                This will automatically recalculate pricing.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Package Template Selector */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Package Templates
                </label>
                <PackageTemplateSelector
                  key={`bulk-dialog-template-${bulkDimensions.length}-${bulkDimensions.width}-${bulkDimensions.height}-${bulkDimensions.weight}`}
                  userId={user?.id || 0}
                  onTemplateSelect={(template) => {
                    setBulkDimensions({
                      length: template.length,
                      width: template.width,
                      height: template.height,
                      weight: template.weight,
                    });
                    toast({
                      description: `Template "${template.name}" loaded`,
                    });
                  }}
                  showSaveCurrentDimensions={true}
                  currentDimensions={bulkDimensions}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Length (cm)
                  </label>
                  <Input
                    type="number"
                    value={bulkDimensions.length}
                    onChange={(e) =>
                      setBulkDimensions({
                        ...bulkDimensions,
                        length: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Length"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Width (cm)
                  </label>
                  <Input
                    type="number"
                    value={bulkDimensions.width}
                    onChange={(e) =>
                      setBulkDimensions({
                        ...bulkDimensions,
                        width: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Width"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Height (cm)
                  </label>
                  <Input
                    type="number"
                    value={bulkDimensions.height}
                    onChange={(e) =>
                      setBulkDimensions({
                        ...bulkDimensions,
                        height: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Height"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Weight (kg)
                  </label>
                  <Input
                    type="number"
                    value={bulkDimensions.weight}
                    onChange={(e) =>
                      setBulkDimensions({
                        ...bulkDimensions,
                        weight: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Weight"
                    step="0.1"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Summary Display */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Package Summary
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Dimensions:</span>
                    <span className="font-medium">
                      {bulkDimensions.length} × {bulkDimensions.width} ×{" "}
                      {bulkDimensions.height} cm
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Weight:</span>
                    <span className="font-medium">
                      {bulkDimensions.weight} kg
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Volumetric Weight:</span>
                    <span className="font-medium">
                      {(
                        (bulkDimensions.length *
                          bulkDimensions.width *
                          bulkDimensions.height) /
                        5000
                      ).toFixed(2)}{" "}
                      kg
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                    <span>Billable Weight:</span>
                    <span className="font-medium">
                      {Math.max(
                        bulkDimensions.weight,
                        (bulkDimensions.length *
                          bulkDimensions.width *
                          bulkDimensions.height) /
                          5000,
                      ).toFixed(2)}{" "}
                      kg
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const newShipments = shipmentPreview.map((shipment) => {
                    if (!shipment.skipImport) {
                      return {
                        ...shipment,
                        packageLength: bulkDimensions.length,
                        packageWidth: bulkDimensions.width,
                        packageHeight: bulkDimensions.height,
                        packageWeight: bulkDimensions.weight,
                        length: bulkDimensions.length,
                        width: bulkDimensions.width,
                        height: bulkDimensions.height,
                        weight: bulkDimensions.weight,
                        selectedTemplate: `Custom (${bulkDimensions.length}×${bulkDimensions.width}×${bulkDimensions.height})`,
                        pricingOptions: [],
                        selectedServiceOption: null,
                      };
                    }
                    return shipment;
                  });
                  setShipmentPreview(newShipments);
                  setBulkEditOpen(false);

                  toast({
                    title: "Dimensions Applied",
                    description: `Applied ${bulkDimensions.length}×${bulkDimensions.width}×${bulkDimensions.height}cm to ${selectedCount} selected shipments.`,
                  });

                  // Direct recalculation without setTimeout to prevent loops
                  const selectedShipmentsArray = newShipments.filter(
                    (shipment) => !shipment.skipImport,
                  );
                  if (!recalculatingPrices && selectedShipmentsArray.length > 0) {
                    recalculatePricesForShipments(selectedShipmentsArray);
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Apply to {selectedCount} Shipments
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dimension Edit Modal */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="w-full max-w-sm sm:max-w-md md:max-w-lg mx-4">
            <DialogHeader>
              <DialogTitle>
                {String(t("bulkUpload.editDimensions.title"))}
              </DialogTitle>
            </DialogHeader>

            {editingShipment && (
              <>
                <div className="space-y-4">
                  {/* Package Template Selector */}
                  <div>
                    <PackageTemplateSelector
                      userId={user?.id || 0}
                      onTemplateSelect={(template) => {
                        setEditingShipment({
                          ...editingShipment,
                          length: template.length,
                          width: template.width,
                          height: template.height,
                          weight: template.weight,
                        });
                        toast({
                          description: `${String(t("bulkUpload.templateApplied"))}: "${template.name}"`,
                        });
                      }}
                      showSaveCurrentDimensions={true}
                      currentDimensions={{
                        length: editingShipment.length || 0,
                        width: editingShipment.width || 0,
                        height: editingShipment.height || 0,
                        weight: editingShipment.weight || 0,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium">
                        {String(t("bulkUpload.editDimensions.length"))}
                      </label>
                      <Input
                        type="number"
                        value={editingShipment.length || ""}
                        onChange={(e) =>
                          setEditingShipment({
                            ...editingShipment,
                            length: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="cm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        {String(t("bulkUpload.editDimensions.width"))}
                      </label>
                      <Input
                        type="number"
                        value={editingShipment.width || ""}
                        onChange={(e) =>
                          setEditingShipment({
                            ...editingShipment,
                            width: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="cm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        {String(t("bulkUpload.editDimensions.height"))}
                      </label>
                      <Input
                        type="number"
                        value={editingShipment.height || ""}
                        onChange={(e) =>
                          setEditingShipment({
                            ...editingShipment,
                            height: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="cm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      {String(t("bulkUpload.editDimensions.weight"))}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingShipment.weight || ""}
                      onChange={(e) =>
                        setEditingShipment({
                          ...editingShipment,
                          weight: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="kg"
                    />
                  </div>
                </div>

                {/* Weight Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  {(() => {
                    const length = editingShipment.length || 0;
                    const width = editingShipment.width || 0;
                    const height = editingShipment.height || 0;
                    const actualWeight = editingShipment.weight || 0;

                    const volumetricWeight = (length * width * height) / 5000;
                    const formattedVolumetricWeight =
                      volumetricWeight.toFixed(2);

                    const billableWeight = Math.max(
                      actualWeight,
                      volumetricWeight,
                    );
                    const formattedBillableWeight = billableWeight.toFixed(2);

                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>
                            {String(
                              t("bulkUpload.editDimensions.summary.dimensions"),
                            )}
                            :
                          </span>
                          <span className="font-medium">
                            {length} × {width} × {height} cm
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>
                            {String(
                              t(
                                "bulkUpload.editDimensions.summary.actualWeight",
                              ),
                            )}
                            :
                          </span>
                          <span className="font-medium">{actualWeight} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span>
                            {String(
                              t(
                                "bulkUpload.editDimensions.summary.volumetricWeight",
                              ),
                            )}
                            :
                          </span>
                          <span className="font-medium">
                            {formattedVolumetricWeight} kg
                          </span>
                        </div>
                        <div className="flex justify-between text-blue-700 font-medium border-t border-blue-200 pt-1 mt-1">
                          <span>
                            {String(
                              t(
                                "bulkUpload.editDimensions.summary.billableWeight",
                              ),
                            )}
                            :
                          </span>
                          <span>{formattedBillableWeight} kg</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          <p>
                            {String(
                              t(
                                "bulkUpload.editDimensions.formula.volumetricFormula",
                              ),
                            )}
                          </p>
                          <p>
                            {String(
                              t(
                                "bulkUpload.editDimensions.formula.billableWeightExplanation",
                              ),
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                {String(t("common.cancel"))}
              </Button>
              <Button onClick={handleSaveDimensions}>
                {String(t("common.saveChanges"))}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Tax ID Validation Error Dialog */}
        <Dialog
          open={validationErrorDialog.isOpen}
          onOpenChange={(isOpen) =>
            setValidationErrorDialog((prev) => ({ ...prev, isOpen }))
          }
        >
          <DialogContent className="w-full max-w-sm sm:max-w-md md:max-w-lg mx-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangleIcon className="h-5 w-5" />
                {validationErrorDialog.title}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-4 text-sm">
                  <p className="text-gray-700">
                    {validationErrorDialog.message}
                  </p>

                  {validationErrorDialog.details && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="font-medium text-red-800 mb-2">
                        Eksik Vergi Kimlik Numaraları:
                      </p>
                      <div className="text-red-700 whitespace-pre-line font-mono text-xs">
                        {validationErrorDialog.details}
                      </div>
                    </div>
                  )}

                  {validationErrorDialog.solution && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="font-medium text-blue-800 mb-2">
                        Nasıl devam edilir:
                      </p>
                      <div className="text-blue-700 whitespace-pre-line text-xs">
                        {validationErrorDialog.solution}
                      </div>
                    </div>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() =>
                  setValidationErrorDialog((prev) => ({
                    ...prev,
                    isOpen: false,
                  }))
                }
                className="w-full"
              >
                Anladım
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DDP Confirmation Modal */}
        <Dialog open={ddpModalOpen} onOpenChange={setDdpModalOpen}>
          <DialogContent className="w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-purple-600">
                <DollarSignIcon className="h-5 w-5" />
                DDP Calculation Results
              </DialogTitle>
              <DialogDescription>
                Review the calculated duties and confirm to deduct from your balance
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-purple-900">Total DDP Amount</h3>
                    <p className="text-sm text-purple-700">
                      {Array.from(ddpCalculations.values()).filter(calc => calc.available).length} shipments with duties calculated
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-900">
                      ${totalDdpAmount.toFixed(2)}
                    </div>
                    <div className="text-sm text-purple-600">
                      including processing fees
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Information */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-gray-600">Current Balance</div>
                    <div className="font-semibold text-gray-900">
                      ${(userBalance / 100).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">DDP Amount</div>
                    <div className="font-semibold text-purple-600">
                      -${totalDdpAmount.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Balance After</div>
                    <div className={`font-semibold ${canAffordDdp ? 'text-green-600' : 'text-red-600'}`}>
                      ${((userBalance / 100) - totalDdpAmount).toFixed(2)}
                    </div>
                  </div>
                </div>
                
                {!canAffordDdp && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center text-red-800">
                      <AlertCircleIcon className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">Insufficient balance</span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">
                      Please add funds to your account to cover the DDP amount.
                    </p>
                  </div>
                )}
              </div>

              {/* Detailed Calculations */}
              <div className="max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {Array.from(ddpCalculations.entries())
                    .filter(([_, calc]) => calc.available)
                    .map(([index, calc]) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-md p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              Shipment #{index + 1}
                            </div>
                            <div className="text-xs text-gray-600">
                              HS Code: {calc.hsCode} | Customs Value: ${calc.customsValue.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Duty Rate: {calc.dutyPercentage}% | Base Duty: ${calc.baseDuty.toFixed(2)} | Processing: ${calc.ddpProcessingFee.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-green-600">
                              {calc.formattedTotal}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDdpModalOpen(false)}
                disabled={ddpProcessing}
              >
                Cancel
              </Button>
              <Button 
                onClick={processDdpDeduction}
                disabled={!canAffordDdp || ddpProcessing || totalDdpAmount === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {ddpProcessing ? (
                  <>
                    <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSignIcon className="h-4 w-4 mr-2" />
                    Confirm DDP Payment
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </div>
  );
}

export default withAuth(BulkUploadContent);
