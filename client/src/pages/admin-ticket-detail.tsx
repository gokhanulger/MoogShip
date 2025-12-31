import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useRoute } from 'wouter';
import { useEffect, useState } from 'react';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  ArrowLeft, 
  User, 
  Send,
  UserCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow, format } from 'date-fns';
import AttachmentDisplay from "@/components/AttachmentDisplay";
import type { TicketAttachment } from "@shared/schema";

// Types
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
  userEmail?: string;
  userName?: string;
  attachments?: TicketAttachment[];
}

interface TicketResponse {
  id: number;
  ticketId: number;
  userId: number;
  message: string;
  createdAt: string;
  isAdminResponse: boolean;
  attachmentUrl: string | null;
  responderName?: string;
}

// Priority badge colors
const priorityColors: Record<string, string> = {
  'low': 'bg-blue-100 text-blue-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'high': 'bg-orange-100 text-orange-800',
  'urgent': 'bg-red-100 text-red-800'
};

// Status badge colors
const statusColors: Record<string, string> = {
  'open': 'bg-blue-100 text-blue-800',
  'in_progress': 'bg-purple-100 text-purple-800',
  'waiting_on_customer': 'bg-yellow-100 text-yellow-800',
  'resolved': 'bg-green-100 text-green-800',
  'closed': 'bg-gray-100 text-gray-800'
};

// Category badge colors
const categoryColors: Record<string, string> = {
  'technical': 'bg-purple-100 text-purple-800',
  'billing': 'bg-green-100 text-green-800',
  'shipping': 'bg-blue-100 text-blue-800',
  'account': 'bg-orange-100 text-orange-800',
  'general': 'bg-gray-100 text-gray-800'
};

// Status display names
const statusDisplayNames: Record<string, string> = {
  'open': 'Open',
  'in_progress': 'In Progress',
  'waiting_on_customer': 'Waiting on Customer',
  'resolved': 'Resolved',
  'closed': 'Closed'
};

// Status icons
const statusIcons: Record<string, React.ReactNode> = {
  'open': <AlertCircle className="h-4 w-4 mr-1 text-blue-600" />,
  'in_progress': <Clock className="h-4 w-4 mr-1 text-purple-600" />,
  'waiting_on_customer': <AlertTriangle className="h-4 w-4 mr-1 text-yellow-600" />,
  'resolved': <CheckCircle className="h-4 w-4 mr-1 text-green-600" />,
  'closed': <CheckCircle className="h-4 w-4 mr-1 text-gray-600" />
};

