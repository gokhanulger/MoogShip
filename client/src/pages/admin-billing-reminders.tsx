import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, Send, Users, AlertCircle, DollarSign, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout";

interface User {
  id: number;
  name: string;
  email: string;
  balance: number;
  minimumBalance: number | null;
  companyName: string | null;
}

interface BillingReminder {
  id: number;
  userId: number;
  reminderType: string;
  subject: string;
  message: string | null;
  createdAt: string;
  emailSent: boolean | null;
  emailSentAt: string | null;
  emailError: string | null;
  user?: {
    name: string;
    email: string;
  };
}

export default function AdminBillingReminders() {
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [reminderForm, setReminderForm] = useState({
    reminderType: "balance" as "balance" | "overdue" | "payment_request",
    subject: "Hesap Bakiye Hatırlatması",
    message: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Force refresh state for deployment caching issues
  const [forceRefresh, setForceRefresh] = useState(() => Date.now());

  // Fetch users with negative balances
  const { data: negativeBalanceResponse, error: negativeBalanceError, isLoading: negativeBalanceLoading, refetch: refetchNegativeBalance } = useQuery({
    queryKey: ['/api/billing-reminders/users-with-negative-balance', forceRefresh],
    staleTime: 0, // Force fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  const negativeBalanceUsers = negativeBalanceResponse?.users || [];

  // Debug logging for negative balance data
  console.log('🔍 Negative Balance Debug:', {
    response: negativeBalanceResponse,
    users: negativeBalanceUsers,
    length: negativeBalanceUsers.length,
    error: negativeBalanceError,
    loading: negativeBalanceLoading
  });

  // Fetch all users for reminder targeting
  const { data: allUsersResponse, error: allUsersError, isLoading: allUsersLoading, refetch: refetchAllUsers } = useQuery({
    queryKey: ['/api/billing-reminders/all-users', forceRefresh],
    staleTime: 0, // Force fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  const allUsers = allUsersResponse?.users || [];

  // Debug logging for all users data
  console.log('🔍 All Users Debug:', {
    response: allUsersResponse,
    users: allUsers,
    length: allUsers.length,
    error: allUsersError,
    loading: allUsersLoading
  });

  // Fetch billing reminder history
  const { data: reminderHistoryResponse, error: reminderHistoryError, isLoading: reminderHistoryLoading, refetch: refetchReminderHistory } = useQuery({
    queryKey: ['/api/billing-reminders/history', forceRefresh],
    staleTime: 0, // Force fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  const reminderHistory = reminderHistoryResponse?.reminders || [];

  // Debug logging for reminder history data
  console.log('🔍 Reminder History Debug:', {
    response: reminderHistoryResponse,
    reminders: reminderHistory,
    length: reminderHistory.length,
    error: reminderHistoryError,
    loading: reminderHistoryLoading
  });

  // Now define the manual refresh function after the queries
  const handleManualRefresh = async () => {
    console.log('Triggering manual language refresh');
    setForceRefresh(Date.now());

    try {
      // Clear all cache
      await queryClient.clear();

      // Invalidate all related queries
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/billing-reminders/users-with-negative-balance'] 
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/billing-reminders/all-users'] 
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/billing-reminders/history'] 
      });

      // Force refetch all queries
      await Promise.all([
        refetchNegativeBalance(),
        refetchAllUsers(), 
        refetchReminderHistory()
      ]);

      toast({
        title: "Data Refreshed",
        description: "All billing reminder data has been refreshed.",
      });
    } catch (error) {
      console.error('Error during manual refresh:', error);
      toast({
        title: "Refresh Error",
        description: "There was an error refreshing the data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Billing reminders data successfully loading

  // Helper function to compute delivery status
  const getDeliveryStatus = (reminder: BillingReminder) => {
    if (reminder.emailError) {
      return 'failed';
    } else if (reminder.emailSent && reminder.emailSentAt) {
      return 'sent';
    } else if (reminder.emailSent === false) {
      return 'pending';
    } else {
      return 'unknown';
    }
  };

  // Helper function to get delivery status badge color
  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Send single reminder mutation
  const sendSingleReminderMutation = useMutation({
    mutationFn: (data: { userId: number; reminderType: string; subject: string; message?: string }) => 
      apiRequest('POST', `/api/billing-reminders/send-reminder`, data),
    onSuccess: () => {
      toast({
        title: "Reminder Sent",
        description: "Billing reminder has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/billing-reminders/history'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reminder",
        variant: "destructive",
      });
    }
  });

  // Send bulk reminders mutation
  const sendBulkRemindersMutation = useMutation({
    mutationFn: (data: { userIds: number[]; reminderType: string; subject: string; message?: string }) => 
      apiRequest('POST', `/api/billing-reminders/send-bulk-reminders`, data),
    onSuccess: (data: any) => {
      toast({
        title: "Bulk Reminders Sent",
        description: `Successfully sent ${data.successCount} reminders.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/billing-reminders/history'] });
      setIsReminderDialogOpen(false);
      setSelectedUsers([]);
      setReminderForm({ reminderType: "balance", subject: "", message: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send bulk reminders",
        variant: "destructive",
      });
    }
  });

  const handleSendSingleReminder = (userId: number) => {
    if (!reminderForm.subject) {
      toast({
        title: "Error",
        description: "Please enter a subject for the reminder",
        variant: "destructive",
      });
      return;
    }

    sendSingleReminderMutation.mutate({
      userId,
      reminderType: reminderForm.reminderType,
      subject: reminderForm.subject,
      message: reminderForm.message
    });
  };

  const handleSendBulkReminders = () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one user",
        variant: "destructive",
      });
      return;
    }

    if (!reminderForm.subject) {
      toast({
        title: "Error",
        description: "Please enter a subject for the reminder",
        variant: "destructive",
      });
      return;
    }

    sendBulkRemindersMutation.mutate({
      userIds: selectedUsers,
      reminderType: reminderForm.reminderType,
      subject: reminderForm.subject,
      message: reminderForm.message
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const getReminderTypeColor = (type: string) => {
    switch (type) {
      case 'balance': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'payment_request': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleForceRefresh = useCallback(() => {
    // Force refresh all queries by updating the timestamp
    setForceRefresh(Date.now());

    // Also manually trigger refetch on all queries
    refetchNegativeBalance();
    refetchAllUsers();
    refetchReminderHistory();

    toast({
      title: "Data Refreshed",
      description: "All billing reminder data has been refreshed.",
    });
  }, [refetchNegativeBalance, refetchAllUsers, refetchReminderHistory, toast]);

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Billing Reminders</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleManualRefresh}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear Cache & Refresh
          </Button>
          <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Send Bulk Reminders
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Send Bulk Billing Reminders</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Reminder Type</label>
                  <Select 
                    value={reminderForm.reminderType} 
                    onValueChange={(value) => setReminderForm(prev => ({ ...prev, reminderType: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balance">Balance Reminder</SelectItem>
                      <SelectItem value="overdue">Overdue Payment</SelectItem>
                      <SelectItem value="payment_request">Payment Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    value={reminderForm.subject}
                    onChange={(e) => setReminderForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Enter email subject"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Custom Message (Optional)</label>
                <Textarea
                  value={reminderForm.message}
                  onChange={(e) => setReminderForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Add a custom message to the email"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Select Users ({selectedUsers.length} selected)</label>
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                  {allUsersLoading ? (
                    <p className="text-muted-foreground text-sm">Loading users...</p>
                  ) : allUsers.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No users available.</p>
                  ) : (
                    allUsers.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(prev => [...prev, user.id]);
                            } else {
                              setSelectedUsers(prev => prev.filter(id => id !== user.id));
                            }
                          }}
                        />
                        <span className="text-sm">
                          {user.name} ({user.email}) - {formatCurrency(user.balance)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <Button 
                onClick={handleSendBulkReminders} 
                disabled={sendBulkRemindersMutation.isPending}
                className="w-full"
              >
                {sendBulkRemindersMutation.isPending ? "Sending..." : "Send Reminders"}
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users with Negative Balance</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{negativeBalanceUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(negativeBalanceUsers.reduce((sum, user) => sum + Math.abs(user.balance), 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Total negative balances
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reminders Sent</CardTitle>
            <Mail className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reminderHistory.length}</div>
            <p className="text-xs text-muted-foreground">
              All time reminders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users with Negative Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Users with Negative Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {negativeBalanceError && (
            <div className="text-center py-4 text-red-500 mb-4">
              Error loading negative balance users: {negativeBalanceError.message}
              <button 
                onClick={() => refetchNegativeBalance()} 
                className="ml-2 text-blue-500 underline"
              >
                Retry
              </button>
            </div>
          )}
          {negativeBalanceLoading ? (
            <div className="text-center py-4">Loading users with negative balance...</div>
          ) : negativeBalanceUsers.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No users with negative balance.
              <div className="text-xs mt-2">
                Raw data: {negativeBalanceResponse?.users?.length || 0} users in response
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Min. Balance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {negativeBalanceUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.companyName || "N/A"}</TableCell>
                    <TableCell>
                      <span className="text-red-600 font-semibold">
                        {formatCurrency(user.balance)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.minimumBalance ? formatCurrency(user.minimumBalance) : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleSendSingleReminder(user.id)}
                        disabled={sendSingleReminderMutation.isPending || !reminderForm.subject}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Send Reminder
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Reminder Form */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Reminder Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Reminder Type</label>
              <Select 
                value={reminderForm.reminderType} 
                onValueChange={(value) => setReminderForm(prev => ({ ...prev, reminderType: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balance">Balance Reminder</SelectItem>
                  <SelectItem value="overdue">Overdue Payment</SelectItem>
                  <SelectItem value="payment_request">Payment Request</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={reminderForm.subject}
                onChange={(e) => setReminderForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Enter email subject"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => setReminderForm({ reminderType: "balance", subject: "Account Balance Reminder - MoogShip", message: "" })}
                variant="outline"
                className="w-full"
              >
                Use Default Template
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Custom Message (Optional)</label>
            <Textarea
              value={reminderForm.message}
              onChange={(e) => setReminderForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Add a custom message to the email"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reminder History */}
      <Card>
        <CardHeader>
          <CardTitle>Reminder History</CardTitle>
        </CardHeader>
        <CardContent>
          {reminderHistoryLoading ? (
            <p className="text-muted-foreground">Loading reminder history...</p>
          ) : reminderHistory.length === 0 ? (
            <p className="text-muted-foreground">No reminders sent yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminderHistory.map((reminder) => (
                  <TableRow key={reminder.id}>
                    <TableCell>
                      {new Date(reminder.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getReminderTypeColor(reminder.reminderType)}>
                        {reminder.reminderType.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{reminder.subject}</TableCell>
                    <TableCell>
                      {reminder.user?.name} ({reminder.user?.email})
                    </TableCell>
                    <TableCell>
                      <Badge className={getDeliveryStatusColor(getDeliveryStatus(reminder))}>
                        {getDeliveryStatus(reminder).toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>
    </Layout>
  );
}