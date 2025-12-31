import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { TicketPriority, TicketCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/layout";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FileUploader, UploadedFile } from "@/components/FileUploader";

// Validation schema for ticket submission
const ticketFormSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.nativeEnum(TicketCategory),
  priority: z.nativeEnum(TicketPriority)
});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

export default function SupportTicketPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // State for managing uploaded attachments
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  
  
  // React Hook Form setup with zod validation
  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      subject: "",
      description: "",
      category: TicketCategory.SHIPPING,
      priority: TicketPriority.MEDIUM
    }
  });
  
  // File upload handlers
  const handleFilesAdded = (newFiles: UploadedFile[]) => {
    console.log("Files added:", newFiles.length);
    setAttachments(prev => [...prev, ...newFiles]);
  };

  const handleFileRemoved = (fileId: string) => {
    setAttachments(prev => prev.filter(file => file.id !== fileId));
  };

  // Mutation for submitting the ticket  
  const submitMutation = useMutation({
    mutationFn: async (data: TicketFormValues & { attachments?: any[] }) => {
      const response = await apiRequest("POST", "/api/support-tickets", {
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority,
        attachments: data.attachments || []
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate both user tickets and admin tickets queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets/admin/all'] });
      
      toast({
        title: t('supportTickets.create.toast.success.title'),
        description: t('supportTickets.create.toast.success.description'),
        variant: "default"
      });
      
      console.log("Created ticket:", data);
      
      // Check if the response includes a ticket ID to redirect to
      if (data && data.id) {
        // Redirect to the newly created ticket detail page
        setLocation(`/ticket-detail/${data.id}`);
      } else {
        // Fallback to tickets list page
        setLocation("/my-tickets");
      }
    },
    onError: (error) => {
      console.error("Error submitting ticket:", error);
      
      // Attempt to parse the error response if possible
      if (error instanceof Error) {
        const errorMessage = error.message;
        console.error("Error details:", errorMessage);
      }
      
      toast({
        title: t('supportTickets.create.toast.error.title'),
        description: t('supportTickets.create.toast.error.description'),
        variant: "destructive"
      });
    }
  });
  
  async function onSubmit(data: TicketFormValues) {
    console.log("🔧 [DEBUG] Form submit called with attachments:", attachments.length);
    
    // Upload files to object storage first (same pattern as ticket-detail)
    const uploadedAttachments = [];
    
    if (attachments.length > 0) {
      console.log("🔧 [DEBUG] Starting file upload for", attachments.length, "files");
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
      ...data,
      attachments: uploadedAttachments
    };
    
    submitMutation.mutate(submissionData);
  }
  
  return (
    <Layout>
      <div className="container max-w-4xl mx-auto py-6">
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">{t('supportTickets.create.title')}</CardTitle>
            <CardDescription>
              {t('supportTickets.create.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('supportTickets.create.form.subject.label')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('supportTickets.create.form.subject.placeholder')} {...field} />
                      </FormControl>
                      <FormDescription>
                        {t('supportTickets.create.form.subject.description')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('supportTickets.create.form.category.label')}</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('supportTickets.create.form.category.placeholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={TicketCategory.SHIPPING}>{t('supportTickets.create.form.category.options.shipping')}</SelectItem>
                            <SelectItem value={TicketCategory.PICKUP}>{t('supportTickets.create.form.category.options.pickup')}</SelectItem>
                            <SelectItem value={TicketCategory.BILLING}>{t('supportTickets.create.form.category.options.billing')}</SelectItem>
                            <SelectItem value={TicketCategory.TECHNICAL}>{t('supportTickets.create.form.category.options.technical')}</SelectItem>
                            <SelectItem value={TicketCategory.OTHER}>{t('supportTickets.create.form.category.options.other')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('supportTickets.create.form.priority.label')}</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('supportTickets.create.form.priority.placeholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={TicketPriority.LOW}>{t('supportTickets.create.form.priority.options.low')}</SelectItem>
                            <SelectItem value={TicketPriority.MEDIUM}>{t('supportTickets.create.form.priority.options.medium')}</SelectItem>
                            <SelectItem value={TicketPriority.HIGH}>{t('supportTickets.create.form.priority.options.high')}</SelectItem>
                            <SelectItem value={TicketPriority.URGENT}>{t('supportTickets.create.form.priority.options.urgent')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('supportTickets.create.form.description.label')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={t('supportTickets.create.form.description.placeholder')} 
                          className="min-h-[200px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        {t('supportTickets.create.form.description.description')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* File Upload Section */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Attachments</label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload images, PDFs, or Excel files to help explain your issue (max 10MB per file)
                  </p>
                  <FileUploader
                    onFilesAdded={handleFilesAdded}
                    onFileRemoved={handleFileRemoved}
                    uploadedFiles={attachments}
                    maxFiles={5}
                    maxFileSize={10 * 1024 * 1024} // 10MB
                    acceptedTypes={[
                      "image/jpeg", 
                      "image/jpg", 
                      "image/png", 
                      "image/gif", 
                      "application/pdf", 
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
                      "application/vnd.ms-excel",
                      "text/csv"
                    ]}
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={submitMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    {submitMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t('supportTickets.create.form.submit')}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}