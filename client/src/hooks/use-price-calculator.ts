import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ServiceLevel } from "@shared/schema";

export interface PriceCalculationParams {
  senderPostalCode: string;
  senderCity: string;
  receiverPostalCode: string;
  receiverCity: string;
  receiverCountry: string;
  packageLength: number;
  packageWidth: number;
  packageHeight: number;
  packageWeight: number;
  serviceLevel: ServiceLevel;
}

export interface MoogShipPriceOption {
  id: string;
  serviceName: string;
  displayName: string;
  cargoPrice: number;
  fuelCost: number;
  additionalFee?: number; // Pass-through fees (not multiplied by user margin)
  totalPrice: number;
  deliveryTime: string;
  serviceType: string;
  description?: string;
}

export interface MoogShipPriceResponse {
  success: boolean;
  options: MoogShipPriceOption[];
  bestOption?: string;
  currency: string;
  duties?: any; // Duties data from backend
}

export interface PriceCalculationResult {
  success: boolean;
  options: MoogShipPriceOption[];
  bestOption?: string;
  currency: string;
  duties?: any; // Duties and taxes data from backend
  // Legacy fields for backward compatibility
  basePrice?: number;
  fuelCharge?: number;
  totalPrice?: number;
  estimatedDeliveryDays?: number;
  carrierName?: string;
}

interface PackageDetails {
  packageLength: string | number;
  packageWidth: string | number;
  packageHeight: string | number;
  packageWeight: string | number;
  senderPostalCode: string;
  senderCity: string;
  receiverPostalCode: string;
  receiverCity: string;
  receiverCountry: string;
  productName?: string;
  productDescription?: string;
  hsCode?: string;
  customsValue?: number;
  shippingTerms?: 'dap' | 'ddp';
}

/**
 * Custom hook to calculate shipping prices using the MoogShip pricing API
 */
