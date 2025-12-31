import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { isEUCountry, isHMRCCountry } from "@/lib/countries";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertCircle,
  MapPin,
  UserRound,
  Package,
  CreditCard,
  Copy,
  RefreshCcw,
  Edit,
  Save,
  X,
  Box,
  Weight,
  Info,
  StickyNote,
  FileText,
  Check,
  User,
  Shield,
  Upload,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { COUNTRIES } from "@/lib/countries";
import { convertCountryNameToCode } from "@shared/countries";
import { withAuth } from "@/lib/with-auth";
import { useToast } from "@/hooks/use-toast";
import { ShipmentStatus, ServiceLevel } from "@shared/schema";
import Layout from "@/components/layout";

// Helper function to convert service codes to MoogShip branded names
function getMoogShipServiceName(serviceCode: string): string {
  if (!serviceCode) return "MoogShip Service";
  
  // Remove technical prefixes before processing
  const cleanCode = serviceCode.replace(/^(shipentegra|afs|se)[-_]?/i, "");
  const normalized = cleanCode.toLowerCase().trim();
  
  const serviceMappings: Record<string, string> = {
    // Clean service mappings without technical prefixes
    "eco": "MoogShip GLS Eco",
    "eco-primary": "MoogShip GLS Eco",
    "ups-ekspress": "MoogShip UPS Express",
    "ups-express": "MoogShip UPS Express",
    "fedex": "MoogShip FedEx",
    "widect": "MoogShip Eco",
    "worldwide-standard": "MoogShip Worldwide Standard",
    "amerika-eko-plus": "MoogShip Eco",
    "almanya-eko-plus": "MoogShip Eco",
    "avustralya-eko-plus": "MoogShip Eco",
    "fransa-eko-plus": "MoogShip Eco",
    "global-eko-plus": "MoogShip Eco",
    "ingiltere-eko-plus": "MoogShip Eco",
    "dhlecommerce-eko-plus": "MoogShip DHL E-Commerce",

    // AFS services
    "1": "MoogShip GLS Eco",
    "2": "MoogShip UPS Express",
    "7": "MoogShip AFS Express",
    "ups-express": "MoogShip UPS Express",
    "ecoafs": "MoogShip GLS Eco",

    // Legacy service codes
    "standard": "MoogShip Worldwide Standard",
    "express": "MoogShip UPS Express",
    "priority": "MoogShip Priority",
  };

  return serviceMappings[normalized] || cleanCode
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || "MoogShip Service";
}
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Currency options
const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
];

// Schema for editing shipment
const editShipmentSchema = z.object({
  // Sender details
  senderName: z.string().min(1, "Sender name is required"),
  senderAddress: z.string().optional(),
  senderCity: z.string().optional(),
  senderPostalCode: z.string().optional(),
  senderPhone: z.string().optional(),
  senderEmail: z.string().optional(),

  // Receiver details
  receiverName: z.string().min(1, "Receiver name is required"),
  receiverAddress: z.string().min(1, "Receiver address is required"),
  receiverAddress2: z.string().optional().or(z.literal("")),
  receiverCity: z.string().min(1, "Receiver city is required"),
  receiverPostalCode: z.string().min(1, "Receiver postal code is required"),
  receiverCountry: z.string().min(1, "Receiver country is required"),
  receiverPhone: z.string().min(1, "Receiver phone is required"),
  receiverEmail: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  receiverState: z.string().optional(),

  // Package details
  packageWeight: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(0.1, "Weight must be greater than 0"),
  ),
  packageLength: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(1, "Length must be greater than 0"),
  ),
  packageWidth: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(1, "Width must be greater than 0"),
  ),
  packageHeight: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(1, "Height must be greater than 0"),
  ),
  packageContents: z.string().optional(),
  pieceCount: z.preprocess(
    (val) => (val === "" ? 1 : Number(val)),
    z.number().min(1, "Piece count must be at least 1"),
  ),
  itemCount: z.preprocess(
    (val) => (val === "" ? 1 : Number(val)),
    z.number().min(1, "Item count must be at least 1"),
  ),

  // Customs details
  gtip: z.string().optional(),
  iossNumber: z.string().optional(),
  customsValue: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(0, "Customs value cannot be negative"),
  ),
  currency: z.string().default("USD"),

  // Insurance details
  isInsured: z.boolean().default(false),
  insuranceValue: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(0, "Insurance value cannot be negative"),
  ),
  insuranceCost: z.number().optional(),

  // Service details - Allow empty string for admin dropdown initial state
  serviceLevel: z.string().optional().or(z.literal("")),

  // Pricing details
  basePrice: z.number().optional(),
  fuelCharge: z.number().optional(),
  additionalFee: z.number().optional(),
  taxes: z.number().optional(),
  totalPrice: z.number().optional(),

  // Original cost prices (before multiplier) - CRITICAL FIX
  originalBasePrice: z.number().optional(),
  originalFuelCharge: z.number().optional(),
  originalAdditionalFee: z.number().optional(),
  originalTotalPrice: z.number().optional(),
  appliedMultiplier: z.number().optional(),

  // Status
  status: z.enum([
    ShipmentStatus.PENDING,
    ShipmentStatus.APPROVED,
    ShipmentStatus.REJECTED,
  ]),

  // Rejection reason (only required if status is REJECTED)
  rejectionReason: z
    .string()
    .optional()
    .superRefine((val, ctx) => {
      try {
        // Only apply this validation when used in the main shipment form context
        const parent = ctx.path[0] === "" ? ctx.data : undefined;
        if (
          parent &&
          "status" in parent &&
          parent.status === ShipmentStatus.REJECTED
        ) {
          if (!val || val.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Rejection reason is required when status is Rejected",
            });
          }
        }
      } catch (error) {}
      return z.NEVER;
    }),
});

type EditShipmentFormValues = z.infer<typeof editShipmentSchema>;

// Format price for display
const formatPrice = (price?: number) => {
  if (price === undefined || price === null) return "N/A";
  return `$${(price / 100).toFixed(2)}`;
};

// Format date
const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(date);
};

