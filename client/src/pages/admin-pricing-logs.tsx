import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { withAuth } from "@/lib/with-auth";
import Layout from "@/components/layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Search,
  RefreshCw,
  Calculator,
  User,
  Package,
  Globe,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

interface PricingLog {
  id: number;
  userId: number | null;
  username: string | null;
  shipmentId: number | null;
  packageWeight: number;
  packageLength: number | null;
  packageWidth: number | null;
  packageHeight: number | null;
  volumetricWeight: number | null;
  billableWeight: number | null;
  receiverCountry: string;
  userMultiplier: number;
  countryMultiplier: number | null;
  weightMultiplier: number | null;
  combinedMultiplier: number;
  countryRuleSource: string | null;
  weightRuleSource: string | null;
  appliedRules: any;
  apiResponses: any;
  basePrice: number | null;
  finalPrice: number | null;
  selectedService: string | null;
  pricingOptions: any;
  requestSource: string | null;
  ipAddress: string | null;
  createdAt: string;
}

function AdminPricingLogs() {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<PricingLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [userIdFilter, setUserIdFilter] = useState<string>("");
  const pageSize = 50;

  // Read userId from URL query parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userIdParam = urlParams.get('userId');
    if (userIdParam) {
      setUserIdFilter(userIdParam);
    }
  }, []);

  // Build query parameters
  const queryParams = new URLSearchParams();
  queryParams.set("limit", pageSize.toString());
  queryParams.set("offset", (page * pageSize).toString());
  if (userIdFilter) queryParams.set("userId", userIdFilter);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/pricing-logs", page, userIdFilter],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/admin/pricing-logs?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch pricing logs");
      return response.json();
    },
  });

  const logs: PricingLog[] = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.username?.toLowerCase().includes(searchLower) ||
      log.receiverCountry?.toLowerCase().includes(searchLower) ||
      log.selectedService?.toLowerCase().includes(searchLower) ||
      log.ipAddress?.includes(search)
    );
  });

  const formatPrice = (cents: number | null) => {
    if (cents === null) return "-";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const viewDetails = (log: PricingLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-6 w-6 text-blue-500" />
                  Pricing Calculation Logs
                </CardTitle>
                <CardDescription>
                  View all pricing calculations performed by the system. Only admins can see this page.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by username, country, service..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-[150px]">
                <Input
                  placeholder="User ID"
                  value={userIdFilter}
                  onChange={(e) => {
                    setUserIdFilter(e.target.value);
                    setPage(0);
                  }}
                  type="number"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600">Total Logs</div>
                <div className="text-2xl font-bold text-blue-700">{total}</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600">Showing</div>
                <div className="text-2xl font-bold text-green-700">{filteredLogs.length}</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-sm text-purple-600">Page</div>
                <div className="text-2xl font-bold text-purple-700">{page + 1} / {Math.max(1, totalPages)}</div>
              </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[50px]">ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Dimensions</TableHead>
                      <TableHead>Multiplier</TableHead>
                      <TableHead>Base</TableHead>
                      <TableHead>Final</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          <p className="text-muted-foreground mt-2">Loading...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                          No pricing logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs">{log.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">
                                {log.username || <span className="text-muted-foreground italic">Guest</span>}
                              </span>
                            </div>
                            {log.userId && (
                              <span className="text-xs text-muted-foreground">ID: {log.userId}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <Globe className="h-3 w-3" />
                              {log.receiverCountry}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{log.packageWeight?.toFixed(2)} kg</div>
                            {log.billableWeight && log.billableWeight !== log.packageWeight && (
                              <div className="text-xs text-muted-foreground">
                                Bill: {log.billableWeight.toFixed(2)} kg
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.packageLength && log.packageWidth && log.packageHeight ? (
                              <div className="text-xs">
                                {log.packageLength}x{log.packageWidth}x{log.packageHeight} cm
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.combinedMultiplier < 1 ? "default" : log.combinedMultiplier > 1 ? "destructive" : "secondary"}>
                              {log.combinedMultiplier.toFixed(2)}x
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatPrice(log.basePrice)}</TableCell>
                          <TableCell className="text-sm font-medium">{formatPrice(log.finalPrice)}</TableCell>
                          <TableCell>
                            <span className="text-xs truncate max-w-[100px] block" title={log.selectedService || undefined}>
                              {log.selectedService || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {log.requestSource || "unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(log.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewDetails(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, total)} of {total}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Pricing Calculation Details #{selectedLog?.id}
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">User</Label>
                  <p className="font-medium">{selectedLog.username || "Guest"}</p>
                  {selectedLog.userId && <p className="text-xs text-muted-foreground">ID: {selectedLog.userId}</p>}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">IP Address</Label>
                  <p className="font-mono text-sm">{selectedLog.ipAddress || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Request Source</Label>
                  <Badge variant="outline">{selectedLog.requestSource || "unknown"}</Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <p className="text-sm">{formatDate(selectedLog.createdAt)}</p>
                </div>
              </div>

              {/* Package Info */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Package Details
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Weight</Label>
                    <p>{selectedLog.packageWeight?.toFixed(2)} kg</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Volumetric</Label>
                    <p>{selectedLog.volumetricWeight?.toFixed(2) || "-"} kg</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Billable</Label>
                    <p className="font-medium">{selectedLog.billableWeight?.toFixed(2) || "-"} kg</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Dimensions</Label>
                    <p>
                      {selectedLog.packageLength}x{selectedLog.packageWidth}x{selectedLog.packageHeight} cm
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Country</Label>
                    <Badge variant="outline">{selectedLog.receiverCountry}</Badge>
                  </div>
                </div>
              </div>

              {/* Multiplier Info */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing Multipliers
                </h4>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">User</Label>
                    <p>{selectedLog.userMultiplier?.toFixed(2)}x</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Country</Label>
                    <p>{selectedLog.countryMultiplier?.toFixed(2) || "-"}x</p>
                    {selectedLog.countryRuleSource && (
                      <Badge variant={selectedLog.countryRuleSource === 'user_specific' ? 'default' : 'outline'} className="text-xs mt-1">
                        {selectedLog.countryRuleSource === 'user_specific' ? 'User-Specific' : 'Global'}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Weight</Label>
                    <p>{selectedLog.weightMultiplier?.toFixed(2) || "-"}x</p>
                    {selectedLog.weightRuleSource && (
                      <Badge variant={selectedLog.weightRuleSource === 'user_specific' ? 'default' : 'outline'} className="text-xs mt-1">
                        {selectedLog.weightRuleSource === 'user_specific' ? 'User-Specific' : 'Global'}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Combined</Label>
                    <p className="font-bold text-lg">{selectedLog.combinedMultiplier?.toFixed(2)}x</p>
                  </div>
                </div>
              </div>

              {/* Fees & Charges - Always show */}
              <div className="p-4 border rounded-lg bg-yellow-50">
                <h4 className="font-medium mb-2">Fees & Additional Charges</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="p-2 bg-white rounded border">
                    <Label className="text-xs text-muted-foreground">Insurance Cost</Label>
                    <p className={`font-medium ${selectedLog.appliedRules?.fees?.insuranceCost > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                      {formatPrice(selectedLog.appliedRules?.fees?.insuranceCost || 0)}
                    </p>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <Label className="text-xs text-muted-foreground">Insured Value</Label>
                    <p className="font-medium">
                      {formatPrice(selectedLog.appliedRules?.fees?.insuranceValue || 0)}
                    </p>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <Label className="text-xs text-muted-foreground">Additional Fee</Label>
                    <p className={`font-medium ${selectedLog.appliedRules?.fees?.additionalFee > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                      {formatPrice(selectedLog.appliedRules?.fees?.additionalFee || 0)}
                    </p>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <Label className="text-xs text-muted-foreground">Has Insurance</Label>
                    <Badge variant={selectedLog.appliedRules?.fees?.hasInsurance ? 'default' : 'outline'}>
                      {selectedLog.appliedRules?.fees?.hasInsurance ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Duties & Taxes (for US shipments) */}
              {selectedLog.appliedRules?.duties && selectedLog.appliedRules.duties.available && (
                <div className="p-4 border rounded-lg bg-red-50">
                  <h4 className="font-medium mb-2">Duties & Taxes (US Import)</h4>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="p-2 bg-white rounded border">
                      <Label className="text-xs text-muted-foreground">Import Duty</Label>
                      <p className="font-medium">${((selectedLog.appliedRules.duties.duty || 0)).toFixed(2)}</p>
                    </div>
                    <div className="p-2 bg-white rounded border">
                      <Label className="text-xs text-muted-foreground">Tax</Label>
                      <p className="font-medium">${((selectedLog.appliedRules.duties.tax || 0)).toFixed(2)}</p>
                    </div>
                    <div className="p-2 bg-white rounded border">
                      <Label className="text-xs text-muted-foreground">Total Duties</Label>
                      <p className="font-medium text-red-600">${((selectedLog.appliedRules.duties.total || 0)).toFixed(2)}</p>
                    </div>
                  </div>
                  {selectedLog.appliedRules.duties.message && (
                    <p className="text-xs text-muted-foreground mt-2">{selectedLog.appliedRules.duties.message}</p>
                  )}
                </div>
              )}

              {/* Price Breakdown */}
              {selectedLog.appliedRules?.priceBreakdown && (
                <div className="p-4 border rounded-lg bg-purple-50">
                  <h4 className="font-medium mb-2">Price Breakdown (First Option)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Original (Cost) Prices */}
                    <div className="p-3 bg-white rounded border">
                      <Label className="text-xs text-orange-600 font-medium">Original (Cost) Prices</Label>
                      <div className="space-y-1 mt-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cargo:</span>
                          <span className="font-mono">{formatPrice(selectedLog.appliedRules.priceBreakdown.originalCargoPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fuel:</span>
                          <span className="font-mono">{formatPrice(selectedLog.appliedRules.priceBreakdown.originalFuelCost)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="text-muted-foreground font-medium">Total:</span>
                          <span className="font-mono font-medium">{formatPrice(selectedLog.appliedRules.priceBreakdown.originalTotalPrice)}</span>
                        </div>
                      </div>
                    </div>
                    {/* Final (Customer) Prices */}
                    <div className="p-3 bg-white rounded border">
                      <Label className="text-xs text-green-600 font-medium">Final (Customer) Prices</Label>
                      <div className="space-y-1 mt-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cargo:</span>
                          <span className="font-mono">{formatPrice(selectedLog.appliedRules.priceBreakdown.cargoPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fuel:</span>
                          <span className="font-mono">{formatPrice(selectedLog.appliedRules.priceBreakdown.fuelCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Additional Fee:</span>
                          <span className={`font-mono ${selectedLog.appliedRules.priceBreakdown.additionalFee > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                            {formatPrice(selectedLog.appliedRules.priceBreakdown.additionalFee || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Insurance:</span>
                          <span className={`font-mono ${selectedLog.appliedRules.priceBreakdown.insuranceCost > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                            {formatPrice(selectedLog.appliedRules.priceBreakdown.insuranceCost || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="text-muted-foreground font-medium">Total:</span>
                          <span className="font-mono font-bold text-green-700">{formatPrice(selectedLog.appliedRules.priceBreakdown.totalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Rule Information */}
              {selectedLog.appliedRules && (
                <div className="p-4 border rounded-lg bg-blue-50">
                  <h4 className="font-medium mb-2">Applied Rules Details</h4>

                  {/* Applied Multipliers List */}
                  {selectedLog.appliedRules.appliedMultipliers && selectedLog.appliedRules.appliedMultipliers.length > 0 && (
                    <div className="mb-3">
                      <Label className="text-xs text-muted-foreground">Applied Multipliers</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedLog.appliedRules.appliedMultipliers.map((mult: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{mult}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Country Rule Details */}
                  {selectedLog.appliedRules.countryRuleDetails && (
                    <div className="mb-3 p-2 bg-white rounded border">
                      <Label className="text-xs text-muted-foreground">Country Rule Details</Label>
                      <div className="grid grid-cols-2 gap-2 mt-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Rule ID:</span>{' '}
                          <span className="font-mono">{selectedLog.appliedRules.countryRuleDetails.ruleId}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Country:</span>{' '}
                          <span>{selectedLog.appliedRules.countryRuleDetails.countryCode}</span>
                          {selectedLog.appliedRules.countryRuleDetails.countryName && (
                            <span className="text-muted-foreground"> ({selectedLog.appliedRules.countryRuleDetails.countryName})</span>
                          )}
                        </div>
                        {selectedLog.appliedRules.countryRuleDetails.priceMultiplier && (
                          <div>
                            <span className="text-muted-foreground">Multiplier:</span>{' '}
                            <span className="font-medium">{selectedLog.appliedRules.countryRuleDetails.priceMultiplier}x</span>
                          </div>
                        )}
                        {selectedLog.appliedRules.countryRuleDetails.fixedDiscount && (
                          <div>
                            <span className="text-muted-foreground">Fixed Discount:</span>{' '}
                            <span className="font-medium text-green-600">${(selectedLog.appliedRules.countryRuleDetails.fixedDiscount / 100).toFixed(2)}</span>
                          </div>
                        )}
                        {selectedLog.appliedRules.countryRuleDetails.fixedMarkup && (
                          <div>
                            <span className="text-muted-foreground">Fixed Markup:</span>{' '}
                            <span className="font-medium text-red-600">${(selectedLog.appliedRules.countryRuleDetails.fixedMarkup / 100).toFixed(2)}</span>
                          </div>
                        )}
                        {selectedLog.appliedRules.countryRuleDetails.notes && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Notes:</span>{' '}
                            <span className="italic">{selectedLog.appliedRules.countryRuleDetails.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Weight Rule Details */}
                  {selectedLog.appliedRules.weightRuleDetails && (
                    <div className="p-2 bg-white rounded border">
                      <Label className="text-xs text-muted-foreground">Weight Rule Details</Label>
                      <div className="grid grid-cols-2 gap-2 mt-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Rule ID:</span>{' '}
                          <span className="font-mono">{selectedLog.appliedRules.weightRuleDetails.ruleId}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Range:</span>{' '}
                          <span>
                            {selectedLog.appliedRules.weightRuleDetails.minWeight}kg - {selectedLog.appliedRules.weightRuleDetails.maxWeight || '∞'}kg
                          </span>
                          {selectedLog.appliedRules.weightRuleDetails.rangeName && (
                            <span className="text-muted-foreground"> ({selectedLog.appliedRules.weightRuleDetails.rangeName})</span>
                          )}
                        </div>
                        {selectedLog.appliedRules.weightRuleDetails.priceMultiplier && (
                          <div>
                            <span className="text-muted-foreground">Multiplier:</span>{' '}
                            <span className="font-medium">{selectedLog.appliedRules.weightRuleDetails.priceMultiplier}x</span>
                          </div>
                        )}
                        {selectedLog.appliedRules.weightRuleDetails.perKgDiscount && (
                          <div>
                            <span className="text-muted-foreground">Per Kg Discount:</span>{' '}
                            <span className="font-medium text-green-600">${(selectedLog.appliedRules.weightRuleDetails.perKgDiscount / 100).toFixed(2)}/kg</span>
                          </div>
                        )}
                        {selectedLog.appliedRules.weightRuleDetails.perKgMarkup && (
                          <div>
                            <span className="text-muted-foreground">Per Kg Markup:</span>{' '}
                            <span className="font-medium text-red-600">${(selectedLog.appliedRules.weightRuleDetails.perKgMarkup / 100).toFixed(2)}/kg</span>
                          </div>
                        )}
                        {selectedLog.appliedRules.weightRuleDetails.fixedDiscount && (
                          <div>
                            <span className="text-muted-foreground">Fixed Discount:</span>{' '}
                            <span className="font-medium text-green-600">${(selectedLog.appliedRules.weightRuleDetails.fixedDiscount / 100).toFixed(2)}</span>
                          </div>
                        )}
                        {selectedLog.appliedRules.weightRuleDetails.fixedMarkup && (
                          <div>
                            <span className="text-muted-foreground">Fixed Markup:</span>{' '}
                            <span className="font-medium text-red-600">${(selectedLog.appliedRules.weightRuleDetails.fixedMarkup / 100).toFixed(2)}</span>
                          </div>
                        )}
                        {selectedLog.appliedRules.weightRuleDetails.notes && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Notes:</span>{' '}
                            <span className="italic">{selectedLog.appliedRules.weightRuleDetails.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Price Info */}
              <div className="p-4 border rounded-lg bg-green-50">
                <h4 className="font-medium mb-2">Final Pricing Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Base (Cost) Price</Label>
                    <p className="text-lg">{formatPrice(selectedLog.basePrice)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Final Price</Label>
                    <p className="text-2xl font-bold text-green-700">{formatPrice(selectedLog.finalPrice)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Profit Margin</Label>
                    {selectedLog.basePrice && selectedLog.finalPrice ? (
                      <>
                        <p className="text-lg font-medium text-blue-600">
                          {formatPrice(selectedLog.finalPrice - selectedLog.basePrice)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ({(((selectedLog.finalPrice - selectedLog.basePrice) / selectedLog.basePrice) * 100).toFixed(1)}%)
                        </p>
                      </>
                    ) : (
                      <p className="text-lg">-</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Selected Service</Label>
                    <p className="text-sm font-medium">{selectedLog.selectedService || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Pricing Options - Full Details */}
              {selectedLog.pricingOptions && Array.isArray(selectedLog.pricingOptions) && selectedLog.pricingOptions.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">All Pricing Options - Full Details ({selectedLog.pricingOptions.length})</h4>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {selectedLog.pricingOptions.map((option: any, index: number) => (
                      <div key={index} className="p-3 bg-muted/30 rounded-lg border">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <span className="font-medium">{option.displayName || option.serviceName}</span>
                            {option.serviceType && (
                              <Badge variant="outline" className="ml-2 text-xs">{option.serviceType}</Badge>
                            )}
                          </div>
                          <span className="text-lg font-bold text-green-700">{formatPrice(option.totalPrice)}</span>
                        </div>

                        {/* Price Breakdown */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs mb-2">
                          <div className="p-2 bg-white rounded">
                            <span className="text-muted-foreground block">Cargo Price</span>
                            <span className="font-medium">{formatPrice(option.cargoPrice)}</span>
                          </div>
                          <div className="p-2 bg-white rounded">
                            <span className="text-muted-foreground block">Fuel Cost</span>
                            <span className="font-medium">{formatPrice(option.fuelCost)}</span>
                          </div>
                          <div className="p-2 bg-yellow-50 rounded">
                            <span className="text-muted-foreground block">Additional Fee</span>
                            <span className={`font-medium ${(option.additionalFee > 0 || option.originalAdditionalFee > 0) ? 'text-yellow-700' : 'text-muted-foreground'}`}>
                              {formatPrice(option.additionalFee || option.originalAdditionalFee || 0)}
                            </span>
                          </div>
                          <div className="p-2 bg-blue-50 rounded">
                            <span className="text-muted-foreground block">Insurance</span>
                            <span className={`font-medium ${option.insuranceCost > 0 ? 'text-blue-700' : 'text-muted-foreground'}`}>
                              {formatPrice(option.insuranceCost || 0)}
                            </span>
                          </div>
                          <div className="p-2 bg-green-50 rounded">
                            <span className="text-muted-foreground block">Total</span>
                            <span className="font-medium text-green-700">{formatPrice(option.totalPrice)}</span>
                          </div>
                        </div>

                        {/* Original Prices (before multiplier) */}
                        {(option.originalCargoPrice || option.originalTotalPrice) && (
                          <div className="p-2 bg-orange-50 rounded mb-2">
                            <span className="text-xs text-orange-600 font-medium block mb-1">Original (Cost) Prices</span>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Cargo:</span>{' '}
                                <span className="font-mono">{formatPrice(option.originalCargoPrice)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Fuel:</span>{' '}
                                <span className="font-mono">{formatPrice(option.originalFuelCost)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Total:</span>{' '}
                                <span className="font-mono">{formatPrice(option.originalTotalPrice)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Multiplier Info */}
                        {option.appliedMultiplier && option.appliedMultiplier !== 1 && (
                          <div className="p-2 bg-purple-50 rounded mb-2">
                            <span className="text-xs text-purple-600 font-medium block mb-1">Applied Multipliers</span>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Combined:</span>{' '}
                                <Badge variant="secondary">{option.appliedMultiplier?.toFixed(2)}x</Badge>
                              </div>
                              {option.countryMultiplier && (
                                <div>
                                  <span className="text-muted-foreground">Country:</span>{' '}
                                  <Badge variant="outline">{option.countryMultiplier?.toFixed(2)}x</Badge>
                                </div>
                              )}
                              {option.weightRangeMultiplier && (
                                <div>
                                  <span className="text-muted-foreground">Weight:</span>{' '}
                                  <Badge variant="outline">{option.weightRangeMultiplier?.toFixed(2)}x</Badge>
                                </div>
                              )}
                            </div>
                            {option.appliedMultipliers && option.appliedMultipliers.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {option.appliedMultipliers.map((mult: string, idx: number) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">{mult}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Additional Info */}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {option.deliveryTime && (
                            <span>Delivery: {option.deliveryTime}</span>
                          )}
                          {option.providerServiceCode && (
                            <span>Code: {option.providerServiceCode}</span>
                          )}
                          {option.hasInsurance && (
                            <Badge variant="default" className="text-xs">Insured</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw API Responses */}
              <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium mb-3">Raw API Responses</h4>
                {!selectedLog.apiResponses ? (
                  <p className="text-sm text-muted-foreground italic">
                    No API response data available. This data is only captured for new pricing calculations after the latest update.
                  </p>
                ) : (
                  <>

                  {/* Request Parameters */}
                  {selectedLog.apiResponses.requestParams && (
                    <div className="mb-4 p-3 bg-white rounded border">
                      <Label className="text-xs text-muted-foreground font-medium">Request Parameters</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Dimensions:</span>{' '}
                          <span className="font-mono">
                            {selectedLog.apiResponses.requestParams.packageLength}x
                            {selectedLog.apiResponses.requestParams.packageWidth}x
                            {selectedLog.apiResponses.requestParams.packageHeight} cm
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Weight:</span>{' '}
                          <span className="font-mono">{selectedLog.apiResponses.requestParams.packageWeight} kg</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Country:</span>{' '}
                          <span className="font-mono">{selectedLog.apiResponses.requestParams.receiverCountry}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Timestamp: {selectedLog.apiResponses.timestamp}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Shipentegra Response */}
                    {selectedLog.apiResponses.shipentegra && (
                      <div className="p-3 bg-white rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs font-medium flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                            Shipentegra API
                          </Label>
                          <Badge variant={selectedLog.apiResponses.shipentegra.success ? 'default' : 'destructive'}>
                            {selectedLog.apiResponses.shipentegra.success ? 'Success' : 'Failed'}
                          </Badge>
                        </div>
                        {selectedLog.apiResponses.shipentegra.error ? (
                          <p className="text-sm text-red-600">{selectedLog.apiResponses.shipentegra.error}</p>
                        ) : (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {selectedLog.apiResponses.shipentegra.optionsCount} options returned
                            </p>
                            {selectedLog.apiResponses.shipentegra.options && (
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {selectedLog.apiResponses.shipentegra.options.map((opt: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center text-xs p-1 bg-gray-50 rounded">
                                    <span>{opt.displayName || opt.serviceName}</span>
                                    <div className="flex gap-2">
                                      <span className="text-muted-foreground">Cargo: {formatPrice(opt.cargoPrice)}</span>
                                      <span className="text-muted-foreground">Fuel: {formatPrice(opt.fuelCost)}</span>
                                      {opt.additionalFee > 0 && <span className="text-orange-600">Add: {formatPrice(opt.additionalFee)}</span>}
                                      <span className="font-medium">{formatPrice(opt.totalPrice)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Aramex Response */}
                    {selectedLog.apiResponses.aramex && (
                      <div className="p-3 bg-white rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs font-medium flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                            Aramex API
                          </Label>
                          <Badge variant={selectedLog.apiResponses.aramex.success ? 'default' : 'destructive'}>
                            {selectedLog.apiResponses.aramex.success ? 'Success' : 'Failed'}
                          </Badge>
                        </div>
                        {selectedLog.apiResponses.aramex.error ? (
                          <p className="text-sm text-red-600">{selectedLog.apiResponses.aramex.error}</p>
                        ) : (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {selectedLog.apiResponses.aramex.optionsCount} options returned
                            </p>
                            {selectedLog.apiResponses.aramex.options && selectedLog.apiResponses.aramex.options.length > 0 && (
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {selectedLog.apiResponses.aramex.options.map((opt: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center text-xs p-1 bg-gray-50 rounded">
                                    <span>{opt.displayName || opt.serviceName}</span>
                                    <div className="flex gap-2">
                                      <span className="text-muted-foreground">Cargo: {formatPrice(opt.cargoPrice)}</span>
                                      <span className="text-muted-foreground">Fuel: {formatPrice(opt.fuelCost)}</span>
                                      <span className="font-medium">{formatPrice(opt.totalPrice)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* AFS Response */}
                    {selectedLog.apiResponses.afs && (
                      <div className="p-3 bg-white rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs font-medium flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500"></span>
                            AFS Transport API
                          </Label>
                          <Badge variant={selectedLog.apiResponses.afs.success ? 'default' : 'destructive'}>
                            {selectedLog.apiResponses.afs.success ? 'Success' : 'Failed'}
                          </Badge>
                        </div>
                        {selectedLog.apiResponses.afs.error ? (
                          <p className="text-sm text-red-600">{selectedLog.apiResponses.afs.error}</p>
                        ) : (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {selectedLog.apiResponses.afs.optionsCount} options returned
                            </p>
                            {selectedLog.apiResponses.afs.options && selectedLog.apiResponses.afs.options.length > 0 && (
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {selectedLog.apiResponses.afs.options.map((opt: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center text-xs p-1 bg-gray-50 rounded">
                                    <span>{opt.displayName || opt.serviceName}</span>
                                    <div className="flex gap-2">
                                      <span className="text-muted-foreground">Cargo: {formatPrice(opt.cargoPrice)}</span>
                                      <span className="text-muted-foreground">Fuel: {formatPrice(opt.fuelCost)}</span>
                                      <span className="font-medium">{formatPrice(opt.totalPrice)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

export default withAuth(AdminPricingLogs, { requireAdmin: true });
