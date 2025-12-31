import { useState } from "react";
import Layout from "@/components/layout";
import { withAuth } from "@/lib/with-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Download, RefreshCw, Package } from "lucide-react";
import * as XLSX from 'xlsx';

interface PriceData {
  volumetricWeight: number;
  basePrice: number;
  fuelCharge: number;
  totalPrice: number;
  finalPrice: number;
}

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "RU", name: "Russia" },
  { code: "KR", name: "South Korea" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "EG", name: "Egypt" },
  { code: "ZA", name: "South Africa" },
];

interface AdminPriceFetcherProps {
  user: any;
}

function AdminPriceFetcher({ user }: AdminPriceFetcherProps) {
  const { toast } = useToast();
  
  const [selectedCountry, setSelectedCountry] = useState("");
  const [multiplier, setMultiplier] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [priceData, setPriceData] = useState<PriceData[]>([]);

  const generateVolumetricWeights = () => {
    const weights = [];
    for (let i = 0.5; i <= 15; i += 0.5) {
      weights.push(Number(i.toFixed(1)));
    }
    return weights;
  };

  const fetchPricesForWeight = async (weight: number, countryCode: string): Promise<PriceData | null> => {
    try {
      const response = await fetch('/api/admin/fetch-shipping-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session authentication
        body: JSON.stringify({
          volumetricWeight: weight,
          countryCode: countryCode,
          priceMultiplier: parseFloat(multiplier),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch price for weight ${weight}kg`);
      }

      const data = await response.json();
      return {
        volumetricWeight: weight,
        basePrice: data.basePrice || 0,
        fuelCharge: data.fuelCharge || 0,
        totalPrice: data.totalPrice || 0,
        finalPrice: data.totalPrice || 0, // Already includes multiplier from API
      };
    } catch (error) {
      console.error(`Error fetching price for weight ${weight}kg:`, error);
      return null;
    }
  };

  const handleFetchPrices = async () => {
    if (!selectedCountry) {
      toast({
        title: "Error",
        description: "Please select a country first",
        variant: "destructive",
      });
      return;
    }

    if (!multiplier || isNaN(parseFloat(multiplier))) {
      toast({
        title: "Error",
        description: "Please enter a valid multiplier",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setPriceData([]);

    const weights = generateVolumetricWeights();
    const results: PriceData[] = [];

    for (let i = 0; i < weights.length; i++) {
      const weight = weights[i];
      const priceInfo = await fetchPricesForWeight(weight, selectedCountry);
      
      if (priceInfo) {
        results.push(priceInfo);
      }

      // Update progress
      const progressPercentage = ((i + 1) / weights.length) * 100;
      setProgress(progressPercentage);

      // Small delay to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setPriceData(results);
    setIsLoading(false);

    if (results.length > 0) {
      toast({
        title: "Success",
        description: `Fetched prices for ${results.length} weight categories`,
      });
    } else {
      toast({
        title: "Warning",
        description: "No price data could be fetched. Check your API configuration.",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = () => {
    if (priceData.length === 0) {
      toast({
        title: "Error",
        description: "No data to export",
        variant: "destructive",
      });
      return;
    }

    const selectedCountryName = COUNTRIES.find(c => c.code === selectedCountry)?.name || selectedCountry;
    
    const exportData = priceData.map(item => ({
      "Volumetric Weight (kg)": item.volumetricWeight,
      "Base Price": item.basePrice,
      "Fuel Charge": item.fuelCharge,
      "Total Price": item.totalPrice,
      "Final Price (with multiplier)": item.finalPrice,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Shipping Prices");

    const fileName = `shipping-prices-${selectedCountryName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Success",
      description: `Excel file downloaded: ${fileName}`,
    });
  };

  // Show loading while user data is being fetched
  if (!user) {
    return (
      <Layout user={user}>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (user.role !== 'admin') {
    return (
      <Layout user={user}>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
              <p className="text-gray-600">You need admin privileges to access this page.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-6 w-6" />
              Price Fetcher
            </CardTitle>
            <CardDescription>Fetch shipping prices for different volumetric weights (0.5kg to 15kg)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Country Selection */}
            <div className="space-y-2">
              <Label htmlFor="country">Destination Country</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Multiplier Input */}
            <div className="space-y-2">
              <Label htmlFor="multiplier">Price Multiplier</Label>
              <Input
                id="multiplier"
                type="number"
                step="0.1"
                min="0.1"
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value)}
                placeholder="Enter multiplier (e.g., 1.2 for 20% markup)"
              />
              <p className="text-sm text-gray-600">
                Multiplier will be applied to the total price from the API
              </p>
            </div>

            {/* Fetch Button */}
            <div className="flex space-x-4">
              <Button
                onClick={handleFetchPrices}
                disabled={isLoading || !selectedCountry}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Fetching Prices...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Fetch All Prices
                  </>
                )}
              </Button>

              <Button
                onClick={exportToExcel}
                disabled={priceData.length === 0}
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>

            {/* Progress Bar */}
            {isLoading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Fetching prices...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            {/* Results Summary */}
            {priceData.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">All Price Results ({priceData.length} entries)</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-5 gap-4 text-sm font-medium mb-2 sticky top-0 bg-gray-50 pb-2">
                    <div>Weight (kg)</div>
                    <div>Base Price</div>
                    <div>Fuel Charge</div>
                    <div>Total Price</div>
                    <div>Final Price</div>
                  </div>
                  {priceData.map((item, index) => (
                    <div key={index} className="grid grid-cols-5 gap-4 text-sm py-1 border-b border-gray-200 last:border-b-0">
                      <div className="font-medium">{item.volumetricWeight}</div>
                      <div>${item.basePrice.toFixed(2)}</div>
                      <div>${item.fuelCharge.toFixed(2)}</div>
                      <div>${item.totalPrice.toFixed(2)}</div>
                      <div className="font-medium text-blue-600">${item.finalPrice.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default withAuth(AdminPriceFetcher, { adminOnly: true });