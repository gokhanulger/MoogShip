// Secure label access utilities
import { apiRequest } from './queryClient';

export interface LabelToken {
  token: string;
  labelType: 'moogship' | 'carrier';
  expiresIn: string;
  secureUrl: string;
}

export interface BulkTokenResponse {
  tokens: Array<{
    shipmentId: number;
    token: string;
    secureUrl: string;
  }>;
  labelType: 'moogship' | 'carrier';
  expiresIn: string;
  count: number;
}

// Generate secure token for a single shipment
export const generateSecureLabelToken = async (
  shipmentId: number, 
  labelType: 'moogship' | 'carrier' = 'moogship'
): Promise<LabelToken> => {
  const response = await apiRequest(
    'POST',
    `/api/shipments/${shipmentId}/generate-label-token`,
    { labelType }
  );

  return response.json();
};

// Generate secure tokens for multiple shipments
export const generateBulkSecureTokens = async (
  shipmentIds: number[],
  labelType: 'moogship' | 'carrier' = 'moogship'
): Promise<BulkTokenResponse> => {
  const response = await apiRequest(
    'POST',
    '/api/shipments/generate-bulk-tokens',
    { shipmentIds, labelType }
  );

  return response.json();
};

// Open secure label in new tab
export const openSecureLabel = async (
  shipmentId: number, 
  labelType: 'moogship' | 'carrier' = 'moogship'
) => {
  try {
    const tokenData = await generateSecureLabelToken(shipmentId, labelType);
    
    // Open the secure URL in a new tab
    const secureUrl = tokenData.secureUrl;
    window.open(secureUrl, '_blank', 'noopener,noreferrer');
    
    return true;
  } catch (error) {
    console.error('Error opening secure label:', error);
    throw error;
  }
};

// Download secure label
export const downloadSecureLabel = async (
  shipmentId: number,
  labelType: 'moogship' | 'carrier' = 'moogship',
  filename?: string
) => {
  try {
    const tokenData = await generateSecureLabelToken(shipmentId, labelType);
    
    // Fetch the secure URL
    const response = await fetch(tokenData.secureUrl);
    if (!response.ok) {
      throw new Error(`Failed to download label: ${response.statusText}`);
    }

    // Create download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename || `${labelType}-label-${shipmentId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return true;
  } catch (error) {
    console.error('Error downloading secure label:', error);
    throw error;
  }
};

// Get secure label URL without opening (useful for display purposes)
export const getSecureLabelUrl = async (
  shipmentId: number, 
  labelType: 'moogship' | 'carrier' = 'moogship'
): Promise<string> => {
  const tokenData = await generateSecureLabelToken(shipmentId, labelType);
  return tokenData.secureUrl;
};

// Batch download multiple labels
export const downloadMultipleSecureLabels = async (
  shipmentIds: number[],
  labelType: 'moogship' | 'carrier' = 'moogship'
) => {
  try {
    const bulkTokens = await generateBulkSecureTokens(shipmentIds, labelType);
    
    // Download each label
    const downloads = bulkTokens.tokens.map(async (tokenInfo, index) => {
      try {
        // Small delay between downloads to avoid overwhelming browser
        await new Promise(resolve => setTimeout(resolve, index * 100));
        
        const response = await fetch(tokenInfo.secureUrl);
        if (!response.ok) {
          throw new Error(`Failed to download label for shipment ${tokenInfo.shipmentId}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${labelType}-label-${tokenInfo.shipmentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        return { shipmentId: tokenInfo.shipmentId, success: true };
      } catch (error) {
        console.error(`Failed to download label for shipment ${tokenInfo.shipmentId}:`, error);
        return { shipmentId: tokenInfo.shipmentId, success: false, error };
      }
    });

    const results = await Promise.allSettled(downloads);
    return results;
  } catch (error) {
    console.error('Error downloading multiple secure labels:', error);
    throw error;
  }
};