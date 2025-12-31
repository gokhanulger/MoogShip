import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Users, Send, Plus, Eye, Trash2, FileText, Image as ImageIcon, Upload } from "lucide-react";
import { format } from "date-fns";
import Layout from "@/components/layout";

interface EmailCampaign {
  id: number;
  name: string;
  subject: string;
  content: string;
  textContent?: string;
  status: string;
  totalRecipients?: number;
  successfulSends?: number;
  failedSends?: number;
  attachmentUrls?: string[];
  createdAt: string;
  sentAt?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  companyName?: string;
  isApproved?: boolean;
}

interface CampaignRecipient {
  id: number;
  email: string;
  status: string;
  errorMessage?: string;
  sentAt?: string;
}

export default function EmailCampaigns() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUserSelectionOpen, setIsUserSelectionOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [campaignForm, setCampaignForm] = useState({
    title: "",
    subject: "",
    content: "",
    textContent: ""
  });
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch email campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/email-campaigns"],
  }) as { data: EmailCampaign[], isLoading: boolean };

  // Fetch users for recipient selection
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/email-campaigns/users/list", userSearchTerm, roleFilter],
    queryFn: async () => {
      const response = await fetch(`/api/email-campaigns/users/list?search=${encodeURIComponent(userSearchTerm)}&role=${encodeURIComponent(roleFilter)}`, {
        credentials: "include"
      });
      return response.json();
    },
    enabled: isUserSelectionOpen
  }) as { data: User[], isLoading: boolean };

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/email-campaigns", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-campaigns"] });
      setIsCreateDialogOpen(false);
      setCampaignForm({ title: "", subject: "", content: "", textContent: "" });
      setAttachments([]);
      toast({
        title: "Campaign Created",
        description: "Email campaign created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create email campaign",
        variant: "destructive",
      });
    }
  });

  // Send campaign mutation
  const sendCampaignMutation = useMutation({
    mutationFn: async ({ campaignId, userIds }: { campaignId: number; userIds: number[] }) => {
      const response = await fetch(`/api/email-campaigns/${campaignId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userIds }),
        credentials: "include"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-campaigns"] });
      setIsUserSelectionOpen(false);
      setSelectedUsers([]);
      setSelectedCampaign(null);
      toast({
        title: "Campaign Sent",
        description: "Email campaign has been scheduled for delivery",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send email campaign",
        variant: "destructive",
      });
    }
  });

  // Delete campaign mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      const response = await fetch(`/api/email-campaigns/${campaignId}`, {
        method: "DELETE",
        credentials: "include"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-campaigns"] });
      toast({
        title: "Campaign Deleted",
        description: "Email campaign deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete email campaign",
        variant: "destructive",
      });
    }
  });

  const handleCreateCampaign = () => {
    if (!campaignForm.title || !campaignForm.subject || !campaignForm.content) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("name", campaignForm.title);
    formData.append("subject", campaignForm.subject);
    formData.append("content", campaignForm.content);
    formData.append("textContent", campaignForm.textContent);
    formData.append("status", "draft");

    // Add attachments
    attachments.forEach((file) => {
      formData.append("attachments", file);
    });

    createCampaignMutation.mutate(formData);
  };

  const handleSendCampaign = () => {
    if (!selectedCampaign || selectedUsers.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select recipients for the campaign",
        variant: "destructive",
      });
      return;
    }

    sendCampaignMutation.mutate({
      campaignId: selectedCampaign.id,
      userIds: selectedUsers
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + attachments.length > 5) {
      toast({
        title: "Too Many Files",
        description: "Maximum 5 attachments allowed",
        variant: "destructive",
      });
      return;
    }
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const filteredUsers = Array.isArray(users) ? users.filter((user: User) => {
    const matchesSearch = user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(userSearchTerm.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesSearch && matchesRole;
  }) : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "secondary";
      case "sending": return "warning";
      case "sent": return "success";
      case "failed": return "destructive";
      default: return "secondary";
    }
  };

  if (campaignsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Email Campaigns</h1>
          <p className="text-gray-600">Create and manage marketing email campaigns</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Email Campaign</DialogTitle>
              <DialogDescription>
                Design and create a new email marketing campaign
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Campaign Title</Label>
                <Input
                  id="title"
                  value={campaignForm.title}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter campaign title"
                />
              </div>
              
              <div>
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={campaignForm.subject}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter email subject line"
                />
              </div>
              
              <div>
                <Label htmlFor="content">Email Content (HTML)</Label>
                <Textarea
                  id="content"
                  value={campaignForm.content}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter HTML email content"
                  rows={8}
                />
              </div>
              
              <div>
                <Label htmlFor="textContent">Plain Text Version (Optional)</Label>
                <Textarea
                  id="textContent"
                  value={campaignForm.textContent}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, textContent: e.target.value }))}
                  placeholder="Enter plain text version"
                  rows={4}
                />
              </div>
              
              <div>
                <Label>Attachments (Max 5 files, 10MB each)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          {file.type.startsWith('image/') ? (
                            <ImageIcon className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateCampaign}
                disabled={createCampaignMutation.isPending}
              >
                {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaign Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Campaigns</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter((c: EmailCampaign) => c.status === 'draft').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent Campaigns</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter((c: EmailCampaign) => c.status === 'sent').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.reduce((total: number, c: EmailCampaign) => total + (c.totalRecipients || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign: EmailCampaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  <CardDescription>{campaign.subject}</CardDescription>
                </div>
                <Badge variant={getStatusColor(campaign.status) as any}>
                  {campaign.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>Created: {format(new Date(campaign.createdAt), 'MMM dd, yyyy')}</div>
                {campaign.sentAt && (
                  <div>Sent: {format(new Date(campaign.sentAt), 'MMM dd, yyyy')}</div>
                )}
                {campaign.totalRecipients && (
                  <div>Recipients: {campaign.totalRecipients}</div>
                )}
                {campaign.successfulSends && campaign.failedSends !== undefined && (
                  <div>
                    Success: {campaign.successfulSends} / Failed: {campaign.failedSends}
                  </div>
                )}
                {campaign.attachmentUrls && campaign.attachmentUrls.length > 0 && (
                  <div>Attachments: {campaign.attachmentUrls.length}</div>
                )}
              </div>
              
              <div className="flex gap-2 mt-4">
                {campaign.status === 'draft' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedCampaign(campaign);
                      setIsUserSelectionOpen(true);
                    }}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                  disabled={deleteCampaignMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Selection Dialog */}
      <Dialog open={isUserSelectionOpen} onOpenChange={setIsUserSelectionOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw]">
          <DialogHeader>
            <DialogTitle>Select Recipients</DialogTitle>
            <DialogDescription>
              Choose users to receive the email campaign: {selectedCampaign?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Left Panel - User Selection */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-3">Available Users</h3>
                <div className="flex gap-4 mb-4">
                  <Input
                    placeholder="Search users by name or email"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="">All Roles</option>
                    <option value="user">Users</option>
                    <option value="admin">Admins</option>
                  </select>
                </div>
                
                <div className="flex justify-between text-sm text-gray-600 mb-3">
                  <span>Available: {filteredUsers.length} users</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const allUserIds = filteredUsers.map((u: User) => u.id);
                        const combinedIds = [...selectedUsers, ...allUserIds];
                        const uniqueIds = combinedIds.filter((id, index) => combinedIds.indexOf(id) === index);
                        setSelectedUsers(uniqueIds);
                      }}
                    >
                      Select All
                    </Button>
                  </div>
                </div>
              </div>
            
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {usersLoading ? (
                    <div className="text-center py-8">Loading users...</div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No users found</div>
                  ) : (
                    filteredUsers.map((user: User) => (
                      <div key={user.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers(prev => [...prev, user.id]);
                            } else {
                              setSelectedUsers(prev => prev.filter(id => id !== user.id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                          {user.companyName && (
                            <div className="text-xs text-gray-500">{user.companyName}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">{user.role}</Badge>
                          {user.isApproved && (
                            <Badge variant="outline">Approved</Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right Panel - Selected Recipients (To Section) */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-3">Recipients (To:)</h3>
                <div className="flex justify-between text-sm text-gray-600 mb-3">
                  <span>Selected: {selectedUsers.length} recipients</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedUsers([])}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-96 border rounded-lg">
                <div className="p-3">
                  {selectedUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No recipients selected. Choose users from the left panel.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedUsers.map((userId) => {
                        const usersList = Array.isArray(users) ? users as User[] : [];
                        const user = usersList.find((u: User) => u.id === userId);
                        if (!user) return null;
                        
                        return (
                          <div key={user.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{user.name}</div>
                              <div className="text-sm text-blue-600">{user.email}</div>
                              {user.companyName && (
                                <div className="text-xs text-gray-500">{user.companyName}</div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedUsers(prev => prev.filter(id => id !== user.id));
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {selectedUsers.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-800 mb-2">
                    Email Delivery Details
                  </div>
                  <div className="text-xs text-blue-600 space-y-1">
                    <div>• Emails will be sent individually to each recipient</div>
                    <div>• Each user will receive a personalized copy</div>
                    <div>• From: cs@moogship.com</div>
                    <div>• Campaign: {selectedCampaign?.name}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsUserSelectionOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendCampaign}
              disabled={sendCampaignMutation.isPending || selectedUsers.length === 0}
            >
              {sendCampaignMutation.isPending ? "Sending..." : `Send to ${selectedUsers.length} users`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}