function AdminTicketDetailContent() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/admin/ticket/:id');
  const ticketId = params?.id ? parseInt(params.id, 10) : null;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: userLoading } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // State for response form
  const [newResponse, setNewResponse] = useState('');
  const [statusChange, setStatusChange] = useState<string | null>(null);
  const [closureReason, setClosureReason] = useState('');
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  
  // Redirect if not admin
  useEffect(() => {
    if (!userLoading && !isAdmin) {
      toast({
        title: 'Access denied',
        description: 'You do not have permission to access this page.',
        variant: 'destructive'
      });
      navigate('/');
    }
  }, [userLoading, isAdmin, navigate, toast]);

  // Fetch ticket details
  const { 
    data: ticketData, 
    isLoading: ticketLoading, 
    isError: ticketError,
    refetch: refetchTicket
  } = useQuery({
    queryKey: [`/api/support-tickets/${ticketId}`],
    queryFn: async () => {
      if (!ticketId) throw new Error('No ticket ID provided');
      const res = await apiRequest('GET', `/api/support-tickets/${ticketId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch ticket details');
      }
      const data = await res.json();
      // Merge ticketAttachments into the ticket object
      if (data.ticket && data.ticketAttachments) {
        data.ticket.attachments = data.ticketAttachments;
      }
      return data;
    },
    enabled: !!ticketId && isAdmin // Only fetch if ticketId exists and user is admin
  });
  
  // Extract ticket from response data
  const ticket = ticketData?.ticket || {};

  // Fetch ticket responses
  const {
    data: responses,
    isLoading: responsesLoading,
    isError: responsesError,
    refetch: refetchResponses
  } = useQuery({
    queryKey: [`/api/support-tickets/${ticketId}/responses`],
    queryFn: async () => {
      if (!ticketId) throw new Error('No ticket ID provided');
      console.log("Admin fetching responses for ticket:", ticketId);
      const res = await apiRequest('GET', `/api/support-tickets/${ticketId}/responses`);
      if (!res.ok) {
        throw new Error('Failed to fetch ticket responses');
      }
      const responseData = await res.json();
      console.log("Admin responses data:", responseData);
      return responseData;
    },
    enabled: !!ticketId && isAdmin, // Only fetch if ticketId exists and user is admin
    // Auto-refresh responses
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    staleTime: 0
  });

  // Add response mutation
  const addResponseMutation = useMutation({
    mutationFn: async () => {
      if (!ticketId) throw new Error('No ticket ID provided');
      const res = await apiRequest('POST', `/api/support-tickets/${ticketId}/responses`, {
        message: newResponse,
        isAdminResponse: true // Always true for admin responses
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to add response');
      }
      
      return res.json();
    },
    onSuccess: (newResponseData) => {
      // Clear input form
      setNewResponse(''); 
      
      // First update local cache directly with the new response
      // This ensures that the admin sees their response immediately
      queryClient.setQueryData(
        [`/api/support-tickets/${ticketId}/responses`],
        (oldData: any) => {
          console.log("Adding new admin response to local cache:", newResponseData);
          // If we have old data, append the new response to it
          if (Array.isArray(oldData)) {
            return [...oldData, newResponseData];
          }
          // Otherwise just return an array with the new response
          return [newResponseData];
        }
      );
      
      // Then refresh everything to get server's latest data
      setTimeout(() => {
        refetchResponses(); // Refresh responses list
        refetchTicket(); // Refresh ticket details (status might have changed)
      }, 100);
      
      // Invalidate the admin tickets list to force a refresh
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets/admin/all'] });
      
      toast({
        title: 'Response added',
        description: 'Your response has been added to the ticket.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to add response',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Update ticket status mutation  
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!ticketId) throw new Error('No ticket ID provided');
      const res = await apiRequest('PATCH', `/api/support-tickets/${ticketId}/status`, {
        status: newStatus,
        message: newStatus === 'closed' ? closureReason : undefined
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || `Failed to update ticket status to ${newStatus}`);
      }
      
      return res.json();
    },
    onSuccess: (_, newStatus) => {
      // Refresh ticket details
      refetchTicket(); 
      
      // Invalidate the admin tickets list to force a refresh
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets/admin/all'] });
      
      // Clear any form state
      if (newStatus === 'closed') {
        setClosureReason('');
        setIsCloseDialogOpen(false);
      }
      
      setStatusChange(null);
      
      toast({
        title: 'Status updated',
        description: `Ticket status has been updated to ${statusDisplayNames[newStatus] || newStatus}.`
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

  // Assign ticket to self mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!ticketId) throw new Error('No ticket ID provided');
      const res = await apiRequest('POST', `/api/support-tickets/${ticketId}/assign`, {});
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to assign ticket');
      }
      
      return res.json();
    },
    onSuccess: () => {
      refetchTicket(); // Refresh ticket details
      
      // Invalidate the admin tickets list to force a refresh
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

  // Handle status change
  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'closed') {
      // Show closure dialog if trying to close
      setIsCloseDialogOpen(true);
    } else {
      // Otherwise update directly
      updateStatusMutation.mutate(newStatus);
    }
  };

  // Handle close ticket confirmation
  const handleCloseTicket = () => {
    if (!closureReason.trim()) {
      toast({
        title: 'Closure reason required',
        description: 'Please provide a reason for closing this ticket.',
        variant: 'destructive'
      });
      return;
    }
    
    updateStatusMutation.mutate('closed');
  };

  // Handle send response
  const handleSendResponse = () => {
    if (!newResponse.trim()) {
      toast({
        title: 'Response required',
        description: 'Please enter a response before sending.',
        variant: 'destructive'
      });
      return;
    }
    
    addResponseMutation.mutate();
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect via useEffect
  }

  if (ticketLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading ticket details...</span>
      </div>
    );
  }

  if (ticketError || !ticket) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" className="mr-2" onClick={() => navigate('/admin-tickets')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Tickets
          </Button>
        </div>
        
        <div className="text-center my-12 text-red-500">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load ticket</h2>
          <p className="mb-4">There was an error retrieving the ticket details.</p>
          <Button onClick={() => refetchTicket()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Back button and actions */}
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" className="gap-1" onClick={() => navigate('/admin-tickets')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Tickets
        </Button>
        
        <div className="flex gap-2">
          {!ticket.assignedTo && ticket.status !== 'closed' && (
            <Button 
              variant="outline"
              onClick={() => assignMutation.mutate()}
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : null}
              Assign to me
            </Button>
          )}
          
          {ticket.status !== 'closed' && (
            <Select 
              value={statusChange || ticket.status} 
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Change status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting_on_customer">Waiting on Customer</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Close Ticket</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Ticket details card */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center mb-2">
                <span className="text-sm text-muted-foreground mr-2">#{ticket.id}</span>
                <Badge className={statusColors[ticket.status || 'open'] || 'bg-gray-100'}>
                  {statusIcons[ticket.status || 'open']}
                  {statusDisplayNames[ticket.status || 'open'] || ticket.status || 'Open'}
                </Badge>
                <Badge className={`ml-2 ${priorityColors[ticket.priority || 'medium'] || 'bg-gray-100'}`}>
                  {ticket.priority ? ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1) : 'Medium'} Priority
                </Badge>
                <Badge className={`ml-2 ${categoryColors[ticket.category || 'general'] || 'bg-gray-100'}`}>
                  {ticket.category ? ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1) : 'General'}
                </Badge>
              </div>
              <CardTitle className="text-xl mb-1">{ticket.subject}</CardTitle>
              <CardDescription>
                Submitted by {ticket.userName || 'User'} ({ticket.userEmail || 'No email'})
                {' '}{ticket.createdAt && `on ${format(new Date(ticket.createdAt), 'PPP')}`}
              </CardDescription>
            </div>
            
            <div className="text-sm text-gray-500">
              {ticket.assignedTo ? (
                <div className="flex items-center">
                  <span className="font-medium">Assigned to:</span>
                  <UserCircle className="h-4 w-4 ml-1 mr-1" />
                  <span>{ticket.assignedTo === user?.id ? 'You' : 'Another admin'}</span>
                </div>
              ) : (
                <div className="flex items-center text-amber-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>Unassigned</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md mb-4 whitespace-pre-wrap">
            {ticket.description}
          </div>
          
          {/* Display ticket attachments */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">📎 Attachments</h4>
              <AttachmentDisplay attachments={ticket.attachments} />
            </div>
          )}
          
          {ticket.relatedShipmentId && (
            <div className="mt-4">
              <span className="font-medium">Related shipment:</span>{' '}
              <Button 
                variant="link" 
                className="p-0 h-auto font-normal" 
                onClick={() => navigate(`/shipment-edit/${ticket.relatedShipmentId}`)}
              >
                View Shipment #{ticket.relatedShipmentId}
              </Button>
            </div>
          )}
          
          {ticket.closedAt && ticket.closureReason && (
            <div className="mt-4 border-t pt-4">
              <p className="font-medium mb-1">Closure reason:</p>
              <p className="text-gray-700 dark:text-gray-300">{ticket.closureReason}</p>
              <p className="text-sm text-gray-500 mt-2">
                Closed on {format(new Date(ticket.closedAt), 'PPP')}
                {ticket.closedBy && ` by ${ticket.closedBy === user?.id ? 'you' : 'another admin'}`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response section */}
      <h2 className="text-xl font-semibold mb-4">Conversation</h2>
      
      {responsesLoading ? (
        <div className="flex justify-center my-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading responses...</span>
        </div>
      ) : responsesError || !responses ? (
        <div className="text-center my-8 text-red-500">
          <p>Failed to load ticket responses. Please try again.</p>
          <Button onClick={() => refetchResponses()} className="mt-2">Retry</Button>
        </div>
      ) : responses.length === 0 ? (
        <div className="text-center my-8 text-gray-500">
          <p>No responses yet.</p>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {responses.map((response: TicketResponse) => (
            <div 
              key={response.id} 
              className={`p-4 rounded-lg ${
                response.isAdminResponse 
                  ? 'bg-blue-50 dark:bg-blue-900/30 ml-12' 
                  : 'bg-gray-50 dark:bg-gray-800 mr-12'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  {response.isAdminResponse ? (
                    <>
                      <UserCircle className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="font-medium text-blue-600">
                        {response.responderName || 'Admin'}
                      </span>
                    </>
                  ) : (
                    <>
                      <User className="h-5 w-5 text-gray-600 mr-2" />
                      <span className="font-medium">
                        {ticket.userName || 'Customer'}
                      </span>
                    </>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {response.createdAt && formatDistanceToNow(new Date(response.createdAt), { addSuffix: true })}
                </span>
              </div>
              
              <div className="whitespace-pre-wrap">
                {response.message}
              </div>
              
              {response.attachmentUrl && (
                <div className="mt-2">
                  <a 
                    href={response.attachmentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center"
                  >
                    View Attachment
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reply form */}
      {(ticket.status !== 'closed' && ticket.status !== undefined) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Response</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Type your response here..."
              className="min-h-32 mb-4"
              value={newResponse}
              onChange={(e) => setNewResponse(e.target.value)}
              disabled={addResponseMutation.isPending}
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleSendResponse}
                disabled={addResponseMutation.isPending || !newResponse.trim()}
                className="gap-1"
              >
                {addResponseMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <Send className="h-4 w-4" />
                Send Response
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Close ticket dialog */}
      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Ticket</DialogTitle>
            <DialogDescription>
              Please provide a reason for closing this ticket. This will be visible to the customer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="closure-reason" className="mb-2 block">Closure Reason</Label>
            <Textarea
              id="closure-reason"
              placeholder="Explain why this ticket is being closed..."
              value={closureReason}
              onChange={(e) => setClosureReason(e.target.value)}
              className="min-h-24"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCloseTicket}
              disabled={updateStatusMutation.isPending || !closureReason.trim()}
              className="gap-1"
            >
              {updateStatusMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <XCircle className="h-4 w-4" />
              Close Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export the protected component
export default function AdminTicketDetail() {
  return <AdminTicketDetailContent />;
}