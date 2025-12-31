import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, Users, Package, Calculator, Loader2, Search, CheckCircle, DollarSign, Globe, Ruler, Weight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { COUNTRIES } from "@/lib/countries";

// CSS class for consistent cross-browser grid layout
const LAYOUT_STYLES = {
  container: "min-h-screen bg-gradient-to-br from-slate-50 to-blue-50",
  header: "bg-white border-b shadow-sm",
  headerContent: "max-w-7xl mx-auto px-6 py-4",
  headerFlex: "flex items-center justify-between",
  mainContent: "max-w-7xl mx-auto px-6 py-8",
  gridLayout: "grid grid-cols-1 lg:grid-cols-3 gap-8",
  leftColumn: "lg:col-span-2 space-y-6",
  rightColumn: "lg:col-span-1",
  stickyRightColumn: "lg:col-span-1 lg:sticky lg:top-8 space-y-6"
};

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  balance: number;
  companyName?: string;
  isApproved: boolean;
  priceMultiplier?: number;
}

export default function AdminShipmentCreateMinimal() {
  console.log('🚀 ADMIN SHIPMENT CREATE - REDESIGNED');
  const [, navigate] = useLocation();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [addressForm, setAddressForm] = useState({
    receiverName: "",
    receiverPhone: "",
    receiverEmail: "",
    receiverAddress1: "",
    receiverAddress2: "",
    receiverCity: "",
    receiverState: "",
    receiverPostalCode: ""
  });
  const [packageForm, setPackageForm] = useState({
    receiverCountry: "",
    packageLength: "",
    packageWidth: "",
    packageHeight: "",
    packageWeight: "",
    serviceLevel: ""
  });
  const [priceOptions, setPriceOptions] = useState<any[]>([]);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [selectedPriceOption, setSelectedPriceOption] = useState<string | null>(null);
  const { toast } = useToast();

  // Auto-calculate prices when form is complete
  useEffect(() => {
    if (packageForm.receiverCountry && packageForm.packageWeight && 
        packageForm.packageLength && packageForm.packageWidth && packageForm.packageHeight) {
      calculatePrice();
    }
  }, [packageForm, selectedUser]);

  // Fetch all users for billing selection
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      console.log('🔍 FETCHING USERS...');
      const res = await apiRequest("GET", "/api/users");
      if (!res.ok) {
        console.error('🔍 USERS API ERROR:', res.status, res.statusText);
        throw new Error(`Failed to fetch users: ${res.status}`);
      }
      const userData = await res.json();
      console.log('🔍 FETCHED USERS DATA:', userData.length, 'users');
      return userData;
    },
  });

  // Calculate price when package details change
  const calculatePrice = async () => {
    if (!packageForm.receiverCountry || !packageForm.packageLength || !packageForm.packageWidth || 
        !packageForm.packageHeight || !packageForm.packageWeight) {
      return;
    }

    setIsCalculatingPrice(true);
    try {
      const response = await apiRequest("POST", "/api/pricing/moogship-options", {
        body: JSON.stringify({
          receiverCountry: packageForm.receiverCountry,
          packageLength: parseFloat(packageForm.packageLength),
          packageWidth: parseFloat(packageForm.packageWidth),
          packageHeight: parseFloat(packageForm.packageHeight),
          packageWeight: parseFloat(packageForm.packageWeight)
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          let options = data.options || [];
          
          // Apply user's price multiplier if selected
          if (selectedUser?.priceMultiplier && selectedUser.priceMultiplier !== 1) {
            options = options.map((option: any) => ({
              ...option,
              totalPrice: Math.round(option.totalPrice * selectedUser.priceMultiplier!),
              originalPrice: option.totalPrice,
              multiplier: selectedUser.priceMultiplier
            }));
          }
          
          setPriceOptions(options);
          console.log('💰 PRICE OPTIONS WITH MULTIPLIER:', options);
        }
      }
    } catch (error) {
      console.error('Price calculation error:', error);
      toast({
        title: "Error",
        description: "Failed to calculate pricing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCalculatingPrice(false);
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (user.companyName && user.companyName.toLowerCase().includes(userSearchTerm.toLowerCase()))
  );

  return (
    <div className={LAYOUT_STYLES.container}>
      {/* Header */}
      <div className={LAYOUT_STYLES.header}>
        <div className={LAYOUT_STYLES.headerContent}>
          <div className={LAYOUT_STYLES.headerFlex}>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/admin-shipments")}
                className="flex items-center gap-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to Admin Shipments
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">Create New Shipment</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <div 
                    key={step}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === currentStep 
                        ? 'bg-blue-600 text-white' 
                        : step < currentStep 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step < currentStep ? <CheckCircle className="w-4 h-4" /> : step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={LAYOUT_STYLES.mainContent}>
        <div className={LAYOUT_STYLES.gridLayout}>
          
          {/* Left Column - Forms */}
          <div className={LAYOUT_STYLES.leftColumn}>
            {/* Step 1: User Selection */}
            <Card className={`${currentStep === 1 ? 'ring-2 ring-blue-500' : ''}`}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    Step 1: Select Customer
                  </CardTitle>
                  {selectedUser && (
                    <Badge variant="secondary" className="text-sm">
                      {selectedUser.name} 
                      {selectedUser.priceMultiplier && selectedUser.priceMultiplier !== 1 && (
                        <span className="ml-1 text-blue-600">×{selectedUser.priceMultiplier}</span>
                      )}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search customers by name, email, or company..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="pl-10"
                      onFocus={() => setShowUserDropdown(true)}
                    />
                  </div>
                  
                  {/* Quick Test User */}
                  <div
                    className="p-4 border-2 border-amber-200 bg-amber-50 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
                    onClick={() => {
                      const testUser = { 
                        id: 999, 
                        name: "Test User (1.5x)", 
                        email: "test@test.com", 
                        priceMultiplier: 1.5, 
                        balance: 100, 
                        username: "test", 
                        role: "user", 
                        companyName: "Test Co", 
                        isApproved: true 
                      };
                      setSelectedUser(testUser);
                      setCurrentStep(2);
                      toast({
                        title: "Test User Selected",
                        description: "Selected test user with 1.5x price multiplier",
                      });
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-amber-800">🧪 Test User (For Development)</p>
                        <p className="text-sm text-amber-600">test@test.com • 1.5x Price Multiplier</p>
                      </div>
                      <Badge variant="outline" className="border-amber-300 text-amber-700">Quick Test</Badge>
                    </div>
                  </div>
                  
                  {/* User List */}
                  {(userSearchTerm || showUserDropdown) && (
                    <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
                      {usersLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Loading customers...
                        </div>
                      ) : (
                        filteredUsers.slice(0, 8).map((user) => (
                          <div
                            key={user.id}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedUser?.id === user.id 
                                ? 'bg-blue-50 border-2 border-blue-200' 
                                : 'hover:bg-gray-50 border border-gray-200'
                            }`}
                            onClick={() => {
                              setSelectedUser(user);
                              setCurrentStep(2);
                              setShowUserDropdown(false);
                              toast({
                                title: "Customer Selected",
                                description: `Selected ${user.name} for billing`,
                              });
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{user.name}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                                {user.companyName && (
                                  <p className="text-xs text-gray-400">{user.companyName}</p>
                                )}
                              </div>
                              <div className="text-right">
                                {user.priceMultiplier && user.priceMultiplier !== 1 && (
                                  <Badge variant="outline" className="mb-1">×{user.priceMultiplier}</Badge>
                                )}
                                <p className="text-sm text-gray-600">${user.balance.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Package Details */}
            <Card className={`${currentStep === 2 ? 'ring-2 ring-blue-500' : selectedUser ? 'border-green-200' : 'opacity-50'}`}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === 2 ? 'bg-blue-100' : selectedUser ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Package className={`w-4 h-4 ${
                      currentStep === 2 ? 'text-blue-600' : selectedUser ? 'text-green-600' : 'text-gray-400'
                    }`} />
                  </div>
                  Step 2: Package Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="country" className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Destination Country
                      </Label>
                      <Select 
                        value={packageForm.receiverCountry} 
                        onValueChange={(value) => {
                          setPackageForm(prev => ({ ...prev, receiverCountry: value }));
                          if (currentStep <= 2) setCurrentStep(2);
                        }}
                        disabled={!selectedUser}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select destination country" />
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
                    <div>
                      <Label htmlFor="weight" className="flex items-center gap-2">
                        <Weight className="w-4 h-4" />
                        Weight (kg)
                      </Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={packageForm.packageWeight}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, packageWeight: e.target.value }))}
                        placeholder="e.g., 1.5"
                        className="mt-1"
                        disabled={!selectedUser}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="flex items-center gap-2 mb-3">
                      <Ruler className="w-4 h-4" />
                      Dimensions (cm)
                    </Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="length" className="text-sm text-gray-600">Length</Label>
                        <Input
                          id="length"
                          type="number"
                          min="1"
                          value={packageForm.packageLength}
                          onChange={(e) => setPackageForm(prev => ({ ...prev, packageLength: e.target.value }))}
                          placeholder="20"
                          className="mt-1"
                          disabled={!selectedUser}
                        />
                      </div>
                      <div>
                        <Label htmlFor="width" className="text-sm text-gray-600">Width</Label>
                        <Input
                          id="width"
                          type="number"
                          min="1"
                          value={packageForm.packageWidth}
                          onChange={(e) => setPackageForm(prev => ({ ...prev, packageWidth: e.target.value }))}
                          placeholder="15"
                          className="mt-1"
                          disabled={!selectedUser}
                        />
                      </div>
                      <div>
                        <Label htmlFor="height" className="text-sm text-gray-600">Height</Label>
                        <Input
                          id="height"
                          type="number"
                          min="1"
                          value={packageForm.packageHeight}
                          onChange={(e) => setPackageForm(prev => ({ ...prev, packageHeight: e.target.value }))}
                          placeholder="10"
                          className="mt-1"
                          disabled={!selectedUser}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {packageForm.receiverCountry && packageForm.packageWeight && 
                   packageForm.packageLength && packageForm.packageWidth && packageForm.packageHeight && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Package details complete</span>
                      </div>
                      {isCalculatingPrice && (
                        <div className="flex items-center gap-2 mt-2 text-blue-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Calculating pricing options...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Address Information */}
            <Card className={`${currentStep === 3 ? 'ring-2 ring-blue-500' : priceOptions.length > 0 ? 'border-green-200' : 'opacity-50'}`}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === 3 ? 'bg-blue-100' : priceOptions.length > 0 ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Globe className={`w-4 h-4 ${
                      currentStep === 3 ? 'text-blue-600' : priceOptions.length > 0 ? 'text-green-600' : 'text-gray-400'
                    }`} />
                  </div>
                  Step 3: Address Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Receiver Information */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 border-b pb-2">Receiver Information</h3>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="receiverName">Full Name *</Label>
                          <Input
                            id="receiverName"
                            placeholder="John Doe"
                            value={addressForm.receiverName}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, receiverName: e.target.value }))}
                            className="mt-1"
                            disabled={!priceOptions.length}
                          />
                        </div>
                        <div>
                          <Label htmlFor="receiverPhone">Phone Number *</Label>
                          <Input
                            id="receiverPhone"
                            placeholder="+1 234 567 8900"
                            value={addressForm.receiverPhone}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, receiverPhone: e.target.value }))}
                            className="mt-1"
                            disabled={!priceOptions.length}
                          />
                        </div>
                        <div>
                          <Label htmlFor="receiverEmail">Email Address</Label>
                          <Input
                            id="receiverEmail"
                            type="email"
                            placeholder="john@example.com"
                            value={addressForm.receiverEmail}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, receiverEmail: e.target.value }))}
                            className="mt-1"
                            disabled={!priceOptions.length}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address Information */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 border-b pb-2">Delivery Address</h3>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="receiverAddress1">Address Line 1 *</Label>
                          <Input
                            id="receiverAddress1"
                            placeholder="123 Main Street"
                            value={addressForm.receiverAddress1}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, receiverAddress1: e.target.value }))}
                            className="mt-1"
                            disabled={!priceOptions.length}
                          />
                        </div>
                        <div>
                          <Label htmlFor="receiverAddress2">Address Line 2</Label>
                          <Input
                            id="receiverAddress2"
                            placeholder="Apt 4B"
                            value={addressForm.receiverAddress2}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, receiverAddress2: e.target.value }))}
                            className="mt-1"
                            disabled={!priceOptions.length}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="receiverCity">City *</Label>
                            <Input
                              id="receiverCity"
                              placeholder="New York"
                              value={addressForm.receiverCity}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, receiverCity: e.target.value }))}
                              className="mt-1"
                              disabled={!priceOptions.length}
                            />
                          </div>
                          <div>
                            <Label htmlFor="receiverPostalCode">Postal Code *</Label>
                            <Input
                              id="receiverPostalCode"
                              placeholder="10001"
                              value={addressForm.receiverPostalCode}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, receiverPostalCode: e.target.value }))}
                              className="mt-1"
                              disabled={!priceOptions.length}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="receiverState">State/Province</Label>
                          <Input
                            id="receiverState"
                            placeholder="NY"
                            value={addressForm.receiverState}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, receiverState: e.target.value }))}
                            className="mt-1"
                            disabled={!priceOptions.length}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className={LAYOUT_STYLES.stickyRightColumn}>
              
            {/* Selected Customer Summary */}
            {selectedUser && (
              <Card className="w-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Selected Customer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-semibold text-gray-900">{selectedUser.name}</p>
                    <p className="text-sm text-gray-600">{selectedUser.email}</p>
                    {selectedUser.companyName && (
                      <p className="text-sm text-gray-500">{selectedUser.companyName}</p>
                    )}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Price Multiplier</span>
                      <Badge variant={selectedUser.priceMultiplier && selectedUser.priceMultiplier !== 1 ? "default" : "secondary"}>
                        ×{selectedUser.priceMultiplier || 1}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Account Balance</span>
                      <span className="font-semibold text-green-600">${selectedUser.balance.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing Options */}
            {priceOptions.length > 0 && (
              <Card className={`w-full ${currentStep >= 3 ? 'ring-2 ring-blue-500' : ''}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Choose Service
                  </CardTitle>
                  {selectedUser?.priceMultiplier && selectedUser.priceMultiplier !== 1 && (
                    <p className="text-sm text-blue-600">
                      Prices include ×{selectedUser.priceMultiplier} multiplier
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {priceOptions.map((option, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedPriceOption === option.serviceName
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      onClick={() => {
                        setSelectedPriceOption(option.serviceName);
                        setCurrentStep(3);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">{option.displayName}</p>
                          {option.originalPrice && option.originalPrice !== option.totalPrice && (
                            <p className="text-xs text-gray-400 line-through">
                              ${(option.originalPrice / 100).toFixed(2)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            ${(option.totalPrice / 100).toFixed(2)}
                          </p>
                          {option.multiplier && option.multiplier !== 1 && (
                            <Badge variant="outline" className="text-xs">
                              ×{option.multiplier}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Create Shipment Button */}
            {selectedPriceOption && (
              <Card className="w-full">
                <CardContent className="pt-6">
                  <Button 
                    className="w-full" 
                    size="lg"
                    disabled={!addressForm.receiverName || !addressForm.receiverPhone || !addressForm.receiverAddress1 || !addressForm.receiverCity || !addressForm.receiverPostalCode}
                  >
                    Create Shipment
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Complete all required fields to create shipment
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Progress Indicator */}
            <Card className="w-full bg-gray-50">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 text-sm">Progress</h3>
                  <div className="space-y-2 text-sm">
                    <div className={`flex items-center gap-2 ${selectedUser ? 'text-green-600' : 'text-gray-400'}`}>
                      <CheckCircle className="w-4 h-4" />
                      Customer selected
                    </div>
                    <div className={`flex items-center gap-2 ${
                      packageForm.receiverCountry && packageForm.packageWeight ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      <CheckCircle className="w-4 h-4" />
                      Package details entered
                    </div>
                    <div className={`flex items-center gap-2 ${priceOptions.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      <CheckCircle className="w-4 h-4" />
                      Pricing calculated
                    </div>
                    <div className={`flex items-center gap-2 ${selectedPriceOption ? 'text-green-600' : 'text-gray-400'}`}>
                      <CheckCircle className="w-4 h-4" />
                      Service selected
                    </div>
                    <div className={`flex items-center gap-2 ${
                      addressForm.receiverName && addressForm.receiverPhone && addressForm.receiverAddress1 && addressForm.receiverCity && addressForm.receiverPostalCode ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      <CheckCircle className="w-4 h-4" />
                      Address completed
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}