// Collapsible section component
const SectionCard = ({
  title,
  icon,
  children,
  defaultOpen = false,
  bgColor = "bg-gray-50",
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const Icon = icon;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={`border rounded-lg ${bgColor} mb-4 overflow-hidden`}
    >
      <CollapsibleTrigger asChild>
        <div className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-100">
          <div className="flex items-center space-x-2">
            <Icon className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium">{title}</h3>
          </div>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 pt-0">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
};

type ShipmentEditProps = {
  user: any;
};

const ShipmentEditContent = ({ user }: ShipmentEditProps) => {
  const [, setLocation] = useLocation();
  const [match1, params1] = useRoute("/shipment-edit/:id");
  const [match2, params2] = useRoute("/admin/shipments/:id");
  const { toast } = useToast();
  
  // Check both route patterns to get the shipment ID
  const shipmentId = params1?.id 
    ? parseInt(params1.id) 
    : params2?.id 
    ? parseInt(params2.id) 
    : null;

  // Invoice upload state
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);
  const isAdmin = user && user.role === "admin";

  // State for credit limit check
  const [creditLimitCheck, setCreditLimitCheck] = useState<any>(null);

  // State for pricing options
  const [pricingOptions, setPricingOptions] = useState<any>(null);

  // State for editing packages
  const [editingPackageId, setEditingPackageId] = useState<number | null>(null);
  const [editingPackageData, setEditingPackageData] =
    useState<PackageEditData | null>(null);

  // State for insurance value display (local state management to fix input field issue)
  const [insuranceDisplayValue, setInsuranceDisplayValue] =
    useState<string>("");
  // Add state for real-time volumetric and billable weight calculation during editing
  const [editingVolumetricWeight, setEditingVolumetricWeight] =
    useState<number>(0);
  const [editingBillableWeight, setEditingBillableWeight] = useState<number>(0);

  // Define schema for package editing data (separate from shipment schema)
  const packageEditSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    notes: z.string().optional(),
    // Allow both string and number inputs, but require values > 0 (not just >= 0)
    // since the DB stores them as strings but the UI works with them as numbers
    weight: z.union([
      z
        .string()
        .refine(
          (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
          "Weight must be greater than 0",
        ),
      z.number().refine((val) => val > 0, "Weight must be greater than 0"),
    ]),
    length: z.union([
      z
        .string()
        .refine(
          (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
          "Length must be greater than 0",
        ),
      z.number().refine((val) => val > 0, "Length must be greater than 0"),
    ]),
    width: z.union([
      z
        .string()
        .refine(
          (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
          "Width must be greater than 0",
        ),
      z.number().refine((val) => val > 0, "Width must be greater than 0"),
    ]),
    height: z.union([
      z
        .string()
        .refine(
          (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
          "Height must be greater than 0",
        ),
      z.number().refine((val) => val > 0, "Height must be greater than 0"),
    ]),
  });

  // Define type for package editing data
  type PackageEditData = z.infer<typeof packageEditSchema>;

  // Function to refresh packages after an update
  const refreshPackages = async () => {
    // Invalidate the shipment cache to force a refresh
    await queryClient.invalidateQueries({
      queryKey: [`/api/shipments/${shipmentId}`],
    });

    // Also fetch fresh package data and update the local state
    try {
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const shipmentData = await response.json();

        if (shipmentData.packages && Array.isArray(shipmentData.packages)) {
          // Create packages based on updated shipment data
          const updatedPackages = shipmentData.packages.map((pkg, index) => {
            // Extract dimensions and weights - ensure they're converted to numbers
            const pkgWeight =
              typeof pkg.weight === "number"
                ? pkg.weight
                : pkg.weight
                  ? parseFloat(String(pkg.weight))
                  : 0;

            const pkgLength =
              typeof pkg.length === "number"
                ? pkg.length
                : pkg.length
                  ? parseFloat(String(pkg.length))
                  : 0;

            const pkgWidth =
              typeof pkg.width === "number"
                ? pkg.width
                : pkg.width
                  ? parseFloat(String(pkg.width))
                  : 0;

            const pkgHeight =
              typeof pkg.height === "number"
                ? pkg.height
                : pkg.height
                  ? parseFloat(String(pkg.height))
                  : 0;

            const volumetricWeight = calculateVolumetricWeight(
              pkgLength,
              pkgWidth,
              pkgHeight,
            );
            const billableWeight = Math.max(pkgWeight, volumetricWeight);

            return {
              id: pkg.id || index,
              name: pkg.name || `Package #${index + 1}`,
              description: pkg.description || "",
              notes: pkg.notes || "",
              weight: pkgWeight,
              length: pkgLength,
              width: pkgWidth,
              height: pkgHeight,
              volumetricWeight: volumetricWeight,
              billableWeight: billableWeight,
              isUserEntered: true,
            };
          });

          // Update packages state
          setPackages(updatedPackages);
        }
      }
    } catch (error) {
      console.error("Error refreshing packages:", error);
    }
  };

  // Utility function to copy text to clipboard
  const copyToClipboard = (text: string | undefined, field: string) => {
    if (!text) return;

    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: "Copied!",
          description: `${field} copied to clipboard.`,
        });
      },
      (err) => {
        toast({
          title: "Copy failed",
          description: "Could not copy text to clipboard.",
          variant: "destructive",
        });
        console.error("Could not copy text: ", err);
      },
    );
  };

  // Calculate volumetric weight
  const calculateVolumetricWeight = (l: number, w: number, h: number) => {
    return (l * w * h) / 5000;
  };

  // Fetch shipment data
  const {
    data: shipment,
    isLoading: isLoadingShipment,
    isError: isErrorShipment,
    refetch,
  } = useQuery({
    queryKey: [`/api/shipments/${shipmentId}`],
    queryFn: async () => {
      if (!shipmentId) return null;

      const response = await apiRequest("GET", `/api/shipments/${shipmentId}`);
      const data = await response.json();

      // Process the data before returning - merge address fields
      if (data) {
        // Force clean the addresses for complete reliability
        const address1 = data.receiverAddress || "";
        const address2 = data.receiverAddress2 || "";

        // Check if we have both parts and they need combining
        if (address2 && address2.trim() !== "") {
          // Only merge if address2 is not already included in address1
          if (!address1.includes(address2)) {
            // Combine them with a comma separator
            const combinedAddress = `${address1}, ${address2}`;
            data.receiverAddress = combinedAddress;
          } else {
          }
          // Clear out address2 since it's now in address1
          data.receiverAddress2 = null;
        }
      }

      return data;
    },
    enabled: !!shipmentId,
    staleTime: 0, // Always consider data stale to force refetch
    refetchOnMount: true, // Refetch whenever component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    onSuccess: (data) => {
      // Initialize cost prices from shipment data
      if (data) {
        setCostPrices({
          basePrice: data.originalBasePrice || 0,
          fuelCharge: data.originalFuelCharge || 0,
          additionalFee: data.additionalFee || 0,
          totalPrice: data.originalTotalPrice || 0,
        });

        // Set form values from updated shipment data
        if (form) {
          // Additional step to ensure we're combining addresses correctly
          if (
            data.receiverAddress2 &&
            data.receiverAddress2 !== null &&
            data.receiverAddress2 !== ""
          ) {
            // Make sure we're not duplicating the data if it's already included
            if (!data.receiverAddress.includes(data.receiverAddress2)) {
              const combinedAddress = `${data.receiverAddress}, ${data.receiverAddress2}`;
              data.receiverAddress = combinedAddress;
            }
            // Always set receiverAddress2 to null since we're merging it
            data.receiverAddress2 = null;
          }

          // Log what we're setting in the form
          console.log(
            `[onSuccess] Final receiverAddress value: "${data.receiverAddress}"`,
          );

          form.reset(data);
        }
      }
    },
  });

  // Fetch shipment creator's data if shipment is loaded and userId exists
  const { data: shipmentCreator, isLoading: isLoadingCreator } = useQuery({
    queryKey: [`/api/users/${shipment?.userId}`],
    queryFn: async () => {
      if (!shipment?.userId) return null;
      const response = await apiRequest("GET", `/api/users/${shipment.userId}`);
      return response.json();
    },
    enabled: !!shipment?.userId && shipment.userId !== user?.id, // Only fetch if shipment and userId exist
  });

  // Credit limit check query
  const {
    data: creditLimitData,
    isLoading: isLoadingCreditLimit,
    isError: isErrorCreditLimit,
    refetch: refetchCreditLimit,
  } = useQuery({
    queryKey: [`/api/shipments/check-credit-limit/${shipmentId}`],
    queryFn: async () => {
      if (!shipmentId) return null;
      const response = await apiRequest(
        "GET",
        `/api/shipments/check-credit-limit/${shipmentId}`,
      );
      return response.json();
    },
    enabled: !!shipmentId,
    onSuccess: (data) => {
      if (data) {
        setCreditLimitCheck(data);
      }
    },
  });

  // Setup form
  const form = useForm<EditShipmentFormValues>({
    resolver: zodResolver(editShipmentSchema),
    defaultValues: {
      // Sender details
      senderName: "",
      senderAddress: "",
      senderCity: "",
      senderPostalCode: "",
      senderEmail: "",
      senderPhone: "",

      // Receiver details
      receiverName: "",
      receiverAddress: "",
      receiverAddress2: "",
      receiverCity: "",
      receiverPostalCode: "",
      receiverCountry: "",
      receiverPhone: "",
      receiverEmail: "",
      receiverState: "",

      // Package details
      packageWeight: 0,
      packageLength: 0,
      packageWidth: 0,
      packageHeight: 0,
      packageContents: "",
      pieceCount: 1,
      itemCount: 1,

      // Customs details
      gtip: "",
      iossNumber: "",
      customsValue: 0,
      currency: "USD",

      // Insurance details
      isInsured: false,
      insuranceValue: 0,
      insuranceCost: 0,

      // Service details
      serviceLevel: "",

      // Status
      status: ShipmentStatus.PENDING,
      rejectionReason: "",
    },
  });

  // Load package items from the API
  const { data: packageItems, isLoading: isLoadingPackageItems } = useQuery({
    queryKey: [`/api/shipments/${shipmentId}/items`],
    queryFn: async () => {
      if (!shipmentId) return [];

      try {
        // Fetch package items for this shipment using the correct endpoint
        const response = await fetch(`/api/shipments/${shipmentId}/items`, {
          credentials: "include", // This ensures cookies are sent with the request
          headers: {
            Accept: "application/json",
          },
        });

        if (response.ok) {
          const items = await response.json();

          // Process each item to ensure correct data types for proper display
          const processedItems = items.map((item) => {
            return {
              ...item,
              // Keep price in cents as received from API (will be displayed properly with /100 in UI)
              price: item.price || 0,
              // Ensure numeric values for dimensions and weights
              weight:
                typeof item.weight === "number"
                  ? item.weight
                  : parseFloat(String(item.weight || "0")),
              length:
                typeof item.length === "number"
                  ? item.length
                  : parseInt(String(item.length || "0")),
              width:
                typeof item.width === "number"
                  ? item.width
                  : parseInt(String(item.width || "0")),
              height:
                typeof item.height === "number"
                  ? item.height
                  : parseInt(String(item.height || "0")),
            };
          });

          return processedItems;
        }

        console.error("Error fetching items:", await response.text());
        return [];
      } catch (error) {
        console.error("Error fetching package items:", error);
        return [];
      }
    },
    enabled: !!shipmentId,
    staleTime: 0, // Always refetch to ensure we have the latest data
  });

  // Update form when shipment data is loaded
  useEffect(() => {
    if (shipment) {
      // Find the best GTIP value if we have package items
      let gtipValue = shipment.gtip || "";

      // Try to get GTIP from the highest priced item immediately (don't wait for the separate useEffect)
      if (packageItems && packageItems.length > 0) {
        // Sort items by total price (price * quantity) from highest to lowest
        const sortedItems = [...packageItems].sort((a, b) => {
          const aTotal = (a.price || 0) * (a.quantity || 1);
          const bTotal = (b.price || 0) * (b.quantity || 1);
          return bTotal - aTotal; // Descending order
        });

        // Get the GTIP (hsCode) from the highest priced item
        const highestPricedItem = sortedItems[0];

        // Check all possible field names for GTIP code
        const hsCode =
          highestPricedItem?.hsCode || highestPricedItem?.gtin || "";

        if (hsCode && hsCode.trim() !== "") {
          gtipValue = hsCode;
        } else {
          // Let's try an alternative approach by looking at all the properties
          const itemKeys = Object.keys(highestPricedItem || {});

          // Look for any property that might contain GTIP/HS code information
          const gtipRelatedFields = itemKeys.filter(
            (key) =>
              key.toLowerCase().includes("hs") ||
              key.toLowerCase().includes("gtip") ||
              key.toLowerCase().includes("code"),
          );

          if (gtipRelatedFields.length > 0) {
            // Use the first field that has a non-empty value
            for (const field of gtipRelatedFields) {
              const value = highestPricedItem[field];
              if (value && typeof value === "string" && value.trim() !== "") {
                gtipValue = value;
                break;
              }
            }
          }
        }
      }

      // Debug insurance field values
      const calculatedIsInsured = Boolean(
        shipment.isInsured ||
          (shipment.insuranceValue && shipment.insuranceValue > 0),
      );

      // Initialize insurance display value if insurance is enabled (use calculated value)
      if (calculatedIsInsured && shipment.insuranceValue > 0) {
        const displayValue = (shipment.insuranceValue / 100).toFixed(2);

        setInsuranceDisplayValue(displayValue);
      } else {
        setInsuranceDisplayValue("");
      }

      form.reset({
        // Sender details
        senderName: shipment.senderName || "",
        senderAddress: shipment.senderAddress || "",
        senderCity: shipment.senderCity || "",
        senderPostalCode: shipment.senderPostalCode || "",
        senderEmail: shipment.senderEmail || "",
        senderPhone: shipment.senderPhone || "",

        // Receiver details
        receiverName: shipment.receiverName,
        receiverAddress: shipment.receiverAddress,
        receiverAddress2: shipment.receiverAddress2 || "",
        receiverCity: shipment.receiverCity,
        receiverPostalCode: shipment.receiverPostalCode,
        receiverCountry: convertCountryNameToCode(shipment.receiverCountry),
        receiverPhone: shipment.receiverPhone,
        receiverEmail: shipment.receiverEmail,
        receiverState: shipment.receiverState || "",

        // Package details
        packageWeight: shipment.packageWeight,
        packageLength: shipment.packageLength,
        packageWidth: shipment.packageWidth,
        packageHeight: shipment.packageHeight,

        // New custom fields
        packageContents: shipment.packageContents || "",
        pieceCount: shipment.pieceCount || 1,
        itemCount: shipment.customsItemCount || packageItems?.length || 1, // Use customs item count from DB, fallback to items length
        gtip: gtipValue || shipment.gtip || "", // Use our determined GTIP value or shipment's GTIP
        iossNumber: shipment.iossNumber || "", // IOSS number for EU shipments
        customsValue:
          shipment.customsValue ||
          (shipment.packageValue ? shipment.packageValue / 100 : 0), // Convert from cents if needed
        currency: shipment.currency || "USD",

        // Insurance details - Use Boolean evaluation to handle cases where database flag is incorrect
        isInsured: Boolean(
          shipment.isInsured ||
            (shipment.insuranceValue && shipment.insuranceValue > 0),
        ),
        insuranceValue: shipment.insuranceValue || 0,
        insuranceCost: shipment.insuranceCost || 0,

        // Original fields - Initialize admin dropdown as empty (no default service)
        serviceLevel: "",
        basePrice: shipment.basePrice,
        fuelCharge: shipment.fuelCharge || 0, // Fuel charge is separate from taxes
        additionalFee: shipment.additionalFee || 0, // Additional fees not affected by multiplier
        taxes: shipment.taxes || 0, // Keep taxes separate from fuel charge
        totalPrice: shipment.totalPrice,
        status: shipment.status,
        rejectionReason: shipment.rejectionReason || "",

        // Original cost prices - CRITICAL FIX
        originalBasePrice: shipment.originalBasePrice,
        originalFuelCharge: shipment.originalFuelCharge,
        originalAdditionalFee: shipment.originalAdditionalFee || 0,
        originalTotalPrice: shipment.originalTotalPrice,
        appliedMultiplier: shipment.appliedMultiplier,
      });

      // Initialize insurance display value for proper input field handling
      const initialInsuranceValue = shipment.insuranceValue || 0;
      if (initialInsuranceValue > 0) {
        const displayValue = (initialInsuranceValue / 100).toFixed(2);
        setInsuranceDisplayValue(displayValue);
      } else {
        setInsuranceDisplayValue("");
      }

      // Mark form as initialized to prevent automatic price calculations
      setFormInitialized(true);

      // Create packages based on actual shipment data
      const shipmentPackages = [];

      // Check if the shipment has packages data
      if (
        shipment.packages &&
        Array.isArray(shipment.packages) &&
        shipment.packages.length > 0
      ) {
        // Use the packages data from the shipment
        shipment.packages.forEach((pkg, index) => {
          try {
            // Extract dimensions and weights - ensure they're converted to numbers
            const pkgWeight =
              typeof pkg.weight === "number"
                ? pkg.weight
                : pkg.weight
                  ? parseFloat(String(pkg.weight))
                  : 0;

            const pkgLength =
              typeof pkg.length === "number"
                ? pkg.length
                : pkg.length
                  ? parseFloat(String(pkg.length))
                  : 0;

            const pkgWidth =
              typeof pkg.width === "number"
                ? pkg.width
                : pkg.width
                  ? parseFloat(String(pkg.width))
                  : 0;

            const pkgHeight =
              typeof pkg.height === "number"
                ? pkg.height
                : pkg.height
                  ? parseFloat(String(pkg.height))
                  : 0;

            const volumetricWeight = calculateVolumetricWeight(
              pkgLength,
              pkgWidth,
              pkgHeight,
            );
            const billableWeight = Math.max(pkgWeight, volumetricWeight);

            // Create a package object using the actual package data from the shipment
            shipmentPackages.push({
              id: pkg.id || index,
              name: pkg.name || `Package #${index + 1}`,
              description: pkg.description || "",
              notes: pkg.notes || "",
              weight: pkgWeight,
              length: pkgLength,
              width: pkgWidth,
              height: pkgHeight,
              volumetricWeight: volumetricWeight,
              billableWeight: billableWeight,
              isUserEntered: true,
            });
          } catch (error) {
            console.error(`Error processing package #${index}:`, error, pkg);
          }
        });
      } else {
        // Fallback to main package data from the shipment if no packages array

        // Get piece count from the shipment data
        const pieceCount = shipment.pieceCount || 1;

        // Add a special note that explains what's happening when we have multiple packages
        // but only one set of dimensions
        const explanationNote =
          pieceCount > 1
            ? "Note: These are identical physical packages created based on the piece count you entered. " +
              "The original dimensions and weight you entered apply to each package."
            : "";

        // Create as many packages as the pieceCount value indicates
        for (let i = 0; i < pieceCount; i++) {
          const packageWeight = shipment.packageWeight || 0;
          const packageLength = shipment.packageLength || 0;
          const packageWidth = shipment.packageWidth || 0;
          const packageHeight = shipment.packageHeight || 0;

          const volumetricWeight = calculateVolumetricWeight(
            packageLength,
            packageWidth,
            packageHeight,
          );

          const billableWeight = Math.max(packageWeight, volumetricWeight);

          shipmentPackages.push({
            id: i + 1,
            name: pieceCount === 1 ? "Main Package" : `Package #${i + 1}`,
            weight: packageWeight,
            length: packageLength,
            width: packageWidth,
            height: packageHeight,
            volumetricWeight: volumetricWeight,
            billableWeight: billableWeight,
            isUserEntered: true,
            description: i === 0 && explanationNote ? explanationNote : "",
            notes: "",
          });
        }
      }

      // If we have package items data available (product contents), we can link them to packages
      // but we don't use them as the primary package display

      setPackages(shipmentPackages);
    }
  }, [shipment, form, packageItems]);

  // Fallback useEffect for GTIP auto-population in case items load after initial form setup
  useEffect(() => {
    // Only run this if the form's current gtip value is empty (indicating the initial useEffect didn't set it)
    const currentGtipValue = form.getValues("gtip");

    // Skip this useEffect if we already have a GTIP value
    if (currentGtipValue && currentGtipValue.trim() !== "") {
      return;
    }

    // Only process if we have package items and they're loaded
    if (packageItems && packageItems.length > 0) {
      // Sort items by total price (price * quantity) from highest to lowest
      const sortedItems = [...packageItems].sort((a, b) => {
        const aTotal = (a.price || 0) * (a.quantity || 1);
        const bTotal = (b.price || 0) * (b.quantity || 1);
        return bTotal - aTotal; // Descending order
      });

      // Get the GTIP (hsCode) from the highest priced item
      const highestPricedItem = sortedItems[0];

      // Check all possible field names for GTIP code
      const hsCode = highestPricedItem?.hsCode || highestPricedItem?.gtin || "";

      // Only update if hsCode exists and is not empty
      if (hsCode && hsCode.trim() !== "") {
        // Use setValue instead of modifying the form values directly
        form.setValue("gtip", hsCode);
      } else {
        // Let's try an alternative approach by looking at all the properties
        const itemKeys = Object.keys(highestPricedItem || {});

        // Look for any property that might contain GTIP/HS code information
        const gtipRelatedFields = itemKeys.filter(
          (key) =>
            key.toLowerCase().includes("hs") ||
            key.toLowerCase().includes("gtip") ||
            key.toLowerCase().includes("code"),
        );

        if (gtipRelatedFields.length > 0) {
          // Use the first field that has a non-empty value
          for (const field of gtipRelatedFields) {
            const value = highestPricedItem[field];
            if (value && typeof value === "string" && value.trim() !== "") {
              form.setValue("gtip", value);

              break;
            }
          }
        }
      }
    }
  }, [packageItems, form]);

  // State to track if form has been initialized to prevent automatic price calculation on load
  const [formInitialized, setFormInitialized] = useState(false);
  const [userModifiedFields, setUserModifiedFields] = useState(false);

  // Watch for form changes to recalculate price
  const weight = form.watch("packageWeight");
  const length = form.watch("packageLength");
  const width = form.watch("packageWidth");
  const height = form.watch("packageHeight");
  const serviceLevel = form.watch("serviceLevel");

  // Check if this shipment was created via bulk upload
  // More comprehensive detection - check multiple fields that indicate bulk upload
  const isBulkUploadedShipment =
    shipment?.shippingProvider === "bulk-upload" ||
    shipment?.carrierName === "Bulk Upload" ||
    shipment?.notes?.includes("Bulk uploaded") ||
    shipment?.notes?.includes("bulk upload") ||
    shipment?.notes?.includes("Bulk") ||
    // Check if shipment ID is in the recent bulk upload range (adjust as needed)
    (shipment?.id !== undefined && shipment.id >= 630); // Most recent bulk uploads start from around 630+

  // Security: Removed debug logging to prevent data exposure

  // Track dimension changes to detect user modifications
  useEffect(() => {
    if (formInitialized && shipment) {
      // Skip ALL automatic processing for bulk uploaded shipments
      if (isBulkUploadedShipment) {
        return;
      }

      // Additional safety check with shipment ID range for recent bulk uploads
      if (shipment?.id && shipment.id >= 630) {
        return;
      }

      // Check if user has actually modified any fields
      const hasUserModified =
        weight !== shipment.packageWeight ||
        length !== shipment.packageLength ||
        width !== shipment.packageWidth ||
        height !== shipment.packageHeight ||
        serviceLevel !== shipment.serviceLevel;

      if (hasUserModified) {
        setUserModifiedFields(true);
      }
    }
  }, [
    weight,
    length,
    width,
    height,
    serviceLevel,
    formInitialized,
    shipment,
    isBulkUploadedShipment,
  ]);

  // Calculate the billable weight (greater of actual weight vs volumetric weight)
  const volumetricWeight =
    length && width && height
      ? calculateVolumetricWeight(length, width, height)
      : 0;

  const billableWeight = Math.max(weight || 0, volumetricWeight);

  // State to track original pricing before applying multiplier
  const [costPrices, setCostPrices] = useState({
    basePrice: 0,
    fuelCharge: 0,
    additionalFee: 0,
    totalPrice: 0,
  });

  // State to track multiple packages
  const [packages, setPackages] = useState<
    {
      id: number;
      name?: string;
      description?: string;
      notes?: string;
      weight: number;
      length: number;
      width: number;
      height: number;
      volumetricWeight: number;
      billableWeight: number;
      isUserEntered?: boolean;
      quantity?: number;
      price?: number;
      hsCode?: string;
      countryOfOrigin?: string;
      gtin?: string;
    }[]
  >([]);

  // Function to calculate price based on current package details
  const calculatePrice = async (
    event?: React.MouseEvent,
    forceCalculation = false,
    useAdminSelectedService = false,
  ) => {
    // Prevent form submission if this is triggered by a button click
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // CRITICAL: DISABLE ALL AUTOMATIC PRICE CALCULATIONS
    // Only allow manual calculations when admin explicitly clicks "Recalculate Price" button
    if (!forceCalculation) {
      return;
    } else {
      // This is a forced calculation (manual admin action via button click)
    }

    try {
      // Calculate total billable weight from all packages
      let totalBillableWeight = 0;

      // For each package, get its billable weight and add to the total
      packages.forEach((pkg) => {
        const pkgBillableWeight =
          typeof pkg.billableWeight === "number" ? pkg.billableWeight : 0;
        totalBillableWeight += pkgBillableWeight;
      });

      // If no packages or billable weight is 0, fall back to form values
      if (totalBillableWeight === 0 || packages.length === 0) {
        // Fall back to package dimensions from form
        const packageLength = form.getValues("packageLength") || 0;
        const packageWidth = form.getValues("packageWidth") || 0;
        const packageHeight = form.getValues("packageHeight") || 0;
        const packageWeight = form.getValues("packageWeight") || 0;

        // Calculate volumetric weight
        const volumetricWeight = calculateVolumetricWeight(
          packageLength,
          packageWidth,
          packageHeight,
        );

        // Use max of actual or volumetric
        totalBillableWeight = Math.max(packageWeight, volumetricWeight);
      }

      // Get all the required values from the form
      // For dimensions, prioritize the values from the packages array over form values
      // This ensures we use the latest package dimensions after edits
      let packageLength = form.getValues("packageLength");
      let packageWidth = form.getValues("packageWidth");
      let packageHeight = form.getValues("packageHeight");

      // If we have exactly one package, use its dimensions directly
      if (packages.length === 1) {
        const pkg = packages[0];
        packageLength =
          typeof pkg.length === "number" ? pkg.length : packageLength;
        packageWidth = typeof pkg.width === "number" ? pkg.width : packageWidth;
        packageHeight =
          typeof pkg.height === "number" ? pkg.height : packageHeight;
      }

      // SERVICE SELECTION LOGIC: Two different behaviors based on button clicked
      let serviceToUse;

      if (useAdminSelectedService) {
        // USE ADMIN'S CURRENTLY SELECTED SERVICE FROM DROPDOWN
        // Note: serviceLevel field now contains serviceName values (e.g., "widect")
        const currentServiceLevel = form.getValues("serviceLevel");
        console.log(
          "🎯 ADMIN CALCULATE PRICE: useAdminSelectedService=true, getting serviceLevel from form:",
          currentServiceLevel,
        );

        if (!currentServiceLevel) {
          toast({
            title: "No Service Selected",
            description: "Please select a service from the dropdown first.",
            variant: "destructive",
          });
          return;
        }

        serviceToUse = currentServiceLevel;
        console.log(
          "🎯 ADMIN CALCULATE PRICE: Using admin selected service:",
          serviceToUse,
        );
      } else {
        // USE CUSTOMER'S ORIGINAL SERVICE FOR MANUAL RECALCULATIONS
        // For bulk uploaded shipments, carrierName contains the customer's actual choice
        // For regular shipments, selectedService contains the serviceName
        if (
          shipment?.carrierName &&
          shipment.carrierName !== shipment.selectedService
        ) {
          // Customer selected a display name like "MoogShip GLS Eco"
          serviceToUse = shipment.carrierName;
        } else {
          // Use the stored selectedService
          serviceToUse = shipment?.selectedService;
        }

        // Fallback if customer's original service is not available
        if (!serviceToUse) {
          serviceToUse = shipment?.providerServiceCode || "standard";
        }
      }

      // Enhanced request data to get pricing for customer's selected service
      const requestData = {
        senderPostalCode: form.getValues("senderPostalCode") || "34001",
        senderCity: form.getValues("senderCity") || "Istanbul",
        receiverPostalCode: form.getValues("receiverPostalCode"),
        receiverCity: form.getValues("receiverCity"),
        receiverCountry: form.getValues("receiverCountry"),
        packageLength: packageLength,
        packageWidth: packageWidth,
        packageHeight: packageHeight,
        packageWeight: totalBillableWeight,
        serviceLevel: (() => {
          // Map the serviceToUse (which is now correctly prioritized) to service level
          const lowerServiceToUse = String(serviceToUse).toLowerCase();

          // Map specific service codes to service levels
          if (
            lowerServiceToUse.includes("eco") ||
            lowerServiceToUse.includes("gls") ||
            lowerServiceToUse.includes("standard") ||
            lowerServiceToUse.includes("widect")
          ) {
            return "standard";
          } else if (
            lowerServiceToUse.includes("express") ||
            lowerServiceToUse.includes("ups")
          ) {
            return "express";
          } else if (lowerServiceToUse.includes("priority")) {
            return "priority";
          }

          // Fallback to current service level if it's valid
          const currentServiceLevel = form.getValues("serviceLevel");
          if (
            currentServiceLevel &&
            ["standard", "express", "priority"].includes(currentServiceLevel)
          ) {
            return currentServiceLevel;
          }

          return "standard"; // safe default
        })(),
        pieceCount: form.getValues("pieceCount") || packages.length || 1,
        userId: shipment?.userId,
        // Include customer's selected service for targeted pricing
        selectedService: serviceToUse,
        // CRITICAL: Add useCustomerService flag for customer recalculation
        useCustomerService: !useAdminSelectedService,
        // Include shipment's original service data for customer recalculation
        originalSelectedService: shipment?.selectedService,
        originalServiceLevel: shipment?.serviceLevel,
        originalShippingProvider: shipment?.shippingProvider,
        originalCarrierName: shipment?.carrierName,
      };

      // Call pricing API to get updated price for customer's service
      const response = await fetch("/api/calculate-price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Price calculation API error:", errorText);
        throw new Error(errorText || "Failed to calculate price");
      }

      const priceResult = await response.json();
      
      // Debug log to see the actual API response structure
      console.log("🎯 API Response pricing options:", priceResult);
      if (priceResult.options && priceResult.options[0]) {
        console.log("🎯 First option fields:", Object.keys(priceResult.options[0]));
        console.log("🎯 First option data:", priceResult.options[0]);
      }

      // Store all pricing options for the service dropdown
      setPricingOptions(priceResult);

      // Set the admin dropdown to the customer's original service for proper initialization
      if (!useAdminSelectedService && shipment?.selectedService) {
        form.setValue("serviceLevel", shipment.selectedService);
      }

      // Find the pricing option that matches admin's selected service or customer's original service
      let selectedPricing = null;
      if (priceResult.options && priceResult.options.length > 0) {
        if (serviceToUse) {
          // Use serviceName as primary identifier to avoid duplicate ID conflicts
          selectedPricing = priceResult.options.find(
            (option) =>
              option.serviceName === serviceToUse ||
              option.providerServiceCode === serviceToUse ||
              option.displayName === serviceToUse,
          );

          // If no exact match found, customer's original service is not available
          if (!selectedPricing) {
          }
        }

        // If no exact match or no service specified, use the first option as fallback
        if (!selectedPricing) {
          selectedPricing = priceResult.options[0];
        } else {
        }
      }

      if (!selectedPricing) {
        throw new Error("No pricing options available for selected service");
      }

      // Store original cost prices (raw API costs) - shown in "Our Cost Price" section
      const rawBasePrice = selectedPricing.cargoPrice || selectedPricing.originalBasePrice || 0;
      const rawFuelCharge = selectedPricing.fuelCost || selectedPricing.originalFuelCharge || 0;
      
      // Use the additionalFee from the selected pricing option (from API)
      // This ensures we use the correct fee for the selected service
      const apiAdditionalFee = selectedPricing.additionalFee || 0;
      
      // Calculate raw total price including additional fee
      const rawTotalPrice = rawBasePrice + rawFuelCharge + apiAdditionalFee;
      
      setCostPrices({
        basePrice: rawBasePrice,
        fuelCharge: rawFuelCharge,
        additionalFee: apiAdditionalFee,
        totalPrice: rawTotalPrice,
      });

      // Get the user's price multiplier for customer pricing
      const userMultiplier = shipmentCreator?.priceMultiplier || 1;
      
      // Calculate customer prices (raw costs × multiplier) - shown in "Customer Price" section
      // Note: additionalFee is NOT multiplied as it's a pass-through fee
      const customerBasePrice = Math.round(rawBasePrice * userMultiplier);
      const customerFuelCharge = Math.round(rawFuelCharge * userMultiplier);
      const customerTotalPrice = customerBasePrice + customerFuelCharge + apiAdditionalFee;
      
      // Preserve existing taxes value (don't overwrite during recalculation)
      const existingTaxes = form.getValues("taxes") || shipment?.taxes || 0;
      
      // Update form with customer prices (multiplied values)
      form.setValue("basePrice", customerBasePrice);
      form.setValue("fuelCharge", customerFuelCharge);
      form.setValue("additionalFee", apiAdditionalFee); // Use additionalFee from API
      form.setValue("taxes", existingTaxes); // Preserve taxes - not changed by recalculation
      form.setValue("totalPrice", customerTotalPrice);
      form.setValue("packageWeight", totalBillableWeight);

      // CRITICAL FIX: Update the original cost prices in the form
      form.setValue("originalBasePrice", rawBasePrice);
      form.setValue("originalFuelCharge", rawFuelCharge);
      form.setValue("originalAdditionalFee", apiAdditionalFee); // Same as additionalFee (not multiplied)
      form.setValue("originalTotalPrice", rawTotalPrice);
      form.setValue(
        "appliedMultiplier",
        selectedPricing.appliedMultiplier || userMultiplier,
      );

      // CRITICAL FIX: Price recalculation should NEVER save to database
      // It should only update the form fields temporarily for display

      // Just update the form display values - do NOT save to database
      // The database will only be updated when "Update Shipment" button is clicked
      if (shipmentId) {
        // These values are just for display - they will NOT be saved to database
        const temporaryPricing = {
          basePrice: selectedPricing.basePrice,
          fuelCharge: selectedPricing.fuelCharge,
          totalPrice: selectedPricing.totalPrice,
          appliedMultiplier: selectedPricing.appliedMultiplier,
          packageWeight: totalBillableWeight,
          packageLength: packageLength,
          packageWidth: packageWidth,
          packageHeight: packageHeight,
          selectedService:
            selectedPricing.providerServiceCode ||
            selectedPricing.serviceCode ||
            serviceToUse,
          providerServiceCode:
            selectedPricing.providerServiceCode || selectedPricing.serviceCode,
        };

        // NO DATABASE UPDATE - just display the values temporarily in the form
        // The database will only be updated when the "Update Shipment" button is clicked
      }

      // Simple success message for price recalculation (no database update, no balance changes)
      const priceBreakdown = apiAdditionalFee > 0 
        ? ` (includes ${formatPrice(apiAdditionalFee)} additional fee)`
        : "";
      toast({
        title: "Price Recalculated",
        description: `Customer price: ${formatPrice(customerTotalPrice)}${priceBreakdown} (${totalBillableWeight.toFixed(2)} kg) - Click 'Update Shipment' to save changes`,
      });

      // Refresh the credit limit check data after price update
      if (refetchCreditLimit) {
        refetchCreditLimit();
      }
    } catch (error) {
      console.error("Error calculating price:", error);
      toast({
        title: "Price Calculation Error",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!shipmentId) throw new Error("Shipment ID is required");

      try {
        const response = await apiRequest(
          "POST",
          `/api/shipments/${shipmentId}/cancel`,
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Cancellation failed:", errorData);
          throw new Error(errorData.message || "Failed to cancel shipment");
        }

        return response.json();
      } catch (error) {
        console.error("Cancellation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Shipment Cancelled",
        description: `Shipment #${shipmentId} has been cancelled successfully.`,
      });
      // Redirect to the appropriate page based on user role
      setLocation(
        user?.role === "admin" ? "/admin-shipments" : "/my-shipments",
      );
    },
    onError: (error) => {
      toast({
        title: "Cancellation Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (params: {
      data: EditShipmentFormValues;
      __redirectAfterUpdate?: boolean;
    }) => {
      if (!shipmentId) throw new Error("Shipment ID is required");

      const { data } = params;

      // Ensure all numeric fields are actually numbers
      const numericFields = [
        "packageLength",
        "packageWidth",
        "packageHeight",
        "packageWeight",
      ];
      numericFields.forEach((field) => {
        if (data[field as keyof typeof data] !== undefined) {
          const value = data[field as keyof typeof data];
          if (typeof value === "string") {
            (data as any)[field] = Number(value);
          }
        }
      });

      try {
        // CRITICAL FIX: Add __priceUpdate flag for admin price updates
        const requestData = {
          ...data,
          __priceUpdate: true, // Always set this for admin updates to ensure proper price handling
        };

        // Direct fetch approach for better control and debugging
        const response = await fetch(`/api/shipments/${shipmentId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });

        // Clone response for multiple reads if needed
        const responseClone = response.clone();

        if (!response.ok) {
          // Handle error response
          let errorMessage = "Failed to update shipment";
          try {
            const errorData = await responseClone.json();
            console.error("[UPDATE MUTATION] Error details:", errorData);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            console.error(
              "[UPDATE MUTATION] Could not parse error response:",
              e,
            );
          }
          throw new Error(errorMessage);
        }

        // Parse and return successful response
        try {
          const jsonResponse = await response.json();

          return jsonResponse;
        } catch (e) {
          console.error("[UPDATE MUTATION] Error parsing success response:", e);
          // Return empty object if we can't parse the response
          return {};
        }
      } catch (error) {
        console.error("[UPDATE MUTATION] Exception:", error);
        throw error;
      }
    },
    onSuccess: (response, variables) => {
      // Check if this was a price update with balance adjustment
      if (
        response &&
        typeof response === "object" &&
        response.balanceAdjustmentMade
      ) {
        // Check if this was a refund due to status change
        if (
          response.balanceAdjustmentAmount > 0 &&
          response.balanceAdjustmentMessage?.includes("refund")
        ) {
          toast({
            title: "Shipment Updated & Refund Processed",
            description: `Shipment updated successfully. User refunded $${(response.balanceAdjustmentAmount / 100).toFixed(2)} due to status change.`,
            variant: "default",
          });
        } else {
          toast({
            title: "Price Updated & Balance Adjusted",
            description:
              response.balanceAdjustmentMessage ||
              `Shipment price updated. User balance adjusted by $${(response.balanceAdjustmentAmount / 100).toFixed(2)}.`,
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Shipment Updated",
          description: "The shipment has been successfully updated.",
        });
      }

      // Invalidate the shipment query to refetch the data
      queryClient.invalidateQueries({
        queryKey: [`/api/shipments/${shipmentId}`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] }); // Refresh balance if it was adjusted

      // Only redirect if this was a full form submission, not a package dimension update
      if (variables.__redirectAfterUpdate !== false) {
        setLocation(
          user?.role === "admin" ? "/admin-shipments" : "/my-shipments",
        );
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update shipment",
        variant: "destructive",
      });
    },
  });

  // Invoice upload handler
  const handleInvoiceUpload = async (file: File) => {
    if (!shipmentId) return;

    setIsUploadingInvoice(true);
    const formData = new FormData();
    formData.append("invoice", file);

    try {
      const response = await fetch(
        `/api/shipments/${shipmentId}/upload-invoice`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        },
      );

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: "Invoice uploaded successfully!",
        });

        // Refresh shipment data to show the uploaded invoice
        queryClient.invalidateQueries({
          queryKey: [`/api/shipments/${shipmentId}`],
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to upload invoice",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error uploading invoice:", error);
      toast({
        title: "Error",
        description: "Failed to upload invoice",
        variant: "destructive",
      });
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  // Invoice delete handler
  const handleInvoiceDelete = async () => {
    if (!shipmentId) return;

    setIsDeletingInvoice(true);

    try {
      const response = await fetch(
        `/api/shipments/${shipmentId}/delete-invoice`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "Invoice deleted successfully!",
        });

        // Refresh shipment data to remove the invoice indicator
        queryClient.invalidateQueries({
          queryKey: [`/api/shipments/${shipmentId}`],
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to delete invoice",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    } finally {
      setIsDeletingInvoice(false);
    }
  };

  // Submit handler
  const onSubmit = async (data: EditShipmentFormValues) => {
    // Log the values being submitted

    // Get the complete form state by reading from all registered fields
    const allFieldValues = form.getValues();

    // If receiverAddress2 exists, combine it with receiverAddress and set receiverAddress2 to null
    if (data.receiverAddress2) {
      data.receiverAddress = `${data.receiverAddress}, ${data.receiverAddress2}`;
      (data as any).receiverAddress2 = null;
    }

    // Make sure receiverEmail has a default value
    if (!data.receiverEmail || data.receiverEmail.trim() === "") {
      data.receiverEmail = "info@moogship.com";
    }

    // Include the original cost price values from state if available
    if (costPrices.basePrice > 0) {
      (data as any).originalBasePrice = costPrices.basePrice;
      (data as any).originalFuelCharge = costPrices.fuelCharge;
      (data as any).originalTotalPrice = costPrices.totalPrice;
    }

    // If the price calculated earlier provided a multiplier value, include it
    if (allFieldValues.hasOwnProperty("appliedMultiplier")) {
      (data as any).appliedMultiplier = (
        allFieldValues as any
      ).appliedMultiplier;
    }

    // Fix: Copy itemCount to customsItemCount field for database storage
    if (data.itemCount) {
      (data as any).customsItemCount = data.itemCount;
    }

    if (data.gtip !== undefined) {
      // Ensure the gtip property is explicitly included in the request
      data.gtip = data.gtip || ""; // Use empty string if null/undefined
    } else {
      // If somehow gtip is missing from data, get it from form values
      const gtipFromForm = form.getValues("gtip");
      if (gtipFromForm) {
        data.gtip = gtipFromForm;
      }
    }

    // Make sure numeric values are properly converted to numbers
    const numericFields = [
      "packageLength",
      "packageWidth",
      "packageHeight",
      "packageWeight",
    ];
    numericFields.forEach((field) => {
      if (data[field as keyof typeof data] !== undefined) {
        const numValue = Number(data[field as keyof typeof data]);
        if (!isNaN(numValue)) {
          (data as any)[field] = numValue;
        }
      }
    });

    try {
      // Use direct fetch to have more control
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const responseData = await response.json();

        toast({
          description: "The shipment has been successfully updated.",
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({
          queryKey: [`/api/shipments/${shipmentId}`],
        });
        queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/shipments/my"] });

        // Redirect back to the listing page
        setLocation(
          user?.role === "admin" ? "/admin-shipments" : "/my-shipments",
        );
      } else {
        let errorMessage = "Failed to update shipment";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error("[FORM SUBMIT] Failed to parse error response:", e);
        }

        console.error(`[FORM SUBMIT] Error: ${errorMessage}`);
        toast({
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[FORM SUBMIT] Exception:", error);
      toast({
        description:
          error instanceof Error ? error.message : "Failed to update shipment",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout user={user} hideMobileActions={true}>
      <div className="container mx-auto py-6">
        <Card className="bg-white rounded-lg shadow-md">
          <CardHeader className="border-b border-gray-100">
            <div className="flex justify-between items-center">
              {/* Desktop header */}
              <div className="hidden md:flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-2"
                  onClick={() =>
                    setLocation(
                      user?.role === "admin"
                        ? "/admin-shipments"
                        : "/my-shipments",
                    )
                  }
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">
                    Edit Shipment {shipmentId}
                  </CardTitle>
                  <CardDescription className="text-gray-500">
                    Update shipping details and recipient information
                  </CardDescription>
                </div>
              </div>

              {/* Mobile header - simplified without extra icons */}
              <div className="md:hidden flex-1">
                <div className="flex items-center mb-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mr-2 -ml-3 h-9 w-9"
                    onClick={() =>
                      setLocation(
                        user?.role === "admin"
                          ? "/admin-shipments"
                          : "/my-shipments",
                      )
                    }
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                  </Button>
                  <CardTitle className="text-lg font-semibold">
                    Edit Shipment {shipmentId}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-gray-500">
                  Update shipping details and recipient information
                </CardDescription>
              </div>

              {shipment?.status && (
                <div>
                  <Badge
                    className={
                      shipment.status === ShipmentStatus.APPROVED
                        ? "bg-green-100 text-green-800"
                        : shipment.status === ShipmentStatus.REJECTED
                          ? "bg-red-100 text-red-800"
                          : shipment.status === ShipmentStatus.IN_TRANSIT
                            ? "bg-blue-100 text-blue-800"
                            : shipment.status === ShipmentStatus.DELIVERED
                              ? "bg-purple-100 text-purple-800"
                              : shipment.status === ShipmentStatus.CANCELLED
                                ? "bg-gray-100 text-gray-800"
                                : "bg-amber-100 text-amber-800"
                    }
                  >
                    {shipment.status}
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>

          {/* Approved Shipment Warning */}
          {shipment?.status === ShipmentStatus.APPROVED && (
            <div className="px-6 py-3 border-b border-gray-100">
              <div className="flex items-start gap-3 rounded-md p-3 bg-amber-50 border border-amber-100 text-amber-800">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-800">
                    Shipment is Approved
                  </h3>
                  <p className="text-amber-700 text-sm">
                    This shipment has been approved and cannot be modified. You
                    can only view the details.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Credit Limit Check */}
          {creditLimitData && (
            <div className="px-6 py-3 border-b border-gray-100">
              <div
                className={`flex items-start gap-3 rounded-md p-3 ${
                  creditLimitData.exceeds
                    ? "bg-red-50 border border-red-100 text-red-800"
                    : "bg-green-50 border border-green-100 text-green-800"
                }`}
              >
                <div className="mt-0.5">
                  {creditLimitData.exceeds ? (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Check className="h-5 w-5 text-green-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex flex-col gap-1">
                    <div className="font-medium">
                      {creditLimitData.exceeds
                        ? "Credit Limit Warning"
                        : "Credit Limit Check Passed"}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-1 text-sm">
                      <div>
                        <span className="font-medium">Balance:</span>
                        <br />
                        {creditLimitData.formattedUserBalance}
                      </div>
                      <div>
                        <span className="font-medium">Minimum Required:</span>
                        <br />
                        {creditLimitData.formattedMinBalance}
                      </div>
                      {creditLimitData.exceeds && (
                        <div>
                          <span className="font-medium">Amount Exceeded:</span>
                          <br />
                          {creditLimitData.formattedExceededAmount}
                        </div>
                      )}
                    </div>
                    {creditLimitData.exceeds && (
                      <p className="text-sm mt-1">
                        This shipment's price (
                        {creditLimitData.formattedShipmentPrice}) would reduce
                        the user's balance below their minimum balance
                        threshold.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <CardContent className="p-4">
            {isLoadingShipment ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-500">
                  Loading shipment details...
                </span>
              </div>
            ) : isErrorShipment ? (
              <div className="text-center py-10">
                <h3 className="text-lg font-medium text-gray-900">
                  Error Loading Shipment
                </h3>
                <p className="text-gray-500 mt-1">
                  There was a problem fetching the shipment details.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() =>
                    setLocation(
                      user?.role === "admin"
                        ? "/admin-shipments"
                        : "/my-shipments",
                    )
                  }
                >
                  Return to Shipments
                </Button>
              </div>
            ) : shipment ? (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  {/* Summary Info Card with Sender Information */}
                  <div className="grid md:grid-cols-2 gap-4 text-sm p-4 bg-blue-50/50 rounded-md border border-blue-100/50 mb-4">
                    <div className="space-y-2">
                      <div className="font-medium text-gray-700 border-b pb-1 mb-1">
                        Shipment Details
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                        <div className="text-gray-500">ID:</div>
                        <div className="font-medium">{shipment.id}</div>

                        <div className="text-gray-500">User ID:</div>
                        <div className="font-medium">{shipment.userId}</div>

                        <div className="text-gray-500">Created:</div>
                        <div className="font-medium">
                          {formatDate(shipment.createdAt)}
                        </div>

                        {shipment.trackingNumber && (
                          <>
                            <div className="text-gray-500">
                              Tracking Number:
                            </div>
                            <div className="font-medium flex items-center group">
                              {shipment.trackingNumber}
                              <Copy
                                className="h-3.5 w-3.5 ml-1.5 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                                onClick={() =>
                                  copyToClipboard(
                                    shipment.trackingNumber,
                                    "Tracking Number",
                                  )
                                }
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="font-medium text-gray-700 border-b pb-1 mb-1">
                        Sender Information
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                        <div className="text-gray-500">Name:</div>
                        <div className="font-medium flex items-center group">
                          {form.getValues("senderName") || "N/A"}
                          {form.getValues("senderName") && (
                            <Copy
                              className="h-3.5 w-3.5 ml-1.5 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                              onClick={() =>
                                copyToClipboard(
                                  form.getValues("senderName"),
                                  "Sender Name",
                                )
                              }
                            />
                          )}
                        </div>

                        <div className="text-gray-500">Phone:</div>
                        <div className="font-medium flex items-center group">
                          {form.getValues("senderPhone") || "N/A"}
                          {form.getValues("senderPhone") && (
                            <Copy
                              className="h-3.5 w-3.5 ml-1.5 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                              onClick={() =>
                                copyToClipboard(
                                  form.getValues("senderPhone"),
                                  "Sender Phone",
                                )
                              }
                            />
                          )}
                        </div>

                        <div className="text-gray-500">Email:</div>
                        <div className="font-medium flex items-center group">
                          {form.getValues("senderEmail") || "N/A"}
                          {form.getValues("senderEmail") && (
                            <Copy
                              className="h-3.5 w-3.5 ml-1.5 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                              onClick={() =>
                                copyToClipboard(
                                  form.getValues("senderEmail"),
                                  "Sender Email",
                                )
                              }
                            />
                          )}
                        </div>

                        <div className="text-gray-500">Address:</div>
                        <div
                          className="font-medium flex items-center truncate group"
                          title={form.getValues("senderAddress") || "N/A"}
                        >
                          <span className="truncate">
                            {form.getValues("senderAddress") || "N/A"}
                          </span>
                          {form.getValues("senderAddress") && (
                            <Copy
                              className="h-3.5 w-3.5 ml-1.5 flex-shrink-0 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                              onClick={() =>
                                copyToClipboard(
                                  form.getValues("senderAddress"),
                                  "Sender Address",
                                )
                              }
                            />
                          )}
                        </div>

                        <div className="text-gray-500">City/Postal:</div>
                        <div className="font-medium flex items-center group">
                          <span>
                            {form.getValues("senderCity")}
                            {form.getValues("senderPostalCode")
                              ? `, ${form.getValues("senderPostalCode")}`
                              : ""}
                          </span>
                          {(form.getValues("senderCity") ||
                            form.getValues("senderPostalCode")) && (
                            <Copy
                              className="h-3.5 w-3.5 ml-1.5 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                              onClick={() =>
                                copyToClipboard(
                                  `${form.getValues("senderCity") || ""}${form.getValues("senderPostalCode") ? `, ${form.getValues("senderPostalCode")}` : ""}`,
                                  "Sender City/Postal",
                                )
                              }
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Price information at the top for quick access - only visible to admin users */}
                  {isAdmin && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 shadow-sm mb-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">
                            Shipping Price Information
                          </h3>
                          <div className="text-gray-500 text-sm mt-1">
                            Based on {billableWeight.toFixed(2)} kg billable
                            weight
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-3">
                        {/* Our Price (Admin only) */}
                        <div className="bg-white/60 rounded p-3 border border-blue-100">
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            Our Cost Price:
                          </div>
                          <div className="text-xl font-bold text-blue-800">
                            {formatPrice(
                              costPrices.totalPrice ||
                                shipment?.originalTotalPrice ||
                                0,
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-500">
                            <div>
                              Base:{" "}
                              {formatPrice(
                                costPrices.basePrice ||
                                  shipment?.originalBasePrice ||
                                  0,
                              )}
                            </div>
                            <div>
                              Fuel:{" "}
                              {formatPrice(
                                costPrices.fuelCharge ||
                                  shipment?.originalFuelCharge ||
                                  0,
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Customer Price */}
                        <div className="bg-white/60 rounded p-3 border border-green-100">
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            Customer Price:
                            {shipmentCreator && shipment?.userId && (
                              <span className="ml-1 text-xs text-blue-600">
                                Created by {shipmentCreator.name} (×
                                <span className="font-semibold">
                                  {(
                                    shipmentCreator.priceMultiplier || 1
                                  ).toFixed(2)}
                                </span>
                                )
                              </span>
                            )}
                          </div>
                          <div className="text-xl font-bold text-green-700">
                            {formatPrice(form.getValues("totalPrice"))}
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-500">
                            <div>
                              Base: {formatPrice(form.getValues("basePrice"))}
                            </div>
                            <div>
                              Fuel: {formatPrice(form.getValues("fuelCharge"))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Package information */}
                  <SectionCard
                    title="Package Details"
                    icon={Package}
                    defaultOpen={true}
                    bgColor="bg-gray-50"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Individual Package Items Display */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Package Items
                        </h4>
                        {isLoadingPackageItems ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                            <span className="ml-2 text-sm text-gray-500">
                              Loading items...
                            </span>
                          </div>
                        ) : packageItems && packageItems.length > 0 ? (
                          <div className="space-y-3">
                            {packageItems.map((item, index) => (
                              <Collapsible key={item.id || index}>
                                <div className="border rounded-lg bg-white">
                                  <CollapsibleTrigger className="w-full p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-center">
                                      <div className="flex-1 text-left">
                                        <div className="flex items-center gap-3">
                                          <h5 className="font-medium text-gray-900 text-sm">
                                            {(item.name || `Item ${index + 1}`)
                                              .length > 25
                                              ? `${(item.name || `Item ${index + 1}`).substring(0, 25)}...`
                                              : item.name ||
                                                `Item ${index + 1}`}
                                          </h5>
                                          <Badge
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            #{index + 1}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                                          <span>Qty: {item.quantity || 1}</span>
                                          <span>
                                            Price: $
                                            {((item.price || 0) / 100).toFixed(
                                              2,
                                            )}
                                          </span>
                                          <span className="font-medium text-green-600">
                                            Total: $
                                            {(
                                              ((item.price || 0) *
                                                (item.quantity || 1)) /
                                              100
                                            ).toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                      <ChevronDown className="h-4 w-4 text-gray-400" />
                                    </div>
                                  </CollapsibleTrigger>

                                  <CollapsibleContent className="px-4 pb-4">
                                    <div className="pt-3 border-t">
                                      {item.description && (
                                        <div className="mb-3">
                                          <span className="text-xs font-medium text-gray-700">
                                            Description:
                                          </span>
                                          <p className="text-sm text-gray-600 mt-1">
                                            {item.description}
                                          </p>
                                        </div>
                                      )}

                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <span className="text-gray-500">
                                            Quantity:
                                          </span>
                                          <span className="ml-2 font-medium">
                                            {item.quantity || 1}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">
                                            Unit Price:
                                          </span>
                                          <span className="ml-2 font-medium text-green-600">
                                            $
                                            {((item.price || 0) / 100).toFixed(
                                              2,
                                            )}
                                          </span>
                                        </div>
                                        {item.sku && (
                                          <div>
                                            <span className="text-gray-500">
                                              SKU:
                                            </span>
                                            <span className="ml-2 font-medium">
                                              {item.sku}
                                            </span>
                                          </div>
                                        )}
                                        {item.gtin && (
                                          <div>
                                            <span className="text-gray-500">
                                              GTIN:
                                            </span>
                                            <span className="ml-2 font-medium">
                                              {item.gtin}
                                            </span>
                                          </div>
                                        )}
                                        {item.hsCode && (
                                          <div>
                                            <span className="text-gray-500">
                                              HS Code:
                                            </span>
                                            <span className="ml-2 font-medium">
                                              {item.hsCode}
                                            </span>
                                          </div>
                                        )}
                                        {item.countryOfOrigin && (
                                          <div>
                                            <span className="text-gray-500">
                                              Origin:
                                            </span>
                                            <span className="ml-2 font-medium">
                                              {item.countryOfOrigin}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      <div className="mt-4 pt-3 border-t bg-green-50 -mx-4 px-4 rounded-b-lg">
                                        <div className="flex justify-between items-center text-sm">
                                          <span className="text-green-800 font-medium">
                                            Total Item Value:
                                          </span>
                                          <span className="font-semibold text-green-700">
                                            $
                                            {(
                                              ((item.price || 0) *
                                                (item.quantity || 1)) /
                                              100
                                            ).toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            ))}

                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-blue-800 font-medium">
                                  Total Items:
                                </span>
                                <span className="font-semibold text-blue-900">
                                  {packageItems.reduce(
                                    (sum, item) => sum + (item.quantity || 1),
                                    0,
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-sm mt-1">
                                <span className="text-blue-800 font-medium">
                                  Total Value:
                                </span>
                                <span className="font-semibold text-blue-900">
                                  $
                                  {(
                                    packageItems.reduce(
                                      (sum, item) =>
                                        sum +
                                        (item.price || 0) *
                                          (item.quantity || 1),
                                      0,
                                    ) / 100
                                  ).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm">No individual items found</p>
                            <p className="text-xs text-gray-400 mt-1">
                              This shipment may use bulk package description
                              instead of individual items
                            </p>

                            {/* Fallback to show package contents if no items */}
                            {form.getValues("packageContents") && (
                              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-left">
                                <div className="text-xs text-gray-600 mb-1">
                                  Package Description:
                                </div>
                                <div className="text-sm text-gray-800">
                                  {form.getValues("packageContents")}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-medium text-gray-700">
                            Weight Calculation
                          </h4>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    // Force calculation with customer's original service
                                    calculatePrice(e, true, false);
                                  }}
                                >
                                  <RefreshCcw className="mr-1 h-3 w-3" />
                                  <User className="mr-1 h-3 w-3" />
                                  Recalculate Price
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Recalculate using customer's original service
                                  choice
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="bg-white rounded-md border border-gray-200 p-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              Actual Weight:
                            </span>
                            <span className="font-medium">
                              {/* Total of all packages actual weight */}
                              {packages
                                .reduce((total, pkg) => {
                                  const pkgWeight =
                                    typeof pkg.weight === "number"
                                      ? pkg.weight
                                      : parseFloat(pkg.weight as string) || 0;
                                  return total + pkgWeight;
                                }, 0)
                                .toFixed(2)}{" "}
                              kg
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              Volumetric Weight:
                            </span>
                            <span className="font-medium">
                              {/* Total of all packages volumetric weight */}
                              {packages
                                .reduce((total, pkg) => {
                                  const pkgVolWeight =
                                    typeof pkg.volumetricWeight === "number"
                                      ? pkg.volumetricWeight
                                      : 0;
                                  return total + pkgVolWeight;
                                }, 0)
                                .toFixed(2)}{" "}
                              kg
                            </span>
                          </div>
                          <Separator className="my-1" />
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 font-medium">
                              Billable Weight:
                            </span>
                            <span className="font-bold">
                              {/* Total of all packages billable weight */}
                              {packages
                                .reduce((total, pkg) => {
                                  const pkgBillWeight =
                                    typeof pkg.billableWeight === "number"
                                      ? pkg.billableWeight
                                      : 0;
                                  return total + pkgBillWeight;
                                }, 0)
                                .toFixed(2)}{" "}
                              kg
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          {/* Show customer's originally selected service */}
                          {shipment?.selectedService && (
                            <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label className="text-sm font-medium text-blue-800">
                                    Selected Service
                                  </Label>
                                  <p className="text-sm text-blue-700 mt-1">
                                    {getMoogShipServiceName(
                                      shipment.selectedService,
                                    )}
                                  </p>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className="bg-blue-100 text-blue-800"
                                >
                                  {formatPrice(shipment.totalPrice || 0)}
                                </Badge>
                              </div>
                            </div>
                          )}

                          {/* Enhanced service dropdown with pricing options - Admin Only */}
                          {user?.role === "admin" && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-gray-700">
                                  Available MoogShip Services
                                </h4>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={async (e) => {
                                          e.preventDefault();
                                          e.stopPropagation();

                                          console.log(
                                            '🎯 INITIAL DROPDOWN: Starting "Recalculate Price" button click',
                                          );
                                          console.log(
                                            "🎯 INITIAL DROPDOWN: Current pricing options before API call:",
                                            pricingOptions?.options?.map(
                                              (opt) => ({
                                                serviceName: opt.serviceName,
                                                displayName: opt.displayName,
                                              }),
                                            ),
                                          );

                                          // CHANGED LOGIC: No longer require service selection first
                                          // Instead, do the recalculation to load available services from API

                                          // Step 1: Load available services from API (without using admin selected service)
                                          toast({
                                            title: "Loading Services",
                                            description:
                                              "Fetching available MoogShip services from API...",
                                            duration: 2000,
                                          });

                                          // Call calculatePrice without using admin service to load pricing options
                                          await calculatePrice(e, true, false);

                                          // Log services after API call
                                          setTimeout(() => {
                                            console.log(
                                              '🎯 INITIAL DROPDOWN: Services AFTER "Recalculate Price" API call:',
                                              pricingOptions?.options?.map(
                                                (opt) => ({
                                                  serviceName: opt.serviceName,
                                                  displayName: opt.displayName,
                                                }),
                                              ),
                                            );
                                          }, 500);

                                          // Step 2: After API call, services should be populated in dropdown
                                          toast({
                                            title: "MoogShip Services Loaded",
                                            description:
                                              "Please select a MoogShip service from the dropdown to recalculate pricing.",
                                            duration: 3000,
                                          });
                                        }}
                                        className="text-xs"
                                      >
                                        <RefreshCcw className="mr-1 h-3 w-3" />
                                        <Shield className="mr-1 h-3 w-3" />
                                        Recalculate Price
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        Recalculate using admin's selected
                                        service from dropdown
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <FormField
                                control={form.control}
                                name="serviceLevel"
                                render={({ field }) => (
                                  <FormItem>
                                    <Select
                                      onValueChange={(value) => {
                                        console.log(
                                          "🎯 SERVICE SELECTION: Admin selected service:",
                                          value,
                                        );
                                        console.log(
                                          "🎯 SERVICE SELECTION: Available options BEFORE selection:",
                                          pricingOptions?.options?.map(
                                            (opt) => ({
                                              serviceName: opt.serviceName,
                                              displayName: opt.displayName,
                                            }),
                                          ),
                                        );

                                        // Update form field immediately
                                        field.onChange(value);

                                        // Force form to update its internal state
                                        form.trigger("serviceLevel");

                                        // Show feedback that service was selected
                                        const selectedOption =
                                          pricingOptions?.options?.find(
                                            (opt) => opt.serviceName === value,
                                          );
                                        const displayName =
                                          selectedOption?.displayName ||
                                          getMoogShipServiceName(value);
                                        toast({
                                          title: "MoogShip Service Selected",
                                          description: `Selected: ${displayName}. Price will update automatically.`,
                                          duration: 3000,
                                        });

                                        // Automatically recalculate price when service is selected
                                        setTimeout(async () => {
                                          console.log(
                                            "🎯 SERVICE SELECTION: Starting recalculation after service selection...",
                                          );
                                          await calculatePrice(
                                            undefined,
                                            true,
                                            true,
                                          );

                                          // Log what services are available AFTER recalculation
                                          setTimeout(() => {
                                            console.log(
                                              "🎯 SERVICE SELECTION: Available options AFTER recalculation:",
                                              pricingOptions?.options?.map(
                                                (opt) => ({
                                                  serviceName: opt.serviceName,
                                                  displayName: opt.displayName,
                                                }),
                                              ),
                                            );
                                          }, 500);
                                        }, 100);

                                        console.log(
                                          "🎯 SERVICE SELECTION: Form field updated, serviceLevel now:",
                                          form.getValues().serviceLevel,
                                        );

                                        // DISABLED: No automatic recalculation when service changes
                                        // Admin must manually click "Recalculate Price" button to trigger calculation
                                      }}
                                      value={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="min-w-[350px]">
                                          <SelectValue placeholder="Select service to recalculate pricing">
                                            {field.value &&
                                            field.value !== "no-services" &&
                                            pricingOptions?.options &&
                                            pricingOptions.options.some(opt => opt.serviceName === field.value) ? (
                                              <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center space-x-2">
                                                  {(() => {
                                                    // Find the selected option to get its displayName
                                                    const selectedOption =
                                                      pricingOptions.options.find(
                                                        (opt) =>
                                                          opt.serviceName ===
                                                          field.value,
                                                      );
                                                    const displayName =
                                                      selectedOption?.displayName ||
                                                      getMoogShipServiceName(
                                                        field.value,
                                                      );
                                                    return (
                                                      <span className="font-medium">
                                                        {displayName}
                                                      </span>
                                                    );
                                                  })()}
                                                  {(() => {
                                                    // Find the selected option to get its displayName for badge calculation
                                                    const selectedOption =
                                                      pricingOptions.options.find(
                                                        (opt) =>
                                                          opt.serviceName ===
                                                          field.value,
                                                      );
                                                    const displayName =
                                                      selectedOption?.displayName ||
                                                      getMoogShipServiceName(
                                                        field.value,
                                                      );
                                                    const serviceName =
                                                      displayName.toLowerCase();
                                                    if (
                                                      serviceName.includes(
                                                        "eco",
                                                      ) ||
                                                      serviceName.includes(
                                                        "gls",
                                                      )
                                                    ) {
                                                      return (
                                                        <Badge
                                                          variant="outline"
                                                          className="bg-green-50 text-green-700 border-green-200 text-xs"
                                                        >
                                                          ECO
                                                        </Badge>
                                                      );
                                                    } else if (
                                                      serviceName.includes(
                                                        "express",
                                                      )
                                                    ) {
                                                      return (
                                                        <Badge
                                                          variant="outline"
                                                          className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs"
                                                        >
                                                          EXPRESS
                                                        </Badge>
                                                      );
                                                    } else if (
                                                      serviceName.includes(
                                                        "standard",
                                                      ) ||
                                                      serviceName.includes(
                                                        "widect",
                                                      )
                                                    ) {
                                                      return (
                                                        <Badge
                                                          variant="outline"
                                                          className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                                                        >
                                                          STANDARD
                                                        </Badge>
                                                      );
                                                    }
                                                    return null;
                                                  })()}
                                                </div>
                                                <span className="font-semibold text-green-600 ml-4">
                                                  {(() => {
                                                    const selectedOption =
                                                      pricingOptions.options.find(
                                                        (opt) =>
                                                          opt.serviceName ===
                                                          field.value,
                                                      );
                                                    
                                                    if (selectedOption) {
                                                      // The option already has additionalFee from API, use that
                                                      const optionAdditionalFee = selectedOption.additionalFee || 0;
                                                      const userMultiplier = shipmentCreator?.priceMultiplier || 1;
                                                      
                                                      // Get base and fuel from the option
                                                      const rawBasePrice = selectedOption.cargoPrice || 0;
                                                      const rawFuelCharge = selectedOption.fuelCost || 0;
                                                      
                                                      // Calculate correct total: base + fuel + additionalFee
                                                      const customerBasePrice = Math.round(rawBasePrice * userMultiplier);
                                                      const customerFuelCharge = Math.round(rawFuelCharge * userMultiplier);
                                                      const correctTotal = customerBasePrice + customerFuelCharge + optionAdditionalFee;
                                                      
                                                      return formatPrice(correctTotal);
                                                    }
                                                    return ""; // Don't show price if no option selected
                                                  })()}
                                                </span>
                                              </div>
                                            ) : (
                                              <span className="text-muted-foreground">
                                                Select service to recalculate
                                                pricing
                                              </span>
                                            )}
                                          </SelectValue>
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {pricingOptions &&
                                        pricingOptions.options &&
                                        pricingOptions.options.length > 0 ? (
                                          pricingOptions.options.map(
                                            (option, index) => {
                                              // Use serviceName for database storage and displayName for UI display
                                              const serviceCode =
                                                option.serviceName; // Raw service code for database
                                              const displayName =
                                                option.displayName ||
                                                getMoogShipServiceName(
                                                  serviceCode,
                                                ); // Branded name for display

                                              return (
                                                <SelectItem
                                                  key={`${serviceCode}-${index}`}
                                                  value={
                                                    serviceCode ||
                                                    `service-${index}`
                                                  }
                                                >
                                                  <div className="flex items-center justify-between w-full min-w-[300px]">
                                                    <div className="flex items-center space-x-2">
                                                      <span className="font-medium">
                                                        {displayName}
                                                      </span>
                                                      {(() => {
                                                        const serviceName =
                                                          displayName.toLowerCase();
                                                        if (
                                                          serviceName.includes(
                                                            "eco",
                                                          ) ||
                                                          serviceName.includes(
                                                            "gls",
                                                          )
                                                        ) {
                                                          return (
                                                            <Badge
                                                              variant="outline"
                                                              className="bg-green-50 text-green-700 border-green-200 text-xs"
                                                            >
                                                              ECO
                                                            </Badge>
                                                          );
                                                        } else if (
                                                          serviceName.includes(
                                                            "express",
                                                          )
                                                        ) {
                                                          return (
                                                            <Badge
                                                              variant="outline"
                                                              className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs"
                                                            >
                                                              EXPRESS
                                                            </Badge>
                                                          );
                                                        } else if (
                                                          serviceName.includes(
                                                            "standard",
                                                          ) ||
                                                          serviceName.includes(
                                                            "widect",
                                                          )
                                                        ) {
                                                          return (
                                                            <Badge
                                                              variant="outline"
                                                              className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                                                            >
                                                              STANDARD
                                                            </Badge>
                                                          );
                                                        }
                                                        return null;
                                                      })()}
                                                    </div>
                                                    <span className="font-semibold text-green-600 ml-4">
                                                      {(() => {
                                                        // The option already has additionalFee from API, use that
                                                        const optionAdditionalFee = option.additionalFee || 0;
                                                        const userMultiplier = shipmentCreator?.priceMultiplier || 1;
                                                        
                                                        // Get base and fuel from the option
                                                        const rawBasePrice = option.cargoPrice || 0;
                                                        const rawFuelCharge = option.fuelCost || 0;
                                                        
                                                        // For admin, we don't apply multiplier (multiplier is 1)
                                                        // Calculate correct total: base + fuel + additionalFee
                                                        const customerBasePrice = Math.round(rawBasePrice * userMultiplier);
                                                        const customerFuelCharge = Math.round(rawFuelCharge * userMultiplier);
                                                        const correctTotal = customerBasePrice + customerFuelCharge + optionAdditionalFee;
                                                        
                                                        return formatPrice(correctTotal);
                                                      })()}
                                                    </span>
                                                  </div>
                                                </SelectItem>
                                              );
                                            },
                                          )
                                        ) : (
                                          // NO FALLBACK - Dropdown should remain empty until API services are loaded
                                          <SelectItem
                                            key="empty"
                                            value="no-services"
                                            disabled
                                          >
                                            <div className="flex items-center justify-center w-full text-gray-500">
                                              <span>
                                                Click "Recalculate Price" to
                                                load available services
                                              </span>
                                            </div>
                                          </SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                    {form.watch("serviceLevel") &&
                                      (() => {
                                        const selected =
                                          pricingOptions?.options?.find(
                                            (opt) =>
                                              opt.serviceName ===
                                              form.watch("serviceLevel"),
                                          );
                                        if (
                                          !selected ||
                                          !selected.totalPrice ||
                                          !selected.isAccurate
                                        )
                                          return null;

                                        // The option already has additionalFee from API, use that
                                        const optionAdditionalFee = selected.additionalFee || 0;
                                        const userMultiplier = shipmentCreator?.priceMultiplier || 1;
                                        
                                        // Get base and fuel from the option
                                        const rawBasePrice = selected.cargoPrice || 0;
                                        const rawFuelCharge = selected.fuelCost || 0;
                                        
                                        // Calculate correct total: base + fuel + additionalFee
                                        const customerBasePrice = Math.round(rawBasePrice * userMultiplier);
                                        const customerFuelCharge = Math.round(rawFuelCharge * userMultiplier);
                                        const totalWithAdditionalFee = customerBasePrice + customerFuelCharge + optionAdditionalFee;
                                        
                                        return (
                                          <div className="mt-2 text-sm text-green-700 font-medium">
                                            Selected service price:{" "}
                                            {formatPrice(totalWithAdditionalFee)}
                                            {additionalFee > 0 && (
                                              <span className="text-xs ml-1 text-gray-500">
                                                (includes {formatPrice(additionalFee)} additional fee)
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })()}

                                    <FormMessage />
                                    {pricingOptions &&
                                      pricingOptions.options &&
                                      pricingOptions.options.length > 0 && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          Showing{" "}
                                          {pricingOptions.options.length}{" "}
                                          available MoogShip services with
                                          current pricing
                                        </p>
                                      )}
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Package List Display */}
                    {isLoadingPackageItems ? (
                      <div className="mt-6 border-t border-gray-200 pt-4 flex justify-center">
                        <div className="flex items-center text-gray-500">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          <span>Loading package details...</span>
                        </div>
                      </div>
                    ) : packages.length > 0 ? (
                      <div className="mt-6 border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-sm font-medium text-gray-700">
                            Physical Packages (
                            {form.getValues("pieceCount") || packages.length})
                          </h4>
                          <div className="text-xs text-gray-500">
                            Showing{" "}
                            {form.getValues("pieceCount") || packages.length}{" "}
                            physical packages
                          </div>
                        </div>
                        <div className="space-y-3">
                          {packages.map((pkg, index) => (
                            <div
                              key={pkg.id || index}
                              className="bg-white rounded-md p-3 border border-gray-200 shadow-sm relative flex flex-col"
                            >
                              {/* Package number badge */}
                              <div className="absolute -top-2 -left-2 bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                                #{index + 1}
                              </div>

                              {/* Header row with package name, weight and edit button */}
                              <div className="flex justify-between items-center mb-1">
                                <div className="font-medium text-gray-800 flex items-center mr-2 flex-1">
                                  {editingPackageId === pkg.id ? (
                                    <Input
                                      className="h-7 py-1 text-sm"
                                      value={editingPackageData?.name}
                                      onChange={(e) =>
                                        setEditingPackageData({
                                          ...editingPackageData!,
                                          name: e.target.value,
                                        })
                                      }
                                    />
                                  ) : (
                                    <span>
                                      {pkg.name || `Package #${index + 1}`}
                                    </span>
                                  )}
                                </div>

                                <Badge
                                  variant="outline"
                                  className="bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap mr-2"
                                >
                                  {typeof pkg.billableWeight === "number"
                                    ? pkg.billableWeight.toFixed(2)
                                    : "0.00"}{" "}
                                  kg
                                </Badge>

                                {/* Edit/Save buttons for all users */}
                                <div className="flex space-x-1">
                                  {editingPackageId === pkg.id ? (
                                    <div className="flex gap-1">
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={async () => {
                                          try {
                                            // Validate package data before sending to the server
                                            const result =
                                              packageEditSchema.safeParse(
                                                editingPackageData,
                                              );

                                            if (!result.success) {
                                              // Show validation errors
                                              const errors =
                                                result.error.format();
                                              console.error(
                                                "Package validation errors:",
                                                errors,
                                              );
                                              toast({
                                                title: "Validation Error",
                                                description:
                                                  "Please check the package details and try again.",
                                                variant: "destructive",
                                              });
                                              return;
                                            }

                                            // Save the package changes with validated data
                                            // Parse numeric values for calculations
                                            const weight =
                                              typeof result.data.weight ===
                                              "number"
                                                ? result.data.weight
                                                : parseFloat(
                                                    result.data.weight,
                                                  ) || 0;

                                            const length =
                                              typeof result.data.length ===
                                              "number"
                                                ? result.data.length
                                                : parseFloat(
                                                    result.data.length,
                                                  ) || 0;

                                            const width =
                                              typeof result.data.width ===
                                              "number"
                                                ? result.data.width
                                                : parseFloat(
                                                    result.data.width,
                                                  ) || 0;

                                            const height =
                                              typeof result.data.height ===
                                              "number"
                                                ? result.data.height
                                                : parseFloat(
                                                    result.data.height,
                                                  ) || 0;

                                            // Calculate volumetric and billable weights
                                            const volumetricWeight =
                                              calculateVolumetricWeight(
                                                length,
                                                width,
                                                height,
                                              );
                                            const billableWeight = Math.max(
                                              weight,
                                              volumetricWeight,
                                            );

                                            // Make sure each dimension value is handled properly
                                            const processedData = {
                                              ...result.data,
                                              // Ensure consistent formatting for numbers - these will be strings in the API
                                              weight: weight.toString(),
                                              length: length.toString(),
                                              width: width.toString(),
                                              height: height.toString(),
                                              // Include the calculated weights for UI state
                                              volumetricWeight:
                                                volumetricWeight,
                                              billableWeight: billableWeight,
                                            };

                                            const response = await fetch(
                                              `/api/packages/${pkg.id}`,
                                              {
                                                method: "PUT",
                                                headers: {
                                                  "Content-Type":
                                                    "application/json",
                                                },
                                                body: JSON.stringify(
                                                  processedData,
                                                ),
                                              },
                                            );

                                            if (response.ok) {
                                              toast({
                                                title: "Package updated",
                                                description:
                                                  "The package details have been updated successfully.",
                                              });

                                              // Update the main shipment with the new dimensions from this package
                                              if (shipmentId) {
                                                try {
                                                  // First update the form values to maintain consistency in the UI
                                                  // This is especially important for single-package shipments
                                                  if (packages.length === 1) {
                                                    form.setValue(
                                                      "packageLength",
                                                      length,
                                                    );
                                                    form.setValue(
                                                      "packageWidth",
                                                      width,
                                                    );
                                                    form.setValue(
                                                      "packageHeight",
                                                      height,
                                                    );
                                                    form.setValue(
                                                      "packageWeight",
                                                      weight,
                                                    );

                                                    // Also update the billable weight for consistency
                                                    if (
                                                      form
                                                        .getValues()
                                                        .hasOwnProperty(
                                                          "billableWeight",
                                                        )
                                                    ) {
                                                      form.setValue(
                                                        "billableWeight",
                                                        billableWeight,
                                                      );
                                                    }
                                                  }

                                                  // Update the shipment record in the database with the new dimensions

                                                  const shipmentUpdateResponse =
                                                    await fetch(
                                                      `/api/shipments/${shipmentId}`,
                                                      {
                                                        method: "PATCH",
                                                        headers: {
                                                          "Content-Type":
                                                            "application/json",
                                                        },
                                                        body: JSON.stringify({
                                                          // For single package shipments, update the exact dimensions
                                                          // For multi-package, we'll recalculate on the server
                                                          packageLength:
                                                            packages.length ===
                                                            1
                                                              ? length
                                                              : undefined,
                                                          packageWidth:
                                                            packages.length ===
                                                            1
                                                              ? width
                                                              : undefined,
                                                          packageHeight:
                                                            packages.length ===
                                                            1
                                                              ? height
                                                              : undefined,
                                                          packageWeight:
                                                            packages.length ===
                                                            1
                                                              ? weight
                                                              : undefined,
                                                          billableWeight:
                                                            billableWeight,
                                                          needsRecalculation:
                                                            true, // Flag to tell the server to recalculate
                                                        }),
                                                        credentials: "include",
                                                      },
                                                    );

                                                  if (
                                                    shipmentUpdateResponse.ok
                                                  ) {
                                                    // Refresh the shipment data to get the new values
                                                    queryClient.invalidateQueries(
                                                      {
                                                        queryKey: [
                                                          `/api/shipments/${shipmentId}`,
                                                        ],
                                                      },
                                                    );
                                                  } else {
                                                    console.error(
                                                      "Failed to update shipment dimensions:",
                                                      await shipmentUpdateResponse.text(),
                                                    );
                                                  }
                                                } catch (error) {
                                                  console.error(
                                                    "Error updating shipment dimensions:",
                                                    error,
                                                  );
                                                }
                                              }

                                              setEditingPackageId(null);
                                              setEditingPackageData(null);
                                              // Reset the calculated weight values
                                              setEditingVolumetricWeight(0);
                                              setEditingBillableWeight(0);
                                              // Refresh package data
                                              refreshPackages();

                                              // Recalculate price after package dimensions update (force calculation for admin action)
                                              // Skip automatic recalculation for bulk uploaded shipments
                                              if (
                                                !isBulkUploadedShipment &&
                                                (!shipment?.id ||
                                                  shipment.id < 630)
                                              ) {
                                                calculatePrice(undefined, true);
                                              } else {
                                              }
                                            } else {
                                              toast({
                                                title: "Update failed",
                                                description:
                                                  "Failed to update package details. Please try again.",
                                                variant: "destructive",
                                              });
                                            }
                                          } catch (error) {
                                            console.error(
                                              "Error updating package:",
                                              error,
                                            );
                                            toast({
                                              title: "Update failed",
                                              description:
                                                "An error occurred while updating the package.",
                                              variant: "destructive",
                                            });
                                          }
                                        }}
                                        className="h-6 w-6"
                                        title="Save changes"
                                      >
                                        <Save className="h-3 w-3" />
                                        <span className="sr-only">Save</span>
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingPackageId(null);
                                          setEditingPackageData(null);
                                          // Reset the calculated weight values
                                          setEditingVolumetricWeight(0);
                                          setEditingBillableWeight(0);
                                        }}
                                        className="h-6 w-6"
                                        title="Cancel editing"
                                      >
                                        <X className="h-3 w-3" />
                                        <span className="sr-only">Cancel</span>
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingPackageId(pkg.id);

                                        // Get the current weight and dimensions as numbers
                                        const weight =
                                          typeof pkg.weight === "number"
                                            ? pkg.weight
                                            : 0;
                                        const length =
                                          typeof pkg.length === "number"
                                            ? pkg.length
                                            : 0;
                                        const width =
                                          typeof pkg.width === "number"
                                            ? pkg.width
                                            : 0;
                                        const height =
                                          typeof pkg.height === "number"
                                            ? pkg.height
                                            : 0;

                                        // Calculate volumetric and billable weights
                                        const volWeight =
                                          calculateVolumetricWeight(
                                            length,
                                            width,
                                            height,
                                          );
                                        const billWeight = Math.max(
                                          weight,
                                          volWeight,
                                        );

                                        // Update the editing states
                                        setEditingVolumetricWeight(volWeight);
                                        setEditingBillableWeight(billWeight);

                                        setEditingPackageData({
                                          name:
                                            pkg.name || `Package #${index + 1}`,
                                          description: pkg.description || "",
                                          notes: pkg.notes || "",
                                          weight: weight,
                                          length: length,
                                          width: width,
                                          height: height,
                                        });
                                      }}
                                      className="h-6 w-6"
                                      title="Edit package"
                                    >
                                      <Edit className="h-3 w-3" />
                                      <span className="sr-only">Edit</span>
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Package dimensions - compact view in non-edit mode */}
                              {editingPackageId === pkg.id ? (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-4 gap-2">
                                    <div>
                                      <Label className="text-xs">
                                        Length (cm)
                                      </Label>
                                      <Input
                                        type="number"
                                        className="h-7 py-1 text-sm"
                                        value={editingPackageData?.length}
                                        onChange={(e) => {
                                          const newLength = parseFloat(
                                            e.target.value,
                                          );
                                          const width =
                                            editingPackageData?.width || 0;
                                          const height =
                                            editingPackageData?.height || 0;
                                          const weight =
                                            editingPackageData?.weight || 0;

                                          // Calculate new volumetric weight
                                          const volWeight =
                                            calculateVolumetricWeight(
                                              newLength,
                                              width,
                                              height,
                                            );
                                          const billWeight = Math.max(
                                            weight,
                                            volWeight,
                                          );

                                          // Update state
                                          setEditingVolumetricWeight(volWeight);
                                          setEditingBillableWeight(billWeight);

                                          // Update form data
                                          setEditingPackageData({
                                            ...editingPackageData!,
                                            length: newLength,
                                          });
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">
                                        Width (cm)
                                      </Label>
                                      <Input
                                        type="number"
                                        className="h-7 py-1 text-sm"
                                        value={editingPackageData?.width}
                                        onChange={(e) => {
                                          const newWidth = parseFloat(
                                            e.target.value,
                                          );
                                          const length =
                                            editingPackageData?.length || 0;
                                          const height =
                                            editingPackageData?.height || 0;
                                          const weight =
                                            editingPackageData?.weight || 0;

                                          // Calculate new volumetric weight
                                          const volWeight =
                                            calculateVolumetricWeight(
                                              length,
                                              newWidth,
                                              height,
                                            );
                                          const billWeight = Math.max(
                                            weight,
                                            volWeight,
                                          );

                                          // Update state
                                          setEditingVolumetricWeight(volWeight);
                                          setEditingBillableWeight(billWeight);

                                          // Update form data
                                          setEditingPackageData({
                                            ...editingPackageData!,
                                            width: newWidth,
                                          });
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">
                                        Height (cm)
                                      </Label>
                                      <Input
                                        type="number"
                                        className="h-7 py-1 text-sm"
                                        value={editingPackageData?.height}
                                        onChange={(e) => {
                                          const newHeight = parseFloat(
                                            e.target.value,
                                          );
                                          const length =
                                            editingPackageData?.length || 0;
                                          const width =
                                            editingPackageData?.width || 0;
                                          const weight =
                                            editingPackageData?.weight || 0;

                                          // Calculate new volumetric weight
                                          const volWeight =
                                            calculateVolumetricWeight(
                                              length,
                                              width,
                                              newHeight,
                                            );
                                          const billWeight = Math.max(
                                            weight,
                                            volWeight,
                                          );

                                          // Update state
                                          setEditingVolumetricWeight(volWeight);
                                          setEditingBillableWeight(billWeight);

                                          // Update form data
                                          setEditingPackageData({
                                            ...editingPackageData!,
                                            height: newHeight,
                                          });
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">
                                        Weight (kg)
                                      </Label>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        className="h-7 py-1 text-sm"
                                        value={editingPackageData?.weight}
                                        onChange={(e) => {
                                          const newWeight = parseFloat(
                                            e.target.value,
                                          );
                                          const length =
                                            editingPackageData?.length || 0;
                                          const width =
                                            editingPackageData?.width || 0;
                                          const height =
                                            editingPackageData?.height || 0;

                                          // Calculate volumetric weight (unchanged)
                                          const volWeight =
                                            calculateVolumetricWeight(
                                              length,
                                              width,
                                              height,
                                            );
                                          // Update billable weight using the new actual weight
                                          const billWeight = Math.max(
                                            newWeight,
                                            volWeight,
                                          );

                                          // Update state
                                          setEditingVolumetricWeight(volWeight);
                                          setEditingBillableWeight(billWeight);

                                          // Update form data
                                          setEditingPackageData({
                                            ...editingPackageData!,
                                            weight: newWeight,
                                          });
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* Real-time calculated weights display */}
                                  <div className="bg-gray-50 p-2 rounded-md border border-gray-100 text-xs">
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600">
                                        Volumetric Weight:
                                      </span>
                                      <span className="font-medium">
                                        {editingVolumetricWeight.toFixed(2)} kg
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                      <span className="text-gray-600">
                                        Billable Weight:
                                      </span>
                                      <span className="font-semibold text-blue-700">
                                        {editingBillableWeight.toFixed(2)} kg
                                      </span>
                                    </div>
                                    {editingVolumetricWeight >
                                      (editingPackageData?.weight || 0) && (
                                      <div className="mt-1 text-blue-600 text-[10px] flex items-center">
                                        <Info className="h-3 w-3 mr-1" />
                                        <span className="italic">
                                          Volumetric weight will be applied
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs">
                                  <div className="flex items-center">
                                    <Box className="h-3 w-3 mr-1 text-gray-500" />
                                    <span className="text-gray-500 mr-1">
                                      Dimensions:
                                    </span>
                                    <span className="font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                                      {typeof pkg.length === "number"
                                        ? pkg.length
                                        : 0}{" "}
                                      ×{" "}
                                      {typeof pkg.width === "number"
                                        ? pkg.width
                                        : 0}{" "}
                                      ×{" "}
                                      {typeof pkg.height === "number"
                                        ? pkg.height
                                        : 0}{" "}
                                      cm
                                    </span>
                                  </div>
                                  <div className="flex items-center">
                                    <Weight className="h-3 w-3 mr-1 text-gray-500" />
                                    <span className="text-gray-500 mr-1">
                                      Weight:
                                    </span>
                                    <span className="font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                                      {typeof pkg.weight === "number"
                                        ? pkg.weight.toString()
                                        : "0.00"}{" "}
                                      kg
                                    </span>
                                  </div>
                                  {typeof pkg.volumetricWeight === "number" &&
                                    typeof pkg.weight === "number" &&
                                    pkg.volumetricWeight > pkg.weight && (
                                      <div className="flex items-center text-blue-600 w-full mt-0.5">
                                        <Info className="h-3 w-3 mr-1" />
                                        <span className="italic">
                                          Volumetric weight (
                                          {pkg.volumetricWeight.toFixed(2)} kg)
                                          applied
                                        </span>
                                      </div>
                                    )}
                                </div>
                              )}

                              {/* Description/Notes area - editable in edit mode */}
                              {editingPackageId === pkg.id ? (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                  <Label className="text-xs mb-1 block">
                                    Description
                                  </Label>
                                  <Textarea
                                    className="resize-none h-12 text-xs"
                                    placeholder="Package description"
                                    value={editingPackageData?.description}
                                    onChange={(e) =>
                                      setEditingPackageData({
                                        ...editingPackageData!,
                                        description: e.target.value,
                                      })
                                    }
                                  />

                                  <Label className="text-xs mb-1 mt-2 block">
                                    Admin Notes
                                  </Label>
                                  <Textarea
                                    className="resize-none h-12 text-xs"
                                    placeholder="Internal notes (only visible to admins)"
                                    value={editingPackageData?.notes}
                                    onChange={(e) =>
                                      setEditingPackageData({
                                        ...editingPackageData!,
                                        notes: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              ) : (
                                <>
                                  {/* Show description and notes in a compact format */}
                                  {(pkg.description || pkg.notes) && (
                                    <div className="mt-1.5 text-xs">
                                      {pkg.description && (
                                        <div className="flex items-start mt-1">
                                          <FileText className="h-3 w-3 mr-1 text-blue-500 mt-0.5 flex-shrink-0" />
                                          <span className="text-gray-600">
                                            {pkg.description}
                                          </span>
                                        </div>
                                      )}

                                      {pkg.notes && (
                                        <div className="flex items-start mt-1 bg-yellow-50/50 p-1 rounded">
                                          <StickyNote className="h-3 w-3 mr-1 text-amber-500 mt-0.5 flex-shrink-0" />
                                          <span className="text-gray-600">
                                            {pkg.notes}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Total summary at the bottom */}
                        <div className="bg-blue-50 p-3 rounded-md mt-4 border border-blue-100">
                          <div className="flex justify-between items-center">
                            <div className="font-medium">
                              Total Billable Weight:
                            </div>
                            <div className="font-semibold text-blue-800">
                              {packages
                                .reduce((total, pkg) => {
                                  const weight =
                                    typeof pkg.billableWeight === "number"
                                      ? pkg.billableWeight
                                      : 0;
                                  return total + weight;
                                }, 0)
                                .toFixed(2)}{" "}
                              kg
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 border-t border-gray-200 pt-4 text-center text-gray-500 py-4">
                        No packages found for this shipment
                      </div>
                    )}
                  </SectionCard>

                  {/* Receiver Information */}
                  <SectionCard
                    title="Receiver Information"
                    icon={UserRound}
                    defaultOpen={true}
                    bgColor="bg-green-50/30"
                  >
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="receiverName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Recipient Name</FormLabel>
                              <FormControl>
                                <div className="relative group">
                                  <Input
                                    placeholder="Enter recipient name"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                  {field.value && (
                                    <Copy
                                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                                      onClick={() =>
                                        copyToClipboard(
                                          field.value,
                                          "Recipient Name",
                                        )
                                      }
                                    />
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="receiverPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <div className="relative group">
                                  <Input
                                    placeholder="Enter phone number"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                  {field.value && (
                                    <Copy
                                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                                      onClick={() =>
                                        copyToClipboard(
                                          field.value,
                                          "Phone Number",
                                        )
                                      }
                                    />
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="receiverEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Input
                                  type="email"
                                  placeholder="Enter email address"
                                  {...field}
                                  // If no email is provided, use info@moogship.com as default
                                  onBlur={(e) => {
                                    if (!e.target.value.trim()) {
                                      field.onChange("info@moogship.com");
                                    }
                                  }}
                                  value={field.value || ""}
                                />
                                {field.value && (
                                  <Copy
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                                    onClick={() =>
                                      copyToClipboard(
                                        field.value,
                                        "Email Address",
                                      )
                                    }
                                  />
                                )}
                              </div>
                            </FormControl>
                            <FormDescription className="text-xs">
                              If not provided, will default to info@moogship.com
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="receiverAddress"
                        render={({ field }) => {
                          return (
                            <FormItem>
                              <FormLabel>Address</FormLabel>
                              <FormControl>
                                <div className="relative group">
                                  <Input
                                    placeholder="Enter complete street address"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                  {field.value && (
                                    <Copy
                                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                                      onClick={() =>
                                        copyToClipboard(field.value, "Address")
                                      }
                                    />
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      {/* Hidden field to maintain receiverAddress2 value internally for data structure */}
                      <input
                        type="hidden"
                        {...form.register("receiverAddress2")}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="receiverCity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <div className="relative group">
                                  <Input
                                    placeholder="Enter city"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                  {field.value && (
                                    <Copy
                                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                                      onClick={() =>
                                        copyToClipboard(field.value, "City")
                                      }
                                    />
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="receiverState"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State/Province</FormLabel>
                              <FormControl>
                                <div className="relative group">
                                  <Input
                                    placeholder="Enter state or province"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                  {field.value && (
                                    <Copy
                                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                                      onClick={() =>
                                        copyToClipboard(
                                          field.value,
                                          "State/Province",
                                        )
                                      }
                                    />
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="receiverPostalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Postal/ZIP Code</FormLabel>
                              <FormControl>
                                <div className="relative group">
                                  <Input
                                    placeholder="Enter postal code"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                  {field.value && (
                                    <Copy
                                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                                      onClick={() =>
                                        copyToClipboard(
                                          field.value,
                                          "Postal/ZIP Code",
                                        )
                                      }
                                    />
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="receiverCountry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a country" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {COUNTRIES.map((country) => (
                                    <SelectItem
                                      key={country.code}
                                      value={country.code}
                                    >
                                      {country.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </SectionCard>

                  {/* Product Information */}
                  <SectionCard
                    title="Product Information"
                    icon={Package}
                    bgColor="bg-blue-50/30"
                    defaultOpen={true}
                  >
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="packageContents"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Product Name / Description
                              {user?.role === 'admin' && (
                                <Badge variant="secondary" className="text-xs">Admin Editable</Badge>
                              )}
                            </FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Textarea
                                  placeholder="Enter product name and description (e.g., Samsung Galaxy S24, Electronics)"
                                  className="resize-none"
                                  rows={3}
                                  {...field}
                                  value={field.value || ""}
                                />
                                {field.value && (
                                  <Copy
                                    className="absolute right-2 top-2 h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                                    onClick={() =>
                                      copyToClipboard(
                                        field.value,
                                        "Product Description",
                                      )
                                    }
                                  />
                                )}
                              </div>
                            </FormControl>
                            <FormDescription>
                              {user?.role === 'admin' 
                                ? "As an admin, you can edit the product name and description to fix any errors or provide more accurate information for customs and shipping."
                                : "Describe the product name and contents of the package"
                              }
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </SectionCard>

                  {/* Customs Information */}
                  <SectionCard
                    title="Customs Information"
                    icon={CreditCard}
                    bgColor="bg-amber-50/30"
                  >
                    <div className="space-y-4">
                      {/* IOSS Number - Only show for EU countries */}
                      {isEUCountry(form.getValues("receiverCountry")) && (
                        <FormField
                          control={form.control}
                          name="iossNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center">
                                IOSS Number
                                <span className="text-sm ml-2 text-red-500">
                                  *
                                </span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <Info className="h-4 w-4 ml-1 text-gray-400" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs bg-white p-2">
                                      <p className="text-xs text-gray-700">
                                        Import One-Stop Shop (IOSS) number is
                                        required for e-commerce goods valued up
                                        to €150 shipped to EU.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter IOSS number"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                              <FormDescription className="text-xs">
                                Required for European shipments under 150 EUR.
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                      )}

                      {/* HMRC Number - Only show for UK and Sweden */}
                      {isHMRCCountry(form.getValues("receiverCountry")) && (
                        <FormField
                          control={form.control}
                          name="iossNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center">
                                HMRC Number
                                <span className="text-sm ml-2 text-red-500">
                                  *
                                </span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <Info className="h-4 w-4 ml-1 text-gray-400" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs bg-white p-2">
                                      <p className="text-xs text-gray-700">
                                        HMRC number is required for e-commerce
                                        goods shipped to United Kingdom and
                                        Sweden.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter HMRC number"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                              <FormDescription className="text-xs">
                                Required for United Kingdom and Sweden
                                shipments.
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name="gtip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GTIP Code</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="Enter GTIP/HS code (e.g. 1234.56.78)"
                                {...field}
                                value={field.value || ""}
                                onFocus={(e) => e.target.select()}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Harmonized System (HS) code for customs
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="customsValue"
                          render={({ field }) => {
                            const [displayValue, setDisplayValue] =
                              React.useState(() =>
                                field.value
                                  ? (field.value / 100).toFixed(2)
                                  : "",
                              );

                            return (
                              <FormItem>
                                <FormLabel>Customs Value</FormLabel>
                                <FormControl>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="Value (e.g. 123.45)"
                                    value={displayValue}
                                    onChange={(e) => {
                                      const inputValue = e.target.value;

                                      // Allow typing decimal numbers with up to 2 decimal places
                                      if (
                                        /^\d*\.?\d{0,2}$/.test(inputValue) ||
                                        inputValue === ""
                                      ) {
                                        setDisplayValue(inputValue);
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const inputValue = e.target.value;

                                      if (
                                        inputValue &&
                                        !isNaN(Number(inputValue))
                                      ) {
                                        const dollars = parseFloat(inputValue);
                                        const cents = Math.round(dollars * 100);
                                        field.onChange(cents);
                                        setDisplayValue(dollars.toFixed(2));
                                      } else {
                                        field.onChange(0);
                                        setDisplayValue("");
                                      }
                                    }}
                                    onFocus={(e) => e.target.select()}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Item value in USD for customs declaration
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />

                        {/* Add customsItemCount field */}
                        <FormField
                          control={form.control}
                          name="customsItemCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Customs Item Count</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  inputMode="numeric"
                                  placeholder="Number of items (e.g. 1)"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value);

                                    field.onChange(isNaN(value) ? 1 : value);
                                  }}
                                  onFocus={(e) => e.target.select()}
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Number of items for customs declaration
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="currency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Currency</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value || "USD"}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {CURRENCIES.map((currency) => (
                                    <SelectItem
                                      key={currency.code}
                                      value={currency.code}
                                    >
                                      {currency.symbol} {currency.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </SectionCard>

                  {/* Insurance Protection Section */}
                  <SectionCard
                    title="Insurance Protection"
                    icon={Shield}
                    defaultOpen={true}
                    bgColor="bg-blue-50/30"
                  >
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="isInsured"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Enable Insurance Protection</FormLabel>
                              <FormDescription className="text-xs">
                                Protect your shipment against loss or damage
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={async (checked) => {
                                  field.onChange(checked);
                                  
                                  // If turning on insurance and we have a value, calculate the cost
                                  if (checked) {
                                    const insuranceValue = form.getValues("insuranceValue");
                                    if (insuranceValue && insuranceValue > 0) {
                                      try {
                                        const response = await fetch(
                                          "/api/calculate-insurance",
                                          {
                                            method: "POST",
                                            headers: {
                                              "Content-Type": "application/json",
                                            },
                                            body: JSON.stringify({
                                              declaredValue: insuranceValue,
                                            }),
                                            credentials: "include",
                                          },
                                        );
                                        
                                        if (response.ok) {
                                          const insuranceData = await response.json();
                                          if (insuranceData.cost) {
                                            form.setValue("insuranceCost", insuranceData.cost);
                                          }
                                        }
                                      } catch (error) {
                                        console.error("Error calculating insurance on toggle:", error);
                                      }
                                    }
                                  } else {
                                    // If turning off insurance, clear the cost
                                    form.setValue("insuranceCost", 0);
                                  }
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {form.watch("isInsured") && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="insuranceValue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Declared Value</FormLabel>
                                <FormControl>
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm font-medium text-gray-700">$</span>
                                    <Input
                                      type="text"
                                      placeholder="Enter value (e.g. 500.00)"
                                      value={insuranceDisplayValue}
                                      onChange={(e) => {
                                        const inputValue = e.target.value;

                                        // Only allow numbers and one decimal point
                                        if (
                                          inputValue === "" ||
                                          /^\d*\.?\d{0,2}$/.test(inputValue)
                                        ) {
                                          setInsuranceDisplayValue(inputValue);
                                        }
                                      }}
                                      onBlur={async () => {
                                      const inputValue = insuranceDisplayValue;

                                      if (
                                        inputValue &&
                                        inputValue !== "" &&
                                        !isNaN(Number(inputValue))
                                      ) {
                                        const dollars = parseFloat(inputValue);
                                        const cents = Math.round(dollars * 100);

                                        field.onChange(cents);

                                        // Calculate insurance cost using dedicated API endpoint

                                        try {
                                          const response = await fetch(
                                            "/api/calculate-insurance",
                                            {
                                              method: "POST",
                                              headers: {
                                                "Content-Type":
                                                  "application/json",
                                              },
                                              body: JSON.stringify({
                                                declaredValue: cents,
                                              }),
                                              credentials: "include", // Include session cookies
                                            },
                                          );

                                          if (response.ok) {
                                            const insuranceData =
                                              await response.json();

                                            if (insuranceData.cost) {
                                              form.setValue(
                                                "insuranceCost",
                                                insuranceData.cost,
                                              );
                                            } else {
                                              form.setValue("insuranceCost", 0);
                                            }
                                          } else {
                                            const errorText =
                                              await response.text();

                                            form.setValue("insuranceCost", 0);
                                          }
                                        } catch (error) {
                                          console.error(
                                            "❌ Error calculating insurance cost:",
                                            error,
                                          );
                                          form.setValue("insuranceCost", 0);
                                        }
                                      } else {
                                        field.onChange(0);
                                        form.setValue("insuranceCost", 0);
                                      }
                                    }}
                                    onFocus={(e) => {
                                      e.target.select();
                                    }}
                                  />
                                  </div>
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Total value of items to insure (USD)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="bg-white rounded border p-3">
                            <Label className="text-sm font-medium text-gray-700">
                              Insurance Cost
                            </Label>
                            <div className="text-lg font-semibold text-green-600 mt-1">
                              {form.watch("insuranceCost")
                                ? `$${(form.watch("insuranceCost") / 100).toFixed(2)}`
                                : "Enter declared value above"}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Based on declared value and active insurance
                              ranges
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </SectionCard>

                  {/* Status field (for admin only) */}
                  {isAdmin && (
                    <div className="bg-gray-50 rounded-lg border p-4 mt-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        Shipment Status
                      </h3>
                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem
                                    value={ShipmentStatus.PENDING}
                                    className="text-amber-600 font-medium"
                                  >
                                    Pending
                                  </SelectItem>
                                  <SelectItem
                                    value={ShipmentStatus.APPROVED}
                                    className="text-green-600 font-medium"
                                  >
                                    Approved
                                  </SelectItem>
                                  <SelectItem
                                    value={ShipmentStatus.REJECTED}
                                    className="text-red-600 font-medium"
                                  >
                                    Rejected
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason field - only show if status is REJECTED */}
                  {isAdmin &&
                    form.watch("status") === ShipmentStatus.REJECTED && (
                      <div className="mt-4">
                        <FormField
                          control={form.control}
                          name="rejectionReason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rejection Reason</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter reason for rejection"
                                  className="bg-white resize-none"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                  {/* Action buttons */}
                  <div className="flex justify-end space-x-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setLocation(
                          user?.role === "admin"
                            ? "/admin-shipments"
                            : "/my-shipments",
                        )
                      }
                    >
                      Back
                    </Button>

                    {/* Cancel shipment button only shows if shipment is not already in transit or delivered */}
                    {shipment &&
                      (shipment.status === ShipmentStatus.PENDING ||
                        shipment.status === ShipmentStatus.APPROVED ||
                        shipment.status === ShipmentStatus.REJECTED) && (
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={cancelMutation.isPending}
                          onClick={() => {
                            // Show confirmation dialog before cancelling
                            if (
                              window.confirm(
                                `Are you sure you want to cancel shipment #${shipmentId}? This action cannot be undone.`,
                              )
                            ) {
                              cancelMutation.mutate();
                            }
                          }}
                        >
                          {cancelMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Cancel Shipment
                        </Button>
                      )}

                    <Button
                      type="button"
                      disabled={
                        updateMutation.isPending ||
                        (shipment?.status === ShipmentStatus.APPROVED &&
                          user?.role !== "admin")
                      }
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={async () => {
                        // Don't allow updates to approved shipments for non-admin users
                        if (
                          shipment?.status === ShipmentStatus.APPROVED &&
                          user?.role !== "admin"
                        ) {
                          toast({
                            title: "Update Not Allowed",
                            description:
                              "Approved shipments can only be modified by admin users.",
                            variant: "destructive",
                          });
                          return;
                        }

                        const formData = form.getValues();

                        // Convert numeric fields to numbers
                        [
                          "packageLength",
                          "packageWidth",
                          "packageHeight",
                          "packageWeight",
                        ].forEach((field) => {
                          if (formData[field]) {
                            formData[field] = Number(formData[field]);
                          }
                        });

                        // Set default email if empty
                        if (
                          !formData.receiverEmail ||
                          formData.receiverEmail.trim() === ""
                        ) {
                          formData.receiverEmail = "info@moogship.com";
                        }

                        // CRITICAL FIX: Include original cost prices when admin updates shipment
                        if (
                          user?.role === "admin" &&
                          costPrices.basePrice > 0
                        ) {
                          formData.originalBasePrice = costPrices.basePrice;
                          formData.originalFuelCharge = costPrices.fuelCharge;
                          formData.originalTotalPrice = costPrices.totalPrice;
                        }

                        // If pricingOptions has cost prices, use those
                        if (
                          user?.role === "admin" &&
                          pricingOptions?.selectedPricing?.originalBasePrice
                        ) {
                          formData.originalBasePrice =
                            pricingOptions.selectedPricing.originalBasePrice;
                          formData.originalFuelCharge =
                            pricingOptions.selectedPricing.originalFuelCharge;
                          formData.originalTotalPrice =
                            pricingOptions.selectedPricing.originalTotalPrice;
                        }

                        // CRITICAL FIX: Include admin-selected service when updating shipment
                        if (user?.role === "admin" && formData.serviceLevel) {
                          // When admin has selected a service from dropdown, use that as the new service
                          console.log(
                            "🎯 ADMIN SERVICE UPDATE: Selected service from dropdown:",
                            formData.serviceLevel,
                          );

                          // Find the matching pricing option to get the correct service information
                          if (
                            pricingOptions?.options &&
                            pricingOptions.options.length > 0
                          ) {
                            const selectedOption = pricingOptions.options.find(
                              (option) =>
                                option.serviceName === formData.serviceLevel ||
                                option.providerServiceCode ===
                                  formData.serviceLevel ||
                                option.displayName === formData.serviceLevel,
                            );

                            if (selectedOption) {
                              console.log(
                                "🎯 ADMIN SERVICE UPDATE: Found matching option:",
                                selectedOption,
                              );

                              // Update all service-related fields properly
                              formData.serviceLevel =
                                selectedOption.serviceName ||
                                formData.serviceLevel; // Provider service code
                              formData.selectedService =
                                selectedOption.displayName ||
                                selectedOption.serviceName; // Display name
                              formData.providerServiceCode =
                                selectedOption.serviceName ||
                                selectedOption.providerServiceCode; // API service code
                              formData.carrierName = selectedOption.displayName; // MoogShip branded name
                              formData.shippingProvider = "shipentegra"; // Default provider

                              console.log(
                                "🎯 ADMIN SERVICE UPDATE: Setting service fields:",
                                {
                                  serviceLevel: formData.serviceLevel,
                                  selectedService: formData.selectedService,
                                  providerServiceCode:
                                    formData.providerServiceCode,
                                  carrierName: formData.carrierName,
                                  shippingProvider: formData.shippingProvider,
                                },
                              );
                            } else {
                              // Fallback to the serviceLevel value if no exact match found
                              formData.selectedService = formData.serviceLevel;
                              formData.providerServiceCode =
                                formData.serviceLevel;
                              console.log(
                                "🎯 ADMIN SERVICE UPDATE: No exact match, using serviceLevel:",
                                formData.serviceLevel,
                              );
                            }
                          } else {
                            // No pricing options available, use serviceLevel directly
                            formData.selectedService = formData.serviceLevel;
                            formData.providerServiceCode =
                              formData.serviceLevel;
                            console.log(
                              "🎯 ADMIN SERVICE UPDATE: No pricing options, using serviceLevel:",
                              formData.serviceLevel,
                            );
                          }
                        }

                        // Make sure customs-related fields are properly included in the form data
                        // Create a log of customs data being sent to the server for debugging

                        try {
                          // Direct fetch approach for better control
                          const response = await fetch(
                            `/api/shipments/${shipmentId}`,
                            {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify(formData),
                            },
                          );

                          if (response.ok) {
                            const updatedShipment = await response.json();

                            // Show success message
                            toast({
                              title: "Shipment Updated",
                              description:
                                "The shipment has been successfully updated.",
                            });

                            // Refresh data in UI by invalidating queries
                            queryClient.invalidateQueries({
                              queryKey: [`/api/shipments/${shipmentId}`],
                            });
                            queryClient.invalidateQueries({
                              queryKey: ["/api/shipments"],
                            });
                            queryClient.invalidateQueries({
                              queryKey: ["/api/shipments/my"],
                            });
                            queryClient.invalidateQueries({
                              queryKey: ["/api/shipments/all"],
                            });

                            // Force refetch all the queries to get the latest data
                            await queryClient.refetchQueries({
                              queryKey: [`/api/shipments/${shipmentId}`],
                            });
                            await queryClient.refetchQueries({
                              queryKey: [`/api/shipments/${shipmentId}/items`],
                            });

                            // Also directly update the form fields to reflect the changes immediately
                            // Instead of resetting the form with the server response, which may not include all fields
                            // that were updated (like gtip), we'll merge the current form values with the response

                            // Get current form values that might not be returned from the server
                            const currentValues = form.getValues();

                            // Create merged data object that preserves client-side values not returned by the server
                            const mergedData = {
                              ...currentValues, // Keep client-side values
                              ...updatedShipment, // Apply server updates
                              // Explicitly preserve critical customs fields since they're part of this bug fix
                              gtip:
                                currentValues.gtip ||
                                updatedShipment.gtip ||
                                "",
                              customsValue:
                                currentValues.customsValue ||
                                updatedShipment.customsValue ||
                                0,
                              customsItemCount:
                                currentValues.customsItemCount ||
                                updatedShipment.customsItemCount ||
                                1,
                            };

                            // Log the values of critical customs fields for debugging

                            form.reset(mergedData);

                            // Redirect if needed
                            if (formData.__redirectAfterUpdate) {
                              setLocation(
                                user?.role === "admin"
                                  ? "/admin-shipments"
                                  : "/my-shipments",
                              );
                            }
                          } else {
                            // Handle error response
                            let errorMessage = "Failed to update shipment";
                            try {
                              const errorData = await response.json();
                              console.error(
                                "[DIRECT UPDATE] Error details:",
                                errorData,
                              );
                              errorMessage = errorData.message || errorMessage;
                            } catch (e) {
                              console.error(
                                "[DIRECT UPDATE] Could not parse error response:",
                                e,
                              );
                            }

                            toast({
                              title: "Error",
                              description: errorMessage,
                              variant: "destructive",
                            });
                          }
                        } catch (error) {
                          console.error("[DIRECT UPDATE] Exception:", error);
                          toast({
                            title: "Error",
                            description:
                              error instanceof Error
                                ? error.message
                                : "Failed to update shipment",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        style={{ opacity: updateMutation.isPending ? 1 : 0 }}
                      />
                      Update Shipment
                    </Button>
                  </div>
                </form>
              </Form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default withAuth(ShipmentEditContent);
