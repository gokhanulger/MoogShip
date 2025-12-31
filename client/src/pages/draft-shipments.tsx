import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { 
  PlusCircle, 
  Truck, 
  Edit2, 
  Trash2, 
  RefreshCw,
  Search,
  ArrowRight
} from "lucide-react";
import Layout from "@/components/layout";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { withAuth } from "@/lib/with-auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type DraftShipment = {
  id: number;
  userId: number;
  senderName: string | null;
  senderAddress1: string | null;
  receiverName: string | null;
  receiverAddress: string | null;
  receiverCity: string | null;
  receiverCountry: string | null;
  packageContents: string | null;
  createdAt: string;
  lastUpdated: string;
  name: string;
};

function DraftShipmentsContent() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Mobile redirection was disabled because it was causing issues with navigation
  // useEffect(() => {
  //   const checkMobileAndRedirect = () => {
  //     const isMobile = window.innerWidth <= 768;
  //     if (isMobile) {
  //       window.location.href = '/draft-shipments-mobile';
  //     }
  //   };
  //   
  //   // Check on initial load
  //   checkMobileAndRedirect();
  //   
  //   // Add event listener for window resize
  //   window.addEventListener('resize', checkMobileAndRedirect);
  //   
  //   // Clean up event listener
  //   return () => {
  //     window.removeEventListener('resize', checkMobileAndRedirect);
  //   };
  // }, []);

  // Fetch draft shipments
  const {
    data: drafts,
    isLoading,
    isError,
    refetch,
  } = useQuery<DraftShipment[]>({
    queryKey: ["/api/drafts"],
    enabled: !!user,
  });

  // Delete draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: (draftId: number) => {
      return apiRequest("DELETE", `/api/drafts/${draftId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drafts"] });
      toast({
        title: t("draftShipments.deleteSuccess"),
        description: t("draftShipments.deleteSuccessDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("draftShipments.deleteError"),
        description: t("draftShipments.deleteErrorDesc"),
        variant: "destructive",
      });
    },
  });

  // Convert to shipment mutation
  const convertToShipmentMutation = useMutation({
    mutationFn: async (draftId: number) => {
      const response = await apiRequest("POST", `/api/drafts/${draftId}/convert`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      toast({
        title: t("draftShipments.convertSuccess"),
        description: t("draftShipments.convertSuccessDesc"),
      });
      
      // Navigate to the newly created shipment
      if (data && data.id) {
        navigate(`/shipments/${data.id}`);
      }
    },
    onError: () => {
      toast({
        title: t("draftShipments.convertError"),
        description: t("draftShipments.convertErrorDesc"),
        variant: "destructive",
      });
    },
  });

  // Filter drafts based on search term
  const filteredDrafts = Array.isArray(drafts) 
    ? drafts.filter((draft: DraftShipment) => {
        if (!searchTerm) return true;
        
        const searchLower = searchTerm.toLowerCase();
        return (
          (draft.name?.toLowerCase().includes(searchLower)) ||
          (draft.senderName?.toLowerCase().includes(searchLower)) ||
          (draft.receiverName?.toLowerCase().includes(searchLower)) ||
          (draft.receiverCity?.toLowerCase().includes(searchLower))
        );
      })
    : [];

  // Handle continue creating shipment
  const handleContinueCreating = (draftId: number) => {
    // Using proper navigation with proper error handling to prevent unexpected redirects
    try {
      console.log(`Navigating to edit draft ${draftId}`);
      // Force a full page load to ensure the parameters are properly passed
      window.location.href = `/shipment-create?draftId=${draftId}`;
    } catch (error) {
      console.error("Navigation error:", error);
      toast({
        title: t("common.error"),
        description: t("draftShipments.navigationError", "There was an error navigating to the shipment creation page."),
        variant: "destructive"
      });
    }
  };

  return (
    <Layout user={user}>
      <div className="container max-w-7xl mx-auto px-4 py-4 md:py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t("draftShipments.title")}</h1>
            <p className="text-muted-foreground">
              {t("draftShipments.subtitle")}
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="h-9"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("common.refresh")}
            </Button>
            <Link href="/shipment-create">
              <Button className="h-9">
                <PlusCircle className="h-4 w-4 mr-2" />
                {t("draftShipments.newShipment")}
              </Button>
            </Link>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <CardTitle>{t("draftShipments.drafts")}</CardTitle>
              <div className="mt-3 md:mt-0 w-full md:w-auto relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("draftShipments.searchPlaceholder")}
                  className="pl-8 w-full md:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <Alert variant="destructive">
                <AlertTitle>{t("common.error")}</AlertTitle>
                <AlertDescription>
                  {t("draftShipments.loadError")}
                </AlertDescription>
              </Alert>
            ) : filteredDrafts?.length === 0 ? (
              <div className="text-center py-10">
                <Truck className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">
                  {searchTerm
                    ? t("draftShipments.noSearchResults")
                    : t("draftShipments.noDrafts")}
                </h3>
                <p className="mt-2 text-muted-foreground">
                  {searchTerm
                    ? t("draftShipments.tryDifferentSearch")
                    : t("draftShipments.createFirstDraft")}
                </p>
                {!searchTerm && (
                  <Link href="/shipment-create">
                    <Button className="mt-4">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      {t("draftShipments.startCreating")}
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[500px] rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("draftShipments.name")}</TableHead>
                      <TableHead>{t("draftShipments.sender")}</TableHead>
                      <TableHead>{t("draftShipments.receiver")}</TableHead>
                      <TableHead>{t("draftShipments.lastUpdated")}</TableHead>
                      <TableHead className="text-right">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDrafts.map((draft: DraftShipment) => (
                      <TableRow key={draft.id}>
                        <TableCell className="font-medium">
                          {draft.name || t("draftShipments.untitledDraft")}
                        </TableCell>
                        <TableCell>
                          {draft.senderName || t("draftShipments.notSpecified")}
                        </TableCell>
                        <TableCell>
                          <div>
                            {draft.receiverName || t("draftShipments.notSpecified")}
                            {draft.receiverCity && (
                              <div className="text-sm text-muted-foreground">
                                {draft.receiverCity}
                                {draft.receiverCountry ? `, ${draft.receiverCountry}` : ""}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {draft.lastUpdated
                            ? format(new Date(draft.lastUpdated), "MMM d, yyyy HH:mm")
                            : format(new Date(draft.createdAt), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 relative z-20">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleContinueCreating(draft.id)}
                              className="relative z-20 hover:bg-blue-50"
                              style={{ touchAction: 'auto', pointerEvents: 'auto' }}
                            >
                              <Edit2 className="h-4 w-4 mr-1" />
                              {t("draftShipments.continue")}
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50 relative z-20"
                                  style={{ touchAction: 'auto', pointerEvents: 'auto' }}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  {t("common.delete")}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("draftShipments.deleteConfirmTitle")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("draftShipments.deleteConfirmDesc")}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteDraftMutation.mutate(draft.id)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    {t("common.delete")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            
                            {draft.receiverName && draft.receiverAddress && draft.packageContents && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-green-50 text-green-600 hover:bg-green-100 border-green-200 relative z-20"
                                    style={{ touchAction: 'auto', pointerEvents: 'auto' }}
                                  >
                                    <ArrowRight className="h-4 w-4 mr-1" />
                                    {t("draftShipments.convert")}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t("draftShipments.convertConfirmTitle")}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t("draftShipments.convertConfirmDesc")}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => convertToShipmentMutation.mutate(draft.id)}
                                    >
                                      {t("draftShipments.confirmConvert")}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default withAuth(DraftShipmentsContent);