export function usePriceCalculator() {
  const [packageDetails, setPackageDetails] = useState<PackageDetails>({
    packageLength: "",
    packageWidth: "",
    packageHeight: "",
    packageWeight: "",
    senderPostalCode: "",
    senderCity: "",
    receiverPostalCode: "",
    receiverCity: "",
    receiverCountry: "",
    productName: "",
    productDescription: "",
    hsCode: "",
    customsValue: undefined,
    shippingTerms: 'dap',
  });

  const [directBillableWeight, setDirectBillableWeight] = useState<
    string | number
  >("");
  const [useBillableWeightDirect, setUseBillableWeightDirect] = useState(false);
  const [volumetricWeight, setVolumetricWeight] = useState(0);
  const [billableWeight, setBillableWeight] = useState(0);
  const [priceResult, setPriceResult] = useState<PriceCalculationResult | null>(
    null,
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (
      data: PriceCalculationParams,
    ): Promise<PriceCalculationResult> => {
      // Create a modified data object with explicit number conversion
      const formattedData = {
        packageLength: Number(data.packageLength),
        packageWidth: Number(data.packageWidth),
        packageHeight: Number(data.packageHeight),
        packageWeight: Number(data.packageWeight),
        receiverCountry: data.receiverCountry,
        // Include product information for duty calculations
        productName: packageDetails.productName,
        productDescription: packageDetails.productDescription,
        hsCode: packageDetails.hsCode,
        customsValue: packageDetails.customsValue,
        shippingTerms: packageDetails.shippingTerms || 'dap',
        // Enable enhanced USITC duty calculations for international shipments
        dutyProvider: data.receiverCountry !== 'TR' ? 'ups' : undefined,
      };

      console.log('🚀 Frontend sending to API:', formattedData);
      console.log('🚀 Product details from form:', {
        productName: packageDetails.productName,
        productDescription: packageDetails.productDescription,
        hsCode: packageDetails.hsCode,
        customsValue: packageDetails.customsValue
      });

      try {
        const response = await apiRequest(
          "POST",
          "/api/pricing/moogship-options",
          formattedData,
        );
        const result: MoogShipPriceResponse = await response.json();

        // Return the full MoogShip response with legacy compatibility and duties
        return {
          success: result.success,
          options: result.options,
          bestOption: result.bestOption,
          currency: result.currency,
          duties: result.dutyCalculations || result.duties, // Prioritize dutyCalculations from enhanced backend
          // Legacy fields for backward compatibility - use the best option
          basePrice:
            result.options.length > 0 ? result.options[0].cargoPrice : 0,
          fuelCharge:
            result.options.length > 0 ? result.options[0].fuelCost : 0,
          totalPrice:
            result.options.length > 0 ? result.options[0].totalPrice : 0,
          estimatedDeliveryDays: 5, // Default delivery estimate
          carrierName:
            result.options.length > 0
              ? result.options[0].displayName
              : "MoogShip",
        };
      } catch (error) {
        return {
          success: false,
          options: [],
          currency: "USD",
          duties: null, // No duties on error
          basePrice: 0,
          fuelCharge: 0,
          totalPrice: 0,
          estimatedDeliveryDays: 5,
          carrierName: "MoogShip",
        };
      }
    },
    onSuccess: (result) => {
      setPriceResult(result);
    },
  });

  const handleInputChange = useCallback(
    (field: keyof PackageDetails, value: string | number) => {
      setPackageDetails((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Calculate volumetric and billable weights
      if (
        [
          "packageLength",
          "packageWidth",
          "packageHeight",
          "packageWeight",
        ].includes(field)
      ) {
        const updatedDetails = { ...packageDetails, [field]: value };
        const convertToNumber = (val: string | number) =>
          typeof val === "string" ? parseFloat(val) || 0 : val;

        const length = convertToNumber(updatedDetails.packageLength);
        const width = convertToNumber(updatedDetails.packageWidth);
        const height = convertToNumber(updatedDetails.packageHeight);
        const weight = convertToNumber(updatedDetails.packageWeight);

        const volWeight = (length * width * height) / 5000;
        const billWeight = Math.max(volWeight, weight);

        setVolumetricWeight(volWeight);
        setBillableWeight(billWeight);
      }
    },
    [packageDetails],
  );

  const handleCountryChange = useCallback((country: string) => {
    setPackageDetails((prev) => ({
      ...prev,
      receiverCountry: country,
    }));
  }, []);

  const handleDirectBillableWeightChange = useCallback(
    (weight: string | number) => {
      setDirectBillableWeight(weight);
    },
    [],
  );

  const toggleBillableWeightMode = useCallback(() => {
    setUseBillableWeightDirect((prev) => !prev);
  }, []);

  const validateInputs = useCallback(() => {
    const convertToNumber = (value: string | number) =>
      typeof value === "string" ? parseFloat(value) || 0 : value;

    const missingFields = [];

    // Check destination country
    if (!packageDetails.receiverCountry) {
      missingFields.push("destinationCountry");
    }

    if (useBillableWeightDirect) {
      // Direct billable weight mode - only need weight and destination
      const weight = convertToNumber(directBillableWeight);
      if (!weight || weight <= 0) {
        missingFields.push("billableWeight");
      }
    } else {
      // Dimension mode - need all dimensions and weight
      const length = convertToNumber(packageDetails.packageLength);
      const width = convertToNumber(packageDetails.packageWidth);
      const height = convertToNumber(packageDetails.packageHeight);
      const weight = convertToNumber(packageDetails.packageWeight);

      if (!length || length <= 0) missingFields.push("length");
      if (!width || width <= 0) missingFields.push("width");
      if (!height || height <= 0) missingFields.push("height");
      if (!weight || weight <= 0) missingFields.push("weight");
    }

    return missingFields;
  }, [packageDetails, directBillableWeight, useBillableWeightDirect]);

  const calculatePrice = useCallback(() => {
    // Clear previous validation error and pricing results
    setValidationError(null);
    setPriceResult(null);

    // Validate inputs
    const missingFields = validateInputs();
    if (missingFields.length > 0) {
      // Store field keys for translation in the UI
      setValidationError(missingFields.join(", "));
      return;
    }

    const finalWeight = useBillableWeightDirect
      ? typeof directBillableWeight === "string"
        ? parseFloat(directBillableWeight) || 0
        : directBillableWeight
      : typeof packageDetails.packageWeight === "string"
        ? parseFloat(packageDetails.packageWeight) || 0
        : packageDetails.packageWeight;

    // Convert all string values to numbers for API compatibility
    const convertToNumber = (value: string | number) =>
      typeof value === "string" ? parseFloat(value) || 0 : value;

    // When using direct billable weight, provide minimal dimensions to satisfy API requirements
    const requestData = useBillableWeightDirect
      ? {
          ...packageDetails,
          packageLength: convertToNumber(packageDetails.packageLength) || 1, // Fallback to 10cm if not provided
          packageWidth: convertToNumber(packageDetails.packageWidth) || 1, // Fallback to 10cm if not provided
          packageHeight: convertToNumber(packageDetails.packageHeight) || 1, // Fallback to 10cm if not provided
          packageWeight: finalWeight,
          serviceLevel: ServiceLevel.EXPRESS,
        }
      : {
          ...packageDetails,
          packageLength: convertToNumber(packageDetails.packageLength),
          packageWidth: convertToNumber(packageDetails.packageWidth),
          packageHeight: convertToNumber(packageDetails.packageHeight),
          packageWeight: finalWeight,
          serviceLevel: ServiceLevel.EXPRESS,
        };

    mutation.mutate(requestData);
  }, [
    packageDetails,
    directBillableWeight,
    useBillableWeightDirect,
    mutation,
    validateInputs,
  ]);

  return {
    packageDetails,
    directBillableWeight,
    useBillableWeightDirect,
    volumetricWeight,
    billableWeight,
    priceResult,
    validationError,
    isCalculating: mutation.isPending,
    handleInputChange,
    handleCountryChange,
    handleDirectBillableWeightChange,
    toggleBillableWeightMode,
    calculatePrice,
    setPriceResult,
    setValidationError,
    // Expose mutation for direct access if needed
    mutation,
  };
}
