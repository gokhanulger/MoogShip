import React from 'react';
import { toast } from '@/hooks/use-toast';

/**
 * Helper function to display a credit limit exceeded toast notification
 * @param data Optional API response data containing credit limit details
 */
export function showCreditLimitExceededToast(data?: any) {
  // Default user-friendly message (no technical details)
  let description = (
    <div className="bg-red-50 p-3 rounded-md border border-red-200">
      <p className="font-semibold text-red-600 mb-2">This shipment cannot be created</p>
      <p className="text-sm text-gray-700 mb-1">
        Your account balance would fall below the allowed credit limit.
      </p>
      <p className="text-sm text-gray-700">
        Please add funds to your account or contact support for assistance.
      </p>
    </div>
  );

  // Only if we have clean, sanitized data, show the detailed version
  if (data) {
    try {
      // Check if we have the necessary fields to show detailed information
      const hasDetailedInfo = data.formattedUserBalance || 
                             (data.userBalance !== undefined) ||
                             data.formattedShipmentPrice || 
                             (data.shipmentPrice !== undefined);

      if (hasDetailedInfo) {
        // Use pre-formatted values from server or format them here
        const formattedUserBalance = data.formattedUserBalance || 
          (data.userBalance !== undefined ? `$${(data.userBalance / 100).toFixed(2)}` : 'N/A');
        
        const formattedShipmentPrice = data.formattedShipmentPrice || 
          (data.shipmentPrice !== undefined ? `$${(data.shipmentPrice / 100).toFixed(2)}` : 'N/A');
        
        const formattedNewBalance = data.formattedNewBalance || 
          (data.newBalance !== undefined ? `$${(data.newBalance / 100).toFixed(2)}` : 'N/A');
        
        const formattedMinBalance = data.formattedMinBalance || 
          (data.minBalance !== undefined ? `$${(data.minBalance / 100).toFixed(2)}` : 'Not set');
        
        // Detailed toast with balance information
        description = (
          <div className="space-y-2">
            <p className="font-medium text-red-600">Your shipment cannot be created because it would exceed your credit limit.</p>
            <div className="grid grid-cols-2 gap-1 text-sm">
              <p>Current balance:</p>
              <p className="font-semibold">{formattedUserBalance}</p>
              <p>Shipment cost:</p>
              <p className="font-semibold">{formattedShipmentPrice}</p>
              <p>New balance would be:</p>
              <p className="font-semibold">{formattedNewBalance}</p>
              <p>Minimum balance limit:</p>
              <p className="font-semibold">{formattedMinBalance}</p>
            </div>
            <p className="text-sm mt-2">Please add funds to your account or contact support for assistance.</p>
          </div>
        );
      }
    } catch (error) {
      // If anything fails in the detailed info display, fall back to the simple message
      console.error("Error formatting credit limit details:", error);
      // description already has the default user-friendly message
    }
  }

  // Show the toast notification
  toast({
    title: "Credit Limit Exceeded",
    description,
    variant: "destructive",
    duration: 10000 // Keep it visible for 10 seconds
  });
}