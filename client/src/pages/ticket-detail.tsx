import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Loader2, ChevronLeft, Clock, MessageSquare, Check, X, Paperclip, FileText, Image } from "lucide-react";
import type { UploadResult } from "@uppy/core";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { FileUploader, UploadedFile } from "@/components/FileUploader";
import AttachmentDisplay from "@/components/AttachmentDisplay";
import {
  TicketStatus,
  TicketStatusColors,
  TicketPriority,
  TicketPriorityColors,
  TicketCategory,
  type TicketAttachment
} from "@shared/schema";

// Response form schema
const responseSchema = z.object({
  message: z.string().min(3, "Response must be at least 3 characters")
});

type ResponseFormValues = z.infer<typeof responseSchema>;

// Attachment interface for uploaded files
interface FileAttachment {
  fileUrl: string;
  originalFileName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileType: string;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const ticketId = parseInt(id);
  
  // State for managing uploaded attachments
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  
  // Get detailed ticket information
  const { 
    data: ticketData, 
    isLoading: ticketLoading, 
    error: ticketError,
    refetch: refetchTicket
  } = useQuery({
    queryKey: ["/api/support-tickets", ticketId],
    queryFn: async ({ signal }) => {
      if (isNaN(ticketId)) {
        throw new Error("Invalid ticket ID");
      }
      
      // Using fetch with credentials for session handling since we need to pass signal
      const response = await fetch(`/api/support-tickets/${ticketId}`, {
        method: "GET",
        credentials: "include",
        signal
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch ticket details");
      }
      
      const data = await response.json();
      console.log("Fetched ticket data:", data);
      return data;
    },
    enabled: !isNaN(ticketId),
    // Make sure we try refetching a few times if needed
    retry: 3
  });
  
  // Get ticket responses in a separate query
  const { 
    data: responsesData, 
    isLoading: responsesLoading, 
    error: responsesError,
    refetch: refetchResponses
  } = useQuery({
    queryKey: ["/api/support-tickets", ticketId, "responses"],
    queryFn: async ({ signal }) => {
      if (isNaN(ticketId)) {
        throw new Error("Invalid ticket ID");
      }
      
      // Using fetch with credentials for session handling since we need to pass signal
      const response = await fetch(`/api/support-tickets/${ticketId}/responses`, {
        method: "GET",
        credentials: "include",
        signal
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch ticket responses");
      }
      
      const responseData = await response.json();
      console.log("Fetched responses:", responseData);
      return responseData;
    },
    enabled: !isNaN(ticketId),
    // Adding a staleTime of 0 to ensure we always refetch 
    // when the page is revisited or refetchResponses is called
    staleTime: 0,
    // Implement auto-polling every 3 seconds
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    // Make sure we try refetching a few times if needed
    retry: 3
  });
  
  // Form for submitting responses
  const form = useForm<ResponseFormValues>({
    resolver: zodResolver(responseSchema),
    defaultValues: {
      message: ""
    }
  });
  
  // Mutation for adding a response
  const responseMutation = useMutation({
    mutationFn: async (data: ResponseFormValues & { attachments?: any[] }) => {
      console.log("Submitting response data:", data);
      console.log("Attachments to submit:", data.attachments || []);
      
      const response = await apiRequest('POST', `/api/support-tickets/${ticketId}/responses`, {
        message: data.message,
        isAdminResponse: false,
        attachments: data.attachments || [] // Use the attachments passed in data
      });
      const result = await response.json();
      console.log("Added new response:", result);
      return result;
    },
    onSuccess: (newResponse) => {
      // Clear form, attachments, show toast and refetch data
      form.reset();
      setAttachments([]); // Clear uploaded attachments
      toast({
        title: "Response Added",
        description: "Your response has been added to the ticket successfully.",
        variant: "default"
      });
      
      // First update local cache directly with the new response
      // This ensures that the user sees their response immediately
      queryClient.setQueryData(
        ["/api/support-tickets", ticketId, "responses"],
        (oldData: any) => {
          console.log("Adding new response to local cache:", newResponse);
          // If we have old data, append the new response to it
          if (Array.isArray(oldData)) {
            return [...oldData, newResponse];
          }
          // Otherwise just return an array with the new response
          return [newResponse];
        }
      );
      
      // Also invalidate and refetch to ensure we have the latest data
      setTimeout(() => {
        refetchResponses();
        refetchTicket();
      }, 100);
      
      // Also invalidate other ticket queries for global state consistency
      queryClient.invalidateQueries({ queryKey: ["/api/support-tickets"] });
    },
    onError: (error) => {
      console.error("Error adding response:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ticketId,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Failed to Add Response",
        description: error instanceof Error && error.message.includes('timeout') 
          ? "Request timed out. Please check your connection and try again."
          : "There was an error adding your response. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // File upload handlers
  const handleFilesAdded = (newFiles: UploadedFile[]) => {
    setAttachments(prev => [...prev, ...newFiles]);
  };

  const handleFileRemoved = (fileId: string) => {
    setAttachments(prev => prev.filter(file => file.id !== fileId));
  };


  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'pdf':
      case 'excel':
        return <FileText className="w-4 h-4" />;
      default:
        return <Paperclip className="w-4 h-4" />;
    }
  };

  async function onSubmitResponse(formData: ResponseFormValues) {
    console.log("Form submission triggered:", {
      formData,
      ticketId,
      attachments: attachments.length,
      timestamp: new Date().toISOString()
    });
    
    // Additional validation before submission
    if (!formData.message || formData.message.trim().length === 0) {
      console.error("Form validation failed: Empty message");
      toast({
        title: "Validation Error",
        description: "Please enter a message before submitting.",
        variant: "destructive"
      });
      return;
    }
    
    if (isNaN(ticketId)) {
      console.error("Form validation failed: Invalid ticket ID");
      toast({
        title: "Error",
        description: "Invalid ticket ID. Please refresh the page and try again.",
        variant: "destructive"
      });
      return;
    }

    // Upload files to object storage first
    const uploadedAttachments = [];
    
    if (attachments.length > 0) {
      try {
        for (const attachment of attachments) {
          // Get upload URL
          const uploadResponse = await apiRequest('POST', '/api/objects/upload', {
            name: attachment.originalFileName,
            type: attachment.fileType,
            size: attachment.fileSize
          });
          
          const uploadData = await uploadResponse.json();
          
          // Upload file to object storage
          const uploadResult = await fetch(uploadData.uploadURL, {
            method: 'PUT',
            body: attachment.file,
            headers: {
              'Content-Type': attachment.fileType,
            },
          });
          
          if (!uploadResult.ok) {
            throw new Error(`Failed to upload ${attachment.originalFileName}`);
          }
          
          // Create proper FileAttachment object matching server schema
          uploadedAttachments.push({
            fileUrl: uploadData.uploadURL.split('?')[0], // Remove query params for storage
            originalFileName: attachment.originalFileName,
            fileName: attachment.originalFileName,
            fileSize: attachment.fileSize,
            mimeType: attachment.fileType,
            fileType: attachment.fileType.startsWith('image/') ? 'image' : 'document' // Only 'image' or 'document'
          });
        }
      } catch (error) {
        console.error("File upload failed:", error);
        toast({
          title: "Upload Error",
          description: "Failed to upload files. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    const submissionData = {
      ...formData,
      ticketId,
      attachments: uploadedAttachments
    };

    console.log("Final submission data:", submissionData);
    
    responseMutation.mutate(submissionData);
  }
  
  // Function to get status badge
  const getStatusBadge = (status: TicketStatus) => {
    const color = TicketStatusColors[status] || "gray";
    
    return (
      <Badge variant="outline" className={`bg-${color}-100 text-${color}-800 border-${color}-200`}>
        {status === TicketStatus.WAITING_ON_CUSTOMER 
          ? "Waiting on you" 
          : status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")}
      </Badge>
    );
  };
  
  // Function to get priority badge
  const getPriorityBadge = (priority: TicketPriority) => {
    const color = TicketPriorityColors[priority] || "gray";
    
    return (
      <Badge variant="outline" className={`bg-${color}-100 text-${color}-800 border-${color}-200`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };
  
  // Format category text
  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };
  
  const isLoading = ticketLoading || responsesLoading;
  const error = ticketError || responsesError;
  
  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto py-12">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </Layout>
    );
  }
  
  if (error || !ticketData) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto py-12">
          <div className="flex flex-col justify-center items-center h-64 text-center">
            <h2 className="text-xl font-semibold mb-4">Failed to load ticket details</h2>
            <p className="text-muted-foreground mb-6">
              {isNaN(ticketId) 
                ? "Invalid ticket ID provided" 
                : "Unable to retrieve the ticket data. It may have been deleted or you don't have permission to view it."}
            </p>
            <Button onClick={() => setLocation("/my-tickets")}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to My Tickets
            </Button>
          </div>
        </div>
      </Layout>
    );
  }
  
  const { ticket, ticketAttachments = [] } = ticketData;
  const responses = responsesData || [];
  const canReply = ticket.status !== TicketStatus.CLOSED;
  
  return (
    <Layout>
      <div className="container max-w-4xl mx-auto py-6">
        <div className="mb-6">
          <Button variant="outline" onClick={() => setLocation("/my-tickets")}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to My Tickets
          </Button>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div>
                  <CardTitle className="text-2xl">#{ticket.id}: {ticket.title}</CardTitle>
                  <CardDescription className="mt-2 flex flex-wrap gap-2 items-center">
                    <span className="flex items-center">
                      <Clock className="mr-1 h-4 w-4" />
                      {format(new Date(ticket.createdAt), "PPp")}
                    </span>
                    <Separator orientation="vertical" className="h-4 mx-2" />
                    <span>Category: {formatCategory(ticket.category)}</span>
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                {getStatusBadge(ticket.status)}
                {getPriorityBadge(ticket.priority)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-md">
              <p className="whitespace-pre-wrap">{ticket.description}</p>
            </div>
            
            {/* Display ticket-level attachments if they exist */}
            {ticketAttachments && ticketAttachments.length > 0 && (
              <div>
                <AttachmentDisplay 
                  attachments={ticketAttachments} 
                  className="mt-4"
                />
              </div>
            )}
          </CardContent>
        </Card>
        
        <h3 className="text-xl font-semibold mb-4">Ticket History</h3>
        
        {responses && responses.length > 0 ? (
          <div className="space-y-4 mb-6">
            {responses.map((response: any) => (
              <Card key={response.id} className={response.isAdminResponse ? "border-primary/20" : ""} data-testid={`response-${response.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarFallback className={response.isAdminResponse ? "bg-primary text-primary-foreground" : ""}>
                          {response.isAdminResponse ? "A" : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">
                          {response.isAdminResponse ? "Support Agent" : "You"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(response.createdAt), "PPp")}
                        </p>
                      </div>
                    </div>
                    <Badge variant={response.isAdminResponse ? "default" : "outline"}>
                      {response.isAdminResponse ? "Support" : "Customer"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="whitespace-pre-wrap">{response.message}</p>
                  
                  {/* Display attachments if they exist */}
                  {response.attachments && response.attachments.length > 0 && (
                    <div>
                      <AttachmentDisplay 
                        attachments={response.attachments} 
                        className="mt-4"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="mb-6">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No responses yet</h3>
              <p className="text-muted-foreground max-w-md">
                {ticket.status === TicketStatus.OPEN 
                  ? "Our support team will respond to your ticket as soon as possible." 
                  : "No responses have been added to this ticket yet."}
              </p>
            </CardContent>
          </Card>
        )}
        
        {ticket.status === TicketStatus.CLOSED ? (
          <Card className="bg-muted/40 border-muted">
            <CardContent className="flex items-center gap-2 py-4">
              <Check className="h-5 w-5 text-green-600" />
              <p>This ticket has been closed and is no longer active.</p>
              {ticket.closureReason && (
                <p className="ml-2 text-muted-foreground italic">"{ticket.closureReason}"</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Response</CardTitle>
              <CardDescription>
                Provide additional information or reply to support's questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitResponse)} className="space-y-6">
                  
                  {/* Step 1: File Attachments */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Paperclip className="w-4 h-4 text-blue-600" />
                      <h4 className="font-medium text-sm">Step 1: Attach Files (Optional)</h4>
                    </div>
                    
                    
                    {/* File Upload Component */}
                    <FileUploader
                      onFilesAdded={handleFilesAdded}
                      onFileRemoved={handleFileRemoved}
                      maxFiles={5}
                      maxFileSize={10 * 1024 * 1024} // 10MB
                      uploadedFiles={attachments}
                    />
                  </div>
                  
                  {/* Step 2: Message & Submit */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      <h4 className="font-medium text-sm">Step 2: Write Response & Submit</h4>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Type your message here..."
                              className="min-h-[150px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Summary of attachments if any */}
                    {attachments.length > 0 && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          📎 {attachments.length} file{attachments.length > 1 ? 's' : ''} will be attached to this response
                        </p>
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={responseMutation.isPending}
                        size="lg"
                        className="min-w-[140px]"
                      >
                        {responseMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {responseMutation.isPending ? 'Submitting...' : 'Send Response'}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}