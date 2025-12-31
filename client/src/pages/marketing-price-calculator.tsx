import { useState, useEffect } from "react";
// Use a simpler layout without auth components for the marketing calculator
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Check,
  ChevronsUpDown,
  X,
  HelpCircle,
  Package2,
  Truck,
  Calculator as CalculatorIcon,
  Weight,
  Ruler,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calculator, Package, ArrowRight, Loader2, Clock } from "lucide-react";
import { ServiceLevel, ServiceLevelDetails } from "@shared/schema";
import { COUNTRIES } from "@/lib/countries";
import { useTranslation } from "react-i18next";
import { SiInstagram, SiWhatsapp } from "react-icons/si";
import { MiniLanguageSwitcher } from "../components/language-switcher";
import moogshipLogoPath from "../assets/moogship-logo.jpg";
import { redirectToAuth } from "../lib/mobile-auth-redirect";

interface Country {
  name: string;
  code: string;
}

interface MoogShipPriceOption {
  id: string;
  serviceName: string;
  displayName: string;
  cargoPrice: number;
  fuelCost: number;
  totalPrice: number;
  deliveryTime: string;
  serviceType: string;
  description?: string;
}

interface MoogShipPriceResponse {
  success: boolean;
  options: MoogShipPriceOption[];
  bestOption?: string;
  currency: string;
}

interface ValidationError {
  field: string;
  message: string;
}

/**
 * Marketing Price Calculator Page
 * This is a standalone version of the price calculator that applies a 1.5x multiplier
 * Used specifically for marketing campaigns and promotions
 */
