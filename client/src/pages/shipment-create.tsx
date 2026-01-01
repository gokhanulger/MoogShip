import { useState, useEffect, useRef, useCallback, Component, ErrorInfo, ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useFedExErrorTranslation } from "@/utils/fedexErrorMapping";
import {
  ArrowLeftIcon,
  ArrowRight,
  Package,
  Calculator,
  TruckIcon,
  Loader2,
  ChevronDown,
  ChevronUp,
  Check,
  MapPin,
  Box,
  Truck,
  User,
  Edit,
  Save,
  Printer,
  ExternalLink,
  CheckCircle,
  BoxSelect,
  AlertTriangle,
  UserPlus,
  Search,
  Sparkles,
  Shield,
  Building2,
  FileText,
  Upload,
  Trash2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ServiceLevel, ShipmentStatus } from "@shared/schema";
import PackageItemSelector from "@/components/package-item-selector-redesigned";
import { PackageCustomsForm } from "@/components/package-customs-form";
import { InsuranceSelection } from "@/components/insurance-selection";
import { useShippingAssistant } from "@/components/shipping-assistant-provider";
import useAchievements from "@/hooks/use-achievements";
import { PopIn, FadeIn, SlideUp } from "@/components/animated-elements";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useAuth } from "@/hooks/use-auth";
const upsLogoPath = "/UPS_logo_PNG4.png";
import {
  formatDate,
  formatShipmentId,
  getStatusBadgeColor,
} from "@/lib/shipment-utils";

// TotalCostSummaryComponent
interface TotalCostSummaryComponentProps {
  selectedService: any;
  form: any;
}

