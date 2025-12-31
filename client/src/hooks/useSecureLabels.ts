import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { 
  openSecureLabel, 
  downloadSecureLabel, 
  downloadMultipleSecureLabels,
  generateSecureLabelToken,
  generateBulkSecureTokens
} from '@/lib/secureLabels';

export const useSecureLabels = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Open secure label in new tab
  const openLabelMutation = useMutation({
    mutationFn: ({ shipmentId, labelType }: { shipmentId: number; labelType: 'moogship' | 'carrier' }) =>
      openSecureLabel(shipmentId, labelType),
    onSuccess: () => {
      toast({
        title: "Label Opened",
        description: "Secure label opened in new tab.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to open label: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Download secure label
  const downloadLabelMutation = useMutation({
    mutationFn: ({ 
      shipmentId, 
      labelType, 
      filename 
    }: { 
      shipmentId: number; 
      labelType: 'moogship' | 'carrier'; 
      filename?: string 
    }) =>
      downloadSecureLabel(shipmentId, labelType, filename),
    onSuccess: () => {
      toast({
        title: "Download Started",
        description: "Secure label download started.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Download Failed",
        description: `Failed to download label: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Download multiple labels
  const downloadMultipleLabelsMutation = useMutation({
    mutationFn: ({ 
      shipmentIds, 
      labelType 
    }: { 
      shipmentIds: number[]; 
      labelType: 'moogship' | 'carrier' 
    }) =>
      downloadMultipleSecureLabels(shipmentIds, labelType),
    onSuccess: (results) => {
      const successful = results.filter((result: any) => 
        result.status === 'fulfilled' && result.value.success
      ).length;
      const failed = results.length - successful;
      
      if (failed === 0) {
        toast({
          title: "Bulk Download Complete",
          description: `Successfully downloaded ${successful} labels.`,
        });
      } else {
        toast({
          title: "Bulk Download Completed with Errors",
          description: `Downloaded ${successful} labels, ${failed} failed.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Bulk Download Failed",
        description: `Failed to download labels: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Generate token for display purposes
  const generateTokenMutation = useMutation({
    mutationFn: ({ shipmentId, labelType }: { shipmentId: number; labelType: 'moogship' | 'carrier' }) =>
      generateSecureLabelToken(shipmentId, labelType),
    onError: (error: Error) => {
      toast({
        title: "Token Generation Failed",
        description: `Failed to generate secure token: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Generate bulk tokens
  const generateBulkTokensMutation = useMutation({
    mutationFn: ({ shipmentIds, labelType }: { shipmentIds: number[]; labelType: 'moogship' | 'carrier' }) =>
      generateBulkSecureTokens(shipmentIds, labelType),
    onError: (error: Error) => {
      toast({
        title: "Bulk Token Generation Failed",
        description: `Failed to generate bulk tokens: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Convenience functions
  const openMoogshipLabel = useCallback(async (shipmentId: number) => {
    return openLabelMutation.mutateAsync({ shipmentId, labelType: 'moogship' });
  }, [openLabelMutation]);

  const openCarrierLabel = useCallback(async (shipmentId: number) => {
    return openLabelMutation.mutateAsync({ shipmentId, labelType: 'carrier' });
  }, [openLabelMutation]);

  const downloadMoogshipLabel = useCallback(async (shipmentId: number, filename?: string) => {
    return downloadLabelMutation.mutateAsync({ shipmentId, labelType: 'moogship', filename });
  }, [downloadLabelMutation]);

  const downloadCarrierLabel = useCallback(async (shipmentId: number, filename?: string) => {
    return downloadLabelMutation.mutateAsync({ shipmentId, labelType: 'carrier', filename });
  }, [downloadLabelMutation]);

  const downloadMultipleMoogshipLabels = useCallback(async (shipmentIds: number[]) => {
    return downloadMultipleLabelsMutation.mutateAsync({ shipmentIds, labelType: 'moogship' });
  }, [downloadMultipleLabelsMutation]);

  const downloadMultipleCarrierLabels = useCallback(async (shipmentIds: number[]) => {
    return downloadMultipleLabelsMutation.mutateAsync({ shipmentIds, labelType: 'carrier' });
  }, [downloadMultipleLabelsMutation]);

  return {
    // Mutations
    openLabelMutation,
    downloadLabelMutation,
    downloadMultipleLabelsMutation,
    generateTokenMutation,
    generateBulkTokensMutation,
    
    // Convenience functions
    openMoogshipLabel,
    openCarrierLabel,
    downloadMoogshipLabel,
    downloadCarrierLabel,
    downloadMultipleMoogshipLabels,
    downloadMultipleCarrierLabels,
    
    // Loading states
    isOpeningLabel: openLabelMutation.isPending,
    isDownloadingLabel: downloadLabelMutation.isPending,
    isDownloadingMultiple: downloadMultipleLabelsMutation.isPending,
    isGeneratingToken: generateTokenMutation.isPending,
    isGeneratingBulkTokens: generateBulkTokensMutation.isPending,
    isAnyLoading: openLabelMutation.isPending || 
                  downloadLabelMutation.isPending || 
                  downloadMultipleLabelsMutation.isPending ||
                  generateTokenMutation.isPending ||
                  generateBulkTokensMutation.isPending,
  };
};

export default useSecureLabels;