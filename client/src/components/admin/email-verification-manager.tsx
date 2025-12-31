import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RefreshCw, CheckCircleIcon, XCircleIcon, MailIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  isApproved: boolean;
  role: string;
  hasVerificationToken: boolean;
  verificationExpires: string | null;
  createdAt: string | null;
}

export default function EmailVerificationManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [filter, setFilter] = useState("");
  
  // Fetch verification status
  const { data: users, isLoading, error, refetch } = useQuery<User[]>({
    queryKey: ["/api/admin/verification-status"],
    refetchInterval: 60000, // Refresh every minute
  });
  
  // Create mutation for resending verification email
  const resendMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("POST", "/api/admin/resend-verification", { userId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("Verification Email Sent"),
        description: t("The verification email has been resent successfully."),
      });
      // Refetch the verification status data to get updated status
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: t("Error"),
        description: error.message || t("Failed to resend verification email."),
        variant: "destructive",
      });
    },
  });
  
  // Filter users based on input
  const filteredUsers = users?.filter(user => {
    if (!filter) return true;
    
    const searchTerm = filter.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchTerm) ||
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    );
  }) || [];
  
  // Handle resend verification email
  const handleResendVerification = (userId: number) => {
    resendMutation.mutate(userId);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <RefreshCw className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 rounded-md text-center">
        <XCircleIcon className="h-8 w-8 mx-auto text-destructive" />
        <p className="mt-2">{t("Error loading verification data")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{t("Email Verification Management")}</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("Refresh")}
        </Button>
      </div>
      
      <div className="flex items-center space-x-2 mb-4">
        <Input
          placeholder={t("Search by name, username or email...")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("User")}</TableHead>
              <TableHead>{t("Email")}</TableHead>
              <TableHead>{t("Status")}</TableHead>
              <TableHead>{t("Registration Date")}</TableHead>
              <TableHead>{t("Token Expiry")}</TableHead>
              <TableHead className="text-right">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {filter ? t("No users match the search filter") : t("No users found")}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">@{user.username}</div>
                      {user.role === "admin" && (
                        <Badge variant="outline" className="mt-1 bg-blue-100">
                          {t("Admin")}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.isEmailVerified ? (
                      <div className="flex items-center">
                        <CheckCircleIcon className="h-4 w-4 mr-1 text-green-500" />
                        <span>{t("Verified")}</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <XCircleIcon className="h-4 w-4 mr-1 text-destructive" />
                        <span>{t("Not Verified")}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.createdAt ? (
                      formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })
                    ) : (
                      t("Unknown")
                    )}
                  </TableCell>
                  <TableCell>
                    {user.hasVerificationToken && user.verificationExpires ? (
                      formatDistanceToNow(new Date(user.verificationExpires), { addSuffix: true })
                    ) : (
                      t("No active token")
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!user.isEmailVerified && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MailIcon className="h-4 w-4 mr-1" />
                            {t("Resend")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t("Resend Verification Email")}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <p>
                              {t("Are you sure you want to resend a verification email to:")}
                            </p>
                            <div className="bg-muted rounded p-2">
                              <p><strong>{user.name}</strong> ({user.email})</p>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  const dialogCloseEvent = new CustomEvent('dialog.close');
                                  window.dispatchEvent(dialogCloseEvent);
                                }}
                              >
                                {t("Cancel")}
                              </Button>
                              <Button 
                                onClick={() => {
                                  handleResendVerification(user.id);
                                  const dialogCloseEvent = new CustomEvent('dialog.close');
                                  window.dispatchEvent(dialogCloseEvent);
                                }}
                                disabled={resendMutation.isPending}
                              >
                                {resendMutation.isPending && (
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                )}
                                {t("Send Email")}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="text-sm text-muted-foreground mt-4">
        {users && (
          <p>
            {t("Showing {{count}} users", { count: filteredUsers.length })}
            {filteredUsers.length !== users.length && ` (${t("filtered from")} ${users.length})`}
          </p>
        )}
      </div>
    </div>
  );
}