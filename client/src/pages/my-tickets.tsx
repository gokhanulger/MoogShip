import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PlusCircle, MessageSquare, RefreshCw, AlertCircle, Clock, CheckCircle } from "lucide-react";
import {
  TicketStatus,
  TicketStatusColors,
  TicketPriority,
  TicketPriorityColors,
  TicketCategory
} from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { AuthMiddleware } from "@/components/auth-middleware";

// The actual tickets page component
function MyTicketsContent() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'processing' | 'completed'>('new');

  // Fetch user's tickets
  const { data: tickets, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["/api/support-tickets"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/support-tickets", { 
        signal,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch tickets");
      }
      
      const ticketsData = await response.json();
      console.log("Fetched tickets:", ticketsData);
      return ticketsData;
    },
    refetchOnWindowFocus: false, // Chrome-optimized: Disable window focus refetch
    staleTime: 5 * 60 * 1000, // Chrome-optimized: 5 minutes instead of 5 seconds
    refetchInterval: false, // Chrome-optimized: Disable auto-refresh
    refetchIntervalInBackground: false, // Chrome-optimized: No background refresh
    retry: 2 // Try a couple of times if the request fails
  });
  
  // Reset refresh indicator when fetching is complete
  useEffect(() => {
    if (!isFetching && isRefreshing) {
      setIsRefreshing(false);
    }
  }, [isFetching, isRefreshing]);
  
  // Manual refresh function
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    refetch();
  };
  
  // We don't need this interval anymore since we're using refetchInterval in useQuery
  // Keep the effect for showing the refreshing indicator when query is fetching
  useEffect(() => {
    if (isFetching && !isRefreshing) {
      setIsRefreshing(true);
    }
  }, [isFetching, isRefreshing]);

  // Define status categories for tabs
  const getStatusCategory = (status: TicketStatus): 'new' | 'processing' | 'completed' => {
    switch (status) {
      case TicketStatus.OPEN:
        return 'new';
      case TicketStatus.IN_PROGRESS:
      case TicketStatus.WAITING_ON_CUSTOMER:
        return 'processing';
      case TicketStatus.RESOLVED:
      case TicketStatus.CLOSED:
        return 'completed';
      default:
        return 'new';
    }
  };

  // Filter tickets based on active tab
  const filteredTickets = tickets?.filter(ticket => 
    getStatusCategory(ticket.status) === activeTab
  ) || [];

  // Status icons for tabs
  const statusIcons = {
    'new': AlertCircle,
    'processing': Clock,
    'completed': CheckCircle
  };

  // Get status display names
  const statusDisplayNames: Record<string, string> = {
    'open': 'Open',
    'in_progress': 'In Progress',
    'waiting_on_customer': 'Waiting on You',
    'resolved': 'Resolved',
    'closed': 'Closed'
  };

  // Function to get status badge color based on ticket status
  const getStatusBadge = (status: TicketStatus) => {
    return (
      <Badge className={TicketStatusColors[status as keyof typeof TicketStatusColors] || 'bg-gray-100'}>
        {statusDisplayNames[status] || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")}
      </Badge>
    );
  };

  // Function to get priority badge color based on ticket priority  
  const getPriorityBadge = (priority: TicketPriority) => {
    return (
      <Badge className={TicketPriorityColors[priority as keyof typeof TicketPriorityColors] || 'bg-gray-100'}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('supportTickets.pageTitle')}</h1>
            <p className="text-muted-foreground">
              {t('supportTickets.pageDescription')}
              {isRefreshing && (
                <span className="ml-2 inline-flex items-center text-blue-600">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  {t('supportTickets.refreshing')}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleManualRefresh} 
              disabled={isRefreshing || isFetching}
              title={t('supportTickets.refreshButton')}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </Button>
            <Button onClick={() => setLocation("/support-ticket")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('supportTickets.newTicket')}
            </Button>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="flex justify-center items-center h-64 text-center">
                <div>
                  <p className="text-destructive mb-4">{t('supportTickets.loadError')}</p>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    {t('supportTickets.tryAgain')}
                  </Button>
                </div>
              </div>
            ) : tickets?.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-64 text-center p-6">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('supportTickets.emptyState.title')}</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  {t('supportTickets.emptyState.description')}
                </p>
                <Button onClick={() => setLocation("/support-ticket")}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t('supportTickets.emptyState.action')}
                </Button>
              </div>
            ) : (
              <>
                {/* Ticket Status Tabs */}
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'new' | 'processing' | 'completed')} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="new" className="flex items-center gap-2" data-testid="tab-new">
                      <AlertCircle className="h-4 w-4" />
                      New ({tickets?.filter(t => getStatusCategory(t.status) === 'new').length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="processing" className="flex items-center gap-2" data-testid="tab-processing">
                      <Clock className="h-4 w-4" />
                      Processing ({tickets?.filter(t => getStatusCategory(t.status) === 'processing').length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="flex items-center gap-2" data-testid="tab-completed">
                      <CheckCircle className="h-4 w-4" />
                      Completed ({tickets?.filter(t => getStatusCategory(t.status) === 'completed').length || 0})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeTab} className="mt-4">
                    {filteredTickets.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No tickets found in this category.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableCaption>{t('supportTickets.table.caption')}</TableCaption>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">{t('supportTickets.table.id')}</TableHead>
                            <TableHead>{t('supportTickets.table.title')}</TableHead>
                            <TableHead>{t('supportTickets.table.category')}</TableHead>
                            <TableHead>{t('supportTickets.table.priority')}</TableHead>
                            <TableHead>{t('supportTickets.table.status')}</TableHead>
                            <TableHead>{t('supportTickets.table.created')}</TableHead>
                            <TableHead className="text-right">{t('supportTickets.table.action')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTickets.map((ticket: any) => (
                            <TableRow key={ticket.id}>
                              <TableCell className="font-medium">#{ticket.id}</TableCell>
                              <TableCell>{ticket.subject}</TableCell>
                              <TableCell>
                                {ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)}
                              </TableCell>
                              <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                              <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                              <TableCell>
                                {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setLocation(`/ticket-detail/${ticket.id}`)}
                                  data-testid={`button-view-${ticket.id}`}
                                >
                                  {t('supportTickets.table.viewButton')}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

// Export a wrapped version with AuthMiddleware
export default function MyTicketsPage() {
  return (
    <AuthMiddleware adminOnly={false} requireAuth={true}>
      <MyTicketsContent />
    </AuthMiddleware>
  );
}