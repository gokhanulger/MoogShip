import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Layout from "@/components/layout";
import ShipmentTable from "@/components/shipment-table";
import { AnnouncementsDisplay } from "@/components/announcements-display";
import { PriceCalculatorDialog } from "@/components/price-calculator-dialog";
import { Button } from "@/components/ui/button";
import { 
  PlusIcon, 
  Upload as UploadIcon, 
  Package as PackageIcon, 
  Truck as TruckIcon, 
  RefreshCw, 
  BarChart3, 
  ChevronRight,
  Calendar,
  Wallet,
  CreditCard,
  Calculator,
  Globe,
  FileText
} from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { withAuth } from "@/lib/with-auth";
import type { Shipment } from "@shared/schema";

interface DashboardProps {
  user: any; // User data is passed from the withAuth HOC
}

function DashboardContent({ user }: DashboardProps) {
  // Initialize translation hook
  const { t } = useTranslation();
  
  // User data is passed from the withAuth HOC
  const isLoadingUser = false; // No longer loading since we have user
  
  // State for price calculator dialog
  const [isPriceCalculatorOpen, setIsPriceCalculatorOpen] = useState(false);
  
  // Fetch the current user's shipments from the API
  const { 
    data: shipments = [], 
    isLoading: isLoadingShipments,
    refetch
  } = useQuery<Shipment[]>({
    queryKey: ['/api/shipments/my'],
    staleTime: 30000, // 30 seconds
    enabled: !!user, // Only fetch shipments if the user is logged in
  });
  
  // Fetch the user's balance
  const {
    data: balanceData,
    isLoading: isLoadingBalance
  } = useQuery<{ balance: number, formattedBalance: string }>({
    queryKey: ['/api/balance'],
    staleTime: 30000, // 30 seconds
    enabled: !!user, // Only fetch balance if the user is logged in
  });
  
  // Generate recent activity data based on actual shipments
  const generateRecentActivity = () => {
    if (!shipments || shipments.length === 0) return [];
    
    // Take the 5 most recent shipments for activity
    const recentShipments = [...shipments]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    return recentShipments.map((shipment, index) => ({
      id: index,
      event: `Shipment #${shipment.trackingNumber || shipment.id} ${getActivityText(shipment.status)}`,
      timestamp: shipment.createdAt
    }));
  };
  
  // Helper function to get appropriate activity text based on status
  const getActivityText = (status: string) => {
    switch (status) {
      case 'pending': return 'created and pending approval';
      case 'approved': return 'approved';
      case 'rejected': return 'rejected';
      case 'in_transit': return 'is in transit';
      case 'delivered': return 'delivered successfully';
      default: return 'updated';
    }
  };
  
  // Generate recent activity whenever shipments change
  const recentActivity = generateRecentActivity();
  
  // Calculate statistics for the dashboard
  const stats = {
    total: shipments.length,
    pending: shipments.filter((s) => s.status === "pending").length,
    inTransit: shipments.filter((s) => s.status === "in_transit").length,
    completed: shipments.filter((s) => s.status === "delivered" || s.status === "approved").length,
    countries: new Set(shipments.map((s) => s.receiverCountry)).size
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Layout user={user}>
      <div className="container mx-auto py-3 md:py-6">
        {/* Welcome Section with User Context */}
          <div className="mb-4 md:mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                {user
                  ? t('dashboard.welcomeUser', { name: user.name })
                  : t('dashboard.welcomeGuest')
                }
              </h1>
              <p className="mt-1 md:mt-2 text-sm md:text-lg text-gray-600">
                {t('dashboard.summary')}
              </p>
            </div>
            {user?.role === 'admin' && (
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2" 
                asChild
              >
                <Link href="/marketing">
                  <Globe className="h-4 w-4 text-blue-500" /> 
                  {t('common.marketingSite')}
                </Link>
              </Button>
            )}
          </div>
        
{/* Customer Balance Bar - Compact */}
        {user?.role !== 'admin' && (
          <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            {/* Balance */}
            <div className="flex items-center gap-1.5">
              <Wallet className={`h-3.5 w-3.5 ${
                balanceData && balanceData.balance > 0 ? 'text-green-600' :
                balanceData && balanceData.balance < 0 ? 'text-red-500' : 'text-blue-600'
              }`} />
              <span className="text-[11px] text-gray-500 hidden xs:inline">{t('dashboard.yourBalance', 'Bakiye')}:</span>
              {isLoadingBalance ? (
                <Skeleton className="h-4 w-14" />
              ) : (
                <span className={`text-xs font-bold ${
                  balanceData && balanceData.balance > 0 ? 'text-green-600' :
                  balanceData && balanceData.balance < 0 ? 'text-red-500' : 'text-gray-900'
                }`}>
                  {balanceData?.formattedBalance || '$0.00'}
                </span>
              )}
            </div>

            <div className="h-3.5 w-px bg-blue-200" />

            {/* Quick Stats - inline on all screens */}
            <div className="flex items-center gap-2 sm:gap-3 text-[11px]">
              <div className="flex items-center gap-0.5">
                <span className="text-gray-500">{t('dashboard.thisMonth', 'Bu Ay')}:</span>
                <span className="font-semibold text-gray-700">
                  {shipments.filter(s => {
                    const d = new Date(s.createdAt);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  }).length}
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                <span className="text-gray-500">{t('dashboard.pending', 'Bekleyen')}:</span>
                <span className="font-semibold text-yellow-600">{stats.pending}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <span className="text-gray-500">{t('dashboard.delivered', 'Teslim')}:</span>
                <span className="font-semibold text-green-600">{stats.completed}</span>
              </div>
            </div>

            <div className="flex-1" />

            {/* Actions */}
            <div className="flex items-center gap-0.5">
              <Button asChild variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-100">
                <Link href="/my-balance">
                  <CreditCard className="h-3 w-3 mr-0.5" />
                  <span className="hidden sm:inline">{t('dashboard.addBalance', 'Bakiye Ekle')}</span>
                  <span className="sm:hidden">+</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] text-gray-600 hover:text-gray-700">
                <Link href="/transactions">
                  {t('dashboard.viewTransactions', 'İşlemler')}
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Quick Actions + Stats Combined */}
        <div className="mt-3 grid grid-cols-4 lg:grid-cols-8 gap-2">
          {/* Quick Actions */}
          <Button
            variant="outline"
            className="h-12 flex flex-col items-center justify-center gap-0.5 hover:bg-primary/5 border-primary/20 text-[10px] p-1"
            onClick={() => setIsPriceCalculatorOpen(true)}
          >
            <Calculator className="h-4 w-4 text-primary" />
            <span className="truncate w-full text-center">{t('dashboard.quickActions.priceCalculator')}</span>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-12 flex flex-col items-center justify-center gap-0.5 hover:bg-green-50 border-green-200 text-[10px] p-1"
          >
            <Link href="/shipment-create">
              <PlusIcon className="h-4 w-4 text-green-600" />
              <span className="truncate w-full text-center">{t('dashboard.quickActions.newShipment')}</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-12 flex flex-col items-center justify-center gap-0.5 hover:bg-blue-50 border-blue-200 text-[10px] p-1"
          >
            <Link href="/us-customs-calculator">
              <Globe className="h-4 w-4 text-blue-600" />
              <span className="truncate w-full text-center">{t('dashboard.quickActions.customsCalculator')}</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-12 flex flex-col items-center justify-center gap-0.5 hover:bg-purple-50 border-purple-200 text-[10px] p-1"
          >
            <Link href="/tracking">
              <TruckIcon className="h-4 w-4 text-purple-600" />
              <span className="truncate w-full text-center">{t('dashboard.quickActions.trackShipment')}</span>
            </Link>
          </Button>

          {/* Stats Cards */}
          <div className="bg-white px-3 py-2 shadow rounded-lg flex items-center gap-2">
            <div className="bg-primary rounded-md p-1.5 flex-shrink-0">
              <PackageIcon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 truncate">{t('dashboard.stats.totalShipments')}</p>
              <p className="text-base font-bold text-gray-900">{isLoadingShipments ? '-' : stats.total}</p>
            </div>
          </div>

          <div className="bg-white px-3 py-2 shadow rounded-lg flex items-center gap-2">
            <div className="bg-yellow-500 rounded-md p-1.5 flex-shrink-0">
              <RefreshCw className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 truncate">{t('dashboard.stats.pendingApproval')}</p>
              <p className="text-base font-bold text-gray-900">{isLoadingShipments ? '-' : stats.pending}</p>
            </div>
          </div>

          <div className="bg-white px-3 py-2 shadow rounded-lg flex items-center gap-2">
            <div className="bg-blue-500 rounded-md p-1.5 flex-shrink-0">
              <TruckIcon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 truncate">{t('dashboard.stats.inTransit')}</p>
              <p className="text-base font-bold text-gray-900">{isLoadingShipments ? '-' : stats.inTransit}</p>
            </div>
          </div>

          <div className="bg-white px-3 py-2 shadow rounded-lg flex items-center gap-2">
            <div className="bg-green-500 rounded-md p-1.5 flex-shrink-0">
              <PackageIcon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 truncate">{t('dashboard.stats.delivered')}</p>
              <p className="text-base font-bold text-gray-900">{isLoadingShipments ? '-' : stats.completed}</p>
            </div>
          </div>
        </div>
          
          {/* Announcements Section */}
          <div className="mt-6">
            <AnnouncementsDisplay />
            {user?.role === 'admin' && (
              <div className="mt-2 flex justify-end space-x-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/announcements">
                    {t('common.announcements')}
                  </Link>
                </Button>
                {user?.role === 'admin' && (
                  <Button asChild variant="outline" size="sm" className="flex items-center">
                    <Link href="/admin-cms">
                      <FileText className="mr-2 h-4 w-4" />
                      CMS
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* Second Row - Recent Activity & Performance */}
          <div className="grid grid-cols-1 gap-5 mt-8 lg:grid-cols-3">
            {/* Recent Activity Card */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Calendar className="mr-2 h-5 w-5 text-muted-foreground" />
                  {t('dashboard.recentActivity.title')}
                </CardTitle>
                <CardDescription>
                  {t('dashboard.recentActivity.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingShipments ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-3 w-[120px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex flex-col space-y-1 border-b pb-3 last:border-0">
                        <div className="text-sm font-medium">{activity.event}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(activity.timestamp)}
                        </div>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      {t('common.viewAll')} {t('dashboard.recentActivity.title')} <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Performance Metrics Card */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <BarChart3 className="mr-2 h-5 w-5 text-muted-foreground" />
                  {t('dashboard.performance.title')}
                </CardTitle>
                <CardDescription>
                  {t('dashboard.performance.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingShipments ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-6 w-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Delivery Success Rate */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{t('dashboard.performance.deliverySuccessRate')}</div>
                        <div className="text-sm">
                          {shipments.length === 0 
                            ? t('dashboard.performance.noShipments') 
                            : `${Math.round((shipments.filter(s => s.status === 'delivered').length / shipments.length) * 100)}%`}
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100">
                        <div 
                          className="h-2 rounded-full bg-green-500" 
                          style={{ 
                            width: shipments.length === 0 
                              ? '0%' 
                              : `${Math.round((shipments.filter(s => s.status === 'delivered').length / shipments.length) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Current Status Breakdown */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{t('dashboard.performance.statusBreakdown')}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-xs flex justify-between">
                          <span>{t('dashboard.status.pending')}:</span> 
                          <span>{stats.pending} ({shipments.length > 0 ? Math.round((stats.pending / shipments.length) * 100) : 0}%)</span>
                        </div>
                        <div className="text-xs flex justify-between">
                          <span>{t('dashboard.status.inTransit')}:</span> 
                          <span>{stats.inTransit} ({shipments.length > 0 ? Math.round((stats.inTransit / shipments.length) * 100) : 0}%)</span>
                        </div>
                        <div className="text-xs flex justify-between">
                          <span>{t('dashboard.status.delivered')}:</span> 
                          <span>{stats.completed} ({shipments.length > 0 ? Math.round((stats.completed / shipments.length) * 100) : 0}%)</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Top Destination Countries */}
                    <div className="pt-4">
                      <div className="text-sm font-medium mb-2">{t('dashboard.performance.topDestinations')}</div>
                      {shipments.length === 0 ? (
                        <div className="text-sm text-muted-foreground">{t('dashboard.performance.noShipments')}</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {Array.from(new Set(shipments.map(s => s.receiverCountry)))
                            .slice(0, 4)
                            .map((country, index) => {
                              const count = shipments.filter(s => s.receiverCountry === country).length;
                              const percentage = Math.round((count / shipments.length) * 100);
                              return (
                                <Badge key={index} className="bg-primary/20 text-primary hover:bg-primary/30">
                                  {country} ({percentage}%)
                                </Badge>
                              );
                            })
                          }
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Shipments Table */}
          <div className="mt-8">
            <div className="sm:flex sm:items-center mb-4">
              <div className="sm:flex-auto">
                <h2 className="text-xl font-semibold text-gray-900">{t('dashboard.recentShipments.title')}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {t('dashboard.recentShipments.description')}
                </p>
              </div>
              <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                <Button variant="outline" asChild>
                  <Link href="/shipment-list">
                    {t('common.viewAll')} <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            
            <ShipmentTable
              shipments={shipments || []}
              isLoading={isLoadingShipments}
              showFilters={false}
              showPagination={true}
              isAdmin={user?.role === 'admin'}
              canAccessCarrierLabels={user?.canAccessCarrierLabels === true}
            />
          </div>
        </div>
      
      {/* Price Calculator Dialog */}
      <PriceCalculatorDialog 
        open={isPriceCalculatorOpen}
        onOpenChange={setIsPriceCalculatorOpen}
      />
    </Layout>
  );
}

// Export the dashboard component wrapped in withAuth
export default withAuth(DashboardContent);
