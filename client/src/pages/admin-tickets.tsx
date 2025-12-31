import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { 
  Loader2, Search, Filter, CheckCircle, AlertCircle, Clock, AlertTriangle, 
  MoreHorizontal, GridIcon, TableIcon, RefreshCw, Plus, User, 
  Calendar, Tag, Flag, Eye, UserCheck, X, MessageSquare, Archive,
  Mail, Activity, TrendingUp, Users, Trash2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDistanceToNow, format } from 'date-fns';
import Layout from "@/components/layout";
import { useTranslation } from "react-i18next";

// Types for tickets
interface Ticket {
  id: number;
  userId: number;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  assignedTo: number | null;
  relatedShipmentId: number | null;
  closedAt: string | null;
  closedBy: number | null;
  closureReason: string | null;
  userName?: string; // Optional user name for displaying
  userEmail?: string; // Optional user email for displaying
}

// Priority badge colors
// Priority colors are now defined in shared schema

// Import status and priority colors from shared schema for consistency
import { TicketStatusColors, TicketPriorityColors } from '@shared/schema';

// Status display names
const statusDisplayNames: Record<string, string> = {
  'open': 'Open',
  'in_progress': 'In Progress',
  'waiting_on_customer': 'Waiting on Customer',
  'resolved': 'Resolved',
  'closed': 'Closed'
};

// Category badge colors
const categoryColors: Record<string, string> = {
  'technical': 'bg-purple-100 text-purple-800',
  'billing': 'bg-green-100 text-green-800',
  'shipping': 'bg-blue-100 text-blue-800',
  'account': 'bg-orange-100 text-orange-800',
  'general': 'bg-gray-100 text-gray-800'
};

// Status icons
const statusIcons: Record<string, React.ReactNode> = {
  'open': <AlertCircle className="h-4 w-4 mr-1 text-blue-600" />,
  'in_progress': <Clock className="h-4 w-4 mr-1 text-purple-600" />,
  'waiting_on_customer': <AlertTriangle className="h-4 w-4 mr-1 text-yellow-600" />,
  'resolved': <CheckCircle className="h-4 w-4 mr-1 text-green-600" />,
  'closed': <CheckCircle className="h-4 w-4 mr-1 text-gray-600" />
};

