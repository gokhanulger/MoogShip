import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Eye, Download, Edit, Save, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import Layout from "@/components/layout";
import type { Return } from "@shared/schema";
import { useTranslation } from "react-i18next";

interface CreateReturnFormData {
  senderName: string;
  trackingCarrier: string;
  trackingNumber: string;
  orderNumber?: string;
  productName?: string;
  returnReason?: string;
}

interface SellerReturnsProps {
  user: any;
}

function SellerReturnsContent({ user }: SellerReturnsProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // All hooks must be called before any conditional logic
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedReturnId, setSelectedReturnId] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [localControlledStates, setLocalControlledStates] = useState<Record<number, boolean>>({});
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [notesText, setNotesText] = useState("");
  const [localNotesMap, setLocalNotesMap] = useState<Record<number, string>>({});
  
  const [formData, setFormData] = useState<CreateReturnFormData>({
    senderName: "",
    trackingCarrier: "",
    trackingNumber: "",
    orderNumber: "",
    productName: "",
    returnReason: ""
  });

  // Check if user has access to return system (handle null/false explicitly)
  const hasReturnAccess = userData?.role === 'admin' || userData?.canAccessReturnSystem === true;

  // Fetch user's returns (always call hook, but conditionally enable)
  const { data: returnsData, isLoading } = useQuery({
    queryKey: ["/api/returns"],
    enabled: hasReturnAccess, // Only fetch if user has access
    retry: false,
  });

  // Fetch return photos (always call hook, but conditionally enable)
  const { data: photosData } = useQuery({
    queryKey: ["/api/returns", selectedReturnId, "photos"],
    queryFn: selectedReturnId ? () => fetch(`/api/returns/${selectedReturnId}/photos`).then(res => res.json()) : undefined,
    enabled: !!selectedReturnId && hasReturnAccess,
    retry: false,
  });

  // Toggle controlled status mutation
  const toggleControlledMutation = useMutation({
    mutationFn: async (returnId: number) => {
      const response = await apiRequest("PATCH", `/api/returns/${returnId}/controlled`, {});
      if (!response.ok) {
        throw new Error('Failed to toggle controlled status');
      }
      return await response.json();
    },
    onSuccess: (data, returnId) => {
      // Update the cache directly with the server response and ensure the local state persists
      queryClient.setQueryData(["/api/returns"], (old: any) => {
        if (!old?.data) return old;
        
        const updatedData = {
          ...old,
          data: old.data.map((returnItem: any) =>
            returnItem.id === returnId
              ? { ...returnItem, isControlled: data.data.isControlled, updatedAt: data.data.updatedAt }
              : returnItem
          )
        };
        
        return updatedData;
      });
      
      toast({
        title: t('returns.controlled.success'),
        description: t('returns.controlled.successMessage', {
          status: data.data.isControlled ? t('returns.controlled.controlled') : t('returns.controlled.notControlled')
        }),
      });
    },
    onError: (err, returnId) => {
      // Revert local state on error
      setLocalControlledStates(prev => {
        const newState = { ...prev };
        delete newState[returnId];
        return newState;
      });
      
      toast({
        title: t('returns.controlled.error'),
        description: t('returns.controlled.errorMessage'),
        variant: "destructive",
      });
    },
  });

  // Create return mutation
  const createReturnMutation = useMutation({
    mutationFn: async (data: CreateReturnFormData) => {
      return await apiRequest("POST", "/api/returns", data);
    },
    onSuccess: () => {
      toast({
        title: t('returns.controlled.success'),
        description: "Return record created successfully",
      });
      setIsCreateDialogOpen(false);
      setFormData({
        senderName: "",
        trackingCarrier: "",
        trackingNumber: "",
        orderNumber: "",
        productName: "",
        returnReason: ""
      });
      queryClient.invalidateQueries({ queryKey: ["/api/returns"] });
    },
    onError: (error: any) => {
      toast({
        title: t('returns.controlled.error'),
        description: error.message || "An error occurred while creating the return record",
        variant: "destructive",
      });
    },
  });

  // Update seller notes mutation
  const updateSellerNotesMutation = useMutation({
    mutationFn: async ({ returnId, notes }: { returnId: number; notes: string }) => {
      return await apiRequest("PATCH", `/api/returns/${returnId}/seller-notes`, { sellerNotes: notes });
    },
    onSuccess: async (data, variables) => {
      // Update local state immediately
      setLocalNotesMap(prev => ({
        ...prev,
        [variables.returnId]: variables.notes
      }));
      
      // Update the cache
      queryClient.setQueryData(["/api/returns"], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((returnItem: any) => 
            returnItem.id === variables.returnId 
              ? { ...returnItem, sellerNotes: variables.notes, updatedAt: new Date().toISOString() }
              : returnItem
          )
        };
      });
      
      setEditingNotes(null);
      
      toast({
        title: t('returns.controlled.success'),
        description: t('returns.sellerNotes.success'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('returns.controlled.error'),
        description: t('returns.sellerNotes.error'),
        variant: "destructive",
      });
    },
  });

  // Debug user data structure
  console.log('SellerReturns: userData =', userData);
  console.log('SellerReturns: userData?.role =', userData?.role);
  console.log('SellerReturns: userData?.canAccessReturnSystem =', userData?.canAccessReturnSystem);
  console.log('SellerReturns: hasReturnAccess =', hasReturnAccess);
  
  // Show loading state while checking user permissions
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  // Show access denied message if user doesn't have permission
  if (!hasReturnAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t('returns.accessDenied.title', 'Access Denied')}
          </h3>
          <p className="text-gray-600 mb-4">
            {t('returns.accessDenied.description', 'You do not have permission to access the return management system. Please contact an administrator to request access.')}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">{t('returns.accessDenied.howToRequest', 'How to request access:')}</p>
            <p>{t('returns.accessDenied.instructions', 'Contact your system administrator or create a support ticket to request return management access.')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Handler functions
  const handleControlledToggle = (returnId: number, currentValue: boolean) => {
    setLocalControlledStates(prev => ({
      ...prev,
      [returnId]: !currentValue
    }));
    
    toggleControlledMutation.mutate(returnId);
  };

  const downloadMonthlyReport = async (format: 'csv' | 'excel') => {
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      const url = `/api/returns/report?month=${month}&year=${year}&format=${format}`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `returns_report_${month}_${year}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Başarılı",
        description: `${format.toUpperCase()} raporu indiriliyor`,
      });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: "Rapor indirilirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const handleCreateReturn = () => {
    if (!formData.senderName || !formData.trackingCarrier || !formData.trackingNumber) {
      toast({
        title: t('returns.controlled.error'),
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createReturnMutation.mutate(formData);
  };

  // Rest of the component rendering logic would go here
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Return Management System</h1>
      <p className="text-gray-600 mb-4">Access granted successfully!</p>
      
      {/* Add your existing UI components here */}
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Returns Dashboard</CardTitle>
            <CardDescription>Manage and track product returns</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading returns...</div>
            ) : (
              <div className="text-center py-8">
                <p>Returns data loaded successfully</p>
                {returnsData?.data && (
                  <p className="text-sm text-gray-600 mt-2">
                    Found {returnsData.data.length} returns
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SellerReturns() {
  return (
    <Layout>
      <SellerReturnsContent user={{}} />
    </Layout>
  );
}