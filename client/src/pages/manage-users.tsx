import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter,
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Wallet, 
  CreditCard, 
  Users, 
  Trash2, 
  AlertCircle,
  Loader2,
  UserPlus,
  UserCog,
  MoreHorizontal,
  ArrowLeftIcon,
  SearchIcon,
  CheckCircle,
  XCircle,
  User,
  Package,
  ClipboardCheck,
  X as XIcon,
  Check as CheckIcon,
  Calculator,
  DollarSign,
  Info as InfoIcon,
  Key as KeyIcon,
  Settings,
  MinusCircle,
  Mail,
  Download,
  Bell
} from "lucide-react";
import EmailVerificationManager from "@/components/admin/email-verification-manager";
import { useVerificationManager } from "@/hooks/use-verification-manager";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Redirect, Link } from "wouter";
import { formatDate } from "@/lib/shipment-utils";
import UserTable from "@/components/user-table";
import InsuranceRangeManagement from "@/components/insurance-range-management";

// Country Pricing Dialog Component
function CountryPricingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newCountry, setNewCountry] = useState({
    countryCode: "",
    countryName: "",
    priceMultiplier: ""
  });

  // Fetch country price multipliers
  const { data: countryMultipliers, isLoading, refetch } = useQuery({
    queryKey: ["/api/price-multipliers/countries"],
    enabled: open
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/price-multipliers/countries", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create country price multiplier");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Country price multiplier created successfully" });
      setIsAddingNew(false);
      setNewCountry({ countryCode: "", countryName: "", priceMultiplier: "" });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/price-multipliers/countries/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update country price multiplier");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Country price multiplier updated successfully" });
      setEditingItem(null);
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/price-multipliers/countries/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete country price multiplier");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Country price multiplier deleted successfully" });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = () => {
    const multiplier = parseFloat(newCountry.priceMultiplier);
    if (!newCountry.countryCode || !newCountry.countryName || !multiplier || multiplier <= 0) {
      toast({ title: "Error", description: "Please fill all fields with valid values", variant: "destructive" });
      return;
    }

    createMutation.mutate({
      countryCode: newCountry.countryCode.toUpperCase(),
      countryName: newCountry.countryName,
      priceMultiplier: multiplier
    });
  };

  const handleUpdate = (item: any) => {
    updateMutation.mutate({
      id: item.id,
      data: {
        countryCode: item.countryCode,
        countryName: item.countryName,
        priceMultiplier: parseFloat(item.priceMultiplier),
        isActive: item.isActive
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Country Price Multipliers</DialogTitle>
          <DialogDescription>
            Set different price multipliers based on destination country for shipments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Country Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Country Price Multipliers</h3>
            <Button onClick={() => setIsAddingNew(true)} disabled={isAddingNew}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Country
            </Button>
          </div>

          {/* Add New Country Form */}
          {isAddingNew && (
            <Card>
              <CardHeader>
                <CardTitle>Add New Country Multiplier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="countryCode">Country Code</Label>
                    <Input
                      id="countryCode"
                      placeholder="US, CA, GB..."
                      value={newCountry.countryCode}
                      onChange={(e) => setNewCountry(prev => ({ ...prev, countryCode: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="countryName">Country Name</Label>
                    <Input
                      id="countryName"
                      placeholder="United States, Canada..."
                      value={newCountry.countryName}
                      onChange={(e) => setNewCountry(prev => ({ ...prev, countryName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="priceMultiplier">Price Multiplier</Label>
                    <Input
                      id="priceMultiplier"
                      type="number"
                      step="0.01"
                      placeholder="1.25"
                      value={newCountry.priceMultiplier}
                      onChange={(e) => setNewCountry(prev => ({ ...prev, priceMultiplier: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSubmit} 
                    disabled={createMutation.isPending}
                    data-testid="button-create-country-multiplier"
                  >
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddingNew(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Country Multipliers List */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country Code</TableHead>
                  <TableHead>Country Name</TableHead>
                  <TableHead>Price Multiplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : countryMultipliers?.length > 0 ? (
                  countryMultipliers.map((multiplier: any) => (
                    <TableRow key={multiplier.id}>
                      <TableCell>
                        {editingItem?.id === multiplier.id ? (
                          <Input
                            value={editingItem.countryCode}
                            onChange={(e) => setEditingItem(prev => ({ ...prev, countryCode: e.target.value.toUpperCase() }))}
                            className="w-20"
                          />
                        ) : (
                          <Badge variant="outline">{multiplier.countryCode}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingItem?.id === multiplier.id ? (
                          <Input
                            value={editingItem.countryName}
                            onChange={(e) => setEditingItem(prev => ({ ...prev, countryName: e.target.value }))}
                          />
                        ) : (
                          multiplier.countryName
                        )}
                      </TableCell>
                      <TableCell>
                        {editingItem?.id === multiplier.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editingItem.priceMultiplier}
                            onChange={(e) => setEditingItem(prev => ({ ...prev, priceMultiplier: e.target.value }))}
                            className="w-24"
                          />
                        ) : (
                          `${multiplier.priceMultiplier}x`
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={multiplier.isActive ? "default" : "secondary"}>
                          {multiplier.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {editingItem?.id === multiplier.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleUpdate(editingItem)}
                                disabled={updateMutation.isPending}
                                data-testid={`button-save-country-${multiplier.id}`}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingItem(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingItem({ ...multiplier, priceMultiplier: multiplier.priceMultiplier.toString() })}
                                data-testid={`button-edit-country-${multiplier.id}`}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteMutation.mutate(multiplier.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-country-${multiplier.id}`}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                      No country price multipliers configured
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Weight Range Pricing Dialog Component
function WeightRangePricingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newWeightRange, setNewWeightRange] = useState({
    rangeName: "",
    minWeight: "",
    maxWeight: "",
    priceMultiplier: ""
  });

  // Fetch weight range price multipliers
  const { data: weightRangeMultipliers, isLoading, refetch } = useQuery({
    queryKey: ["/api/price-multipliers/weight-ranges"],
    enabled: open
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/price-multipliers/weight-ranges", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create weight range price multiplier");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Weight range price multiplier created successfully" });
      setIsAddingNew(false);
      setNewWeightRange({ rangeName: "", minWeight: "", maxWeight: "", priceMultiplier: "" });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/price-multipliers/weight-ranges/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update weight range price multiplier");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Weight range price multiplier updated successfully" });
      setEditingItem(null);
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/price-multipliers/weight-ranges/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete weight range price multiplier");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Weight range price multiplier deleted successfully" });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = () => {
    const minWeight = parseFloat(newWeightRange.minWeight);
    const maxWeight = newWeightRange.maxWeight ? parseFloat(newWeightRange.maxWeight) : null;
    const multiplier = parseFloat(newWeightRange.priceMultiplier);

    if (!newWeightRange.rangeName || isNaN(minWeight) || minWeight < 0 || !multiplier || multiplier <= 0) {
      toast({ title: "Error", description: "Please fill all required fields with valid values", variant: "destructive" });
      return;
    }

    if (maxWeight !== null && (isNaN(maxWeight) || maxWeight <= minWeight)) {
      toast({ title: "Error", description: "Maximum weight must be greater than minimum weight", variant: "destructive" });
      return;
    }

    createMutation.mutate({
      rangeName: newWeightRange.rangeName,
      minWeight,
      maxWeight,
      priceMultiplier: multiplier
    });
  };

  const handleUpdate = (item: any) => {
    const minWeight = parseFloat(item.minWeight);
    const maxWeight = item.maxWeight ? parseFloat(item.maxWeight) : null;
    const multiplier = parseFloat(item.priceMultiplier);

    updateMutation.mutate({
      id: item.id,
      data: {
        rangeName: item.rangeName,
        minWeight,
        maxWeight,
        priceMultiplier: multiplier,
        isActive: item.isActive
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Weight Range Price Multipliers</DialogTitle>
          <DialogDescription>
            Set different price multipliers based on shipment weight ranges.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Weight Range Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Weight Range Price Multipliers</h3>
            <Button onClick={() => setIsAddingNew(true)} disabled={isAddingNew}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Weight Range
            </Button>
          </div>

          {/* Add New Weight Range Form */}
          {isAddingNew && (
            <Card>
              <CardHeader>
                <CardTitle>Add New Weight Range Multiplier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rangeName">Range Name</Label>
                    <Input
                      id="rangeName"
                      placeholder="Light Packages, Heavy Items..."
                      value={newWeightRange.rangeName}
                      onChange={(e) => setNewWeightRange(prev => ({ ...prev, rangeName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="priceMultiplierWR">Price Multiplier</Label>
                    <Input
                      id="priceMultiplierWR"
                      type="number"
                      step="0.01"
                      placeholder="1.25"
                      value={newWeightRange.priceMultiplier}
                      onChange={(e) => setNewWeightRange(prev => ({ ...prev, priceMultiplier: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minWeight">Minimum Weight (kg)</Label>
                    <Input
                      id="minWeight"
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={newWeightRange.minWeight}
                      onChange={(e) => setNewWeightRange(prev => ({ ...prev, minWeight: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxWeight">Maximum Weight (kg) - Optional</Label>
                    <Input
                      id="maxWeight"
                      type="number"
                      step="0.01"
                      placeholder="Leave empty for no upper limit"
                      value={newWeightRange.maxWeight}
                      onChange={(e) => setNewWeightRange(prev => ({ ...prev, maxWeight: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSubmit} 
                    disabled={createMutation.isPending}
                    data-testid="button-create-weight-range-multiplier"
                  >
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddingNew(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weight Range Multipliers List */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Range Name</TableHead>
                  <TableHead>Min Weight (kg)</TableHead>
                  <TableHead>Max Weight (kg)</TableHead>
                  <TableHead>Price Multiplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : weightRangeMultipliers?.length > 0 ? (
                  weightRangeMultipliers.map((multiplier: any) => (
                    <TableRow key={multiplier.id}>
                      <TableCell>
                        {editingItem?.id === multiplier.id ? (
                          <Input
                            value={editingItem.rangeName}
                            onChange={(e) => setEditingItem(prev => ({ ...prev, rangeName: e.target.value }))}
                          />
                        ) : (
                          multiplier.rangeName
                        )}
                      </TableCell>
                      <TableCell>
                        {editingItem?.id === multiplier.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editingItem.minWeight}
                            onChange={(e) => setEditingItem(prev => ({ ...prev, minWeight: e.target.value }))}
                            className="w-24"
                          />
                        ) : (
                          multiplier.minWeight
                        )}
                      </TableCell>
                      <TableCell>
                        {editingItem?.id === multiplier.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editingItem.maxWeight || ""}
                            onChange={(e) => setEditingItem(prev => ({ ...prev, maxWeight: e.target.value || null }))}
                            className="w-24"
                            placeholder="No limit"
                          />
                        ) : (
                          multiplier.maxWeight || "No limit"
                        )}
                      </TableCell>
                      <TableCell>
                        {editingItem?.id === multiplier.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editingItem.priceMultiplier}
                            onChange={(e) => setEditingItem(prev => ({ ...prev, priceMultiplier: e.target.value }))}
                            className="w-24"
                          />
                        ) : (
                          `${multiplier.priceMultiplier}x`
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={multiplier.isActive ? "default" : "secondary"}>
                          {multiplier.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {editingItem?.id === multiplier.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleUpdate(editingItem)}
                                disabled={updateMutation.isPending}
                                data-testid={`button-save-weight-range-${multiplier.id}`}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingItem(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingItem({ 
                                  ...multiplier, 
                                  minWeight: multiplier.minWeight.toString(),
                                  maxWeight: multiplier.maxWeight?.toString() || "",
                                  priceMultiplier: multiplier.priceMultiplier.toString() 
                                })}
                                data-testid={`button-edit-weight-range-${multiplier.id}`}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteMutation.mutate(multiplier.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-weight-range-${multiplier.id}`}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                      No weight range price multipliers configured
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  balance: number;
  minimumBalance: number | null; // User-specific minimum balance limit in cents, null means use system default
  priceMultiplier: number; // Price multiplier specific for this user
  createdAt: string;
  companyName?: string | null;
  companyType?: string | null;
  taxIdNumber?: string | null;
  address?: string | null; // Legacy field kept for backward compatibility
  // New address fields for ShipEntegra format
  address1?: string | null; // Required primary address line (max 35 chars)
  address2?: string | null; // Optional secondary address line (max 35 chars) 
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  shipmentCapacity?: number;
  monthlyShipmentCapacity?: number | null;
  isApproved: boolean;
  rejectionReason?: string | null;
  approvedBy?: number | null;
  approvedAt?: string | null;
  canAccessCarrierLabels?: boolean; // Whether user can access third-party carrier labels
  canAccessReturnSystem?: boolean; // Whether user can access return management system
  returnSystemGrantedBy?: number | null; // Admin ID who granted return access
  returnSystemGrantedAt?: string | null; // When return access was granted
}

export default function ManageUsers() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddFundsDialogOpen, setIsAddFundsDialogOpen] = useState(false);
  const [isSetBalanceDialogOpen, setIsSetBalanceDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isPriceMultiplierDialogOpen, setIsPriceMultiplierDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isMinBalanceDialogOpen, setIsMinBalanceDialogOpen] = useState(false);
  const [isUserMinBalanceDialogOpen, setIsUserMinBalanceDialogOpen] = useState(false);
  const [isDefaultPriceMultiplierDialogOpen, setIsDefaultPriceMultiplierDialogOpen] = useState(false);
  const [isCountryPricingDialogOpen, setIsCountryPricingDialogOpen] = useState(false);
  const [isWeightRangePricingDialogOpen, setIsWeightRangePricingDialogOpen] = useState(false);
  const [showInsuranceManager, setShowInsuranceManager] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false); // State to force rerenders
  const [addAmount, setAddAmount] = useState<number | "">("");
  const [newBalance, setNewBalance] = useState<string | "">("");
  const [minBalance, setMinBalance] = useState<number | "">("");
  const [defaultPriceMultiplier, setDefaultPriceMultiplier] = useState<number | "">("");
  const [userMinBalance, setUserMinBalance] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  // Edit user form state
  const [editUserData, setEditUserData] = useState({
    username: "",
    name: "",
    email: "",
    phone: "",
    role: "",
    companyName: "",
    companyType: "",
    taxIdNumber: "",
    address: "", // Legacy field kept for backward compatibility
    // New ShipEntegra address fields
    address1: "",
    address2: "",
    city: "",
    postalCode: "",
    country: "",
    shipmentCapacity: "",
    priceMultiplier: ""
  });
  
  // New user form state
  const [newUser, setNewUser] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
    companyName: "",
  });

  // Fetch all users
  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users?limit=1000");
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      return res.json();
    },
    // Refresh user data every 5 seconds to keep balance up to date
    refetchInterval: 5000
  });
  
  // Fetch system settings
  const { data: systemSettings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/settings");
      if (!res.ok) {
        throw new Error("Failed to fetch system settings");
      }
      return res.json();
    }
  });
  
  // Create separate lists for approved, pending, and rejected users
  const approvedUsers = users
    ? users.filter((user: User) => user.isApproved === true)
    : [];
  
  const pendingUsers = users
    ? users.filter((user: User) => user.isApproved === false && !user.rejectionReason)
    : [];
    
  const rejectedUsers = users
    ? users.filter((user: User) => user.isApproved === false && user.rejectionReason)
    : [];
    
  // State for email verification section
  const [showVerificationView, setShowVerificationView] = useState(false);
  const { users: verificationUsers, isLoading: isVerificationLoading, resendVerification } = useVerificationManager();
  
  // Filter users based on search term and current tab
  const [activeTab, setActiveTab] = useState<'approved' | 'pending' | 'rejected'>('approved');
  
  const filteredUsers = (() => {
    let baseList = [];
    
    switch (activeTab) {
      case 'approved':
        baseList = approvedUsers;
        break;
      case 'pending':
        baseList = pendingUsers;
        break;
      case 'rejected':
        baseList = rejectedUsers;
        break;
    }
    
    return baseList.filter((user: User) => {
      if (searchTerm === "") return true;
      
      const searchLower = searchTerm.toLowerCase();
      const searchId = parseInt(searchTerm);
      
      return (
        user.name.toLowerCase().includes(searchLower) ||
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (!isNaN(searchId) && user.id === searchId)
      );
    });
  })();

  // Approve user mutation
  const approveUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      
      const res = await apiRequest("POST", `/api/users/${selectedUser.id}/approve`, {});
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to approve user");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User approved successfully",
        description: `${selectedUser?.name}'s account has been approved.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsApproveDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve user",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Reject user mutation
  const rejectUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !rejectionReason) return;
      
      const res = await apiRequest("POST", `/api/users/${selectedUser.id}/reject`, {
        rejectionReason: rejectionReason
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to reject user");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User rejected",
        description: `${selectedUser?.name}'s account has been rejected.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject user",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Grant return system access mutation
  const grantReturnAccessMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/users/${userId}/grant-return-access`, {});
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to grant return system access");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Return System Access Granted",
        description: `${data.user.name} now has access to the return management system.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to grant return access",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Revoke return system access mutation
  const revokeReturnAccessMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/users/${userId}/revoke-return-access`, {});
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to revoke return system access");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Return System Access Revoked",
        description: `${data.user.name} no longer has access to the return management system.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to revoke return access",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Add funds mutation
  const addFundsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !addAmount || typeof addAmount !== "number") return;
      
      const defaultDescription = addAmount > 0 
        ? `Admin fund addition to ${selectedUser.username}`
        : `Admin fund deduction from ${selectedUser.username}`;
      
      const res = await apiRequest("POST", "/api/balance/add", { 
        userId: selectedUser.id,
        amount: addAmount,
        description: description || defaultDescription
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add funds");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Balance adjusted successfully",
        description: `${selectedUser?.name}'s balance has been updated.`,
      });
      // Invalidate all related queries to ensure balance is updated everywhere
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      // Immediately refetch users to update balance display
      refetch();
      setIsAddFundsDialogOpen(false);
      setAddAmount("");
      setDescription("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to adjust balance",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Set balance mutation
  const setBalanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || newBalance === "") return;
      
      const res = await apiRequest("POST", "/api/balance/set", { 
        userId: selectedUser.id,
        balance: parseFloat(newBalance),
        description: description || `Admin balance adjustment for ${selectedUser.username}`
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to set balance");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Balance updated successfully",
        description: `${selectedUser?.name}'s balance has been set to ${data.formattedBalance}.`,
      });
      // Invalidate all related queries to ensure balance is updated everywhere
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      // Immediately refetch users to update balance display
      refetch();
      setIsSetBalanceDialogOpen(false);
      setNewBalance("");
      setDescription("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to set balance",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async () => {
      if (newUser.password !== newUser.confirmPassword) {
        throw new Error("Passwords do not match");
      }
      
      const userData = {
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        companyName: newUser.companyName,
        isApproved: true // Auto-approve users created by admin
      };
      
      const res = await apiRequest("POST", "/api/users/create", userData);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create user");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User created successfully",
        description: `User ${newUser.name} has been created.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddUserDialogOpen(false);
      setNewUser({
        username: "",
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "user",
        companyName: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create user",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      
      const userData = {
        username: editUserData.username,
        name: editUserData.name,
        email: editUserData.email,
        phone: editUserData.phone || null,
        role: editUserData.role,
        companyName: editUserData.companyName || null,
        companyType: editUserData.companyType || null,
        taxIdNumber: editUserData.taxIdNumber || null,
        address: editUserData.address || null, // Legacy field kept for backward compatibility
        // New ShipEntegra address fields
        address1: editUserData.address1 || null,
        address2: editUserData.address2 || null,
        city: editUserData.city || null,
        postalCode: editUserData.postalCode || null,
        country: editUserData.country || null,
        shipmentCapacity: editUserData.shipmentCapacity ? parseInt(editUserData.shipmentCapacity) : null,
        priceMultiplier: editUserData.priceMultiplier ? parseFloat(editUserData.priceMultiplier) : 1
      };
      
      const res = await apiRequest("PATCH", `/api/users/${selectedUser.id}`, userData);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update user");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User updated successfully",
        description: `${selectedUser?.name}'s information has been updated.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditUserDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update user",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Toggle carrier label access mutation
  const toggleCarrierLabelAccessMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      
      // Toggle the current value, defaulting to false if undefined
      const canAccess = !(selectedUser.canAccessCarrierLabels === true);
      
      const res = await apiRequest("POST", `/api/users/${selectedUser.id}/carrier-label-access`, {
        canAccess
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update carrier label access");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      const action = data.canAccessCarrierLabels ? "granted" : "revoked";
      toast({
        title: `Carrier label access ${action}`,
        description: `Third-party carrier label access has been ${action} for ${selectedUser?.name}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update carrier label access",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update minimum balance mutation
  const updateMinBalanceMutation = useMutation({
    mutationFn: async () => {
      if (minBalance === "") {
        throw new Error("Please enter a valid minimum balance");
      }
      
      const res = await apiRequest("POST", "/api/settings/min-balance", { 
        value: typeof minBalance === "number" ? minBalance / 100 : parseFloat(minBalance) / 100 
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update minimum balance");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Minimum balance updated",
        description: `System minimum balance has been set to ${data.formattedValue}.`,
      });
      // Invalidate settings query to update display
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setIsMinBalanceDialogOpen(false);
      setMinBalance("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update minimum balance",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update default price multiplier - system wide
  const updateDefaultPriceMultiplierMutation = useMutation({
    mutationFn: async () => {
      if (defaultPriceMultiplier === "") {
        throw new Error("Please enter a valid price multiplier");
      }
      
      const multiplierValue = typeof defaultPriceMultiplier === "number" 
        ? defaultPriceMultiplier 
        : parseFloat(defaultPriceMultiplier);
        
      if (isNaN(multiplierValue) || multiplierValue <= 0) {
        throw new Error("Price multiplier must be a positive number");
      }
      
      const res = await apiRequest("POST", "/api/settings/default-price-multiplier", { 
        value: multiplierValue
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update default price multiplier");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Default price multiplier updated",
        description: `Default price multiplier for new users has been set to ${data.value}.`,
      });
      
      // Close the dialog immediately
      setIsDefaultPriceMultiplierDialogOpen(false);
      setDefaultPriceMultiplier("");
      
      // Build a hard-coded updated settings object directly
      const updatedSettings = {
        ...systemSettings,
        defaultPriceMultiplier: {
          value: data.value,
          displayValue: data.value.toString()
        }
      };

      console.log("Setting updated data directly:", updatedSettings);
      
      // Directly set the cache with our manually created object
      queryClient.setQueryData(["/api/settings"], updatedSettings);
      
      // Force UI to rerender by toggling state
      setForceUpdate(prev => !prev);

      // Also invalidate queries to ensure future requests get fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      
      // Direct DOM manipulation with specific ID targeting and multiple attempts
      const updateDisplayElement = () => {
        try {
          // Find the element using the specific ID we added
          const displayElement = document.getElementById('default-price-multiplier-display');
          if (displayElement) {
            console.log("Found price multiplier display element by ID, updating content directly");
            displayElement.textContent = Number(data.value).toFixed(2);
            return true;
          } else {
            console.warn("Could not find price multiplier display element by ID");
            return false;
          }
        } catch (err) {
          console.error("Error during direct DOM manipulation:", err);
          return false;
        }
      };
      
      // Try immediately
      if (!updateDisplayElement()) {
        // If failed, try again after a short delay
        setTimeout(updateDisplayElement, 100);
        
        // And again after a longer delay as a final attempt
        setTimeout(updateDisplayElement, 500);
      }
      
      // Force page reload as a last resort if manually configured to do so
      // Note: This is commented out as it would cause the user to be logged out
      // if (document.location) document.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update default price multiplier",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update user minimum balance
  const updateUserMinBalanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      
      // userMinBalance will be stored as cents (integer)
      // null means use the system default setting
      let minBalanceValue = null;
      
      if (userMinBalance !== "") {
        // Simply pass the dollar value - server will handle conversion to cents
        const valueInDollars = typeof userMinBalance === "number" 
          ? userMinBalance 
          : parseFloat(String(userMinBalance));
          
        // No need to convert to cents in the client
        minBalanceValue = valueInDollars;
        console.log(`Sending user min balance: $${valueInDollars}`);
      }
      
      const res = await apiRequest("POST", `/api/users/${selectedUser.id}/min-balance`, { 
        value: minBalanceValue
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update user minimum balance");
      }
      
      return await res.json();
    },
    onSuccess: async (data) => {
      // API returns formattedValue directly
      const formattedValue = data.formattedValue || "System Default";
        
      toast({
        title: "Minimum balance updated",
        description: `${selectedUser?.name}'s minimum balance limit has been set to ${formattedValue}.`,
      });
      
      try {
        // First refresh the session to ensure updated user data
        console.log("Attempting to refresh user session after minimum balance update");
        const refreshRes = await apiRequest("POST", "/api/refresh-session", {});
        
        if (refreshRes.ok) {
          console.log("Session refreshed successfully after minimum balance update");
        } else {
          console.error("Failed to refresh session after minimum balance update");
        }
      } catch (error) {
        console.error("Error refreshing session:", error);
      }
      
      // Invalidate all related queries to ensure user data is updated
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // Immediately refetch users to update display
      refetch();
      setIsUserMinBalanceDialogOpen(false);
      setUserMinBalance("");
      setSelectedUser(null);
      
      // Explicit log message to confirm the update was processed
      console.log("User minimum balance updated successfully", data);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update minimum balance",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update price multiplier mutation (dedicated)
  const updatePriceMultiplierMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      
      const multiplier = parseFloat(editUserData.priceMultiplier);
      if (isNaN(multiplier) || multiplier <= 0) {
        throw new Error("Please enter a valid positive number for the price multiplier");
      }
      
      console.log(`Updating price multiplier for user ${selectedUser.id} to:`, multiplier);
      
      // Use a more complete user data update to ensure all required fields are sent
      const userData = {
        username: selectedUser.username,
        name: selectedUser.name,
        email: selectedUser.email,
        phone: selectedUser.phone || null,
        role: selectedUser.role,
        companyName: selectedUser.companyName || null,
        companyType: selectedUser.companyType || null,
        taxIdNumber: selectedUser.taxIdNumber || null,
        address: selectedUser.address || null,
        priceMultiplier: multiplier // Make sure this is a number, not a string
      };
      
      const res = await apiRequest("PATCH", `/api/users/${selectedUser.id}`, userData);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update price multiplier");
      }
      
      // Get the update response first
      const updateRes = await res.clone().json();
      console.log("Update response:", updateRes);
      
      // Double-check with a separate GET request to make sure we have the latest data
      const userRes = await apiRequest("GET", `/api/users/${selectedUser.id}`);
      if (!userRes.ok) {
        throw new Error("Updated price multiplier but failed to fetch updated user data");
      }
      
      const fetchedUser = await userRes.json();
      console.log("Fetched user after update:", fetchedUser);
      
      return fetchedUser; // Return the freshly fetched user data
    },
    onSuccess: async (updatedUser) => {
      // Check the multiplier value that was updated
      console.log("Successfully updated user with multiplier:", updatedUser.priceMultiplier);
      
      // Convert to number explicitly to ensure proper formatting
      const priceMultiplierValue = typeof updatedUser.priceMultiplier === 'number' 
        ? updatedUser.priceMultiplier 
        : parseFloat(String(updatedUser.priceMultiplier));
      
      toast({
        title: "Price multiplier updated",
        description: `${updatedUser.name}'s price multiplier has been updated to ${priceMultiplierValue.toFixed(2)}.`,
      });
      
      // Update the cache with the updated user data
      queryClient.setQueryData(["/api/users"], (oldData: User[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(user => user.id === updatedUser.id ? updatedUser : user);
      });
      
      // Also invalidate to ensure fresh data on next query
      await queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      await refetch();
      
      // Close the dialog
      setIsPriceMultiplierDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update price multiplier",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      
      // Validate passwords
      if (!newPassword || newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }
      
      if (newPassword !== confirmNewPassword) {
        throw new Error("Passwords do not match");
      }
      
      const res = await apiRequest("POST", `/api/users/${selectedUser.id}/reset-password`, {
        newPassword: newPassword
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to reset password");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset successfully",
        description: `${selectedUser?.name}'s password has been reset.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsResetPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmNewPassword("");
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reset password",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      
      const res = await apiRequest("DELETE", `/api/users/${selectedUser.id}`, {});
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete user");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User deleted successfully",
        description: `User ${selectedUser?.name} has been deleted.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDeleteConfirmOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleAddFunds = (userData: User) => {
    setSelectedUser(userData);
    setIsAddFundsDialogOpen(true);
  };
  
  const handleSetBalance = (userData: User) => {
    setSelectedUser(userData);
    setNewBalance(""); // Start with empty field to prevent auto-fill interference
    setIsSetBalanceDialogOpen(true);
  };

  const handleDeleteUser = (userData: User) => {
    setSelectedUser(userData);
    setIsDeleteConfirmOpen(true);
  };
  
  const handleApproveUser = (userData: User) => {
    setSelectedUser(userData);
    setIsApproveDialogOpen(true);
  };
  
  const handleRejectUser = (userData: User) => {
    setSelectedUser(userData);
    setIsRejectDialogOpen(true);
  };

  // Financial Activity Dialog state
  const [isFinancialActivityDialogOpen, setIsFinancialActivityDialogOpen] = useState(false);
  const [financialActivities, setFinancialActivities] = useState<any[]>([]);
  const [isLoadingMoreActivities, setIsLoadingMoreActivities] = useState(false);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const [activitiesOffset, setActivitiesOffset] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleViewFinancialActivity = async (userData: User) => {
    setSelectedUser(userData);
    setIsFinancialActivityDialogOpen(true);
    setFinancialActivities([]);
    setActivitiesOffset(0);
    setHasMoreActivities(true);
    
    // Fetch initial financial activities for this user
    await loadFinancialActivities(userData.id, 0, true);
  };

  const loadFinancialActivities = useCallback(async (userId: number, offset: number = 0, isInitial: boolean = false) => {
    if (!isInitial && isLoadingMoreActivities) return;
    
    setIsLoadingMoreActivities(true);
    
    try {
      const limit = 50;
      const res = await apiRequest("GET", `/api/users/${userId}/financial-activity?limit=${limit}&offset=${offset}`);
      if (res.ok) {
        const newActivities = await res.json();
        
        if (isInitial) {
          setFinancialActivities(newActivities);
        } else {
          setFinancialActivities(prev => [...prev, ...newActivities]);
        }
        
        // If we got less than the limit, we've reached the end
        setHasMoreActivities(newActivities.length === limit);
        setActivitiesOffset(offset + limit);
      }
    } catch (error) {
      console.error("Failed to fetch financial activities:", error);
    } finally {
      setIsLoadingMoreActivities(false);
    }
  }, [isLoadingMoreActivities]);


  // Scroll detection for infinite scroll
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !hasMoreActivities || isLoadingMoreActivities || !selectedUser) return;
    
    const container = scrollContainerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    // Load more when scrolled near the bottom (within 100px)
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadFinancialActivities(selectedUser.id, activitiesOffset, false);
    }
  }, [hasMoreActivities, isLoadingMoreActivities, selectedUser, activitiesOffset, loadFinancialActivities]);

  // Set up scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  const handleDownloadUserActions = async (userData: User) => {
    try {
      // Make authenticated fetch request to get CSV data
      const response = await fetch(`/api/users/${userData.id}/actions-report`, {
        method: 'GET',
        credentials: 'include', // Include session cookies for authentication
        headers: {
          'Accept': 'text/csv'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the CSV content as blob
      const csvBlob = await response.blob();
      
      // Create download URL and trigger download
      const downloadUrl = window.URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${userData.username}_actions_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Download started",
        description: `User actions report for ${userData.name} is downloading.`,
      });
    } catch (error) {
      console.error("Failed to download user actions:", error);
      toast({
        title: "Download failed",
        description: "Failed to download user actions report. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleViewDetails = (userData: User) => {
    setSelectedUser(userData);
    setIsViewDetailsOpen(true);
  };
  
  const handleEditUser = (userData: User) => {
    setSelectedUser(userData);
    setEditUserData({
      username: userData.username,
      name: userData.name,
      email: userData.email,
      phone: userData.phone || "",
      role: userData.role,
      companyName: userData.companyName || "",
      companyType: userData.companyType || "",
      taxIdNumber: userData.taxIdNumber || "",
      address: userData.address || "", // Legacy field
      // New ShipEntegra address fields
      address1: userData.address1 || "",
      address2: userData.address2 || "",
      city: userData.city || "",
      postalCode: userData.postalCode || "",
      country: userData.country || "",
      shipmentCapacity: userData.shipmentCapacity ? String(userData.shipmentCapacity) : "",
      priceMultiplier: userData.priceMultiplier ? String(userData.priceMultiplier) : "1"
    });
    setIsEditUserDialogOpen(true);
  };
  
  // Helper function to open the price multiplier dialog with fresh data
  const handleResetPassword = (userData: User) => {
    setSelectedUser(userData);
    setNewPassword("");
    setConfirmNewPassword("");
    setIsResetPasswordDialogOpen(true);
  };
  
  // Helper function to toggle carrier label access
  const handleToggleCarrierLabelAccess = (userData: User) => {
    setSelectedUser(userData);
    toggleCarrierLabelAccessMutation.mutate();
  }

  const handleToggleReturnSystemAccess = (userData: User) => {
    if (!userData.canAccessReturnSystem) {
      // Grant access
      grantReturnAccessMutation.mutate(userData.id);
    } else {
      // Revoke access
      revokeReturnAccessMutation.mutate(userData.id);
    }
  };
  
  const handleOpenUserMinBalanceDialog = (userData: User) => {
    setSelectedUser(userData);
    // Initialize with the current value or empty string for default
    let initialValue: number | "" = "";
    
    if (userData.minimumBalance !== null && userData.minimumBalance !== undefined) {
      // Convert cents to dollars for display (minimumBalance is stored in cents in the database)
      const valueInDollars = userData.minimumBalance / 100;
      initialValue = valueInDollars;
      console.log(`Initializing user min balance form: ${userData.minimumBalance} cents → $${valueInDollars}`);
    }
    
    setUserMinBalance(initialValue);
    setIsUserMinBalanceDialogOpen(true);
  };
  
  const handleOpenPriceMultiplierDialog = async (userData: User) => {
    try {
      // Force a refresh of the users data first
      await queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      await refetch();
      
      // Directly fetch the latest data for this specific user to ensure we have the current multiplier
      const res = await apiRequest("GET", `/api/users/${userData.id}`);
      
      if (res.ok) {
        const freshUserData = await res.json();
        console.log("Fresh user data for price multiplier:", freshUserData);
        
        setSelectedUser(freshUserData);
        setEditUserData({
          ...editUserData,
          priceMultiplier: freshUserData.priceMultiplier ? String(freshUserData.priceMultiplier) : "1"
        });
      } else {
        // If direct fetch fails, use the data from the refreshed list
        const refreshedList = await queryClient.getQueryData(["/api/users"]) as User[];
        const refreshedUser = refreshedList?.find((u: User) => u.id === userData.id) || userData;
        
        setSelectedUser(refreshedUser);
        setEditUserData({
          ...editUserData,
          priceMultiplier: refreshedUser.priceMultiplier ? String(refreshedUser.priceMultiplier) : "1"
        });
      }
      
      // Open the dialog after setting data
      setIsPriceMultiplierDialogOpen(true);
    } catch (error) {
      console.error("Error fetching fresh user data:", error);
      toast({
        title: "Error fetching data",
        description: "Could not get the latest user information. Please try again.",
        variant: "destructive",
      });
      
      // Fallback to using the provided user data
      setSelectedUser(userData);
      setEditUserData({
        ...editUserData,
        priceMultiplier: userData.priceMultiplier ? String(userData.priceMultiplier) : "1"
      });
      setIsPriceMultiplierDialogOpen(true);
    }
  };

  const handleSubmitAddFunds = () => {
    if (!addAmount || typeof addAmount !== "number" || addAmount === 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount (cannot be zero).",
        variant: "destructive",
      });
      return;
    }
    
    addFundsMutation.mutate();
  };
  
  const handleSubmitSetBalance = () => {
    if (newBalance === "" || isNaN(parseFloat(newBalance))) {
      toast({
        title: "Invalid balance",
        description: "Please enter a valid balance amount.",
        variant: "destructive",
      });
      return;
    }
    
    setBalanceMutation.mutate();
  };
  
  const handleSubmitMinBalance = () => {
    if (minBalance === "" || isNaN(Number(minBalance))) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount for minimum balance.",
        variant: "destructive",
      });
      return;
    }
    
    updateMinBalanceMutation.mutate();
  };
  
  const handleSubmitDefaultPriceMultiplier = () => {
    if (defaultPriceMultiplier === "" || isNaN(Number(defaultPriceMultiplier))) {
      toast({
        title: "Invalid multiplier",
        description: "Please enter a valid number for the price multiplier.",
        variant: "destructive",
      });
      return;
    }
    
    const value = Number(defaultPriceMultiplier);
    if (value <= 0) {
      toast({
        title: "Invalid multiplier",
        description: "Price multiplier must be a positive number.",
        variant: "destructive",
      });
      return;
    }
    
    updateDefaultPriceMultiplierMutation.mutate();
  };
  
  const handleSubmitUserMinBalance = () => {
    // Empty string is allowed (use system default)
    if (userMinBalance !== "" && isNaN(Number(userMinBalance))) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount for minimum balance.",
        variant: "destructive",
      });
      return;
    }
    
    updateUserMinBalanceMutation.mutate();
  };
  
  const handleOpenMinBalanceDialog = () => {
    if (systemSettings?.minBalance) {
      setMinBalance(systemSettings.minBalance.value);
    } else {
      setMinBalance(-10000); // Default value of -$100 if not set
    }
    setIsMinBalanceDialogOpen(true);
  };
  
  const handleOpenDefaultPriceMultiplierDialog = () => {
    // First, refetch the latest settings from the server
    queryClient.invalidateQueries({ queryKey: ["/api/settings"] }).then(() => {
      // Fetch the latest settings directly from the API
      apiRequest("GET", "/api/settings").then(async (res) => {
        if (res.ok) {
          const latestSettings = await res.json();
          console.log("Fetched latest settings for dialog:", latestSettings);
          
          // Use the latest value from the fetched settings
          if (latestSettings?.defaultPriceMultiplier && latestSettings.defaultPriceMultiplier.value !== undefined) {
            const currentValue = Number(latestSettings.defaultPriceMultiplier.value);
            console.log("Setting default price multiplier input to:", currentValue);
            setDefaultPriceMultiplier(currentValue);
          } else {
            console.log("No default price multiplier in settings, using default 1.45");
            setDefaultPriceMultiplier(1.45); // Default value
          }
          
          // Now open the dialog with the latest value
          setIsDefaultPriceMultiplierDialogOpen(true);
        } else {
          // Fallback to using the cached settings
          console.log("Failed to fetch latest settings, using cached values");
          if (systemSettings?.defaultPriceMultiplier && systemSettings.defaultPriceMultiplier.value !== undefined) {
            setDefaultPriceMultiplier(systemSettings.defaultPriceMultiplier.value);
          } else {
            setDefaultPriceMultiplier(1.45); // Default value
          }
          setIsDefaultPriceMultiplierDialogOpen(true);
        }
      }).catch((error) => {
        console.error("Error fetching settings:", error);
        // Fallback path in case of error
        if (systemSettings?.defaultPriceMultiplier && systemSettings.defaultPriceMultiplier.value !== undefined) {
          setDefaultPriceMultiplier(systemSettings.defaultPriceMultiplier.value);
        } else {
          setDefaultPriceMultiplier(1.45); // Default value
        }
        setIsDefaultPriceMultiplierDialogOpen(true);
      });
    });
  };

  const handleOpenCountryPricingDialog = () => {
    setIsCountryPricingDialogOpen(true);
  };

  const handleOpenWeightRangePricingDialog = () => {
    setIsWeightRangePricingDialogOpen(true);
  };
  
  const handleNewUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleEditUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmitEditUser = () => {
    if (!editUserData.username || !editUserData.name || !editUserData.email) {
      toast({
        title: "Missing required fields",
        description: "Please fill out all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    updateUserMutation.mutate();
  };
  
  const handleSubmitPriceMultiplier = () => {
    if (!selectedUser) return;
    
    // Validation is now handled in the mutation
    updatePriceMultiplierMutation.mutate();
  };

  const handleSubmitResetPassword = () => {
    if (!selectedUser) return;
    
    // Validation is handled in the mutation
    resetPasswordMutation.mutate();
  };

  const handleSubmitNewUser = () => {
    if (!newUser.username || !newUser.name || !newUser.email || !newUser.password) {
      toast({
        title: "Missing required fields",
        description: "Please fill out all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    if (newUser.password !== newUser.confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }
    
    createUserMutation.mutate();
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">User Management</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/admin-user-notification-preferences">
              <Button variant="outline" data-testid="button-notification-preferences">
                <Bell className="mr-2 h-4 w-4" />
                User Notifications
              </Button>
            </Link>
            <Button onClick={() => setIsAddUserDialogOpen(true)} variant="default">
              <UserPlus className="mr-2 h-4 w-4" />
              Add New User
            </Button>
            <div className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              <span className="text-muted-foreground">
                {isLoading ? "Loading..." : isError ? "Error" : `${users?.length || 0} users`}
              </span>
            </div>
          </div>
        </div>



        {/* System Settings Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              System Settings
            </CardTitle>
            <CardDescription>
              Configure global system settings that affect all users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Balance Controls</h3>
                <div className="flex items-center justify-between border p-4 rounded-md mb-4">
                  <div>
                    <h4 className="font-medium">Minimum Balance Limit</h4>
                    <p className="text-sm text-muted-foreground">
                      Set how negative a user's balance can go
                    </p>
                    <p className="mt-1 font-medium">
                      Current: <span className="text-blue-600">{
                        isSettingsLoading ? "Loading..." : 
                        (systemSettings?.minBalance ? 
                          systemSettings.minBalance.formattedValue : 
                          "Not set"
                        )
                      }</span>
                    </p>
                  </div>
                  <Button onClick={handleOpenMinBalanceDialog} variant="outline">
                    <MinusCircle className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
                
                <div className="flex items-center justify-between border p-4 rounded-md">
                  <div>
                    <h4 className="font-medium">Default Price Multiplier</h4>
                    <p className="text-sm text-muted-foreground">
                      Set the default price multiplier for new user registrations
                    </p>
                    <p className="mt-1 font-medium">
                      Current: <span className="text-blue-600" id="default-price-multiplier-display">{
                        isSettingsLoading ? "Loading..." : 
                        (systemSettings?.defaultPriceMultiplier && systemSettings.defaultPriceMultiplier.value !== undefined ? 
                          // Force parse to number and format to 2 decimal places
                          Number(systemSettings.defaultPriceMultiplier.value).toFixed(2) : 
                          "1.45 (Default)"
                        )
                      }</span>
                      {forceUpdate ? "" : ""} {/* This is just to make the component rerender when forceUpdate changes */}
                    </p>
                  </div>
                  <Button onClick={handleOpenDefaultPriceMultiplierDialog} variant="outline">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Shipping Insurance</h3>
                <div className="border p-4 rounded-md">
                  <h4 className="font-medium mb-2">Insurance Ranges</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Define value ranges and insurance costs for shipping protection
                  </p>
                  <Button 
                    onClick={() => setShowInsuranceManager(!showInsuranceManager)} 
                    variant="outline"
                  >
                    {showInsuranceManager ? "Hide Insurance Manager" : "Manage Insurance Ranges"}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Insurance Range Management Component */}
            {showInsuranceManager && (
              <div className="mt-6">
                <InsuranceRangeManagement />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Manage users, account balances, and perform administrative actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="approved"
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'approved' | 'pending' | 'rejected')}
              className="mb-6"
            >
              <TabsList className="grid grid-cols-3 w-[400px]">
                <TabsTrigger value="approved" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Approved
                  <Badge variant="secondary" className="ml-1">{approvedUsers.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4" />
                  Pending
                  <Badge variant="secondary" className="ml-1">{pendingUsers.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="rejected" className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Rejected
                  <Badge variant="secondary" className="ml-1">{rejectedUsers.length}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* Pending tab content with options for verification or approval */}
            {activeTab === 'pending' && (
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Pending User Management</h3>
                  <Button 
                    variant={showVerificationView ? "outline" : "default"}
                    onClick={() => setShowVerificationView(!showVerificationView)}
                    className="flex items-center gap-2"
                  >
                    {showVerificationView ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Show Approval View
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Show Verification View
                      </>
                    )}
                  </Button>
                </div>
                {showVerificationView ? null : (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-2">
                      Manage users awaiting approval. Users must verify their email before they can be approved.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Show either the regular user table or verification view */}
            {activeTab === 'pending' && showVerificationView ? (
              <div className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isVerificationLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <div className="flex flex-col items-center justify-center">
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                              <p className="mt-2 text-sm text-muted-foreground">Loading verification data...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : verificationUsers && verificationUsers.length > 0 ? (
                        verificationUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{user.name}</span>
                                <span className="text-xs text-muted-foreground">{user.username}</span>
                              </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              {user.isEmailVerified ? (
                                <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                                  <AlertCircle className="h-3.5 w-3.5 mr-1" />
                                  Not Verified
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              {!user.isEmailVerified && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => resendVerification(user.id)}
                                  disabled={isVerificationLoading}
                                  className="ml-2"
                                >
                                  <Mail className="h-3.5 w-3.5 mr-1" />
                                  Resend Email
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <p className="text-muted-foreground">No users found requiring verification.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <UserTable 
                users={filteredUsers} 
                isLoading={isLoading} 
                showPagination={true}
                showApprovalActions={activeTab === 'pending'}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onApprove={handleApproveUser}
                onReject={handleRejectUser}
                onEdit={(userId) => {
                  const user = users?.find((u: User) => u.id === userId);
                  if (user) handleEditUser(user);
                }}
                onResetPassword={(userId) => {
                  const user = users?.find((u: User) => u.id === userId);
                  if (user) handleResetPassword(user);
                }}
                onResendVerification={(userId) => {
                  // Call the resendVerification function from the verification manager hook
                  resendVerification(userId);
                }}
                actions={(user) => (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                        <User className="mr-2 h-4 w-4 text-blue-500" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditUser(user)}>
                        <UserCog className="mr-2 h-4 w-4 text-indigo-500" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenPriceMultiplierDialog(user)}>
                        <DollarSign className="mr-2 h-4 w-4 text-blue-500" />
                        Edit Price Multiplier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenCountryPricingDialog()}>
                        <Calculator className="mr-2 h-4 w-4 text-green-500" />
                        Manage Country Pricing
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenWeightRangePricingDialog()}>
                        <Calculator className="mr-2 h-4 w-4 text-yellow-500" />
                        Manage Weight Range Pricing
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenUserMinBalanceDialog(user)}>
                        <MinusCircle className="mr-2 h-4 w-4 text-purple-500" />
                        Set Minimum Balance
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                        <KeyIcon className="mr-2 h-4 w-4 text-orange-500" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {/* Only show carrier label access toggle for normal users, not for admins */}
                      {user.role === "user" && user.isApproved && (
                        <DropdownMenuItem onClick={() => handleToggleCarrierLabelAccess(user)}>
                          <ClipboardCheck className="mr-2 h-4 w-4 text-purple-500" />
                          {user.canAccessCarrierLabels ? "Revoke Carrier Label Access" : "Grant Carrier Label Access"}
                        </DropdownMenuItem>
                      )}
                      {/* Return system access controls for normal users */}
                      {user.role === "user" && user.isApproved && (
                        <DropdownMenuItem onClick={() => handleToggleReturnSystemAccess(user)}>
                          <Package className="mr-2 h-4 w-4 text-indigo-500" />
                          {user.canAccessReturnSystem ? "Revoke Return System Access" : "Grant Return System Access"}
                        </DropdownMenuItem>
                      )}
                      {!user.isApproved && (
                        <>
                          <DropdownMenuItem onClick={() => handleApproveUser(user)}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            Approve User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRejectUser(user)}>
                            <XCircle className="mr-2 h-4 w-4 text-amber-500" />
                            Reject User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onClick={() => handleAddFunds(user)}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Adjust Funds
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSetBalance(user)}>
                        <Calculator className="mr-2 h-4 w-4" />
                        Set Balance
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleViewFinancialActivity(user)}>
                        <DollarSign className="mr-2 h-4 w-4 text-green-500" />
                        View Financial Activity
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownloadUserActions(user)}>
                        <Download className="mr-2 h-4 w-4 text-blue-500" />
                        Download User Actions
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteUser(user)}
                        disabled={user.role === "admin" && user.id === 1} // Prevent deleting main admin
                        className={user.role === "admin" && user.id === 1 ? "text-muted-foreground" : "text-destructive"}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Funds Dialog */}
      <Dialog open={isAddFundsDialogOpen} onOpenChange={setIsAddFundsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adjust User Funds</DialogTitle>
            <DialogDescription>
              Add or deduct funds from {selectedUser?.name}'s account balance. Use positive values to add funds, negative values to deduct.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                User
              </Label>
              <div className="col-span-3">
                <Input id="name" value={selectedUser?.name || ""} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currentBalance" className="text-right">
                Current Balance
              </Label>
              <div className="col-span-3">
                <Input 
                  id="currentBalance" 
                  value={`$${((selectedUser?.balance || 0) / 100).toFixed(2)}`} 
                  readOnly 
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <div className="col-span-3">
                <Input
                  id="amount"
                  placeholder="50.00 or -50.00"
                  type="number"
                  step="0.01"
                  value={addAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAddAmount(value === "" ? "" : parseFloat(value));
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter positive value to add, negative value to deduct
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <div className="col-span-3">
                <Input
                  id="description"
                  placeholder="Reason for adjusting funds"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              onClick={handleSubmitAddFunds}
              disabled={addFundsMutation.isPending}
            >
              {addFundsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Adjust Funds
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Minimum Balance Dialog */}
      <Dialog open={isMinBalanceDialogOpen} onOpenChange={setIsMinBalanceDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <MinusCircle className="mr-2 h-5 w-5" />
              Configure Minimum Balance
            </DialogTitle>
            <DialogDescription>
              Set how negative a user's balance can go. This defines the credit limit for all users in the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="minBalance">Minimum Balance Amount (in cents)</Label>
              <div className="flex items-center">
                <span className="text-lg font-medium mr-2">$</span>
                <Input
                  id="minBalance"
                  type="number"
                  placeholder="-100.00"
                  value={typeof minBalance === "number" ? (minBalance / 100).toFixed(2) : ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setMinBalance("");
                    } else {
                      // Convert to cents (store as integer)
                      const valueInCents = Math.round(parseFloat(value) * 100);
                      setMinBalance(valueInCents);
                    }
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Use a negative value (e.g. -100.00) to allow users to have a negative balance. 
                This acts as a credit limit.
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-md">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Important Note</h4>
                  <p className="text-sm text-yellow-700">
                    This setting applies to all users in the system. Users will not be able to make 
                    payments if their balance would drop below this limit.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsMinBalanceDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={handleSubmitMinBalance}
              disabled={updateMinBalanceMutation.isPending}
            >
              {updateMinBalanceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Setting"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Default Price Multiplier Dialog */}
      <Dialog open={isDefaultPriceMultiplierDialogOpen} onOpenChange={setIsDefaultPriceMultiplierDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Configure Default Price Multiplier
            </DialogTitle>
            <DialogDescription>
              Set the default price multiplier for new user registrations. This affects the pricing for all newly registered users.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="defaultPriceMultiplier">Default Price Multiplier</Label>
              <Input
                id="defaultPriceMultiplier"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="1.45"
                value={defaultPriceMultiplier}
                onChange={(e) => {
                  const value = e.target.value;
                  setDefaultPriceMultiplier(value === "" ? "" : parseFloat(value));
                }}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Standard pricing is 1.0. Use values below 1.0 for discounts (e.g., 0.9 for 10% off) or above 1.0 for premiums (e.g., 1.1 for 10% extra).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDefaultPriceMultiplierDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitDefaultPriceMultiplier}
              disabled={updateDefaultPriceMultiplierMutation.isPending}
            >
              {updateDefaultPriceMultiplierMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* User Minimum Balance Dialog */}
      <Dialog open={isUserMinBalanceDialogOpen} onOpenChange={setIsUserMinBalanceDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <MinusCircle className="mr-2 h-5 w-5" />
              Set User Minimum Balance
            </DialogTitle>
            <DialogDescription>
              Set how negative this specific user's balance can go. This overrides the global system setting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                User
              </Label>
              <div className="col-span-3">
                <Input id="username" value={selectedUser?.name || ""} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currentBalance" className="text-right">
                Current Balance
              </Label>
              <div className="col-span-3">
                <Input 
                  id="currentBalance" 
                  value={`$${((selectedUser?.balance || 0) / 100).toFixed(2)}`} 
                  readOnly 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userMinBalance">User Minimum Balance Limit</Label>
              <div className="flex items-center">
                <span className="text-lg font-medium mr-2">$</span>
                <Input
                  id="userMinBalance"
                  type="number"
                  placeholder="-100.00"
                  value={typeof userMinBalance === "number" ? String(userMinBalance) : userMinBalance}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setUserMinBalance("");
                    } else {
                      // Store the raw number value (in dollars) in state 
                      // We'll convert to cents only when sending to the API
                      const valueInDollars = parseFloat(value);
                      console.log(`Setting user min balance to: $${valueInDollars}`);
                      setUserMinBalance(valueInDollars);
                    }
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Use a negative value (e.g. -100.00) to allow the user to have a negative balance.
                Leave empty to use the global system default.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-md">
              <div className="flex items-start">
                <InfoIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">User-Specific Setting</h4>
                  <p className="text-sm text-blue-700">
                    This setting applies only to {selectedUser?.name}. It overrides the global system minimum balance limit.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsUserMinBalanceDialogOpen(false);
                setSelectedUser(null);
                setUserMinBalance("");
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={handleSubmitUserMinBalance}
              disabled={updateUserMinBalanceMutation.isPending}
            >
              {updateUserMinBalanceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Setting"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system. Users created by admin are automatically approved.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username*
              </Label>
              <div className="col-span-3">
                <Input
                  id="username"
                  name="username"
                  placeholder="Username for login"
                  value={newUser.username}
                  onChange={handleNewUserInputChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Full Name*
              </Label>
              <div className="col-span-3">
                <Input
                  id="name"
                  name="name"
                  placeholder="User's full name"
                  value={newUser.name}
                  onChange={handleNewUserInputChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email*
              </Label>
              <div className="col-span-3">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUser.email}
                  onChange={handleNewUserInputChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password*
              </Label>
              <div className="col-span-3">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={handleNewUserInputChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirmPassword" className="text-right">
                Confirm Password*
              </Label>
              <div className="col-span-3">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newUser.confirmPassword}
                  onChange={handleNewUserInputChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <div className="col-span-3">
                <select 
                  id="role"
                  name="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="companyName" className="text-right">
                Company Name
              </Label>
              <div className="col-span-3">
                <Input
                  id="companyName"
                  name="companyName"
                  placeholder="Company name (optional)"
                  value={newUser.companyName}
                  onChange={handleNewUserInputChange}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              onClick={handleSubmitNewUser}
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve User Dialog */}
      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve <strong>{selectedUser?.name}</strong>'s account? This will allow them to log in and use the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approveUserMutation.mutate()}
              className="bg-green-600 text-white hover:bg-green-700"
              disabled={approveUserMutation.isPending}
            >
              {approveUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve User
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Set Balance Dialog */}
      <Dialog open={isSetBalanceDialogOpen} onOpenChange={setIsSetBalanceDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set User Balance</DialogTitle>
            <DialogDescription>
              Directly set {selectedUser?.name}'s account balance to a specific amount.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="userName" className="text-right">
                User
              </Label>
              <div className="col-span-3">
                <Input id="userName" value={selectedUser?.name || ""} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currentBalanceView" className="text-right">
                Current Balance
              </Label>
              <div className="col-span-3">
                <Input 
                  id="currentBalanceView" 
                  value={`$${((selectedUser?.balance || 0) / 100).toFixed(2)}`} 
                  readOnly 
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newBalance" className="text-right">
                New Balance
              </Label>
              <div className="col-span-3">
                <Input
                  id="newBalance"
                  placeholder="-500.00"
                  type="number"
                  step="0.01"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="balanceDescription" className="text-right">
                Description
              </Label>
              <div className="col-span-3">
                <Input
                  id="balanceDescription"
                  placeholder="Reason for adjusting balance"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              onClick={handleSubmitSetBalance}
              disabled={setBalanceMutation.isPending}
            >
              {setBalanceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Set Balance
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject User Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject User Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting <strong>{selectedUser?.name}</strong>'s application.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rejectionReason" className="text-right">
                Reason*
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="rejectionReason"
                  placeholder="Provide a detailed explanation for the rejection"
                  value={rejectionReason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectionReason(e.target.value)}
                  className="min-h-[100px]"
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              type="submit" 
              onClick={() => rejectUserMutation.mutate()}
              disabled={rejectUserMutation.isPending || !rejectionReason}
            >
              {rejectUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user <strong>{selectedUser?.name}</strong> and remove all their data from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete User
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-500" />
              User Details
            </DialogTitle>
            <DialogDescription>
              View complete user information.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-lg border border-blue-100/80">
                <div className="flex items-center">
                  <div className="bg-blue-100 h-12 w-12 rounded-full flex items-center justify-center text-blue-600 mr-4">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-medium text-lg text-gray-900">{selectedUser.name}</h3>
                    <p className="text-sm text-gray-500">User ID: #{selectedUser.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-blue-600">
                    {selectedUser.isApproved 
                      ? "Approved User" 
                      : selectedUser.rejectionReason 
                        ? "Rejected User" 
                        : "Pending Approval"}
                  </div>
                  <div className="text-sm text-gray-500">Registered: {formatDate(selectedUser.createdAt)}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                    <User className="h-4 w-4 mr-1 text-blue-500" />
                    Account Information
                  </h3>
                  <div className="bg-gray-50/80 p-4 rounded-md border border-gray-100">
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">Username</div>
                        <div className="col-span-2 font-medium">{selectedUser.username}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">Full Name</div>
                        <div className="col-span-2 font-medium">{selectedUser.name}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">Email</div>
                        <div className="col-span-2 font-medium text-blue-600">{selectedUser.email}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">Phone</div>
                        <div className="col-span-2 font-medium">{selectedUser.phone || '-'}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">Role</div>
                        <div className="col-span-2">
                          <Badge variant={selectedUser.role === "admin" ? "default" : "outline"}>
                            {selectedUser.role}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">Status</div>
                        <div className="col-span-2">
                          {selectedUser.isApproved ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              Approved
                            </Badge>
                          ) : selectedUser.rejectionReason ? (
                            <Badge variant="outline" className="bg-red-100 text-red-800">
                              Rejected
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-100 text-amber-800">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">Registered</div>
                        <div className="col-span-2 font-medium">{formatDate(selectedUser.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                    <ClipboardCheck className="h-4 w-4 mr-1 text-blue-500" />
                    Company Information
                  </h3>
                  <div className="bg-gray-50/80 p-4 rounded-md border border-gray-100">
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">Company Name</div>
                        <div className="col-span-2 font-medium">{selectedUser.companyName || '-'}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">Company Type</div>
                        <div className="col-span-2">
                          {selectedUser.companyType === 'business' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Business
                            </span>
                          ) : selectedUser.companyType === 'individual' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Individual
                            </span>
                          ) : '-'}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">
                          {selectedUser.companyType === 'business' ? 'Tax ID Number' : 'TCKN'}
                        </div>
                        <div className="col-span-2 font-medium">{selectedUser.taxIdNumber || '-'}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">Address</div>
                        <div className="col-span-2">
                          {selectedUser.address1 ? (
                            <div className="space-y-1">
                              <div>{selectedUser.address1}</div>
                              {selectedUser.address2 && <div>{selectedUser.address2}</div>}
                              <div>
                                {[
                                  selectedUser.city, 
                                  selectedUser.postalCode, 
                                  selectedUser.country
                                ]
                                  .filter(Boolean)
                                  .join(', ')}
                              </div>
                            </div>
                          ) : (
                            selectedUser.address || '-'
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Shipping Information Section */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                  <Package className="h-4 w-4 mr-1 text-blue-500" />
                  Shipping Information
                </h3>
                <div className="bg-gray-50/80 p-4 rounded-md border border-gray-100">
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-sm text-gray-500">Monthly Shipment Capacity</div>
                      <div className="col-span-2 font-medium">
                        {selectedUser.shipmentCapacity ? `${selectedUser.shipmentCapacity} shipments per month` : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Financial Information Section */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                  <Wallet className="h-4 w-4 mr-1 text-blue-500" />
                  Financial Information
                </h3>
                <div className="bg-gray-50/80 p-4 rounded-md border border-gray-100">
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-sm text-gray-500">Current Balance</div>
                      <div className="col-span-2 font-medium text-green-600">
                        ${(selectedUser.balance / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* If user is rejected, show rejection reason */}
              {selectedUser.rejectionReason && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                    <XCircle className="h-4 w-4 mr-1 text-red-500" />
                    Rejection Information
                  </h3>
                  <div className="bg-red-50/50 p-4 rounded-md border border-red-100">
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm text-gray-500">Reason</div>
                        <div className="col-span-2 text-red-700">{selectedUser.rejectionReason}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setIsViewDetailsOpen(false)}>
              Close
            </Button>
            <div className="flex space-x-2">
              {selectedUser && !selectedUser.isApproved && !selectedUser.rejectionReason && (
                <>
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      setIsViewDetailsOpen(false);
                      handleRejectUser(selectedUser);
                    }}
                  >
                    <XIcon className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setIsViewDetailsOpen(false);
                      handleApproveUser(selectedUser);
                    }}
                  >
                    <CheckIcon className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                </>
              )}
              {selectedUser && (
                <Button 
                  onClick={() => {
                    setIsViewDetailsOpen(false);
                    handleAddFunds(selectedUser);
                  }}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Adjust Funds
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <UserCog className="h-5 w-5 mr-2 text-indigo-500" />
              Edit User Information
            </DialogTitle>
            <DialogDescription>
              Update {selectedUser?.name}'s account information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="edit_username" className="text-right text-sm">
                Username*
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit_username"
                  name="username"
                  placeholder="Username for login"
                  value={editUserData.username}
                  onChange={handleEditUserInputChange}
                  required
                  className="h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="edit_name" className="text-right text-sm">
                Full Name*
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit_name"
                  name="name"
                  placeholder="User's full name"
                  value={editUserData.name}
                  onChange={handleEditUserInputChange}
                  required
                  className="h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="edit_email" className="text-right text-sm">
                Email*
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit_email"
                  name="email"
                  type="email"
                  placeholder="user@example.com"
                  value={editUserData.email}
                  onChange={handleEditUserInputChange}
                  required
                  className="h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="edit_phone" className="text-right text-sm">
                Phone Number
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit_phone"
                  name="phone"
                  type="tel"
                  placeholder="+90 XXX XXX XX XX"
                  value={editUserData.phone}
                  onChange={handleEditUserInputChange}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Please include country code (e.g., +90 for Turkey)
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="edit_role" className="text-right text-sm">
                Role
              </Label>
              <div className="col-span-3">
                <select 
                  id="edit_role"
                  name="role"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editUserData.role}
                  onChange={handleEditUserInputChange}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            
            <div className="border-t pt-2 mt-1">
              <h3 className="text-sm font-medium mb-2">Company Information</h3>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="edit_companyName" className="text-right text-sm">
                Company Name
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit_companyName"
                  name="companyName"
                  placeholder="Company name"
                  value={editUserData.companyName}
                  onChange={handleEditUserInputChange}
                  className="h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="edit_companyType" className="text-right text-sm">
                Company Type
              </Label>
              <div className="col-span-3">
                <select 
                  id="edit_companyType"
                  name="companyType"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editUserData.companyType}
                  onChange={handleEditUserInputChange}
                >
                  <option value="">Select type</option>
                  <option value="business">Business</option>
                  <option value="individual">Individual</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="edit_taxIdNumber" className="text-right text-sm">
                Tax ID / TCKN
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit_taxIdNumber"
                  name="taxIdNumber"
                  placeholder="Tax identification number"
                  value={editUserData.taxIdNumber}
                  onChange={handleEditUserInputChange}
                  className="h-9"
                />
              </div>
            </div>
            {/* Legacy address field (hidden) */}
            <input 
              type="hidden" 
              name="address" 
              value={editUserData.address} 
              onChange={handleEditUserInputChange} 
            />
            
            {/* New structured address fields */}
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="edit_address1" className="text-right text-sm">
                Address*
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit_address1"
                  name="address1"
                  placeholder="Primary address line (max 35 characters)"
                  value={editUserData.address1}
                  onChange={handleEditUserInputChange}
                  className="h-9"
                  maxLength={35}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {editUserData.address1?.length || 0}/35 characters
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="edit_address2" className="text-right text-sm">
                Address Additional
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit_address2"
                  name="address2"
                  placeholder="Additional address line (optional, max 35 characters)"
                  value={editUserData.address2}
                  onChange={handleEditUserInputChange}
                  className="h-9"
                  maxLength={35}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {editUserData.address2?.length || 0}/35 characters
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="edit_city" className="text-right text-sm">
                City*
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit_city"
                  name="city"
                  placeholder="City"
                  value={editUserData.city}
                  onChange={handleEditUserInputChange}
                  className="h-9"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="edit_postalCode" className="text-right text-sm">
                Zip Code*
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit_postalCode"
                  name="postalCode"
                  placeholder="Postal/Zip code"
                  value={editUserData.postalCode}
                  onChange={handleEditUserInputChange}
                  className="h-9"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="edit_country" className="text-right text-sm">
                Country*
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit_country"
                  name="country"
                  placeholder="Country"
                  value={editUserData.country}
                  onChange={handleEditUserInputChange}
                  className="h-9"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="edit_shipmentCapacity" className="text-right text-sm">
                Monthly Capacity
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit_shipmentCapacity"
                  name="shipmentCapacity"
                  type="number"
                  placeholder="Monthly shipment capacity"
                  min="0"
                  value={editUserData.shipmentCapacity}
                  onChange={handleEditUserInputChange}
                  className="h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="edit_priceMultiplier" className="text-right text-sm">
                Price Multiplier
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit_priceMultiplier"
                  name="priceMultiplier"
                  type="number"
                  placeholder="Price multiplier (e.g., 1.0 for normal pricing, 0.9 for 10% discount)"
                  min="0.1"
                  step="0.01"
                  value={editUserData.priceMultiplier}
                  onChange={handleEditUserInputChange}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Sets a multiplier for this user's shipping prices. Default is 1.0 (100% of base price). 
                  Lower values give discounts (e.g., 0.9 = 10% off).
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditUserDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmitEditUser}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Multiplier Dialog */}
      <Dialog 
        open={isPriceMultiplierDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setIsPriceMultiplierDialogOpen(false);
          } else {
            // When opening, we're already fetching the latest data in the dropdown click handler
            setIsPriceMultiplierDialogOpen(true);
          }
        }}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-5 w-5 text-blue-500" />
              <DialogTitle>Edit Price Multiplier</DialogTitle>
            </div>
            <DialogDescription>
              Set custom pricing rates for {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-3">
            <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-1">
              <div className="flex gap-2">
                <InfoIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  The price multiplier is applied to all shipping prices for this user. 
                  A multiplier of 1.0 is standard pricing, 0.9 gives a 10% discount, 
                  and 1.1 adds a 10% premium.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="price_multiplier_user" className="text-right text-sm">
                User
              </Label>
              <div className="col-span-3">
                <Input 
                  id="price_multiplier_user" 
                  value={selectedUser?.name || ""} 
                  readOnly 
                  className="h-9 bg-muted/50"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="price_multiplier_company" className="text-right text-sm">
                Company
              </Label>
              <div className="col-span-3">
                <Input 
                  id="price_multiplier_company" 
                  value={selectedUser?.companyName || "Not specified"} 
                  readOnly 
                  className="h-9 bg-muted/50"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="price_multiplier_current" className="text-right text-sm">
                Current Value
              </Label>
              <div className="col-span-3">
                <Input 
                  id="price_multiplier_current" 
                  value={selectedUser?.priceMultiplier?.toFixed(2) || "1.00"} 
                  readOnly 
                  className="h-9 bg-muted/50 font-medium"
                />
              </div>
            </div>
            
            <Separator className="my-1" />
            
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="price_multiplier" className="text-right text-sm">
                New Multiplier
              </Label>
              <div className="col-span-3">
                <Input
                  id="price_multiplier"
                  name="priceMultiplier"
                  type="number"
                  placeholder="Enter new multiplier value"
                  min="0.1"
                  step="0.01"
                  value={editUserData.priceMultiplier}
                  onChange={handleEditUserInputChange}
                  className="h-9"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 mt-2 px-2">
              <div className="flex items-center">
                <p className="text-xs text-muted-foreground mr-2 min-w-[70px]">Examples:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs font-normal">1.00 = Standard price</Badge>
                  <Badge variant="outline" className="text-xs font-normal">0.90 = 10% Discount</Badge>
                  <Badge variant="outline" className="text-xs font-normal">1.10 = 10% Increase</Badge>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsPriceMultiplierDialogOpen(false)}
              className="sm:mr-2 w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmitPriceMultiplier}
              disabled={updatePriceMultiplierMutation.isPending}
              className="w-full sm:w-auto min-w-[120px]"
            >
              {updatePriceMultiplierMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Save Multiplier
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <KeyIcon className="mr-2 h-5 w-5 text-orange-500" />
              Reset User Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.name}. The user will need to use this password for their next login.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="resetUsername" className="text-right">
                Username
              </Label>
              <div className="col-span-3">
                <Input id="resetUsername" value={selectedUser?.username || ""} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newPassword" className="text-right">
                New Password*
              </Label>
              <div className="col-span-3">
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirmNewPassword" className="text-right">
                Confirm Password*
              </Label>
              <div className="col-span-3">
                <Input
                  id="confirmNewPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="rounded-md bg-orange-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-orange-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-orange-800">Password requirements</h3>
                  <div className="mt-2 text-sm text-orange-700">
                    <ul className="list-disc space-y-1 pl-5">
                      <li>At least 6 characters long</li>
                      <li>Password cannot be recovered, only reset</li>
                      <li>User will be required to use this new password on their next login</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              onClick={handleSubmitResetPassword}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <KeyIcon className="mr-2 h-4 w-4" />
                  Reset Password
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Financial Activity Dialog */}
      <Dialog open={isFinancialActivityDialogOpen} onOpenChange={setIsFinancialActivityDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5 text-green-500" />
              Financial Activity - {selectedUser?.name}
            </DialogTitle>
            <DialogDescription>
              View all financial transactions and activities for this user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* User Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Current Balance</Label>
                <p className="text-lg font-semibold">${((selectedUser?.balance || 0) / 100).toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Price Multiplier</Label>
                <p className="text-lg font-semibold">{selectedUser?.priceMultiplier?.toFixed(2) || "1.00"}x</p>
              </div>
            </div>

            {/* Financial Activities */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">All Financial Activities</Label>
              <div className="border rounded-lg max-h-96 overflow-y-auto" ref={scrollContainerRef} data-testid="container-financial-activities">
                <Table>
                  <TableHeader className="sticky top-0 bg-background border-b z-10">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance After</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financialActivities.length > 0 ? (
                      <>
                        {financialActivities.map((activity, index) => (
                          <TableRow key={`${activity.id}-${index}`}>
                            <TableCell className="text-sm">
                              {new Date(activity.createdAt).toLocaleDateString()} {new Date(activity.createdAt).toLocaleTimeString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={activity.type === 'credit' ? 'default' : 'destructive'}>
                                {activity.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{activity.description}</TableCell>
                            <TableCell className="text-right text-sm">
                              <span className={activity.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                                {activity.type === 'credit' ? '+' : '-'}${(Math.abs(activity.amount) / 100).toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              ${(activity.balanceAfter / 100).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Loading indicator at bottom while scrolling */}
                        {isLoadingMoreActivities && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4">
                              <div className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading more activities...
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        {/* End of data message */}
                        {!hasMoreActivities && financialActivities.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                              <div className="flex items-center justify-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                All financial activities loaded
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {isLoadingMoreActivities ? (
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading financial activities...
                            </div>
                          ) : (
                            "No financial activities found for this user."
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsFinancialActivityDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Country Pricing Dialog */}
      <CountryPricingDialog 
        open={isCountryPricingDialogOpen} 
        onOpenChange={setIsCountryPricingDialogOpen} 
      />

      {/* Weight Range Pricing Dialog */}
      <WeightRangePricingDialog 
        open={isWeightRangePricingDialogOpen} 
        onOpenChange={setIsWeightRangePricingDialogOpen} 
      />
    </Layout>
  );
}