export default function MarketingPriceCalculator() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  // Force translation refresh key
  const [refreshKey, setRefreshKey] = useState(1000);

  useEffect(() => {
    const handleLanguageChange = () => {
      setRefreshKey((prev) => prev + 1000);

      // Force a complete re-render by changing the key significantly
      setTimeout(() => {
        setRefreshKey((prev) => prev + 1);
      }, 100);
    };

    i18n.on("languageChanged", handleLanguageChange);
    return () => i18n.off("languageChanged", handleLanguageChange);
  }, [i18n]);

  // Helper function to get translated country name
  const getTranslatedCountryName = (country: Country) => {
    const translationKey = `countries.${country.code}`;
    const translatedName = t(translationKey);
    // If translation exists (not the same as the key), use it; otherwise use original name
    return translatedName !== translationKey ? translatedName : country.name;
  };

  // Package details state
  const [packageDetails, setPackageDetails] = useState({
    receiverCountry: "",
    length: "",
    width: "",
    height: "",
    weight: "",
  });

  // Add selection state for pricing options
  const [selectedOption, setSelectedOption] =
    useState<MoogShipPriceOption | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // State management
  const [isCalculating, setIsCalculating] = useState(false);
  const [priceResult, setPriceResult] = useState<MoogShipPriceResponse | null>(
    null,
  );
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    [],
  );
  const [isDirectBillableWeight, setIsDirectBillableWeight] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);

  // Computed values
  const volumetricWeight =
    packageDetails.length && packageDetails.width && packageDetails.height
      ? (parseFloat(packageDetails.length) *
          parseFloat(packageDetails.width) *
          parseFloat(packageDetails.height)) /
        5000
      : null;

  const billableWeight = packageDetails.weight
    ? Math.max(parseFloat(packageDetails.weight), volumetricWeight || 0)
    : null;

  const handleServiceLevelChange = (value: ServiceLevel) => {
    // Marketing calculator doesn't use service levels
  };

  const serviceDeliveryDays = (level: ServiceLevel) => {
    const details = ServiceLevelDetails[level];
    return details ? "3-5" : "3-5";
  };

  // Calculate price function
  const calculatePrice = async () => {
    setIsCalculating(true);
    setValidationErrors([]);
    setPriceResult(null);
    setSelectedOption(null);

    try {
      // Validation
      const errors: ValidationError[] = [];

      if (!packageDetails.receiverCountry) {
        errors.push({
          field: "receiverCountry",
          message: t(
            "priceCalculator.validation.receiverCountryRequired",
            "Destination country is required",
          ),
        });
      }

      if (!isDirectBillableWeight) {
        if (!packageDetails.length)
          errors.push({
            field: "length",
            message: t(
              "priceCalculator.validation.lengthRequired",
              "Length is required",
            ),
          });
        if (!packageDetails.width)
          errors.push({
            field: "width",
            message: t(
              "priceCalculator.validation.widthRequired",
              "Width is required",
            ),
          });
        if (!packageDetails.height)
          errors.push({
            field: "height",
            message: t(
              "priceCalculator.validation.heightRequired",
              "Height is required",
            ),
          });
        if (!packageDetails.weight)
          errors.push({
            field: "weight",
            message: t(
              "priceCalculator.validation.weightRequired",
              "Weight is required",
            ),
          });
      } else {
        if (!packageDetails.weight)
          errors.push({
            field: "weight",
            message: t(
              "priceCalculator.validation.billableWeightRequired",
              "Billable weight is required",
            ),
          });
      }

      if (errors.length > 0) {
        setValidationErrors(errors);
        setIsCalculating(false);
        return;
      }

      // Prepare API request data with correct parameter names
      const requestData = {
        receiverCountry: packageDetails.receiverCountry,
        ...(isDirectBillableWeight
          ? {
              // For direct billable weight, provide fallback dimensions
              packageLength: 1,
              packageWidth: 1,
              packageHeight: 1,
              packageWeight: parseFloat(packageDetails.weight),
            }
          : {
              packageLength: parseFloat(packageDetails.length),
              packageWidth: parseFloat(packageDetails.width),
              packageHeight: parseFloat(packageDetails.height),
              packageWeight: parseFloat(packageDetails.weight),
            }),
      };

      const response = await fetch("/api/pricing/moogship-options-public", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
        credentials: "include",
      });

      if (response.ok) {
        const result: MoogShipPriceResponse = await response.json();

        if (result.success && result.options) {
          // EXTREME DEDUPLICATION: Remove exact duplicates and force unique display names
          const seenDisplayNames = new Set();
          const uniqueOptions = result.options
            .filter((option, index) => {
              const key = `${option.displayName}_${option.totalPrice}_${option.serviceType}`;
              if (seenDisplayNames.has(key)) {
                return false;
              }
              seenDisplayNames.add(key);
              return true;
            })
            .map((option, index) => ({
              ...option,
              uniqueInternalId: `UNIQUE_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              // Keep original display name without adding service type suffix
              displayName: option.displayName,
            }));

          // Apply marketing multiplier (1.5x) to all prices with proper validation
          const marketingResult: MoogShipPriceResponse = {
            ...result,
            options: uniqueOptions.map((option) => {
              // Validate numeric values before applying multiplier
              const cargoPrice =
                typeof option.cargoPrice === "number" &&
                !isNaN(option.cargoPrice)
                  ? option.cargoPrice
                  : 0;
              const fuelCost =
                typeof option.fuelCost === "number" && !isNaN(option.fuelCost)
                  ? option.fuelCost
                  : 0;
              const totalPrice =
                typeof option.totalPrice === "number" &&
                !isNaN(option.totalPrice)
                  ? option.totalPrice
                  : 0;

              return {
                ...option,
                cargoPrice: Math.round(cargoPrice * 1.5),
                fuelCost: Math.round(fuelCost * 1.5),
                totalPrice: Math.round(totalPrice * 1.5),
              };
            }),
          };
          setPriceResult(marketingResult);
          // Clear any previous selection when new results load
          setSelectedOption(null);
          setSelectedOptionId(null);
        } else {
          // Fallback with error message
          const fallbackResult: MoogShipPriceResponse = {
            success: false,
            options: [],
            currency: "USD",
          };
          setPriceResult(fallbackResult);
          // Clear selection on error
          setSelectedOption(null);

          toast({
            title: t("priceCalculator.error.title", "Pricing Error"),
            description: t(
              "priceCalculator.error.description",
              "Unable to calculate shipping price. Please try again.",
            ),
            variant: "destructive",
          });
        }
      } else {
        throw new Error("Failed to fetch pricing");
      }
    } catch (error) {
      toast({
        title: t("priceCalculator.error.title", "Pricing Error"),
        description: t(
          "priceCalculator.error.description",
          "Unable to calculate shipping price. Please try again.",
        ),
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center">
              <button
                onClick={() => (window.location.href = "/")}
                className="flex items-center"
              >
                <img
                  src={moogshipLogoPath}
                  alt="MoogShip Logo"
                  className="h-10 w-auto"
                />
              </button>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => {
                    window.location.href = "/";
                    setTimeout(() => {
                      document
                        .getElementById("features")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }}
                  className="inline-block py-2 px-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  {t("marketing.navigation.features", "Features")}
                </button>
                <button
                  onClick={() => {
                    window.location.href = "/";
                    setTimeout(() => {
                      document
                        .getElementById("benefits")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }}
                  className="inline-block py-2 px-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  {t("marketing.navigation.benefits", "Benefits")}
                </button>
                <button
                  onClick={() =>
                    (window.location.href = "/marketing-price-calculator")
                  }
                  className="inline-block py-2 px-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  Fiyat Al
                </button>
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => {
                    const phoneNumber = "905407447911";
                    const message =
                      "Merhaba, kargo hesaplama hakkında bilgi almak istiyorum.";
                    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, "_blank");
                  }}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 text-green-600 border-green-200 hover:bg-green-600 hover:text-white transition-colors"
                >
                  <SiWhatsapp className="h-5 w-5" />
                </Button>

                <MiniLanguageSwitcher />

                <Button
                  onClick={() => redirectToAuth()}
                  variant="outline"
                  className="gap-2 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 inline-flex items-center justify-center h-10 px-4 py-2 rounded-md border border-blue-600 hover:bg-blue-600 hover:text-white transition-colors text-[#2563eb] bg-[#ffffff]"
                >
                  {t("marketing.navigation.login", "Login")}
                </Button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-2">
              <Button
                onClick={() => {
                  const phoneNumber = "905407447911";
                  const message =
                    "Merhaba, kargo hesaplama hakkında bilgi almak istiyorum.";
                  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                  window.open(whatsappUrl, "_blank");
                }}
                variant="outline"
                size="icon"
                className="h-8 w-8 text-green-600 border-green-200 hover:bg-green-600 hover:text-white"
              >
                <SiWhatsapp className="h-4 w-4" />
              </Button>
              <MiniLanguageSwitcher />
              <button className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
                <span className="sr-only">Open main menu</span>
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </nav>
        </div>
      </header>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
            dangerouslySetInnerHTML={{
              __html: t(
                "marketing.hero.title",
                "Calculate Your Shipping Costs",
              ),
            }}
          ></h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            {t(
              "marketing.hero.subtitle",
              "Get instant shipping quotes for international packages. Compare rates and choose the best option for your needs.",
            )}
          </p>
        </div>

        {/* Calculator Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calculator Card - Takes up 2/3 of the space on large screens */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                  <Calculator className="w-6 h-6 mr-3 text-blue-600" />
                  {t("priceCalculator.title")}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-5 h-5 ml-2 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm p-3">
                        <div className="space-y-2 text-sm">
                          <p className="font-medium">
                            {t(
                              "priceCalculator.help.title",
                              "Shipping Guidelines:",
                            )}
                          </p>
                          <ul className="space-y-1 text-gray-600">
                            <li>
                              •{" "}
                              {t(
                                "priceCalculator.help.ups",
                                'UPS: Max 150 lbs, 165" length + girth',
                              )}
                            </li>
                            <li>
                              •{" "}
                              {t(
                                "priceCalculator.help.girth",
                                "Girth = 2×(Width + Height)",
                              )}
                            </li>
                            <li>
                              •{" "}
                              {t(
                                "priceCalculator.help.volumetric",
                                "Volumetric Weight = L×W×H÷5000",
                              )}
                            </li>
                            <li>
                              •{" "}
                              {t(
                                "priceCalculator.help.customs",
                                "Customs forms required for international",
                              )}
                            </li>
                            <li>
                              •{" "}
                              {t(
                                "priceCalculator.help.service",
                                "Express = 1-3 days, Standard = 3-7 days",
                              )}
                            </li>
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
                <CardDescription>
                  {t("priceCalculator.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Input Mode Toggle */}
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Switch
                      id="input-mode"
                      checked={isDirectBillableWeight}
                      onCheckedChange={setIsDirectBillableWeight}
                    />
                    <Label htmlFor="input-mode" className="text-sm font-medium">
                      {t(
                        "priceCalculator.directBillableWeight",
                        "I know the billable weight (kg)",
                      )}
                    </Label>
                  </div>

                  {/* Input Fields */}
                  <div className="space-y-4">
                    {!isDirectBillableWeight ? (
                      <>
                        {/* Package Details Header */}
                        <div className="border-b pb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {t("priceCalculator.packageDetails")}
                          </h3>
                        </div>

                        {/* Package Measurements Grid - 5 columns on large screens */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                          {/* Destination Country - takes 2 columns on medium screens */}
                          <div className="md:col-span-2 lg:col-span-1">
                            <Label htmlFor="receiverCountry">
                              {t("priceCalculator.receiverCountry")}
                            </Label>
                            <Popover
                              open={countryOpen}
                              onOpenChange={setCountryOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={countryOpen}
                                  className="w-full h-10 justify-between"
                                >
                                  {packageDetails.receiverCountry
                                    ? (() => {
                                        const country = COUNTRIES.find(
                                          (country: Country) =>
                                            country.code ===
                                            packageDetails.receiverCountry,
                                        );
                                        return country
                                          ? getTranslatedCountryName(country)
                                          : "";
                                      })()
                                    : t(
                                        "priceCalculator.selectCountry",
                                        "Select country...",
                                      )}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0">
                                <Command>
                                  <CommandInput
                                    placeholder={t(
                                      "priceCalculator.searchCountry",
                                      "Search country...",
                                    )}
                                  />
                                  <CommandEmpty>
                                    {t(
                                      "priceCalculator.noCountryFound",
                                      "No country found.",
                                    )}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    <CommandList className="max-h-64 overflow-y-auto">
                                      {COUNTRIES.map((country: Country) => (
                                        <CommandItem
                                          key={country.code}
                                          value={getTranslatedCountryName(
                                            country,
                                          )}
                                          onSelect={() => {
                                            setPackageDetails((prev) => ({
                                              ...prev,
                                              receiverCountry: country.code,
                                            }));
                                            setCountryOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              packageDetails.receiverCountry ===
                                              country.code
                                                ? "opacity-100"
                                                : "opacity-0"
                                            }`}
                                          />
                                          {getTranslatedCountryName(country)}
                                        </CommandItem>
                                      ))}
                                    </CommandList>
                                  </CommandGroup>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Length */}
                          <div>
                            <Label htmlFor="length">
                              {t("priceCalculator.length")} (cm)
                            </Label>
                            <Input
                              id="length"
                              type="text"
                              pattern="^\d*\.?\d*$"
                              value={packageDetails.length}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*\.?\d*$/.test(value)) {
                                  setPackageDetails((prev) => ({
                                    ...prev,
                                    length: value,
                                  }));
                                }
                              }}
                              placeholder="0"
                              className="h-10"
                            />
                          </div>

                          {/* Width */}
                          <div>
                            <Label htmlFor="width">
                              {t("priceCalculator.width")} (cm)
                            </Label>
                            <Input
                              id="width"
                              type="text"
                              pattern="^\d*\.?\d*$"
                              value={packageDetails.width}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*\.?\d*$/.test(value)) {
                                  setPackageDetails((prev) => ({
                                    ...prev,
                                    width: value,
                                  }));
                                }
                              }}
                              placeholder="0"
                              className="h-10"
                            />
                          </div>

                          {/* Height */}
                          <div>
                            <Label htmlFor="height">
                              {t("priceCalculator.height")} (cm)
                            </Label>
                            <Input
                              id="height"
                              type="text"
                              pattern="^\d*\.?\d*$"
                              value={packageDetails.height}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*\.?\d*$/.test(value)) {
                                  setPackageDetails((prev) => ({
                                    ...prev,
                                    height: value,
                                  }));
                                }
                              }}
                              placeholder="0"
                              className="h-10"
                            />
                          </div>

                          {/* Weight */}
                          <div>
                            <Label htmlFor="weight">
                              {t("priceCalculator.weight")} (kg)
                            </Label>
                            <Input
                              id="weight"
                              type="text"
                              pattern="^\d*\.?\d*$"
                              value={packageDetails.weight}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*\.?\d*$/.test(value)) {
                                  setPackageDetails((prev) => ({
                                    ...prev,
                                    weight: value,
                                  }));
                                }
                              }}
                              placeholder="0"
                              className="h-10"
                            />
                          </div>
                        </div>

                        {/* Weight Information Display */}
                        {(volumetricWeight !== null ||
                          billableWeight !== null) && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              {/* Actual Weight */}
                              <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                                    <Weight className="h-3 w-3 text-white" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-green-700 font-medium">
                                      Gerçek Ağırlık:
                                    </p>
                                    <p className="text-sm font-bold text-green-800">
                                      {packageDetails.weight
                                        ? `${packageDetails.weight} kg`
                                        : "-"}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Volumetric Weight */}
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                                    <Package2 className="h-3 w-3 text-white" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-blue-700 font-medium">
                                      Hacimsel Ağırlık:
                                    </p>
                                    <p className="text-sm font-bold text-blue-800">
                                      {volumetricWeight
                                        ? `${volumetricWeight.toFixed(2)} kg`
                                        : "0.26 kg"}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Billable Weight */}
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center">
                                    <CalculatorIcon className="h-3 w-3 text-white" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-purple-700 font-medium">
                                      Faturalandırılabilir Ağırlık:
                                    </p>
                                    <p className="text-base font-bold text-purple-800">
                                      {billableWeight
                                        ? `${billableWeight.toFixed(2)} kg`
                                        : "0.26 kg"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Help Text */}
                            <div className="flex justify-center mt-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                                      <svg
                                        className="w-3 h-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                      Ağırlık hesaplama detayları
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm p-3">
                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <span className="font-medium text-green-700">
                                          Gerçek Ağırlık:
                                        </span>{" "}
                                        Paketinizin tartıda gösterdiği ağırlık
                                      </div>
                                      <div>
                                        <span className="font-medium text-blue-700">
                                          Hacimsel Ağırlık:
                                        </span>{" "}
                                        U × G × Y ÷ 5000
                                        {packageDetails.length &&
                                          packageDetails.width &&
                                          packageDetails.height && (
                                            <div className="text-gray-600 mt-1">
                                              {packageDetails.length} ×{" "}
                                              {packageDetails.width} ×{" "}
                                              {packageDetails.height} ÷ 5000 ={" "}
                                              {volumetricWeight?.toFixed(2)} kg
                                            </div>
                                          )}
                                      </div>
                                      <div>
                                        <span className="font-medium text-purple-700">
                                          Faturalandırılabilir Ağırlık:
                                        </span>{" "}
                                        Gerçek ağırlık ve hacimsel ağırlığın
                                        yüksek olanı
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      // Show direct billable weight input field with destination
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Destination Country */}
                        <div>
                          <Label htmlFor="receiverCountry">
                            {t("priceCalculator.receiverCountry")}
                          </Label>
                          <Popover
                            open={countryOpen}
                            onOpenChange={setCountryOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={countryOpen}
                                className="w-full h-10 justify-between"
                              >
                                {packageDetails.receiverCountry
                                  ? (() => {
                                      const country = COUNTRIES.find(
                                        (country: Country) =>
                                          country.code ===
                                          packageDetails.receiverCountry,
                                      );
                                      return country
                                        ? getTranslatedCountryName(country)
                                        : "";
                                    })()
                                  : t(
                                      "priceCalculator.selectCountry",
                                      "Select country...",
                                    )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command>
                                <CommandInput
                                  placeholder={t(
                                    "priceCalculator.searchCountry",
                                    "Search country...",
                                  )}
                                />
                                <CommandEmpty>
                                  {t(
                                    "priceCalculator.noCountryFound",
                                    "No country found.",
                                  )}
                                </CommandEmpty>
                                <CommandGroup>
                                  <CommandList className="max-h-64 overflow-y-auto">
                                    {COUNTRIES.map((country: Country) => (
                                      <CommandItem
                                        key={country.code}
                                        value={getTranslatedCountryName(
                                          country,
                                        )}
                                        onSelect={() => {
                                          setPackageDetails((prev) => ({
                                            ...prev,
                                            receiverCountry: country.code,
                                          }));
                                          setCountryOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            packageDetails.receiverCountry ===
                                            country.code
                                              ? "opacity-100"
                                              : "opacity-0"
                                          }`}
                                        />
                                        {getTranslatedCountryName(country)}
                                      </CommandItem>
                                    ))}
                                  </CommandList>
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        {/* Billable Weight */}
                        <div>
                          <Label htmlFor="weight">
                            {t("priceCalculator.billableWeight")} (kg)
                          </Label>
                          <Input
                            id="weight"
                            type="text"
                            pattern="^\d*\.?\d*$"
                            value={packageDetails.weight}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^\d*\.?\d*$/.test(value)) {
                                setPackageDetails((prev) => ({
                                  ...prev,
                                  weight: value,
                                }));
                              }
                            }}
                            placeholder="0"
                            className="h-10"
                          />
                        </div>
                      </div>
                    )}

                    {/* MoogShip Pricing Options - Using same design as main calculator */}
                    {priceResult &&
                      priceResult.success &&
                      priceResult.options && (
                        <div className="mt-6 space-y-3">
                          <div className="text-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                              {t(
                                "priceCalculator.chooseService",
                                "MoogShip Servisinizi Seçin",
                              )}
                            </h3>
                            <p className="text-xs text-gray-600">
                              {t(
                                "priceCalculator.selectBestOption",
                                "İhtiyaçlarınıza en uygun kargo seçeneğini belirleyin",
                              )}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {priceResult.options.map(
                              (option: any, index: number) => {
                                // Detect service type from display name - use correct backend data
                                const displayName =
                                  option.displayName.toLowerCase();
                                const isEco = displayName.includes("eco");
                                const isExpress =
                                  displayName.includes("express");
                                const isUPS = displayName.includes("ups");
                                const isDHL = displayName.includes("dhl");
                                const isFedEx = displayName.includes("fedex");
                                const isGLS = displayName.includes("gls");
                                const isWidect =
                                  displayName.includes("standard") &&
                                  !isExpress;

                                let badgeColor = "bg-blue-100 text-blue-800";
                                let borderColor =
                                  "border-gray-200 hover:border-blue-300";
                                let bgGradient = "bg-white hover:bg-gray-50";

                                if (isEco) {
                                  badgeColor = "bg-green-100 text-green-800";
                                  borderColor =
                                    "border-green-200 hover:border-green-300";
                                  bgGradient =
                                    "bg-gradient-to-r from-green-50 to-white hover:from-green-100 hover:to-gray-50";
                                } else if (isExpress) {
                                  badgeColor = "bg-orange-100 text-orange-800";
                                  borderColor =
                                    "border-orange-200 hover:border-orange-300";
                                  bgGradient =
                                    "bg-gradient-to-r from-orange-50 to-white hover:from-orange-100 hover:to-gray-50";
                                } else if (isUPS) {
                                  badgeColor = "bg-yellow-100 text-yellow-800";
                                  borderColor =
                                    "border-yellow-200 hover:border-yellow-300";
                                  bgGradient =
                                    "bg-gradient-to-r from-yellow-50 to-white hover:from-yellow-100 hover:to-gray-50";
                                } else if (isDHL) {
                                  badgeColor = "bg-red-100 text-red-800";
                                  borderColor =
                                    "border-red-200 hover:border-red-300";
                                  bgGradient =
                                    "bg-gradient-to-r from-red-50 to-white hover:from-red-100 hover:to-gray-50";
                                } else if (isFedEx) {
                                  badgeColor = "bg-purple-100 text-purple-800";
                                  borderColor =
                                    "border-purple-200 hover:border-purple-300";
                                  bgGradient =
                                    "bg-gradient-to-r from-purple-50 to-white hover:from-purple-100 hover:to-gray-50";
                                } else if (isGLS) {
                                  badgeColor = "bg-indigo-100 text-indigo-800";
                                  borderColor =
                                    "border-indigo-200 hover:border-indigo-300";
                                  bgGradient =
                                    "bg-gradient-to-r from-indigo-50 to-white hover:from-indigo-100 hover:to-gray-50";
                                } else if (isWidect) {
                                  badgeColor = "bg-blue-100 text-blue-800";
                                  borderColor =
                                    "border-blue-200 hover:border-blue-300";
                                  bgGradient =
                                    "bg-gradient-to-r from-blue-50 to-white hover:from-blue-100 hover:to-gray-50";
                                }

                                // Use the new unique internal ID to prevent any conflicts
                                const uniqueOptionId =
                                  option.uniqueInternalId ||
                                  `${option.id}_${index}_${option.displayName.replace(/\s+/g, "_")}`;
                                const isSelected =
                                  selectedOptionId === uniqueOptionId;

                                return (
                                  <div
                                    key={option.uniqueInternalId}
                                    data-option-id={option.uniqueInternalId}
                                    data-selected={isSelected}
                                    onClick={() => {
                                      const uniqueId =
                                        option.uniqueInternalId ||
                                        `${option.id}_${index}_${option.displayName.replace(/\s+/g, "_")}`;
                                      setSelectedOption(option);
                                      setSelectedOptionId(uniqueId);
                                    }}
                                    className={`relative border-2 rounded-lg p-3 transition-all duration-200 cursor-pointer ${borderColor} ${bgGradient} ${
                                      isSelected
                                        ? "border-blue-500 bg-blue-50 shadow-lg scale-105 z-10"
                                        : "hover:shadow-md"
                                    }`}
                                  >
                                    {/* Service type badge */}
                                    <div className="absolute top-2 right-2 z-10">
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
                                                  : isGLS
                                                    ? "GLS"
                                                    : isWidect
                                                      ? "Standard"
                                                      : "Standard"}
                                      </span>
                                    </div>
                                    <div className="pr-14">
                                      {/* Service Name */}
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-sm font-bold text-gray-900">
                                          {option.displayName}
                                        </h4>
                                      </div>
                                      <div className="flex items-center gap-1 mb-2">
                                        <svg
                                          className="w-3 h-3 text-gray-500"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                          />
                                        </svg>
                                        <p className="text-xs text-gray-700">
                                          {option.deliveryTime}
                                        </p>
                                      </div>
                                    </div>
                                    {/* Price section */}
                                    <div className="border-t pt-2 mt-2">
                                      <div className="flex items-end justify-between">
                                        <div>
                                          <p className="text-xs text-gray-600 mb-0.5">
                                            {t(
                                              "priceCalculator.totalPrice",
                                              "Total Price",
                                            )}
                                          </p>
                                          <p className="text-lg font-bold text-primary">
                                            $
                                            {typeof option.totalPrice ===
                                              "number" &&
                                            !isNaN(option.totalPrice)
                                              ? (
                                                  option.totalPrice / 100
                                                ).toFixed(2)
                                              : "0.00"}
                                          </p>
                                        </div>
                                        <div className="text-right text-xs text-gray-500">
                                          <p>
                                            {t("priceCalculator.base", "Base")}:
                                            $
                                            {typeof option.cargoPrice ===
                                              "number" &&
                                            !isNaN(option.cargoPrice)
                                              ? (
                                                  option.cargoPrice / 100
                                                ).toFixed(2)
                                              : "0.00"}
                                          </p>
                                          <p>
                                            {t("priceCalculator.fuel", "Fuel")}:
                                            $
                                            {typeof option.fuelCost ===
                                              "number" &&
                                            !isNaN(option.fuelCost)
                                              ? (option.fuelCost / 100).toFixed(
                                                  2,
                                                )
                                              : "0.00"}
                                          </p>
                                          {option.additionalFee && option.additionalFee > 0 && (
                                            <p>
                                              {t("priceCalculator.additionalFee", "Additional Fee")}:
                                              $
                                              {(option.additionalFee / 100).toFixed(2)}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {/* Selection indicator - matches regular calculator */}
                                    {isSelected && (
                                      <div className="absolute top-2 left-2">
                                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-blue-500">
                                          <Check className="h-4 w-4 text-blue-500" />
                                        </div>
                                      </div>
                                    )}

                                    {/* Hover indicator border - matches regular calculator */}
                                    <div className="absolute inset-0 rounded-lg border-2 border-transparent hover:border-primary/50 transition-colors pointer-events-none"></div>
                                  </div>
                                );
                              },
                            )}
                          </div>

                          {/* Shipping route information - same as main calculator */}
                          <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <div className="flex items-start gap-2">
                              <svg
                                className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              <div className="text-xs text-blue-800">
                                <h4 className="font-semibold mb-1">
                                  {t(
                                    "priceCalculator.shippingRouteDetails",
                                    "Shipping Route Details",
                                  )}
                                </h4>
                                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                                  <p>
                                    <span className="font-medium">
                                      {t("priceCalculator.origin", "Origin")}:
                                    </span>{" "}
                                    {t("countries.TR", "Turkey")}
                                  </p>
                                  <p>
                                    <span className="font-medium">
                                      {t(
                                        "priceCalculator.destination",
                                        "Destination",
                                      )}
                                      :
                                    </span>{" "}
                                    {packageDetails.receiverCountry
                                      ? (() => {
                                          const country = COUNTRIES.find(
                                            (c: Country) =>
                                              c.code ===
                                              packageDetails.receiverCountry,
                                          );
                                          return country
                                            ? getTranslatedCountryName(country)
                                            : "";
                                        })()
                                      : t("countries.US", "United States")}
                                  </p>
                                  {((billableWeight && billableWeight > 0) ||
                                    (isDirectBillableWeight &&
                                      parseFloat(packageDetails.weight) >
                                        0)) && (
                                    <p>
                                      <span className="font-medium">
                                        {t(
                                          "priceCalculator.billableWeightLabel",
                                          "Billable Weight",
                                        )}
                                        :
                                      </span>{" "}
                                      {billableWeight && billableWeight > 0
                                        ? billableWeight.toFixed(2)
                                        : parseFloat(
                                            packageDetails.weight,
                                          ).toFixed(2)}{" "}
                                      kg
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Marketing Note - Only shown on this version */}
                          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
                            <p className="font-medium mb-1">
                              {t(
                                "marketing.calculator.note.title",
                                "Pazarlama Notu:",
                              )}
                            </p>
                            <p>
                              {t(
                                "marketing.calculator.note.description",
                                "Bu ön tahmindir. Kayıt olduğunuzda gerçek nakliye fiyatları daha düşük olabilir. Özel üye oranlarımıza erişmek için kaydolun!",
                              )}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-4 flex flex-col sm:flex-row gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setPriceResult(null);
                                setValidationErrors([]);
                                setSelectedOption(null);
                              }}
                              className="flex-1"
                            >
                              {t("priceCalculator.calculateAnother")}
                            </Button>
                            <Button
                              className="flex-1"
                              onClick={() => redirectToAuth()}
                            >
                              {t(
                                "marketing.calculator.benefits.signupButton",
                                "Sign Up for Member Rates",
                              )}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </CardContent>
              {/* Only show calculate button if no price results are displayed */}
              {!priceResult && (
                <CardFooter className="flex justify-end">
                  <Button
                    onClick={calculatePrice}
                    disabled={isCalculating}
                    className="px-6"
                  >
                    {isCalculating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("priceCalculator.calculating")}
                      </>
                    ) : (
                      <>
                        <Calculator className="mr-2 h-4 w-4" />
                        {t("priceCalculator.calculatePrice")}
                      </>
                    )}
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>

          {/* Important Note Card - Takes up 1/3 of the space on large screens */}
          <Card key={`benefits-card-${refreshKey}`}>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-blue-600 flex items-center">
                <HelpCircle className="w-5 h-5 mr-2" />
                {i18n.language === "tr"
                  ? "Neden MoogShip'i Seçmelisiniz?"
                  : "Why Choose MoogShip?"}
              </CardTitle>
              <CardDescription>
                {i18n.language === "tr"
                  ? "Bizi farklı kılan şeyi görün"
                  : "See what makes us different"}
              </CardDescription>
            </CardHeader>
            <CardContent key={`benefits-content-${refreshKey}`}>
              <div className="space-y-4">
                {/* Marketing Benefits */}
                <div
                  key={`exclusive-${refreshKey}`}
                  className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg"
                >
                  <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                    <Package className="w-4 h-4 mr-2" />
                    {i18n.language === "tr"
                      ? "Özel Oranlar"
                      : "Exclusive Rates"}
                  </h4>
                  <p className="text-sm text-green-700">
                    {i18n.language === "tr"
                      ? "Taşıyıcı ortaklıklarımızla %40'a kadar tasarruf edin"
                      : "Save up to 40% with our carrier partnerships"}
                  </p>
                </div>

                <div
                  key={`global-${refreshKey}`}
                  className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg"
                >
                  <h4 className="font-semibold text-purple-800 mb-2 flex items-center">
                    <Truck className="w-4 h-4 mr-2" />
                    {i18n.language === "tr"
                      ? "Küresel Kapsama"
                      : "Global Coverage"}
                  </h4>
                  <p className="text-sm text-purple-700">
                    {i18n.language === "tr"
                      ? "190+ ülkeye güvenilir taşıyıcılarla kargo gönderin"
                      : "Ship to 190+ countries with trusted carriers"}
                  </p>
                </div>

                <div
                  key={`instant-${refreshKey}`}
                  className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg"
                >
                  <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
                    <CalculatorIcon className="w-4 h-4 mr-2" />
                    {i18n.language === "tr"
                      ? "Anında Teklifler"
                      : "Instant Quotes"}
                  </h4>
                  <p className="text-sm text-yellow-700">
                    {i18n.language === "tr"
                      ? "Saniyeler içinde doğru fiyatlandırma alın"
                      : "Get accurate pricing in seconds"}
                  </p>
                </div>

                <div
                  key={`pricing-${refreshKey}`}
                  className="pt-4 border-t border-gray-200"
                >
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">
                      {i18n.language === "tr"
                        ? "Fiyatlandırma Bildirimi"
                        : "Pricing Notice"}
                    </h4>
                    <p className="text-sm text-blue-700 mb-3">
                      {i18n.language === "tr"
                        ? "Gösterilen fiyatlar tahminidir. Gerçek üye oranlarımıza erişim için kayıt olun!"
                        : "Prices shown are estimates. Register to access our actual member rates!"}
                    </p>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => redirectToAuth()}
                    >
                      {i18n.language === "tr"
                        ? "Üye Oranları için Kayıt Ol"
                        : "Sign Up for Member Rates"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mt-4 space-y-2">
            {validationErrors.map((error, index) => (
              <Alert key={index} variant="destructive">
                <AlertDescription className="flex justify-between items-center">
                  <span>{error.message}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setValidationErrors((prev) =>
                        prev.filter((_, i) => i !== index),
                      );
                    }}
                    className="h-auto p-1 hover:bg-transparent"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </div>
      {/* CTA Section */}
      <section id="pricing" className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            {t("marketing.cta.title", "Ready to Reduce Your Shipping Costs?")}
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto">
            {t(
              "marketing.cta.subtitle",
              "Join Amazon, Etsy, Walmart, and Wayfair sellers who save on every shipment with MoogShip's exclusive rates.",
            )}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <span
              onClick={() => redirectToAuth()}
              className="inline-block bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg font-medium rounded-lg transition-colors cursor-pointer"
            >
              {t("marketing.cta.getStarted", "Get Started")}
            </span>
            <span
              onClick={() =>
                (window.location.href = "/marketing-price-calculator")
              }
              className="inline-block border border-blue-300 bg-blue-500 text-white hover:bg-blue-400 px-8 py-3 text-lg font-medium rounded-lg transition-colors cursor-pointer"
            >
              {t("marketing.cta.getQuote", "Get a Rate Quote")}
            </span>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <img
                  src={moogshipLogoPath}
                  alt="MoogShip"
                  className="h-8 w-auto mr-3 cursor-pointer"
                  onClick={() => (window.location.href = "/")}
                />
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                {t(
                  "marketing.footer.description",
                  "Your trusted partner for global shipping solutions. Connect sellers worldwide with affordable, reliable shipping.",
                )}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() =>
                    window.open("https://instagram.com/moogship", "_blank")
                  }
                  className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200"
                >
                  <SiInstagram className="h-5 w-5 text-white" />
                  <span className="sr-only">Instagram</span>
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">
                {t("marketing.footer.companyTitle", "Company")}
              </h3>
              <ul className="space-y-2">
                {(() => {
                  const links = t("marketing.footer.companyLinks", {
                    returnObjects: true,
                    defaultValue: ["About Us", "Our Team", "Careers"],
                  });
                  const linkArray = Array.isArray(links)
                    ? links
                    : ["About Us", "Our Team", "Careers"];
                  return linkArray.map((item: string, index: number) => (
                    <li key={`company-${index}`}>
                      <span
                        onClick={() => (window.location.href = "/about")}
                        className="text-gray-400 hover:text-white cursor-pointer"
                      >
                        {item}
                      </span>
                    </li>
                  ));
                })()}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">
                {t("marketing.footer.servicesTitle", "Services")}
              </h3>
              <ul className="space-y-2">
                {(() => {
                  const links = t("marketing.footer.serviceLinks", {
                    returnObjects: true,
                    defaultValue: ["Global Shipping", "Tracking", "Support"],
                  });
                  const linkArray = Array.isArray(links)
                    ? links
                    : ["Global Shipping", "Tracking", "Support"];
                  return linkArray.map((item: string, index: number) => (
                    <li key={`service-${index}`}>
                      <span
                        onClick={() => (window.location.href = "/services")}
                        className="text-gray-400 hover:text-white cursor-pointer"
                      >
                        {item}
                      </span>
                    </li>
                  ));
                })()}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">
                {t("marketing.footer.contactOffices", "Contact & Offices")}
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">
                    🇺🇸 United States
                  </h4>
                  <div className="text-gray-400 text-sm space-y-1">
                    <p>6825 176th Ave NE Ste 135</p>
                    <p>Redmond, WA 98052</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">
                    🇹🇷 Turkiye
                  </h4>
                  <div className="text-gray-400 text-sm space-y-1">
                    <p>
                      HALİL RIFAT PAŞA MAH. YÜZER HAVUZ SK. PERPA TİC MER B BLOK
                      NO: 1/1 İÇ KAPI NO: 159
                    </p>
                    <p>İstanbul, Turkiye 34384</p>
                    <p>+90 540 744 79 11</p>
                    <p>info@moogship.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              &copy; 2025{" "}
              <span className="bg-gradient-to-r from-blue-300 to-blue-100 bg-clip-text text-transparent">
                MoogShip
              </span>
              .{" "}
              {t("marketing.footer.allRightsReserved", "All rights reserved.")}
            </p>
            <div className="mt-4 md:mt-0 flex space-x-4">
              <span
                onClick={() => (window.location.href = "/legal/terms")}
                className="text-gray-400 hover:text-white text-sm cursor-pointer"
              >
                {t("marketing.footer.terms", "Terms")}
              </span>
              <span
                onClick={() => (window.location.href = "/legal/privacy")}
                className="text-gray-400 hover:text-white text-sm cursor-pointer"
              >
                {t("marketing.footer.privacy", "Privacy")}
              </span>
              <span
                onClick={() => (window.location.href = "/legal/cookies")}
                className="text-gray-400 hover:text-white text-sm cursor-pointer"
              >
                {t("marketing.footer.cookies", "Cookies")}
              </span>
            </div>
          </div>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}
