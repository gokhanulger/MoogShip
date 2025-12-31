/**
 * Helper functions for credit limit checking
 */

/**
 * Check if creating a shipment with the given price would exceed the user's credit limit
 * @param totalPrice The total price of the shipment in cents
 * @returns A promise that resolves to true if the limit would be exceeded, false otherwise
 */
export async function checkCreditLimit(totalPrice: number): Promise<boolean> {
  try {
    // First create a temporary shipment for credit limit checking
    const tempRes = await fetch("/api/shipments/temporary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ totalPrice }),
      credentials: "include"
    });
    
    if (!tempRes.ok) {
      console.error("Failed to create temporary shipment for credit check");
      return false;
    }
    
    const tempShipment = await tempRes.json();
    
    // Now check if this would exceed the credit limit
    const res = await fetch(`/api/shipments/check-credit-limit/${tempShipment.id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include"
    });
    
    if (!res.ok) {
      console.error("Credit limit check failed");
      return false;
    }
    
    const creditCheck = await res.json();
    
    // Return if the limit would be exceeded
    return creditCheck.exceeds;
  } catch (error) {
    console.error("Error checking credit limit:", error);
    return false;
  }
}

/**
 * Helper to determine if an error is related to credit limit
 * This checks the error message for common credit limit error patterns
 */
export function isCreditLimitError(error: any): boolean {
  // Look for specific patterns in the error message
  const messagesToCheck = [
    error?.errorData?.message,
    error?.message,
    error?.toString(),
    error?.status === 400 ? "possible credit limit error" : ""
  ];
  
  // Error fragments to look for
  const creditLimitKeywords = [
    "credit limit",
    "shipment: This sh",
    "Cannot create shipment",
    "balance would fall below",
    "insufficient balance"
  ];
  
  // Check if any keyword is found in any message
  return messagesToCheck.some(message => 
    message && creditLimitKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    )
  );
}

/**
 * Extract structured credit details from any API response
 * @param response API response object that might contain credit limit info
 * @returns The credit details object if found, or null
 */
export function extractCreditDetails(response: any): any {
  if (!response) return null;
  
  // Direct credit details
  if (response.creditDetails) return response.creditDetails;
  
  // If response has the expected credit details properties directly
  if (response.userBalance !== undefined || 
      response.shipmentPrice !== undefined ||
      response.newBalance !== undefined) {
    return response;
  }
  
  // Try to parse a nested message that contains JSON
  if (response.message && 
      (response.message.includes('{') || response.message.includes('}'))) {
    try {
      const startIndex = response.message.indexOf('{');
      const endIndex = response.message.lastIndexOf('}') + 1;
      if (startIndex >= 0 && endIndex > startIndex) {
        const jsonStr = response.message.substring(startIndex, endIndex);
        const parsedData = JSON.parse(jsonStr);
        if (parsedData.userBalance !== undefined || 
            parsedData.shipmentPrice !== undefined || 
            parsedData.newBalance !== undefined) {
          return parsedData;
        }
      }
    } catch (e) {
      console.error('Error parsing potential JSON in error message:', e);
    }
  }
  
  return null;
}