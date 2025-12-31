import React from "react";
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
import { Loader2, UserPlus, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

// User interface for selection
interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  companyName?: string;
}

// Validation schema for admin ticket creation
const adminTicketFormSchema = z.object({
  userId: z.number().min(1, "Please select a user"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.nativeEnum(TicketCategory),
  priority: z.nativeEnum(TicketPriority)
});

type AdminTicketFormValues = z.infer<typeof adminTicketFormSchema>;

export default function AdminCreateTicketPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // React Hook Form setup with zod validation
  const form = useForm<AdminTicketFormValues>({
    resolver: zodResolver(adminTicketFormSchema),
    defaultValues: {
      userId: 0,
      subject: "",
      description: "",
      category: TicketCategory.SHIPPING,
      priority: TicketPriority.MEDIUM
    }
  });

  // Fetch all users for selection
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useQuery({
    queryKey: ['/api/users/admin/all'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/users/admin/all');
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      return res.json() as Promise<User[]>;
    }
  });
  
  // Mutation for submitting the ticket
  const submitMutation = useMutation({
    mutationFn: async (data: AdminTicketFormValues) => {
      const response = await apiRequest("POST", "/api/support-tickets/admin/create", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create ticket');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate admin tickets queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets/admin/all'] });
      
      toast({
        title: "Ticket Created Successfully",
        description: `Ticket #${data.id} has been created for the selected user.`,
        variant: "default"
      });
      
      // Navigate back to admin tickets list
      setLocation("/admin-tickets");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Ticket",
        description: error.message || "An error occurred while creating the ticket.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (data: AdminTicketFormValues) => {
    submitMutation.mutate(data);
  };

  if (isLoadingUsers) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (usersError) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p className="text-red-500 mb-4">Failed to load users. Please try again.</p>
          <Button onClick={() => setLocation("/admin-tickets")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center mb-6">
          <Button 
            onClick={() => setLocation("/admin-tickets")} 
            variant="outline" 
            size="sm"
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create New Ticket</h1>
            <p className="text-muted-foreground">Create a support ticket on behalf of a user</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserPlus className="h-5 w-5 mr-2" />
                Admin Ticket Creation
              </CardTitle>
              <CardDescription>
                Select a user and fill in the ticket details to create a support ticket on their behalf.
              </CardDescription>
            </CardHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)}>
                <CardContent className="space-y-6">
                  {/* User Selection */}
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select User</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a user..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users?.map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {user.companyName || user.name}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {user.email} • {user.username}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the user for whom you're creating this ticket.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Subject */}
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief description of the issue..." {...field} />
                        </FormControl>
                        <FormDescription>
                          Provide a clear and concise subject line for the ticket.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Category and Priority */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={TicketCategory.SHIPPING}>Shipping</SelectItem>
                              <SelectItem value={TicketCategory.PICKUP}>Pickup</SelectItem>
                              <SelectItem value={TicketCategory.BILLING}>Billing</SelectItem>
                              <SelectItem value={TicketCategory.TECHNICAL}>Technical</SelectItem>
                              <SelectItem value={TicketCategory.OTHER}>Other</SelectItem>
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
                          <FormLabel>Priority</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={TicketPriority.LOW}>Low</SelectItem>
                              <SelectItem value={TicketPriority.MEDIUM}>Medium</SelectItem>
                              <SelectItem value={TicketPriority.HIGH}>High</SelectItem>
                              <SelectItem value={TicketPriority.URGENT}>Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Detailed description of the issue or request..."
                            className="min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Provide detailed information about the issue or request.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                
                <CardFooter className="flex justify-between">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setLocation("/admin/tickets")}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitMutation.isPending}
                    className="min-w-[120px]"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Ticket
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </Layout>
  );
}