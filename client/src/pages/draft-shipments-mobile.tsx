import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "wouter";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";

// Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";

// Icons
import {
  PlusCircle,
  RefreshCw,
  Search,
  Truck,
  Edit2,
  Trash2,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

// Utils
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

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

export default function DraftShipmentsMobile() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const auth = useAuth();
  const { user } = auth;

  // Check if authenticated, redirect if not
  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  const {
    data: drafts = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<DraftShipment[]>({
    queryKey: ["/api/drafts"],
    enabled: !!user,
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/drafts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(t("draftShipments.deleteError"));
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drafts"] });
      toast({
        title: t("draftShipments.deleteSuccess"),
        description: t("draftShipments.deleteSuccessDesc"),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("draftShipments.deleteError"),
      });
    },
  });

  const convertToShipmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/drafts/${id}/convert`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(t("draftShipments.convertError"));
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/my"] });
      
      toast({
        title: t("draftShipments.convertSuccess"),
        description: t("draftShipments.convertSuccessDesc"),
      });
      
      // Navigate to the newly created shipment
      if (data && data.shipmentId) {
        setLocation(`/shipment/${data.shipmentId}`);
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("draftShipments.convertError"),
      });
    },
  });

  // Filter drafts based on search term
  const filteredDrafts = searchTerm
    ? drafts.filter((draft: DraftShipment) => {
        const searchVal = searchTerm.toLowerCase();
        return (
          (draft.name && draft.name.toLowerCase().includes(searchVal)) ||
          (draft.senderName && draft.senderName.toLowerCase().includes(searchVal)) ||
          (draft.receiverName && draft.receiverName.toLowerCase().includes(searchVal)) ||
          (draft.receiverCity && draft.receiverCity.toLowerCase().includes(searchVal)) ||
          (draft.receiverCountry && draft.receiverCountry.toLowerCase().includes(searchVal))
        );
      })
    : drafts;

  const handleContinueCreating = (draftId: number) => {
    console.log(`Mobile: Navigating to edit draft ${draftId}`);
    // Force a full page load to ensure the parameters are properly passed
    window.location.href = `/shipment-create?draftId=${draftId}`;
  };

  if (!user) {
    return <div className="p-8">Redirecting to login...</div>;
  }

  return (
    <div className="mobile-only-page bg-background min-h-screen pb-20">
      <div className="container px-4 pt-4 pb-4">
        <div className="flex items-center mb-3">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/")}
            className="mr-1 p-2"
            size="sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">{t("draftShipments.title")}</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-3">
          {t("draftShipments.subtitle")}
        </p>

        <div className="flex flex-row gap-2 mb-3">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="h-9 text-sm px-3 py-2 flex-1"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            {t("common.refresh")}
          </Button>
          <Link href="/shipment-create" className="flex-1">
            <Button className="h-9 text-sm w-full px-3 py-2" size="sm">
              <PlusCircle className="h-4 w-4 mr-1" />
              {t("draftShipments.newShipment")}
            </Button>
          </Link>
        </div>

        <Card className="mb-4 shadow-md border-0 rounded-lg">
          <CardHeader className="pb-2 px-3 pt-3">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-base">{t("draftShipments.drafts")}</CardTitle>
              <div className="w-full relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("draftShipments.searchPlaceholder")}
                  className="pl-8 w-full h-9 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 py-2">
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
              <div className="space-y-2">
                {filteredDrafts.map((draft: DraftShipment) => (
                  <div key={draft.id} className="border rounded-md p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-sm">
                          {draft.name || t("draftShipments.untitledDraft")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(draft.lastUpdated || draft.createdAt), "MMM d, yyyy HH:mm")}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div>
                        <div className="font-medium text-xs">{t("draftShipments.sender")}</div>
                        <div>{draft.senderName || t("draftShipments.notSpecified")}</div>
                      </div>
                      <div>
                        <div className="font-medium text-xs">{t("draftShipments.receiver")}</div>
                        <div>
                          {draft.receiverName || t("draftShipments.notSpecified")}
                          {draft.receiverCity && (
                            <div className="text-xs text-muted-foreground">
                              {draft.receiverCity}
                              {draft.receiverCountry ? `, ${draft.receiverCountry}` : ""}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleContinueCreating(draft.id)}
                        className="h-8 text-xs flex-1"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        {t("draftShipments.continue")}
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 h-8 text-xs border-red-200 hover:bg-red-50 hover:text-red-600 flex-1"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
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
                              className="bg-green-50 text-green-600 hover:bg-green-100 border-green-200 h-8 text-xs flex-1"
                            >
                              <ArrowRight className="h-3 w-3 mr-1" />
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}