function AdminTicketsList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'processing' | 'completed'>('processing');
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isStatusUpdateDialogOpen, setIsStatusUpdateDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [closureReason, setClosureReason] = useState('');
  
  // Ticket selection state
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<number>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkResolveDialogOpen, setIsBulkResolveDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<number | null>(null);
  
  // Fetch current user ID
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/check-admin');
        if (response.ok) {
          const data = await response.json();
          setCurrentUserId(data.userId);
        }
      } catch (error) {
        console.error('Failed to fetch user ID:', error);
      }
    };
    
    fetchUserData();
  }, []);
  
  // Fetch all tickets - we're in an admin component so no need to check user role again
  const { data: tickets, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['/api/support-tickets/admin/all'],
    queryFn: async ({ signal }) => {
      const res = await apiRequest('GET', '/api/support-tickets/admin/all');
      if (!res.ok) {
        throw new Error('Failed to fetch tickets');
      }
      const adminTickets = await res.json();
      console.log("Fetched admin tickets:", adminTickets);
      return adminTickets;
    },
    enabled: true, // Always fetch since auth is handled by the middleware
    refetchOnWindowFocus: false, // Chrome-optimized: Disable window focus refetch
    staleTime: 5 * 60 * 1000, // Chrome-optimized: 5 minutes instead of 5 seconds
    refetchInterval: false, // Chrome-optimized: Disable auto-refresh
    refetchIntervalInBackground: false, // Chrome-optimized: No background refresh
    retry: 2 // Try a couple of times if the request fails
  });
  
  // Display loading indicator when auto-refreshing
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Update refreshing state based on query status
  useEffect(() => {
    if (isFetching) {
      setIsRefreshing(true);
    } else {
      setIsRefreshing(false);
    }
  }, [isFetching]);

  // Assign ticket to self mutation
  const assignMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      const res = await apiRequest('POST', `/api/support-tickets/${ticketId}/assign`, {});
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to assign ticket');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets/admin/all'] });
      toast({
        title: 'Ticket assigned',
        description: 'The ticket has been assigned to you.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to assign ticket',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Status update mutation
  const statusUpdateMutation = useMutation({
    mutationFn: async ({ ticketId, status, closureReason }: { ticketId: number; status: string; closureReason?: string }) => {
      const updateData: any = { status };
      if (status === 'closed' && closureReason) {
        updateData.closureReason = closureReason;
      }
      
      const res = await apiRequest('PATCH', `/api/support-tickets/${ticketId}`, updateData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update ticket status');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets/admin/all'] });
      setIsStatusUpdateDialogOpen(false);
      setSelectedTicket(null);
      setNewStatus('');
      setClosureReason('');
      toast({
        title: 'Status updated',
        description: 'The ticket status has been updated successfully.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update status',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleStatusUpdate = (ticket: Ticket, status: string) => {
    setSelectedTicket(ticket);
    setNewStatus(status);
    if (status === 'closed') {
      setIsStatusUpdateDialogOpen(true);
    } else {
      statusUpdateMutation.mutate({ ticketId: ticket.id, status });
    }
  };

  // Delete single ticket mutation
  const deleteMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      const res = await apiRequest('DELETE', `/api/support-tickets/${ticketId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to delete ticket');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets/admin/all'] });
      setIsDeleteDialogOpen(false);
      setTicketToDelete(null);
      toast({
        title: 'Ticket deleted',
        description: 'The ticket has been successfully deleted.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete ticket',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Delete multiple tickets mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ticketIds: number[]) => {
      const res = await apiRequest('DELETE', '/api/support-tickets/bulk', { ticketIds });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to delete tickets');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets/admin/all'] });
      setIsBulkDeleteDialogOpen(false);
      setSelectedTicketIds(new Set());
      toast({
        title: 'Tickets deleted',
        description: data.message || `Successfully deleted ${data.deletedCount} tickets.`
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete tickets',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Update multiple tickets status mutation
  const bulkStatusUpdateMutation = useMutation({
    mutationFn: async ({ ticketIds, status, closureReason }: { ticketIds: number[]; status: string; closureReason?: string }) => {
      const updateData: any = { ticketIds, status };
      if (status === 'closed' && closureReason) {
        updateData.closureReason = closureReason;
      }
      
      const res = await apiRequest('PATCH', '/api/support-tickets/bulk-status', updateData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update tickets status');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets/admin/all'] });
      setIsBulkResolveDialogOpen(false);
      setSelectedTicketIds(new Set());
      toast({
        title: 'Tickets updated',
        description: data.message || `Successfully updated ${data.updatedCount} tickets.`
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update tickets',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Selection helper functions
  const toggleTicketSelection = (ticketId: number) => {
    const newSelected = new Set(selectedTicketIds);
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId);
    } else {
      newSelected.add(ticketId);
    }
    setSelectedTicketIds(newSelected);
  };

  const toggleAllTicketsSelection = (tickets: Ticket[]) => {
    if (selectedTicketIds.size === tickets.length) {
      setSelectedTicketIds(new Set());
    } else {
      setSelectedTicketIds(new Set(tickets.map(t => t.id)));
    }
  };

  const handleDeleteTicket = (ticketId: number) => {
    setTicketToDelete(ticketId);
    setIsDeleteDialogOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedTicketIds.size > 0) {
      setIsBulkDeleteDialogOpen(true);
    }
  };

  const confirmDelete = () => {
    if (ticketToDelete) {
      deleteMutation.mutate(ticketToDelete);
    }
  };

  const confirmBulkDelete = () => {
    const ticketIds = Array.from(selectedTicketIds);
    if (ticketIds.length > 0) {
      bulkDeleteMutation.mutate(ticketIds);
    }
  };

  const handleBulkResolve = () => {
    if (selectedTicketIds.size > 0) {
      setIsBulkResolveDialogOpen(true);
    }
  };

  const confirmBulkResolve = () => {
    const ticketIds = Array.from(selectedTicketIds);
    if (ticketIds.length > 0) {
      bulkStatusUpdateMutation.mutate({ 
        ticketIds, 
        status: 'resolved' 
      });
    }
  };

  // Calculate statistics using useMemo for performance
  const ticketStats = useMemo(() => {
    if (!tickets) return null;
    
    const total = tickets.length;
    const statusCounts = {
      open: 0,
      in_progress: 0,
      waiting_on_customer: 0,
      resolved: 0,
      closed: 0
    };
    
    const priorityCounts = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    const categoryCounts = {
      technical: 0,
      billing: 0,
      shipping: 0,
      account: 0,
      general: 0,
      other: 0,
      pickup: 0
    };
    
    let unassigned = 0;
    let thisWeek = 0;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    tickets.forEach((ticket: Ticket) => {
      // Status counts
      if (statusCounts.hasOwnProperty(ticket.status)) {
        statusCounts[ticket.status as keyof typeof statusCounts]++;
      }
      
      // Priority counts
      if (priorityCounts.hasOwnProperty(ticket.priority)) {
        priorityCounts[ticket.priority as keyof typeof priorityCounts]++;
      }
      
      // Category counts
      if (categoryCounts.hasOwnProperty(ticket.category)) {
        categoryCounts[ticket.category as keyof typeof categoryCounts]++;
      }
      
      // Unassigned
      if (!ticket.assignedTo) {
        unassigned++;
      }
      
      // This week
      if (new Date(ticket.createdAt) > weekAgo) {
        thisWeek++;
      }
    });
    
    return {
      total,
      statusCounts,
      priorityCounts,
      categoryCounts,
      unassigned,
      thisWeek
    };
  }, [tickets]);

  // Helper functions to categorize tickets by status
  const getNewTickets = (tickets: Ticket[]) => tickets.filter(ticket => ticket.status === 'open');
  const getProcessingTickets = (tickets: Ticket[]) => tickets.filter(ticket => 
    ticket.status === 'in_progress' || ticket.status === 'waiting_on_customer'
  );
  const getCompletedTickets = (tickets: Ticket[]) => tickets.filter(ticket => 
    ticket.status === 'resolved' || ticket.status === 'closed'
  );

  // Base filter function for text search, priority, and category
  const filterTickets = (ticketsList: Ticket[]) => {
    return ticketsList?.filter((ticket: Ticket) => {
      // Text search
      const matchesSearch = searchTerm.trim() === '' || 
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(ticket.id).includes(searchTerm) ||
        ticket.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.userEmail?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Priority filter
      const matchesPriority = !priorityFilter || ticket.priority === priorityFilter;
      
      // Category filter
      const matchesCategory = !categoryFilter || ticket.category === categoryFilter;
      
      return matchesSearch && matchesPriority && matchesCategory;
    });
  };

  // Get filtered tickets for each tab
  const newTickets = filterTickets(getNewTickets(tickets || []));
  const processingTickets = filterTickets(getProcessingTickets(tickets || []));
  const completedTickets = filterTickets(getCompletedTickets(tickets || []));

  // Get current tab's tickets
  const getCurrentTabTickets = () => {
    switch (activeTab) {
      case 'new':
        return newTickets;
      case 'processing':
        return processingTickets;
      case 'completed':
        return completedTickets;
      default:
        return newTickets;
    }
  };

  const filteredTickets = getCurrentTabTickets();

  // Loading state is already handled in the wrapper component
  
  // Admin check is already handled in the wrapper component

  return (
    <div className="w-full px-4 py-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            {t('support.tickets')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('support.manageAllTickets')}
            {isRefreshing && (
              <span className="ml-2 inline-flex items-center text-blue-600">
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                {t('common.refreshing')}
              </span>
            )}
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Bulk action buttons */}
          {selectedTicketIds.size > 0 && (
            <>
              <Button 
                onClick={handleBulkResolve}
                disabled={bulkStatusUpdateMutation.isPending}
                className="gap-1 bg-green-600 hover:bg-green-700"
                data-testid="bulk-resolve-tickets"
              >
                <CheckCircle className="h-4 w-4" />
                {t('support.resolve')} {selectedTicketIds.size} {t('common.selected')}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                className="gap-1"
                data-testid="bulk-delete-tickets"
              >
                <Trash2 className="h-4 w-4" />
                {t('common.delete')} {selectedTicketIds.size} {t('common.selected')}
              </Button>
            </>
          )}
          
          <Button 
            onClick={() => navigate('/admin/tickets/create')}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Ticket
          </Button>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh tickets"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </Button>
          
          <div className="flex rounded-lg border">
            <Button 
              variant={viewMode === 'cards' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('cards')}
              className="rounded-r-none"
            >
              <GridIcon className="h-4 w-4 mr-1" />
              Cards
            </Button>
            <Button 
              variant={viewMode === 'table' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-l-none"
            >
              <TableIcon className="h-4 w-4 mr-1" />
              Table
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Dashboard */}
      {ticketStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Total Tickets</p>
                  <p className="text-2xl font-bold text-blue-900">{ticketStats.total}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium">Unassigned</p>
                  <p className="text-2xl font-bold text-orange-900">{ticketStats.unassigned}</p>
                </div>
                <UserCheck className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">This Week</p>
                  <p className="text-2xl font-bold text-green-900">{ticketStats.thisWeek}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Open</p>
                  <p className="text-2xl font-bold text-purple-900">{ticketStats.statusCounts.open}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets by ID, subject, description, user name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              {/* Status filter is now handled by tabs, so removed to avoid confusion */}

              {/* Priority filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10">
                    <Flag className="h-4 w-4 mr-2" />
                    Priority {priorityFilter && <Badge variant="secondary" className="ml-2">1</Badge>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={priorityFilter || ''} onValueChange={(value) => setPriorityFilter(value || null)}>
                    <DropdownMenuRadioItem value="">All Priorities</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="urgent">Urgent</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="high">High</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="medium">Medium</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="low">Low</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Category filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10">
                    <Tag className="h-4 w-4 mr-2" />
                    Category {categoryFilter && <Badge variant="secondary" className="ml-2">1</Badge>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={categoryFilter || ''} onValueChange={(value) => setCategoryFilter(value || null)}>
                    <DropdownMenuRadioItem value="">All Categories</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="technical">Technical</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="billing">Billing</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="shipping">Shipping</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="account">Account</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="pickup">Pickup</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="other">Other</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear filters button */}
              {(priorityFilter || categoryFilter || searchTerm) && (
                <Button 
                  variant="ghost"
                  onClick={() => {
                    setPriorityFilter(null);
                    setCategoryFilter(null);
                    setSearchTerm('');
                  }}
                  className="h-10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Active filters display */}
          {(priorityFilter || categoryFilter) && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {priorityFilter && (
                <Badge variant="secondary" className="gap-1">
                  Priority: {priorityFilter}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setPriorityFilter(null)} />
                </Badge>
              )}
              {categoryFilter && (
                <Badge variant="secondary" className="gap-1">
                  Category: {categoryFilter}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setCategoryFilter(null)} />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <Dialog open={isStatusUpdateDialogOpen} onOpenChange={setIsStatusUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Ticket Status</DialogTitle>
            <DialogDescription>
              {selectedTicket && (
                <>Update status for ticket #{selectedTicket.id}: {selectedTicket.subject}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="waiting_on_customer">Waiting on Customer</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {newStatus === 'closed' && (
              <div className="grid gap-2">
                <Label htmlFor="closure-reason">Closure Reason</Label>
                <Textarea
                  id="closure-reason"
                  placeholder="Please provide a reason for closing this ticket..."
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedTicket) {
                  statusUpdateMutation.mutate({ 
                    ticketId: selectedTicket.id, 
                    status: newStatus,
                    closureReason: newStatus === 'closed' ? closureReason : undefined
                  });
                }
              }}
              disabled={!newStatus || statusUpdateMutation.isPending || (newStatus === 'closed' && !closureReason.trim())}
            >
              {statusUpdateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Status'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex justify-center my-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : isError ? (
        <div className="text-center my-12 text-red-500">
          <p>Failed to load tickets. Please try again.</p>
          <Button onClick={() => refetch()} className="mt-2">Retry</Button>
        </div>
      ) : !tickets || tickets.length === 0 ? (
        <div className="text-center my-12 text-gray-500">
          <p>No tickets found matching your criteria.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="mb-12">
          {/* Ticket Status Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'new' | 'processing' | 'completed')} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="new" className="flex items-center gap-2" data-testid="tab-new">
                <AlertCircle className="h-4 w-4" />
                New Tickets
                <Badge variant="secondary" className="ml-1">
                  {newTickets.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="processing" className="flex items-center gap-2" data-testid="tab-processing">
                <Clock className="h-4 w-4" />
                Processing
                <Badge variant="secondary" className="ml-1">
                  {processingTickets.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2" data-testid="tab-completed">
                <CheckCircle className="h-4 w-4" />
                Completed
                <Badge variant="secondary" className="ml-1">
                  {completedTickets.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {filteredTickets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No tickets found in this category.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={filteredTickets.length > 0 && selectedTicketIds.size === filteredTickets.length}
                      onCheckedChange={() => toggleAllTicketsSelection(filteredTickets)}
                      data-testid="select-all-tickets"
                    />
                  </TableHead>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket: Ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedTicketIds.has(ticket.id)}
                        onCheckedChange={() => toggleTicketSelection(ticket.id)}
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`select-ticket-${ticket.id}`}
                      />
                    </TableCell>
                    <TableCell 
                      className="font-medium cursor-pointer" 
                      onClick={() => navigate(`/admin/ticket/${ticket.id}`)}
                    >
                      #{ticket.id}
                    </TableCell>
                    <TableCell 
                      className="cursor-pointer" 
                      onClick={() => navigate(`/admin/ticket/${ticket.id}`)}
                    >
                      <div className="max-w-[200px] truncate">{ticket.subject}</div>
                    </TableCell>
                    <TableCell 
                      className="cursor-pointer" 
                      onClick={() => navigate(`/admin/ticket/${ticket.id}`)}
                    >
                      <div className="text-sm">
                        {ticket.userName || 'Unknown user'}
                        {ticket.userEmail && (
                          <div className="text-xs text-muted-foreground">{ticket.userEmail}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell 
                      className="cursor-pointer" 
                      onClick={() => navigate(`/admin/ticket/${ticket.id}`)}
                    >
                      <Badge className={categoryColors[ticket.category] || 'bg-gray-100'}>
                        {ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell 
                      className="cursor-pointer" 
                      onClick={() => navigate(`/admin/ticket/${ticket.id}`)}
                    >
                      <Badge className={TicketPriorityColors[ticket.priority as keyof typeof TicketPriorityColors] || 'bg-gray-100'}>
                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell 
                      className="cursor-pointer" 
                      onClick={() => navigate(`/admin/ticket/${ticket.id}`)}
                    >
                      <Badge className={TicketStatusColors[ticket.status as keyof typeof TicketStatusColors] || 'bg-gray-100'}>
                        {statusIcons[ticket.status]}
                        {statusDisplayNames[ticket.status] || ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell 
                      className="cursor-pointer" 
                      onClick={() => navigate(`/admin/ticket/${ticket.id}`)}
                    >
                      {ticket.createdAt ? format(new Date(ticket.createdAt), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell 
                      className="cursor-pointer" 
                      onClick={() => navigate(`/admin/ticket/${ticket.id}`)}
                    >
                      {ticket.assignedTo === currentUserId ? (
                        <Badge variant="outline" className="border-primary text-primary">You</Badge>
                      ) : ticket.assignedTo ? (
                        <Badge variant="outline">Assigned</Badge>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center space-x-1" onClick={e => e.stopPropagation()}>
                        {!ticket.assignedTo && ticket.status !== 'closed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              assignMutation.mutate(ticket.id);
                            }}
                            disabled={assignMutation.isPending}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {assignMutation.isPending ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <UserCheck className="h-3 w-3 mr-1" />
                            )}
                            Assign
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/ticket/${ticket.id}`);
                          }}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>

                        {/* Status update dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(ticket, 'open');
                              }}
                              disabled={ticket.status === 'open'}
                            >
                              <AlertCircle className="h-3 w-3 mr-2 text-blue-600" />
                              Open
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(ticket, 'in_progress');
                              }}
                              disabled={ticket.status === 'in_progress'}
                            >
                              <Clock className="h-3 w-3 mr-2 text-yellow-600" />
                              In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(ticket, 'waiting_on_customer');
                              }}
                              disabled={ticket.status === 'waiting_on_customer'}
                            >
                              <User className="h-3 w-3 mr-2 text-orange-600" />
                              Waiting on Customer
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(ticket, 'resolved');
                              }}
                              disabled={ticket.status === 'resolved'}
                            >
                              <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                              Resolved
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(ticket, 'closed');
                              }}
                              disabled={ticket.status === 'closed'}
                              className="text-red-600"
                            >
                              <Archive className="h-3 w-3 mr-2" />
                              Close Ticket
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTicket(ticket.id);
                          }}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-800"
                          data-testid={`delete-ticket-${ticket.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        /* Card View */
        <div className="mb-12">
          {/* Ticket Status Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'new' | 'processing' | 'completed')} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="new" className="flex items-center gap-2" data-testid="tab-new-cards">
                <AlertCircle className="h-4 w-4" />
                New Tickets
                <Badge variant="secondary" className="ml-1">
                  {newTickets.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="processing" className="flex items-center gap-2" data-testid="tab-processing-cards">
                <Clock className="h-4 w-4" />
                Processing
                <Badge variant="secondary" className="ml-1">
                  {processingTickets.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2" data-testid="tab-completed-cards">
                <CheckCircle className="h-4 w-4" />
                Completed
                <Badge variant="secondary" className="ml-1">
                  {completedTickets.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {filteredTickets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No tickets found in this category.</p>
                </div>
              ) : (
                <>
                  {/* Select all option for cards view */}
                  <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                    <Checkbox
                      checked={filteredTickets.length > 0 && selectedTicketIds.size === filteredTickets.length}
                      onCheckedChange={() => toggleAllTicketsSelection(filteredTickets)}
                      data-testid="select-all-tickets-cards"
                    />
                    <span className="text-sm text-gray-600">
                      {selectedTicketIds.size === 0 
                        ? `${t('common.selectAll')} ${filteredTickets.length} ${t('support.tickets').toLowerCase()}`
                        : `${selectedTicketIds.size} ${t('common.selected')}`
                      }
                    </span>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTickets.map((ticket: Ticket) => (
                          <Card key={ticket.id} className="shadow-sm hover:shadow transition-shadow">
                            <CardHeader className="pb-3">
                              <div className="flex justify-between items-start">
                                <div className="flex items-start gap-3 flex-1">
                                  <Checkbox
                                    checked={selectedTicketIds.has(ticket.id)}
                                    onCheckedChange={() => toggleTicketSelection(ticket.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    data-testid={`select-ticket-card-${ticket.id}`}
                                    className="mt-1"
                                  />
                                  <CardTitle className="text-lg font-semibold">
                                    <span className="text-muted-foreground mr-2">#{ticket.id}</span>
                                    {ticket.subject}
                                  </CardTitle>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge className={TicketPriorityColors[ticket.priority as keyof typeof TicketPriorityColors] || 'bg-gray-100'}>
                                  {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                                </Badge>
                                <Badge className={categoryColors[ticket.category] || 'bg-gray-100'}>
                                  {ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)}
                                </Badge>
                                {ticket.assignedTo === currentUserId && (
                                  <Badge variant="outline" className="border-primary text-primary">
                                    Assigned to you
                                  </Badge>
                                )}
                                {ticket.assignedTo && ticket.assignedTo !== currentUserId && (
                                  <Badge variant="outline">
                                    Assigned
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">
                                Submitted by {ticket.userName || 'Unknown user'}
                                {ticket.userEmail && ` (${ticket.userEmail})`}
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-gray-600 line-clamp-3">
                                {ticket.description}
                              </p>
                            </CardContent>
                            <CardFooter className="flex justify-between pt-3 border-t">
                              <div className="text-xs text-gray-500">
                                Created {ticket.createdAt ? formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true }) : 'N/A'}
                              </div>
                              <div className="flex gap-2">
                                {!ticket.assignedTo && ticket.status !== 'closed' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => assignMutation.mutate(ticket.id)}
                                    disabled={assignMutation.isPending}
                                  >
                                    {assignMutation.isPending ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : null}
                                    Assign to me
                                  </Button>
                                )}
                                
                                <Button
                                  size="sm"
                                  onClick={() => navigate(`/admin/ticket/${ticket.id}`)}
                                >
                                  View
                                </Button>
                              </div>
                            </CardFooter>
                          </Card>
                        ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Ticket</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete ticket #{ticketToDelete}? This action cannot be undone.
              All related data including responses and attachments will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="confirm-delete-ticket"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Tickets</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedTicketIds.size} selected ticket{selectedTicketIds.size === 1 ? '' : 's'}? 
              This action cannot be undone. All related data including responses and attachments will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsBulkDeleteDialogOpen(false)}
              disabled={bulkDeleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              data-testid="confirm-bulk-delete-tickets"
            >
              {bulkDeleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t('common.delete')} {selectedTicketIds.size} {t('support.tickets')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Resolve Confirmation Dialog */}
      <Dialog open={isBulkResolveDialogOpen} onOpenChange={setIsBulkResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('support.resolveSelectedTickets')}</DialogTitle>
            <DialogDescription>
              {t('support.confirmBulkResolveDescription', { count: selectedTicketIds.size })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsBulkResolveDialogOpen(false)}
              disabled={bulkStatusUpdateMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={confirmBulkResolve}
              disabled={bulkStatusUpdateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="confirm-bulk-resolve-tickets"
            >
              {bulkStatusUpdateMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t('support.resolve')} {selectedTicketIds.size} {t('support.tickets')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export the component directly without additional AuthProvider wrapping
export default function AdminTickets() {
  return (
    <Layout>
      <AdminTicketsList />
    </Layout>
  );
}