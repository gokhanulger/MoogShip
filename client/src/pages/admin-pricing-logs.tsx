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
                      <Badge variant="outline" className="text-xs mt-1">{selectedLog.countryRuleSource}</Badge>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Weight</Label>
                    <p>{selectedLog.weightMultiplier?.toFixed(2) || "-"}x</p>
                    {selectedLog.weightRuleSource && (
                      <Badge variant="outline" className="text-xs mt-1">{selectedLog.weightRuleSource}</Badge>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Combined</Label>
                    <p className="font-bold text-lg">{selectedLog.combinedMultiplier?.toFixed(2)}x</p>
                  </div>
                </div>
              </div>

              {/* Price Info */}
              <div className="p-4 border rounded-lg bg-green-50">
                <h4 className="font-medium mb-2">Final Pricing</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Base Price</Label>
                    <p className="text-lg">{formatPrice(selectedLog.basePrice)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Final Price</Label>
                    <p className="text-2xl font-bold text-green-700">{formatPrice(selectedLog.finalPrice)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Service</Label>
                    <p className="text-sm">{selectedLog.selectedService || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Pricing Options */}
              {selectedLog.pricingOptions && Array.isArray(selectedLog.pricingOptions) && selectedLog.pricingOptions.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">All Pricing Options ({selectedLog.pricingOptions.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedLog.pricingOptions.map((option: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted/30 rounded text-sm">
                        <span>{option.displayName || option.serviceName}</span>
                        <span className="font-medium">{formatPrice(option.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

export default withAuth(AdminPricingLogs, { requireAdmin: true });