function TotalCostSummaryComponent({
  selectedService,
  form,
}: TotalCostSummaryComponentProps) {
  const { t } = useTranslation();

  // Watch form values for insurance and shipping terms
  const includeInsurance = form.watch("includeInsurance");
  const insuranceValue = form.watch("insuranceValue");
  const receiverCountry = form.watch("receiverCountry");
  const shippingTerms = form.watch("shippingTerms") || "ddp";

  if (!selectedService) return null;

  const shippingCost = selectedService.totalPrice || 0;
  
  // Calculate insurance locally as 1% of customs value (consistent with Etsy page)
  const insuranceCostAmount = includeInsurance && insuranceValue && insuranceValue > 0
    ? Math.round(insuranceValue * 0.01) // 1% of insurance value (which is already in cents)
    : 0;
  
  // Extract duty information from selected service
  const dutyInfo = selectedService.duties || {};
  const dutyAmount = dutyInfo.available && dutyInfo.estimatedDuty ? dutyInfo.estimatedDuty * 100 : 0; // Convert to cents
  
  // DDP processing fee (only when DDP is selected for US destinations)
  // Check if ECO shipping based on selectedService
  const isEcoShipping = selectedService?.displayName && 
    (selectedService.displayName.toLowerCase().includes('eco') || selectedService.displayName.toLowerCase().includes('eko'));
  const ddpProcessingFee = receiverCountry === 'US' && shippingTerms === 'ddp' ? 
    (isEcoShipping ? 45 : 450) : 0; // ECO: $0.45, Standard: $4.50
  
  // Calculate total cost based on shipping terms
  const dutyIncludedInTotal = receiverCountry === 'US' && shippingTerms === 'ddp' ? 
    (dutyAmount > 0 ? dutyAmount + ddpProcessingFee : ddpProcessingFee) : 0;
  const totalCost = shippingCost + insuranceCostAmount + dutyIncludedInTotal;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-blue-900">
          {t("createShipment.totalCostSummary", "Total Shipment Cost")}
        </h3>
      </div>

      {/* DAP/DDP Shipping Terms Selector for US destinations */}
      {receiverCountry === 'US' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-yellow-100 rounded-lg">
              <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-yellow-900">
              {t('createShipment.shippingTerms.title', 'Shipping Terms')}
            </h4>
          </div>
          
          <p className="text-sm text-yellow-800 mb-4">
            {t('createShipment.shippingTerms.description', 'Choose who pays the customs duties:')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                shippingTerms === 'dap' 
                  ? 'border-yellow-500 bg-yellow-100' 
                  : 'border-gray-200 hover:border-yellow-300 bg-white'
              }`}
              onClick={() => form.setValue('shippingTerms', 'dap')}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  shippingTerms === 'dap' 
                    ? 'border-yellow-500 bg-yellow-500' 
                    : 'border-gray-300'
                }`}>
                  {shippingTerms === 'dap' && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                  )}
                </div>
                <div>
                  <h5 className="font-medium text-gray-900">
                    {t('createShipment.shippingTerms.dap.title', 'DAP (Delivered at Place)')}
                  </h5>
                  <p className="text-sm text-gray-600">
                    {t('createShipment.shippingTerms.dap.description', 'Receiver pays duties at delivery')}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    + ${(dutyAmount / 100).toFixed(2)} {t('createShipment.shippingTerms.dap.note', '(paid by receiver)')}
                  </p>
                </div>
              </div>
            </button>
            
            <button
              type="button"
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                shippingTerms === 'ddp' 
                  ? 'border-yellow-500 bg-yellow-100' 
                  : 'border-gray-200 hover:border-yellow-300 bg-white'
              }`}
              onClick={() => form.setValue('shippingTerms', 'ddp')}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  shippingTerms === 'ddp' 
                    ? 'border-yellow-500 bg-yellow-500' 
                    : 'border-gray-300'
                }`}>
                  {shippingTerms === 'ddp' && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                  )}
                </div>
                <div>
                  <h5 className="font-medium text-gray-900">
                    {t('createShipment.shippingTerms.ddp.title', 'DDP (Delivered Duty Paid)')}
                  </h5>
                  <p className="text-sm text-gray-600">
                    {t('createShipment.shippingTerms.ddp.description', `Sender pays duties + $${(ddpProcessingFee / 100).toFixed(2)} processing fee`)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    + ${((dutyAmount + ddpProcessingFee) / 100).toFixed(2)} {t('createShipment.shippingTerms.ddp.note', '(included in total)')}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {/* Shipping Cost */}
        <div className="flex justify-between items-center">
          <span className="text-gray-700">
            {t("createShipment.shippingCost", "Shipping Cost")}:
          </span>
          <span className="font-medium text-gray-900">
            ${(shippingCost / 100).toFixed(2)}
          </span>
        </div>

        {/* Insurance Cost (if applicable) */}
        {includeInsurance && insuranceCostAmount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-700">
              {t("customs.insuranceProtection")}:
            </span>
            <span className="font-medium text-green-600">
              ${(insuranceCostAmount / 100).toFixed(2)}
            </span>
          </div>
        )}

        {/* Duty Cost Breakdown (if applicable) */}
        {dutyAmount > 0 && dutyInfo.baseDutyAmount !== undefined && dutyInfo.trumpTariffAmount !== undefined && (
          <>
            {receiverCountry === 'US' && shippingTerms === 'dap' ? (
              <>
                {/* DAP: Show duties for information only */}
                <div className="flex justify-between items-center bg-orange-50 p-2 rounded">
                  <span className="text-orange-700 font-medium">
                    {t("customs.estimatedDuties", "Estimated Duties & Taxes")} ({t("createShipment.informationOnly", "info only")}):
                  </span>
                  <span className="font-semibold text-orange-600">
                    ${(dutyAmount / 100).toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              <>
                {/* Base Duty */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">
                    {t("createShipment.priceDetails.baseDuty")} ({((dutyInfo.baseDutyRate || 0) * 100).toFixed(1)}%):
                  </span>
                  <span className="font-medium text-blue-600">
                    ${(dutyInfo.baseDutyAmount / 100).toFixed(2)}
                  </span>
                </div>
                
                {/* Trump Tariff */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">
                    {t("createShipment.priceDetails.ongoingDuty")} (15.0%):
                  </span>
                  <span className="font-medium text-red-600">
                    ${(dutyInfo.trumpTariffAmount / 100).toFixed(2)}
                  </span>
                </div>
                
                {/* Total Duty */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">
                    {t("customs.estimatedDuties", "Estimated Duties & Taxes")}:
                  </span>
                  <span className="font-semibold text-orange-600">
                    ${(dutyAmount / 100).toFixed(2)}
                  </span>
                </div>
                
                {/* DDP Processing Fee */}
                {receiverCountry === 'US' && shippingTerms === 'ddp' && ddpProcessingFee > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">
                      {t("createShipment.ddpProcessingFee", "DDP Processing Fee")}:
                    </span>
                    <span className="font-medium text-blue-600">
                      ${(ddpProcessingFee / 100).toFixed(2)}
                    </span>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Simple Duty Display (fallback for old format) */}
        {dutyAmount > 0 && (dutyInfo.baseDutyAmount === undefined || dutyInfo.trumpTariffAmount === undefined) && (
          <>
            {receiverCountry === 'US' && shippingTerms === 'dap' ? (
              <div className="flex justify-between items-center bg-orange-50 p-2 rounded">
                <span className="text-orange-700 font-medium">
                  {t("customs.estimatedDuties", "Estimated Duties & Taxes")} ({t("createShipment.informationOnly", "info only")}):
                </span>
                <span className="font-semibold text-orange-600">
                  ${(dutyAmount / 100).toFixed(2)}
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">
                    {t("customs.estimatedDuties", "Estimated Duties & Taxes")}:
                  </span>
                  <span className="font-medium text-orange-600">
                    ${(dutyAmount / 100).toFixed(2)}
                  </span>
                </div>
                {/* DDP Processing Fee */}
                {receiverCountry === 'US' && shippingTerms === 'ddp' && ddpProcessingFee > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">
                      {t("createShipment.ddpProcessingFee", "DDP Processing Fee")}:
                    </span>
                    <span className="font-medium text-blue-600">
                      ${(ddpProcessingFee / 100).toFixed(2)}
                    </span>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Duty Information (if available but zero) */}
        {dutyInfo.available && dutyAmount === 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-700">
              {t("customs.estimatedDuties", "Estimated Duties & Taxes")}:
            </span>
            <span className="font-medium text-green-600">
              Free
            </span>
          </div>
        )}

        {/* DDP Processing Fee only (when no duties but DDP is selected) */}
        {receiverCountry === 'US' && shippingTerms === 'ddp' && dutyAmount === 0 && ddpProcessingFee > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-700">
              {t("createShipment.ddpProcessingFee", "DDP Processing Fee")}:
            </span>
            <span className="font-medium text-blue-600">
              ${(ddpProcessingFee / 100).toFixed(2)}
            </span>
          </div>
        )}

        {/* Total Cost */}
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">
              {t("createShipment.priceDetails.totalCost", "Total Cost")}:
            </span>
            <span className="text-xl font-bold text-blue-600">
              ${(totalCost / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Insurance Coverage Info (if applicable) */}
        {includeInsurance && insuranceValue && (
          <div className="bg-white/60 rounded p-2 mt-2">
            <div className="text-sm text-gray-600">
              {t(
                "customs.insuranceCoverageInfo",
                "Coverage: ${{value}} for lost or stolen packages",
                {
                  value: (insuranceValue / 100).toFixed(2),
                },
              )}
            </div>
          </div>
        )}

        {/* Duty Calculation Info (if applicable) */}
        {dutyInfo.available && (
          <div className="bg-white/60 rounded p-2 mt-2">
            <div className="text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <span>
                  {dutyInfo.provider === 'USITC' ? '⚖️' : dutyInfo.provider === 'OpenAI' ? '💡' : '📊'}
                </span>
                <span>
                  {dutyInfo.provider === 'USITC' 
                    ? `${t("createShipment.priceDetails.dutyInfo.officialUSITC")}${dutyInfo.source === 'official' ? ` ${t("createShipment.priceDetails.dutyInfo.verified")}` : ` ${t("createShipment.priceDetails.dutyInfo.fallback")}`}`
                    : dutyInfo.provider === 'OpenAI' && dutyInfo.confidence 
                    ? `${t("createShipment.priceDetails.dutyInfo.aiCalculated")} (${Math.round(dutyInfo.confidence * 100)}% ${t("createShipment.priceDetails.dutyInfo.confidence")})`
                    : t("createShipment.priceDetails.dutyInfo.estimatedDuties")
                  }
                </span>
              </div>
              {dutyInfo.message && (
                <div className="text-xs text-gray-500 mt-1">
                  {dutyInfo.message}
                </div>
              )}
              {dutyInfo.provider === 'USITC' && dutyInfo.hsCode && (
                <div className="text-xs text-gray-500 mt-1">
                  {t("createShipment.priceDetails.dutyInfo.hsCode")}: {dutyInfo.hsCode}
                </div>
              )}
              {dutyInfo.provider === 'USITC' && dutyInfo.trumpTariffRate && (
                <div className="text-xs text-red-500 mt-1">
                  📈 {t("createShipment.priceDetails.dutyInfo.trumpTariffs")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Interface for custom address fields
interface CustomAddress {
  name: string;
  address: string; // Legacy field
  address1?: string; // Primary address line (max 35 chars)
  address2?: string; // Additional address line (optional, max 35 chars)
  city: string;
  postalCode: string;
  phone: string;
  email: string;
}

// Interface for recipient data
interface Recipient {
  id: number;
  userId: number;
  name: string;
  address: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  phone?: string;
  email?: string;
  isDefault?: boolean;
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { Input } from "@/components/ui/input";
import { AddressPicker } from "@/components/ui/address-picker";
import type { AddressSuggestion } from "@/services/addressVerification";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  COUNTRIES,
  getStatesByCountryCode,
  getCountryCodeByName,
  isEUCountry,
  isHMRCCountry,
} from "@/lib/countries";
import { hasStates } from "@shared/countries";

// Common currencies for customs value
const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
];
import { Label } from "@/components/ui/label";

// Create form schema with proper translations
function createReceiverFormSchema(t: any) {
  return z.object({
    receiverName: z.string().min(1, "Receiver name is required"),
    receiverEmail: z.string().email().optional().or(z.literal("")),
    receiverPhone: z.string().min(1, "Receiver phone is required"),
    receiverAddress: z.string().min(1, "Receiver address is required"),
    receiverSuite: z.string().optional().or(z.literal("")), // Suite/apartment/unit field
    receiverState: z.string().optional().or(z.literal("")), // State/province field
    receiverCity: z.string().min(1, "Receiver city is required"),
    receiverPostalCode: z.string().min(1, "Receiver postal code is required"),
    packageContents: z
      .string()
      .min(1, t("validations.contentsRequired")),

    // Sender details - make some fields optional to accommodate pre-filled info
    senderName: z.string().min(1, "Sender name is required"),
    senderAddress: z.string().min(1, "Sender address is required"),
    // Support for structured address fields (optional)
    senderAddress1: z
      .string()
      .max(35, "Maximum 35 characters")
      .optional()
      .or(z.literal("")),
    senderAddress2: z
      .string()
      .max(35, "Maximum 35 characters")
      .optional()
      .or(z.literal("")),
    senderCity: z.string().optional().or(z.literal("")), // Make city optional
    senderState: z.string().optional().or(z.literal("")), // State/province field for sender
    senderPostalCode: z.string().optional().or(z.literal("")), // Make postal code optional
    senderPhone: z.string().optional().or(z.literal("")),
    senderEmail: z.string().email().optional().or(z.literal("")),
  });
}

// Create dynamic validation schema that requires state for countries with states
function createDynamicReceiverFormSchema(t: any, selectedCountry: string) {
  const baseSchema = createReceiverFormSchema(t);
  
  // If the selected country has states, make the state field required
  if (selectedCountry && hasStates(selectedCountry)) {
    return baseSchema.extend({
      receiverState: z.string().min(1, "State/Province is required for this country"),
    });
  }
  
  return baseSchema;
}

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class ShipmentCreateErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ShipmentCreate component error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: 'ShipmentCreateErrorBoundary'
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Layout>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">There was an error loading the shipment creation page.</p>
            <Button onClick={() => this.setState({ hasError: false, error: null })}>
              Try Again
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/dashboard'} className="mt-2">
              Go to Dashboard
            </Button>
          </div>
        </Layout>
      );
    }

    return this.props.children;
  }
}

// Define a function to create the form schema with translations
function createPackageFormSchema(t: any) {
  return z.object({
    receiverCountry: z.string().min(1, t("validations.countryRequired")),
    packageLength: z.coerce.number().min(1, t("validations.lengthTooSmall")),
    packageWidth: z.coerce.number().min(1, t("validations.widthTooSmall")),
    packageHeight: z.coerce.number().min(1, t("validations.heightTooSmall")),
    packageWeight: z.coerce.number().min(0.1, t("validations.weightTooSmall")),
    pieceCount: z.coerce.number().min(1, t("validations.atLeastOnePackage")),
    itemCount: z.coerce.number().min(1, t("validations.atLeastOneItem")),
    customsValue: z.coerce
      .number()
      .min(0, t("validations.customsValueNotNegative")),
    currency: z.string().default("USD"),
    gtipCode: z.string().optional().or(z.literal("")),
    iossNumber: z.string().optional(),
    shippingTerms: z.enum(["dap", "ddp"]).optional().default("ddp"),
    serviceLevel: z.string().min(1, t("validations.serviceLevelRequired")),
    // Insurance options
    includeInsurance: z.boolean().default(false),
  });
}

function ShipmentCreate() {
  console.log('[ShipmentCreate] Component initializing...');
  
  const [location, navigate] = useLocation();
  const { t } = useTranslation();
  const { translateFedExError, getValidationStatusText } = useFedExErrorTranslation();
  
  console.log('[ShipmentCreate] Hooks initialized successfully');

  // Use auth hook with proper error handling
  const auth = useAuth();
  const user = auth?.user;

  const [expandedSections, setExpandedSections] = useState(["recipient"]);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [senderCountry, setSenderCountry] = useState("TR"); // Default to Turkey
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(
    null,
  );
  const [filteredRecipients, setFilteredRecipients] = useState<Recipient[]>([]);
  const [showRecipientSuggestions, setShowRecipientSuggestions] =
    useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);
  const [showPreviousShipments, setShowPreviousShipments] = useState(false);
  const [customAddress, setCustomAddress] = useState<CustomAddress>({
    name: "",
    address: "",
    city: "",
    postalCode: "",
    phone: "",
    email: "",
  });
  const [billableWeight, setBillableWeight] = useState<number | null>(null);
  const [priceDetails, setPriceDetails] = useState<any>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  // Price acceptance is now combined with label creation
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdShipment, setCreatedShipment] = useState<any>(null);
  
  // Invoice upload state for success dialog
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  // Package change detection state
  const [lastPackageState, setLastPackageState] = useState<{
    weight: string;
    length: string;
    width: string;
    height: string;
  } | null>(null);

  // Check for package changes and clear pricing if needed
  const checkPackageChanges = () => {
    const currentValues = packageForm.getValues();
    const currentState = {
      weight: String(currentValues.packageWeight || ""),
      length: String(currentValues.packageLength || ""),
      width: String(currentValues.packageWidth || ""),
      height: String(currentValues.packageHeight || ""),
    };

    // If we have pricing and package state has changed, clear pricing
    if (priceDetails && lastPackageState) {
      const hasChanged =
        lastPackageState.weight !== currentState.weight ||
        lastPackageState.length !== currentState.length ||
        lastPackageState.width !== currentState.width ||
        lastPackageState.height !== currentState.height;

      if (hasChanged) {
        setPriceDetails(null);
        setBillableWeight(null);
      }
    }

    // Update last package state
    setLastPackageState({
      weight: String(currentState.weight),
      length: String(currentState.length),
      width: String(currentState.width),
      height: String(currentState.height),
    });
  };

  // Fetch saved recipients
  const { data: recipients, isLoading: isLoadingRecipients } = useQuery<
    Recipient[]
  >({
    queryKey: ["/api/recipients"],
    queryFn: async () => {
      const response = await fetch("/api/recipients", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch recipients");
      }
      const data = await response.json();
      return data;
    },
  });

  // Fetch previous shipments for copying
  const { data: previousShipments, isLoading: isLoadingPreviousShipments } =
    useQuery<any[]>({
      queryKey: ["/api/shipments/my"],
      queryFn: async () => {
        const response = await fetch("/api/shipments/my", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch previous shipments");
        }
        const shipments = await response.json();
        // Sort by creation date (newest first) - fetch all shipments
        return shipments.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      },
    });

  // State to track if package details have been modified since last price calculation
  const [packageDetailsChanged, setPackageDetailsChanged] = useState(false);

  // State for managing multiple package items
  const [packageItems, setPackageItems] = useState<any[]>([]);

  // State for managing packages
  const [packages, setPackages] = useState<any[]>([]);

  // State to store the current user ID
  const [currentUserId, setCurrentUserId] = useState<number>(0);

  // State for selected service option
  const [selectedServiceOption, setSelectedServiceOption] = useState<any>(null);

  // No need for selected country/state state variables - we'll rely on form values

  // State for credit limit information
  const [creditLimitInfo, setCreditLimitInfo] = useState<{
    userBalance: number;
    formattedUserBalance: string;
    minBalance: number;
    formattedMinBalance: string;
    newBalance: number;
    formattedNewBalance: string;
    hasWarning: boolean;
    exceededAmount: number;
    formattedExceededAmount: string;
    availableCredit: number;
    formattedAvailableCredit: string;
  } | null>(null);

  // Function to check credit limit
  const checkCreditLimit = async (shipmentPrice: number) => {
    try {
      // Validate shipment price - if invalid, don't show credit limit info
      if (!shipmentPrice || isNaN(shipmentPrice) || shipmentPrice <= 0) {
        setCreditLimitInfo(null);
        return;
      }

      // Get both user data and balance with additional error handling
      const userResponse = await apiRequest("GET", "/api/user").catch(err => {
        console.warn('Failed to fetch user data:', err);
        return null;
      });
      const balanceResponse = await apiRequest("GET", "/api/balance").catch(err => {
        console.warn('Failed to fetch balance data:', err);
        return null;
      });

      if (userResponse?.ok && balanceResponse?.ok) {
        const userData = await userResponse.json();
        const balanceData = await balanceResponse.json();

        // Safely extract balance data with fallback values
        const currentBalance = balanceData?.balance ?? 0;
        const minBalance = balanceData?.minimumBalance ?? 0;
        
        // Validate that we have valid numbers before calculations
        if (typeof currentBalance !== 'number' || typeof minBalance !== 'number') {
          console.warn('Invalid balance data received:', { currentBalance, minBalance });
          setCreditLimitInfo(null);
          return;
        }

        // Calculate new balance after this shipment
        const newBalance = currentBalance - shipmentPrice;

        // Calculate if we've exceeded the minimum balance
        const hasWarning = newBalance < minBalance;
        const exceededAmount = hasWarning
          ? Math.abs(newBalance - minBalance)
          : 0;

        // Format currency values for display
        const formatCurrency = (amount: number) => {
          return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
          }).format(amount / 100);
        };

        // Calculate available credit (credit limit - current balance)
        const availableCredit = minBalance - currentBalance;

        // Update credit limit info state
        setCreditLimitInfo({
          userBalance: currentBalance,
          formattedUserBalance: formatCurrency(currentBalance),
          minBalance: minBalance,
          formattedMinBalance: formatCurrency(minBalance),
          newBalance: newBalance,
          formattedNewBalance: formatCurrency(newBalance),
          hasWarning: hasWarning,
          exceededAmount: exceededAmount,
          formattedExceededAmount: formatCurrency(exceededAmount),
          availableCredit: availableCredit, // Add this for clarity
          formattedAvailableCredit: formatCurrency(availableCredit),
        });
      }
    } catch (error) {
      console.error("Error checking credit limit:", error);
    }
  };

  // Function to copy address only from previous shipment
  const copyAddressOnly = async (shipment: any) => {
    try {
      // Fetch full shipment details
      const response = await apiRequest("GET", `/api/shipments/${shipment.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch shipment details");
      }

      const shipmentDetails = await response.json();

      // Copy only receiver address information
      receiverForm.reset({
        ...receiverForm.getValues(), // Keep existing values for other fields
        receiverName: shipmentDetails.receiverName || "",
        receiverEmail: shipmentDetails.receiverEmail || "",
        receiverPhone: shipmentDetails.receiverPhone || "",
        receiverAddress: shipmentDetails.receiverAddress || "",
        receiverSuite: shipmentDetails.receiverSuite || "",
        receiverState: shipmentDetails.receiverState || "",
        receiverCity: shipmentDetails.receiverCity || "",
        receiverPostalCode: shipmentDetails.receiverPostalCode || "",
      });

      // Copy country for package form
      packageForm.setValue(
        "receiverCountry",
        shipmentDetails.receiverCountry || "",
      );

      // Show success message
      toast({
        title: "common.success",
        description: `Copied address from shipment #${shipment.id}`,
      });

      // Close the previous shipments section
      setShowPreviousShipments(false);

      // Expand recipient section to show copied data
      setExpandedSections((prev) =>
        prev.includes("recipient") ? prev : [...prev, "recipient"],
      );
    } catch (error) {
      console.error("Error copying address data:", error);
      toast({
        title: "common.error",
        description: "Failed to copy address data",
        variant: "destructive",
      });
    }
  };

  // Function to copy everything from previous shipment
  const copyEverything = async (shipment: any) => {
    try {
      // Fetch full shipment details and package items
      const [shipmentResponse, itemsResponse] = await Promise.all([
        apiRequest("GET", `/api/shipments/${shipment.id}`),
        apiRequest("GET", `/api/shipments/${shipment.id}/items`),
      ]);

      if (!shipmentResponse.ok) {
        throw new Error("Failed to fetch shipment details");
      }

      const shipmentDetails = await shipmentResponse.json();
      let packageItems = [];

      // Fetch package items if available
      if (itemsResponse.ok) {
        packageItems = await itemsResponse.json();
      } else {
      }

      // Copy receiver information
      receiverForm.reset({
        receiverName: shipmentDetails.receiverName || "",
        receiverEmail: shipmentDetails.receiverEmail || "",
        receiverPhone: shipmentDetails.receiverPhone || "",
        receiverAddress: shipmentDetails.receiverAddress || "",
        receiverSuite: shipmentDetails.receiverSuite || "",
        receiverState: shipmentDetails.receiverState || "",
        receiverCity: shipmentDetails.receiverCity || "",
        receiverPostalCode: shipmentDetails.receiverPostalCode || "",
        packageContents: shipmentDetails.packageContents || "",
        senderName: shipmentDetails.senderName || "",
        senderAddress: shipmentDetails.senderAddress || "",
        senderAddress1: shipmentDetails.senderAddress1 || "",
        senderAddress2: shipmentDetails.senderAddress2 || "",
        senderCity: shipmentDetails.senderCity || "",
        senderPostalCode: shipmentDetails.senderPostalCode || "",
        senderPhone: shipmentDetails.senderPhone || "",
        senderEmail: shipmentDetails.senderEmail || "",
      });

      // Copy package information if available
      if (shipmentDetails.packages && shipmentDetails.packages.length > 0) {
        const firstPackage = shipmentDetails.packages[0];
        packageForm.reset({
          receiverCountry: shipmentDetails.receiverCountry || "",
          packageLength: firstPackage.length || 0,
          packageWidth: firstPackage.width || 0,
          packageHeight: firstPackage.height || 0,
          packageWeight: firstPackage.weight || 0,
          pieceCount: shipmentDetails.packages.length,
          itemCount: shipmentDetails.packages.reduce(
            (sum: number, pkg: any) =>
              sum +
              (pkg.items?.reduce(
                (itemSum: number, item: any) => itemSum + (item.quantity || 1),
                0,
              ) || 1),
            0,
          ),
          customsValue: shipmentDetails.customsValue || 0,
          currency: shipmentDetails.currency || "USD",
          gtipCode: shipmentDetails.gtipCode || "",
          serviceLevel: shipmentDetails.serviceLevel || ServiceLevel.STANDARD,
          includeInsurance: shipmentDetails.includeInsurance || false,
        });

        // Copy packages data with proper structure including items

        // Attach package items to packages
        const packagesWithItems = shipmentDetails.packages.map((pkg: any) => ({
          ...pkg,
          items: packageItems.filter(
            (item: any) => item.packageId === pkg.id || !item.packageId,
          ),
        }));

        setPackages(packagesWithItems);

        // Also set the items in the items state for the component to display
        if (packageItems.length > 0) {
          // Convert package items to the expected format for the component
          const formattedItems = packageItems.map((item: any) => ({
            id: item.id,
            name: item.name || "",
            description: item.description || "",
            quantity: item.quantity?.toString() || "1",
            price: item.price ? (item.price / 100).toString() : "0", // Convert from cents
            gtin: item.gtin || "",
            hsCode: item.hsCode || "",
            weight: item.weight?.toString() || "",
            length: item.length?.toString() || "0",
            width: item.width?.toString() || "0",
            height: item.height?.toString() || "0",
            countryOfOrigin: item.countryOfOrigin || "",
            manufacturer: item.manufacturer || "",
            packageId: item.packageId,
          }));

          setPackageItems(formattedItems);

          // Also log the current packageItems state after setting
        }
      }

      // Show success message
      toast({
        title: "common.success",
        description: `Copied all data from shipment #${shipment.id}`,
      });

      // Close the previous shipments section
      setShowPreviousShipments(false);

      // Expand relevant sections to show copied data
      setExpandedSections(["recipient", "package"]);
    } catch (error) {
      console.error("Error copying shipment data:", error);
      toast({
        title: "common.error",
        description: "Failed to copy shipment data",
        variant: "destructive",
      });
    }
  };

  // Create the receiver schema with translations
  const receiverSchema = createReceiverFormSchema(t);

  // Initialize forms with default values
  const receiverForm = useForm<z.infer<typeof receiverSchema>>({
    resolver: zodResolver(receiverSchema),
    defaultValues: {
      receiverName: "",
      receiverEmail: "",
      receiverPhone: "",
      receiverAddress: "",
      receiverSuite: "",
      receiverState: "",
      receiverCity: "",
      receiverPostalCode: "",
      packageContents: "",
      senderName: "",
      senderAddress: "",
      senderAddress1: "",
      senderAddress2: "",
      senderCity: "",
      senderState: "",
      senderPostalCode: "",
      senderPhone: "",
      senderEmail: "",
    },
  });



  // Create the schema with translations
  const packageFormSchema = createPackageFormSchema(t);

  const packageForm = useForm<z.infer<typeof packageFormSchema>>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      receiverCountry: "",
      packageLength: 0,
      packageWidth: 0,
      packageHeight: 0,
      packageWeight: 0,
      pieceCount: 1,
      itemCount: 1,
      // Store customs value in cents (integer) in the database
      customsValue: 0,
      currency: "USD",
      gtipCode: "",
      serviceLevel: ServiceLevel.STANDARD,
      shippingTerms: "ddp",
      // Insurance option
      includeInsurance: false,
    },
  });

  // FedEx validation states for receiver address
  const [receiverAddressValidationResult, setReceiverAddressValidationResult] = useState<any>(null);
  const [receiverPostalCodeValidationResult, setReceiverPostalCodeValidationResult] = useState<any>(null);
  
  // Reentrancy guards to prevent validation loops
  const isNormalizingRef = useRef(false);
  const lastValidatedPostalCodeRef = useRef<string | null>(null);

  // FedEx receiver address validation mutation
  const validateReceiverAddressMutation = useMutation({
    mutationFn: async (addressData: {
      streetLines: string[];
      city: string;
      stateOrProvinceCode?: string;
      postalCode?: string;
      countryCode: string;
    }) => {
      const response = await apiRequest('POST', '/api/fedex/validate-address', addressData);
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      setReceiverAddressValidationResult(data);
      
      if (data.isValid) {
        // Clear any form errors for receiver address field when validation succeeds
        receiverForm.clearErrors('receiverAddress');
        
        if (data.standardizedAddress) {
          // Auto-populate receiver form with standardized address
          const standardized = data.standardizedAddress;
          receiverForm.setValue('receiverAddress', standardized.streetLines.join(', '));
          receiverForm.setValue('receiverCity', standardized.city);
          if (standardized.stateOrProvinceCode) {
            receiverForm.setValue('receiverState', standardized.stateOrProvinceCode);
          }
          if (standardized.postalCode) {
            // For USA addresses, only use 5-digit postal codes (strip -#### extension)
            let formattedPostalCode = standardized.postalCode;
            if (standardized.countryCode === 'US' && formattedPostalCode.includes('-')) {
              formattedPostalCode = formattedPostalCode.split('-')[0];
            }
            // Use setValue with trigger: false to prevent triggering postal code validation loop
            receiverForm.setValue('receiverPostalCode', formattedPostalCode, { shouldValidate: false });
          }
        }
        
        toast({
          title: t("createShipment.validation.addressValidated", "Address Validated"),
          description: data.deliverability === 'DELIVERABLE' ? 
            t("createShipment.validation.addressDeliverable", "Address is valid and deliverable") : 
            t("createShipment.validation.addressValid", "Address validated successfully"),
        });
      } else {
        // Set form error when validation fails
        receiverForm.setError('receiverAddress', {
          type: 'manual',
          message: data.errors?.[0] || t("createShipment.validation.addressInvalid", "Address could not be validated")
        });
        
        toast({
          title: t("createShipment.validation.addressValidation", "Address Validation"),
          description: data.errors?.[0] || t("createShipment.validation.addressInvalid", "Address could not be validated"),
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: t("createShipment.validation.validationError", "Validation Error"),
        description: error.message || t("createShipment.validation.addressValidationFailed", "Failed to validate address"),
        variant: "destructive",
      });
    }
  });

  // FedEx receiver postal code validation mutation
  const validateReceiverPostalCodeMutation = useMutation({
    mutationFn: async (postalData: {
      postalCode: string;
      countryCode: string;
      stateOrProvinceCode?: string;
      carrierCode?: 'FDXE' | 'FDXG';
    }) => {
      const response = await apiRequest('POST', '/api/fedex/validate-postal-code', postalData);
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      setReceiverPostalCodeValidationResult(data);
      
      if (data.isValid) {
        // Auto-populate city and state if provided by validation
        isNormalizingRef.current = true;
        if (data.city) {
          receiverForm.setValue('receiverCity', data.city, { shouldValidate: false });
        }
        if (data.stateOrProvinceCode) {
          receiverForm.setValue('receiverState', data.stateOrProvinceCode, { shouldValidate: false });
        }
        lastValidatedPostalCodeRef.current = watchedReceiverPostalCode;
        isNormalizingRef.current = false;
        
        toast({
          title: t("createShipment.validation.postalCodeValidated", "Postal Code Validated"),
          description: data.city ? 
            t("createShipment.validation.postalCodeValidForCity", "Valid postal code for {{city}}, {{state}}", { city: data.city, state: data.stateOrProvinceCode || '' }) :
            t("createShipment.validation.postalCodeValid", "Postal code is valid"),
        });
      } else {
        toast({
          title: t("createShipment.validation.postalCodeValidation", "Postal Code Validation"),
          description: data.errors?.[0] || t("createShipment.validation.postalCodeInvalid", "Postal code could not be validated"),
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: t("createShipment.validation.validationError", "Validation Error"),
        description: error.message || t("createShipment.validation.postalCodeValidationFailed", "Failed to validate postal code"),
        variant: "destructive",
      });
    }
  });

  // Helper functions for FedEx receiver validation
  const validateReceiverAddress = () => {
    const formValues = receiverForm.getValues();
    const { receiverAddress, receiverCity, receiverState, receiverPostalCode } = formValues;
    const receiverCountry = packageForm.getValues('receiverCountry');
    
    if (!receiverAddress || !receiverCity || !receiverCountry) {
      toast({
        title: t("createShipment.validation.validationError", "Validation Error"),
        description: t("createShipment.validation.addressFieldsRequired", "Address, city, and country are required for validation"),
        variant: "destructive",
      });
      return;
    }

    validateReceiverAddressMutation.mutate({
      streetLines: [receiverAddress],
      city: receiverCity,
      stateOrProvinceCode: receiverState || undefined,
      postalCode: receiverPostalCode || undefined,
      countryCode: receiverCountry
    });
  };

  const validateReceiverPostalCode = () => {
    const formValues = receiverForm.getValues();
    const { receiverPostalCode } = formValues;
    const receiverCountry = packageForm.getValues('receiverCountry');
    
    if (receiverPostalCode && receiverCountry) {
      validateReceiverPostalCodeMutation.mutate({
        postalCode: receiverPostalCode,
        countryCode: receiverCountry,
        stateOrProvinceCode: receiverForm.getValues('receiverState')?.trim().toUpperCase() || undefined, // Include state for US/CA
        carrierCode: 'FDXE'
      });
    }
  };

  // Watch form fields for automatic validation
  const watchedReceiverPostalCode = receiverForm.watch("receiverPostalCode");
  const watchedReceiverCountry = packageForm.watch("receiverCountry");
  const watchedReceiverState = receiverForm.watch("receiverState");

  // Auto-validate receiver postal code when country, state, and postal code are filled
  useEffect(() => {
    // Prevent validation loop when normalizing
    if (isNormalizingRef.current) return;
    
    // Prevent re-validation of the same postal code
    if (watchedReceiverPostalCode === lastValidatedPostalCodeRef.current) return;
    
    if (watchedReceiverPostalCode && watchedReceiverCountry && 
        watchedReceiverPostalCode.trim() && watchedReceiverCountry.trim()) {
      const timer = setTimeout(() => {
        validateReceiverPostalCode();
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timer);
    }
  }, [watchedReceiverPostalCode, watchedReceiverCountry, watchedReceiverState]);

  // Auto-validate receiver address when address, city, and country are filled
  const watchedReceiverAddress = receiverForm.watch("receiverAddress");
  const watchedReceiverCity = receiverForm.watch("receiverCity");
  
  useEffect(() => {
    if (watchedReceiverAddress && watchedReceiverCity && watchedReceiverCountry && 
        watchedReceiverAddress.trim() && watchedReceiverCity.trim() && watchedReceiverCountry.trim()) {
      const timer = setTimeout(() => {
        validateReceiverAddress();
      }, 1500); // Debounce for 1.5 seconds

      return () => clearTimeout(timer);
    }
  }, [watchedReceiverAddress, watchedReceiverCity, watchedReceiverCountry]);

  // Watch the selected country to enable dynamic validation
  const selectedCountry = packageForm.watch("receiverCountry");
  const selectedState = receiverForm.watch("receiverState");
  
  // Update receiver form validation when country or state changes
  useEffect(() => {
    if (selectedCountry) {
      // Manually validate the state field if country has states
      if (hasStates(selectedCountry)) {
        const currentState = receiverForm.getValues("receiverState");
        if (!currentState || currentState.trim() === "") {
          receiverForm.setError("receiverState", {
            type: "manual",
            message: "State/Province is required for this country"
          });
        } else {
          // Clear the error if state is now filled
          receiverForm.clearErrors("receiverState");
        }
      } else {
        // Clear state field error if country doesn't have states
        receiverForm.clearErrors("receiverState");
      }
    }
  }, [selectedCountry, selectedState, receiverForm, t]);

  // Also clear the state validation error when state field changes
  useEffect(() => {
    if (selectedState && selectedState.trim() !== "" && selectedCountry && hasStates(selectedCountry)) {
      receiverForm.clearErrors("receiverState");
    }
  }, [selectedState, selectedCountry, receiverForm]);

  // Load draft data when the page loads

  // Calculate total package dimensions from all packages
  const calculateTotalPackageDimensions = (packages: any[]) => {
    if (!packages.length) return null;

    // For a single package, use its dimensions directly
    if (packages.length === 1) {
      const pkg = packages[0];
      let itemCount = 0;

      // Safely calculate items - handle case where pkg.items might be undefined
      if (pkg.items && Array.isArray(pkg.items)) {
        itemCount = pkg.items.reduce(
          (sum: number, item: any) => sum + parseInt(item.quantity || 1),
          0,
        );
      }

      // Ensure itemCount is at least 1 if we have a package
      itemCount = Math.max(1, itemCount);

      return {
        length: pkg.length || 0,
        width: pkg.width || 0,
        height: pkg.height || 0,
        weight: pkg.weight || 0,
        itemCount: itemCount,
      };
    }

    // For multiple packages, calculate combined dimensions
    // Note: This is a simplified approach. In real shipping, package dimensions
    // aren't simply added together.

    let totalWeight = 0;
    let totalVolume = 0;
    let totalItems = 0;

    packages.forEach((pkg) => {
      // Calculate weight
      totalWeight += parseFloat(pkg.weight || 0);

      // Calculate volume and add to total
      const volume =
        parseFloat(pkg.length || 0) *
        parseFloat(pkg.width || 0) *
        parseFloat(pkg.height || 0);
      totalVolume += volume;

      // Count items safely
      if (pkg.items && Array.isArray(pkg.items)) {
        totalItems += pkg.items.reduce(
          (sum: number, item: any) => sum + parseInt(item.quantity || 1),
          0,
        );
      }
    });

    // Ensure we have at least one item (packages count as items if no explicit items)
    totalItems = Math.max(packages.length, totalItems);

    // For multiple packages, determine "virtual" dimensions that represent the equivalent volume
    // This is an approximation for ease of calculation
    const cubeRoot = Math.cbrt(totalVolume);

    return {
      length: Math.round(cubeRoot * 10) / 10, // Round to 1 decimal place
      width: Math.round(cubeRoot * 10) / 10,
      height: Math.round(cubeRoot * 10) / 10,
      weight: Math.round(totalWeight * 100) / 100, // Round to 2 decimal places
      itemCount: totalItems,
    };
  };

  // Load draft data when the page loads
  useEffect(() => {
    const loadDraftData = async () => {
      try {
        // Extract draftId from URL query parameters
        const searchParams = new URLSearchParams(window.location.search);
        const draftIdParam = searchParams.get("draftId");

        if (draftIdParam) {
          const draftId = parseInt(draftIdParam);
          if (!isNaN(draftId)) {
            setCurrentDraftId(draftId);

            // Fetch draft data
            const response = await apiRequest("GET", `/api/drafts/${draftId}`);

            if (response.ok) {
              const draftData = await response.json();

              // Populate receiver form with draft data
              receiverForm.reset({
                receiverName: draftData.receiverName || "",
                receiverEmail: draftData.receiverEmail || "",
                receiverPhone: draftData.receiverPhone || "",
                receiverAddress: draftData.receiverAddress || "",
                receiverSuite: draftData.receiverSuite || "",
                receiverCity: draftData.receiverCity || "",
                receiverState: draftData.receiverState || "",
                receiverPostalCode: draftData.receiverPostalCode || "",
                packageContents: draftData.packageContents || "",

                // Sender information
                senderName: draftData.senderName || "",
                senderAddress: draftData.senderAddress1 || "", // Map to legacy field
                senderAddress1: draftData.senderAddress1 || "",
                senderAddress2: draftData.senderAddress2 || "",
                senderCity: draftData.senderCity || "",
                senderState: draftData.senderState || "",
                senderPostalCode: draftData.senderPostalCode || "",
                senderPhone: draftData.senderPhone || "",
                senderEmail: draftData.senderEmail || "",
              });

              // Populate package form with draft data
              packageForm.reset({
                receiverCountry: draftData.receiverCountry || "",
                packageLength: draftData.packageLength || 0,
                packageWidth: draftData.packageWidth || 0,
                packageHeight: draftData.packageHeight || 0,
                packageWeight: draftData.packageWeight || 0,
                pieceCount: draftData.pieceCount || 1,
                itemCount: 1, // Default to 1 if not specified
                customsValue: draftData.customsValue || 0,
                currency: draftData.currency || "USD",
                gtipCode: draftData.gtipCode || "",
                serviceLevel: draftData.serviceLevel || "standard",
                includeInsurance: draftData.isInsured || false,
              });

              // Load package items if available
              if (draftData.packageItemsData) {
                try {
                  const loadedPackageItems = JSON.parse(
                    draftData.packageItemsData,
                  );
                  if (
                    Array.isArray(loadedPackageItems) &&
                    loadedPackageItems.length > 0
                  ) {
                    setPackageItems(loadedPackageItems);
                  }
                } catch (error) {
                  console.error("Error parsing package items data:", error);
                }
              }

              // Load packages data if available
              if (draftData.packagesData) {
                try {
                  const loadedPackages = JSON.parse(draftData.packagesData);
                  if (
                    Array.isArray(loadedPackages) &&
                    loadedPackages.length > 0
                  ) {
                    setPackages(loadedPackages);
                  }
                } catch (error) {
                  console.error("Error parsing packages data:", error);
                }
              }

              // Expand all sections to show the loaded data
              setExpandedSections(["recipient", "package", "services"]);

              toast({
                title: t("draftLoaded", "Draft Loaded"),
                description: t(
                  "draftLoadedDesc",
                  "Your draft has been loaded successfully",
                ),
              });
            } else {
              console.error("Failed to load draft:", await response.text());
              toast({
                variant: "destructive",
                title: t("draftLoadError", "Error Loading Draft"),
                description: t(
                  "draftLoadErrorDesc",
                  "Failed to load the draft. Please try again.",
                ),
              });
            }
          }
        }
      } catch (error) {
        console.error("Error loading draft:", error);
        toast({
          variant: "destructive",
          title: t("draftLoadError", "Error Loading Draft"),
          description: t(
            "draftLoadErrorDesc",
            "Failed to load the draft. Please try again.",
          ),
        });
      }
    };

    loadDraftData();
  }, [location, receiverForm, packageForm, t, toast]);

  // Watch for package form changes to detect when details are modified
  useEffect(() => {
    // Subscribe to form changes
    const subscription = packageForm.watch(() => {
      if (priceDetails) {
        setPackageDetailsChanged(true);
      }
    });

    // Cleanup subscription
    return () => subscription.unsubscribe();
  }, [packageForm, priceDetails]);

  // Watch for changes in packages array and update form fields
  useEffect(() => {
    if (packages.length > 0) {
      // Calculate total dimensions and weight from all packages
      const totalDimensions = calculateTotalPackageDimensions(packages);

      if (totalDimensions) {
        // Update package form with the calculated values
        packageForm.setValue("packageLength", totalDimensions.length);
        packageForm.setValue("packageWidth", totalDimensions.width);
        packageForm.setValue("packageHeight", totalDimensions.height);
        packageForm.setValue("packageWeight", totalDimensions.weight);
        packageForm.setValue("pieceCount", packages.length);

        // IMPORTANT: Always ensure itemCount is at least equal to packages.length
        // This fixes the "itemCount must be at least 1" validation error
        const itemCount = Math.max(packages.length, totalDimensions.itemCount);
        packageForm.setValue("itemCount", itemCount);

        // Also update the billable weight
        const volumetricWeight = calculateVolumetricWeight(
          totalDimensions.length,
          totalDimensions.width,
          totalDimensions.height,
        );
        setBillableWeight(Math.max(volumetricWeight, totalDimensions.weight));

        // Mark the package details as changed to require price recalculation
        if (priceDetails) {
          setPackageDetailsChanged(true);
        }
      }
    }
  }, [packages]);

  // Load user data for sender information and initialize from localStorage
  useEffect(() => {
    // Load user data for sender information with Turkish to English conversion
    loadUserData();

    // Check if values from the calculator are available in localStorage
    const length = localStorage.getItem("calculator_length");
    const width = localStorage.getItem("calculator_width");
    const height = localStorage.getItem("calculator_height");
    const weight = localStorage.getItem("calculator_weight");
    const pieceCount = localStorage.getItem("calculator_piece_count");
    const country = localStorage.getItem("calculator_country");
    const service = localStorage.getItem("calculator_service");
    const contents = localStorage.getItem("calculator_contents");

    // If we have any values from the calculator
    if (length || width || height || weight || country) {
      // Update form values if they exist
      if (length) packageForm.setValue("packageLength", parseFloat(length));
      if (width) packageForm.setValue("packageWidth", parseFloat(width));
      if (height) packageForm.setValue("packageHeight", parseFloat(height));
      if (weight) packageForm.setValue("packageWeight", parseFloat(weight));
      if (pieceCount) packageForm.setValue("pieceCount", parseInt(pieceCount));
      if (country) packageForm.setValue("receiverCountry", country);
      if (service) packageForm.setValue("serviceLevel", service);
      if (contents) receiverForm.setValue("packageContents", contents);

      // Clear stored values after using them
      localStorage.removeItem("calculator_length");
      localStorage.removeItem("calculator_width");
      localStorage.removeItem("calculator_height");
      localStorage.removeItem("calculator_weight");
      localStorage.removeItem("calculator_piece_count");
      localStorage.removeItem("calculator_country");
      localStorage.removeItem("calculator_service");
      localStorage.removeItem("calculator_contents");

      // Set up the billable weight
      if (length && width && height && weight) {
        const volumetricWeight = calculateVolumetricWeight(
          parseFloat(length),
          parseFloat(width),
          parseFloat(height),
        );

        setBillableWeight(Math.max(volumetricWeight, parseFloat(weight)));

        // If we have enough info, trigger price calculation automatically
        if (country) {
          setTimeout(() => {
            calculatePrice();
            // Auto-expand the package details section
            setExpandedSections((prev) =>
              prev.includes("package") ? prev : [...prev, "package"],
            );
          }, 500);
        }
      }
    }
  }, []);

  // Helper to check if a section is complete
  const isSectionComplete = (section: string): boolean => {
    if (section === "recipient") {
      const values = receiverForm.getValues();
      return Boolean(
        values.receiverName &&
          values.receiverPhone &&
          values.receiverAddress &&
          values.receiverCity &&
          values.receiverPostalCode &&
          values.packageContents &&
          packageForm.getValues().receiverCountry &&
          // For sender, only check the required fields (name, address)
          values.senderName &&
          values.senderAddress,
      );
    } else if (section === "package") {
      const values = packageForm.getValues();
      return Boolean(
        values.packageLength > 0 &&
          values.packageWidth > 0 &&
          values.packageHeight > 0 &&
          values.packageWeight > 0 &&
          values.serviceLevel,
      );
    } else if (section === "price") {
      return Boolean(priceDetails);
    }
    return false;
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section],
    );
  };

  function calculateVolumetricWeight(
    length: number,
    width: number,
    height: number,
  ): number {
    // Volumetric weight formula: Length × Width × Height (cm) ÷ 5000 = Volumetric Weight (kg)
    return (length * width * height) / 5000;
  }

  // Function to use selected recipient data in the form
  // Function to filter recipients based on search query
  const filterRecipients = useCallback((searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setFilteredRecipients([]);
      setShowRecipientSuggestions(false);
      return;
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      setFilteredRecipients([]);
      setShowRecipientSuggestions(false);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    
    const filtered = recipients.filter((recipient: any) => {
      if (!recipient) return false;
      
      const name = (recipient.name || '').toLowerCase();
      const address = (recipient.address || '').toLowerCase();
      const city = (recipient.city || '').toLowerCase();
      
      const matches = (
        name.includes(query) ||
        address.includes(query) ||
        city.includes(query)
      );
      
      return matches;
    });
    
    setFilteredRecipients(filtered);
    setShowRecipientSuggestions(filtered.length > 0);
  }, [recipients]);

  const useRecipientData = (recipient: Recipient) => {
    if (!recipient) return;

    try {
      // Fill in recipient form fields
      receiverForm.setValue("receiverName", recipient.name);
      receiverForm.setValue("receiverAddress", recipient.address);
      receiverForm.setValue("receiverCity", recipient.city);
      receiverForm.setValue("receiverPostalCode", recipient.postalCode || "");
      receiverForm.setValue("receiverPhone", recipient.phone || "");

      // Only set email if it exists
      if (recipient.email) {
        receiverForm.setValue("receiverEmail", recipient.email);
      }

      // Get the country code from the country name
      const countryCode = getCountryCodeByName(recipient.country);

      if (countryCode) {
        // Set the country value directly using the country CODE
        packageForm.setValue("receiverCountry", countryCode, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });

        // If country has states and recipient has state info, set it
        if (hasStates(countryCode) && recipient.state) {
          // Get the list of states for the country
          const states = getStatesByCountryCode(countryCode);

          // Try to find a state by name first
          const stateByName = states.find(
            (state) =>
              state.name.toLowerCase() === recipient.state?.toLowerCase(),
          );

          // If found by name, use state code; otherwise use the state name directly
          const stateValue = stateByName ? stateByName.code : recipient.state;

          receiverForm.setValue("receiverState", stateValue, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
        }
      } else {
        console.error("Could not find country code for:", recipient.country);
        toast({
          title: t("general.errorTitle"),
          description: `${t("shipping.countryCodeNotFound")} ${recipient.country}`,
          variant: "destructive",
        });
      }

      // Clear filtered recipients and hide suggestions
      setFilteredRecipients([]);
      setShowRecipientSuggestions(false);

      // Set the selected recipient for display in the UI
      setSelectedRecipient(recipient);

      // Force a re-render of the form
      setTimeout(() => {
        // Check if the values are set correctly
      }, 0);

      toast({
        title: t("shipping.recipientSelected"),
        description: t("shipping.formFilledWith", { name: recipient.name }),
      });
    } catch (error) {
      console.error("Error setting recipient data:", error);
      toast({
        title: t("general.errorTitle"),
        description: t("shipping.recipientDataError"),
        variant: "destructive",
      });
    }
  };

  // Function to convert Turkish characters to English
  const convertTurkishToEnglish = (text: string): string => {
    if (!text) return text;

    return text
      .replace(/ç/g, "c")
      .replace(/Ç/g, "C")
      .replace(/ğ/g, "g")
      .replace(/Ğ/g, "G")
      .replace(/ı/g, "i")
      .replace(/İ/g, "I")
      .replace(/ö/g, "o")
      .replace(/Ö/g, "O")
      .replace(/ş/g, "s")
      .replace(/Ş/g, "S")
      .replace(/ü/g, "u")
      .replace(/Ü/g, "U");
  };

  // Load user data for sender information
  const loadUserData = async () => {
    try {
      const response = await apiRequest("GET", "/api/user");
      if (response.ok) {
        const userData = await response.json();
        if (userData) {
          // Store the user ID for package templates
          setCurrentUserId(userData.id);

          // If user has address information, use it for sender details
          if (userData.companyName) {
            receiverForm.setValue(
              "senderName",
              convertTurkishToEnglish(userData.companyName),
            );
          }

          // Use structured address fields if available, fall back to legacy address field
          if (userData.address1) {
            receiverForm.setValue(
              "senderAddress",
              convertTurkishToEnglish(userData.address1),
            );
            // Also set the structured fields if they exist in the form
            if (receiverForm.getValues().hasOwnProperty("senderAddress1")) {
              receiverForm.setValue(
                "senderAddress1",
                convertTurkishToEnglish(userData.address1),
              );
            }
          } else if (userData.address) {
            // Fall back to legacy address field if needed
            receiverForm.setValue(
              "senderAddress",
              convertTurkishToEnglish(userData.address),
            );
          }

          // Set address2 if available in the user profile and the form
          if (
            userData.address2 &&
            receiverForm.getValues().hasOwnProperty("senderAddress2")
          ) {
            receiverForm.setValue(
              "senderAddress2",
              convertTurkishToEnglish(userData.address2),
            );
          }

          if (userData.city) {
            receiverForm.setValue(
              "senderCity",
              convertTurkishToEnglish(userData.city),
            );
          }
          if (userData.postalCode) {
            receiverForm.setValue("senderPostalCode", userData.postalCode);
          }
          if (userData.phone) {
            receiverForm.setValue("senderPhone", userData.phone);
          }
          if (userData.email) {
            receiverForm.setValue("senderEmail", userData.email);
          }
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  // Save current form values to custom address before editing
  const saveCurrentAddressForEditing = () => {
    const formValues = receiverForm.getValues();
    setCustomAddress({
      name: formValues.senderName || "",
      // Use structured address fields if present in the form, otherwise use the legacy field
      address: formValues.senderAddress || "",
      address1: formValues.senderAddress1 || formValues.senderAddress || "",
      address2: formValues.senderAddress2 || "",
      city: formValues.senderCity || "",
      postalCode: formValues.senderPostalCode || "",
      phone: formValues.senderPhone || "",
      email: formValues.senderEmail || "",
    });
    setIsEditingAddress(true);
  };

  // Reset to default address from user profile
  const resetToDefaultAddress = () => {
    loadUserData();
    setIsEditingAddress(false);
  };

  // Calculate price from the API
  const calculatePrice = async () => {
    // Force set serviceLevel to standard since that's our default
    packageForm.setValue("serviceLevel", ServiceLevel.STANDARD);

    const packageFormData = packageForm.getValues();
    const receiverFormData = receiverForm.getValues();

    // Validate required fields
    if (!packageFormData.receiverCountry) {
      toast({
        title: t("shipping.missingInformation"),
        description: t("shipping.selectDestinationCountry"),
        variant: "destructive",
      });
      return;
    }

    // Ensure we have packages data to use - create from form if none exist
    let packagesToUse = packages;
    if (packages.length === 0) {
      // Create a package from the current form values
      const formPackage = {
        length: packageFormData.packageLength,
        width: packageFormData.packageWidth,
        height: packageFormData.packageHeight,
        weight: packageFormData.packageWeight,
        items: packageItems.length > 0 ? packageItems : [],
      };

      // Validate that we have valid dimensions and weight
      if (
        !formPackage.length ||
        !formPackage.width ||
        !formPackage.height ||
        !formPackage.weight
      ) {
        toast({
          title: t("shipping.missingPackages"),
          description: t("shipping.addPackageWithDimensions"),
          variant: "destructive",
        });
        return;
      }

      packagesToUse = [formPackage];
      // Update the packages state for future use
      setPackages(packagesToUse);
    }

    // Calculate total billable weight from all packages
    let totalBillableWeight = 0;

    // For each package, calculate its billable weight and add to the total
    packagesToUse.forEach((pkg) => {
      const pkgVolumetricWeight = calculateVolumetricWeight(
        parseFloat(pkg.length || "0"),
        parseFloat(pkg.width || "0"),
        parseFloat(pkg.height || "0"),
      );

      const pkgBillableWeight = Math.max(
        pkgVolumetricWeight,
        parseFloat(pkg.weight || "0"),
      );
      totalBillableWeight += pkgBillableWeight;
    });

    // Update the billable weight state for display
    setBillableWeight(totalBillableWeight);

    setIsCalculatingPrice(true);

    try {
      // Get the latest form values after setting service level
      const updatedPackageFormData = packageForm.getValues();

      // Log what we're sending

      // Always use the calculated billable weight from packages - this is critical
      // as it represents the true shipping weight that ShipEntegra will charge for
      const requestPayload = {
        // Use dimensions from the form (which are updated from the packages array)
        packageLength: updatedPackageFormData.packageLength,
        packageWidth: updatedPackageFormData.packageWidth,
        packageHeight: updatedPackageFormData.packageHeight,

        // IMPORTANT: Use the billable weight for accurate pricing from ShipEntegra API
        // This is the sum of all package billable weights (max of actual or volumetric)
        packageWeight: totalBillableWeight,

        // Use the actual count of packages
        pieceCount: packagesToUse.length,
        serviceLevel:
          updatedPackageFormData.serviceLevel || ServiceLevel.STANDARD,
        receiverCountry: updatedPackageFormData.receiverCountry,
        senderPostalCode: receiverFormData.senderPostalCode,
        senderCity: receiverFormData.senderCity,
        receiverPostalCode: receiverFormData.receiverPostalCode,
        receiverCity: receiverFormData.receiverCity,

        // Include insurance option if checked
        includeInsurance: updatedPackageFormData.includeInsurance,
        // Include customs value for insurance calculation (value in cents)
        customsValue: updatedPackageFormData.customsValue,
        // Include product information for ChatGPT duty calculations from package items
        productName: packageItems.length > 0 ? packageItems[0].name || "General merchandise" : "General merchandise",
        productDescription: packageItems.length > 0 ? packageItems[0].description || "" : "",
        hsCode: packageItems.length > 0 ? packageItems[0].hsCode || "" : "",
      };

      const response = await apiRequest(
        "POST",
        "/api/pricing/moogship-options",
        requestPayload,
      );

      if (!response.ok) {
        throw new Error("Failed to calculate price");
      }

      const data = await response.json();

      // Transform MoogShip pricing response to match expected format
      if (data.success && data.options && data.options.length > 0) {
        // Use the first option (typically Standard service) for compatibility
        const selectedOption = data.options[0];
        const transformedData = {
          basePrice: selectedOption.cargoPrice,
          fuelCharge: selectedOption.fuelCost,
          totalPrice: selectedOption.totalPrice,
          serviceLevel: selectedOption.serviceType,
          // CRITICAL FIX: Extract appliedMultiplier to prevent double multiplication
          appliedMultiplier: selectedOption.appliedMultiplier,
          // Also extract original prices if available for proper cost tracking
          originalBasePrice:
            selectedOption.originalCargoPrice || selectedOption.cargoPrice,
          originalFuelCharge:
            selectedOption.originalFuelCost || selectedOption.fuelCost,
          originalTotalPrice:
            selectedOption.originalTotalPrice || selectedOption.totalPrice,
          // Include duty information from the pricing API response
          duties: data.duties || {},
          options: data.options, // Keep all options for potential future use
        };
        setPriceDetails(transformedData);

        // Automatically select the first service option to prevent empty selection state
        // Include duty information in the selected service option
        const selectedOptionWithDuties = {
          ...data.options[0],
          duties: data.duties || {}
        };
        setSelectedServiceOption(selectedOptionWithDuties);

        // Check credit limit with the actual price from the selected option
        checkCreditLimit(selectedOption.totalPrice);
      } else {
        throw new Error("No pricing options available");
      }

      // Reset the changed state after recalculating
      setPackageDetailsChanged(false);

      // Expand the price section automatically and scroll to it
      setExpandedSections((prev) =>
        prev.includes("price") ? prev : [...prev, "price"],
      );

      // Scroll to the price section after a short delay to ensure it's visible
      setTimeout(() => {
        const priceSection = document.getElementById("price-section");
        if (priceSection) {
          priceSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } catch (error) {
      toast({
        title: t("shipping.priceCalculationFailed"),
        description: t("shipping.priceCalculationError"),
        variant: "destructive",
      });
    } finally {
      setIsCalculatingPrice(false);
    }
  };

  // Function to print the shipping label
  const printShippingLabel = () => {
    if (createdShipment && createdShipment.labelUrl) {
      // Open the label in a new tab for printing
      window.open(createdShipment.labelUrl, "_blank");
    }
  };

  // Invoice upload handlers for success dialog
  const handleFileUpload = async (files: FileList | null, shipmentId: number) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingInvoice(true);
    try {
      const formData = new FormData();
      formData.append('invoice', file);

      const response = await fetch(`/api/shipments/${shipmentId}/upload-invoice`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        console.error('Upload failed:', response.status, errorData);
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      
      // Only update state after confirming upload was successful
      if (result.filename && result.uploadedAt) {
        // Update created shipment with invoice info
        setCreatedShipment((prev: any) => ({
          ...prev,
          invoicePdf: 'uploaded', // Set a flag to indicate invoice is uploaded
          invoiceFilename: result.filename,
          invoiceUploadedAt: result.uploadedAt,
          // Force re-render by updating timestamp
          _lastUpdated: Date.now()
        }));

        // Invalidate queries to ensure data consistency across the app
        queryClient.invalidateQueries({ queryKey: [`/api/shipments/${shipmentId}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/shipments'] });

        toast({
          title: "Success",
          description: "Invoice uploaded successfully!",
        });
      } else {
        throw new Error('Invalid server response');
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      // Clear any temporary UI updates if upload failed
      setCreatedShipment((prev: any) => ({
        ...prev,
        invoicePdf: null,
        invoiceFilename: null,
        invoiceUploadedAt: null,
      }));
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  const handleDeleteInvoice = async (shipmentId: number) => {
    setIsDeletingInvoice(true);
    
    try {
      const response = await fetch(`/api/shipments/${shipmentId}/delete-invoice`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status: ${response.status}`);
      }

      const result = await response.json();

      
      // Immediately clear the state
      setCreatedShipment((prev: any) => {
        if (!prev) {
          return prev;
        }
        
        
        const updated = {
          ...prev,
          invoicePdf: null,
          invoiceFilename: null,
          invoiceUploadedAt: null,
          // Force complete re-render
          _forceUpdate: Date.now(),
          _deleted: true
        };
        
        return updated;
      });

      // Force a re-render by toggling isDeletingInvoice briefly
      setTimeout(() => {
        setIsDeletingInvoice(false);
      }, 50);

      // Invalidate all related queries
      await queryClient.invalidateQueries({ queryKey: [`/api/shipments/${shipmentId}`] });
      await queryClient.invalidateQueries({ queryKey: ['/api/shipments'] });
      await queryClient.invalidateQueries({ queryKey: ['shipments'] });
      
      
      toast({
        title: "Success",
        description: "Invoice deleted successfully!",
      });
    } catch (error) {
      console.error('🗑️ Delete error:', error);
      setIsDeletingInvoice(false);
      toast({
        title: "Error",
        description: `Failed to delete invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent, shipmentId: number) => {
    e.preventDefault();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files, shipmentId);
  };





  // Draft shipment mutation
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      // Get form data from both receiver and package forms
      const receiverFormData = receiverForm.getValues();
      const packageFormData = packageForm.getValues();

      // Combine data for saving as draft
      const draftData = {
        // Required user ID will be added by the server
        userId: user?.id, // This is required by the schema

        // Sender information - use actual form values entered by user
        senderName: receiverFormData.senderName || user?.name || "",
        senderAddress1:
          receiverFormData.senderAddress1 ||
          receiverFormData.senderAddress ||
          "",
        senderAddress2: receiverFormData.senderAddress2 || "",
        senderCity: receiverFormData.senderCity || "",
        senderPostalCode: receiverFormData.senderPostalCode || "",
        senderPhone: receiverFormData.senderPhone || "",
        senderEmail: receiverFormData.senderEmail || user?.email || "",

        // Receiver information
        receiverName: receiverFormData.receiverName || "",
        receiverAddress: receiverFormData.receiverAddress || "",
        receiverSuite: receiverFormData.receiverSuite || "",
        receiverCity: receiverFormData.receiverCity || "",
        receiverState: receiverFormData.receiverState || "",
        receiverPostalCode: receiverFormData.receiverPostalCode || "",
        receiverPhone: receiverFormData.receiverPhone || "",
        receiverEmail: receiverFormData.receiverEmail || "",
        receiverCountry: packageFormData.receiverCountry || "", // Get country from package form

        // Package information (convert to proper types)
        packageLength: packageFormData.packageLength
          ? parseInt(packageFormData.packageLength.toString())
          : null,
        packageWidth: packageFormData.packageWidth
          ? parseInt(packageFormData.packageWidth.toString())
          : null,
        packageHeight: packageFormData.packageHeight
          ? parseInt(packageFormData.packageHeight.toString())
          : null,
        packageWeight: packageFormData.packageWeight
          ? parseFloat(packageFormData.packageWeight.toString())
          : null,
        pieceCount: packages.length > 0 ? packages.length : null,
        packageContents: receiverFormData.packageContents || "", // Get contents from receiver form

        // Store package items and package data as JSON strings
        packageItemsData: JSON.stringify(packageItems),
        packagesData: JSON.stringify(packages),

        // Additional package information from packageForm
        customsValue: packageFormData.customsValue,
        currency: packageFormData.currency || "USD",
        gtipCode: packageFormData.gtipCode || "",
        serviceLevel: packageFormData.serviceLevel,
        includeInsurance: packageFormData.includeInsurance || false,

        // Add any custom fields - if we're updating, keep the existing name
        name: currentDraftId
          ? undefined
          : `Draft - ${new Date().toLocaleDateString()}`, // Default name with date
      };

      let res;

      // If we have a draft ID, update the existing draft
      if (currentDraftId) {
        res = await apiRequest(
          "PATCH",
          `/api/drafts/${currentDraftId}`,
          draftData,
        );
      } else {
        // Otherwise create a new draft
        res = await apiRequest("POST", "/api/drafts", draftData);
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || t("createShipment.draft.error"));
      }

      const responseData = await res.json();

      // If this was a new draft, store the ID for future updates
      if (!currentDraftId) {
        setCurrentDraftId(responseData.id);
      }

      return responseData;
    },
    onSuccess: (data) => {
      toast({
        title: t("createShipment.draft.successTitle", "Draft Saved"),
        description: t(
          "createShipment.draft.successDescription",
          "Your shipment has been saved as a draft",
        ),
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: t("createShipment.draft.errorTitle", "Error Saving Draft"),
        description:
          error.message ||
          t(
            "createShipment.draft.errorDescription",
            "There was a problem saving your draft",
          ),
        variant: "destructive",
      });
    },
  });

  // Shipment creation mutation
  const createShipmentMutation = useMutation({
    mutationFn: async (shipmentData: any) => {
     
      if (!priceDetails) {
        throw new Error(t("createShipment.priceDetails.notAvailable"));
      }

      // Validate all sections
      if (
        !isSectionComplete("recipient") ||
        !isSectionComplete("package") ||
        !isSectionComplete("price")
      ) {
        throw new Error(t("createShipment.validation.completeSections"));
      }

      // Get selected service information - selectedServiceOption is now the actual service object
      const selectedService = selectedServiceOption || null;

      // Debug service extraction
      
      // Detect AFS services to set correct shipping provider and carrier name
      const selectedServiceCode =
        selectedService?.providerServiceCode ||
        selectedService?.serviceCode ||
        selectedService?.serviceType ||
        selectedService?.displayName ||
        "";
      const isAFSService = selectedServiceCode.toLowerCase().includes("afs");
      const isAramexService = selectedServiceCode.toLowerCase().includes("aramex");


      // Set appropriate shipping provider and carrier name based on service
      const shippingProvider = isAFSService
        ? "afs"
        : isAramexService
          ? "aramex"
          : "moogship";

      const carrierName = isAFSService
        ? "AFS Transport"
        : isAramexService
          ? "Aramex"
          : priceDetails.carrierName || "MoogShip";

      const enhancedShipmentData = {
        ...shipmentData,
        status: ShipmentStatus.PENDING,
        price: selectedService?.totalPrice || priceDetails.totalPrice, // Use the selected service price
        totalPrice: selectedService?.totalPrice || priceDetails.totalPrice, // Use the selected service price
        basePrice:
          selectedService?.cargoPrice ||
          selectedService?.basePrice ||
          priceDetails.basePrice,
        fuelCharge:
          selectedService?.fuelCost ||
          selectedService?.fuelCharge ||
          priceDetails.fuelCharge,
        additionalFee: selectedService?.additionalFee || 0,
        originalAdditionalFee: selectedService?.additionalFee || 0,
        pieceCount: priceDetails.pieceCount || shipmentData.pieceCount || 1,
        currency: priceDetails.currency || "USD",
        carrierName: carrierName,
        estimatedDeliveryDays: priceDetails.estimatedDeliveryDays || 7,
        packageItems: packageItems, // Include the package items
        packages: packages, // Include the packages data,
        // Pass the applied multiplier from the selected service option to prevent double-multiplication
        appliedMultiplier:
          selectedService?.appliedMultiplier || priceDetails.appliedMultiplier,
        // Also pass any original prices from the selected service option if available
        originalBasePrice:
          selectedService?.originalCargoPrice ||
          selectedService?.originalBasePrice ||
          priceDetails.originalBasePrice,
        originalFuelCharge:
          selectedService?.originalFuelCost ||
          selectedService?.originalFuelCharge ||
          priceDetails.originalFuelCharge,
        originalTotalPrice:
          selectedService?.originalTotalPrice ||
          priceDetails.originalTotalPrice,
        // Store full service information for enhanced provider system
        selectedService:
          selectedService?.displayName || null,
        shippingProvider: shippingProvider, // Dynamically set based on service type
        providerServiceCode:
          selectedService?.providerServiceCode ||
          selectedService?.serviceCode ||
          null,
        // Include insurance details if insurance was added
        includeInsurance: shipmentData.includeInsurance,
        insuranceCost: priceDetails.insurance?.insuranceCost || 0,
        declaredValue:
          priceDetails.insurance?.declaredValue ||
          shipmentData.customsValue ||
          0,
        // DDP duty fields - split into base HS tax and Trump tariffs
        shippingTerms: shipmentData.shippingTerms || 'ddp',
        ddpDutiesAmount: 0, // Will be set based on duties info
        ddpBaseDutiesAmount: 0, // Will be set based on duties info
        ddpTrumpTariffsAmount: 0, // Will be set based on duties info
        ddpProcessingFee: 0, // Will be set for US DDP shipments
        ddpTaxAmount: 0, // Not separately calculated
      };
      
      // If US destination with DDP, calculate and split the duties
      const isUSDestination = shipmentData.receiverCountry === 'US' || 
                               shipmentData.receiverCountry === 'USA' || 
                               shipmentData.receiverCountry === 'United States';
      
      if (isUSDestination && shipmentData.shippingTerms === 'ddp') {
        const dutyInfo = selectedService?.duties || {};
        
        if (dutyInfo.available) {
          // If we have detailed duty breakdown from API
          if (dutyInfo.baseDutyAmount !== undefined && dutyInfo.trumpTariffAmount !== undefined) {
            enhancedShipmentData.ddpBaseDutiesAmount = Math.round(dutyInfo.baseDutyAmount); // Already in cents from API
            enhancedShipmentData.ddpTrumpTariffsAmount = Math.round(dutyInfo.trumpTariffAmount); // Already in cents from API
            enhancedShipmentData.ddpDutiesAmount = enhancedShipmentData.ddpBaseDutiesAmount + enhancedShipmentData.ddpTrumpTariffsAmount;
          } else if (dutyInfo.estimatedDuty) {
            // If we only have total duty, split it (10% base HS, 13.3% Trump tariff for 23.3% total)
            const customsValue = shipmentData.customsValue / 100; // Convert from cents to dollars
            enhancedShipmentData.ddpBaseDutiesAmount = Math.round(customsValue * 0.10 * 100); // 10% base HS tax in cents
            enhancedShipmentData.ddpTrumpTariffsAmount = Math.round(customsValue * 0.133 * 100); // 13.3% Trump tariff in cents
            enhancedShipmentData.ddpDutiesAmount = enhancedShipmentData.ddpBaseDutiesAmount + enhancedShipmentData.ddpTrumpTariffsAmount;
          }
          
          // Add DDP processing fee for US DDP shipments
          // Check if ECO shipping based on selectedService
          const isEcoShipping = selectedService?.displayName && 
            (selectedService.displayName.toLowerCase().includes('eco') || selectedService.displayName.toLowerCase().includes('eko'));
          enhancedShipmentData.ddpProcessingFee = isEcoShipping ? 45 : 450; // ECO: $0.45, Standard: $4.50
        }
      };

      const res = await apiRequest(
        "POST",
        "/api/shipments",
        enhancedShipmentData,
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.message || t("createShipment.toast.error.description"),
        );
      }

      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: t("createShipment.toast.success.title"),
        description: t("createShipment.toast.success.description"),
      });

      // Invalidate query cache to refresh shipments
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/my"] });

      // Store the created shipment and show success dialog
      setCreatedShipment(data);
      setShowSuccessDialog(true);
    },
    onError: (error: Error) => {
      toast({
        title: t("createShipment.toast.error.title"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Show loading state if authentication is still being determined
  if (auth?.isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideMobileActions={true}>
      {/* Shipment Success Dialog */}
      <Dialog
        open={showSuccessDialog}
        onOpenChange={(open) => {
          setShowSuccessDialog(open);
          if (!open) {
            // Navigate to my shipments when dialog is closed
            navigate("/my-shipments");
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-w-[90vw]">
          <DialogHeader>
            <div className="flex items-center justify-center mb-2">
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">
              {t("createShipment.successDialog.title")}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t("createShipment.successDialog.description", {
                id: createdShipment?.id,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 border rounded-md bg-muted/30 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">
                {t("createShipment.successDialog.recipient")}:
              </span>
              <span className="text-sm">{createdShipment?.receiverName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">
                {t("createShipment.successDialog.destination")}:
              </span>
              <span className="text-sm">
                {createdShipment?.receiverCity},{" "}
                {createdShipment?.receiverCountry}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">
                {t("createShipment.successDialog.serviceLevel")}:
              </span>
              <span className="text-sm">
                {selectedServiceOption?.displayName ||
                  createdShipment?.serviceLevel ||
                  "Standard Service"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">
                {t("createShipment.successDialog.status")}:
              </span>
              <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs">
                {createdShipment?.status}
              </span>
            </div>
          </div>

          {/* Invoice Upload Section - Hidden by default */}
          <div id="invoice-upload-section" style={{ display: 'none' }} className="mt-4">
            <div className="rounded-md border border-purple-100 bg-purple-50 p-3 text-sm space-y-3">
              <p className="font-medium text-purple-800">
                Invoice Information
              </p>
              
              {(() => {
                const hasFilename = !!createdShipment?.invoiceFilename;
                const isDeleting = isDeletingInvoice;
                const shouldShowInvoice = hasFilename && !isDeleting;
                
                return shouldShowInvoice;
              })() ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p>Filename: {createdShipment.invoiceFilename}</p>
                      <p className="text-xs text-purple-600">
                        Uploaded: {createdShipment.invoiceUploadedAt 
                          ? formatDate(createdShipment.invoiceUploadedAt)
                          : 'Date not available'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.open(`/api/shipments/${createdShipment.id}/invoice`, '_blank');
                        }}
                        className="flex items-center gap-2 bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200"
                      >
                        <FileText className="h-4 w-4" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteInvoice(createdShipment.id)}
                        disabled={isDeletingInvoice}
                        className="flex items-center gap-2 bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                      >
                        {isDeletingInvoice ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        {isDeletingInvoice ? 'Deleting...' : 'Remove'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    dragActive 
                      ? 'border-purple-400 bg-purple-100' 
                      : 'border-purple-200 hover:border-purple-300'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, createdShipment?.id)}
                >
                  <div className="flex flex-col items-center gap-2">
                    {isUploadingInvoice ? (
                      <>
                        <Loader2 className="h-6 w-6 text-purple-500 animate-spin" />
                        <p className="text-purple-600">Uploading invoice...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-purple-400" />
                        <p className="text-purple-600">
                          Drag and drop a PDF invoice here, or{" "}
                          <label className="text-purple-700 font-medium cursor-pointer hover:underline">
                            browse files
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={(e) => handleFileUpload(e.target.files, createdShipment?.id)}
                              className="hidden"
                            />
                          </label>
                        </p>
                        <p className="text-xs text-purple-500">PDF only, max 10MB</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="sm:justify-between flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-initial"
              onClick={() => {
                setShowSuccessDialog(false);
                navigate("/my-shipments");
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {t("createShipment.successDialog.viewMyShipments")}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-initial"
              onClick={() => {
                // Toggle invoice upload section in the dialog
                const invoiceSection = document.getElementById('invoice-upload-section');
                if (invoiceSection) {
                  invoiceSection.style.display = invoiceSection.style.display === 'none' ? 'block' : 'none';
                }
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Fatura Ekle
            </Button>

            <Button
              type="button"
              className="flex-1 sm:flex-initial bg-primary"
              onClick={printShippingLabel}
              disabled={!createdShipment?.labelUrl}
            >
              <Printer className="mr-2 h-4 w-4" />
              {t("createShipment.successDialog.printLabel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="container py-6 pl-4 md:pl-6">
        {/* Desktop header with button */}
        <div className="hidden md:flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              {t("createShipment.title")}
            </h1>
            <p className="text-muted-foreground mt-1 text-lg">
              {t("createShipment.subtitle")}
            </p>
          </div>
          <Button
            variant="outline"
            className="flex items-center"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            {t("createShipment.backToDashboard")}
          </Button>
        </div>

        {/* Mobile header without icons */}
        <div className="md:hidden mb-6">
          <div className="flex items-center mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="mr-2 -ml-3 h-9 w-9"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="sr-only">{t("common.back")}</span>
            </Button>
            <h1 className="text-2xl font-bold">{t("createShipment.title")}</h1>
          </div>
          <p className="text-muted-foreground text-base">
            {t("createShipment.subtitle")}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="relative">
            <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
              <div
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500 ease-in-out`}
                style={{
                  width: `${
                    (isSectionComplete("recipient") ? 33 : 0) +
                    (isSectionComplete("package") ? 33 : 0) +
                    (isSectionComplete("price") ? 34 : 0)
                  }%`,
                }}
              ></div>
            </div>

            <div className="flex justify-between mt-2 text-sm text-gray-500">
              <div
                className={`flex items-center gap-1 ${isSectionComplete("recipient") ? "text-primary font-semibold" : ""}`}
              >
                {isSectionComplete("recipient") && (
                  <Check className="h-4 w-4" />
                )}
                {t("createShipment.sections.recipient")}
              </div>
              <div
                className={`flex items-center gap-1 ${isSectionComplete("package") ? "text-primary font-semibold" : ""}`}
              >
                {isSectionComplete("package") && <Check className="h-4 w-4" />}
                {t("createShipment.sections.package")}
              </div>
              <div
                className={`flex items-center gap-1 ${isSectionComplete("price") ? "text-primary font-semibold" : ""}`}
              >
                {isSectionComplete("price") && <Check className="h-4 w-4" />}
                {t("createShipment.sections.price")}
              </div>
            </div>
          </div>
        </div>

        {/* Previous Shipments Section */}
        <div className="mb-6">
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setShowPreviousShipments(!showPreviousShipments)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {t(
                        "createShipment.previousShipments.title",
                        "Copy from Previous Shipment",
                      )}
                    </CardTitle>
                    <p className="text-base text-muted-foreground">
                      {t(
                        "createShipment.previousShipments.description",
                        "Quickly copy data from your recent shipments",
                      )}
                    </p>
                  </div>
                </div>
                {showPreviousShipments ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </CardHeader>

            {showPreviousShipments && (
              <CardContent className="pt-0">
                {isLoadingPreviousShipments ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-base">
                      {t(
                        "createShipment.previousShipments.loading",
                        "Loading previous shipments...",
                      )}
                    </span>
                  </div>
                ) : previousShipments && previousShipments.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <div className="space-y-2 pr-2">
                      {previousShipments.map((shipment: any) => (
                        <div
                          key={shipment.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-base">
                                #{shipment.id}
                              </span>
                              <span className="text-sm px-2 py-1 rounded-full bg-muted text-muted-foreground">
                                {shipment.status}
                              </span>
                            </div>
                            <p className="text-base text-muted-foreground">
                              To: {shipment.receiverName} -{" "}
                              {shipment.receiverCity},{" "}
                              {shipment.receiverCountry}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(
                                shipment.createdAt,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyAddressOnly(shipment)}
                                    className="text-sm"
                                  >
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {t(
                                      "createShipment.previousShipments.copyAddress",
                                      "Address",
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-sm max-w-xs">
                                    <div className="font-medium mb-1">
                                      Sadece alıcı adresini kopyalar:
                                    </div>
                                    <div>• Ad, telefon, e-posta</div>
                                    <div>• Adres, şehir, ülke</div>
                                    <div>• Eyalet ve posta kodu</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyEverything(shipment)}
                                    className="text-sm"
                                  >
                                    <Box className="h-3 w-3 mr-1" />
                                    {t(
                                      "createShipment.previousShipments.copyEverything",
                                      "Everything",
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-sm max-w-xs">
                                    <div className="font-medium mb-1">
                                      Tüm gönderi verilerini kopyalar:
                                    </div>
                                    <div>• Tüm alıcı adres detayları</div>
                                    <div>• Paket boyutları ve ağırlığı</div>
                                    <div>• Ürünler ve açıklamalar</div>
                                    <div>• Servis seviyesi tercihleri</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-base">
                      {t(
                        "createShipment.previousShipments.noShipments",
                        "No previous shipments found",
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        {/* Expandable sections */}
        <div className="space-y-4">
          {/* 1. Recipient Information Section */}
          <Card
            className={`${expandedSections.includes("recipient") ? "border-primary" : ""}`}
          >
            <CardHeader
              className={`cursor-pointer ${isSectionComplete("recipient") ? "bg-green-50" : ""}`}
              onClick={() => toggleSection("recipient")}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">
                    {t("createShipment.recipientInfo.title")}
                  </CardTitle>
                  {isSectionComplete("recipient") && (
                    <div className="flex items-center text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      <Check className="h-3 w-3 mr-1" />
                      {t("common.complete")}
                    </div>
                  )}
                </div>
                {expandedSections.includes("recipient") ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>

            {expandedSections.includes("recipient") && (
              <>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      {/* Destination Country */}
                      <div className="col-span-2">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium">
                            {t("createShipment.recipientInfo.title")}
                          </h3>
                          <Link
                            to="/recipients"
                            className="text-xs text-primary hover:underline flex items-center"
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            {t("common.recipients")}
                          </Link>
                        </div>
                      </div>

                      {/* Receiver Information */}
                      <Form {...receiverForm}>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 col-span-2">
                          {/* Full name field - full width on mobile, half width on desktop */}
                          <div className="col-span-2 sm:col-span-1">
                            <FormField
                              control={receiverForm.control}
                              name="receiverName"
                              render={({ field }) => (
                                <FormItem className="relative">
                                  <FormLabel>
                                    {t(
                                      "createShipment.recipientInfo.fields.fullName",
                                    )}
                                  </FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        placeholder={t(
                                          "createShipment.recipientInfo.placeholders.fullName",
                                        )}
                                        {...field}
                                        onChange={(e) => {
                                          field.onChange(e);
                                          filterRecipients(e.target.value);
                                        }}
                                        onBlur={(e) => {
                                          // Delay hiding suggestions to allow clicking on them
                                          setTimeout(() => {
                                            setShowRecipientSuggestions(false);
                                          }, 200);
                                          field.onBlur();
                                        }}
                                        className="pr-8 w-full"
                                      />
                                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    </div>
                                  </FormControl>
                                  {showRecipientSuggestions &&
                                    filteredRecipients.length > 0 && (
                                      <div className="absolute z-10 w-full mt-1 bg-white rounded-md border shadow-lg max-h-64 overflow-y-auto">
                                        <ul className="py-1">
                                          {filteredRecipients.map(
                                            (recipient) => (
                                              <li
                                                key={recipient.id}
                                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                                                onClick={() =>
                                                  useRecipientData(recipient)
                                                }
                                              >
                                                <div>
                                                  <div className="font-medium text-base">
                                                    {recipient.name}
                                                  </div>
                                                  <div className="text-sm text-gray-500">
                                                    {recipient.address},{" "}
                                                    {recipient.city}
                                                  </div>
                                                </div>
                                                {recipient.isDefault && (
                                                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                    Default
                                                  </span>
                                                )}
                                              </li>
                                            ),
                                          )}
                                        </ul>
                                      </div>
                                    )}
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Email and Phone fields - always on same line */}
                          <div className="col-span-2">
                            <div className="grid grid-cols-2 gap-4">
                              {/* Email field */}
                              <FormField
                                control={receiverForm.control}
                                name="receiverEmail"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      {t(
                                        "createShipment.recipientInfo.fields.email",
                                      )}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="email"
                                        placeholder={t(
                                          "createShipment.recipientInfo.placeholders.email",
                                        )}
                                        {...field}
                                        className="w-full"
                                        // If no email is provided, use info@moogship.com as default
                                        onBlur={(e) => {
                                          if (!e.target.value.trim()) {
                                            field.onChange("info@moogship.com");
                                          }
                                        }}
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      {t(
                                        "createShipment.recipientInfo.descriptions.email",
                                      )}
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {/* Phone field */}
                              <FormField
                                control={receiverForm.control}
                                name="receiverPhone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      {t(
                                        "createShipment.recipientInfo.fields.phone",
                                      )}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder={t(
                                          "createShipment.recipientInfo.placeholders.phone",
                                        )}
                                        {...field}
                                        className="w-full"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>

                          <div className="col-span-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {t("createShipment.recipientInfo.fields.address")}
                              </span>
                              <div className="flex items-center gap-2">
                                {validateReceiverAddressMutation.isPending ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                                    <span className="text-xs text-blue-600">{t('validations.fedexPostalCode.autoValidating')}</span>
                                  </>
                                ) : receiverAddressValidationResult?.isValid ? (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                ) : receiverAddressValidationResult?.errors ? (
                                  <XCircle className="h-3 w-3 text-red-600" />
                                ) : (
                                  <Shield className="h-3 w-3 text-gray-400" />
                                )}
                              </div>
                            </div>
                            <AddressPicker
                              address={receiverForm.watch("receiverAddress") || ""}
                              countryCode={packageForm.watch("receiverCountry")}
                              onAddressChange={(address) => {
                                receiverForm.setValue("receiverAddress", address);
                              }}
                              onCountryChange={(countryCode) => {
                                packageForm.setValue("receiverCountry", countryCode);
                                // Clear other address fields when country changes
                                receiverForm.setValue("receiverState", "");
                                receiverForm.setValue("receiverCity", "");
                                receiverForm.setValue("receiverPostalCode", "");
                              }}
                              onAddressSelect={(suggestion: AddressSuggestion) => {
                                // Auto-fill other address fields when user selects a suggestion
                                if (suggestion.city) {
                                  receiverForm.setValue("receiverCity", suggestion.city);
                                }
                                if (suggestion.state) {
                                  // For US and other countries with states, map the state name to state code
                                  const countryCode = suggestion.countryCode || packageForm.watch("receiverCountry");
                                  if (hasStates(countryCode)) {
                                    const states = getStatesByCountryCode(countryCode);
                                    const matchingState = states.find(
                                      (state) =>
                                        state.name.toLowerCase() === suggestion.state?.toLowerCase() ||
                                        state.code.toLowerCase() === suggestion.state?.toLowerCase(),
                                    );
                                    const stateCode = matchingState?.code || suggestion.state;
                                    receiverForm.setValue("receiverState", stateCode, {
                                      shouldValidate: true,
                                      shouldTouch: true,
                                      shouldDirty: true,
                                    });
                                  } else {
                                    receiverForm.setValue("receiverState", suggestion.state, {
                                      shouldValidate: true,
                                      shouldTouch: true,
                                      shouldDirty: true,
                                    });
                                  }
                                }
                                if (suggestion.postalCode) {
                                  receiverForm.setValue("receiverPostalCode", suggestion.postalCode);
                                }
                                if (suggestion.countryCode) {
                                  packageForm.setValue("receiverCountry", suggestion.countryCode);
                                  // Only clear state if no state was provided in the suggestion
                                  if (!suggestion.state) {
                                    receiverForm.setValue("receiverState", "");
                                  }
                                }
                              }}
                              addressPlaceholder={t("createShipment.recipientInfo.placeholders.address")}
                              className="w-full"
                            />
                          </div>

                          <div className="col-span-2">
                            <FormField
                              control={receiverForm.control}
                              name="receiverSuite"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Suite/Apt/Unit</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Suite, apartment or unit number"
                                      {...field}
                                      className="w-full"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Location fields - Country is handled by AddressPicker above */}
                          <div className="col-span-2 grid grid-cols-3 gap-5">
                            {/* Country field removed - handled by AddressPicker above */}

                            <FormField
                              control={receiverForm.control}
                              name="receiverCity"
                              render={({ field }) => (
                                <FormItem className="col-span-1">
                                  <FormLabel>
                                    {t(
                                      "createShipment.recipientInfo.fields.city",
                                    )}
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder={t(
                                        "createShipment.recipientInfo.placeholders.city",
                                      )}
                                      {...field}
                                      className="w-full"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* State shown conditionally but space reserved */}
                            <div className="col-span-1">
                              {hasStates(
                                packageForm.watch("receiverCountry"),
                              ) ? (
                                <FormField
                                  control={receiverForm.control}
                                  name="receiverState"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>
                                        {t(
                                          "createShipment.recipientInfo.fields.state",
                                        )}
                                      </FormLabel>
                                      <Select
                                        key={`receiver-state-${field.value || "empty"}-${packageForm.watch("receiverCountry")}`}
                                        onValueChange={field.onChange}
                                        value={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue
                                              placeholder={t(
                                                "createShipment.recipientInfo.placeholders.state",
                                              )}
                                            />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <div className="flex items-center px-3 pb-2">
                                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                            <input
                                              className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                              placeholder="Search states..."
                                              autoFocus
                                              onKeyDown={(e) => {
                                                e.stopPropagation();
                                              }}
                                              onChange={(e) => {
                                                const value =
                                                  e.currentTarget.value.toLowerCase();
                                                const items = e.currentTarget
                                                  .closest('[role="listbox"]')
                                                  ?.querySelectorAll(
                                                    '[role="option"]',
                                                  );
                                                items?.forEach((item) => {
                                                  const htmlItem =
                                                    item as HTMLElement;
                                                  const text =
                                                    htmlItem.textContent?.toLowerCase() ||
                                                    "";
                                                  if (text.includes(value)) {
                                                    htmlItem.style.display = "";
                                                  } else {
                                                    htmlItem.style.display =
                                                      "none";
                                                  }
                                                });
                                              }}
                                            />
                                          </div>
                                          {getStatesByCountryCode(
                                            packageForm.watch(
                                              "receiverCountry",
                                            ),
                                          ).map((state) => (
                                            <SelectItem
                                              key={state.code}
                                              value={state.code}
                                            >
                                              {state.name} ({state.code})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              ) : (
                                <FormItem>
                                  <FormLabel className="text-gray-400">
                                    {t(
                                      "createShipment.recipientInfo.fields.state",
                                    )}
                                  </FormLabel>
                                  <Input
                                    disabled
                                    placeholder="N/A"
                                    className="bg-gray-100 w-full"
                                  />
                                </FormItem>
                              )}
                            </div>

                            <FormField
                              control={receiverForm.control}
                              name="receiverPostalCode"
                              render={({ field }) => (
                                <FormItem className="col-span-1">
                                  <div className="flex items-center justify-between">
                                    <FormLabel>
                                      {t(
                                        "createShipment.recipientInfo.fields.postalCode",
                                      )}
                                    </FormLabel>
                                    <div className="flex items-center gap-1 text-xs">
                                      {validateReceiverPostalCodeMutation.isPending ? (
                                        <>
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          <span className="text-blue-600">{t('validations.fedexPostalCode.autoValidating')}</span>
                                        </>
                                      ) : receiverPostalCodeValidationResult?.isValid ? (
                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                      ) : receiverPostalCodeValidationResult && !receiverPostalCodeValidationResult.isValid ? (
                                        <XCircle className="h-3 w-3 text-red-600" />
                                      ) : (
                                        <MapPin className="h-3 w-3 text-gray-400" />
                                      )}
                                    </div>
                                  </div>
                                  <FormControl>
                                    <Input
                                      placeholder={t(
                                        "createShipment.recipientInfo.placeholders.postalCode",
                                      )}
                                      {...field}
                                      className="w-full"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </Form>

                      {/* Sender Information Section */}
                      <div className="mt-8 col-span-2">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xl font-medium">
                            {t("createShipment.senderInfo.title")}
                          </h3>
                          {/* Edit Address button hidden as requested */}
                          {isEditingAddress && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={resetToDefaultAddress}
                              className="flex items-center"
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Use My Address
                            </Button>
                          )}
                        </div>
                        <div className="space-y-4">
                          <Form {...receiverForm}>
                            {isEditingAddress ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-md">
                                <div className="space-y-4 col-span-full">
                                  <FormField
                                    control={receiverForm.control}
                                    name="senderName"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                          <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <AddressPicker
                                    address={receiverForm.watch("senderAddress") || ""}
                                    countryCode={senderCountry}
                                    onAddressChange={(address) => {
                                      receiverForm.setValue("senderAddress", address);
                                    }}
                                    onCountryChange={(countryCode) => {
                                      setSenderCountry(countryCode);
                                      // Clear other address fields when country changes
                                      receiverForm.setValue("senderState", "");
                                      receiverForm.setValue("senderCity", "");
                                      receiverForm.setValue("senderPostalCode", "");
                                    }}
                                    onAddressSelect={(suggestion: AddressSuggestion) => {
                                      // Auto-fill other sender address fields
                                      if (suggestion.city) {
                                        receiverForm.setValue("senderCity", suggestion.city);
                                      }
                                      if (suggestion.state) {
                                        // For countries with states, map the state name to state code
                                        const countryCode = suggestion.countryCode || senderCountry;
                                        if (hasStates(countryCode)) {
                                          const states = getStatesByCountryCode(countryCode);
                                          const matchingState = states.find(
                                            (state) =>
                                              state.name.toLowerCase() === suggestion.state?.toLowerCase() ||
                                              state.code.toLowerCase() === suggestion.state?.toLowerCase(),
                                          );
                                          const stateCode = matchingState?.code || suggestion.state;
                                          receiverForm.setValue("senderState", stateCode, {
                                            shouldValidate: true,
                                            shouldTouch: true,
                                            shouldDirty: true,
                                          });
                                        } else {
                                          receiverForm.setValue("senderState", suggestion.state, {
                                            shouldValidate: true,
                                            shouldTouch: true,
                                            shouldDirty: true,
                                          });
                                        }
                                      }
                                      if (suggestion.postalCode) {
                                        receiverForm.setValue("senderPostalCode", suggestion.postalCode);
                                      }
                                      if (suggestion.countryCode) {
                                        setSenderCountry(suggestion.countryCode);
                                      }
                                    }}
                                    defaultCountry="TR"
                                    addressPlaceholder="Enter sender address..."
                                    className="w-full"
                                  />
                                  <div className="grid grid-cols-2 gap-5">
                                    <FormField
                                      control={receiverForm.control}
                                      name="senderCity"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>City</FormLabel>
                                          <FormControl>
                                            <Input {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={receiverForm.control}
                                      name="senderPostalCode"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Postal Code</FormLabel>
                                          <FormControl>
                                            <Input {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-5">
                                    <FormField
                                      control={receiverForm.control}
                                      name="senderPhone"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Phone</FormLabel>
                                          <FormControl>
                                            <Input {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={receiverForm.control}
                                      name="senderEmail"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Email</FormLabel>
                                          <FormControl>
                                            <Input {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
                                        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                                          <Building2 className="h-4 w-4" />
                                        </div>
                                        <div className="text-sm font-medium text-blue-700">
                                          {receiverForm
                                            .getValues()
                                            .senderName?.slice(0, 20)}
                                          {receiverForm.getValues().senderName
                                            ?.length > 20
                                            ? "..."
                                            : ""}
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="bottom"
                                      className="max-w-sm"
                                    >
                                      <div className="space-y-1">
                                        <div className="font-medium text-sm">
                                          {receiverForm.getValues().senderName}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          {
                                            receiverForm.getValues()
                                              .senderAddress
                                          }
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          {receiverForm.getValues().senderCity},{" "}
                                          {
                                            receiverForm.getValues()
                                              .senderPostalCode
                                          }
                                        </div>
                                        {receiverForm.getValues()
                                          .senderPhone && (
                                          <div className="text-xs text-gray-600">
                                            Phone:{" "}
                                            {
                                              receiverForm.getValues()
                                                .senderPhone
                                            }
                                          </div>
                                        )}
                                        {receiverForm.getValues()
                                          .senderEmail && (
                                          <div className="text-xs text-gray-600">
                                            Email:{" "}
                                            {
                                              receiverForm.getValues()
                                                .senderEmail
                                            }
                                          </div>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            )}
                          </Form>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex justify-between">
                  {/* Save as Draft Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => saveDraftMutation.mutate()}
                    disabled={saveDraftMutation.isPending}
                  >
                    {saveDraftMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("createShipment.draft.saving", "Saving...")}
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {t("createShipment.draft.saveAsDraft", "Save as Draft")}
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      // Only validate recipient fields & country - no longer need to validate sender fields
                      // since we've made sender city and postal code optional
                      receiverForm
                        .trigger([
                          "receiverName",
                          "receiverPhone",
                          "receiverAddress",
                          "receiverCity",
                          "receiverPostalCode",
                          "senderName",
                          "senderAddress",
                        ])
                        .then((recipientValid) => {
                          packageForm
                            .trigger("receiverCountry")
                            .then((countryValid) => {
                              if (recipientValid && countryValid) {
                                // First expand package section
                                setExpandedSections((prev) => {
                                  const newSections = [...prev];
                                  if (!newSections.includes("package")) {
                                    newSections.push("package");
                                  }
                                  // Then remove recipient section
                                  return newSections.filter(
                                    (s) => s !== "recipient",
                                  );
                                });
                              }
                            });
                        });
                    }}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    {t("createShipment.actions.continueToPackage")}
                  </Button>
                </CardFooter>
              </>
            )}
          </Card>

          {/* 2. Package Details Section */}
          <Card
            className={`${expandedSections.includes("package") ? "border-primary" : ""}`}
          >
            <CardHeader
              className={`cursor-pointer ${isSectionComplete("package") ? "bg-green-50" : ""}`}
              onClick={() => toggleSection("package")}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Box className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">
                    {t("createShipment.packageDetails.title")}
                  </CardTitle>
                  {isSectionComplete("package") && (
                    <div className="flex items-center text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      <Check className="h-3 w-3 mr-1" />
                      {t("common.complete")}
                    </div>
                  )}
                </div>
                {expandedSections.includes("package") ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>

            {expandedSections.includes("package") && (
              <>
                <CardContent>
                  <Form {...packageForm}>
                    <div className="space-y-6">
                      {/* Grid layout for package form items */}
                      <div
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                        aria-label={t(
                          "createShipment.packageDetails.packageItems",
                        )}
                      >
                        {/* Package Contents */}
                        {/* Package Contents field has been moved to the customs information tab */}

                        {/* Package Items (Detailed) */}
                        <div className="col-span-full mt-4">
                          <PackageItemSelector
                            items={packageItems}
                            setItems={setPackageItems}
                            packages={packages}
                            setPackages={setPackages}
                            userId={currentUserId}
                            onPackageChange={() => {
                              setPriceDetails(null);
                              setBillableWeight(null);
                            }}
                          />
                        </div>

                        {/* Package dimensions fields are hidden since they're already in the items section */}
                        {/* These fields are kept in the form but hidden from UI for functionality */}
                        <div className="hidden">
                          <FormField
                            control={packageForm.control}
                            name="packageLength"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {t("createShipment.packageDetails.length")}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      checkPackageChanges();
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={packageForm.control}
                            name="packageWidth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {t("createShipment.packageDetails.width")}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      checkPackageChanges();
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={packageForm.control}
                            name="packageHeight"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {t("createShipment.packageDetails.height")}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      checkPackageChanges();
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={packageForm.control}
                            name="packageWeight"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {t("createShipment.packageDetails.weight")}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      checkPackageChanges();
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        {/* Number of Packages and Items in Package fields are hidden since they're already in the items section */}
                        <div className="hidden">
                          <FormField
                            control={packageForm.control}
                            name="pieceCount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Number of Packages</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={packageForm.control}
                            name="itemCount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Items in Package</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                                <FormDescription>
                                  {t(
                                    "createShipment.packageDetails.totalItemsDescription",
                                  )}
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* GTIP Code field is hidden since it's already in the items section */}
                        <div className="hidden">
                          <FormField
                            control={packageForm.control}
                            name="gtipCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>GTIP Code</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter GTIP code"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                                <FormDescription>
                                  Harmonized System (HS) code for customs
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Customs Value fields now use our custom component for proper decimal formatting */}
                        <div className="col-span-full mb-4">
                          <PackageCustomsForm
                            form={packageForm}
                            receiverForm={receiverForm}
                            packageItems={packageItems}
                            isAccordion={true}
                            defaultOpen={false}
                          />
                        </div>

                        {/* Hidden fields kept for compatibility */}
                        <div className="hidden">
                          <FormDescription className="mt-1">
                            Value of goods for customs declaration
                          </FormDescription>
                        </div>

                        {/* Service Level field hidden as requested */}
                        <FormField
                          control={packageForm.control}
                          name="serviceLevel"
                          render={({ field }) => (
                            <FormItem className="hidden">
                              <FormControl>
                                <Input type="hidden" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Display volumetric weight if available */}
                      {billableWeight !== null && (
                        <div className="bg-blue-50 p-4 rounded-md mt-4">
                          <h3 className="font-medium text-blue-700 mb-2">
                            {t("createShipment.packageDetails.weightInfo")}
                            {packages.length > 1 && (
                              <span className="text-xs ml-2 px-2 py-1 bg-blue-100 rounded-full">
                                {packages.length}{" "}
                                {t("createShipment.packageDetails.packages")}
                              </span>
                            )}
                          </h3>

                          {packages.length <= 1 ? (
                            <>
                              <p className="text-sm text-blue-600">
                                <span className="font-medium">
                                  {t(
                                    "createShipment.packageDetails.actualWeight",
                                  )}
                                  :
                                </span>{" "}
                                {packageForm.getValues().packageWeight} kg
                              </p>
                              <p className="text-sm text-blue-600">
                                <span className="font-medium">
                                  {t(
                                    "createShipment.packageDetails.volumetricWeight",
                                  )}
                                  :
                                </span>{" "}
                                {calculateVolumetricWeight(
                                  packageForm.getValues().packageLength,
                                  packageForm.getValues().packageWidth,
                                  packageForm.getValues().packageHeight,
                                ).toFixed(2)}{" "}
                                kg
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-blue-600">
                              <span className="font-medium">
                                {t("createShipment.packageDetails.totalWeight")}
                                :
                              </span>{" "}
                              {packageForm.getValues().packageWeight} kg (
                              {t(
                                "createShipment.packageDetails.sumOfAllPackages",
                              )}
                              )
                            </p>
                          )}

                          <p className="text-sm text-blue-800 font-medium mt-1">
                            <span className="font-medium">
                              {t(
                                "createShipment.packageDetails.billableWeight",
                              )}
                              :
                            </span>{" "}
                            {billableWeight.toFixed(2)} kg
                            {packages.length > 1 && (
                              <span className="text-xs italic ml-1">
                                (
                                {t(
                                  "createShipment.packageDetails.sumOfAllPackageBillableWeights",
                                )}
                                )
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </Form>
                </CardContent>

                <CardFooter className="flex justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setExpandedSections((prev) =>
                          prev.includes("recipient")
                            ? prev
                            : [...prev, "recipient"],
                        );
                        // Auto-collapse this section
                        setExpandedSections((prev) =>
                          prev.filter((s) => s !== "package"),
                        );
                      }}
                    >
                      {t("createShipment.actions.backToRecipient")}
                    </Button>

                    {/* Save as Draft Button */}
                    <Button
                      variant="outline"
                      onClick={() => saveDraftMutation.mutate()}
                      disabled={saveDraftMutation.isPending}
                    >
                      {saveDraftMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("createShipment.draft.saving", "Saving...")}
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {t(
                            "createShipment.draft.saveAsDraft",
                            "Save as Draft",
                          )}
                        </>
                      )}
                    </Button>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={async () => {
                            // Force setting the service level explicitly
                            packageForm.setValue(
                              "serviceLevel",
                              ServiceLevel.STANDARD,
                            );

                            // Make sure itemCount is at least 1 to avoid validation errors
                            // This ensures the form passes validation even if no explicit items are added
                            const currentItemCount =
                              packageForm.getValues().itemCount;
                            if (!currentItemCount || currentItemCount < 1) {
                              packageForm.setValue(
                                "itemCount",
                                Math.max(1, packages.length),
                              );
                            }

                            // Validate package details first
                            const packageValid = await packageForm.trigger();
                            const contentsValid =
                              await receiverForm.trigger("packageContents");

                            if (packageValid && contentsValid) {
                              // Check if any package items have been added

                              if (packageItems.length === 0) {
                                toast({
                                  title: "Products Required",
                                  description:
                                    "Please add at least one product with HTS code in the Package Contents section before calculating price.",
                                  variant: "destructive",
                                });
                                return;
                              }

                              // Validate all package items before proceeding - HS code is required
                              const invalidItems = packageItems.filter(
                                (item) =>
                                  (item.name && item.name.length < 3) ||
                                  !item.hsCode ||
                                  item.hsCode.length < 6,
                              );

                              if (invalidItems.length > 0) {
                                // Find the first invalid item to show specific error
                                const firstInvalid = invalidItems[0];

                                if (
                                  firstInvalid.name &&
                                  firstInvalid.name.length < 3
                                ) {
                                  toast({
                                    title: t(
                                      "products.toast.productNameTooShort",
                                    ),
                                    description: t(
                                      "products.toast.productNameTooShortDesc",
                                    ),
                                    variant: "destructive",
                                  });
                                } else if (
                                  !firstInvalid.hsCode ||
                                  firstInvalid.hsCode.length < 6
                                ) {
                                  toast({
                                    title: t("validations.htsCodeRequired"),
                                    description: t(
                                      "validations.htsCodeRequiredDescription",
                                    ),
                                    variant: "destructive",
                                  });
                                }
                                return;
                              }

                              if (packages.length === 0) {
                                toast({
                                  title: "Missing packages",
                                  description:
                                    "Please add at least one package with dimensions before calculating price.",
                                  variant: "destructive",
                                });
                                return;
                              }

                              // Calculate total billable weight right before calling API
                              let totalWeight = 0;
                              packages.forEach((pkg) => {
                                const volWeight = calculateVolumetricWeight(
                                  parseFloat(pkg.length || "0"),
                                  parseFloat(pkg.width || "0"),
                                  parseFloat(pkg.height || "0"),
                                );
                                totalWeight += Math.max(
                                  volWeight,
                                  parseFloat(pkg.weight || "0"),
                                );
                              });

                              // Calculate price using the combined billable weight
                              calculatePrice();

                              // Proceed to price section
                              setExpandedSections((prev) =>
                                prev.includes("price")
                                  ? prev
                                  : [...prev, "price"],
                              );
                              // Auto-collapse this section
                              setExpandedSections((prev) =>
                                prev.filter((s) => s !== "package"),
                              );
                            } else {
                              // Find and report missing fields for better user feedback
                              const packageErrors =
                                packageForm.formState.errors;
                              const receiverErrors =
                                receiverForm.formState.errors;

                              // Get error messages into a list
                              const errorMessages: string[] = [];

                              // Check both forms for missing required fields
                              if (Object.keys(packageErrors).length > 0) {
                                // Add package form errors
                                Object.values(packageErrors).forEach(
                                  (error) => {
                                    if (error?.message)
                                      errorMessages.push(
                                        error.message as string,
                                      );
                                  },
                                );
                              }

                              if (Object.keys(receiverErrors).length > 0) {
                                // Only check for packageContents since that's all we validate from receiver form
                                if (receiverErrors.packageContents?.message) {
                                  errorMessages.push(
                                    receiverErrors.packageContents
                                      .message as string,
                                  );
                                }
                              }

                              // Create a detailed error message
                              const errorDetails =
                                errorMessages.length > 0
                                  ? t("validations.missingFields", {
                                      fields: errorMessages.join(", "),
                                    })
                                  : t("validations.fillAllRequiredFields");

                              // Show toast with specific validation errors
                              toast({
                                title: t("validations.validationFailed"),
                                description: errorDetails,
                                variant: "destructive",
                              });

                              // Log the errors for debugging
                            }
                          }}
                          disabled={(() => {
                            // Check if all required package details are available
                            const hasPackageContents =
                              receiverForm.getValues().packageContents &&
                              receiverForm.getValues().packageContents.trim()
                                .length > 0;
                            const hasPackages = packages.length > 0;
                            const hasValidPackageItems =
                              packageItems.length > 0 &&
                              packageItems.every(
                                (item) =>
                                  item.name &&
                                  item.name.length >= 3 &&
                                  item.hsCode &&
                                  item.hsCode.length >= 6,
                              );
                            const hasDestinationCountry =
                              packageForm.getValues().receiverCountry &&
                              packageForm.getValues().receiverCountry.length >
                                0;

                            // Button is disabled if any required information is missing
                            return (
                              !hasPackageContents ||
                              !hasPackages ||
                              !hasValidPackageItems ||
                              !hasDestinationCountry
                            );
                          })()}
                          className={`bg-primary text-primary-foreground transition-all ${(() => {
                            const hasPackageContents =
                              receiverForm.getValues().packageContents &&
                              receiverForm.getValues().packageContents.trim()
                                .length > 0;
                            const hasPackages = packages.length > 0;
                            const hasValidPackageItems =
                              packageItems.length > 0 &&
                              packageItems.every(
                                (item) =>
                                  item.name &&
                                  item.name.length >= 3 &&
                                  item.hsCode &&
                                  item.hsCode.length >= 6,
                              );
                            const hasDestinationCountry =
                              packageForm.getValues().receiverCountry &&
                              packageForm.getValues().receiverCountry.length >
                                0;

                            const isDisabled =
                              !hasPackageContents ||
                              !hasPackages ||
                              !hasValidPackageItems ||
                              !hasDestinationCountry;

                            return isDisabled
                              ? "opacity-50 cursor-not-allowed hover:bg-primary"
                              : "hover:bg-primary/90";
                          })()}`}
                        >
                          <Calculator className="mr-2 h-4 w-4" />
                          {priceDetails
                            ? packageDetailsChanged
                              ? t("createShipment.actions.calculatePrice")
                              : t("createShipment.priceDetails.title")
                            : t("createShipment.actions.calculatePrice")}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          {(() => {
                            const receiverData = receiverForm.getValues();
                            const missing = [];

                            if (!receiverData.packageContents?.trim()) {
                              missing.push(
                                t("createShipment.tooltip.packageContents"),
                              );
                            }

                            if (
                              packages.length === 0 ||
                              packages.some(
                                (pkg) =>
                                  !pkg.length ||
                                  !pkg.width ||
                                  !pkg.height ||
                                  !pkg.weight ||
                                  parseFloat(pkg.length) <= 0 ||
                                  parseFloat(pkg.width) <= 0 ||
                                  parseFloat(pkg.height) <= 0 ||
                                  parseFloat(pkg.weight) <= 0,
                              )
                            ) {
                              missing.push(
                                t("createShipment.tooltip.packageDimensions"),
                              );
                            }

                            const packageData = packageForm.getValues() as any;
                            if (!packageData.receiverCountry?.trim()) {
                              missing.push(
                                t("createShipment.tooltip.destinationCountry"),
                              );
                            }

                            const items = packageItems.filter(
                              (item) =>
                                item.name?.trim() &&
                                item.name.length >= 3 &&
                                item.hsCode?.trim() &&
                                item.hsCode.length >= 6,
                            );

                            if (items.length === 0) {
                              missing.push(
                                t("createShipment.tooltip.productItems"),
                              );
                            }

                            if (missing.length === 0) {
                              return t("createShipment.tooltip.ready");
                            }

                            return (
                              <div>
                                <div className="font-medium mb-1">
                                  {t("createShipment.tooltip.missing")}
                                </div>
                                <ul className="list-disc list-inside space-y-0.5">
                                  {missing.map((item, index) => (
                                    <li key={index}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })()}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardFooter>
              </>
            )}
          </Card>

          {/* 3. Price Section */}
          <Card
            id="price-section"
            className={`${expandedSections.includes("price") ? "border-primary" : ""}`}
          >
            <CardHeader
              className={`cursor-pointer ${isSectionComplete("price") ? "bg-green-50" : ""}`}
              onClick={() => toggleSection("price")}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TruckIcon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">
                    {t("createShipment.sections.priceAndShipping")}
                  </CardTitle>
                  {isSectionComplete("price") && (
                    <div className="flex items-center text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      <Check className="h-3 w-3 mr-1" />
                      {t("common.complete")}
                    </div>
                  )}
                </div>
                {expandedSections.includes("price") ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>

            {expandedSections.includes("price") && (
              <>
                <CardContent>
                  {priceDetails ? (
                    <div className="space-y-6">
                      {/* Service Selection Header with Re-calculate Button */}
                      <div className="text-center">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-gray-800">
                              {t(
                                "priceCalculator.chooseService",
                                "Choose Your MoogShip Service",
                              )}
                            </h3>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await calculatePrice();
                            }}
                            disabled={isCalculatingPrice}
                            className="ml-4"
                          >
                            {isCalculatingPrice ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Re-calculate
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-gray-600">
                          {t(
                            "priceCalculator.selectBestOption",
                            "Select the shipping option that best fits your needs",
                          )}
                        </p>
                      </div>

                      {/* Service Options Grid */}
                      {priceDetails.options &&
                      priceDetails.options.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {priceDetails.options.map(
                            (option: any, index: any) => {
                              // Fix service selection comparison - compare by unique identifier
                              const isSelected =
                                selectedServiceOption &&
                                selectedServiceOption.displayName === option.displayName &&
                                selectedServiceOption.totalPrice === option.totalPrice;

                              // Detect service type from display name - use correct backend data
                              const displayName =
                                option.displayName.toLowerCase();
                              const isEco = displayName.includes("eco");
                              const isExpress = displayName.includes("express");
                              const isUPS = displayName.includes("ups");
                              const isDHL = displayName.includes("dhl");
                              const isFedEx = displayName.includes("fedex");
                              const isAramex = displayName.includes("aramex");
                              const isStandard =
                                displayName.includes("standard") && !isExpress;

                              // Determine service colors and text based on type - matching other pages
                              let badgeColor = "bg-blue-100 text-blue-800";
                              let borderColor =
                                "border-gray-200 hover:border-blue-300";
                              let bgGradient = "bg-white hover:bg-gray-50";
                              let badgeText = "STANDARD";

                              if (isEco) {
                                badgeColor = "bg-green-100 text-green-800";
                                borderColor =
                                  "border-green-200 hover:border-green-300";
                                bgGradient =
                                  "bg-gradient-to-r from-green-50 to-white hover:from-green-100 hover:to-gray-50";
                                badgeText = "ECO";
                              } else if (isExpress) {
                                badgeColor = "bg-orange-100 text-orange-800";
                                borderColor =
                                  "border-orange-200 hover:border-orange-300";
                                bgGradient =
                                  "bg-gradient-to-r from-orange-50 to-white hover:from-orange-100 hover:to-gray-50";
                                badgeText = "EXPRESS";
                              } else if (isUPS) {
                                badgeColor = "bg-yellow-100 text-yellow-800";
                                borderColor =
                                  "border-yellow-200 hover:border-yellow-300";
                                bgGradient =
                                  "bg-gradient-to-r from-yellow-50 to-white hover:from-yellow-100 hover:to-gray-50";
                                badgeText = "UPS";
                              } else if (isDHL) {
                                badgeColor = "bg-red-100 text-red-800";
                                borderColor =
                                  "border-red-200 hover:border-red-300";
                                bgGradient =
                                  "bg-gradient-to-r from-red-50 to-white hover:from-red-100 hover:to-gray-50";
                                badgeText = "DHL";
                              } else if (isFedEx) {
                                badgeColor = "bg-purple-100 text-purple-800";
                                borderColor =
                                  "border-purple-200 hover:border-purple-300";
                                bgGradient =
                                  "bg-gradient-to-r from-purple-50 to-white hover:from-purple-100 hover:to-gray-50";
                                badgeText = "FEDEX";
                              } else if (isAramex) {
                                badgeColor = "bg-rose-100 text-rose-800";
                                borderColor =
                                  "border-rose-200 hover:border-rose-300";
                                bgGradient =
                                  "bg-gradient-to-r from-rose-50 to-white hover:from-rose-100 hover:to-gray-50";
                                badgeText = "ARAMEX";
                              } else if (isStandard) {
                                badgeColor = "bg-blue-100 text-blue-800";
                                borderColor =
                                  "border-blue-200 hover:border-blue-300";
                                bgGradient =
                                  "bg-gradient-to-r from-blue-50 to-white hover:from-blue-100 hover:to-gray-50";
                                badgeText = "STANDARD";
                              }

                              return (
                                <div
                                  key={`${option.id}-${index}`}
                                  className={`relative border-2 rounded-lg p-3 transition-all duration-200 cursor-pointer ${
                                    isSelected ? 'ring-2 ring-blue-500 border-blue-500' : borderColor
                                  } ${
                                    isSelected ? 'bg-blue-50' : bgGradient
                                  } ${
                                    isSelected ? 'shadow-lg' : 'shadow-sm hover:shadow-md'
                                  }`}
                                  onClick={() => {
                                    // Attach duties from priceDetails when switching service options
                                    const optionWithDuties = {
                                      ...option,
                                      duties: priceDetails?.duties || {}
                                    };
                                    setSelectedServiceOption(optionWithDuties);
                                    // Update credit limit check with selected option price
                                    checkCreditLimit(option.totalPrice);
                                  }}
                                >
                                  {/* Service type badge */}
                                  <div className="absolute top-2 right-2">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}
                                    >
                                      {isEco
                                        ? "Eco"
                                        : isExpress
                                          ? "Express"
                                          : isUPS
                                            ? "UPS"
                                            : isDHL
                                              ? "DHL"
                                              : isFedEx
                                                ? "FedEx"
                                                : isAramex
                                                  ? "Aramex"
                                                  : isStandard
                                                    ? "Standard"
                                                    : "Standard"}
                                    </span>
                                  </div>

                                  <div className="pr-14">
                                    {/* Service Name */}
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className="font-semibold text-gray-900">
                                        {option.displayName}
                                      </h3>
                                    </div>

                                    {/* Service description/delivery time */}
                                    <p className="text-sm text-gray-600 mb-2">
                                      {option.deliveryTime ||
                                        (badgeText === "ECO"
                                          ? "4-9 business days"
                                          : badgeText === "EXPRESS"
                                            ? "2-4 business days"
                                            : badgeText === "UPS"
                                              ? "1-4 business days"
                                            : badgeText === "DHL"
                                              ? "1-3 business days"
                                              : badgeText === "FEDEX"
                                                ? "1-3 business days"
                                                : badgeText === "ARAMEX"
                                                  ? "2-4 business days"
                                                  : "4-9 business days")}
                                    </p>

                                    {/* Price */}
                                    <div className="mt-3">
                                      <div className="text-2xl font-bold text-gray-900">
                                        ${(option.totalPrice / 100).toFixed(2)}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        Total shipping cost
                                      </div>
                                    </div>
                                  </div>

                                  {/* Selection Indicator */}
                                  {isSelected && (
                                    <div className="absolute top-2 left-2">
                                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-green-500">
                                        <CheckCircle className="h-4 w-4 text-green-500 fill-current" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      ) : (
                        // Fallback single option display
                        <div className="bg-gray-50 p-6 rounded-lg border">
                          <h3 className="text-xl font-medium mb-4">
                            {t(
                              "createShipment.priceDetails.shippingPriceDetails",
                            )}
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600 text-base">
                                {t("createShipment.priceDetails.basePrice")}:
                              </span>
                              <span className="font-medium text-base">
                                ${(priceDetails.basePrice / 100).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 text-base">
                                {t("createShipment.priceDetails.fuelCharge")}:
                              </span>
                              <span className="font-medium text-base">
                                ${(priceDetails.fuelCharge / 100).toFixed(2)}
                              </span>
                            </div>
                            <div className="border-t my-2 pt-2 flex justify-between">
                              <span className="text-gray-800 font-semibold text-lg">
                                {t("createShipment.priceDetails.totalPrice")}:
                              </span>
                              <span className="text-xl font-bold text-primary">
                                ${(priceDetails.totalPrice / 100).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Credit Limit Warning */}
                      {creditLimitInfo && (
                        <div
                          className={`p-3 rounded-md flex items-start gap-2 ${
                            creditLimitInfo.hasWarning
                              ? "bg-red-50 border border-red-200"
                              : "bg-green-50 border border-green-200"
                          }`}
                        >
                          {creditLimitInfo.hasWarning ? (
                            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          )}
                          <div>
                            <p
                              className={`font-medium ${creditLimitInfo.hasWarning ? "text-red-700" : "text-green-700"}`}
                            >
                              {creditLimitInfo.hasWarning
                                ? t(
                                    "createShipment.priceDetails.creditLimitWarning",
                                  )
                                : t(
                                    "createShipment.priceDetails.creditCheckPassed",
                                  )}
                            </p>
                            <div className="text-sm mt-1 space-y-1">
                              <p>
                                {t(
                                  "createShipment.priceDetails.currentBalance",
                                )}
                                :{" "}
                                <span className="font-medium">
                                  {creditLimitInfo.formattedUserBalance}
                                </span>
                              </p>
                              <p>
                                {t(
                                  "createShipment.priceDetails.newBalanceAfterShipment",
                                )}
                                :{" "}
                                <span className="font-medium">
                                  {creditLimitInfo.formattedNewBalance}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Insurance Selection */}
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-medium">
                            {t("customs.insuranceProtection")}
                          </h3>
                        </div>
                        <InsuranceSelection form={packageForm} />
                      </div>

                      {/* Total Cost Summary */}
                      {selectedServiceOption && (
                        <TotalCostSummaryComponent
                          selectedService={selectedServiceOption}
                          form={packageForm}
                        />
                      )}

                      {/* Combined Package Details and Shipping Route Table */}
                      {packages && packages.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg mb-4">
                          <div className="flex items-center space-x-2 mb-4">
                            <Package className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-800">
                              {i18n.language === "tr"
                                ? "Gönderi Özeti"
                                : "Shipment Summary"}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Package Details Section */}
                            <div>
                              <h4 className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                                {t(
                                  "shipping.packageDetails",
                                  "Package Details",
                                )}
                              </h4>
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">
                                    {t("shipping.pieces", "Pieces")}:
                                  </span>
                                  <span className="text-gray-900 font-medium">
                                    {packages.length}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">
                                    {t("shipping.totalWeight", "Total Weight")}:
                                  </span>
                                  <span className="text-gray-900 font-medium">
                                    {packages
                                      .reduce(
                                        (total, pkg) =>
                                          total + (parseFloat(pkg.weight) || 0),
                                        0,
                                      )
                                      .toFixed(2)}{" "}
                                    kg
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">
                                    {t("shipping.dimensions", "Dimensions")}:
                                  </span>
                                  <span className="text-gray-900 font-medium">
                                    {packages.length === 1
                                      ? `${packages[0].length}×${packages[0].width}×${packages[0].height} cm`
                                      : `${packages.length} ${i18n.language === "tr" ? "paket" : "packages"}`}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">
                                    {t("shipping.contents", "Contents")}:
                                  </span>
                                  <span className="text-gray-900 font-medium">
                                    {packageItems.length > 0
                                      ? packageItems.length === 1
                                        ? packageItems[0].description.substring(
                                            0,
                                            20,
                                          ) +
                                          (packageItems[0].description.length >
                                          20
                                            ? "..."
                                            : "")
                                        : `${packageItems[0].description.substring(0, 15)}... +${packageItems.length - 1} ${i18n.language === "tr" ? "diğer" : "more"}`
                                      : `${packageItems.length} ${t("shipping.items", "items")}`}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">
                                    {t("shipping.totalValue", "Total Value")}:
                                  </span>
                                  <span className="text-gray-900 font-medium">
                                    $
                                    {packageItems
                                      .reduce(
                                        (total, item) =>
                                          total +
                                          parseFloat(item.price) *
                                            parseInt(item.quantity),
                                        0,
                                      )
                                      .toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Shipping Route Section */}
                            <div>
                              <h4 className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                                {t(
                                  "priceCalculator.shippingRoute",
                                  "Shipping Route",
                                )}
                              </h4>
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">
                                    {t("shipping.origin", "Origin")}:
                                  </span>
                                  <span className="text-gray-900 font-medium">
                                    {i18n.language === "tr"
                                      ? "Türkiye"
                                      : "Turkey"}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">
                                    {t("shipping.destination", "Destination")}:
                                  </span>
                                  <span className="text-gray-900 font-medium">
                                    {(() => {
                                      const country = COUNTRIES.find(
                                        (c) =>
                                          c.code ===
                                          packageForm.getValues()
                                            .receiverCountry,
                                      );
                                      if (!country)
                                        return packageForm.getValues()
                                          .receiverCountry;

                                      // Direct translation mapping for common countries
                                      if (i18n.language === "tr") {
                                        const turkishCountries = {
                                          US: "Amerika Birleşik Devletleri",
                                          CA: "Kanada",
                                          GB: "Birleşik Krallık",
                                          DE: "Almanya",
                                          FR: "Fransa",
                                          IT: "İtalya",
                                          ES: "İspanya",
                                          AU: "Avustralya",
                                          JP: "Japonya",
                                          CN: "Çin",
                                          BR: "Brezilya",
                                          MX: "Meksika",
                                          IN: "Hindistan",
                                          RU: "Rusya",
                                          KR: "Güney Kore",
                                          NL: "Hollanda",
                                          BE: "Belçika",
                                          CH: "İsviçre",
                                          AT: "Avusturya",
                                          SE: "İsveç",
                                          NO: "Norveç",
                                          DK: "Danimarka",
                                          FI: "Finlandiya",
                                          IE: "İrlanda",
                                          PT: "Portekiz",
                                          GR: "Yunanistan",
                                          TR: "Türkiye",
                                        };
                                        return (
                                          turkishCountries[
                                            country.code as keyof typeof turkishCountries
                                          ] || country.name
                                        );
                                      }
                                      return country.name;
                                    })()}
                                  </span>
                                </div>
                                {priceDetails.options &&
                                  priceDetails.options.length > 0 &&
                                  selectedServiceOption >= 0 && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">
                                        {t(
                                          "shipping.selectedService",
                                          "Selected Service",
                                        )}
                                        :
                                      </span>
                                      <span className="text-gray-900 font-medium">
                                        {priceDetails.options[
                                          selectedServiceOption
                                        ]?.serviceType || "Standard"}
                                      </span>
                                    </div>
                                  )}
                                {packages && packages.length > 0 && (
                                  <>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">
                                        {i18n.language === "tr"
                                          ? "Gerçek Ağırlık"
                                          : "Actual Weight"}
                                        :
                                      </span>
                                      <span className="text-gray-900 font-medium">
                                        {packages
                                          .reduce(
                                            (total, pkg) =>
                                              total +
                                              (parseFloat(pkg.weight) || 0),
                                            0,
                                          )
                                          .toFixed(2)}{" "}
                                        kg
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">
                                        {i18n.language === "tr"
                                          ? "Hacimsel Ağırlık"
                                          : "Volumetric Weight"}
                                        :
                                      </span>
                                      <span className="text-gray-900 font-medium">
                                        {(() => {
                                          if (packages.length === 1) {
                                            const pkg = packages[0];
                                            const length =
                                              parseFloat(pkg.length) || 0;
                                            const width =
                                              parseFloat(pkg.width) || 0;
                                            const height =
                                              parseFloat(pkg.height) || 0;
                                            return (
                                              (length * width * height) /
                                              5000
                                            ).toFixed(2);
                                          } else {
                                            // For multiple packages, use max dimensions
                                            let maxLength = 0,
                                              maxWidth = 0,
                                              maxHeight = 0;
                                            packages.forEach((pkg) => {
                                              maxLength = Math.max(
                                                maxLength,
                                                parseFloat(pkg.length) || 0,
                                              );
                                              maxWidth = Math.max(
                                                maxWidth,
                                                parseFloat(pkg.width) || 0,
                                              );
                                              maxHeight = Math.max(
                                                maxHeight,
                                                parseFloat(pkg.height) || 0,
                                              );
                                            });
                                            return (
                                              (maxLength *
                                                maxWidth *
                                                maxHeight) /
                                              5000
                                            ).toFixed(2);
                                          }
                                        })()}{" "}
                                        kg
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-800 font-bold">
                                        {i18n.language === "tr"
                                          ? "Faturalandırılabilir Ağırlık"
                                          : "Billable Weight"}
                                        :
                                      </span>
                                      <span className="text-gray-900 font-bold">
                                        {(() => {
                                          const actualWeight = packages.reduce(
                                            (total, pkg) =>
                                              total +
                                              (parseFloat(pkg.weight) || 0),
                                            0,
                                          );
                                          let volumetricWeight;
                                          if (packages.length === 1) {
                                            const pkg = packages[0];
                                            const length =
                                              parseFloat(pkg.length) || 0;
                                            const width =
                                              parseFloat(pkg.width) || 0;
                                            const height =
                                              parseFloat(pkg.height) || 0;
                                            volumetricWeight =
                                              (length * width * height) / 5000;
                                          } else {
                                            // For multiple packages, use max dimensions
                                            let maxLength = 0,
                                              maxWidth = 0,
                                              maxHeight = 0;
                                            packages.forEach((pkg) => {
                                              maxLength = Math.max(
                                                maxLength,
                                                parseFloat(pkg.length) || 0,
                                              );
                                              maxWidth = Math.max(
                                                maxWidth,
                                                parseFloat(pkg.width) || 0,
                                              );
                                              maxHeight = Math.max(
                                                maxHeight,
                                                parseFloat(pkg.height) || 0,
                                              );
                                            });
                                            volumetricWeight =
                                              (maxLength *
                                                maxWidth *
                                                maxHeight) /
                                              5000;
                                          }
                                          return Math.max(
                                            actualWeight,
                                            volumetricWeight,
                                          ).toFixed(2);
                                        })()}{" "}
                                        kg
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-center">
                        <div className="relative group">
                          <Button
                            type="button"
                            onClick={() => {
                              // Ensure user has selected a service option
                              if (!selectedServiceOption) {
                                toast({
                                  title: t(
                                    "createShipment.validation.selectService",
                                  ),
                                  description: t(
                                    "createShipment.validation.selectServiceDescription",
                                  ),
                                  variant: "destructive",
                                });
                                return;
                              }

                              // ADD THIS CONSOLE LOG HERE
                             

                              const selectedOption = selectedServiceOption;

                              // Always create the shipment with one click
                              const receiverFormData = receiverForm.getValues();
                              const packageFormData = packageForm.getValues();

                              // Check if destination is an EU country or HMRC country and number is required
                              const countryCode =
                                packageFormData.receiverCountry;
                              const isEUDestination = isEUCountry(countryCode);
                              const isHMRCDestination =
                                isHMRCCountry(countryCode);
                              const numberValue =
                                packageFormData.iossNumber || "";

                              // Validate IOSS number for EU countries (not including HMRC countries)
                              if (
                                isEUDestination &&
                                !isHMRCDestination &&
                                (!numberValue || numberValue.trim() === "")
                              ) {
                                toast({
                                  title: t("notifications.iossNumberRequired"),
                                  description: t(
                                    "notifications.iossNumberRequiredDescription",
                                  ),
                                  variant: "destructive",
                                });
                                packageForm.setError("iossNumber", {
                                  type: "manual",
                                  message: t("validations.iossNumberRequired"),
                                });
                                return;
                              }

                              // Validate HMRC number for UK and Sweden
                              if (
                                isHMRCDestination &&
                                (!numberValue || numberValue.trim() === "")
                              ) {
                                const countryName =
                                  countryCode === "GB"
                                    ? "United Kingdom"
                                    : "Sweden";
                                toast({
                                  title: t("notifications.hmrcNumberRequired"),
                                  description: t(
                                    "notifications.hmrcNumberRequiredDescription",
                                    { countryName },
                                  ),
                                  variant: "destructive",
                                });
                                packageForm.setError("iossNumber", {
                                  type: "manual",
                                  message: t("validations.hmrcNumberRequired", {
                                    countryName,
                                  }),
                                });
                                return;
                              }

                              // Validate state field for countries that require states
                              if (hasStates(countryCode)) {
                                const stateValue = receiverFormData.receiverState || "";
                                if (!stateValue || stateValue.trim() === "") {
                                  toast({
                                    title: "State/Province Required",
                                    description: "Please select a state/province for this destination country.",
                                    variant: "destructive",
                                  });
                                  receiverForm.setError("receiverState", {
                                    type: "manual",
                                    message: "State/Province is required for this country",
                                  });
                                  return;
                                }
                              }

                              // Calculate dimensions from the package data entered in the UI
                              let totalPackageData = {
                                length: 0,
                                width: 0,
                                height: 0,
                                weight: 0,
                              };

                              // If we have packages, use the dimensions from those packages
                              if (packages && packages.length > 0) {
                                // For a single package, use its dimensions directly
                                if (packages.length === 1) {
                                  const pkg = packages[0];
                                  totalPackageData = {
                                    length: parseFloat(pkg.length || 0),
                                    width: parseFloat(pkg.width || 0),
                                    height: parseFloat(pkg.height || 0),
                                    weight: parseFloat(pkg.weight || 0),
                                  };
                                } else {
                                  // For multiple packages, calculate combined weight
                                  let totalWeight = 0;
                                  let maxLength = 0,
                                    maxWidth = 0,
                                    maxHeight = 0;

                                  // Get the maximum dimensions across all packages
                                  packages.forEach((pkg) => {
                                    totalWeight += parseFloat(pkg.weight || 0);
                                    maxLength = Math.max(
                                      maxLength,
                                      parseFloat(pkg.length || 0),
                                    );
                                    maxWidth = Math.max(
                                      maxWidth,
                                      parseFloat(pkg.width || 0),
                                    );
                                    maxHeight = Math.max(
                                      maxHeight,
                                      parseFloat(pkg.height || 0),
                                    );
                                  });

                                  // Use the max dimensions and total weight
                                  totalPackageData = {
                                    length: maxLength,
                                    width: maxWidth,
                                    height: maxHeight,
                                    weight: totalWeight,
                                  };
                                }
                              }

                              // Override the form data with the calculated dimensions
                              const formattedPackageData = {
                                packageLength: totalPackageData.length,
                                packageWidth: totalPackageData.width,
                                packageHeight: totalPackageData.height,
                                packageWeight: totalPackageData.weight,
                                pieceCount: packages.length || 1,
                              };

                              // Calculate total item value and count from package items for customs
                              const totalItemsCount = packageItems.reduce(
                                (total, item) =>
                                  total + (parseInt(item.quantity) || 1),
                                0,
                              );

                              // Calculate total value with proper decimal handling
                              const totalItemsValue = packageItems.reduce(
                                (total, item) => {
                                  // Get price in dollars (with decimals) from item
                                  const price = parseFloat(item.price) || 0;
                                  const quantity = parseInt(item.quantity) || 1;
                                  return total + price * quantity;
                                },
                                0,
                              );

                              // Ensure we got a properly formatted decimal value
                              const formattedTotalValue = parseFloat(
                                totalItemsValue.toFixed(2),
                              );

                              // Extract the provider service code from the selected option
                              let selectedService = "moogship"; // Default fallback

                              if (selectedServiceOption) {
                                // Try to extract service code in order of preference
                                if (selectedServiceOption.providerServiceCode) {
                                  selectedService =
                                    selectedServiceOption.providerServiceCode;
                                } else if (selectedServiceOption.serviceCode) {
                                  selectedService =
                                    selectedServiceOption.serviceCode;
                                  // Map service type to provider service codes
                                  const serviceType =
                                    selectedServiceOption.serviceType.toLowerCase();
                                  if (
                                    serviceType.includes("eco") ||
                                    serviceType === "economy"
                                  ) {
                                    selectedService = "eco";
                                  } else if (
                                    serviceType.includes("ups") ||
                                    serviceType === "express"
                                  ) {
                                    selectedService =
                                      "ups-ekspress";
                                  } else if (serviceType.includes("standard")) {
                                    selectedService = "widect";
                                  }
                                } else if (selectedServiceOption.displayName) {
                                  // Map display name to provider service codes
                                  const displayName =
                                    selectedServiceOption.displayName.toLowerCase();
                                  if (displayName.includes("eco")) {
                                    selectedService = "eco";
                                  } else if (
                                    displayName.includes("ups") ||
                                    displayName.includes("express")
                                  ) {
                                    selectedService =
                                      "ups-ekspress";
                                  } else if (displayName.includes("standard")) {
                                    selectedService = "widect";
                                  } else if (displayName.includes("fedex")) {
                                    selectedService = "fedex";
                                  } else if (displayName.includes("aramex")) {
                                    selectedService = "aramex";
                                  }
                                }
                              }

                              // Create the shipment with the proper package dimensions and customs values
                              const shipmentData = {
                                ...receiverFormData,
                                ...packageFormData,
                                ...formattedPackageData,
                                packageItems: packageItems,
                                packages: packages,
                                // Add the selected service information from user's actual selection
                                selectedService:
                                  selectedServiceOption?.providerServiceCode ||
                                  selectedServiceOption?.serviceCode ||
                                  selectedServiceOption?.serviceType ||
                                  selectedServiceOption?.displayName ||
                                  "moogship",
                                // Store the pricing from the selected option
                                totalPrice:
                                  selectedServiceOption?.totalPrice ||
                                  priceDetails.totalPrice,
                                basePrice:
                                  selectedServiceOption?.cargoPrice ||
                                  selectedServiceOption?.basePrice ||
                                  priceDetails.basePrice,
                                fuelCharge:
                                  selectedServiceOption?.fuelCost ||
                                  selectedServiceOption?.fuelCharge ||
                                  priceDetails.fuelCharge,
                                // Add customs values based on the package items
                                // Convert dollars to cents and round to integer for database storage
                                customsValue: Math.round(
                                  formattedTotalValue * 100,
                                ),
                                customsItemCount: totalItemsCount,
                                // Include insurance information if available
                                includeInsurance:
                                  packageFormData.includeInsurance,
                                insuranceCost:
                                  priceDetails.insurance?.insuranceCost || 0,
                                declaredValue:
                                  priceDetails.insurance?.declaredValue || 0,
                              };

                              // Log IOSS/HMRC number information for debugging

                              // Set default email if none provided
                              if (
                                !shipmentData.receiverEmail ||
                                shipmentData.receiverEmail.trim() === ""
                              ) {
                                shipmentData.receiverEmail =
                                  "info@moogship.com";
                              }

                              // Submit the data
                              createShipmentMutation.mutate(shipmentData);
                            }}
                            className="w-full md:w-auto"
                            variant="default"
                            disabled={
                              createShipmentMutation.isPending ||
                              (creditLimitInfo && creditLimitInfo.hasWarning) ||
                              !selectedServiceOption
                            }
                          >
                            {createShipmentMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {t("shipping.creatingLabel")}
                              </>
                            ) : (
                              <>
                                <TruckIcon className="h-4 w-4 mr-2" />
                                {t("shipping.acceptPriceAndCreateLabel")}
                              </>
                            )}
                          </Button>

                          {/* Save as Draft Button - hidden as requested */}

                          {/* Tooltip for users who are over their credit limit */}
                          {creditLimitInfo && creditLimitInfo.hasWarning && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-red-100 text-red-800 text-xs rounded border border-red-300 shadow-lg hidden group-hover:block transition-opacity duration-300">
                              <p className="font-medium">
                                {t("notifications.insufficientFunds")}
                              </p>
                              <p>
                                {t("notifications.addFundsToBalance", {
                                  amount: (
                                    Math.max(
                                      0,
                                      (priceDetails?.totalPrice || 0) -
                                        (creditLimitInfo?.availableCredit || 0),
                                    ) / 100
                                  ).toFixed(2),
                                })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground">
                        {t("shipping.priceDetailsWillAppear")}
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                          setExpandedSections((prev) =>
                            prev.includes("package")
                              ? prev
                              : [...prev, "package"],
                          );
                          setExpandedSections((prev) =>
                            prev.filter((s) => s !== "price"),
                          );
                        }}
                      >
                        <Package className="mr-2 h-4 w-4" />
                        {t("shipping.goToPackageDetails")}
                      </Button>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setExpandedSections((prev) =>
                          prev.includes("package")
                            ? prev
                            : [...prev, "package"],
                        );
                        // Auto-collapse this section
                        setExpandedSections((prev) =>
                          prev.filter((s) => s !== "price"),
                        );
                      }}
                    >
                      {t("shipping.backToPackageDetails")}
                    </Button>

                    {/* Save as Draft Button - hidden as requested */}
                  </div>

                  {/* Create Order Button - hidden as requested */}
                </CardFooter>
              </>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}

// Wrapped component with error boundary  
function WrappedShipmentCreate() {
  return (
    <ShipmentCreateErrorBoundary>
      <ShipmentCreate />
    </ShipmentCreateErrorBoundary>
  );
}

export default WrappedShipmentCreate;
