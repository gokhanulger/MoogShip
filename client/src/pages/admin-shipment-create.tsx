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
import Layout from "@/components/layout";

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  balance: number;
  role: string;
  companyName?: string;
  isApproved: boolean;
  priceMultiplier?: number;
}

export default function AdminShipmentCreate() {
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
    receiverPostalCode: "",
    receiverCountry: ""
  });
  const [packageForm, setPackageForm] = useState({
    receiverCountry: "",
    packageLength: "",
    packageWidth: "",
    packageHeight: "",
    packageWeight: "",
    serviceLevel: ""
  });
  const [customsForm, setCustomsForm] = useState({
    packageContents: "",
    customsValue: "",
    gtip: "",
    iossNumber: "",
    hmrcNumber: "",
    packageItems: [] as any[]
  });
  const [priceOptions, setPriceOptions] = useState<any[]>([]);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [selectedPriceOption, setSelectedPriceOption] = useState<string | null>(null);
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const { toast } = useToast();

  // Function to get service color based on service name
  const getServiceColor = (serviceName: string) => {
    const name = serviceName.toLowerCase();
    if (name.includes('eco') || name.includes('ekonomi')) {
      return { bg: '#dcfce7', border: '#16a34a', text: '#15803d' }; // Green for Eco
    } else if (name.includes('express') || name.includes('hızlı')) {
      return { bg: '#fed7aa', border: '#ea580c', text: '#c2410c' }; // Orange for Express
    } else if (name.includes('plus') || name.includes('artı')) {
      return { bg: '#fef3c7', border: '#d97706', text: '#92400e' }; // Yellow for Plus
    } else if (name.includes('fedex')) {
      return { bg: '#e0e7ff', border: '#7c3aed', text: '#6d28d9' }; // Purple for FedEx
    } else if (name.includes('aramex')) {
      return { bg: '#fce7f3', border: '#ec4899', text: '#be185d' }; // Pink for Aramex
    } else if (name.includes('dhl')) {
      return { bg: '#fef3c7', border: '#eab308', text: '#a16207' }; // Yellow for DHL
    } else if (name.includes('standard') || name.includes('standart')) {
      return { bg: '#dbeafe', border: '#2563eb', text: '#1d4ed8' }; // Blue for Standard
    }
    return { bg: '#f3f4f6', border: '#6b7280', text: '#374151' }; // Default gray
  };

  // Auto-calculate prices when form is complete
  useEffect(() => {
    if (packageForm.receiverCountry && packageForm.packageWeight && 
        packageForm.packageLength && packageForm.packageWidth && packageForm.packageHeight) {
      calculatePrice();
    }
  }, [packageForm, selectedUser]);

  const calculatePrice = async () => {
    if (!selectedUser || !packageForm.receiverCountry || !packageForm.packageWeight) {
      return;
    }

    setIsCalculatingPrice(true);
    try {
      const response = await fetch('/api/pricing/moogship-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          receiverCountry: packageForm.receiverCountry,
          packageLength: parseFloat(packageForm.packageLength),
          packageWidth: parseFloat(packageForm.packageWidth),
          packageHeight: parseFloat(packageForm.packageHeight),
          packageWeight: parseFloat(packageForm.packageWeight),
          userId: selectedUser?.id, // Pass user ID for admin pricing to use their multiplier
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Options already have customer multiplier applied by the backend
          const options = data.options || [];
          setPriceOptions(options);
          toast({
            title: "Pricing Calculated",
            description: `Found ${options.length} shipping options`,
          });
        } else {
          toast({
            title: "Pricing Error",
            description: data.message || "Failed to calculate pricing",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Price calculation error:', error);
      toast({
        title: "Network Error",
        description: "Failed to calculate pricing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCalculatingPrice(false);
    }
  };

  const handleCreateShipment = async () => {
    if (!selectedUser || !selectedPriceOption || !addressForm.receiverName || !addressForm.receiverPhone || !addressForm.receiverAddress1 || !addressForm.receiverCity || !addressForm.receiverPostalCode) {
      toast({
        title: "Missing Information",
        description: "Please complete all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingShipment(true);
    try {
      const selectedOption = priceOptions.find(option => option.serviceName === selectedPriceOption);
      
      const shipmentData = {
        userId: selectedUser.id,
        receiverName: addressForm.receiverName,
        receiverPhone: addressForm.receiverPhone,
        receiverEmail: addressForm.receiverEmail,
        receiverAddress1: addressForm.receiverAddress1,
        receiverAddress2: addressForm.receiverAddress2,
        receiverCity: addressForm.receiverCity,
        receiverState: addressForm.receiverState,
        receiverPostalCode: addressForm.receiverPostalCode,
        receiverCountry: addressForm.receiverCountry,
        packageWeight: parseFloat(packageForm.packageWeight),
        packageLength: parseFloat(packageForm.packageLength),
        packageWidth: parseFloat(packageForm.packageWidth),
        packageHeight: parseFloat(packageForm.packageHeight),
        selectedService: selectedPriceOption,
        serviceLevel: selectedOption?.serviceType || 'standard',
        shippingProvider: selectedOption?.provider || 'moogship',
        carrierName: selectedOption?.displayName || selectedPriceOption,
        totalPrice: selectedOption?.totalPrice || 0,
        basePrice: selectedOption?.cargoPrice || selectedOption?.basePrice || 0,
        fuelCharge: selectedOption?.fuelCost || selectedOption?.fuelCharge || 0,
        additionalFee: selectedOption?.additionalFee || 0,
        originalAdditionalFee: selectedOption?.additionalFee || 0,
        appliedMultiplier: selectedOption?.appliedMultiplier || selectedUser.priceMultiplier || 1,
        originalTotalPrice: selectedOption?.originalTotalPrice || selectedOption?.totalPrice || 0,
        originalBasePrice: selectedOption?.originalBasePrice || selectedOption?.basePrice || 0,
        originalFuelCharge: selectedOption?.originalFuelCharge || selectedOption?.fuelCharge || 0,
        packageContents: customsForm.packageContents || 'General merchandise',
        customsValue: customsForm.customsValue ? Math.round(parseFloat(customsForm.customsValue) * 100) : undefined, // Convert to cents
        gtip: customsForm.gtip || undefined,
        iossNumber: customsForm.iossNumber || undefined,
        hmrcNumber: customsForm.hmrcNumber || undefined,
        packageItems: customsForm.packageItems.length > 0 ? customsForm.packageItems : undefined,
        status: 'pending_approval',
        createdByAdmin: true
      };

      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(shipmentData),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Shipment Created",
          description: `Shipment #${result.id} created successfully for ${selectedUser.name}`,
        });
        // Navigate to the shipment details or admin shipments page
        window.location.href = '/admin-shipments';
      } else {
        const error = await response.json();
        toast({
          title: "Creation Failed",
          description: error.message || "Failed to create shipment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Create shipment error:', error);
      toast({
        title: "Network Error",
        description: "Failed to create shipment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingShipment(false);
    }
  };

  // Fetch current user data for Layout component
  const { data: currentUser } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const response = await fetch('/api/user');
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      return response.json();
    },
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
  });

  const filteredUsers = users.filter((user: User) =>
    user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (user.companyName && user.companyName.toLowerCase().includes(userSearchTerm.toLowerCase()))
  );

  return (
    <Layout user={currentUser}>
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Simple Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/admin-shipments")}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <ArrowLeftIcon style={{ width: '16px', height: '16px' }} />
              Back to Admin Shipments
            </Button>
            <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package style={{ width: '20px', height: '20px', color: '#2563eb' }} />
              <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>Create New Shipment</h1>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {[1, 2, 3, 4].map((step) => (
              <div 
                key={step}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: step === currentStep ? '#2563eb' : step < currentStep ? '#16a34a' : '#e5e7eb',
                  color: step === currentStep || step < currentStep ? 'white' : '#6b7280'
                }}
              >
                {step < currentStep ? '✓' : step}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr', 
          gap: '32px'
        }}>
          
          {/* Left Column - Forms */}
          <div>
            
            {/* Step 1: User Selection */}
            <Card style={{ marginBottom: '24px', border: currentStep === 1 ? '2px solid #2563eb' : '1px solid #e5e7eb' }}>
              <CardHeader>
                <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Users style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                  </div>
                  Step 1: Select Customer
                  {selectedUser && (
                    <Badge variant="secondary" style={{ marginLeft: '8px' }}>
                      {selectedUser.name} 
                      {selectedUser.priceMultiplier && selectedUser.priceMultiplier !== 1 && (
                        <span style={{ marginLeft: '4px', color: '#2563eb' }}>×{selectedUser.priceMultiplier}</span>
                      )}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '12px', width: '16px', height: '16px', color: '#9ca3af' }} />
                    <Input
                      placeholder="Search customers by name, email, or company..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      style={{ paddingLeft: '40px' }}
                      onFocus={() => setShowUserDropdown(true)}
                    />
                  </div>
                  

                  
                  {/* User List */}
                  {(userSearchTerm || showUserDropdown) && (
                    <div style={{ maxHeight: '256px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px' }}>
                      {usersLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                          <Loader2 style={{ width: '20px', height: '20px', marginRight: '8px' }} className="animate-spin" />
                          Loading customers...
                        </div>
                      ) : (
                        filteredUsers.slice(0, 8).map((user: User) => (
                          <div
                            key={user.id}
                            style={{
                              padding: '12px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              marginBottom: '8px',
                              transition: 'background-color 0.2s',
                              backgroundColor: selectedUser?.id === user.id ? '#eff6ff' : 'white',
                              border: selectedUser?.id === user.id ? '2px solid #2563eb' : '1px solid #e5e7eb'
                            }}
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
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <p style={{ fontWeight: '500', color: '#111827', margin: 0 }}>{user.name}</p>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{user.email}</p>
                                {user.companyName && (
                                  <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{user.companyName}</p>
                                )}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                {user.priceMultiplier && user.priceMultiplier !== 1 && (
                                  <Badge variant="outline" style={{ marginBottom: '4px' }}>×{user.priceMultiplier}</Badge>
                                )}
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>${user.balance.toFixed(2)}</p>
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
            <Card style={{ 
              marginBottom: '24px', 
              border: currentStep === 2 ? '2px solid #2563eb' : selectedUser ? '1px solid #16a34a' : '1px solid #e5e7eb',
              opacity: selectedUser ? 1 : 0.5 
            }}>
              <CardHeader>
                <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: currentStep === 2 ? '#dbeafe' : selectedUser ? '#dcfce7' : '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Package style={{ 
                      width: '16px', 
                      height: '16px', 
                      color: currentStep === 2 ? '#2563eb' : selectedUser ? '#16a34a' : '#6b7280' 
                    }} />
                  </div>
                  Step 2: Package Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <Label htmlFor="country" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Globe style={{ width: '16px', height: '16px' }} />
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
                        <SelectTrigger style={{ marginTop: '4px' }}>
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
                      <Label htmlFor="weight" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Weight style={{ width: '16px', height: '16px' }} />
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
                        style={{ marginTop: '4px' }}
                        disabled={!selectedUser}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <Ruler style={{ width: '16px', height: '16px' }} />
                      Dimensions (cm)
                    </Label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                      <div>
                        <Label htmlFor="length" style={{ fontSize: '14px', color: '#6b7280' }}>Length</Label>
                        <Input
                          id="length"
                          type="number"
                          min="1"
                          value={packageForm.packageLength}
                          onChange={(e) => setPackageForm(prev => ({ ...prev, packageLength: e.target.value }))}
                          placeholder="20"
                          style={{ marginTop: '4px' }}
                          disabled={!selectedUser}
                        />
                      </div>
                      <div>
                        <Label htmlFor="width" style={{ fontSize: '14px', color: '#6b7280' }}>Width</Label>
                        <Input
                          id="width"
                          type="number"
                          min="1"
                          value={packageForm.packageWidth}
                          onChange={(e) => setPackageForm(prev => ({ ...prev, packageWidth: e.target.value }))}
                          placeholder="15"
                          style={{ marginTop: '4px' }}
                          disabled={!selectedUser}
                        />
                      </div>
                      <div>
                        <Label htmlFor="height" style={{ fontSize: '14px', color: '#6b7280' }}>Height</Label>
                        <Input
                          id="height"
                          type="number"
                          min="1"
                          value={packageForm.packageHeight}
                          onChange={(e) => setPackageForm(prev => ({ ...prev, packageHeight: e.target.value }))}
                          placeholder="10"
                          style={{ marginTop: '4px' }}
                          disabled={!selectedUser}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {packageForm.receiverCountry && packageForm.packageWeight && 
                   packageForm.packageLength && packageForm.packageWidth && packageForm.packageHeight && (
                    <div style={{ padding: '16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d' }}>
                        <CheckCircle style={{ width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Package details complete</span>
                      </div>
                      {isCalculatingPrice && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: '#2563eb' }}>
                          <Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />
                          <span style={{ fontSize: '14px' }}>Calculating pricing options...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Step 2.5: Customs Information */}
            <Card style={{ 
              marginBottom: '24px', 
              border: currentStep >= 3 ? '2px solid #2563eb' : priceOptions.length > 0 ? '1px solid #16a34a' : '1px solid #e5e7eb',
              opacity: priceOptions.length > 0 ? 1 : 0.5 
            }}>
              <CardHeader>
                <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: currentStep >= 3 ? '#dbeafe' : priceOptions.length > 0 ? '#dcfce7' : '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Package style={{ 
                      width: '16px', 
                      height: '16px', 
                      color: currentStep >= 3 ? '#2563eb' : priceOptions.length > 0 ? '#16a34a' : '#6b7280' 
                    }} />
                  </div>
                  Step 2.5: Customs Information
                </CardTitle>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, marginLeft: '44px' }}>
                  Required for international shipments
                </p>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* Package Contents */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontWeight: '600', color: '#111827', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', margin: 0 }}>Package Contents</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <Label htmlFor="packageContents">Contents Description *</Label>
                        <Input
                          id="packageContents"
                          placeholder="Electronics, clothing, books, etc."
                          value={customsForm.packageContents}
                          onChange={(e) => setCustomsForm(prev => ({ ...prev, packageContents: e.target.value }))}
                          style={{ marginTop: '4px' }}
                          disabled={!priceOptions.length}
                        />
                      </div>
                      <div>
                        <Label htmlFor="customsValue">Declared Value (USD) *</Label>
                        <Input
                          id="customsValue"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="50.00"
                          value={customsForm.customsValue}
                          onChange={(e) => setCustomsForm(prev => ({ ...prev, customsValue: e.target.value }))}
                          style={{ marginTop: '4px' }}
                          disabled={!priceOptions.length}
                        />
                      </div>
                      <div>
                        <Label htmlFor="gtip">GTIP/HS Code</Label>
                        <Input
                          id="gtip"
                          placeholder="6203.42.31 (optional)"
                          value={customsForm.gtip}
                          onChange={(e) => setCustomsForm(prev => ({ ...prev, gtip: e.target.value }))}
                          style={{ marginTop: '4px' }}
                          disabled={!priceOptions.length}
                        />
                      </div>
                    </div>
                  </div>

                  {/* EU/UK Compliance */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontWeight: '600', color: '#111827', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', margin: 0 }}>EU/UK Compliance</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <Label htmlFor="iossNumber">IOSS Number</Label>
                        <Input
                          id="iossNumber"
                          placeholder="IM0123456789 (for EU shipments)"
                          value={customsForm.iossNumber}
                          onChange={(e) => setCustomsForm(prev => ({ ...prev, iossNumber: e.target.value }))}
                          style={{ marginTop: '4px' }}
                          disabled={!priceOptions.length}
                        />
                      </div>
                      <div>
                        <Label htmlFor="hmrcNumber">HMRC Number</Label>
                        <Input
                          id="hmrcNumber"
                          placeholder="GB123456789000 (for UK shipments)"
                          value={customsForm.hmrcNumber}
                          onChange={(e) => setCustomsForm(prev => ({ ...prev, hmrcNumber: e.target.value }))}
                          style={{ marginTop: '4px' }}
                          disabled={!priceOptions.length}
                        />
                      </div>
                      {packageForm.receiverCountry && (
                        <div style={{ 
                          padding: '12px', 
                          backgroundColor: '#f8fafc', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '6px' 
                        }}>
                          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                            <strong>Destination:</strong> {COUNTRIES.find(c => c.code === packageForm.receiverCountry)?.name || packageForm.receiverCountry}
                            {packageForm.receiverCountry?.startsWith('EU-') && (
                              <span style={{ display: 'block', marginTop: '4px', color: '#7c3aed' }}>
                                💡 EU destination: IOSS number recommended for orders over €22
                              </span>
                            )}
                            {packageForm.receiverCountry === 'GB' && (
                              <span style={{ display: 'block', marginTop: '4px', color: '#7c3aed' }}>
                                💡 UK destination: HMRC number may be required
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Address Information */}
            <Card style={{ 
              marginBottom: '24px', 
              border: currentStep === 3 ? '2px solid #2563eb' : priceOptions.length > 0 ? '1px solid #16a34a' : '1px solid #e5e7eb',
              opacity: priceOptions.length > 0 ? 1 : 0.5 
            }}>
              <CardHeader>
                <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: currentStep === 3 ? '#dbeafe' : priceOptions.length > 0 ? '#dcfce7' : '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Globe style={{ 
                      width: '16px', 
                      height: '16px', 
                      color: currentStep === 3 ? '#2563eb' : priceOptions.length > 0 ? '#16a34a' : '#6b7280' 
                    }} />
                  </div>
                  Step 3: Address Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* Receiver Information */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontWeight: '600', color: '#111827', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', margin: 0 }}>Receiver Information</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <Label htmlFor="receiverName">Full Name *</Label>
                        <Input
                          id="receiverName"
                          placeholder="John Doe"
                          value={addressForm.receiverName}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, receiverName: e.target.value }))}
                          style={{ marginTop: '4px' }}
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
                          style={{ marginTop: '4px' }}
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
                          style={{ marginTop: '4px' }}
                          disabled={!priceOptions.length}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontWeight: '600', color: '#111827', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', margin: 0 }}>Delivery Address</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <Label htmlFor="receiverAddress1">Address Line 1 *</Label>
                        <Input
                          id="receiverAddress1"
                          placeholder="123 Main Street"
                          value={addressForm.receiverAddress1}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, receiverAddress1: e.target.value }))}
                          style={{ marginTop: '4px' }}
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
                          style={{ marginTop: '4px' }}
                          disabled={!priceOptions.length}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <Label htmlFor="receiverCity">City *</Label>
                          <Input
                            id="receiverCity"
                            placeholder="New York"
                            value={addressForm.receiverCity}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, receiverCity: e.target.value }))}
                            style={{ marginTop: '4px' }}
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
                            style={{ marginTop: '4px' }}
                            disabled={!priceOptions.length}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="receiverCountry">Country *</Label>
                        <Select 
                          value={addressForm.receiverCountry} 
                          onValueChange={(value) => {
                            setAddressForm(prev => ({ ...prev, receiverCountry: value }));
                            setPackageForm(prev => ({ ...prev, receiverCountry: value }));
                          }}
                          disabled={!priceOptions.length}
                        >
                          <SelectTrigger style={{ marginTop: '4px' }}>
                            <SelectValue placeholder="Select country" />
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
                        <Label htmlFor="receiverState">State/Province {addressForm.receiverCountry === 'US' ? '*' : ''}</Label>
                        <Input
                          id="receiverState"
                          placeholder="NY"
                          value={addressForm.receiverState}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, receiverState: e.target.value }))}
                          style={{ marginTop: '4px' }}
                          disabled={!priceOptions.length}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div style={{ 
            position: 'sticky', 
            top: '32px', 
            height: 'fit-content'
          }}>
            

            
            {/* Selected Customer Summary - Always Show */}
            <Card style={{ marginBottom: '24px' }}>
              <CardHeader style={{ paddingBottom: '12px' }}>
                <CardTitle style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users style={{ width: '20px', height: '20px', color: '#2563eb' }} />
                  Selected Customer
                </CardTitle>
              </CardHeader>
              <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedUser ? (
                  <>
                    <div>
                      <p style={{ fontWeight: '600', color: '#111827', margin: 0 }}>{selectedUser.name}</p>
                      <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{selectedUser.email}</p>
                      {selectedUser.companyName && (
                        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{selectedUser.companyName}</p>
                      )}
                    </div>
                    <Separator />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>Price Multiplier</span>
                        <Badge variant={selectedUser.priceMultiplier && selectedUser.priceMultiplier !== 1 ? "default" : "secondary"}>
                          ×{selectedUser.priceMultiplier || 1}
                        </Badge>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>Account Balance</span>
                        <span style={{ fontWeight: '600', color: '#16a34a' }}>${selectedUser.balance.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No customer selected</p>
                )}
              </CardContent>
            </Card>
            


            {/* Pricing Options */}
            {priceOptions.length > 0 && (
              <Card style={{ marginBottom: '24px', border: currentStep >= 3 ? '2px solid #2563eb' : '1px solid #e5e7eb' }}>
                <CardHeader style={{ paddingBottom: '12px' }}>
                  <CardTitle style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign style={{ width: '20px', height: '20px', color: '#16a34a' }} />
                    Choose Service
                  </CardTitle>
                  {selectedUser?.priceMultiplier && selectedUser.priceMultiplier !== 1 && (
                    <p style={{ fontSize: '14px', color: '#2563eb', margin: 0 }}>
                      Prices include ×{selectedUser.priceMultiplier} multiplier
                    </p>
                  )}
                </CardHeader>
                <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {priceOptions.map((option, index) => {
                    const serviceColors = getServiceColor(option.serviceName || option.displayName);
                    const isSelected = selectedPriceOption === option.serviceName;
                    return (
                      <div
                        key={index}
                        style={{
                          padding: '16px',
                          borderRadius: '8px',
                          border: isSelected ? `2px solid ${serviceColors.border}` : `2px solid ${serviceColors.border}60`,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: isSelected ? serviceColors.bg : `${serviceColors.bg}40`
                        }}
                        onClick={() => {
                          setSelectedPriceOption(option.serviceName);
                          setCurrentStep(3);
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <p style={{ 
                                fontWeight: '600', 
                                color: serviceColors.text, 
                                fontSize: '14px', 
                                margin: 0 
                              }}>
                                {option.displayName}
                              </p>
                              <Badge 
                                style={{ 
                                  backgroundColor: serviceColors.border, 
                                  color: 'white',
                                  fontSize: '10px',
                                  padding: '2px 6px'
                                }}
                              >
                                {option.serviceType || 'Standard'}
                              </Badge>
                            </div>
                            
                            {/* Show cost price for admin */}
                            {option.originalTotalPrice && (
                              <p style={{
                                fontSize: '12px',
                                color: '#ef4444',
                                margin: 0,
                                fontWeight: '500'
                              }}>
                                Cost: ${(option.originalTotalPrice / 100).toFixed(2)}
                                {option.totalPrice && option.originalTotalPrice !== option.totalPrice && (
                                  <span style={{ color: '#16a34a', marginLeft: '8px' }}>
                                    (Margin: ${((option.totalPrice - option.originalTotalPrice) / 100).toFixed(2)})
                                  </span>
                                )}
                              </p>
                            )}
                            
                            {option.estimatedDeliveryDays && (
                              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                                {option.estimatedDeliveryDays} days delivery
                              </p>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ 
                              fontSize: '18px', 
                              fontWeight: 'bold', 
                              color: serviceColors.text, 
                              margin: 0 
                            }}>
                              ${(option.totalPrice / 100).toFixed(2)}
                            </p>
                            {option.appliedMultiplier && option.appliedMultiplier !== 1 && (
                              <Badge variant="outline" style={{ 
                                fontSize: '12px',
                                borderColor: serviceColors.border,
                                color: serviceColors.text
                              }}>
                                ×{option.appliedMultiplier}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Progress and Create Button */}
            <Card>
              <CardContent style={{ paddingTop: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ fontWeight: '600', color: '#111827', fontSize: '14px', margin: 0 }}>Progress</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      color: selectedUser ? '#16a34a' : '#9ca3af' 
                    }}>
                      <CheckCircle style={{ width: '16px', height: '16px' }} />
                      Customer selected
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      color: (packageForm.receiverCountry && packageForm.packageWeight) ? '#16a34a' : '#9ca3af' 
                    }}>
                      <CheckCircle style={{ width: '16px', height: '16px' }} />
                      Package details entered
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      color: priceOptions.length > 0 ? '#16a34a' : '#9ca3af' 
                    }}>
                      <CheckCircle style={{ width: '16px', height: '16px' }} />
                      Pricing calculated
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      color: selectedPriceOption ? '#16a34a' : '#9ca3af' 
                    }}>
                      <CheckCircle style={{ width: '16px', height: '16px' }} />
                      Service selected
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      color: (addressForm.receiverName && addressForm.receiverPhone && addressForm.receiverAddress1 && addressForm.receiverCity && addressForm.receiverPostalCode && (packageForm.receiverCountry !== 'US' || addressForm.receiverState)) ? '#16a34a' : '#9ca3af' 
                    }}>
                      <CheckCircle style={{ width: '16px', height: '16px' }} />
                      Address completed
                    </div>
                  </div>

                  {/* Create Shipment Button */}
                  {selectedPriceOption && (
                    <div style={{ marginTop: '20px' }}>
                      <Button 
                        style={{ width: '100%', padding: '12px 16px' }}
                        size="lg"
                        disabled={!addressForm.receiverName || !addressForm.receiverPhone || !addressForm.receiverAddress1 || !addressForm.receiverCity || !addressForm.receiverPostalCode || (packageForm.receiverCountry === 'US' && !addressForm.receiverState) || isCreatingShipment}
                        onClick={handleCreateShipment}
                      >
                        {isCreatingShipment ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />
                            Creating...
                          </div>
                        ) : (
                          'Create Shipment'
                        )}
                      </Button>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', textAlign: 'center', margin: '8px 0 0 0' }}>
                        Complete all required fields to create shipment
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
    </Layout>
  );
}