import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Package, Settings, User, Truck, RotateCcw, MessageSquare, ShieldAlert, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout";

interface NotificationPreferences {
  emailMarketingCampaigns: boolean;
  shipmentStatusUpdates: string;
  accountNotifications: boolean;
  adminNotifications: boolean;
  trackingDeliveryNotifications: boolean;
  refundReturnNotifications: boolean;
  supportTicketNotifications: boolean;
  customsNotifications: boolean;
}

export default function NotificationPreferences() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current notification preferences
  const { data: preferences, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ["/api/notification-preferences"],
  });

  // Mutation to update preferences
  const updatePreferences = useMutation({
    mutationFn: async (newPreferences: Partial<NotificationPreferences>) => {
      return apiRequest("PATCH", "/api/notification-preferences", newPreferences);
    },
    onSuccess: () => {
      // Invalidate both notification preferences and user data caches
      queryClient.invalidateQueries({ queryKey: ["/api/notification-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      // Also clear the cached user data from storage to force fresh fetch
      localStorage.removeItem('moogship_session_user');
      sessionStorage.removeItem('moogship_session_user');

      toast({
        title: "Tercihler Guncellendi",
        description: "Bildirim tercihleriniz basariyla kaydedildi.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Bildirim tercihleri guncellenirken hata olustu",
        variant: "destructive",
      });
    },
  });

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: any) => {
    updatePreferences.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Tercihler yukleniyor...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Bildirim Tercihleri
          </h1>
          <p className="text-muted-foreground mt-2">
            MoogShip'ten aldiginiz bildirimleri kontrol edin.
          </p>
        </div>

      <div className="grid gap-6">
        {/* Tracking & Delivery Notifications */}
        <Card data-testid="card-tracking-delivery">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Kargo Takip ve Teslimat Bildirimleri
            </CardTitle>
            <CardDescription>
              Takip numarasi atandiginda, paket teslim edildiginde veya teslimat sorunlari oldugunda bildirim alin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                id="tracking-delivery"
                data-testid="switch-tracking-delivery"
                checked={preferences?.trackingDeliveryNotifications !== false}
                onCheckedChange={(checked) => handlePreferenceChange("trackingDeliveryNotifications", checked)}
                disabled={updatePreferences.isPending}
              />
              <Label htmlFor="tracking-delivery">
                {preferences?.trackingDeliveryNotifications !== false ? "Acik" : "Kapali"}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Shipment Status Updates */}
        <Card data-testid="card-shipment-updates">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Gonderi Durum Guncellemeleri
            </CardTitle>
            <CardDescription>
              Gonderileriniz hakkinda nasil guncelleme almak istediginizi secin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="shipment-updates">Guncelleme Sikligi</Label>
              <Select
                value={preferences?.shipmentStatusUpdates || "immediate"}
                onValueChange={(value) => handlePreferenceChange("shipmentStatusUpdates", value)}
                disabled={updatePreferences.isPending}
              >
                <SelectTrigger id="shipment-updates" data-testid="select-shipment-updates">
                  <SelectValue placeholder="Siklik secin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Aninda bildirim</SelectItem>
                  <SelectItem value="daily_digest">Gunluk ozet</SelectItem>
                  <SelectItem value="off">Bildirim alma</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {preferences?.shipmentStatusUpdates === "immediate" && "Gonderi durumu degistiginde aninda bildirim alin"}
                {preferences?.shipmentStatusUpdates === "daily_digest" && "Tum gonderi guncellemelerinin gunluk ozetini alin"}
                {preferences?.shipmentStatusUpdates === "off" && "Gonderi guncellemeleri icin e-posta bildirimi almayacaksiniz"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Refund & Return Notifications */}
        <Card data-testid="card-refund-return">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Iade ve Para Iadesi Bildirimleri
            </CardTitle>
            <CardDescription>
              Iade talepleriniz islendiginde veya iade durumlari degistiginde bildirim alin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                id="refund-return"
                data-testid="switch-refund-return"
                checked={preferences?.refundReturnNotifications !== false}
                onCheckedChange={(checked) => handlePreferenceChange("refundReturnNotifications", checked)}
                disabled={updatePreferences.isPending}
              />
              <Label htmlFor="refund-return">
                {preferences?.refundReturnNotifications !== false ? "Acik" : "Kapali"}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Support Ticket Notifications */}
        <Card data-testid="card-support-ticket">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Destek Talebi Bildirimleri
            </CardTitle>
            <CardDescription>
              Destek talepleriniz olusturuldigunda, guncellendiginde veya yanitlandiginda bildirim alin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                id="support-ticket"
                data-testid="switch-support-ticket"
                checked={preferences?.supportTicketNotifications !== false}
                onCheckedChange={(checked) => handlePreferenceChange("supportTicketNotifications", checked)}
                disabled={updatePreferences.isPending}
              />
              <Label htmlFor="support-ticket">
                {preferences?.supportTicketNotifications !== false ? "Acik" : "Kapali"}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Customs Notifications */}
        <Card data-testid="card-customs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Gumruk Bildirimleri
            </CardTitle>
            <CardDescription>
              Gonderilerinize ait gumruk ucretleri ve ithalat vergileri hakkinda bildirim alin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                id="customs"
                data-testid="switch-customs"
                checked={preferences?.customsNotifications !== false}
                onCheckedChange={(checked) => handlePreferenceChange("customsNotifications", checked)}
                disabled={updatePreferences.isPending}
              />
              <Label htmlFor="customs">
                {preferences?.customsNotifications !== false ? "Acik" : "Kapali"}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Email Marketing */}
        <Card data-testid="card-email-marketing">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              E-posta Pazarlama
            </CardTitle>
            <CardDescription>
              Yeni ozellikler, ozel teklifler ve sirket guncellemeleri hakkinda tanitim e-postalari alin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                id="email-marketing"
                data-testid="switch-email-marketing"
                checked={preferences?.emailMarketingCampaigns || false}
                onCheckedChange={(checked) => handlePreferenceChange("emailMarketingCampaigns", checked)}
                disabled={updatePreferences.isPending}
              />
              <Label htmlFor="email-marketing">
                {preferences?.emailMarketingCampaigns ? "Acik" : "Kapali"}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Account Notifications */}
        <Card data-testid="card-account-notifications">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Hesap Bildirimleri
            </CardTitle>
            <CardDescription>
              Hesabiniz ve guvenlik hakkinda onemli bildirimler.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                id="account-notifications"
                data-testid="switch-account-notifications"
                checked={preferences?.accountNotifications || false}
                onCheckedChange={(checked) => handlePreferenceChange("accountNotifications", checked)}
                disabled={updatePreferences.isPending}
              />
              <Label htmlFor="account-notifications">
                {preferences?.accountNotifications ? "Acik" : "Kapali"}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Admin Notifications */}
        <Card data-testid="card-admin-notifications">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Yonetim Bildirimleri
            </CardTitle>
            <CardDescription>
              MoogShip yoneticileri ve destek ekibinden gelen sistem bildirimleri.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                id="admin-notifications"
                data-testid="switch-admin-notifications"
                checked={preferences?.adminNotifications || false}
                onCheckedChange={(checked) => handlePreferenceChange("adminNotifications", checked)}
                disabled={updatePreferences.isPending}
              />
              <Label htmlFor="admin-notifications">
                {preferences?.adminNotifications ? "Acik" : "Kapali"}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Always Sent Info */}
        <Card className="border-dashed border-muted-foreground/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4" />
              Her Zaman Gonderilen (Kapatilmaz)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>E-posta dogrulama</li>
              <li>Sifre sifirlama</li>
              <li>Fatura hatirlatmalari</li>
              <li>Hesap onay bildirimleri</li>
            </ul>
          </CardContent>
        </Card>

        {/* Save Status */}
        {updatePreferences.isPending && (
          <Card data-testid="card-saving-status">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                Tercihler kaydediliyor...
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </Layout>
  );
}