import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export interface VerificationUser {
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

export function useVerificationManager() {
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Fetch verification status
  const {
    data: users,
    isLoading,
    error,
    refetch
  } = useQuery<VerificationUser[]>({
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
  
  // Resend verification email to user
  const resendVerification = (userId: number) => {
    resendMutation.mutate(userId);
  };
  
  // Get statistics about verification
  const stats = {
    total: users?.length || 0,
    verified: users?.filter(user => user.isEmailVerified).length || 0,
    unverified: users?.filter(user => !user.isEmailVerified).length || 0,
    pendingApproval: users?.filter(user => user.isEmailVerified && !user.isApproved).length || 0,
  };
  
  return {
    users,
    isLoading,
    error,
    refetch,
    resendVerification,
    isResending: resendMutation.isPending,
    stats
  };
}