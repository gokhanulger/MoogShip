import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Package, Settings, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout";

interface NotificationPreferences {
  emailMarketingCampaigns: boolean;
  shipmentStatusUpdates: string;
  accountNotifications: boolean;
  adminNotifications: boolean;
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
        title: "Preferences Updated",
        description: "Your notification preferences have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update notification preferences",
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
            <CardTitle>Loading preferences...</CardTitle>
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
            Notification Preferences
          </h1>
          <p className="text-muted-foreground mt-2">
            Control how and when you receive notifications from MoogShip.
          </p>
        </div>

      <div className="grid gap-6">
        {/* Email Marketing */}
        <Card data-testid="card-email-marketing">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Marketing
            </CardTitle>
            <CardDescription>
              Receive promotional emails about new features, special offers, and company updates.
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
                {preferences?.emailMarketingCampaigns ? "Enabled" : "Disabled"}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Shipment Status Updates */}
        <Card data-testid="card-shipment-updates">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Shipment Status Updates
            </CardTitle>
            <CardDescription>
              Choose how you want to receive updates about your shipments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="shipment-updates">Update Frequency</Label>
              <Select
                value={preferences?.shipmentStatusUpdates || "immediate"}
                onValueChange={(value) => handlePreferenceChange("shipmentStatusUpdates", value)}
                disabled={updatePreferences.isPending}
              >
                <SelectTrigger id="shipment-updates" data-testid="select-shipment-updates">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate notifications</SelectItem>
                  <SelectItem value="daily_digest">Daily digest</SelectItem>
                  <SelectItem value="off">No notifications</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {preferences?.shipmentStatusUpdates === "immediate" && "Get notified immediately when shipment status changes"}
                {preferences?.shipmentStatusUpdates === "daily_digest" && "Receive a daily summary of all shipment updates"}
                {preferences?.shipmentStatusUpdates === "off" && "No email notifications for shipment updates"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Notifications */}
        <Card data-testid="card-account-notifications">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Notifications
            </CardTitle>
            <CardDescription>
              Important notifications about your account, security, and billing.
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
                {preferences?.accountNotifications ? "Enabled" : "Disabled"}
              </Label>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              These notifications include security alerts, billing updates, and important account changes.
            </p>
          </CardContent>
        </Card>

        {/* Admin Notifications */}
        <Card data-testid="card-admin-notifications">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Administrative Notifications
            </CardTitle>
            <CardDescription>
              System notifications from MoogShip administrators and support team.
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
                {preferences?.adminNotifications ? "Enabled" : "Disabled"}
              </Label>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              These include system maintenance notices, policy updates, and direct communications from our team.
            </p>
          </CardContent>
        </Card>

        {/* Save Status */}
        {updatePreferences.isPending && (
          <Card data-testid="card-saving-status">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                Saving preferences...
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </Layout>
  );
}