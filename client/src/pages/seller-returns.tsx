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
import { Plus, Search, Eye, Download, Edit, Save, X, Camera, Upload } from "lucide-react";
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

  // Photos Display Component
  const ReturnPhotosDisplay = ({ returnId }: { returnId: number }) => {
    const { data: photos, isLoading } = useQuery({
      queryKey: ["/api/returns", returnId, "photos"],
      enabled: !!returnId
    });

    if (isLoading) {
      return <div className="text-sm text-gray-500">Loading photos...</div>;
    }

    const photoList = photos?.data || [];

    if (photoList.length === 0) {
      return <div className="text-sm text-gray-500">No photos uploaded yet.</div>;
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photoList.map((photo: any) => (
          <div key={photo.id} className="relative group">
            <img
              src={photo.url}
              alt={photo.originalName}
              className="w-full h-32 object-cover rounded-lg border border-gray-200"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg" />
            <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-xs text-white truncate bg-black bg-opacity-50 px-2 py-1 rounded">
                {photo.originalName}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
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
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [cameraReturnId, setCameraReturnId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<CreateReturnFormData>({
    senderName: "",
    trackingCarrier: "",
    trackingNumber: "",
    orderNumber: "",
    productName: "",
    returnReason: ""
  });

  // Check if user has access to return system (handle null/false explicitly)
  const isAdmin = (userData as any)?.role === 'admin';
  const hasReturnAccess = isAdmin || (userData as any)?.canAccessReturnSystem === true;

  // Fetch user's returns or all returns for admin (always call hook, but conditionally enable)
  const { data: returnsData, isLoading } = useQuery({
    queryKey: isAdmin ? ["/api/admin/returns"] : ["/api/returns"],
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

  // Photo upload mutation
  const uploadPhotosMutation = useMutation({
    mutationFn: async ({ returnId, files }: { returnId: number; files: File[] }) => {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('photos', file);
      });
      
      const response = await fetch(`/api/admin/returns/${returnId}/photos`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload photos');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Photos uploaded successfully",
      });
      setUploadingPhotos(false);
      setIsCameraOpen(false);
      setCameraReturnId(null);
      // Refresh photos for the return
      if (selectedReturnId) {
        queryClient.invalidateQueries({ queryKey: ["/api/returns", selectedReturnId, "photos"] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload photos",
        variant: "destructive",
      });
      setUploadingPhotos(false);
    },
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
        
        // Don't clear local state - let it persist until user navigates away or refreshes
        // This ensures the UI always shows the correct state
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
  console.log('SellerReturns: userData?.role =', (userData as any)?.role);
  console.log('SellerReturns: userData?.canAccessReturnSystem =', (userData as any)?.canAccessReturnSystem);
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

  // Handle controlled toggle with immediate UI update
  const handleControlledToggle = (returnId: number, currentValue: boolean) => {
    // Immediately update local state for instant UI feedback
    setLocalControlledStates(prev => ({
      ...prev,
      [returnId]: !currentValue
    }));
    
    // Trigger the mutation
    toggleControlledMutation.mutate(returnId);
  };

  // Camera and photo handling functions
  const openCamera = (returnId: number) => {
    setCameraReturnId(returnId);
    setIsCameraOpen(true);
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0 && cameraReturnId) {
      setUploadingPhotos(true);
      const fileArray = Array.from(files);
      uploadPhotosMutation.mutate({ returnId: cameraReturnId, files: fileArray });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, returnId: number) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setUploadingPhotos(true);
      const fileArray = Array.from(files);
      uploadPhotosMutation.mutate({ returnId, files: fileArray });
    }
  };

  // Check if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Download monthly report function
  const downloadMonthlyReport = async (format: 'csv' | 'excel') => {
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      const url = `/api/returns/report?month=${month}&year=${year}&format=${format}`;
      
      // Create a temporary link to trigger download
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
        title: "Hata",
        description: "Gönderen adı, kargo firması ve takip numarası zorunludur",
        variant: "destructive",
      });
      return;
    }
    createReturnMutation.mutate(formData);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending": return "default";
      case "received": return "secondary";
      case "completed": return "outline";
      default: return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return t('returns.status.pending');
      case "received": return t('returns.status.received');
      case "completed": return t('returns.status.completed');
      default: return status;
    }
  };

  // Handle notes editing
  const handleStartEditingNotes = (returnItem: Return) => {
    setEditingNotes(returnItem.id);
    // Use local notes if available, otherwise use the cached notes
    const currentNotes = localNotesMap[returnItem.id] !== undefined 
      ? localNotesMap[returnItem.id] 
      : returnItem.sellerNotes || "";
    setNotesText(currentNotes);
  };

  const handleSaveNotes = (returnId: number) => {
    updateSellerNotesMutation.mutate({ returnId, notes: notesText });
  };

  const handleCancelEditingNotes = () => {
    setEditingNotes(null);
    setNotesText("");
  };

  // Filter returns
  const filteredReturns = (returnsData as any)?.data?.filter((returnItem: Return) => {
    const matchesSearch = returnItem.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (returnItem.orderNumber && returnItem.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || returnItem.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Debug logging
  console.log("Returns data:", returnsData);
  console.log("Filtered returns:", filteredReturns);
  if (filteredReturns.length > 0) {
    console.log("First return isControlled:", filteredReturns[0].isControlled);
  }

  // Render different interfaces for admin vs regular users
  if (isAdmin) {
    return (
      <div className="space-y-6">
        {/* Admin Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Return Management</h1>
            <p className="text-gray-600">Manage all returns across the system</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Monthly Report Download */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadMonthlyReport('csv')}
                className="text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadMonthlyReport('excel')}
                className="text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                Excel
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search returns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="inspected">Inspected</SelectItem>
              <SelectItem value="refund_initiated">Refund Initiated</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Admin Returns Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No returns found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sender Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReturns.map((returnItem: any) => (
                    <tr key={returnItem.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        #{returnItem.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {returnItem.sellerName || `User ${returnItem.sellerId}`}
                        {returnItem.sellerEmail && (
                          <div className="text-xs text-gray-400">{returnItem.sellerEmail}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {returnItem.senderName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div>{returnItem.trackingCarrier}</div>
                        <div className="text-xs text-gray-400">{returnItem.trackingNumber}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(returnItem.status)}>
                          {returnItem.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {returnItem.createdAt ? format(new Date(returnItem.createdAt), 'MMM dd, yyyy') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedReturnId(returnItem.id)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Return Details Dialog - Shared between admin and regular users */}
        {selectedReturnId && (
          <Dialog open={!!selectedReturnId} onOpenChange={() => setSelectedReturnId(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Return Details - #{selectedReturnId}</DialogTitle>
              </DialogHeader>
              {(() => {
                // Always get fresh data from the query cache
                const currentReturnsData = returnsData?.data || [];
                const returnItem = currentReturnsData.find((r: Return) => r.id === selectedReturnId);
                return returnItem ? (
                  <div className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Sender Information</Label>
                          <div className="mt-1 text-sm text-gray-900">{returnItem.senderName}</div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Tracking Carrier</Label>
                          <div className="mt-1 text-sm text-gray-900">{returnItem.trackingCarrier}</div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Tracking Number</Label>
                          <div className="mt-1 text-sm text-gray-900">{returnItem.trackingNumber}</div>
                        </div>
                        {returnItem.orderNumber && (
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Order Number</Label>
                            <div className="mt-1 text-sm text-gray-900">{returnItem.orderNumber}</div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Status</Label>
                          <div className="mt-1">
                            <Badge variant={getStatusBadgeVariant(returnItem.status)}>
                              {returnItem.status}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Created Date</Label>
                          <div className="mt-1 text-sm text-gray-900">
                            {returnItem.createdAt ? format(new Date(returnItem.createdAt), 'PPp') : '-'}
                          </div>
                        </div>
                        {returnItem.productName && (
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Product Name</Label>
                            <div className="mt-1 text-sm text-gray-900">{returnItem.productName}</div>
                          </div>
                        )}
                        {returnItem.returnReason && (
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Return Reason</Label>
                            <div className="mt-1 text-sm text-gray-900">{returnItem.returnReason}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Photos Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-lg font-medium text-gray-900">Photos</Label>
                        {isAdmin && (
                          <div className="flex gap-2">
                            {/* Mobile camera button */}
                            {isMobile && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCameraCapture(returnItem.id)}
                                disabled={uploadingPhotos}
                              >
                                <Camera className="w-4 h-4 mr-1" />
                                {uploadingPhotos && cameraReturnId === returnItem.id ? 'Uploading...' : 'Camera'}
                              </Button>
                            )}
                            {/* Desktop file upload */}
                            {!isMobile && (
                              <div className="relative">
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={(e) => handleFileUpload(e, returnItem.id)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  disabled={uploadingPhotos}
                                />
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  disabled={uploadingPhotos}
                                >
                                  <Upload className="w-4 h-4 mr-1" />
                                  {uploadingPhotos && cameraReturnId === returnItem.id ? 'Uploading...' : 'Upload'}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Photos Display */}
                      <ReturnPhotosDisplay returnId={returnItem.id} />
                    </div>
                  </div>
                ) : (
                  <div>Return not found</div>
                );
              })()}
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  // Regular user interface
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('returns.title')}</h1>
          <p className="text-gray-600">{t('returns.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Monthly Report Download */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadMonthlyReport('csv')}
              className="text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadMonthlyReport('excel')}
              className="text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Excel
            </Button>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('returns.createButton')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t('returns.createDialog.title')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="senderName">{t('returns.createDialog.senderName')}</Label>
                    <Input
                      id="senderName"
                      value={formData.senderName}
                      onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                      placeholder={t('returns.createDialog.senderNamePlaceholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="trackingCarrier">{t('returns.createDialog.trackingCarrier')}</Label>
                    <Select value={formData.trackingCarrier} onValueChange={(value) => setFormData({ ...formData, trackingCarrier: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('returns.createDialog.trackingCarrierPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ups">UPS</SelectItem>
                        <SelectItem value="fedex">FedEx</SelectItem>
                        <SelectItem value="dhl">DHL</SelectItem>
                        <SelectItem value="usps">USPS</SelectItem>
                        <SelectItem value="other">Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="trackingNumber">{t('returns.createDialog.trackingNumber')}</Label>
                  <Input
                    id="trackingNumber"
                    value={formData.trackingNumber}
                    onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                    placeholder={t('returns.createDialog.trackingNumberPlaceholder')}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="orderNumber">{t('returns.createDialog.orderNumber')}</Label>
                    <Input
                      id="orderNumber"
                      value={formData.orderNumber}
                      onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                      placeholder={t('returns.createDialog.orderNumberPlaceholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="productName">{t('returns.createDialog.productName')}</Label>
                    <Input
                      id="productName"
                      value={formData.productName}
                      onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                      placeholder={t('returns.createDialog.productNamePlaceholder')}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="returnReason">{t('returns.createDialog.returnReason')}</Label>
                  <Input
                    id="returnReason"
                    value={formData.returnReason}
                    onChange={(e) => setFormData({ ...formData, returnReason: e.target.value })}
                    placeholder={t('returns.createDialog.returnReasonPlaceholder')}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    {t('returns.createDialog.cancel')}
                  </Button>
                  <Button onClick={handleCreateReturn} disabled={createReturnMutation.isPending}>
                    {createReturnMutation.isPending ? t('returns.createDialog.creating') : t('returns.createDialog.create')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={t('returns.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('returns.statusFilter.all')}</SelectItem>
            <SelectItem value="pending">{t('returns.statusFilter.pending')}</SelectItem>
            <SelectItem value="received">{t('returns.statusFilter.received')}</SelectItem>
            <SelectItem value="completed">{t('returns.statusFilter.completed')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Returns List */}
      {isLoading ? (
        <div className="text-center py-8">{t('returns.loading')}</div>
      ) : filteredReturns.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              {searchTerm || statusFilter !== "all" ? "No returns found matching your search criteria." : t('returns.noReturns.message')}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredReturns.map((returnItem: Return) => (
            <Card key={returnItem.id} className={`hover:shadow-md transition-shadow ${(() => {
              const isControlled = localControlledStates[returnItem.id] !== undefined 
                ? localControlledStates[returnItem.id] 
                : returnItem.isControlled;
              return isControlled ? "bg-green-100 border-green-300" : "";
            })()}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">#{returnItem.id} - {returnItem.senderName}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(returnItem.status)}>
                      {getStatusText(returnItem.status)}
                    </Badge>
                    <Button
                      variant={(() => {
                        const isControlled = localControlledStates[returnItem.id] !== undefined 
                          ? localControlledStates[returnItem.id] 
                          : returnItem.isControlled;
                        return isControlled ? "default" : "outline";
                      })()}
                      size="sm"
                      onClick={() => {
                        const currentValue = localControlledStates[returnItem.id] !== undefined 
                          ? localControlledStates[returnItem.id] 
                          : (returnItem.isControlled || false);
                        handleControlledToggle(returnItem.id, currentValue);
                      }}
                      disabled={toggleControlledMutation.isPending}
                    >
                      {(() => {
                        const isControlled = localControlledStates[returnItem.id] !== undefined 
                          ? localControlledStates[returnItem.id] 
                          : returnItem.isControlled;
                        return isControlled ? `✓ ${t('returns.table.controlled')}` : t('returns.controlled.markAsControlled');
                      })()}
                    </Button>
                    {/* Mobile camera button for admin users */}
                    {isAdmin && isMobile && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openCamera(returnItem.id)}
                        disabled={uploadingPhotos}
                      >
                        <Camera className="w-4 h-4 mr-1" />
                        {uploadingPhotos && cameraReturnId === returnItem.id ? 'Uploading...' : 'Photo'}
                      </Button>
                    )}
                    {/* Desktop file upload for admin users */}
                    {isAdmin && !isMobile && (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleFileUpload(e, returnItem.id)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={uploadingPhotos}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={uploadingPhotos}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          {uploadingPhotos && cameraReturnId === returnItem.id ? 'Uploading...' : 'Upload'}
                        </Button>
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedReturnId(returnItem.id)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {t('returns.actions.viewDetails')}
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">{t('returns.table.carrier')}:</span> {returnItem.trackingCarrier}
                    </div>
                    <div>
                      <span className="font-medium">{t('returns.table.trackingNumber')}:</span> {returnItem.trackingNumber}
                    </div>
                    {returnItem.orderNumber && (
                      <div>
                        <span className="font-medium">{t('returns.table.orderNumber')}:</span> {returnItem.orderNumber}
                      </div>
                    )}
                    {returnItem.productName && (
                      <div>
                        <span className="font-medium">{t('returns.table.productName')}:</span> {returnItem.productName}
                      </div>
                    )}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>{t('returns.table.created')}: {returnItem.createdAt ? format(new Date(returnItem.createdAt), 'dd/MM/yyyy HH:mm') : 'N/A'}</span>
                  {returnItem.updatedAt && returnItem.createdAt !== returnItem.updatedAt && (
                    <span>{t('returns.table.updated')}: {format(new Date(returnItem.updatedAt), 'dd/MM/yyyy HH:mm')}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Mobile Camera Dialog */}
      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Take Photo for Return #{cameraReturnId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Use your device camera to take a photo for this return.
            </p>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleCameraCapture}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={uploadingPhotos}
              />
              {uploadingPhotos && (
                <div className="text-center text-sm text-blue-600">
                  Uploading photos...
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsCameraOpen(false)}
                disabled={uploadingPhotos}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Return Detail Dialog */}
      <Dialog open={!!selectedReturnId} onOpenChange={() => setSelectedReturnId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('returns.detailDialog.title')}</DialogTitle>
          </DialogHeader>
          {selectedReturnId && (
            <div className="space-y-6">
              {(() => {
                // Always get fresh data from the query cache
                const currentReturnsData = returnsData?.data || [];
                const returnItem = currentReturnsData.find((r: Return) => r.id === selectedReturnId);
                if (!returnItem) return <div>{t('returns.detailDialog.notFound')}</div>;

                return (
                  <>
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h3 className="font-semibold">{t('returns.detailDialog.basicInfo')}</h3>
                        <div className="space-y-2 text-sm">
                          <div><span className="font-medium">{t('returns.detailDialog.returnId')}:</span> #{returnItem.id}</div>
                          <div><span className="font-medium">{t('returns.detailDialog.senderName')}:</span> {returnItem.senderName}</div>
                          <div><span className="font-medium">{t('returns.detailDialog.carrier')}:</span> {returnItem.trackingCarrier}</div>
                          <div><span className="font-medium">{t('returns.detailDialog.trackingNumber')}:</span> {returnItem.trackingNumber}</div>
                          <div>
                            <span className="font-medium">{t('returns.detailDialog.status')}:</span> 
                            <Badge variant={getStatusBadgeVariant(returnItem.status)} className="ml-2">
                              {getStatusText(returnItem.status)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="font-semibold">Ek Bilgiler</h3>
                        <div className="space-y-2 text-sm">
                          <div><span className="font-medium">Sipariş No:</span> {returnItem.orderNumber || "Belirtilmemiş"}</div>
                          <div><span className="font-medium">Ürün Adı:</span> {returnItem.productName || "Belirtilmemiş"}</div>
                          <div><span className="font-medium">İade Sebebi:</span> {returnItem.returnReason || "Belirtilmemiş"}</div>
                          <div><span className="font-medium">Oluşturulma:</span> {returnItem.createdAt ? format(new Date(returnItem.createdAt), 'dd/MM/yyyy HH:mm') : 'N/A'}</div>
                          {returnItem.updatedAt && returnItem.createdAt !== returnItem.updatedAt && (
                            <div><span className="font-medium">Son Güncelleme:</span> {format(new Date(returnItem.updatedAt), 'dd/MM/yyyy HH:mm')}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Admin Notes */}
                    {returnItem.adminNotes && (
                      <div>
                        <h3 className="font-semibold mb-2">Admin Notları</h3>
                        <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                          {returnItem.adminNotes}
                        </p>
                      </div>
                    )}

                    {/* Seller Notes */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{t('returns.sellerNotes.title')}</h3>
                        {editingNotes !== returnItem.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartEditingNotes(returnItem)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            {t('returns.sellerNotes.edit')}
                          </Button>
                        )}
                      </div>
                      
                      {editingNotes === returnItem.id ? (
                        <div className="space-y-3">
                          <Textarea
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            placeholder={t('returns.sellerNotes.placeholder')}
                            className="min-h-[100px]"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveNotes(returnItem.id)}
                              disabled={updateSellerNotesMutation.isPending}
                            >
                              {updateSellerNotesMutation.isPending ? (
                                <>
                                  <Save className="w-3 h-3 mr-1 animate-spin" />
                                  {t('returns.sellerNotes.saving')}
                                </>
                              ) : (
                                <>
                                  <Save className="w-3 h-3 mr-1" />
                                  {t('returns.sellerNotes.save')}
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEditingNotes}
                            >
                              <X className="w-3 h-3 mr-1" />
                              {t('returns.sellerNotes.cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-3 rounded min-h-[60px]">
                          {(localNotesMap[returnItem.id] !== undefined ? localNotesMap[returnItem.id] : returnItem.sellerNotes) ? (
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {localNotesMap[returnItem.id] !== undefined ? localNotesMap[returnItem.id] : returnItem.sellerNotes}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 italic">
                              {t('returns.sellerNotes.empty')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Photos Section */}
                    <div>
                      <h3 className="font-semibold mb-3">Fotoğraflar</h3>
                      {(photosData as any)?.data && (photosData as any).data.length > 0 ? (
                        <div className="grid grid-cols-3 gap-4">
                          {(photosData as any).data.map((photo: any) => (
                            <div key={photo.id} className="relative">
                              <img
                                src={photo.url}
                                alt={photo.originalName}
                                className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-75 transition-opacity"
                                onClick={() => setSelectedPhoto(photo.url)}
                              />
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {photo.originalName}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Henüz fotoğraf yüklenmemiş</p>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Photo Enlargement Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2">
          <div className="relative">
            <img
              src={selectedPhoto || ""}
              alt="Enlarged photo"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75"
            >
              ✕
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simple export without authentication wrapper for now
export default function SellerReturns() {
  const user = { id: 1, name: "Test User" }; // Mock user for now
  return (
    <Layout user={user}>
      <SellerReturnsContent user={user} />
    </Layout>
  );
}