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

export default function AdminShipmentCreateSimple() {
  console.log('🚀 ADMIN SHIPMENT CREATE - SINGLE COLUMN LAYOUT v3.0 - TIMESTAMP:', Date.now());
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

  const calculatePrice = async () => {
    if (!selectedUser || !packageForm.receiverCountry || !packageForm.packageWeight) {
      return;
    }

    setIsCalculatingPrice(true);
    try {
      const response = await fetch('/api/calculate-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverCountry: packageForm.receiverCountry,
          packageLength: parseFloat(packageForm.packageLength),
          packageWidth: parseFloat(packageForm.packageWidth),
          packageHeight: parseFloat(packageForm.packageHeight),
          packageWeight: parseFloat(packageForm.packageWeight),
        }),
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

      {/* Main Content - Simple Layout */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'block' }}>
          
          {/* Forms Section */}
          <div style={{ marginBottom: '40px' }}>
            
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
                  
                  {/* Quick Test User */}
                  <div
                    style={{
                      padding: '16px',
                      border: '2px solid #fbbf24',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: '#fef3c7',
                      transition: 'background-color 0.2s'
                    }}
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontWeight: '600', color: '#92400e', margin: 0 }}>🧪 Test User (For Development)</p>
                        <p style={{ fontSize: '14px', color: '#a16207', margin: 0 }}>test@test.com • 1.5x Price Multiplier</p>
                      </div>
                      <Badge variant="outline" style={{ borderColor: '#fbbf24', color: '#92400e' }}>Quick Test</Badge>
                    </div>
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
                        <Label htmlFor="receiverState">State/Province</Label>
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

          {/* Summary and Actions Section */}
          <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              
              {/* Selected Customer Summary */}
              {selectedUser && (
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Users style={{ width: '20px', height: '20px', color: '#2563eb' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>Selected Customer</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ fontWeight: '600', color: '#111827', margin: 0 }}>{selectedUser.name}</p>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{selectedUser.email}</p>
                    {selectedUser.companyName && (
                      <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{selectedUser.companyName}</p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>Price Multiplier</span>
                      <Badge variant={selectedUser.priceMultiplier && selectedUser.priceMultiplier !== 1 ? "default" : "secondary"}>
                        ×{selectedUser.priceMultiplier || 1}
                      </Badge>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>Balance</span>
                      <span style={{ fontWeight: '600', color: '#16a34a' }}>${selectedUser.balance.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Options */}
              {priceOptions.length > 0 && (
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: currentStep >= 3 ? '2px solid #2563eb' : '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <DollarSign style={{ width: '20px', height: '20px', color: '#16a34a' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>Choose Service</h3>
                  </div>
                  {selectedUser?.priceMultiplier && selectedUser.priceMultiplier !== 1 && (
                    <p style={{ fontSize: '14px', color: '#2563eb', margin: '0 0 16px 0' }}>
                      Prices include ×{selectedUser.priceMultiplier} multiplier
                    </p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {priceOptions.map((option, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '16px',
                          borderRadius: '8px',
                          border: selectedPriceOption === option.serviceName ? '2px solid #2563eb' : '2px solid #e5e7eb',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: selectedPriceOption === option.serviceName ? '#eff6ff' : '#f9fafb'
                        }}
                        onClick={() => {
                          setSelectedPriceOption(option.serviceName);
                          setCurrentStep(3);
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: '600', color: '#111827', fontSize: '14px', margin: 0 }}>{option.displayName}</p>
                            {option.originalPrice && option.originalPrice !== option.totalPrice && (
                              <p style={{ fontSize: '12px', color: '#9ca3af', textDecoration: 'line-through', margin: 0 }}>
                                ${(option.originalPrice / 100).toFixed(2)}
                              </p>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                              ${(option.totalPrice / 100).toFixed(2)}
                            </p>
                            {option.multiplier && option.multiplier !== 1 && (
                              <Badge variant="outline" style={{ fontSize: '12px' }}>
                                ×{option.multiplier}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress and Action */}
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>Progress & Action</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', marginBottom: '20px' }}>
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
                    color: (addressForm.receiverName && addressForm.receiverPhone && addressForm.receiverAddress1 && addressForm.receiverCity && addressForm.receiverPostalCode) ? '#16a34a' : '#9ca3af' 
                  }}>
                    <CheckCircle style={{ width: '16px', height: '16px' }} />
                    Address completed
                  </div>
                </div>

                {/* Create Shipment Button */}
                {selectedPriceOption && (
                  <div>
                    <Button 
                      style={{ width: '100%', padding: '12px 16px', marginBottom: '8px' }}
                      size="lg"
                      disabled={!addressForm.receiverName || !addressForm.receiverPhone || !addressForm.receiverAddress1 || !addressForm.receiverCity || !addressForm.receiverPostalCode}
                    >
                      Create Shipment
                    </Button>
                    <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', margin: 0 }}>
                      Complete all required fields to create shipment
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}