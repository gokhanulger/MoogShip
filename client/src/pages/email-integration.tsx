import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ScanLine,
  TestTube,
  Inbox,
  Package,
  Clock,
  Key,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EmailConnection {
  id: number;
  email: string;
  provider: string;
  connectionType: string;
  connectionStatus: string;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  totalEmailsProcessed: number;
  totalOrdersImported: number;
  isActive: boolean;
  createdAt: string;
}

export default function EmailIntegration() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<EmailConnection | null>(null);
  
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [provider, setProvider] = useState("gmail");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  
  // Fetch email connections
  const { data: connections = [], isLoading } = useQuery<EmailConnection[]>({
    queryKey: ["/api/email/connections"],
  });
  
  // Create IMAP connection mutation
  const createConnection = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/email/connect/imap", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/connections"] });
      toast({
        title: "Success",
        description: "Email connection added successfully!",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add email connection",
        variant: "destructive",
      });
    },
  });
  
  // Scan emails mutation
  const scanEmails = useMutation({
    mutationFn: async (connectionId: number) => {
      const res = await apiRequest("GET", `/api/email/connection/${connectionId}/scan`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/etsy/orders"] });
      toast({
        title: "Success",
        description: `Imported ${data.imported} new orders from ${data.processed} emails`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to scan emails",
        variant: "destructive",
      });
    },
  });
  
  // Test connection mutation
  const testConnection = useMutation({
    mutationFn: async (connectionId: number) => {
      const res = await apiRequest("POST", `/api/email/test/${connectionId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/connections"] });
      toast({
        title: "Success",
        description: "Connection test successful!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Connection test failed",
        variant: "destructive",
      });
    },
  });
  
  // Delete connection mutation
  const deleteConnection = useMutation({
    mutationFn: async (connectionId: number) => {
      const res = await apiRequest("DELETE", `/api/email/connections/${connectionId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/connections"] });
      toast({
        title: "Success",
        description: "Email connection removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete connection",
        variant: "destructive",
      });
    },
  });
  
  const resetForm = () => {
    setEmail("");
    setPassword("");
    setProvider("gmail");
    setImapHost("");
    setImapPort("993");
  };
  
  const handleSubmit = () => {
    const data: any = {
      email,
      password,
    };
    
    // Add custom IMAP settings if provider is 'other'
    if (provider === "other") {
      data.host = imapHost;
      data.port = parseInt(imapPort);
    }
    
    createConnection.mutate(data);
  };
  
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "gmail":
        return <Mail className="h-4 w-4" />;
      case "outlook":
        return <Inbox className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Email Integration</h1>
          <p className="text-gray-600">
            Connect your email to automatically import Etsy orders from notification emails.
            This is the safest way to import orders without violating Etsy's terms of service.
          </p>
        </div>
      
      <Tabs defaultValue="connections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connections">Email Connections</TabsTrigger>
          <TabsTrigger value="instructions">Setup Instructions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Email Connections</CardTitle>
                  <CardDescription>
                    Connect your email account to scan for Etsy order notifications
                  </CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Email Connection
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Email Connection</DialogTitle>
                      <DialogDescription>
                        Connect your email to import Etsy orders automatically
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <Label>Email Provider</Label>
                        <Select value={provider} onValueChange={setProvider}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gmail">Gmail</SelectItem>
                            <SelectItem value="outlook">Outlook/Hotmail</SelectItem>
                            <SelectItem value="other">Other (IMAP)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Email Address</Label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your-email@gmail.com"
                        />
                      </div>
                      
                      <div>
                        <Label>
                          {provider === "gmail" ? "App Password (Required)" : "Password"}
                        </Label>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={provider === "gmail" ? "16-character app password" : "••••••••••••••••"}
                        />
                        {provider === "gmail" && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-2">
                            <p className="text-xs font-semibold text-yellow-800 mb-1">
                              ⚠️ Gmail requires an App-Specific Password
                            </p>
                            <p className="text-xs text-yellow-700">
                              Do NOT use your regular Gmail password. You must:
                            </p>
                            <ol className="text-xs text-yellow-700 mt-1 ml-3 list-decimal">
                              <li>Go to Google Account → Security</li>
                              <li>Enable 2-Step Verification</li>
                              <li>Generate an App Password</li>
                              <li>Use that 16-character password here</li>
                            </ol>
                            <a 
                              href="https://myaccount.google.com/apppasswords" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                            >
                              Generate App Password →
                            </a>
                          </div>
                        )}
                        {provider === "outlook" && (
                          <p className="text-xs text-gray-500 mt-1">
                            For Outlook, use an app password if you have 2FA enabled
                          </p>
                        )}
                      </div>
                      
                      {provider === "other" && (
                        <>
                          <div>
                            <Label>IMAP Server</Label>
                            <Input
                              value={imapHost}
                              onChange={(e) => setImapHost(e.target.value)}
                              placeholder="imap.example.com"
                            />
                          </div>
                          <div>
                            <Label>IMAP Port</Label>
                            <Input
                              value={imapPort}
                              onChange={(e) => setImapPort(e.target.value)}
                              placeholder="993"
                            />
                          </div>
                        </>
                      )}
                    </div>
                    
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={!email || !password || createConnection.isPending}
                      >
                        {createConnection.isPending ? "Connecting..." : "Connect"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading connections...</div>
              ) : connections.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 mb-4">No email connections yet</p>
                  <p className="text-sm text-gray-400">
                    Add an email connection to start importing Etsy orders
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Sync</TableHead>
                      <TableHead>Orders Imported</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {connections.map((connection) => (
                      <TableRow key={connection.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getProviderIcon(connection.provider)}
                            {connection.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{connection.provider}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(connection.connectionStatus)}</TableCell>
                        <TableCell>
                          {connection.lastSyncAt ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {new Date(connection.lastSyncAt).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-gray-400">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {connection.totalOrdersImported}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testConnection.mutate(connection.id)}
                              disabled={testConnection.isPending}
                              data-testid={`button-test-connection-${connection.id}`}
                            >
                              <TestTube className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => scanEmails.mutate(connection.id)}
                              disabled={scanEmails.isPending}
                              data-testid={`button-scan-emails-${connection.id}`}
                            >
                              <ScanLine className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteConnection.mutate(connection.id)}
                              disabled={deleteConnection.isPending}
                              data-testid={`button-delete-connection-${connection.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="instructions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>How to Set Up Email Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">For Gmail Users:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Go to your Google Account settings</li>
                  <li>Navigate to Security → 2-Step Verification</li>
                  <li>Scroll down to "App passwords"</li>
                  <li>Generate a new app password for "Mail"</li>
                  <li>Use this 16-character password (not your regular password)</li>
                  <li>Enter your Gmail address and app password above</li>
                </ol>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">For Outlook/Hotmail Users:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Go to your Microsoft Account security settings</li>
                  <li>Enable two-factor authentication if not already enabled</li>
                  <li>Create an app password under "Advanced security options"</li>
                  <li>Use this app password (not your regular password)</li>
                  <li>Enter your email address and app password above</li>
                </ol>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  How It Works
                </h3>
                <p className="text-sm">
                  Once connected, this system will:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                  <li>Scan your inbox for emails from transaction@etsy.com</li>
                  <li>Look for "You made a sale on Etsy!" subject lines</li>
                  <li>Extract order details including full shipping addresses</li>
                  <li>Import orders directly into MoogShip</li>
                  <li>Track which emails have been processed to avoid duplicates</li>
                </ul>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Why This Is Safe
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>100% compliant - you're reading your own emails</li>
                  <li>No violation of Etsy's terms of service</li>
                  <li>Uses secure OAuth2 or app passwords</li>
                  <li>Your password is never stored (only secure tokens)</li>
                  <li>Can be disconnected anytime</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </Layout>
  );
}