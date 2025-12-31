import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Mail, Package, Settings, User, Search, Filter, Clock, ExternalLink } from "lucide-react";
import Layout from "@/components/layout";

interface UserNotificationPreferences {
  id: number;
  name: string;
  email: string;
  username: string;
  emailMarketingCampaigns: boolean;
  shipmentStatusUpdates: string;
  accountNotifications: boolean;
  adminNotifications: boolean;
}

interface NotificationLog {
  id: number;
  type: string;
  recipientEmail: string;
  subject: string;
  sentAt: string;
  status: string;
  userId?: number;
  shipmentId?: number;
  campaignId?: number;
  metadata?: any;
}

interface UserEmailHistoryResponse {
  user: {
    id: number;
    name: string;
    email: string;
    username: string;
  };
  logs: NotificationLog[];
}

export default function AdminUserNotificationPreferences() {
  const [searchTerm, setSearchTerm] = useState("");
  const [localToggles, setLocalToggles] = useState<Record<number, Partial<UserNotificationPreferences>>>({});
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all users' notification preferences
  const { data: users, isLoading, error } = useQuery<UserNotificationPreferences[]>({
    queryKey: ["/api/admin/user-notification-preferences"],
    select: (data) => data.map(user => ({
      ...user,
      emailMarketingCampaigns: !!user.emailMarketingCampaigns,
      accountNotifications: !!user.accountNotifications,
      adminNotifications: !!user.adminNotifications,
      shipmentStatusUpdates: String(user.shipmentStatusUpdates || 'immediate'),
    })),
  });

  // Fetch user email history when a user is selected
  const { data: emailHistory, isLoading: emailHistoryLoading } = useQuery<UserEmailHistoryResponse>({
    queryKey: [`/api/admin/user-notification-logs/${selectedUserId}`],
    enabled: selectedUserId !== null,
  });

  // Mutation to update user notification preferences
  const updateUserNotificationMutation = useMutation({
    mutationFn: async ({ userId, preferences }: { userId: number; preferences: Partial<UserNotificationPreferences> }) => {
      const res = await apiRequest("PATCH", `/api/admin/user-notification-preferences/${userId}`, preferences);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update notification preferences");
      }
      
      return await res.json();
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Notification preferences updated",
        description: `Successfully updated preferences for ${updatedUser.name}`,
      });
      
      // Clear local toggle for this user since server confirmed the change
      setLocalToggles(prev => {
        const newState = { ...prev };
        delete newState[updatedUser.id];
        return newState;
      });
      
      // Update the cache with the server response
      queryClient.setQueryData(["/api/admin/user-notification-preferences"], (oldData: UserNotificationPreferences[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(user => user.id === updatedUser.id ? updatedUser : user);
      });
    },
    onError: (error: Error, variables) => {
      // Clear local toggle for this user since the change failed
      setLocalToggles(prev => {
        const newState = { ...prev };
        delete newState[variables.userId];
        return newState;
      });
      
      toast({
        title: "Failed to update notification preferences",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Apply local toggles for immediate UI feedback
  const usersWithLocalToggles = users?.map(user => ({
    ...user,
    ...localToggles[user.id]
  })) || [];

  // Filter users based on search term
  const filteredUsers = usersWithLocalToggles.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count opted-out users for each service (use local toggles for real-time counts)
  const optOutCounts = usersWithLocalToggles.length > 0 ? {
    emailMarketing: usersWithLocalToggles.filter(u => !u.emailMarketingCampaigns).length,
    shipmentOff: usersWithLocalToggles.filter(u => u.shipmentStatusUpdates === 'off').length,
    shipmentDigest: usersWithLocalToggles.filter(u => u.shipmentStatusUpdates === 'daily_digest').length,
    accountNotifications: usersWithLocalToggles.filter(u => !u.accountNotifications).length,
    adminNotifications: usersWithLocalToggles.filter(u => !u.adminNotifications).length,
  } : null;

  // Helper functions to handle preference updates
  const toggleEmailMarketing = (user: UserNotificationPreferences) => {
    const newValue = !user.emailMarketingCampaigns;
    
    // Immediately update local state for instant UI feedback
    setLocalToggles(prev => ({
      ...prev,
      [user.id]: { ...prev[user.id], emailMarketingCampaigns: newValue }
    }));
    
    // Server update
    updateUserNotificationMutation.mutate({
      userId: user.id,
      preferences: { emailMarketingCampaigns: newValue }
    });
  };

  const toggleAccountNotifications = (user: UserNotificationPreferences) => {
    const newValue = !user.accountNotifications;
    
    // Immediately update local state for instant UI feedback
    setLocalToggles(prev => ({
      ...prev,
      [user.id]: { ...prev[user.id], accountNotifications: newValue }
    }));
    
    // Server update
    updateUserNotificationMutation.mutate({
      userId: user.id,
      preferences: { accountNotifications: newValue }
    });
  };

  const toggleAdminNotifications = (user: UserNotificationPreferences) => {
    const newValue = !user.adminNotifications;
    
    // Immediately update local state for instant UI feedback
    setLocalToggles(prev => ({
      ...prev,
      [user.id]: { ...prev[user.id], adminNotifications: newValue }
    }));
    
    // Server update
    updateUserNotificationMutation.mutate({
      userId: user.id,
      preferences: { adminNotifications: newValue }
    });
  };

  const updateShipmentStatusUpdates = (user: UserNotificationPreferences, newStatus: string) => {
    // Immediately update local state for instant UI feedback
    setLocalToggles(prev => ({
      ...prev,
      [user.id]: { ...prev[user.id], shipmentStatusUpdates: newStatus }
    }));
    
    // Server update
    updateUserNotificationMutation.mutate({
      userId: user.id,
      preferences: { shipmentStatusUpdates: newStatus }
    });
  };

  const getShipmentStatusBadge = (status: string) => {
    switch (status) {
      case 'immediate':
        return <Badge variant="default" className="bg-green-100 text-green-800">Immediate</Badge>;
      case 'daily_digest':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Daily Digest</Badge>;
      case 'off':
        return <Badge variant="destructive">Off</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getBooleanBadge = (value: boolean, label: string) => {
    return value ? (
      <Badge variant="default" className="bg-green-100 text-green-800">On</Badge>
    ) : (
      <Badge variant="destructive">Off</Badge>
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Loading User Notification Preferences...
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Bell className="h-5 w-5" />
                Error Loading User Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Failed to load user notification preferences. Please try refreshing the page.
              </p>
              <p className="text-sm text-red-600 mt-2">
                {error instanceof Error ? error.message : 'Unknown error occurred'}
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!users || users.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                User Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                No users found in the system.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            User Notification Preferences
          </h1>
          <p className="text-muted-foreground mt-2">
            View which users have opted out of different notification services.
          </p>
        </div>

        {/* Summary Cards */}
        {optOutCounts && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Marketing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {optOutCounts.emailMarketing}
                </div>
                <p className="text-xs text-muted-foreground">users opted out</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Shipment Off
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {optOutCounts.shipmentOff}
                </div>
                <p className="text-xs text-muted-foreground">users turned off</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Digest Mode
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {optOutCounts.shipmentDigest}
                </div>
                <p className="text-xs text-muted-foreground">users on digest</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {optOutCounts.accountNotifications}
                </div>
                <p className="text-xs text-muted-foreground">users opted out</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Admin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {optOutCounts.adminNotifications}
                </div>
                <p className="text-xs text-muted-foreground">users opted out</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search by name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
              data-testid="input-search-users"
            />
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users ({filteredUsers.length})</CardTitle>
            <CardDescription>
              Manage each user's notification preferences with interactive controls. Use toggles to enable/disable preferences.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-center">Email Marketing</TableHead>
                    <TableHead className="text-center">Shipment Updates</TableHead>
                    <TableHead className="text-center">Account Notifications</TableHead>
                    <TableHead className="text-center">Admin Notifications</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div>
                          <button
                            onClick={() => setSelectedUserId(user.id)}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                            data-testid={`button-user-name-${user.id}`}
                          >
                            {user.name}
                          </button>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          <div className="text-xs text-muted-foreground">@{user.username}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={user.emailMarketingCampaigns}
                            onCheckedChange={() => toggleEmailMarketing(user)}
                            disabled={updateUserNotificationMutation.isPending}
                            data-testid={`switch-email-marketing-${user.id}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant={user.shipmentStatusUpdates === 'immediate' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateShipmentStatusUpdates(user, 'immediate')}
                            disabled={updateUserNotificationMutation.isPending}
                            data-testid={`button-shipment-immediate-${user.id}`}
                          >
                            Immediate
                          </Button>
                          <Button
                            variant={user.shipmentStatusUpdates === 'daily_digest' ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => updateShipmentStatusUpdates(user, 'daily_digest')}
                            disabled={updateUserNotificationMutation.isPending}
                            data-testid={`button-shipment-digest-${user.id}`}
                          >
                            Digest
                          </Button>
                          <Button
                            variant={user.shipmentStatusUpdates === 'off' ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={() => updateShipmentStatusUpdates(user, 'off')}
                            disabled={updateUserNotificationMutation.isPending}
                            data-testid={`button-shipment-off-${user.id}`}
                          >
                            Off
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={user.accountNotifications}
                            onCheckedChange={() => toggleAccountNotifications(user)}
                            disabled={updateUserNotificationMutation.isPending}
                            data-testid={`switch-account-notifications-${user.id}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={user.adminNotifications}
                            onCheckedChange={() => toggleAdminNotifications(user)}
                            disabled={updateUserNotificationMutation.isPending}
                            data-testid={`switch-admin-notifications-${user.id}`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No users found matching your search.' : 'No users found.'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email History Modal */}
        <Dialog open={selectedUserId !== null} onOpenChange={(open) => !open && setSelectedUserId(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email History{emailHistory?.user.name ? ` - ${emailHistory.user.name}` : ''}
              </DialogTitle>
              <DialogDescription>
                {emailHistory?.user ? (
                  `All emails sent to ${emailHistory.user.email} (${emailHistory.user.username})`
                ) : emailHistoryLoading ? (
                  'Loading user information...'
                ) : (
                  'User email history'
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 min-h-0">
              {emailHistoryLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading email history...</div>
                </div>
              ) : (
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-3 pr-4">
                    {emailHistory?.logs && emailHistory.logs.length > 0 ? (
                      emailHistory.logs.map((log) => (
                        <Card key={log.id} className="p-4" data-testid={`email-log-${log.id}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge 
                                  variant={log.status === 'sent' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}
                                  data-testid={`badge-status-${log.id}`}
                                >
                                  {log.status}
                                </Badge>
                                <Badge variant="outline" data-testid={`badge-type-${log.id}`}>
                                  {log.type}
                                </Badge>
                                {log.shipmentId && (
                                  <Badge variant="secondary" data-testid={`badge-shipment-${log.id}`}>
                                    Shipment #{log.shipmentId}
                                  </Badge>
                                )}
                                {log.campaignId && (
                                  <Badge variant="secondary" data-testid={`badge-campaign-${log.id}`}>
                                    Campaign #{log.campaignId}
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-medium text-sm mb-1" data-testid={`text-subject-${log.id}`}>
                                {log.subject}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span data-testid={`text-date-${log.id}`}>
                                  {new Date(log.sentAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground" data-testid="text-no-emails">
                        No emails found for this user.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}