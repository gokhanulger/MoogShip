import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Layout from "@/components/layout";
import ShipmentTable from "@/components/shipment-table";
import { Button } from "@/components/ui/button";
import { Loader2, PlusIcon, RefreshCw, FileDown, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { withAuth } from "@/lib/with-auth";
import { exportToExcel, formatShipmentForExport } from "@/lib/export-utils";
import { toast } from "@/hooks/use-toast";
import { RefundRequestDialog } from "@/components/refund-request-dialog";

// Custom translation object for bilingual support
const translations = {
  tr: {
    "shipments_selected": "gönderi seçildi",
    "Clear Selection": "Seçimi Temizle",
    "Request Refund": "İade Talep Et"
  },
  en: {
    "shipments_selected": "shipment(s) selected",
    "Clear Selection": "Clear Selection", 
    "Request Refund": "Request Refund"
  }
};

// Custom translation hook that detects current language
const useCustomTranslation = () => {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language || 'tr');
  
  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLang(i18n.language || 'tr');
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    return () => i18n.off('languageChanged', handleLanguageChange);
  }, [i18n]);
  
  const getText = (key: string) => {
    const lang = currentLang.startsWith('en') ? 'en' : 'tr';
    return translations[lang][key as keyof typeof translations['en']] || key;
  };
  
  return { getText, currentLang };
};

interface ShipmentListProps {
  user: any; // User data is passed from the withAuth HOC
}

function ShipmentListContent({ user }: ShipmentListProps) {
  const { t } = useTranslation();
  const { getText } = useCustomTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("30");
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<number[]>([]);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(25); // Default to 25 items per page
  
  // Export function
  const handleExport = () => {
    if (!filteredShipments || filteredShipments.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no shipments to export to Excel",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const formattedShipments = filteredShipments.map((shipment: any) => formatShipmentForExport(shipment, false));
      exportToExcel(formattedShipments, `shipments-export-${new Date().toISOString().split('T')[0]}`);
      
      toast({
        title: "Export successful",
        description: "Shipments have been exported to Excel",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "An error occurred while exporting shipments",
        variant: "destructive",
      });
    }
  };
  
  // Fetch user's shipments using React Query
  const { data: shipments = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/shipments/my"],
    staleTime: 30000, // 30 seconds
    enabled: !!user, // Only fetch if user is logged in
  });

  // Filter shipments based on search term, status, and date
  const filteredShipments = (shipments && Array.isArray(shipments))
    ? shipments.filter((shipment: any) => {
        // Search filter
        const matchesSearch = searchTerm === "" ||
          shipment.receiverCity.toLowerCase().includes(searchTerm.toLowerCase()) ||
          shipment.receiverCountry.toLowerCase().includes(searchTerm.toLowerCase()) ||
          shipment.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          shipment.carrierTrackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          shipment.manualTrackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `#SH-${shipment.id.toString().padStart(6, '0')}`.includes(searchTerm);
        
        // Status filter
        const matchesStatus = statusFilter === "all" || shipment.status === statusFilter;
        
        // Date filter
        const shipmentDate = new Date(shipment.createdAt);
        const now = new Date();
        const daysAgo = parseInt(dateFilter);
        const filterDate = new Date(now);
        filterDate.setDate(now.getDate() - daysAgo);
        const matchesDate = shipmentDate >= filterDate;
        
        return matchesSearch && matchesStatus && matchesDate;
      })
    : [];
  
  // Handle bulk selection functions
  const handleSelectShipment = (shipmentId: number, checked: boolean) => {
    if (checked) {
      setSelectedShipmentIds(prev => [...prev, shipmentId]);
    } else {
      setSelectedShipmentIds(prev => prev.filter(id => id !== shipmentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredShipments.map((s: any) => s.id);
      setSelectedShipmentIds(allIds);
    } else {
      setSelectedShipmentIds([]);
    }
  };

  const handleRefundRequest = () => {
    if (selectedShipmentIds.length === 0) {
      toast({
        title: "No Shipments Selected",
        description: "Please select at least one shipment for refund.",
        variant: "destructive",
      });
      return;
    }
    setShowRefundDialog(true);
  };

  const selectedShipments = filteredShipments.filter((s: any) => 
    selectedShipmentIds.includes(s.id)
  );

  return (
    <Layout>
      <div className="container mx-auto py-2 md:py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 md:mb-6">
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">{t('shipments.title')}</h1>
            
            <Button asChild className="mt-4 md:mt-0 bg-primary-600 hover:bg-primary-700">
              <Link href="/shipments/create">
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                {t('shipments.actions.createNew')}
              </Link>
            </Button>
          </div>
          
          {/* Filters */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center mb-4 sm:mb-0">
              <div className="relative rounded-md shadow-sm">
                <Input
                  type="text"
                  placeholder={t('shipments.filters.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={t('shipments.filters.statusPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('shipments.filters.allStatuses')}</SelectItem>
                  <SelectItem value="pending">{t('shipments.status.pending')}</SelectItem>
                  <SelectItem value="approved">{t('shipments.status.approved')}</SelectItem>
                  <SelectItem value="in_transit">{t('shipments.status.inTransit')}</SelectItem>
                  <SelectItem value="delivered">{t('shipments.status.delivered')}</SelectItem>
                  <SelectItem value="rejected">{t('shipments.status.rejected')}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={dateFilter}
                onValueChange={setDateFilter}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={t('shipments.filters.datePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">{t('shipments.filters.last7Days')}</SelectItem>
                  <SelectItem value="30">{t('shipments.filters.last30Days')}</SelectItem>
                  <SelectItem value="90">{t('shipments.filters.last90Days')}</SelectItem>
                  <SelectItem value="365">{t('shipments.filters.thisYear')}</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Items per page selector */}
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => setItemsPerPage(Number(value))}
              >
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 items</SelectItem>
                  <SelectItem value="50">50 items</SelectItem>
                  <SelectItem value="100">100 items</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExport}
                className="flex items-center bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800"
              >
                <FileDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
          


          {/* Shipments Table */}
          <div className="mt-4">
            <ShipmentTable 
              shipments={filteredShipments} 
              isLoading={isLoading} 
              showPagination={true}
              isAdmin={user?.role === 'admin'}
              canAccessCarrierLabels={user?.canAccessCarrierLabels === true}
              enableBulkSelection={true}
              selectedShipmentIds={selectedShipmentIds}
              onSelectShipment={handleSelectShipment}
              onSelectAll={handleSelectAll}
              onRefundRequest={handleRefundRequest}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>

          {/* Refund Request Dialog */}
          <RefundRequestDialog
            isOpen={showRefundDialog}
            onClose={() => setShowRefundDialog(false)}
            selectedShipments={selectedShipments}
          />
      </div>
    </Layout>
  );
}

// Export the component with withAuth HOC
export default withAuth(ShipmentListContent);
